/**
 * AI assistant controller.
 *
 * Exposes a single chat endpoint that lets a user drive read-only piSignage
 * operations ("how's my lobby screen?", "when was the sales group last
 * deployed?", "what playlist is player 3 running?") in natural language.
 *
 * How it works: the user's message is sent to a local Ollama model together
 * with a set of *tools* (function definitions). The model decides which tool to
 * call and with what arguments; we execute the tool against the Mongoose models
 * / media directory and feed the result back so the model can answer. Every tool
 * in v1 is read-only — nothing here mutates state or touches a player.
 *
 * The heavy lifting (data access) reuses the same models the REST controllers
 * use, so the assistant always sees the same truth as the rest of the server.
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

import config from '../../config/config.js';
import * as rest from '../others/restware.js';
import { Player } from '../models/player.js';
import { Group } from '../models/group.js';
import { Asset } from '../models/assets.js';

const A = config.assistant;

const SYSTEM_PROMPT = `You are the piSignage assistant, embedded in a digital-signage management server.
You help operators check the status of their players, groups, playlists and media, and you suggest troubleshooting steps.

Rules:
- Use the provided tools to look up real data. NEVER invent player names, statuses, dates or counts — if you don't have the data, call a tool.
- PREFER ACTING OVER ASKING. Never ask the user to narrow down a list — just list everything and let them read it. Map these requests DIRECTLY to a no-argument tool call, with NO clarifying question:
    - "display players", "display player names", "show players", "list players", "players", "player names" -> list_players (no arguments)
    - "show groups", "list groups", "groups" -> list_groups (no arguments)
    - "list playlists", "playlists" -> list_playlists ; "list assets", "media", "files" -> list_assets
  Only pass a filter/name argument when the user explicitly names a specific player or group. Only ask a clarifying question when you genuinely cannot pick any tool.
- When the user names a player or group, pass that name to the relevant tool (matching is case-insensitive and partial).
- "Deployed"/"last deployed" is a property of a GROUP, not a player. Use get_group for deploy times.
- A player is online if isConnected is true; otherwise report it offline and mention when it was lastReported.
- Relevant help articles are AUTOMATICALLY retrieved and included in this conversation as a system message beginning "HELP ARTICLES". For any troubleshooting/how-to question (blank screen, offline player, stuck sync, TV won't turn on, video not playing, resolution wrong, etc.), read those articles FIRST and base your answer primarily on them. Then add your own clear, step-by-step guidance.
- IMPORTANT: For a troubleshooting or how-to question, answer using ONLY the HELP ARTICLES — do NOT call list_players, get_player_status, get_group or any other data tool. Phrases like "my player screen is blank" or "youtube not playing" are troubleshooting questions, NOT requests for player status. Only call the player/group/asset data tools when the user explicitly asks about the current status, list, or count of their players/groups/playlists/media (e.g. "which players are offline", "list groups", "what playlist is the lobby running").
- Structure troubleshooting answers as: a one-line summary of the likely cause, then numbered steps drawn from the articles, then "More: <url>" citing the Source URL of the article you relied on.
- ONLY cite a URL that appears verbatim in a "Source:" line of the provided HELP ARTICLES. NEVER invent, guess, or construct a URL. If the articles don't cover the question, say so and give at most one general suggestion — do not invent detailed steps.
- NEVER say you are "about to" search, check or look something up. Answer directly from the articles already provided. Do not end your reply with a promise to check something.
- You may still call search_help_docs to look up a DIFFERENT topic than what was retrieved, using only symptom/topic words (never player/group names).
- NEVER mention tool names, function names, or internal mechanics to the user (never write "list_players", "search_help_docs", "get_group", etc.). Speak like a human support engineer. Call tools silently; the user only sees your final answer.
- Be concise. Prefer short numbered steps over long prose. Report times in a human-friendly way.
- This assistant is READ-ONLY: you cannot deploy, delete or change anything. If asked to, explain that write actions aren't enabled yet.`;

/* --------------------------------------------------------------------------
 * Small helpers
 * ------------------------------------------------------------------------ */

// Case-insensitive "contains" match, used so the model can pass rough names.
const like = (value, needle) =>
    typeof value === 'string' &&
    typeof needle === 'string' &&
    value.toLowerCase().includes(needle.toLowerCase());

