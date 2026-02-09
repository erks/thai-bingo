# Plan: Multiplayer Mode + Replay Button

## Context
Thai Bingo is currently a single-file local game. The user wants:
1. A **replay button** that speaks the called character's Thai name aloud (both modes)
2. A **multiplayer mode** where each player plays from their own browser with rotating caller turns, connected via WebSocket

The existing local (same-screen) mode must remain unchanged.

## Files to Modify/Create
- `index.html` — add replay button, multiplayer client UI, WebSocket client logic
- `server.js` — new WebSocket server (Node.js + `ws` package)
- `package.json` — new, declares `ws` dependency

---

## 1. Replay Button (Speech Synthesis)

**Implementation:** Add a `speakChar(char)` function using `speechSynthesis.speak()` with `lang='th-TH'`. Look up the character's first keyword from `ALL_SPEECH` (e.g. ก → "กอไก่", -า → "สระอา").

**UI:** A replay button (🔊) next to the caller display circle. Hidden until a character has been called. Clicking it speaks the current character name.

**Placement in HTML:** Inside the `.caller-row`, next to `#caller-display`.

Works identically in local and multiplayer modes (purely client-side).

---

## 2. Multiplayer Mode

### 2a. Mode Selection (Setup Screen)

Add a game type selector at the top of the setup screen: **"เล่นด้วยกัน" (Local)** vs **"ออนไลน์" (Online)**.

- **Local selected:** current setup UI unchanged
- **Online selected:** show either:
  - **Create Room:** host picks mode (consonants/vowels/mixed), hints, enters their name → gets a 4-character room code
  - **Join Room:** enter room code + player name → joins the room

### 2b. Server (`server.js`)

Minimal Node.js WebSocket server using `ws` package.

**Room state on server:**
```
rooms = {
  "ABCD": {
    players: [{id, name, ws, connected}],
    hostId: "...",
    mode: "mixed",
    hintsOn: true,
    gamePool: [],
    boards: {playerId: [[...5x5...]]},
    calledChars: [],
    currentChar: null,
    callerIndex: 0,      // rotating
    phase: "lobby" | "calling" | "selecting" | "revealing",
    winners: []
  }
}
```

**Message protocol (JSON):**

Client → Server:
- `{type: "create", name, mode, hintsOn}` → creates room, returns room code
- `{type: "join", room, name}` → joins room
- `{type: "start"}` → host starts game (lobby → calling)
- `{type: "call", char}` → caller picks a character (calling → selecting)
- `{type: "select", r, c}` → player selects a cell tentatively
- `{type: "reveal"}` → caller reveals (selecting → revealing → next caller)
- `{type: "mark", r, c}` → player marks a previously-called cell (outside pending phase)

Server → Client:
- `{type: "room_created", room, playerId}`
- `{type: "joined", playerId, players}`
- `{type: "player_joined", players}` → broadcast to all
- `{type: "game_start", board, gamePool, callerIndex, players}` — each player gets only their own board
- `{type: "your_turn"}` → sent to current caller
- `{type: "called"}` → broadcast to non-callers: a char was called (but not revealed yet). Boards can be shown.
- `{type: "reveal", char, calledChars}` → broadcast: the character + updated called list
- `{type: "mark_result", r, c, valid}` → confirm/reject a mark
- `{type: "win", playerName}` → broadcast winner
- `{type: "player_disconnected", playerName}`
- `{type: "error", message}`

**Turn flow:**
1. Server sets `phase: "calling"`, sends `your_turn` to current caller
2. Caller speaks/picks → sends `{type: "call", char}` → server sets `phase: "selecting"`, broadcasts `called` to others
3. Other players see their boards, select cells → `{type: "select", r, c}`
4. Caller clicks reveal → `{type: "reveal"}` → server broadcasts `{type: "reveal", char}`, validates all selections, checks wins, advances `callerIndex`, sets `phase: "calling"`

**Win detection:** Server checks after each valid mark. Broadcasts `win` message.

**Disconnection:** Player marked as disconnected. If current caller disconnects, skip their turn after 5s. If they reconnect, resync full state.

### 2c. Client Changes (`index.html`)

**New state fields:**
```javascript
state.gameType = 'local';  // 'local' or 'online'
state.ws = null;            // WebSocket connection
state.playerId = null;      // assigned by server
state.playerIndex = null;   // index in players array
state.roomCode = null;
state.isMyTurn = false;     // am I the current caller?
state.onlinePlayers = [];   // [{id, name}]
```

**UI changes:**
- Setup screen: game type toggle at top, conditional rendering for local vs online setup
- Online lobby screen: show room code, list of joined players, "Start" button for host
- Game screen:
  - When online, only show YOUR board (single board, full width)
  - Show whose turn it is ("คิวของ [name]")
  - When it's your turn: show mic/picker (caller UI)
  - When it's not your turn: show "waiting for caller..." then boards appear after `called` message
  - Reveal button only visible to caller
- Turn indicator banner at top of game area

**Function branching:** Key functions check `state.gameType`:
- `callCharacter()` — if online, send `{type: "call", char}` to server instead of local processing
- `markCell()` — if online, send `{type: "select"}` or `{type: "mark"}` to server
- `revealChar()` — if online, send `{type: "reveal"}` to server
- Board rendering — if online, only render own board
- Win handling — triggered by server message, not local check

### 2d. Connection flow
1. User selects "ออนไลน์" → either creates or joins a room
2. WebSocket connects to `ws://localhost:3000` (configurable)
3. On create: server generates 4-char room code, assigns host
4. On join: server validates room exists, adds player, broadcasts update
5. Host clicks start → server generates boards + pool, sends each player their board
6. Game proceeds with message-based turn system

---

## 3. Implementation Order

1. **Replay button** — small, self-contained addition
2. **Server.js + package.json** — WebSocket server with room/game logic
3. **Client multiplayer UI** — setup screen changes, lobby, online game screen
4. **Client WebSocket integration** — connect existing game functions to server messages
5. **Testing** — local mode still works, multiplayer flow end-to-end

## Verification
- Open `index.html` directly → local mode works exactly as before
- Click replay button → browser speaks the character name in Thai
- Run `node server.js` → start WebSocket server on port 3000
- Open two browser tabs to `localhost:8000` → one creates room, other joins → play through a full game with rotating turns
