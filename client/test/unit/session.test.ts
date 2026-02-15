import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let state: typeof import("../../src/state").state;
let resetGameState: typeof import("../../src/state").resetGameState;
let buildOnlineSession: typeof import("../../src/session").buildOnlineSession;
let buildLocalSession: typeof import("../../src/session").buildLocalSession;
let saveSession: typeof import("../../src/session").saveSession;
let loadSession: typeof import("../../src/session").loadSession;
let clearSession: typeof import("../../src/session").clearSession;

beforeEach(async () => {
  vi.resetModules();
  sessionStorage.clear();
  const stateMod = await import("../../src/state");
  state = stateMod.state;
  resetGameState = stateMod.resetGameState;
  const sessionMod = await import("../../src/session");
  buildOnlineSession = sessionMod.buildOnlineSession;
  buildLocalSession = sessionMod.buildLocalSession;
  saveSession = sessionMod.saveSession;
  loadSession = sessionMod.loadSession;
  clearSession = sessionMod.clearSession;
});

afterEach(() => {
  sessionStorage.clear();
});

describe("buildOnlineSession", () => {
  it("returns session for online game with roomCode", () => {
    state.gameType = "online";
    state.roomCode = "ABC123";
    state.playerId = "p1";
    state.role = "moderator";
    state.moderatorPlaying = true;
    state._joinName = "Alice";

    const session = buildOnlineSession(state);
    expect(session).toEqual({
      type: "online",
      roomCode: "ABC123",
      playerId: "p1",
      role: "moderator",
      moderatorPlaying: true,
      joinName: "Alice",
    });
  });

  it("returns null for local game", () => {
    state.gameType = "local";
    state.roomCode = "ABC123";
    expect(buildOnlineSession(state)).toBeNull();
  });

  it("returns null when roomCode is missing", () => {
    state.gameType = "online";
    state.roomCode = null;
    expect(buildOnlineSession(state)).toBeNull();
  });
});

describe("buildLocalSession", () => {
  it("returns session for local game with boards", () => {
    state.gameType = "local";
    state.mode = "consonants";
    state.hintsOn = false;
    state.playerCount = 2;
    state.players = ["Alice", "Bob"];
    state.botPlayers = [false, true];
    state.boards = [[
      [{ char: "ก", marked: false, free: false }, { char: "ข", marked: false, free: false }, { char: "ค", marked: false, free: false }, { char: "ง", marked: false, free: false }, { char: "จ", marked: false, free: false }],
      [{ char: "ฉ", marked: false, free: false }, { char: "ช", marked: false, free: false }, { char: "ซ", marked: false, free: false }, { char: "ฌ", marked: false, free: false }, { char: "ญ", marked: false, free: false }],
      [{ char: "ฎ", marked: false, free: false }, { char: "ฏ", marked: false, free: false }, { char: "★", marked: true, free: true }, { char: "ฑ", marked: false, free: false }, { char: "ฒ", marked: false, free: false }],
      [{ char: "ณ", marked: false, free: false }, { char: "ด", marked: false, free: false }, { char: "ต", marked: false, free: false }, { char: "ถ", marked: false, free: false }, { char: "ท", marked: false, free: false }],
      [{ char: "ธ", marked: false, free: false }, { char: "น", marked: false, free: false }, { char: "บ", marked: false, free: false }, { char: "ป", marked: false, free: false }, { char: "ผ", marked: false, free: false }],
    ]];
    state.gamePool = ["ก", "ข", "ค"];
    state.calledChars = ["ก"];
    state.currentChar = "ก";
    state.pendingChar = null;
    state.gameActive = true;
    state.winners = [];

    const session = buildLocalSession(state);
    expect(session).not.toBeNull();
    expect(session!.type).toBe("local");
    expect(session!.mode).toBe("consonants");
    expect(session!.hintsOn).toBe(false);
    expect(session!.playerCount).toBe(2);
    expect(session!.players).toEqual(["Alice", "Bob"]);
    expect(session!.botPlayers).toEqual([false, true]);
    expect(session!.boards).toBe(state.boards);
    expect(session!.gamePool).toEqual(["ก", "ข", "ค"]);
    expect(session!.calledChars).toEqual(["ก"]);
    expect(session!.currentChar).toBe("ก");
    expect(session!.pendingChar).toBeNull();
    expect(session!.gameActive).toBe(true);
    expect(session!.winners).toEqual([]);
  });

  it("returns null for online game", () => {
    state.gameType = "online";
    state.boards = [[
      [{ char: "ก", marked: false, free: false }, { char: "ข", marked: false, free: false }, { char: "ค", marked: false, free: false }, { char: "ง", marked: false, free: false }, { char: "จ", marked: false, free: false }],
      [{ char: "ก", marked: false, free: false }, { char: "ข", marked: false, free: false }, { char: "ค", marked: false, free: false }, { char: "ง", marked: false, free: false }, { char: "จ", marked: false, free: false }],
      [{ char: "ก", marked: false, free: false }, { char: "ข", marked: false, free: false }, { char: "ค", marked: false, free: false }, { char: "ง", marked: false, free: false }, { char: "จ", marked: false, free: false }],
      [{ char: "ก", marked: false, free: false }, { char: "ข", marked: false, free: false }, { char: "ค", marked: false, free: false }, { char: "ง", marked: false, free: false }, { char: "จ", marked: false, free: false }],
      [{ char: "ก", marked: false, free: false }, { char: "ข", marked: false, free: false }, { char: "ค", marked: false, free: false }, { char: "ง", marked: false, free: false }, { char: "จ", marked: false, free: false }],
    ]];
    expect(buildLocalSession(state)).toBeNull();
  });

  it("returns null when boards are empty", () => {
    state.gameType = "local";
    state.boards = [];
    expect(buildLocalSession(state)).toBeNull();
  });
});