// Parse the various date shapes the DB uses. Notably `lastDeployed` is stored
// as an epoch-milliseconds STRING (e.g. "1782998028960"), which `new Date(str)`
// treats as an invalid date — so handle all-digit strings as epoch ms.
const toDate = (v) => {
    if (v == null) return null;
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
    if (typeof v === 'number') return new Date(v);
    if (typeof v === 'string') {
        const s = v.trim();
        if (!s) return null;
        if (/^\d{10,}$/.test(s)) return new Date(Number(s)); // epoch ms/seconds string
        const d = new Date(s);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
};

const msAgo = (date) => {
    const d = toDate(date);
    if (!d) return null;
    return Date.now() - d.getTime();
};

const humanizeAgo = (date) => {
    const ms = msAgo(date);
    if (ms === null) return 'never';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 48) return `${h}h ago`;
    return `${Math.round(h / 24)}d ago`;
};

// Compact, LLM-friendly view of a player document.
const playerView = (p) => ({
    name: p.name,
    group: p.group && p.group.name,
    online: !!p.isConnected,
    currentPlaylist: p.currentPlaylist || null,
    lastReported: toDate(p.lastReported)?.toISOString() || null,
    lastReportedAgo: humanizeAgo(p.lastReported),
    syncInProgress: !!p.syncInProgress,
    ipAddress: p.myIpAddress || p.ip || null,
    version: p.version || null,
    diskSpaceUsed: p.diskSpaceUsed || null,
    diskSpaceAvailable: p.diskSpaceAvailable || null,
    tvOn: !!p.tvStatus
});

const groupView = (g) => ({
    name: g.name,
    description: g.description || null,
    lastDeployed: toDate(g.lastDeployed)?.toISOString() || null,
    lastDeployedAgo: toDate(g.lastDeployed) ? humanizeAgo(g.lastDeployed) : 'never deployed',
    assignedPlaylists: (g.playlists || []).map((pl) =>
        typeof pl === 'string' ? pl : pl && pl.name
    ),
    deployedPlaylists: (g.deployedPlaylists || []).map((pl) =>
        typeof pl === 'string' ? pl : pl && pl.name
    ),
    assetCount: (g.assets || []).length,
    orientation: g.orientation,
    resolution: g.resolution
});

/* --------------------------------------------------------------------------
 * Tool implementations (all read-only)
 * ------------------------------------------------------------------------ */

async function listPlayers({ filter, onlineOnly } = {}) {
    const players = await Player.find({}).sort({ name: 1 }).lean().exec();
    let views = players.map(playerView);
    if (filter) {
        views = views.filter(
            (p) => like(p.name, filter) || like(p.group, filter)
        );
    }
    if (onlineOnly) views = views.filter((p) => p.online);
    return {
        total: views.length,
        online: views.filter((p) => p.online).length,
        players: views.slice(0, 100)
    };
}

async function getPlayerStatus({ name }) {
    if (!name) return { error: 'name is required' };
    const players = await Player.find({}).lean().exec();
    const match = players.find((p) => like(p.name, name));
    if (!match) return { error: `No player matching "${name}"` };
    return playerView(match);
}

async function listGroups() {
    const groups = await Group.list({ criteria: {}, perPage: 500, page: 0 });
    return { total: groups.length, groups: groups.map(groupView) };
}

async function getGroup({ name }) {
    if (!name) return { error: 'name is required' };
    const groups = await Group.list({ criteria: {}, perPage: 500, page: 0 });
    const match = groups.find((g) => like(g.name, name));
    if (!match) return { error: `No group matching "${name}"` };
    return groupView(match);
}

// "What playlist is X running?" — resolve for a player (live) or a group (assigned).
async function getAssignedPlaylist({ playerName, groupName }) {
    if (playerName) {
        const players = await Player.find({}).lean().exec();
        const p = players.find((x) => like(x.name, playerName));
        if (!p) return { error: `No player matching "${playerName}"` };
        return {
            player: p.name,
            group: p.group && p.group.name,
            currentPlaylist: p.currentPlaylist || null,
            online: !!p.isConnected
        };
    }
    if (groupName) {
        const g = await getGroup({ name: groupName });
        if (g.error) return g;
        return {
            group: g.name,
            assignedPlaylists: g.assignedPlaylists,
            deployedPlaylists: g.deployedPlaylists,
            lastDeployedAgo: g.lastDeployedAgo
        };
    }
    return { error: 'Provide playerName or groupName' };
}

async function listAssets({ filter, type } = {}) {
    // Media files live on disk; metadata (type/duration) lives in the Asset DB.
    let files = [];
    try {
        const all = await fs.readdir(config.mediaDir);
        files = all.filter((f) => f.charAt(0) !== '_' && f.charAt(0) !== '.');
    } catch (e) {
        return { error: `Could not read media directory: ${e.message}` };
    }
    let dbdata = [];
    try {
        dbdata = await Asset.find({}).lean().exec();
    } catch {
        /* DB optional for a listing */
    }
    const meta = new Map(dbdata.map((d) => [d.name, d]));
    let assets = files.map((name) => ({
        name,
        type: (meta.get(name) || {}).type || null,
        duration: (meta.get(name) || {}).duration || null
    }));
    if (type) assets = assets.filter((a) => like(a.type, type));
    if (filter) assets = assets.filter((a) => like(a.name, filter));
    return { total: assets.length, assets: assets.slice(0, 100) };
}

