// ============================================================
// Thai Bingo — BingoRoom Durable Object
// ============================================================

import { CONFIG } from "./config";

export interface Env {
  BINGO_ROOM: DurableObjectNamespace;
}

// ---------- Data (mirrored from client) ----------

const CONSONANTS = [
  'ก','ข','ค','ฆ','ง','จ','ฉ','ช','ซ','ฌ','ญ','ฎ','ฏ',
  'ฐ','ฑ','ฒ','ณ','ด','ต','ถ','ท','ธ','น','บ','ป','ผ','ฝ','พ',
  'ฟ','ภ','ม','ย','ร','ล','ว','ศ','ษ','ส','ห','ฬ','อ','ฮ'
];

const VOWELS = [
  '-ะ','-า','-ิ','-ี','-ึ','-ื','-ุ','-ู',
  'เ-','เ-ะ','แ-','แ-ะ','โ-','โ-ะ',
  'เ-าะ','-อ','เ-อ','เ-ีย','เ-ือ','-ัว',
  'ใ-','ไ-','-ำ','เ-า'
];

// ---------- Types ----------

interface Cell {
  char: string;
  marked: boolean;
  free: boolean;
}

interface PlayerInfo {
  id: string;
  name: string;
  connected: boolean;
}

interface PendingSelection {
  r: number;
  c: number;
}

interface RoomState {
  code: string;
  moderatorId: string;
  moderatorName: string;
  moderatorPlaying: boolean;
  players: PlayerInfo[];
  mode: string;
  hintsOn: boolean;
  gamePool: string[];
  boards: Record<string, Cell[][]>;
  calledChars: string[];
  currentChar: string | null;
  pendingChar: string | null;
  pendingSelections: Record<string, PendingSelection>;
  pendingReadyIds: string[];
  phase: "lobby" | "playing";
  winners: string[];
  createdAt: number;
}

type ClientMessage =
  | { type: "join"; name: string }
  | { type: "start"; moderatorPlaying?: boolean }
  | { type: "randomize" }
  | { type: "replay" }
  | { type: "reveal" }
  | { type: "select"; r: number; c: number }
  | { type: "mark"; r: number; c: number }
  | { type: "ready" };

// ---------- Utilities ----------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateBoard(pool: string[]): Cell[][] {
  const picked = shuffle(pool).slice(0, 24);
  const board: Cell[][] = [];
  let idx = 0;
  for (let r = 0; r < 5; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) {
        row.push({ char: '⭐', marked: true, free: true });
      } else {
        row.push({ char: picked[idx++], marked: false, free: false });
      }
    }
    board.push(row);
  }
  return board;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O, 1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function checkWin(board: Cell[][]): [number, number][] | null {
  // Rows
  for (let r = 0; r < 5; r++) {
    if (board[r].every(cell => cell.marked)) {
      return board[r].map((_, c) => [r, c] as [number, number]);
    }
  }
  // Columns
  for (let c = 0; c < 5; c++) {
    if (board.every(row => row[c].marked)) {
      return board.map((_, r) => [r, c] as [number, number]);
    }
  }
  // Diagonals
  if ([0,1,2,3,4].every(i => board[i][i].marked)) {
    return [0,1,2,3,4].map(i => [i, i] as [number, number]);
  }
  if ([0,1,2,3,4].every(i => board[i][4-i].marked)) {
    return [0,1,2,3,4].map(i => [i, 4-i] as [number, number]);
  }
  return null;
}

// ---------- Durable Object ----------

