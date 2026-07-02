# piSignage AI Assistant — Technical Documentation

A natural-language chat assistant embedded in the piSignage server. Operators can
ask about their players, groups, playlists and media, and get grounded
troubleshooting help sourced from the piSignage knowledge base — all served by a
**local LLM** (no cloud dependency, works offline).

---

## 1. Goals & constraints

- **Natural-language operations**: "which players are offline?", "what's on the
  lobby player?", "when was the sales group last deployed?"
- **Grounded troubleshooting**: diagnostic answers must come from the official
  help articles, not model hallucination.
- **Runs offline / on modest hardware**: target server is 4–8 GB RAM, 2–4 vCPU,
  no GPU. So a **small local model** (Qwen 2.5 3B via Ollama) rather than a cloud
  API.
- **Read-only (v1)**: the assistant inspects and advises; it does not deploy,
  delete or change anything. Write actions are a future phase behind
  confirmation.

---

## 2. High-level architecture

```
 Browser (React SPA, /v2)                 pisignage-server (Node/Express)              Ollama (localhost:11434)
 ┌───────────────────────┐   POST /api/assistant/chat/stream   ┌──────────────────────┐   /api/chat   ┌──────────────┐
 │ AssistantPanel.tsx    │ ─────────── NDJSON stream ─────────▶ │ assistant.js         │ ────────────▶ │ qwen2.5:3b   │
 │  (Radix dialog)       │ ◀────── token / tool / done ──────── │  - intent classify   │ ◀──────────── │  (tool-call) │
 │ lib/assistant.ts      │                                      │  - retrieve help RAG │               └──────────────┘
 └───────────────────────┘                                      │  - tool-call loop    │
                                                                │  - Mongoose models   │──▶ MongoDB
                                                                │  - data/help-docs/*  │──▶ filesystem (KB)
                                                                └──────────────────────┘
```

The model's only job is **natural language → pick a tool + arguments** (and write
the final prose). All data access and knowledge retrieval happen in server code,
so the assistant always sees the same truth as the rest of the server.

---

## 3. Components

### 3.1 Local LLM runtime — Ollama

- Model: **`qwen2.5:3b`** (chosen for reliable tool-calling at ~2 GB, CPU-viable).
  The code is model-agnostic; override with `OLLAMA_MODEL`.
- Ollama exposes an OpenAI-style `/api/chat` with native `tools` support and NDJSON
  streaming.
- Install (per host): `ollama pull qwen2.5:3b` and run `ollama serve`
  (or `brew services start ollama` on macOS).

### 3.2 Backend controller — `app/controllers/assistant.js`

The heart of the feature. Responsibilities:

1. Classify the turn's intent (troubleshooting vs. status) — in code, not by the
   model.
2. For troubleshooting turns, **retrieve** relevant help docs and inject them.
3. Run the **tool-calling loop** against Ollama with the appropriate tool set.
4. Execute tools against Mongoose models / the media directory / the KB.
5. Stream results back as NDJSON, and append **trustworthy citations**.

### 3.3 Knowledge base — `data/help-docs/*.md`

- **188 static Markdown files** shipped with the installation (no runtime
  internet needed):
  - **174 articles** generated from the public piSignage Zendesk help center.
  - **14 macros** — curated "quick answer" canned responses.
- Searched by a dependency-free keyword ranker (no embeddings).

### 3.4 Frontend — React SPA

- `src/lib/assistant.ts` — streaming client (fetch + ReadableStream).
- `src/components/AssistantPanel.tsx` — Radix dialog chat window.
- `src/components/layout/AppShell.tsx` — floating "Assistant" launcher button.

---

## 4. Configuration — `config/env/all.js`

```js
assistant: {
  ollamaUrl:         process.env.OLLAMA_URL   || 'http://localhost:11434',
  model:             process.env.OLLAMA_MODEL || 'qwen2.5:3b',
  maxToolIterations: parseInt(process.env.OLLAMA_MAX_ITER || '5', 10),
  requestTimeoutMs:  parseInt(process.env.OLLAMA_TIMEOUT_MS || '120000', 10),
  helpDocsDir:       path.join(dataDir, 'help-docs')
}
```

All overridable via environment, so the model or endpoint can be swapped without
code changes.

---

## 5. HTTP API

Both routes are registered in `config/routes.js` and sit **behind the same Basic
Auth gate** as every other `/api` route (the React app already sends the header).

| Method & path | Handler | Purpose |
|---|---|---|
| `POST /api/assistant/chat` | `assistant.chat` | Non-streaming; returns full reply JSON. |
| `POST /api/assistant/chat/stream` | `assistant.chatStream` | Streaming (NDJSON); used by the UI. |

**Request body:** `{ message: string, history?: [{role, content}] }`

**Non-stream response:** `{ success, data: { reply, toolTrace } }`

**Streaming response** — newline-delimited JSON, one event per line:

```jsonc
{ "type": "tool",  "name": "list_players", "args": { "onlineOnly": true } }
{ "type": "token", "text": "The following players" }
{ "type": "token", "text": " are offline:" }
{ "type": "done",  "toolTrace": [ { "name": "list_players", "args": {}, "ok": true } ] }
// on failure instead of done:
{ "type": "error", "message": "Assistant error. Is Ollama running at ..." }
```

Streaming matters because CPU inference is slow — showing tokens as they generate
makes the wait feel responsive.

---

## 6. Request lifecycle (the important part)

For each user message the controller runs, in order:

### 6.1 Intent classification (`classifyTurn`)

Cheap, deterministic regex classification — **not** left to the small model:

- **Pinned topic?** (e.g. licensing) → force docs-first, help-search tool only.
- **Status/inspection** words only (`list`, `which`, `offline`, `assets`,
  `deployed`, …) → data tools, **no** doc injection.
- **Troubleshooting** words only (`not`, `blank`, `won't`, `fix`, `error`, …) →
  **help-search tool only** (so the model can't wander into player lookups).
- **Mixed / unclear** → all tools + doc injection (search-first default).

This split is what makes a 3B model behave: troubleshooting turns literally do
not have the player/group tools available, and status turns don't get irrelevant
articles injected.

### 6.2 Retrieve-then-generate (RAG) — `retrieveHelpContext` / `buildMessages`

When the turn should inject help, `search_help_docs` runs **up front** and the top
articles are inserted into the message list as a system message ("HELP
ARTICLES …"). The model always has the docs in front of it instead of having to
remember to call the tool. Search-first is guaranteed by construction.

Message list handed to the model:

```
[ system: SYSTEM_PROMPT ]
[ ...last 10 history turns ]
[ system: "HELP ARTICLES ... <top 3 excerpts>" ]   // only when injectHelp
[ user: message ]
```

### 6.3 Tool-calling loop (`chat` / `chatStream`)

```
for i in 0..maxToolIterations:
    reply = ollamaChat(messages, toolDefs)      # toolDefs from classifyTurn
    if reply has no tool_calls:
        emit final answer (+ citation footer)
        return
    for each tool_call:
        result = TOOL_IMPL[name](args)          # execute against DB / FS / KB
        append {role: 'tool', content: JSON(result)} to messages
```

`parseArgs` normalises Ollama's tool arguments (object or JSON string).

### 6.4 Trustworthy citations (`citationFooter`)

The model is instructed **not to emit URLs** (small models fabricate them). After
the answer streams, the server appends a `More:` footer built from the **actual
retrieved articles' Source URLs**. The footer is skipped when a data tool drove
the turn (`isDataTool`) or nothing was retrieved — so "list players" never gets
article links. Fabricated URLs are impossible by construction.

---

## 7. Tool registry

Tools are defined once in the `TOOLS` array (JSON-Schema `def` + `run` handler);
`TOOL_DEFS` (schemas sent to the model) and `TOOL_IMPL` (name → function) are
derived from it. All handlers are **read-only**.

| Tool | Resolves | Backed by |
|---|---|---|
| `list_players` | fleet status (online/offline, playlist, disk, IP) | `Player` model |
| `get_player_status` | one player's detail | `Player` |
| `list_groups` | all groups + `lastDeployed` | `Group` |
| `get_group` | one group's detail | `Group` |
| `get_assigned_playlist` | live/assigned playlist for a player or group | `Player` / `Group` |
| `list_assets` | the whole media **library** | media dir + `Asset` |
| `list_playlists` | playlist names | media dir |
| `get_player_assets` | **player → group → playlists → assets** (see §9) | `Player`+`Group`+FS |
| `get_group_assets` | **group → playlists → assets** | `Group`+FS |
| `search_help_docs` | KB keyword search (see §8) | `data/help-docs/` |

Data access uses the same Mongoose models (`app/models/*`) as the REST
controllers, and dates are normalised via `toDate()` (handles the epoch-ms
**string** stored in `Group.lastDeployed`).

---

## 8. Help-doc retrieval (`search_help_docs`)

A dependency-free keyword ranker — chosen over embeddings because the KB is small
and the target server is CPU-only/offline.

**Document format** (`data/help-docs/*.md`):

```markdown
# <Title>

Source: https://help.pisignage.com/hc/en-us/articles/....   (articles only)
Keywords: tv, cec, hdmi, no signal, ...

<clean plain-text body>
```

**Scoring pipeline:**

1. **Tokenise** the query, drop **stopwords** (`the`, `not`, `with`, plus
   domain-noise words `player`, `pi`, `signage`), keep terms ≥ 2 chars (so
   `tv`, `cec` survive).
2. Per doc: matches in the **title/keywords header weigh 12×**, body matches
   count 1× (capped to prevent spam), and covering more distinct query terms is
   rewarded.
3. **Length damping** (`/ (1 + log10(words/50))`) so a long catch-all article
   can't outrank a focused one on raw counts.

**Result ordering** (this is the "priority chain"):

1. **Pinned docs** — `PINNED_RULES` map a trigger regex → specific file(s),
   forced to the top regardless of score (e.g. `license` / `powered by
   pisignage` → the license macro). Pinned rules also override intent gating so
   the doc always surfaces.
2. **Macros** — curated quick answers (`macro-*.md`) rank above full articles.
3. **Articles** — the full KB.

Each result carries `{ title, url, excerpt }`; `url` is `null` for macros (no
public URL) so they enrich context but never produce a citation link.

---

## 9. Player → assets resolution

Implements the relationship graph the operator cares about:

```
player.group.name → Group → group.playlists[] → __<name>.json → assets[] → media files
```

- `playlistMediaFiles(name)` reads `__<name>.json` and collects each asset's
  `filename` plus `side`/`bottom` zone files, **recursing** into nested
  playlists (filenames starting with `__`) with a cycle guard.
- `resolveGroupAssets(group)` unions all playlist media with the group's deployed
  assets, **filters out structural files** (`__*.json`, `custom_layout*.html`,
  `_system*` — via `isContentAsset`), and enriches each with its media `type`
  from the `Asset` collection.
- `get_player_assets` starts from a player; `get_group_assets` from a group.
  Both return `{ playlists, assetCount, assets, byPlaylist }`.

---

## 10. Frontend

### 10.1 `src/lib/assistant.ts`
`streamChat(message, history, handlers, signal)` — POSTs to the stream endpoint
using `fetch` + a `ReadableStream` reader (EventSource can't send the Basic-auth
header or a body). Parses NDJSON lines and dispatches to `onToken` / `onTool` /
`onDone` / `onError`. `TOOL_LABELS` maps tool names to friendly chip text.

### 10.2 `src/components/AssistantPanel.tsx`
Radix `Dialog` chat window: streams tokens live with a blinking cursor, renders
**tool chips** ("⚡ Checked players") for transparency, keeps conversation
history, has starter suggestions, Enter-to-send, and aborts the in-flight stream
on close. A safety net clears the spinner if a stream ends without `done`.

### 10.3 `src/components/layout/AppShell.tsx`
A floating "Assistant" button (bottom-right, every page) toggles the panel.

### 10.4 Build & deploy
The SPA builds and copies into the server's `public/v2/`:
```bash
cd pisignage-server-ui && PISIGNAGE_SERVER=../pisignage-open-server-ai npm run deploy:local
```
`deploy:local` only copies UI files — **it does not restart Node**, so backend
changes require a separate server restart.

---

## 11. Setup / run

```bash
# 1. Local LLM (on the server host)
ollama pull qwen2.5:3b
ollama serve                      # listens on :11434

# 2. Server (talks to Ollama on localhost by default)
npm start                         # nodemon; auto-reloads on file changes

# 3. Open the UI
#    http://<server>:3000/v2/  → click "Assistant"
```

Smoke test without the UI:
```bash
curl -u pi:pi -X POST localhost:3000/api/assistant/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"which players are offline?"}'
```

**Operational note:** run the server under nodemon (`npm start`) during
development so edits reload. Plain `node server.js` will not pick up changes.

---

## 12. Extending

- **Add a tool**: append `{ def, run }` to the `TOOLS` array. Give it a clear,
  distinctive description (small models route by description). Add a
  `TOOL_LABELS` entry in the frontend for its chip.
- **Pin a topic**: add `{ pattern, files }` to `PINNED_RULES` (e.g. map
  "no signal"/"blank" to a specific doc).
- **Add / refresh help docs**: drop `.md`/`.txt` into `data/help-docs/`. The KB
  was generated by a one-time script (kept out of the repo) that pulls the public
  Zendesk articles + curated macros; re-run it on an internet-connected machine
  and ship the resulting files. Offline servers never fetch anything.
- **Swap the model**: set `OLLAMA_MODEL` (e.g. `qwen2.5:7b` for better tool
  discipline and less prose looseness on ~5–6 GB RAM).

---

## 13. Known limitations (Qwen 2.5 3B ceiling)

- Occasionally leaks a tool name into prose on status answers, or mislabels a
  media `type` in its summary (the correct value is passed to it; presentation is
  loose).
- Intent routing is regex-based, so an oddly-phrased question can be misrouted.

Both improve materially with `qwen2.5:7b`. The architecture (RAG-first, intent
gating, server-side citations) is model-agnostic.

---

## 14. Files

**Server (`pisignage-open-server-ai`)**
- `app/controllers/assistant.js` — controller, tools, RAG, streaming.
- `config/routes.js` — the two `/api/assistant/*` routes.
- `config/env/all.js` — `assistant` config block.
- `data/help-docs/*.md` — 188 shipped KB docs.

**Frontend (`pisignage-server-ui-ai`)**
- `src/lib/assistant.ts` — streaming client.
- `src/components/AssistantPanel.tsx` — chat UI.
- `src/components/layout/AppShell.tsx` — launcher button.
