# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thai Bingo (บิงโกภาษาไทย) — a web app for learning Thai alphabet characters through bingo. Supports both local (same-screen) and online multiplayer modes.

## Development

- **Quick start:** `make install && make dev` — runs both client (Vite) and worker locally.
- **Type-check:** `make` or `make fmt` — type-checks all packages (shared, worker, client).
- **Tests:** `make test` — runs worker + client tests via Vitest.
- **Client only:** `make client` — starts Vite dev server.
- **Worker only:** `make worker` (or `cd worker && npx wrangler dev`).
- **Build:** `make build` — production build of the client (outputs to `client/dist/`).
- **Install deps:** `make install` — installs all workspace dependencies.
- **Deploy worker:** `cd worker && npx wrangler deploy` (or push to main for auto-deploy via CI/CD).
- **Clean up:** `make clean` — kills any dangling dev processes on ports 3000/8787.

## CI/CD

GitHub Actions workflows automatically run checks and deployments:

- **PR Check (`.github/workflows/pr-check.yml`)** — Runs `make fmt`, `make test`, and `make build` on all PRs to `main`. Must pass before merge.
- **Deploy Worker (`.github/workflows/deploy-worker.yml`)** — On push to `main` (when `worker/**` or `shared/**` changes):
  1. Runs `make fmt` to type-check
  2. Deploys to Cloudflare Workers if checks pass
  3. Requires `CLOUDFLARE_API_TOKEN` secret configured in repo settings
- **Deploy Client (`.github/workflows/deploy-client.yml`)** — On push to `main` (when `client/**` or `shared/**` changes):
  1. Builds client via `make build`
  2. Deploys to GitHub Pages via Actions
  3. Requires GitHub Pages source set to "GitHub Actions" in repo settings

## Architecture

### Monorepo Structure

npm workspaces with three packages:

- **`shared/`** — `@thai-bingo/shared`: shared types, game data, and logic used by both client and worker
- **`client/`** — `@thai-bingo/client`: Vite-based TypeScript frontend
- **`worker/`** — `@thai-bingo/worker`: Cloudflare Worker + Durable Object for multiplayer API

### Shared — `shared/`

Canonical game data and pure logic shared between client and worker:

- **`shared/src/types.ts`** — `Cell`, `PlayerInfo`, `PendingSelection` interfaces
- **`shared/src/game-data.ts`** — `CONSONANTS` (42), `VOWELS` (31) — canonical character arrays
- **`shared/src/utils.ts`** — `shuffle()` — Fisher-Yates shuffle
- **`shared/src/game-logic.ts`** — `BOARD_SIZE`, `EXTRA_POOL_CHARS`, `buildGamePool()`, `generateBoard()`, `checkWin()`
- **`shared/src/index.ts`** — Re-exports all symbols

### Client — `client/`

Vite-based TypeScript frontend with modular architecture:

```
client/src/
  main.ts          # Entry: imports styles, wires event listeners, calls applyLang()
  state.ts         # GameState interface + singleton + resetGameState()
  config.ts        # API_BASE, PLAYER_COLORS
  i18n/
    strings.ts     # STRINGS.th/.en/.ja, LANGS, LANG_LABELS, StringKey type
    i18n.ts        # t(), cycleLang(), setLang(), applyLang()
  audio/
    audio.ts       # ensureAudio(), playTone(), sfx*() functions
    speech.ts      # CHAR_AUDIO_KEY, speakChar(), stopCharVoiceover()
    audio-data.ts  # AUDIO_DATA Map (745KB, lazy-loaded via dynamic import)
  game/
    caller.ts      # randomizeChar(), revealChar(), callCharacter()
    marking.ts     # markCell(), confirmMark()
    win.ts         # showWin(), resetGame(), continueAfterWin()
    confetti.ts    # startConfetti(), stopConfetti()
  ui/
    dom.ts         # $(), show(), hide(), highlightWinLine()
    setup.ts       # initSetup(), renderOnlineSetup(), startGame()
    boards.ts      # renderGame(), renderBoards(), renderCalledHistory()
    lobby.ts       # showLobby(), renderLobbyPlayers(), copyShareLink()
    online-ui.ts   # renderOnlineStatusBanner(), ready button/indicator functions
  ws/
    connection.ts  # connectWebSocket(), wsSend()
    handlers.ts    # handleServerMessage() + per-type handlers
    room-api.ts    # createRoom(), joinRoom()
client/styles/
  base.css         # Reset, variables, body, fonts
  setup.css        # Setup screen
  game.css         # Caller, boards, cells, animations
  lobby.css        # Online lobby
  win.css          # Win overlay, confetti
  responsive.css   # Media queries
client/index.html  # Minimal HTML shell (body markup, no inline scripts)
```

#### i18n

