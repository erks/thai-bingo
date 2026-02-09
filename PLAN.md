# Plan: Multiplayer Mode (Moderator/Caller + Player Sessions)

## Context

Thai Bingo is currently a single-file local game. The user wants:
1. A **replay button** that speaks the called character's Thai name aloud — **DONE** (already implemented)
2. A **multiplayer mode** with distinct moderator/caller and player roles, connected via WebSocket with Kahoot-style room codes

The existing local (same-screen) mode must remain unchanged.

## Roles

- **Moderator / Caller** — creates the room, controls the game (randomize, replay, reveal). Can optionally play too (toggle at room creation). When **not playing**: sees all boards equally, no board of their own. When **playing**: gets their own board displayed prominently above all other boards, with caller controls, and can select/mark cells like any player.
- **Player** — joins the room with a code. Sees their own board front-and-center, plus all other players' boards displayed smaller below.

## Hosting

- **Static files** (`index.html`, `audio.js`) — Cloudflare Pages (auto-deployed from git)
- **WebSocket API** — Cloudflare Worker + Durable Object (handles room state + WebSocket connections)
- Local mode still works by opening `index.html` directly in a browser (no server needed)

## Files to Modify/Create

- `index.html` — multiplayer client UI + WebSocket client logic
- `worker/src/index.ts` — Cloudflare Worker entry point: routes HTTP/WebSocket requests to Durable Objects
- `worker/src/room.ts` — `BingoRoom` Durable Object class: holds room state, handles WebSocket messages, game logic
- `worker/wrangler.toml` — Cloudflare Worker config (Durable Object bindings, compatibility flags)
- `worker/package.json` — dev dependency on `wrangler`
- `worker/tsconfig.json` — TypeScript config for worker

---

## 1. Mode Selection (Setup Screen)

Add a game type selector at the top of the setup screen: `t('gameTypeLocal')` vs `t('gameTypeOnline')`.

- **Local selected:** current setup UI unchanged
- **Online selected:** show two options:
  - `t('createRoom')`: moderator picks mode (consonants/vowels/mixed), hints toggle, enters their display name, toggles `t('moderatorPlays')` checkbox (default: off) → gets a room code + shareable link
  - `t('joinRoom')`: enter room code + player name → joins the room

All labels use `t()` keys — no hardcoded Thai/English.

---

## 2. Kahoot-Style Room Joining

When the moderator creates a room, the server generates a **6-character alphanumeric code** (e.g. `A3BK7P`). The moderator sees:

```
ห้องของคุณ: A3BK7P
แชร์ลิงก์: https://thai-bingo.pages.dev?room=A3BK7P
```

- A large, prominent room code display (Kahoot-style big letters)
- A "Copy Link" button that copies the join URL to clipboard
- A QR code (optional, stretch goal) for the room link
- The join URL auto-fills the room code on the join screen

Players go to the app, enter the code (or click the link), type their name, and join. The moderator's lobby screen shows players joining in real time.

---

## 3. Server (Cloudflare Worker + Durable Object)

### Architecture

- **Worker (`index.ts`)** — stateless entry point. Routes requests:
  - `GET /api/room/:code/websocket` → upgrades to WebSocket, forwards to the `BingoRoom` Durable Object identified by the room code
  - `POST /api/room` → creates a new room (generates code, returns it)
  - All other requests → 404 (static files served by Cloudflare Pages separately)
- **Durable Object (`room.ts` — `BingoRoom` class)** — one instance per room. Holds all room state in memory. Handles WebSocket connections via the Hibernation API (cost-efficient, wakes on message).

### `wrangler.toml`:

```toml
name = "thai-bingo-api"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[durable_objects]
bindings = [{ name = "BINGO_ROOM", class_name = "BingoRoom" }]

[[migrations]]
tag = "v1"
new_classes = ["BingoRoom"]
```

### Room state (in Durable Object memory):

```typescript
interface RoomState {
  moderatorId: string;
  moderatorName: string;
  moderatorPlaying: boolean;     // true if moderator also has a board
  players: Array<{id: string, name: string, connected: boolean}>;
  mode: "consonants" | "vowels" | "mixed";
  hintsOn: boolean;
  gamePool: string[];
  boards: Record<string, Cell[][]>;  // playerId → 5x5 grid
  calledChars: string[];
  currentChar: string | null;
  pendingChar: string | null;
  phase: "lobby" | "playing";
  winners: string[];
}
```

WebSocket connections are tracked via the Durable Object's `getWebSockets()` + tags. Each WebSocket is tagged with the player/moderator ID using `acceptWebSocket(["id:abc123"])` so messages can be routed to specific clients.

### Room lifecycle:

