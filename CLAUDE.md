# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thai Bingo (บิงโกภาษาไทย) — a web app for learning Thai alphabet characters through bingo. Supports both local (same-screen) and online multiplayer modes.

## Development

- **Client:** Open `index.html` directly in a browser (or serve via any static server). No build step.
- **Worker:** `cd worker && npm install && npx wrangler dev --local` to run the multiplayer API locally on port 8787.
- **Deploy worker:** `cd worker && npx wrangler deploy`
- There are no tests or linting configured.

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

All UI text uses `t(key)` with `STRINGS.th` and `STRINGS.en`. Use `data-i18n` attributes for static HTML elements. Use "Moderator" (not "Teacher") for the caller role; Thai: "ผู้ดำเนินเกม".

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

## Hosting

- Client: GitHub Pages at `https://erks.github.io/thai-bingo/`
- Worker API: Cloudflare Workers

## Git

- Do not add `Co-Authored-By` lines to commits
