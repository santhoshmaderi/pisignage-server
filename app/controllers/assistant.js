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
import { Settings } from '../models/settings.js';

const A = config.assistant;

/* --------------------------------------------------------------------------
 * Enablement gate
 *
 * The assistant is OFF by default (settings.assistantEnabled === false). An
 * operator turns it on in Settings, then runs scripts/install-llm.sh to install
 * the local LLM. Both chat endpoints check this flag first so the feature can be
 * shipped dark and only lights up once the admin has opted in AND installed the
 * model. Reads the flag straight off the Settings document (no settings doc yet
 * → treat as disabled, matching the schema default).
 * ------------------------------------------------------------------------ */
async function assistantEnabled() {
    try {
        const s = await Settings.findOne().lean().exec();
        return !!(s && s.assistantEnabled);
    } catch {
        return false; // DB hiccup → fail closed
    }
}

// Which model to run. Precedence: the model chosen in Settings
// (settings.assistantModel) wins; otherwise fall back to the env/default
// (OLLAMA_MODEL / config.assistant.model). Read per-request so a change in
// Settings takes effect immediately, no restart needed.
async function resolveModel() {
    try {
        const s = await Settings.findOne().lean().exec();
        const chosen = s && s.assistantModel && String(s.assistantModel).trim();
        if (chosen) return chosen;
    } catch {
        /* fall through to default */
    }
    return A.model;
}

// Ask Ollama for a model's capabilities via /api/show. Returns true/false when
// Ollama reports capabilities (newer versions), or null when it can't be
// determined (older Ollama, or the call failed) — the UI treats null as
// "unknown" rather than hiding the model.
async function modelSupportsTools(name) {
    try {
        const url = `${A.ollamaUrl.replace(/\/$/, '')}/api/show`;
        // Send both keys: newer Ollama expects `model`, older accepts `name`.
        const { data } = await axios.post(
            url,
            { name, model: name },
            { timeout: 5000 }
        );
        const caps = data && data.capabilities;
        return Array.isArray(caps) ? caps.includes('tools') : null;
    } catch {
        return null;
    }
}

// Shown when the assistant is switched off. Kept as one plain message so both
// the buffered and streaming endpoints can return the same guidance.
const DISABLED_MESSAGE =
    "The piSignage Assistant is currently **turned off**.\n\n" +
    'To use it: open **Settings → piSignage Assistant** and enable it, then run the ' +
    'one-time install script on your server to set up the local AI model:\n\n' +
    '1. `cd` into your piSignage server directory\n' +
    '2. Run `sudo bash scripts/install-llm.sh`\n' +
    '3. Wait for the model to download, then reload this page.\n\n' +
    'The assistant runs a small language model **locally** on your server — nothing leaves your network.';

/**
 * GET /api/assistant/status
 * Lightweight health probe the UI uses to decide whether to show the assistant
 * launcher and to render setup guidance. Reports whether the feature flag is on,
 * whether the local Ollama runtime is reachable, and whether the configured
 * model has actually been pulled.
 */
export const status = async (req, res) => {
    const enabled = await assistantEnabled();
    const model = await resolveModel();
    const ollama = { reachable: false, modelInstalled: false, models: [] };
    try {
        const url = `${A.ollamaUrl.replace(/\/$/, '')}/api/tags`;
        const { data } = await axios.get(url, { timeout: 3000 });
        ollama.reachable = true;
        const names = Array.isArray(data.models)
            ? data.models.map((m) => m && m.name).filter(Boolean)
            : [];
        ollama.models = names;
        // Exact-tag match: the chat request asks Ollama for this exact name, so
        // "installed" must mean this exact tag is present (a same-family but
        // different tag would still fail the actual chat call).
        ollama.modelInstalled = names.includes(model);
    } catch {
        /* Ollama not installed / not running — reachable stays false */
    }
    // ready = the operator can actually chat right now.
    const ready = enabled && ollama.reachable && ollama.modelInstalled;
    return rest.sendSuccess(res, 'assistant status', {
        enabled,
        ready,
        model,
        ollamaUrl: A.ollamaUrl,
        ollama
    });
};