async function listPlaylists() {
    let files = [];
    try {
        files = await fs.readdir(config.mediaDir);
    } catch (e) {
        return { error: `Could not read media directory: ${e.message}` };
    }
    const names = files
        .filter((f) => f.startsWith('__') && f.endsWith('.json'))
        .map((f) => path.basename(f, '.json').slice(2))
        .sort();
    return { total: names.length, playlists: names };
}

// Read the media filenames referenced by a playlist file (__<name>.json).
// Each asset item has a main `filename` plus optional `side`/`bottom` zone
// files. Playlists can nest other playlists (filenames starting with "__"),
// so recurse, guarding against cycles.
async function playlistMediaFiles(plName, visited = new Set()) {
    if (!plName || visited.has(plName)) return [];
    visited.add(plName);
    let obj;
    try {
        const raw = await fs.readFile(
            path.join(config.mediaDir, `__${plName}.json`),
            'utf8'
        );
        obj = JSON.parse(raw);
    } catch {
        return [];
    }
    const out = [];
    for (const a of obj.assets || []) {
        for (const key of ['filename', 'side', 'bottom']) {
            const val = a[key];
            if (!val || typeof val !== 'string') continue;
            if (val.startsWith('__')) {
                // Nested playlist reference — recurse for its media.
                out.push(...(await playlistMediaFiles(val.slice(2).replace(/\.json$/, ''), visited)));
            } else {
                out.push(val);
            }
        }
    }
    return out;
}

// True for real content assets — excludes structural/system files (playlist
// JSONs, layout templates, system notices) that get synced alongside content.
const isContentAsset = (n) =>
    typeof n === 'string' &&
    n.length > 0 &&
    !n.startsWith('__') &&
    !n.startsWith('_') &&
    !/\.json$/i.test(n) &&
    !/^custom_layout.*\.html$/i.test(n);

// Resolve every asset reachable from a group: union of its playlists' media
// plus any group-level deployed assets. Returns { playlists, assets, byPlaylist }.
async function resolveGroupAssets(group) {
    const refs =
        (group.playlists && group.playlists.length
            ? group.playlists
            : group.deployedPlaylists) || [];
    const playlistNames = refs
        .map((pl) => (typeof pl === 'string' ? pl : pl && pl.name))
        .filter(Boolean);

    const assetSet = new Set();
    const byPlaylist = {};
    for (const name of playlistNames) {
        const files = (await playlistMediaFiles(name)).filter(isContentAsset);
        byPlaylist[name] = [...new Set(files)];
        files.forEach((f) => assetSet.add(f));
    }
    // Group-level deployed assets (already-flattened list stored on the group).
    for (const a of group.assets || []) {
        const name = typeof a === 'string' ? a : a && a.filename;
        if (isContentAsset(name)) assetSet.add(name);
    }

    // Enrich with media type from the Asset DB where available.
    let meta = new Map();
    try {
        const db = await Asset.find({}).lean().exec();
        meta = new Map(db.map((d) => [d.name, d.type]));
    } catch {
        /* type is optional */
    }
    const assets = [...assetSet].sort().map((name) => ({
        name,
        type: meta.get(name) || null
    }));
    return { playlists: playlistNames, assets, byPlaylist };
}

// "What content is on player X?" — player → group → playlists → assets.
async function getPlayerAssets({ playerName }) {
    if (!playerName) return { error: 'playerName is required' };
    const players = await Player.find({}).lean().exec();
    const p = players.find((x) => like(x.name, playerName));
    if (!p) return { error: `No player matching "${playerName}"` };
    const groupName = p.group && p.group.name;
    if (!groupName) {
        return {
            player: p.name,
            group: null,
            note: 'This player is not assigned to a group, so it has no content.'
        };
    }
    const groups = await Group.list({ criteria: {}, perPage: 500, page: 0 });
    const g = groups.find((x) => like(x.name, groupName));
    if (!g) {
        return { player: p.name, group: groupName, error: `Group "${groupName}" not found` };
    }
    const resolved = await resolveGroupAssets(g);
    return {
        player: p.name,
        group: g.name,
        playlists: resolved.playlists,
        assetCount: resolved.assets.length,
        assets: resolved.assets,
        byPlaylist: resolved.byPlaylist
    };
}

