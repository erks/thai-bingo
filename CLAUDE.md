# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thai Bingo (บิงโกภาษาไทย) — a web app for learning Thai alphabet characters through bingo. Supports both local (same-screen) and online multiplayer modes.

## Development

- **Quick start:** `make install && make dev` — runs both client and worker locally.
- **Type-check:** `make` or `make fmt` — runs TypeScript type-checking (default target).
- **Client only:** `make client` (or open `index.html` directly). No build step.
- **Worker only:** `make worker` (or `cd worker && npx wrangler dev`).
- **Install deps:** `make install` — installs worker npm dependencies.
- **Deploy worker:** `cd worker && npx wrangler deploy` (or push to main for auto-deploy via CI/CD).
- **Clean up:** `make clean` — kills any dangling dev processes on ports 3000/8787.

## CI/CD

GitHub Actions workflows automatically run checks and deployments:

- **PR Check (`.github/workflows/pr-check.yml`)** — Runs `make fmt` on all PRs to `main`. Must pass before merge.
- **Deploy Worker (`.github/workflows/deploy-worker.yml`)** — On push to `main` (when `worker/**` changes):
  1. Runs `make fmt` to type-check
  2. Deploys to Cloudflare Workers if checks pass
  3. Requires `CLOUDFLARE_API_TOKEN` secret configured in repo settings

## Architecture

### Client — `index.html`

Single-file HTML + CSS + vanilla JS (no build step, no dependencies beyond Google Fonts and `audio.js`).

- **`<style>`** — CSS including player color theming (`--p1`–`--p4`), responsive breakpoints, animations, and online-mode layouts (lobby, primary/secondary boards)
- **HTML** — Screens toggled via `.hidden` class: setup, lobby (online), game, win overlay
- **`<script>`** — All game logic; `state.gameType` (`'local'` | `'online'`) controls branching

#### Key Data Structures

- `CONSONANTS` (44), `VOWELS` (24) — character pools
- `CONSONANT_SPEECH` / `VOWEL_SPEECH` — spoken-form keyword maps for Web Speech API
- `state` object — global state for both local and online modes

#### i18n

All UI text uses `t(key)` with `STRINGS.th`, `STRINGS.en`, and `STRINGS.ja`. Use `data-i18n` attributes for static HTML elements. Use "Moderator" (not "Teacher") for the caller role; Thai: "ผู้ดำเนินเกม", Japanese: "司会者".

**Adding a new language:**

1. Add a new `STRINGS.<code>` object in `index.html` with all keys (copy an existing language block as template)
2. Append the language code to the `LANGS` array (e.g. `['th', 'en', 'ja', 'ko']`)
3. Add an entry to `LANG_LABELS` (e.g. `ko: 'KO'`)
4. The language toggle button automatically cycles through all entries in `LANGS`

#### Online Mode Client State

- `state.role`: `'moderator'` | `'player'`
- `state._boardIdMap[index]` → playerId, `state._boardIndexMap[playerId]` → index
- Player view: own board (index 0, `.primary`) + others in `.secondary-boards-row`
- Moderator: caller section visible; players: caller section hidden
- `API_BASE` auto-detects `localhost:8787` vs production

### Worker — `worker/`

Cloudflare Worker + Durable Object for multiplayer WebSocket API.

- **`worker/src/config.ts`** — All tunable server parameters (timeouts, pool sizes, room code format, player limits)
- **`worker/src/index.ts`** — Stateless Worker entry point. Routes: `POST /api/room` (create), `GET /api/room/:code/websocket` (WS upgrade). CORS allowlist here.
- **`worker/src/room.ts`** — `BingoRoom` Durable Object using Hibernation API. Manages room state, board generation, turn flow, win detection.
- **`worker/wrangler.toml`** — DO binding `BINGO_ROOM` → `BingoRoom`

#### Durable Object Notes

- Room state is persisted to `state.storage` (survives hibernation). Every mutation must call `await this.saveRoom()`.
- State is restored in the constructor via `blockConcurrencyWhile`.
- Rooms auto-expire: hard ceiling alarm at creation + cleanup alarm on any disconnect.

#### WebSocket Message Protocol

Client → Server: `start`, `randomize`, `reveal`, `select`, `mark`
Server → Client: `joined`, `player_joined`, `player_disconnected`, `player_reconnected`, `moderator_disconnected`, `game_start`, `randomized`, `char_pending`, `revealed`, `mark_result`, `win`, `error`

#### Online Turn Flow

1. Moderator clicks randomize → server picks char, sends `randomized` (with char) to moderator, `char_pending` to players
2. Moderator speaks char aloud (or via audio). Players select a cell on their board → `select` stored server-side
3. Moderator clicks reveal → server broadcasts `revealed` with char + validated selections, checks wins

#### Board Visibility

| View                    | Own board      | Other boards   | Caller controls |
|-------------------------|----------------|----------------|-----------------|
| Local                   | All equal      | All equal      | Shared          |
| Moderator (not playing) | N/A            | All equal      | Yes             |
| Moderator (playing)     | Large, primary | Smaller, below | Yes             |
| Player                  | Large, primary | Smaller, below | No              |

## Hosting

- Client: GitHub Pages at `https://erks.github.io/thai-bingo/`
- Worker API: Cloudflare Workers

## Git

- Do not add `Co-Authored-By` lines to commits