/**
 * GET /api/assistant/models
 * List the models installed in the local Ollama, annotated with whether each
 * supports tool/function calling (the assistant relies on tools, so non-tool
 * models can't drive it). The Settings UI uses this to populate the model
 * picker. `tools` is true/false when Ollama reports capabilities, or null when
 * it can't be determined.
 */
export const models = async (req, res) => {
    const current = await resolveModel();
    const payload = { current, models: [] };
    let list = [];
    try {
        const url = `${A.ollamaUrl.replace(/\/$/, '')}/api/tags`;
        const { data } = await axios.get(url, { timeout: 3000 });
        list = Array.isArray(data.models) ? data.models : [];
    } catch {
        return rest.sendSuccess(res, 'assistant models (ollama unreachable)', {
            ...payload,
            reachable: false
        });
    }

    const annotated = await Promise.all(
        list
            .filter((m) => m && m.name)
            .map(async (m) => ({
                name: m.name,
                tools: await modelSupportsTools(m.name),
                size: m.size || null,
                family: (m.details && m.details.family) || null
            }))
    );

    // Tool-capable first, then unknown, then non-tool; alphabetical within each.
    const rank = (t) => (t === true ? 0 : t === null ? 1 : 2);
    annotated.sort(
        (a, b) => rank(a.tools) - rank(b.tools) || a.name.localeCompare(b.name)
    );

    return rest.sendSuccess(res, 'assistant models', {
        ...payload,
        reachable: true,
        models: annotated
    });
};

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
- ONLINE/OFFLINE QUESTIONS ("which players are offline?", "is anything down?", "how many are online?"): call list_players with NO arguments and answer STRICTLY from the returned offlineCount / offlinePlayers / onlineCount / onlinePlayers fields — these always describe the WHOLE fleet. If offlineCount is 0 say all are online; otherwise LIST the offlinePlayers by name. Do NOT conclude "all online" from an empty players array — that only means a filter was applied; the counts are the source of truth.
- DIAGNOSE FROM THE LIVE SERVER FIRST. For any troubleshooting/how-to question (blank screen, offline player, stuck sync, TV won't turn on, video not playing, resolution wrong, etc.), a snapshot of the relevant player/group state is AUTOMATICALLY retrieved and included as a system message beginning "LIVE SERVER STATE". Read it FIRST and look for a concrete cause in the real data: is the player offline (online=false) or last reported long ago? is syncInProgress true (content still downloading)? is the TV off (tvOn=false)? was the group never/just deployed (lastDeployedAgo)? is disk space low? If the live state explains the problem, LEAD your answer with that specific finding (e.g. "\`lobby\` is offline — last seen 3h ago").
- Help articles are ALSO retrieved automatically in a system message beginning "HELP ARTICLES". AFTER the live-state diagnosis, use them for the step-by-step fix. If no LIVE SERVER STATE was provided (the user didn't name a player, or none matched), you MAY call the data tools (list_players, get_player_status, get_group…) to fetch the state you need before giving doc-based steps.
- Structure a troubleshooting answer as: (1) a one-line finding from the live state (or the most likely cause if the state is inconclusive), then (2) numbered fix steps drawn from the articles. Do NOT write your own "More:"/Source/URL line — the article links are appended automatically.
- ONLY cite a URL that appears verbatim in a "Source:" line of the provided HELP ARTICLES. NEVER invent, guess, or construct a URL. If the articles don't cover the question, say so and give at most one general suggestion — do not invent detailed steps.
- NEVER say you are "about to" search, check or look something up. Answer directly from the articles already provided. Do not end your reply with a promise to check something.
- You may still call search_help_docs to look up a DIFFERENT topic than what was retrieved, using only symptom/topic words (never player/group names).
- NEVER mention tool names, function names, or internal mechanics to the user (never write "list_players", "search_help_docs", "get_group", etc.). Speak like a human support engineer. Call tools silently; the user only sees your final answer.
- Be concise. Prefer short numbered steps over long prose. Report times in a human-friendly way.
- Formatting: wrap every file name, asset name, playlist name and group name in backticks (e.g. \`image2.jpg\`, \`Test\`) so they render as distinct chips. When listing a playlist's or player's assets, use a numbered or bulleted list with the file name first, then its details (type, duration, zone) after a dash — keep each item on one line.
- Try to answer from the documentation provided first. If the docs don't cover a support/how-to question, and it's not a simple common clarification, say "I don't have documentation on that" and suggest contacting support@pisignage.com.
- Do NOT append a citation, "Source", or "[Article title](url)" line yourself. Real article links are added automatically after your answer when relevant — for status/data answers (players, groups, playlists, assets) there is NO article to cite, so never invent one.
- If the user's problem suggests a common mistake (e.g. duration in ms vs seconds), point it out proactively.
- Ask ONE clarifying question if the request is ambiguous.
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

// Human, ICU-independent absolute timestamp, e.g. "Jul 2, 2026 · 1:13 PM UTC".
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatWhen = (v) => {
    const d = toDate(v);
    if (!d) return null;
    let h = d.getUTCHours();
    const min = String(d.getUTCMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()} · ${h}:${min} ${ampm} UTC`;
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

// The playlist name(s) a player is actually running, derived from its group the
// same way players.js sendConfig() pushes them: the DEPLOYED set once a deploy
// has happened, else the assigned set. Modern players run several playlists;
// legacy players a single one. The player's OWN `currentPlaylist` field is only
// maintained by the server for legacy (v0) players, so it's stale/empty for
// modern players — we derive from the group instead. `groups` is a
// Map(groupId -> group doc) from loadGroupsById(); without it we fall back to
// the legacy field.
const runningPlaylists = (player, groups) => {
    const g = groups && player.group && player.group._id
        ? groups.get(String(player.group._id))
        : null;
    if (g) {
        const deployed = g.deployedPlaylists && g.deployedPlaylists.length > 0;
        const refs = (deployed ? g.deployedPlaylists : g.playlists) || [];
        return refs
            .map((pl) => (typeof pl === 'string' ? pl : pl && pl.name))
            .filter(Boolean);
    }
    return player.currentPlaylist ? [player.currentPlaylist] : [];
};

// Load all groups into a Map keyed by id string, so a batch of players can be
// resolved to their running playlists with a single DB read.
async function loadGroupsById() {
    try {
        const list = await Group.list({ criteria: {}, perPage: 500, page: 0 });
        return new Map(list.map((g) => [String(g._id), g]));
    } catch {
        return new Map();
    }
}

// Compact, LLM-friendly view of a player document. Some records have no name
// set yet (registered but never named) — fall back to the CPU serial so the
// model can still refer to the player instead of saying "undefined".
// `groups` (Map from loadGroupsById) lets us report the playlists the player is
// actually running; without it we fall back to the legacy currentPlaylist field.
const playerView = (p, groups) => ({
    name: p.name || (p.cpuSerialNumber ? `(unnamed · ${p.cpuSerialNumber})` : '(unnamed player)'),
    group: p.group && p.group.name,
    online: !!p.isConnected,
    playlists: runningPlaylists(p, groups),
    lastReported: formatWhen(p.lastReported),
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
    lastDeployed: formatWhen(g.lastDeployed),
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

async function listPlayers({ filter, onlineOnly, offlineOnly } = {}) {
    const players = await Player.find({}).sort({ name: 1 }).lean().exec();
    const groups = await loadGroupsById();
    let views = players.map((p) => playerView(p, groups));
    if (filter) {
        views = views.filter(
            (p) => like(p.name, filter) || like(p.group, filter)
        );
    }
    // Compute the online/offline split up front so the summary is ALWAYS
    // complete — even if the caller asked for onlineOnly (a small model will
    // sometimes pass onlineOnly:true for a "which are offline?" question, which
    // previously hid every offline player and led to a wrong "all online"
    // answer). The counts and name lists below never lie about the fleet; only
    // the detailed `players` array respects the online/offline filter.
    const onlineViews = views.filter((p) => p.online);
    const offlineViews = views.filter((p) => !p.online);

    let shown = views;
    if (offlineOnly) shown = offlineViews;
    else if (onlineOnly) shown = onlineViews;

    return {
        total: views.length,
        onlineCount: onlineViews.length,
        offlineCount: offlineViews.length,
        // Explicit name lists so the model doesn't have to filter the array.
        onlinePlayers: onlineViews.map((p) => p.name),
        offlinePlayers: offlineViews.map((p) => p.name),
        players: shown.slice(0, 100)
    };
}

async function getPlayerStatus({ name }) {
    if (!name) return { error: 'name is required' };
    const players = await Player.find({}).lean().exec();
    const match = players.find((p) => like(p.name, name));
    if (!match) return { error: `No player matching "${name}"` };
    const groups = await loadGroupsById();
    return playerView(match, groups);
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
        const groups = await loadGroupsById();
        return {
            player: p.name,
            group: p.group && p.group.name,
            playlists: runningPlaylists(p, groups),
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
    // side/bottom zones only exist in multi-zone layouts. Layout "1" (or unset)
    // is a single fullscreen zone, so ignore any leftover side/bottom values.
    const multiZone = obj.layout && obj.layout !== '1';
    const keys = multiZone ? ['filename', 'side', 'bottom'] : ['filename'];
    const out = [];
    for (const a of obj.assets || []) {
        for (const key of keys) {
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
// plus any group-level assets. Returns { playlists, assets, byPlaylist }.
//
// Mirrors what the player ACTUALLY runs — see sendConfig() in players.js: the
// DEPLOYED set is authoritative once a deploy has happened, and only when the
// group was never deployed do we fall back to the assigned/staged set. Using
// the assigned set instead would describe content that isn't on the screen yet
// after an edit-without-deploy.
async function resolveGroupAssets(group) {
    const deployed = !!(group.deployedPlaylists && group.deployedPlaylists.length > 0);
    const refs = (deployed ? group.deployedPlaylists : group.playlists) || [];
    const groupAssets = (deployed ? group.deployedAssets : group.assets) || [];

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
    // Group-level assets (already-flattened list stored on the group), taking
    // the same deployed/assigned choice as the playlists above.
    for (const a of groupAssets) {
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

// Contents of a specific named playlist: the ordered assets it plays, with
// duration, zone placement and media type. Reads the __<name>.json directly.
async function getPlaylistAssets({ playlistName }) {
    if (!playlistName) return { error: 'playlistName is required' };
    let files = [];
    try {
        files = await fs.readdir(config.mediaDir);
    } catch (e) {
        return { error: `Could not read media directory: ${e.message}` };
    }
    const plFiles = files.filter((f) => f.startsWith('__') && f.endsWith('.json'));
    const nameOf = (f) => f.slice(2, -5);
    const q = playlistName.toLowerCase();
    const match =
        plFiles.find((f) => nameOf(f).toLowerCase() === q) ||
        plFiles.find((f) => nameOf(f).toLowerCase().includes(q));
    if (!match) return { error: `No playlist matching "${playlistName}"` };

    let obj;
    try {
        obj = JSON.parse(await fs.readFile(path.join(config.mediaDir, match), 'utf8'));
    } catch (e) {
        return { error: `Could not read playlist: ${e.message}` };
    }

    let meta = new Map();
    try {
        const db = await Asset.find({}).lean().exec();
        meta = new Map(db.map((d) => [d.name, d.type]));
    } catch {
        /* type optional */
    }

    // Only report side/bottom zones for genuinely multi-zone layouts; layout "1"
    // (or unset) is single fullscreen, so leftover side/bottom values are ignored.
    const multiZone = obj.layout && obj.layout !== '1';
    const assets = (obj.assets || [])
        .filter((a) => a && a.filename)
        .map((a) => {
            const item = {
                filename: a.filename,
                type: meta.get(a.filename) || null,
                duration: a.duration ?? null,
                fullscreen: !!a.fullscreen
            };
            if (multiZone) {
                item.side = a.side || null;
                item.bottom = a.bottom || null;
            }
            return item;
        });

    return {
        playlist: nameOf(match),
        layout: obj.layout || '1',
        multiZone: !!multiZone,
        assetCount: assets.length,
        assets
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
    // Rank by relevance first; only when scores tie do we prefer the curated
    // macro (quick answer) over a full article. Previously macros were forced
    // ahead of ALL articles regardless of score, so a weakly-matching macro
    // (e.g. the license macro catching the word "server") could outrank a
    // strongly-matching article and get injected/cited on unrelated answers.
    scored.sort((a, b) => b.score - a.score || (b.isMacro === true) - (a.isMacro === true));
    const ordered = scored;

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
                    'List signage players and their status. The result ALWAYS includes total, onlineCount, offlineCount, and the full onlinePlayers and offlinePlayers name lists — so to answer "which players are offline/online?" just read offlinePlayers/onlinePlayers; you do NOT need onlineOnly/offlineOnly for that. Call with NO arguments for everything. Only pass "filter" when the user named a specific player or group.',
                parameters: {
                    type: 'object',
                    properties: {
                        filter: { type: 'string', description: 'OPTIONAL substring; omit to list all players' },
                        onlineOnly: { type: 'boolean', description: 'If true, the detailed players array is limited to online players (counts/name-lists are still complete)' },
                        offlineOnly: { type: 'boolean', description: 'If true, the detailed players array is limited to offline players (counts/name-lists are still complete)' }
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
                    'Find which playlist(s) are playing. Pass playerName for the playlists a player is currently running (resolved from its group), or groupName for the assigned/deployed playlists of a group.',
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
                description:
                    'List the NAMES of all playlists on the server (names only, no contents). To see what is inside a specific playlist, use get_playlist_assets instead.',
                parameters: { type: 'object', properties: {} }
            }
        },
        run: listPlaylists
    },
    {
        def: {
            type: 'function',
            function: {
                name: 'get_playlist_assets',
                description:
                    'List the CONTENTS of one specific named playlist — the actual media files it plays, in order, with duration, zone and type. Use this whenever the user asks what is in / inside / the contents of a playlist. Never make up filenames; always call this.',
                parameters: {
                    type: 'object',
                    properties: { playlistName: { type: 'string', description: 'Playlist name (partial ok)' } },
                    required: ['playlistName']
                }
            }
        },
        run: getPlaylistAssets
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

async function ollamaChat(messages, toolDefs = TOOL_DEFS, model = A.model) {
    const url = `${A.ollamaUrl.replace(/\/$/, '')}/api/chat`;
    const { data } = await axios.post(
        url,
        {
            model,
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
async function ollamaChatStream(messages, onToken, signal, toolDefs = TOOL_DEFS, model = A.model) {
    const url = `${A.ollamaUrl.replace(/\/$/, '')}/api/chat`;
    const response = await axios.post(
        url,
        {
            model,
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

// Diagnose-first: on a troubleshooting turn, deterministically fetch a snapshot
// of the LIVE server state and inject it so the model reasons from real data
// before it reaches for the docs. If the user named a player/group we snapshot
// those; otherwise we summarise fleet health (offline players, in-progress
// syncs) so a "why is my screen blank?" still gets grounded in reality.
async function retrieveServerState(message) {
    let players = [];
    let groups = [];
    try {
        players = await Player.find({}).lean().exec();
    } catch {
        /* DB optional — fall through to whatever we have */
    }
    try {
        groups = await Group.list({ criteria: {}, perPage: 500, page: 0 });
    } catch {
        /* DB optional */
    }
    if (!players.length && !groups.length) return null;

    // Index groups by id so playerView can report each player's actually-running
    // playlists (reuses the groups we already loaded — no extra DB read).
    const groupsMap = new Map(groups.map((g) => [String(g._id), g]));

    // Pad with spaces so a bare name at the start/end still matches on a word.
    const hay = ` ${message.toLowerCase()} `;
    const named = (name) =>
        typeof name === 'string' &&
        name.length >= 2 &&
        hay.includes(name.toLowerCase());

    const matchedPlayers = players.filter((p) => named(p.name)).slice(0, 5);
    const matchedGroups = groups.filter((g) => named(g.name)).slice(0, 5);

    const parts = [];
    if (matchedPlayers.length) {
        parts.push(
            'Player(s) named in the question:\n' +
            JSON.stringify(matchedPlayers.map((p) => playerView(p, groupsMap)), null, 2)
        );
    }
    if (matchedGroups.length) {
        parts.push(
            'Group(s) named in the question:\n' +
            JSON.stringify(matchedGroups.map(groupView), null, 2)
        );
    }
    // Nothing specific named → give a fleet-health overview to diagnose from.
    if (!matchedPlayers.length && !matchedGroups.length && players.length) {
        const views = players.map((p) => playerView(p, groupsMap));
        const offline = views.filter((p) => !p.online);
        const syncing = views.filter((p) => p.syncInProgress);
        parts.push(
            'Fleet health overview:\n' +
            JSON.stringify(
                {
                    totalPlayers: views.length,
                    online: views.length - offline.length,
                    offline: offline.map((p) => ({
                        name: p.name,
                        lastReportedAgo: p.lastReportedAgo
                    })),
                    syncInProgress: syncing.map((p) => p.name)
                },
                null,
                2
            )
        );
    }
    if (!parts.length) return null;

    return (
        'LIVE SERVER STATE (retrieved now — diagnose from THIS before the help ' +
        'articles; every status claim you make must come from this data, not a ' +
        'guess). Ignore if the question is not about a player/group problem.\n\n' +
        parts.join('\n\n')
    );
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

// Write-action guard. The assistant is READ-ONLY, so any imperative request to
// change the system is refused in CODE (not left to the model, which will
// happily claim "I'll deploy it"). Verbs use word boundaries so "deployed" /
// "assigned" (read/state) don't match "deploy" / "assign" (command).
const WRITE_INTENT_RE =
    /\b(deploy|redeploy|un-?deploy|delete|remove|reboot|restart|shutdown|power (on|off)|turn (on|off)|rename|reassign|assign|push|upload|set (the )?playlist|change (the )?playlist|add (an? )?asset)\b/i;
// If the user is clearly ASKING (how/what/why/can I…) it's a how-to question,
// not a command — let the normal docs flow answer it.
const QUESTION_HINT_RE =
    /\b(how|what|why|when|where|which|can i|could i|is it|are they|does|do i|should i|explain|tell me|guide|steps?)\b/i;

const isWriteCommand = (msg) =>
    WRITE_INTENT_RE.test(msg) && !QUESTION_HINT_RE.test(msg);

const READONLY_REFUSAL =
    "I'm a **read-only** assistant, so I can't deploy, delete, or change anything — I can only show status and help you troubleshoot.\n\n" +
    'To deploy a playlist, open the group in the **Groups** screen and click **Deploy**.';

// ── Premium-edition feature pointers ──────────────────────────────────────
// When the user asks about a capability that lives in the piSignage paid
// editions (managed cloud or self-hosted white-label) rather than the
// open-source server, the model answers what it can and we append a short,
// non-hallucinated pointer with a REAL link. First match wins. Toggle with
// ASSISTANT_SUGGEST_PREMIUM=false.
const PREMIUM_FEATURE_RULES = [
    {
        feature: 'Reporting & Power BI',
        pattern: /\b(power\s?bi|reporting|reports?|analytics|proof of play|audit trail)\b/i,
        url: 'https://help.pisignage.com/hc/en-us/articles/58058827745049-Showing-a-Power-BI-report-on-your-screens'
    },
    {
        feature: 'Team & access control',
        pattern: /\b(user management|collaborators?|multiple users|multi[-\s]?user|add (a |another )?user|roles?|permissions?|access control|sso|saml|single sign)\b/i,
        url: 'https://help.pisignage.com/hc/en-us/articles/360001413451-Adding-collaborators-other-users-to-manage-your-account'
    },
    {
        feature: 'Template library',
        pattern: /\b(templates?|template library|template marketplace|design (a )?layout|layout library)\b/i,
        url: 'https://pisignage.com/templates'
    },
    {
        feature: 'App store & integrations',
        pattern: /\b(app\s?store|plug-?ins?|widgets?|integrations?|marketplace)\b/i,
        url: 'https://pisignage.com'
    },
    {
        feature: 'White-label & branding',
        pattern: /\b(white[-\s]?label|branding|custom domain|resellers?|partners?)\b/i,
        url: 'https://pisignage.com/partners'
    }
];

const premiumFeatureFor = (msg) =>
    (typeof msg === 'string' && PREMIUM_FEATURE_RULES.find((r) => r.pattern.test(msg))) ||
    null;

// Leading banner shown BEFORE the answer so the paid-edition framing comes
// first (not buried under how-to steps). Real link only — never fabricated.
const premiumFeatureBanner = (msg) => {
    if (!A.suggestPremium) return '';
    const rule = premiumFeatureFor(msg);
    if (!rule) return '';
    return `💎 **${rule.feature}** isn't part of the open-source server — it's available in piSignage's paid editions (managed cloud or self-hosted white-label). [See what's included ↗](${rule.url})\n\n---\n\n`;
};

// Returns { toolDefs, injectHelp, injectState } for the turn.
function classifyTurn(message) {
    // A pinned topic (e.g. licensing) always forces a docs-first answer,
    // overriding status-word heuristics like "my screen shows ...".
    if (PINNED_RULES.some((r) => r.pattern.test(message))) {
        return { toolDefs: HELP_ONLY_TOOL_DEFS, injectHelp: true, injectState: false };
    }
    const isHelp = HELP_RE.test(message);
    const isStatus = STATUS_RE.test(message);
    if (isStatus && !isHelp) {
        // Pure status/inspection question → data tools, no docs, no diagnosis.
        return { toolDefs: TOOL_DEFS, injectHelp: false, injectState: false };
    }
    // Troubleshooting or mixed/unclear → diagnose from the live server FIRST
    // (inject state on problem turns), then ground the fix in the docs. Give the
    // full tool set so the model can pull any extra state it still needs.
    return { toolDefs: TOOL_DEFS, injectHelp: true, injectState: isHelp };
}

// Build the message list for a turn: system prompt, prior history, the
// auto-retrieved help articles (when relevant), then the user message. Returns
// the retrieved `sources` and the tool set the model may use this turn.
async function buildMessages(message, history) {
    const { toolDefs, injectHelp, injectState } = classifyTurn(message);
    const msgs = [{ role: 'system', content: SYSTEM_PROMPT }];
    if (Array.isArray(history)) msgs.push(...history.slice(-10));

    // Diagnose-first: live server state goes in BEFORE the help articles so the
    // model checks the real system before reaching for documentation.
    if (injectState) {
        const state = await retrieveServerState(message);
        if (state) msgs.push({ role: 'system', content: state });
    }

    let sources = [];
    if (injectHelp) {
        const help = await retrieveHelpContext(message);
        if (help.context) msgs.push({ role: 'system', content: help.context });
        sources = help.sources;
    }
    // If the question is about a paid-edition feature, tell the model to frame
    // it that way rather than implying the open-source server supports it.
    const premium = A.suggestPremium && premiumFeatureFor(message);
    if (premium) {
        msgs.push({
            role: 'system',
            content:
                `NOTE: "${premium.feature}" is a piSignage PAID-EDITION feature (managed cloud or self-hosted white-label). ` +
                'It is NOT available in this open-source server. Make that clear, and describe how it works in those editions only briefly, based on the HELP ARTICLES. ' +
                'Do NOT give step-by-step instructions that imply it can be done on this open-source server, and do not invent UI menus.'
        });
    }
    msgs.push({ role: 'user', content: message });
    return { messages: msgs, sources, toolDefs, injectHelp };
}

// Build a trustworthy "More:" footer from the actually-retrieved articles.
// Skipped when this wasn't a help/support turn (suppress=true) or when nothing
// was retrieved.
function citationFooter(sources, suppress) {
    if (suppress || !sources || sources.length === 0) return '';
    const lines = sources
        .slice(0, 3)
        .map((s) => `- ${s.title}: ${s.url}`)
        .join('\n');
    return `\n\nMore:\n${lines}`;
}

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

    // Feature gate: assistant is opt-in and off by default.
    if (!(await assistantEnabled())) {
        return rest.sendSuccess(res, 'assistant disabled', {
            reply: DISABLED_MESSAGE,
            disabled: true,
            toolTrace: []
        });
    }

    // Read-only guard: never let the model claim it will perform a write action.
    if (isWriteCommand(message)) {
        return rest.sendSuccess(res, 'assistant reply', {
            reply: READONLY_REFUSAL,
            toolTrace: []
        });
    }

    const { messages, sources, toolDefs, injectHelp } = await buildMessages(message, history);
    const model = await resolveModel();

    const toolTrace = []; // what tools ran, for transparency in the UI

    try {
        for (let i = 0; i < A.maxToolIterations; i++) {
            const reply = await ollamaChat(messages, toolDefs, model);
            messages.push(reply);

            const calls = reply.tool_calls || [];
            if (calls.length === 0) {
                // Model produced its final natural-language answer. Append the
                // real article links ourselves so citations can't be fabricated.
                return rest.sendSuccess(res, 'assistant reply', {
                    reply:
                        premiumFeatureBanner(message) +
                        (reply.content || '') +
                        citationFooter(sources, !injectHelp),
                    toolTrace
                });
            }

            // Execute every requested tool and feed results back.
            for (const call of calls) {
                const name = call.function && call.function.name;
                const args = parseArgs(call.function && call.function.arguments);
                const impl = TOOL_IMPL.get(name);

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
                ? ` Is Ollama running at ${A.ollamaUrl}? Start it and run: ollama pull ${model}`
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

    // Feature gate: assistant is opt-in and off by default. Emit the setup
    // guidance as a normal token stream so the UI renders it like any reply.
    if (!(await assistantEnabled())) {
        emit({ type: 'token', text: DISABLED_MESSAGE });
        emit({ type: 'done', toolTrace: [], disabled: true });
        return res.end();
    }

    // Abort the upstream Ollama call if the client hangs up. Listen on the
    // RESPONSE 'close' (fires on real disconnect) — not req 'close', which fires
    // as soon as body-parser finishes reading the request body.
    const controller = new AbortController();
    let finished = false;
    res.on('close', () => {
        if (!finished) controller.abort();
    });

    // Read-only guard: refuse write commands in code, before the model runs.
    if (isWriteCommand(message)) {
        emit({ type: 'token', text: READONLY_REFUSAL });
        emit({ type: 'done', toolTrace: [] });
        finished = true;
        return res.end();
    }

    const { messages, sources, toolDefs, injectHelp } = await buildMessages(message, history);
    const model = await resolveModel();
    const toolTrace = [];

    // Lead with the paid-edition notice (before the model's answer streams).
    const banner = premiumFeatureBanner(message);
    if (banner) emit({ type: 'token', text: banner });

    try {
        for (let i = 0; i < A.maxToolIterations; i++) {
            const reply = await ollamaChatStream(
                messages,
                (text) => emit({ type: 'token', text }),
                controller.signal,
                toolDefs,
                model
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
                const footer = citationFooter(sources, !injectHelp);
                if (footer) emit({ type: 'token', text: footer });
                emit({ type: 'done', toolTrace });
                finished = true;
                return res.end();
            }

            for (const call of calls) {
                const name = call.function && call.function.name;
                const args = parseArgs(call.function && call.function.arguments);
                const impl = TOOL_IMPL.get(name);
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
                ? ` Is Ollama running at ${A.ollamaUrl}? Run: ollama pull ${model}`
                : '';
        emit({ type: 'error', message: `Assistant error.${hint} ${err.message || ''}`.trim() });
        return res.end();
    }
};