// Same, addressed directly by group name.
async function getGroupAssets({ groupName }) {
    if (!groupName) return { error: 'groupName is required' };
    const groups = await Group.list({ criteria: {}, perPage: 500, page: 0 });
    const g = groups.find((x) => like(x.name, groupName));
    if (!g) return { error: `No group matching "${groupName}"` };
    const resolved = await resolveGroupAssets(g);
    return {
        group: g.name,
        playlists: resolved.playlists,
        assetCount: resolved.assets.length,
        assets: resolved.assets,
        byPlaylist: resolved.byPlaylist
    };
}

// Pinned rules: when a query matches, these docs are forced to the very top of
// the results (before scored macros/articles), regardless of keyword score.
// Use for high-value canned answers that must always lead for certain topics.
const PINNED_RULES = [
    {
        pattern: /\b(licen[sc]e|licensing|powered\s+by\s+pisignage|player\s+is\s+powered|activation)\b/i,
        files: ['macro-license-issue-with-open-source-server.md']
    }
];

// Turn a help-doc file's text into a result object (title + source url + excerpt).
function makeDocResult(file, text) {
    const titleMatch = text.match(/^#\s*(.+)$/m);
    const urlMatch = text.match(/^Source:\s*(https?:\/\/\S+)/m);
    return {
        source: file,
        title: titleMatch ? titleMatch[1].trim() : file,
        url: urlMatch ? urlMatch[1] : null,
        excerpt: text.slice(0, 1500)
    };
}

// Lightweight keyword search over help/troubleshooting articles. No embeddings —
// CPU-friendly and dependency-free. Drop .md/.txt files into data/help-docs/.
async function searchHelpDocs({ query, limit = 3 }) {
    if (!query) return { error: 'query is required' };
    let entries = [];
    try {
        entries = await fs.readdir(A.helpDocsDir);
    } catch {
        return {
            results: [],
            note: `No help-docs directory yet (${A.helpDocsDir}). Add .md/.txt articles there to enable grounded diagnostics.`
        };
    }
    // Drop common/noise words so distinctive terms (tv, cec, sync, hdmi…) drive
    // the match instead of "does/not/with". Domain words that appear in nearly
    // every article (player, pi, signage) are also noise for ranking.
    const STOPWORDS = new Set([
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'to', 'of', 'in', 'on', 'for', 'and', 'or', 'not', 'no', 'do', 'does',
        'did', 'how', 'what', 'why', 'who', 'when', 'where', 'my', 'your', 'our',
        'it', 'its', 'this', 'that', 'these', 'those', 'with', 'without', 'i',
        'we', 'you', 'can', 'could', 'should', 'would', 'will', 'after',
        'before', 'if', 'me', 'at', 'as', 'by', 'from', 'up', 'out', 'get',
        'got', 'have', 'has', 'had', 'please', 'help', 'need', 'want', 'about',
        'so', 'but', 'any', 'all', 'some', 'more', 'then', 'than', 'there',
        'player', 'players', 'pi', 'signage', 'pisignage'
    ]);
    const terms = [
        ...new Set(
            query
                .toLowerCase()
                .split(/\W+/)
                .filter((t) => t.length >= 2 && !STOPWORDS.has(t))
        )
    ];

    // Pinned docs for this query (forced to the top even with a weak/no match).
    const pinnedFiles = PINNED_RULES.filter((r) => r.pattern.test(query)).flatMap(
        (r) => r.files
    );

    const countOccurrences = (haystack, needle) =>
        haystack.split(needle).length - 1;

    const scored = [];
    if (terms.length > 0)
    for (const file of entries) {
        if (!/\.(md|txt)$/i.test(file)) continue;
        let text = '';
        try {
            text = await fs.readFile(path.join(A.helpDocsDir, file), 'utf8');
        } catch {
            continue;
        }
        const lower = text.toLowerCase();
        // Split the header (title + Keywords line) from the body so matches in
        // the title/keywords count for much more than incidental body mentions.
        const firstLine = (lower.split('\n')[0] || '');
        const keywordLine =
            (lower.match(/^keywords:.*$/m) || [''])[0];
        const header = `${firstLine}\n${keywordLine}`;

        let score = 0;
        let termsMatched = 0;
        for (const t of terms) {
            const inHeader = countOccurrences(header, t);
            const inBody = countOccurrences(lower, t) - inHeader;
            if (inHeader + inBody > 0) termsMatched++;
            score += inHeader * 12 + Math.min(inBody, 5); // cap body spam
        }
        if (score === 0) continue;
        // Reward covering more distinct query terms; dampen long docs so a big
        // catch-all article can't outrank a focused one on raw term counts.
        const wordCount = lower.split(/\s+/).length;
        const lengthDamp = 1 + Math.log10(Math.max(wordCount, 50) / 50);
        const finalScore = (score * (1 + termsMatched)) / lengthDamp;
        scored.push({ file, score: finalScore, text, isMacro: file.startsWith('macro-') });
    }
    // Rank macros (curated quick answers) ahead of full articles, each group by
    // relevance. Both are already relevance-gated (score > 0), so an unrelated
    // macro never surfaces — but when a macro IS relevant it comes first.
    // Rank scored hits: macros (curated quick answers) first, then articles.
    scored.sort((a, b) => b.score - a.score);
    const ordered = [
        ...scored.filter((s) => s.isMacro),
        ...scored.filter((s) => !s.isMacro)
    ];

    const results = [];
    const seen = new Set();

    // 1) Pinned docs always lead (read straight from disk, score-independent).
    for (const file of pinnedFiles) {
        if (seen.has(file)) continue;
        try {
            const text = await fs.readFile(path.join(A.helpDocsDir, file), 'utf8');
            results.push(makeDocResult(file, text));
            seen.add(file);
        } catch {
            /* pinned file missing — skip */
        }
    }

    // 2) Then the scored results (macros before articles) up to the limit.
    for (const s of ordered) {
        if (results.length >= limit) break;
        if (seen.has(s.file)) continue;
        results.push(makeDocResult(s.file, s.text));
        seen.add(s.file);
    }

    return { results };
}

/* --------------------------------------------------------------------------
 * Tool registry: JSON-Schema definitions handed to the model + dispatch map.
 * ------------------------------------------------------------------------ */

const TOOLS = [
    {
        def: {
            type: 'function',
            function: {
                name: 'list_players',
                description:
                    'List ALL signage players and their status (online/offline, current playlist, last reported). Call with NO arguments to list every player. Only pass "filter" when the user explicitly named a specific player or group to narrow to.',
                parameters: {
                    type: 'object',
                    properties: {
                        filter: { type: 'string', description: 'OPTIONAL substring; omit to list all players' },
                        onlineOnly: { type: 'boolean', description: 'If true, only return currently-online players' }
                    }
                }
            }
        },
        run: listPlayers
    },
    {
        def: {
            type: 'function',
            function: {
                name: 'get_player_status',
                description:
                    'Get detailed status for a single player by name: online state, current playlist, IP, disk space, version, TV power, last reported time.',
                parameters: {
                    type: 'object',
                    properties: { name: { type: 'string', description: 'Player name (partial ok)' } },
                    required: ['name']
                }
            }
        },
        run: getPlayerStatus
    },
    {
        def: {
            type: 'function',
            function: {
                name: 'list_groups',
                description: 'List all groups with their assigned playlists, asset counts and when each was last deployed.',
                parameters: { type: 'object', properties: {} }
            }
        },
        run: listGroups
    },
    {
        def: {
            type: 'function',
            function: {
                name: 'get_group',
                description:
                    'Get details for a single group by name, including lastDeployed time, assigned vs deployed playlists, and asset count.',
                parameters: {
                    type: 'object',
                    properties: { name: { type: 'string', description: 'Group name (partial ok)' } },
                    required: ['name']
                }
            }
        },
        run: getGroup
    },
    {
        def: {
            type: 'function',
            function: {
                name: 'get_assigned_playlist',
                description:
                    'Find which playlist is assigned/playing. Pass playerName for the live current playlist on a player, or groupName for the assigned/deployed playlists of a group.',
                parameters: {
                    type: 'object',
                    properties: {
                        playerName: { type: 'string' },
                        groupName: { type: 'string' }
                    }
                }
            }
        },
        run: getAssignedPlaylist
    },
    {
        def: {
            type: 'function',
            function: {
                name: 'list_assets',
                description:
                    'List the whole media LIBRARY (every file uploaded to the server), NOT specific to any player or group. Optionally filter by name substring or type (video/image/audio). Do NOT use this when the user names a specific player or group — use get_player_assets / get_group_assets instead.',
                parameters: {
                    type: 'object',
                    properties: {
                        filter: { type: 'string' },
                        type: { type: 'string' }
                    }
                }
            }
        },
        run: listAssets
    },
    {
        def: {
            type: 'function',
            function: {
                name: 'list_playlists',
                description: 'List the names of all playlists on the server.',
                parameters: { type: 'object', properties: {} }
            }
        },
        run: listPlaylists
    },
    {
        def: {
            type: 'function',
            function: {
                name: 'get_player_assets',
                description:
                    'Use this WHENEVER the user asks what assets/content/media/files are on, playing on, or associated with a specific named PLAYER. Resolves player → its group → the group playlists → the media in those playlists. Returns the asset list, the playlists, and a per-playlist breakdown. Prefer this over list_assets whenever a player is named.',
                parameters: {
                    type: 'object',
                    properties: { playerName: { type: 'string', description: 'Player name (partial ok)' } },
                    required: ['playerName']
                }
            }
        },
        run: getPlayerAssets
    },
    {
        def: {
            type: 'function',
            function: {
                name: 'get_group_assets',
                description:
                    'List every media asset deployed to a group, resolved through its playlists and playlist contents.',
                parameters: {
                    type: 'object',
                    properties: { groupName: { type: 'string', description: 'Group name (partial ok)' } },
                    required: ['groupName']
                }
            }
        },
        run: getGroupAssets
    },
    {
        def: {
            type: 'function',
            function: {
                name: 'search_help_docs',
                description:
                    'Search the piSignage help/troubleshooting articles for a topic (e.g. "player offline", "sync stuck"). Use this to ground diagnostic suggestions in the official docs.',
                parameters: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'What to look up' },
                        limit: { type: 'number' }
                    },
                    required: ['query']
                }
            }
        },
        run: searchHelpDocs
    }
];