All UI text uses `t(key)` with `STRINGS.th`, `STRINGS.en`, and `STRINGS.ja`. Use `data-i18n` attributes for static HTML elements. Use "Moderator" (not "Teacher") for the caller role; Thai: "ผู้ดำเนินเกม", Japanese: "司会者".

**Adding a new language:**

1. Add a new `STRINGS.<code>` object in `client/src/i18n/strings.ts` with all keys (copy an existing language block as template)
2. Append the language code to the `LANGS` array (e.g. `['th', 'en', 'ja', 'ko']`)
3. Add an entry to `LANG_LABELS` (e.g. `ko: 'KO'`)
4. The language toggle button automatically cycles through all entries in `LANGS`

#### Online Mode Client State

- `state.role`: `'moderator'` | `'player'`
- `state._boardIdMap[index]` → playerId, `state._boardIndexMap[playerId]` → index
- Player view: own board (index 0, `.primary`) + others in `.secondary-boards-row`
- Moderator: caller section visible; players: caller section hidden
- `API_BASE` in `config.ts` auto-detects `localhost:8787` vs production

### Worker — `worker/`

Cloudflare Worker + Durable Object for multiplayer WebSocket API. The codebase is modular: pure types, utilities, and game logic are in separate files for testability. The Durable Object class orchestrates them.

- **`worker/src/types.ts`** — Worker-specific interfaces (`Env`, `RoomState`, `ClientMessage`); re-exports shared types
- **`worker/src/config.ts`** — All tunable server parameters (timeouts, room code format, player limits)
- **`worker/src/utils.ts`** — Re-exports `shuffle` from shared; adds `generateCode()`, `generateId()`
- **`worker/src/game.ts`** — Re-exports all game logic from shared (`CONSONANTS`, `VOWELS`, `buildGamePool`, `generateBoard`, `checkWin`, etc.)
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

Tests run via `make test`, which runs both worker and client test suites.

### Worker Tests

Worker tests live in `worker/test/` and use Vitest with `@cloudflare/vitest-pool-workers` (real Workers runtime, not mocks).

- **Config:** `worker/vitest.config.ts` — uses Workers pool with `isolatedStorage: false` (required for WebSocket tests)

| File | Type | What it covers |
|------|------|----------------|
| `worker/test/utils.test.ts` | Unit | `shuffle`, `generateCode`, `generateId` |
| `worker/test/game.test.ts` | Unit | `generateBoard`, `checkWin`, `buildGamePool`, data arrays |
| `worker/test/room.test.ts` | Integration | Full DO lifecycle via WebSocket: room creation, joins, game start, turn flow, marks, win detection, disconnect/reconnect, alarm cleanup, ready state, replay |

### Client Tests

Client tests live in `client/test/` and use Vitest with jsdom environment.

- **Config:** `client/vitest.config.ts` — jsdom environment

| File | Type | What it covers |
|------|------|----------------|
| `client/test/unit/game-logic.test.ts` | Unit | `CONSONANTS`, `VOWELS`, `shuffle`, `generateBoard`, `checkWin` (via shared) |
| `client/test/unit/i18n.test.ts` | Unit | Language completeness, no empty values, `LANG_LABELS` coverage |
| `client/test/unit/state.test.ts` | Unit | Initial state values, type compatibility |
| `client/test/unit/audio.test.ts` | Unit | `CHAR_AUDIO_KEY` entries for all consonants/vowels, uniqueness |
| `client/test/unit/dom.test.ts` | Unit | `$`, `show`, `hide`, `highlightWinLine` |
| `client/test/unit/config.test.ts` | Unit | `PLAYER_COLORS` count, `GAME_POOL_SIZES` values |

### Test expectations

Tests must be kept up-to-date with high coverage. When making changes:

- **New pure logic** (game rules, utilities) → add unit tests in the corresponding test file
- **New message types or handler changes** → add or update integration tests in `room.test.ts`
- **Bug fixes** → add a regression test that would have caught the bug
- **All tests must pass** before merging (`make fmt && make test`)

### Writing good tests

- **Test behavior, not implementation.** Assert on observable outcomes (messages received, state changes) rather than internal method calls.
- **Prefer pure functions.** If new logic can be a pure function in `game.ts`/`utils.ts` (shared or worker), extract it there and unit test it directly. This is faster and more reliable than testing through WebSocket message flows.
- **Integration tests use real WebSockets.** `room.test.ts` connects actual WebSocket clients to the DO and exchanges messages. Use the `connectWs()` helper and `ofType()` to filter messages.
- **Avoid testing through storage manipulation.** `runInDurableObject` can read storage for assertions but should not be used to set up game state — the in-memory `this.room` won't reflect storage changes. Drive state through the normal message protocol instead.

## Hosting

- Client: GitHub Pages at `https://erks.github.io/thai-bingo/` (deployed via GitHub Actions)
- Worker API: Cloudflare Workers (deployed via GitHub Actions)

## Git

- Do not add `Co-Authored-By` lines to commits