describe("saveSession / loadSession round-trip", () => {
  it("round-trips an online session", () => {
    const session = {
      type: "online" as const,
      roomCode: "XYZ789",
      playerId: "p42",
      role: "player" as const,
      moderatorPlaying: false,
      joinName: "Bob",
    };
    saveSession(session);
    const loaded = loadSession();
    expect(loaded).toEqual(session);
  });

  it("round-trips a local session", () => {
    const board = [
      [{ char: "ก", marked: true, free: false }, { char: "ข", marked: false, free: false }, { char: "ค", marked: false, free: false }, { char: "ง", marked: false, free: false }, { char: "จ", marked: false, free: false }],
      [{ char: "ฉ", marked: false, free: false }, { char: "ช", marked: false, free: false }, { char: "ซ", marked: false, free: false }, { char: "ฌ", marked: false, free: false }, { char: "ญ", marked: false, free: false }],
      [{ char: "ฎ", marked: false, free: false }, { char: "ฏ", marked: false, free: false }, { char: "★", marked: true, free: true }, { char: "ฑ", marked: false, free: false }, { char: "ฒ", marked: false, free: false }],
      [{ char: "ณ", marked: false, free: false }, { char: "ด", marked: false, free: false }, { char: "ต", marked: false, free: false }, { char: "ถ", marked: false, free: false }, { char: "ท", marked: false, free: false }],
      [{ char: "ธ", marked: false, free: false }, { char: "น", marked: false, free: false }, { char: "บ", marked: false, free: false }, { char: "ป", marked: false, free: false }, { char: "ผ", marked: false, free: false }],
    ];
    const session = {
      type: "local" as const,
      mode: "mixed",
      hintsOn: true,
      playerCount: 1,
      players: ["Test"],
      botPlayers: [false],
      boards: [board],
      gamePool: ["ก", "ข"],
      calledChars: ["ก"],
      currentChar: "ก",
      pendingChar: null as string | null,
      gameActive: true,
      winners: [] as (number | string)[],
    };
    saveSession(session);
    const loaded = loadSession();
    expect(loaded).toEqual(session);
  });
});

describe("clearSession", () => {
  it("removes saved session data", () => {
    saveSession({
      type: "online",
      roomCode: "ABC123",
      playerId: "p1",
      role: "moderator",
      moderatorPlaying: false,
      joinName: "",
    });
    expect(loadSession()).not.toBeNull();
    clearSession();
    expect(loadSession()).toBeNull();
  });
});

describe("loadSession edge cases", () => {
  it("returns null when nothing is stored", () => {
    expect(loadSession()).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    sessionStorage.setItem("bingo_session", "not json{{{");
    expect(loadSession()).toBeNull();
  });

  it("returns null for non-object data", () => {
    sessionStorage.setItem("bingo_session", '"just a string"');
    expect(loadSession()).toBeNull();
  });

  it("handles sessionStorage throwing", () => {
    const orig = sessionStorage.getItem;
    sessionStorage.getItem = () => { throw new Error("quota"); };
    expect(loadSession()).toBeNull();
    sessionStorage.getItem = orig;
  });
});

describe("saveSession handles sessionStorage throwing", () => {
  it("does not throw when sessionStorage.setItem fails", () => {
    const orig = sessionStorage.setItem;
    sessionStorage.setItem = () => { throw new Error("quota"); };
    expect(() => saveSession({
      type: "online",
      roomCode: "A",
      playerId: "p",
      role: "player",
      moderatorPlaying: false,
      joinName: "",
    })).not.toThrow();
    sessionStorage.setItem = orig;
  });
});