const TOOL_DEFS = TOOLS.map((t) => t.def);
const TOOL_IMPL = new Map(TOOLS.map((t) => [t.def.function.name, t.run]));

/* --------------------------------------------------------------------------
 * Ollama plumbing
 * ------------------------------------------------------------------------ */

async function ollamaChat(messages, toolDefs = TOOL_DEFS) {
    const url = `${A.ollamaUrl.replace(/\/$/, '')}/api/chat`;
    const { data } = await axios.post(
        url,
        {
            model: A.model,
            messages,
            tools: toolDefs,
            stream: false,
            options: { temperature: 0 }
        },
        { timeout: A.requestTimeoutMs }
    );
    return data.message; // { role, content, tool_calls? }
}

/**
 * Streaming variant. Opens a streamed Ollama /api/chat call and invokes
 * onToken(text) for each content fragment as it arrives. Resolves with the
 * fully-assembled { content, tool_calls } once this response completes.
 * `signal` (optional AbortSignal) cancels the upstream request.
 */
async function ollamaChatStream(messages, onToken, signal, toolDefs = TOOL_DEFS) {
    const url = `${A.ollamaUrl.replace(/\/$/, '')}/api/chat`;
    const response = await axios.post(
        url,
        {
            model: A.model,
            messages,
            tools: toolDefs,
            stream: true,
            options: { temperature: 0 }
        },
        { timeout: A.requestTimeoutMs, responseType: 'stream', signal }
    );

    return new Promise((resolve, reject) => {
        let buffer = '';
        let content = '';
        let toolCalls = [];

        response.data.on('data', (chunk) => {
            buffer += chunk.toString('utf8');
            // Ollama streams newline-delimited JSON objects.
            let nl;
            while ((nl = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, nl).trim();
                buffer = buffer.slice(nl + 1);
                if (!line) continue;
                let obj;
                try {
                    obj = JSON.parse(line);
                } catch {
                    continue;
                }
                const msg = obj.message || {};
                if (msg.content) {
                    content += msg.content;
                    onToken(msg.content);
                }
                if (Array.isArray(msg.tool_calls) && msg.tool_calls.length) {
                    toolCalls = toolCalls.concat(msg.tool_calls);
                }
            }
        });
        response.data.on('end', () =>
            resolve({ content, tool_calls: toolCalls })
        );
        response.data.on('error', reject);
    });
}