export class BingoRoom implements DurableObject {
  private state: DurableObjectState;
  private room: RoomState | null = null;

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
    // Restore room state after hibernation
    this.state.blockConcurrencyWhile(async () => {
      this.room = (await this.state.storage.get<RoomState>("room")) ?? null;
    });
  }

  private async saveRoom(): Promise<void> {
    if (this.room) {
      await this.state.storage.put("room", this.room);
    } else {
      await this.state.storage.delete("room");
    }
  }

  // --- HTTP handler (called by Worker) ---

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Initialize room via POST
    if (request.method === "POST" && url.pathname === "/init") {
      const body = await request.json() as {
        code: string;
        name: string;
        mode: string;
        hintsOn: boolean;
        playing: boolean;
      };
      const moderatorId = generateId();
      this.room = {
        code: body.code,
        moderatorId,
        moderatorName: body.name,
        moderatorPlaying: body.playing,
        players: [],
        mode: body.mode,
        hintsOn: body.hintsOn,
        gamePool: [],
        boards: {},
        calledChars: [],
        currentChar: null,
        pendingChar: null,
        pendingSelections: {},
        pendingReadyIds: [],
        phase: "lobby",
        winners: [],
        createdAt: Date.now(),
      };
      await this.saveRoom();
      await this.state.storage.setAlarm(Date.now() + CONFIG.roomMaxLifetimeMs);
      return Response.json({ room: body.code, moderatorId });
    }

    // WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];

      // Get role + id from query params
      const role = url.searchParams.get("role"); // "moderator" or "player"
      const id = url.searchParams.get("id") || "";
      const name = url.searchParams.get("name") || "";

      this.state.acceptWebSocket(server, [`role:${role}`, `id:${id}`]);

      // Handle join logic synchronously before returning
      if (!this.room) {
        // Room doesn't exist (expired or invalid code)
        this.sendTo(server, { type: "error", message: "Room not found" });
        server.close(4000, "Room not found");
        return new Response(null, { status: 101, webSocket: client });
      }

      if (role === "moderator" && id === this.room.moderatorId) {
        console.log(`[room:${this.room.code}] moderator connected`);
        // Send moderator current state
        this.sendTo(server, {
          type: "joined",
          playerId: id,
          players: this.getPlayerList(),
          phase: this.room.phase,
          moderatorName: this.room.moderatorName,
          moderatorPlaying: this.room.moderatorPlaying,
        });
        // If game already in progress, send full state for reconnect
        if (this.room.phase === "playing") {
          this.sendGameState(server, id);
        }
      } else if (role === "player") {
        // Check for reconnect: first by id (same tab), then by name (page refresh, only if disconnected)
        const byId = this.room.players.find(p => p.id === id);
        const byName = !byId ? this.room.players.find(p => p.name === name && !p.connected) : null;
        const existing = byId || byName;
        if (existing) {
          const oldId = existing.id;
          existing.connected = true;
          existing.id = id;
          // Update board key if id changed (page-refresh reconnect during a game)
          if (oldId !== id && this.room.boards[oldId]) {
            this.room.boards[id] = this.room.boards[oldId];
            delete this.room.boards[oldId];
          }
          console.log(`[room:${this.room.code}] player reconnected: ${existing.name}`);
          // Broadcast reconnect
          this.broadcast({ type: "player_reconnected", playerId: existing.id, playerName: existing.name });
        } else {
          // New player
          this.room.players.push({ id, name, connected: true });
          console.log(`[room:${this.room.code}] player joined: ${name} (${this.room.players.length} total)`);
          // Broadcast player joined to everyone
          this.broadcast({ type: "player_joined", players: this.getPlayerList() });
        }

        // Send joined confirmation to this player
        this.sendTo(server, {
          type: "joined",
          playerId: id,
          players: this.getPlayerList(),
          phase: this.room.phase,
          moderatorName: this.room.moderatorName,
          moderatorPlaying: this.room.moderatorPlaying,
        });

        // If game already in progress, send full state for reconnect
        if (this.room.phase === "playing") {
          this.sendGameState(server, id);
        }
        // Fire-and-forget save — don't block the 101 response.
        // In-memory state is already updated so subsequent messages work.
        this.saveRoom().catch(e => console.error("saveRoom failed:", e));
      }

      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  // --- WebSocket Hibernation API handlers ---

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (!this.room) return;
    const data = JSON.parse(typeof message === "string" ? message : new TextDecoder().decode(message)) as ClientMessage;
    const tags = this.state.getTags(ws);
    const senderId = tags.find(t => t.startsWith("id:"))?.slice(3) || "";
    const senderRole = tags.find(t => t.startsWith("role:"))?.slice(5) || "";

    switch (data.type) {
      case "start":
        await this.handleStart(senderId, senderRole, data.moderatorPlaying);
        break;
      case "randomize":
        await this.handleRandomize(senderId, senderRole);
        break;
      case "replay":
        await this.handleReplay(senderId, senderRole);
        break;
      case "reveal":
        await this.handleReveal(senderId, senderRole);
        break;
      case "select":
        await this.handleSelect(senderId, senderRole, data.r, data.c);
        break;
      case "mark":
        await this.handleMark(senderId, senderRole, data.r, data.c);
        break;
      case "ready":
        await this.handleReady(senderId, senderRole);
        break;
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    if (!this.room) return;
    const tags = this.state.getTags(ws);
    const id = tags.find(t => t.startsWith("id:"))?.slice(3) || "";
    const role = tags.find(t => t.startsWith("role:"))?.slice(5) || "";

    if (role === "moderator") {
      console.log(`[room:${this.room.code}] moderator disconnected`);
      this.broadcast({ type: "moderator_disconnected" });
    } else {
      const player = this.room.players.find(p => p.id === id);
      if (player) {
        player.connected = false;
        console.log(`[room:${this.room.code}] player disconnected: ${player.name}`);
        await this.saveRoom();
        this.broadcast({ type: "player_disconnected", playerId: id, playerName: player.name });
      }
    }
    // Schedule cleanup check — any disconnect could mean everyone left
    await this.state.storage.setAlarm(Date.now() + CONFIG.disconnectCleanupDelayMs);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    // Treat as close
    await this.webSocketClose(ws, 1006, "error", false);
  }

  async alarm(): Promise<void> {
    const sockets = this.state.getWebSockets();
    const roomAge = this.room ? Date.now() - (this.room.createdAt || 0) : Infinity;

    if (sockets.length === 0 || roomAge > CONFIG.roomMaxLifetimeMs) {
      // Close any lingering sockets
      for (const ws of sockets) {
        try { ws.close(1000, "room expired"); } catch {}
      }
      this.room = null;
      await this.state.storage.deleteAll();
    }
  }

  // --- Game logic handlers ---

  private async handleStart(senderId: string, senderRole: string, moderatorPlaying?: boolean): Promise<void> {
    if (!this.room) {
      this.sendToId(senderId, { type: "error", message: "Room not found" });
      return;
    }
    if (senderRole !== "moderator" || senderId !== this.room.moderatorId) {
      console.log(`[room:${this.room.code}] start rejected: sender=${senderId} role=${senderRole} expected=${this.room.moderatorId}`);
      this.sendToId(senderId, { type: "error", message: "Only the moderator can start the game" });
      return;
    }
    if (this.room.phase !== "lobby" && this.room.phase !== "playing") {
      this.sendToId(senderId, { type: "error", message: "Game cannot be started in current state" });
      return;
    }
    console.log(`[room:${this.room.code}] start requested by moderator, moderatorPlaying=${moderatorPlaying}`);

    // Update moderatorPlaying from client if provided
    if (moderatorPlaying !== undefined) {
      this.room.moderatorPlaying = moderatorPlaying;
    }

    const minPlayers = this.room.moderatorPlaying ? CONFIG.minPlayersModeratorPlaying : CONFIG.minPlayersDefault;
    if (this.room.players.length < minPlayers) {
      this.sendToId(senderId, { type: "error", message: "Not enough players" });
      return;
    }

    // Build game pool
    let fullPool: string[];
    if (this.room.mode === "consonants") fullPool = [...CONSONANTS];
    else if (this.room.mode === "vowels") fullPool = [...VOWELS];
    else fullPool = [...CONSONANTS, ...VOWELS];

    const poolSize = Math.min(CONFIG.gamePoolSizes[this.room.mode] || CONFIG.gamePoolSizeFallback, fullPool.length);
    this.room.gamePool = shuffle(fullPool).slice(0, poolSize);
    this.room.calledChars = [];
    this.room.currentChar = null;
    this.room.pendingChar = null;
    this.room.pendingSelections = {};
    this.room.pendingReadyIds = [];
    this.room.winners = [];
    this.room.phase = "playing";

    // Generate boards for each player
    this.room.boards = {};
    for (const player of this.room.players) {
      this.room.boards[player.id] = generateBoard(this.room.gamePool);
    }
    // Generate board for moderator if playing
    if (this.room.moderatorPlaying) {
      this.room.boards[this.room.moderatorId] = generateBoard(this.room.gamePool);
    }

    await this.saveRoom();

    console.log(`[room:${this.room.code}] game started with ${Object.keys(this.room.boards).length} boards`);

    // Send game_start to each participant with all boards
    const allBoards = this.room.boards;
    const playerList = this.getPlayerList();

    // To moderator
    this.sendToId(this.room.moderatorId, {
      type: "game_start",
      boards: allBoards,
      gamePool: this.room.gamePool,
      players: playerList,
      yourBoardId: this.room.moderatorPlaying ? this.room.moderatorId : null,
      hintsOn: this.room.hintsOn,
    });

    // To each player
    for (const player of this.room.players) {
      this.sendToId(player.id, {
        type: "game_start",
        boards: allBoards,
        gamePool: this.room.gamePool,
        players: playerList,
        yourBoardId: player.id,
        hintsOn: this.room.hintsOn,
      });
    }
  }

  private async handleRandomize(senderId: string, senderRole: string): Promise<void> {
    if (!this.room) return;
    if (senderRole !== "moderator" || senderId !== this.room.moderatorId) return;
    if (this.room.phase !== "playing") return;
    if (this.room.pendingChar) return; // already pending

    const remaining = this.room.gamePool.filter(ch => !this.room!.calledChars.includes(ch));
    if (remaining.length === 0) {
      this.sendToId(senderId, { type: "error", message: "No characters left" });
      return;
    }

    const char = remaining[Math.floor(Math.random() * remaining.length)];
    this.room.pendingChar = char;
    this.room.pendingSelections = {};
    this.room.pendingReadyIds = [];

    await this.saveRoom();

    // Send char to moderator only
    this.sendToId(this.room.moderatorId, { type: "randomized", pendingChar: char });

    // Send char to players so they can hear it
    for (const player of this.room.players) {
      if (player.connected) {
        this.sendToId(player.id, { type: "char_pending", char });
      }
    }
    // Also send to moderator if they're playing (so their browser plays audio too)
    if (this.room.moderatorPlaying) {
      this.sendToId(this.room.moderatorId, { type: "char_pending_moderator", char });
    }
  }

  private async handleReplay(senderId: string, senderRole: string): Promise<void> {
    if (!this.room) return;
    if (senderRole !== "moderator" || senderId !== this.room.moderatorId) return;
    if (!this.room.pendingChar) return; // no character to replay

    const char = this.room.pendingChar;

    // Re-broadcast the character to all players
    for (const player of this.room.players) {
      if (player.connected) {
        this.sendToId(player.id, { type: "char_replay", char });
      }
    }
    // Also send to moderator if they're playing
    if (this.room.moderatorPlaying) {
      this.sendToId(this.room.moderatorId, { type: "char_replay", char });
    }
  }

  private async handleReveal(senderId: string, senderRole: string): Promise<void> {
    if (!this.room) return;
    if (senderRole !== "moderator" || senderId !== this.room.moderatorId) return;
    if (!this.room.pendingChar) return;

    const char = this.room.pendingChar;
    this.room.pendingChar = null;
    this.room.currentChar = char;
    this.room.calledChars.push(char);

    // Validate all pending selections
    const selectionResults: Record<string, { r: number; c: number; valid: boolean }> = {};
    for (const [playerId, sel] of Object.entries(this.room.pendingSelections)) {
      const board = this.room.boards[playerId];
      if (!board) continue;
      const cell = board[sel.r][sel.c];
      const valid = cell.char === char;
      if (valid) {
        cell.marked = true;
      }
      selectionResults[playerId] = { r: sel.r, c: sel.c, valid };
    }
    this.room.pendingSelections = {};
    this.room.pendingReadyIds = [];

    await this.saveRoom();

    // Broadcast reveal
    this.broadcast({
      type: "revealed",
      char,
      calledChars: this.room.calledChars,
      selections: selectionResults,
    });

    // Check wins for players whose cells were just marked
    for (const [playerId, result] of Object.entries(selectionResults)) {
      if (result.valid && !this.room.winners.includes(playerId)) {
        this.checkAndBroadcastWin(playerId);
      }
    }
  }

  private async handleSelect(senderId: string, senderRole: string, r: number, c: number): Promise<void> {
    if (!this.room) return;
    if (!this.room.pendingChar) return;

    // Must be a player or a playing moderator
    const isPlayingModerator = senderRole === "moderator" && this.room.moderatorPlaying && senderId === this.room.moderatorId;
    const isPlayer = senderRole === "player";
    if (!isPlayingModerator && !isPlayer) return;

    // Must have a board
    const board = this.room.boards[senderId];
    if (!board) return;

    const cell = board[r][c];
    if (cell.marked || cell.free) return;

    // Store tentative selection (one per participant, toggle off if same cell)
    const prev = this.room.pendingSelections[senderId];
    if (prev && prev.r === r && prev.c === c) {
      delete this.room.pendingSelections[senderId];
    } else {
      this.room.pendingSelections[senderId] = { r, c };
    }
    await this.saveRoom();
  }

  private async handleReady(senderId: string, senderRole: string): Promise<void> {
    if (!this.room) return;
    if (!this.room.pendingChar) return;

    const isPlayingModerator = senderRole === "moderator" && this.room.moderatorPlaying && senderId === this.room.moderatorId;
    const isPlayer = senderRole === "player";
    if (!isPlayingModerator && !isPlayer) return;

    const idx = this.room.pendingReadyIds.indexOf(senderId);
    if (idx >= 0) {
      this.room.pendingReadyIds.splice(idx, 1);
    } else {
      this.room.pendingReadyIds.push(senderId);
    }

    await this.saveRoom();
    this.broadcast({ type: "ready_update", readyPlayerIds: this.room.pendingReadyIds });
  }

  private async handleMark(senderId: string, senderRole: string, r: number, c: number): Promise<void> {
    if (!this.room) return;
    if (this.room.phase !== "playing") return;

    // Must be a player or a playing moderator
    const isPlayingModerator = senderRole === "moderator" && this.room.moderatorPlaying && senderId === this.room.moderatorId;
    const isPlayer = senderRole === "player";
    if (!isPlayingModerator && !isPlayer) return;

    const board = this.room.boards[senderId];
    if (!board) return;

    const cell = board[r][c];
    if (cell.marked || cell.free) return;
    if (!this.room.calledChars.includes(cell.char)) {
      this.sendToId(senderId, { type: "mark_result", playerId: senderId, r, c, valid: false });
      return;
    }

    cell.marked = true;
    await this.saveRoom();
    this.broadcast({ type: "mark_result", playerId: senderId, r, c, valid: true });

    if (!this.room.winners.includes(senderId)) {
      this.checkAndBroadcastWin(senderId);
    }
  }

  private checkAndBroadcastWin(playerId: string): void {
    if (!this.room) return;
    const board = this.room.boards[playerId];
    if (!board) return;
    const winLine = checkWin(board);
    if (winLine) {
      this.room.winners.push(playerId);
      const playerInfo = this.room.players.find(p => p.id === playerId);
      const playerName = playerId === this.room.moderatorId ? this.room.moderatorName : (playerInfo?.name || "Unknown");
      this.broadcast({ type: "win", playerId, playerName, winLine });
    }
  }

  // --- Messaging helpers ---

  private getPlayerList(): Array<{ id: string; name: string; connected: boolean }> {
    if (!this.room) return [];
    const list: Array<{ id: string; name: string; connected: boolean }> = [];
    if (this.room.moderatorPlaying) {
      list.push({ id: this.room.moderatorId, name: this.room.moderatorName, connected: true });
    }
    list.push(...this.room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })));
    return list;
  }

  private broadcast(msg: Record<string, unknown>): void {
    const data = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      try { ws.send(data); } catch { /* disconnected */ }
    }
  }

  private sendToId(id: string, msg: Record<string, unknown>): void {
    const data = JSON.stringify(msg);
    const sockets = this.state.getWebSockets(`id:${id}`);
    for (const ws of sockets) {
      try { ws.send(data); } catch { /* disconnected */ }
    }
  }

  private sendTo(ws: WebSocket, msg: Record<string, unknown>): void {
    try { ws.send(JSON.stringify(msg)); } catch { /* disconnected */ }
  }

  private sendGameState(ws: WebSocket, playerId: string): void {
    if (!this.room) return;
    this.sendTo(ws, {
      type: "game_start",
      boards: this.room.boards,
      gamePool: this.room.gamePool,
      players: this.getPlayerList(),
      yourBoardId: playerId,
      hintsOn: this.room.hintsOn,
      calledChars: this.room.calledChars,
      currentChar: this.room.currentChar,
      pendingChar: this.room.pendingChar,
      winners: this.room.winners,
      pendingReadyIds: this.room.pendingReadyIds,
    });
  }
}