- Room is created when the Worker receives `POST /api/room` → generates a 6-char code, derives a Durable Object ID from the code via `idFromName(code)`, and calls the DO to initialize state.
- Room auto-cleans after 30 minutes of inactivity (no connected WebSockets) using the DO's alarm API.

### Message protocol (JSON):

**Client → Server:**
- `{type: "create", name, mode, hintsOn, playing}` — moderator creates room (`playing`: whether moderator also plays) → gets room code
- `{type: "join", room, name}` — player joins room
- `{type: "start"}` — moderator starts game (lobby → playing)
- `{type: "randomize"}` — moderator requests next random character
- `{type: "reveal"}` — moderator reveals the pending character
- `{type: "select", r, c}` — player (or playing moderator) selects a cell (tentative, during pending phase)
- `{type: "mark", r, c}` — player (or playing moderator) marks a cell (for already-revealed characters)

**Server → Client:**
- `{type: "room_created", room, playerId}` — to moderator
- `{type: "joined", playerId, players}` — to joining player
- `{type: "player_joined", players}` — broadcast to all (lobby update)
- `{type: "game_start", boards, gamePool, players}` — to moderator: ALL boards (if playing, own board flagged with `yourBoard: true`); to each player: ALL boards (own board flagged with `yourBoard: true`)
- `{type: "randomized", pendingChar}` — to moderator only (so they can replay audio; if playing, they can also select cells). Other players get `{type: "char_pending"}` (no char revealed)
- `{type: "revealed", char, calledChars, selections}` — broadcast: the character + validated selection results per player
- `{type: "mark_result", playerId, r, c, valid}` — broadcast to all (so all boards update)
- `{type: "win", playerId, playerName, winLine}` — broadcast winner + winning cells
- `{type: "player_disconnected", playerId, playerName}` — broadcast
- `{type: "player_reconnected", playerId, playerName}` — broadcast
- `{type: "error", message}`

### Turn flow:

1. Moderator clicks randomize → `{type: "randomize"}` → DO picks random char from remaining pool, stores as `pendingChar`, sends `{type: "randomized", pendingChar}` to moderator, sends `{type: "char_pending"}` to players
2. Moderator plays audio locally (using existing `speakChar()`), can replay. If playing, moderator can also select a cell on their own board during this phase.
3. Players hear nothing server-side — moderator plays audio out loud in the classroom (or screen-shares audio). Players select cells on their boards → `{type: "select", r, c}` stored in DO
4. Moderator clicks reveal → `{type: "reveal"}` → DO broadcasts `{type: "revealed", char}`, validates all selections (including moderator's if playing), checks wins, sends results

### Win detection:

DO checks after each valid mark (from reveal or manual mark), including the moderator's board if playing. Broadcasts `{type: "win"}`. Game continues (other players can still win) unless moderator ends it.

### Disconnection handling:

- Player disconnects: WebSocket `close` event triggers `webSocketClose()` in DO. Player marked as `connected: false`. Board state preserved. If they reconnect (same name + room code), full state resync via `webSocketOpen()`.
- Moderator disconnects: players see `t('moderatorDisconnected')` message. DO sets alarm for 5 minutes. Moderator can reconnect before alarm fires.
- Alarm fires with no connections: DO cleans up room state.

---

## 4. Client Changes (`index.html`)

### 4a. New state fields:

```javascript
const API_BASE = 'https://thai-bingo-api.<account>.workers.dev'; // configurable

state.gameType = 'local';       // 'local' or 'online'
state.role = null;               // 'moderator' or 'player' (online only)
state.moderatorPlaying = false;  // moderator also has a board (online only)
state.ws = null;                 // WebSocket connection
state.playerId = null;           // assigned by server
state.roomCode = null;
state.onlinePlayers = [];        // [{id, name, connected}]
state.allBoards = {};            // {playerId: board} — all players' boards
state.myBoardId = null;          // own board ID (players always; moderator if playing)
```

WebSocket connects to `wss://thai-bingo-api.<account>.workers.dev/api/room/<CODE>/websocket`.

### 4b. Setup screen changes:

- Game type toggle at top: Local / Online
- **Online → Create:** mode selector, hints toggle, moderator name input, `t('createRoomBtn')` button
- **Online → Join:** room code input (6-char, uppercase, large font), player name input, `t('joinBtn')` button
- Room code input auto-focuses, accepts paste, large monospace font (Kahoot-style)

### 4c. Lobby screen (new):

**Moderator view:**
- Large room code display (big, bold, centered)
- Shareable link with copy button
- List of joined players (names + color dots, animated entry). If moderator is playing, they appear first in the list with a `t('you')` badge.
- `t('startGameOnline')` button — enabled when ≥1 player joined (if moderator is playing, moderator + 1 player = 2 participants; if not playing, ≥2 players needed)
- Mode + hints shown as subtitle

**Player view:**
- `t('waitingForModerator')` message
- List of joined players
- Their own name highlighted

### 4d. Game screen — Moderator view:

**When NOT playing:**
- **Caller controls** (randomize, replay, reveal) — same as current local mode
- **All player boards** displayed in a grid, all equally sized (like current local 4-player layout)
- Each board shows player name + connection status
- Called history strip
- No board of their own

**When playing:**
- **Caller controls** (randomize, replay, reveal) at the top — same as above
- **Own board: large, front-and-center** below the caller controls (same prominent layout as the player view)
- **Other players' boards: smaller grid below** own board
- Own board is interactive — moderator can select cells during pending phase and mark already-called characters
- Called history strip

### 4e. Game screen — Player view:

- **No caller controls** (no randomize/reveal buttons)
- **Status bar** at top: `t('statusModeratorRandomizing')` / `t('statusSelectYourCell')` / `t('statusWaitingReveal')`
- **Own board: large, front-and-center** (full width on mobile, ~60% on desktop)
- **Other players' boards: smaller grid below** (thumbnail-ish, ~40-50% smaller)
  - Other boards are interactive-to-view but NOT clickable (players can only mark their own board)
  - Other boards show marked cells updating in real time
- Called history strip (same as moderator/local)
- When char is pending: player can select a cell on their own board (tentative selection)
- When char is revealed: selection is validated, correct = marked, wrong = shake animation

### 4f. Function branching:

Key functions check `state.gameType` and `state.role`:
- `randomizeChar()` — if online + moderator, send `{type: "randomize"}` instead of local logic
- `revealChar()` — if online + moderator, send `{type: "reveal"}`
- `markCell()` — if online + (player OR playing moderator), send `{type: "select"}` or `{type: "mark"}` for own board only
- Board rendering — if online: player sees own board prominent + others small; non-playing moderator sees all boards equal; playing moderator sees own board prominent + caller controls + others small
- Win handling — triggered by server `win` message, not local check

### 4g. i18n — All new strings must be added to both `th` and `en` in `STRINGS`

All user-facing text introduced by multiplayer MUST go through the existing `t(key)` / `data-i18n` system. No hardcoded Thai or English strings in HTML or JS. New keys to add to `STRINGS`:

```javascript
// Game type selector
gameTypeLocal: 'เล่นด้วยกัน' / 'Local',
gameTypeOnline: 'ออนไลน์' / 'Online',

// Online sub-options
createRoom: 'สร้างห้อง' / 'Create Room',
joinRoom: 'เข้าร่วม' / 'Join Room',

// Create room form
moderatorName: 'ชื่อของคุณ' / 'Your name',
moderatorPlays: 'ฉันเล่นด้วย' / 'I\'m playing too',
createRoomBtn: 'สร้างห้อง' / 'Create Room',

// Join room form
roomCodeLabel: 'รหัสห้อง' / 'Room code',
roomCodePlaceholder: 'เช่น A3BK7P' / 'e.g. A3BK7P',
joinName: 'ชื่อของคุณ' / 'Your name',
joinBtn: 'เข้าร่วม' / 'Join',

// Lobby — moderator
yourRoom: 'ห้องของคุณ' / 'Your room',
shareLink: 'แชร์ลิงก์' / 'Share link',
copyLink: 'คัดลอกลิงก์' / 'Copy link',
linkCopied: 'คัดลอกแล้ว!' / 'Copied!',
waitingForPlayers: 'รอผู้เล่นเข้าร่วม...' / 'Waiting for players...',
startGameOnline: 'เริ่มเกม' / 'Start Game',
playersJoined: 'ผู้เล่น' / 'Players',
minPlayersNeeded: 'ต้องมีผู้เล่นอย่างน้อย 2 คน' / 'Need at least 2 players',
you: 'คุณ' / 'You',

// Lobby — player
waitingForModerator: 'รอผู้ดำเนินเกมเริ่ม...' / 'Waiting for moderator to start...',
youJoinedAs: 'คุณเข้าร่วมในชื่อ' / 'You joined as',

// Game — player status banner
statusModeratorRandomizing: 'ผู้ดำเนินเกมกำลังสุ่ม...' / 'Moderator is picking...',
statusSelectYourCell: 'เลือกช่องของคุณ!' / 'Select your cell!',
statusWaitingReveal: 'รอเฉลย...' / 'Waiting for reveal...',
statusCharRevealed: 'เฉลยแล้ว!' / 'Revealed!',

// Connection status
playerDisconnected: 'หลุดการเชื่อมต่อ' / 'Disconnected',
playerReconnected: 'เชื่อมต่อแล้ว' / 'Reconnected',
moderatorDisconnected: 'ผู้ดำเนินเกมหลุดการเชื่อมต่อ' / 'Moderator disconnected',
reconnecting: 'กำลังเชื่อมต่อใหม่...' / 'Reconnecting...',

// Errors
errorRoomNotFound: 'ไม่พบห้อง' / 'Room not found',
errorRoomFull: 'ห้องเต็ม' / 'Room is full',
errorNameTaken: 'ชื่อนี้ถูกใช้แล้ว' / 'Name already taken',
errorConnection: 'เชื่อมต่อไม่ได้' / 'Connection failed',
```

The `applyLang()` function already handles re-rendering `data-i18n` elements and dynamic setup buttons. New online screens (lobby, status banner) must also re-render on language change — either by using `data-i18n` attributes on static elements, or by calling their render functions from `applyLang()`.

---

## 5. Board Visibility Summary

| View                    | Own board       | Other boards        | Caller controls |
|-------------------------|-----------------|---------------------|-----------------|
| Local                   | All equal       | All equal           | Shared          |
| Moderator (not playing) | N/A (no board)  | All equal, full size| Yes             |
| Moderator (playing)     | Large, primary  | Smaller, below      | Yes             |
| Player                  | Large, primary  | Smaller, below      | No              |

---

## 6. CSS Additions

- `.board-card.primary` — larger board styling for player's own board (online player view)
- `.board-card.secondary` — smaller board styling for other players' boards
- `.lobby-screen` — Kahoot-style room code display, player list
- `.room-code-display` — large monospace font, letter-spaced, purple gradient background
- `.player-list` — animated join/leave
- `.status-banner` — top banner for player game status
- `.connection-dot` — green/gray dot for player connection status
- Responsive: on mobile, own board takes full width, others stack vertically below

---

## 7. Implementation Order

1. **Worker scaffold** — `worker/` directory, `wrangler.toml`, `package.json`, TypeScript config
2. **Durable Object (`BingoRoom`)** — room creation, WebSocket accept, message handling, game state, board generation, win detection, alarm cleanup
3. **Worker entry (`index.ts`)** — HTTP routes (`POST /api/room`, `GET /api/room/:code/websocket`), CORS headers for Pages origin
4. **Local dev** — `wrangler dev` for local WebSocket testing
5. **Client: setup screen** — game type toggle, create/join UI, room code input
6. **Client: lobby screen** — room code display, player list, start button
7. **Client: WebSocket connection** — connect to Worker URL, send/receive messages, reconnect logic
8. **Client: moderator game view** — caller controls + boards (equal or own-prominent depending on playing flag)
9. **Client: player game view** — own board large + others small, selection/marking via DO
10. **Client: real-time board sync** — other players' marks update on all screens
11. **Deploy** — `wrangler deploy` for Worker; Cloudflare Pages for static files (connect git repo)
12. **Testing** — local mode unchanged, multiplayer end-to-end via deployed URLs

---

## 8. Deployment

### Cloudflare Worker (WebSocket API):
```bash
cd worker
npm install
npx wrangler dev          # local dev on localhost:8787
npx wrangler deploy       # deploy to thai-bingo-api.<account>.workers.dev
```

### Cloudflare Pages (static files):
- Connect git repo to Cloudflare Pages dashboard
- Build command: (none — static files)
- Output directory: `/` (or `.` — root of repo, serves `index.html` + `audio.js`)
- Deployed to `thai-bingo.pages.dev` (or custom domain)

### CORS:
Worker must set `Access-Control-Allow-Origin` to the Pages origin (`https://thai-bingo.pages.dev`) on all responses.

---

## 9. Verification

- Open `index.html` directly (file://) → local mode works exactly as before
- `wrangler dev` → local Worker on `localhost:8787`, WebSocket connects locally
- **Moderator (not playing):** Create Room → get code → share → see players join → start → randomize → replay → reveal → see all boards update equally
- **Moderator (playing):** Create Room with "I'm playing too" checked → get code → share → start → randomize → select cell on own board → reveal → own selection validated → board marked → can win
- **Player flow:** Join → enter code + name → wait in lobby → game starts → hear moderator's audio → select cell → reveal validates → board updates
- **Multi-player:** 3+ players join, each sees own board large + others small, all boards sync in real time
- **Reconnection:** player refreshes → rejoins with same name → state restored
- **Deployed:** same flows work on `thai-bingo.pages.dev` connecting to `thai-bingo-api.<account>.workers.dev`