// Retrieve-then-generate: on every user turn we run the help-doc search up
// front (deterministically) and inject the top matches into context, so the
// model always has the relevant articles in front of it instead of having to
// remember to call the tool. Small models are far more reliable this way.
async function retrieveHelpContext(message) {
    const res = await searchHelpDocs({ query: message, limit: 3 });
    if (!res || !res.results || res.results.length === 0) {
        return { context: null, sources: [] };
    }
    const blocks = res.results
        .map((r, i) => `[Article ${i + 1}]\n${r.excerpt}`)
        .join('\n\n----------\n\n');
    const context =
        'HELP ARTICLES (retrieved for this question — use these as the primary ' +
        'basis for any troubleshooting/how-to answer. Do NOT write any URLs; ' +
        'links are added automatically. Ignore these if the question is not a ' +
        'support question).\n\n' +
        blocks;
    const sources = res.results
        .filter((r) => r.url)
        .map((r) => ({ title: r.title, url: r.url }));
    return { context, sources };
}

// The help-doc search tool alone (for troubleshooting turns, where we don't
// want the model wandering off into player/group lookups).
const HELP_ONLY_TOOL_DEFS = TOOL_DEFS.filter(
    (t) => t.function.name === 'search_help_docs'
);

// Cheap, deterministic intent classification — done in code, not left to the
// small model. Troubleshooting turns describe a PROBLEM; status turns ask to
// enumerate/inspect the fleet.
const HELP_RE =
    /\b(not|n't|blank|black|fix|fixe?d?|issue|issues|problem|wont|won't|cannot|can't|error|errors|stuck|fail|failed|failing|crash|crashe?d?|reboot|reboots|frozen|freeze|hang|hangs|no signal|wrong|broken|why|how do|how to|how can|troubleshoot|setup|set up|configure|enable|disable|slow|lag)\b/i;
const STATUS_RE =
    /\b(list|show|display|which|how many|count|status|online|offline|connected|disconnected|deployed|last deploy|currently|current playlist|running|assigned|when was|asset|assets|content|contents|media|playlist|playlists|group|groups)\b/i;

// Returns { toolDefs, injectHelp } for the turn.
function classifyTurn(message) {
    // A pinned topic (e.g. licensing) always forces a docs-first answer,
    // overriding status-word heuristics like "my screen shows ...".
    if (PINNED_RULES.some((r) => r.pattern.test(message))) {
        return { toolDefs: HELP_ONLY_TOOL_DEFS, injectHelp: true };
    }
    const isHelp = HELP_RE.test(message);
    const isStatus = STATUS_RE.test(message);
    if (isStatus && !isHelp) {
        // Pure status/inspection question → data tools, no doc injection.
        return { toolDefs: TOOL_DEFS, injectHelp: false };
    }
    if (isHelp && !isStatus) {
        // Pure troubleshooting/how-to → docs only, no player/group lookups.
        return { toolDefs: HELP_ONLY_TOOL_DEFS, injectHelp: true };
    }
    // Mixed or unclear → give everything and inject docs (search-first default).
    return { toolDefs: TOOL_DEFS, injectHelp: true };
}

// Build the message list for a turn: system prompt, prior history, the
// auto-retrieved help articles (when relevant), then the user message. Returns
// the retrieved `sources` and the tool set the model may use this turn.
async function buildMessages(message, history) {
    const { toolDefs, injectHelp } = classifyTurn(message);
    const msgs = [{ role: 'system', content: SYSTEM_PROMPT }];
    if (Array.isArray(history)) msgs.push(...history.slice(-10));
    let sources = [];
    if (injectHelp) {
        const help = await retrieveHelpContext(message);
        if (help.context) msgs.push({ role: 'system', content: help.context });
        sources = help.sources;
    }
    msgs.push({ role: 'user', content: message });
    return { messages: msgs, sources, toolDefs };
}

// Build a trustworthy "More:" footer from the actually-retrieved articles.
// Skipped when a data tool (players/groups/etc.) drove the answer — those turns
// aren't doc-based — or when nothing was retrieved.
function citationFooter(sources, dataToolUsed) {
    if (dataToolUsed || !sources || sources.length === 0) return '';
    const lines = sources
        .slice(0, 3)
        .map((s) => `- ${s.title}: ${s.url}`)
        .join('\n');
    return `\n\nMore:\n${lines}`;
}

// Data tools are everything except the help-doc search.
const isDataTool = (name) => name && name !== 'search_help_docs';

// Ollama returns tool-call arguments already parsed as an object; some models /
// versions return a JSON string. Normalise to an object.
function parseArgs(raw) {
    if (raw && typeof raw === 'object') return raw;
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }
    return {};
}

