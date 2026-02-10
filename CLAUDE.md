# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thai Bingo (บิงโกภาษาไทย) — a web app for learning Thai alphabet characters through bingo. Supports both local (same-screen) and online multiplayer modes.

## Development

- **Quick start:** `make install && make dev` — runs both client and worker locally.
- **Type-check:** `make` or `make fmt` — runs TypeScript type-checking (default target).
- **Tests:** `make test` — runs worker unit + integration tests via Vitest.
- **Client only:** `make client` (or open `index.html` directly). No build step.
- **Worker only:** `make worker` (or `cd worker && npx wrangler dev`).
- **Install deps:** `make install` — installs worker npm dependencies.
- **Deploy worker:** `cd worker && npx wrangler deploy` (or push to main for auto-deploy via CI/CD).
- **Clean up:** `make clean` — kills any dangling dev processes on ports 3000/8787.

## CI/CD

GitHub Actions workflows automatically run checks and deployments:

- **PR Check (`.github/workflows/pr-check.yml`)** — Runs `make fmt` and `make test` on all PRs to `main`. Must pass before merge.
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

Cloudflare Worker + Durable Object for multiplayer WebSocket API. The codebase is modular: pure types, utilities, and game logic are in separate files for testability. The Durable Object class orchestrates them.

- **`worker/src/types.ts`** — Shared TypeScript interfaces: `Env`, `Cell`, `PlayerInfo`, `PendingSelection`, `RoomState`, `ClientMessage`
- **`worker/src/config.ts`** — All tunable server parameters (timeouts, pool sizes, room code format, player limits)
- **`worker/src/utils.ts`** — Pure utility functions: `shuffle()`, `generateCode()`, `generateId()`
- **`worker/src/game.ts`** — Pure game logic and data: `CONSONANTS`, `VOWELS`, `generateBoard()`, `checkWin()`, `buildGamePool()`
- **`worker/src/index.ts`** — Stateless Worker entry point. Routes: `POST /api/room` (create), `GET /api/room/:code/websocket` (WS upgrade). CORS allowlist here.
- **`worker/src/room.ts`** — `BingoRoom` Durable Object using Hibernation API. Orchestrates room state, WebSocket lifecycle, and game handlers. Imports pure logic from `game.ts` and `utils.ts`.
- **`worker/wrangler.toml`** — DO binding `BINGO_ROOM` → `BingoRoom`

#### Design Principles

- **Pure functions over methods.** Game logic (`checkWin`, `generateBoard`, `buildGamePool`) and utilities (`shuffle`, `generateCode`, `generateId`) are standalone exported functions, not class methods. This makes them trivially unit-testable without mocking DO state.
- **Single responsibility per file.** Types, config, utilities, game logic, HTTP routing, and DO orchestration each have their own file. New logic should go in the most specific file, not `room.ts`.
- **Thin orchestrator.** `room.ts` should remain a thin orchestrator that wires together pure functions. When adding features, extract testable logic into `game.ts` or `utils.ts` first, then call it from the handler.

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

## Testing

Tests live in `worker/test/` and run via Vitest with `@cloudflare/vitest-pool-workers` (real Workers runtime, not mocks).

- **Run:** `make test` (or `cd worker && npm test`)
- **Config:** `worker/vitest.config.ts` — uses Workers pool with `isolatedStorage: false` (required for WebSocket tests)

### Test structure

| File | Type | What it covers |
|------|------|----------------|
| `worker/test/utils.test.ts` | Unit | `shuffle`, `generateCode`, `generateId` |
| `worker/test/game.test.ts` | Unit | `generateBoard`, `checkWin`, `buildGamePool`, data arrays |
| `worker/test/room.test.ts` | Integration | Full DO lifecycle via WebSocket: room creation, joins, game start, turn flow, marks, win detection, disconnect/reconnect, alarm cleanup, ready state, replay |

### Test expectations

Tests must be kept up-to-date with high coverage. When making changes to the worker:

- **New pure logic** (game rules, utilities) → add unit tests in the corresponding test file
- **New message types or handler changes** → add or update integration tests in `room.test.ts`
- **Bug fixes** → add a regression test that would have caught the bug
- **All tests must pass** before merging (`make fmt && make test`)

### Writing good tests

- **Test behavior, not implementation.** Assert on observable outcomes (messages received, state changes) rather than internal method calls.
- **Prefer pure functions.** If new logic can be a pure function in `game.ts` or `utils.ts`, extract it there and unit test it directly. This is faster and more reliable than testing through WebSocket message flows.
- **Integration tests use real WebSockets.** `room.test.ts` connects actual WebSocket clients to the DO and exchanges messages. Use the `connectWs()` helper and `ofType()` to filter messages.
- **Avoid testing through storage manipulation.** `runInDurableObject` can read storage for assertions but should not be used to set up game state — the in-memory `this.room` won't reflect storage changes. Drive state through the normal message protocol instead.

## Hosting

- Client: GitHub Pages at `https://erks.github.io/thai-bingo/`
- Worker API: Cloudflare Workers

## Git

- Do not add `Co-Authored-By` lines to commits
