import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules that have side effects or DOM dependencies
vi.mock("../../src/ws/connection", () => ({ connectWebSocket: vi.fn() }));
vi.mock("../../src/ui/boards", () => ({
  renderGame: vi.fn(),
  renderCalledHistory: vi.fn(),
  updateHints: vi.fn(),
}));
vi.mock("../../src/ui/dom", () => ({
  $: (id: string) => document.getElementById(id),
  show: vi.fn(),
  hide: vi.fn(),
  highlightWinLine: vi.fn(),
}));
vi.mock("../../src/game/caller", () => ({
  setVoiceStatus: vi.fn(),
}));
vi.mock("../../src/audio/audio", () => ({
  ensureAudio: vi.fn(),
}));
vi.mock("../../src/ui/lobby", () => ({
  showLobby: vi.fn(),
  renderLobbyPlayers: vi.fn(),
  stopLobbySync: vi.fn(),
}));

let state: typeof import("../../src/state").state;
let tryRestoreSession: typeof import("../../src/restore").tryRestoreSession;
let saveSession: typeof import("../../src/session").saveSession;
let loadSession: typeof import("../../src/session").loadSession;
let clearSession: typeof import("../../src/session").clearSession;
let connectWebSocket: typeof import("../../src/ws/connection").connectWebSocket;
let renderGame: typeof import("../../src/ui/boards").renderGame;
let showLobby: typeof import("../../src/ui/lobby").showLobby;

function setPathname(path: string): void {
  // jsdom allows setting location via history.replaceState
  history.replaceState(null, "", path);
}

function setupMinimalDOM(): void {
  document.body.innerHTML = `
    <div id="setup-screen"></div>
    <div id="game-screen" class="hidden"></div>
    <div id="lobby-screen" class="hidden"></div>
    <div id="win-overlay" class="hidden"></div>
    <div id="random-btn"></div>
    <div id="replay-btn" class="hidden"></div>
    <div id="reveal-btn" class="hidden"></div>
    <div id="voice-status"></div>
    <div id="current-char"></div>
    <div id="caller-display"></div>
    <div id="draw-count"></div>
    <div id="total-count"></div>
    <div id="called-history"></div>
    <div id="boards-container"></div>
    <div class="caller-section"></div>
  `;
}

beforeEach(async () => {
  vi.resetModules();
  sessionStorage.clear();
  setupMinimalDOM();
  setPathname("/");

  // Re-import after reset
  const stateMod = await import("../../src/state");
  state = stateMod.state;
  const sessionMod = await import("../../src/session");
  saveSession = sessionMod.saveSession;
  loadSession = sessionMod.loadSession;
  clearSession = sessionMod.clearSession;
  const connMod = await import("../../src/ws/connection");
  connectWebSocket = connMod.connectWebSocket;
  const boardsMod = await import("../../src/ui/boards");
  renderGame = boardsMod.renderGame;
  const lobbyMod = await import("../../src/ui/lobby");
  showLobby = lobbyMod.showLobby;
  const restoreMod = await import("../../src/restore");
  tryRestoreSession = restoreMod.tryRestoreSession;
});

afterEach(() => {
  sessionStorage.clear();
  setPathname("/");
  document.body.innerHTML = "";
});

describe("tryRestoreSession", () => {
  it("returns false when path is / and no session", () => {
    setPathname("/");
    expect(tryRestoreSession()).toBe(false);
  });

  it("restores local game from /rooms/local with matching session", () => {
    const board = [
      [{ char: "ก", marked: true, free: false }, { char: "ข", marked: false, free: false }, { char: "ค", marked: false, free: false }, { char: "ง", marked: false, free: false }, { char: "จ", marked: false, free: false }],
      [{ char: "ฉ", marked: false, free: false }, { char: "ช", marked: false, free: false }, { char: "ซ", marked: false, free: false }, { char: "ฌ", marked: false, free: false }, { char: "ญ", marked: false, free: false }],
      [{ char: "ฎ", marked: false, free: false }, { char: "ฏ", marked: false, free: false }, { char: "★", marked: true, free: true }, { char: "ฑ", marked: false, free: false }, { char: "ฒ", marked: false, free: false }],
      [{ char: "ณ", marked: false, free: false }, { char: "ด", marked: false, free: false }, { char: "ต", marked: false, free: false }, { char: "ถ", marked: false, free: false }, { char: "ท", marked: false, free: false }],
      [{ char: "ธ", marked: false, free: false }, { char: "น", marked: false, free: false }, { char: "บ", marked: false, free: false }, { char: "ป", marked: false, free: false }, { char: "ผ", marked: false, free: false }],
    ];
    saveSession({
      type: "local",
      mode: "consonants",
      hintsOn: true,
      playerCount: 1,
      players: ["Alice"],
      botPlayers: [false],
      boards: [board],
      gamePool: ["ก", "ข", "ค"],
      calledChars: ["ก"],
      currentChar: "ก",
      pendingChar: null,
      gameActive: true,
      winners: [],
    });

    setPathname("/rooms/local");
    const result = tryRestoreSession();

    expect(result).toBe(true);
    expect(state.gameType).toBe("local");
    expect(state.mode).toBe("consonants");
    expect(state.boards.length).toBe(1);
    expect(state.calledChars).toEqual(["ก"]);
    expect(state.gameActive).toBe(true);
    expect(renderGame).toHaveBeenCalled();
  });

  it("returns false for /rooms/local without session", () => {
    setPathname("/rooms/local");
    expect(tryRestoreSession()).toBe(false);
    // Should have navigated back to /
    expect(location.pathname).toBe("/");
  });

  it("restores online session from /rooms/ABC123 with matching session", () => {
    saveSession({
      type: "online",
      roomCode: "ABC123",
      playerId: "p1",
      role: "moderator",
      moderatorPlaying: true,
      joinName: "Alice",
    });

    setPathname("/rooms/ABC123");
    const result = tryRestoreSession();

    expect(result).toBe(true);
    expect(state.gameType).toBe("online");
    expect(state.roomCode).toBe("ABC123");
    expect(state.playerId).toBe("p1");
    expect(state.role).toBe("moderator");
    expect(state.moderatorPlaying).toBe(true);
    expect(state._joinName).toBe("Alice");
    expect(connectWebSocket).toHaveBeenCalled();
    expect(showLobby).toHaveBeenCalled();
  });

  it("sets up join flow for /rooms/ABC123 without session", () => {
    setPathname("/rooms/ABC123");
    const result = tryRestoreSession();

    expect(result).toBe(false);
    expect(state.gameType).toBe("online");
    expect(state.onlineRole).toBe("join");
    expect(state.roomCode).toBe("ABC123");
  });

  it("returns false for /rooms/ABC123 when session roomCode doesn't match", () => {
    saveSession({
      type: "online",
      roomCode: "XYZ789",
      playerId: "p1",
      role: "player",
      moderatorPlaying: false,
      joinName: "Bob",
    });

    setPathname("/rooms/ABC123");
    const result = tryRestoreSession();

    // Mismatched session → treat as fresh join
    expect(result).toBe(false);
    expect(state.gameType).toBe("online");
    expect(state.onlineRole).toBe("join");
    expect(state.roomCode).toBe("ABC123");
  });
});