/* --------------------------------------------------------------------------
 * Route handler: POST /api/assistant/chat
 *   body: { message: string, history?: [{role, content}] }
 * ------------------------------------------------------------------------ */

export const chat = async (req, res) => {
    const { message, history } = req.body || {};
    if (!message || typeof message !== 'string') {
        return rest.sendError(res, 'A "message" string is required', null);
    }

    const { messages, sources, toolDefs } = await buildMessages(message, history);

    const toolTrace = []; // what tools ran, for transparency in the UI
    let dataToolUsed = false;

    try {
        for (let i = 0; i < A.maxToolIterations; i++) {
            const reply = await ollamaChat(messages, toolDefs);
            messages.push(reply);

            const calls = reply.tool_calls || [];
            if (calls.length === 0) {
                // Model produced its final natural-language answer. Append the
                // real article links ourselves so citations can't be fabricated.
                return rest.sendSuccess(res, 'assistant reply', {
                    reply:
                        (reply.content || '') +
                        citationFooter(sources, dataToolUsed),
                    toolTrace
                });
            }

            // Execute every requested tool and feed results back.
            for (const call of calls) {
                const name = call.function && call.function.name;
                const args = parseArgs(call.function && call.function.arguments);
                const impl = TOOL_IMPL.get(name);
                if (isDataTool(name)) dataToolUsed = true;

                let result;
                if (!impl) {
                    result = { error: `Unknown tool: ${name}` };
                } else {
                    try {
                        result = await impl(args);
                    } catch (e) {
                        result = { error: `Tool ${name} failed: ${e.message}` };
                    }
                }
                toolTrace.push({ name, args, ok: !result?.error });
                messages.push({
                    role: 'tool',
                    tool_name: name,
                    content: JSON.stringify(result)
                });
            }
        }

        // Ran out of iterations — return the best we have.
        return rest.sendSuccess(res, 'assistant reply (iteration limit reached)', {
            reply:
                "I wasn't able to finish reasoning about that in time. Please try rephrasing or asking something more specific.",
            toolTrace
        });
    } catch (err) {
        // Most common failure: Ollama not running / model not pulled.
        const hint =
            err.code === 'ECONNREFUSED'
                ? ` Is Ollama running at ${A.ollamaUrl}? Start it and run: ollama pull ${A.model}`
                : '';
        return rest.sendError(res, `Assistant error.${hint}`, err);
    }
};

