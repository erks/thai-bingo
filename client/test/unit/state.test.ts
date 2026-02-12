import { describe, it, expect, vi, beforeEach } from "vitest";

describe("state", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("has correct initial values", async () => {
    const { state } = await import("../../src/state");
    expect(state.gameType).toBe("local");
    expect(state.playerCount).toBe(2);
    expect(state.mode).toBe("mixed");
    expect(state.hintsOn).toBe(true);
    expect(state.gameActive).toBe(false);
    expect(state.boards).toEqual([]);
    expect(state.calledChars).toEqual([]);
    expect(state.role).toBeNull();
    expect(state.ws).toBeNull();
    expect(state.botPlayers).toEqual([]);
    expect(state.autoPlayTimerId).toBeNull();
  });

  it("GameState interface accepts valid state values", async () => {
    const { state } = await import("../../src/state");
    state.gameType = "online";
    expect(state.gameType).toBe("online");
    state.gameType = "local";
    state.role = "moderator";
    expect(state.role).toBe("moderator");
    state.role = null;
  });
});