/* --------------------------------------------------------------------------
 * Route handler: POST /api/assistant/chat/stream
 *
 * Streams the reply as newline-delimited JSON events so the UI can render
 * tokens as they generate (CPU inference is slow — this matters for UX):
 *   { "type": "tool",  "name": "list_players", "args": {...} }
 *   { "type": "token", "text": "Here are ..." }
 *   { "type": "done",  "toolTrace": [...] }
 *   { "type": "error", "message": "..." }
 * ------------------------------------------------------------------------ */

export const chatStream = async (req, res) => {
    const { message, history } = req.body || {};
    if (!message || typeof message !== 'string') {
        return rest.sendError(res, 'A "message" string is required', null);
    }

    res.set({
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no' // disable proxy buffering so tokens flush
    });

    const emit = (event) => res.write(JSON.stringify(event) + '\n');

    // Abort the upstream Ollama call if the client hangs up. Listen on the
    // RESPONSE 'close' (fires on real disconnect) — not req 'close', which fires
    // as soon as body-parser finishes reading the request body.
    const controller = new AbortController();
    let finished = false;
    res.on('close', () => {
        if (!finished) controller.abort();
    });

    const { messages, sources, toolDefs } = await buildMessages(message, history);
    const toolTrace = [];
    let dataToolUsed = false;

    try {
        for (let i = 0; i < A.maxToolIterations; i++) {
            const reply = await ollamaChatStream(
                messages,
                (text) => emit({ type: 'token', text }),
                controller.signal,
                toolDefs
            );
            messages.push({
                role: 'assistant',
                content: reply.content,
                tool_calls: reply.tool_calls
            });

            const calls = reply.tool_calls || [];
            if (calls.length === 0) {
                // Stream the trustworthy article links as extra tokens so
                // citations are always real, then finish.
                const footer = citationFooter(sources, dataToolUsed);
                if (footer) emit({ type: 'token', text: footer });
                emit({ type: 'done', toolTrace });
                finished = true;
                return res.end();
            }

            for (const call of calls) {
                const name = call.function && call.function.name;
                const args = parseArgs(call.function && call.function.arguments);
                const impl = TOOL_IMPL.get(name);
                if (isDataTool(name)) dataToolUsed = true;
                emit({ type: 'tool', name, args });

                let result;
                if (!impl) {
                    result = { error: `Unknown tool: ${name}` };
                } else {
                    try {
                        result = await impl(args);
                    } catch (e) {
                        result = { error: `Tool ${name} failed: ${e.message}` };
                    }
                }
                toolTrace.push({ name, args, ok: !result?.error });
                messages.push({
                    role: 'tool',
                    tool_name: name,
                    content: JSON.stringify(result)
                });
            }
        }
        emit({ type: 'done', toolTrace });
        finished = true;
        return res.end();
    } catch (err) {
        if (controller.signal.aborted) return res.end(); // client left
        finished = true;
        const hint =
            err.code === 'ECONNREFUSED'
                ? ` Is Ollama running at ${A.ollamaUrl}? Run: ollama pull ${A.model}`
                : '';
        emit({ type: 'error', message: `Assistant error.${hint} ${err.message || ''}`.trim() });
        return res.end();
    }
};
