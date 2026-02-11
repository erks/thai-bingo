import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { state } from "../../src/state";

// Mock wsSend to capture calls
const wsSendCalls: Array<Record<string, unknown>> = [];
vi.mock("../../src/ws/connection", () => ({
    wsSend: (msg: Record<string, unknown>) => {
        wsSendCalls.push(msg);
        return true;
    },
}));

// Must import after mock setup
import { showLobby, stopLobbySync, renderLobbyPlayers } from "../../src/ui/lobby";

describe("lobby sync", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        wsSendCalls.length = 0;

        // Set up minimal DOM for showLobby
        document.body.innerHTML = `
            <div id="setup-screen"></div>
            <div id="game-screen"></div>
            <div id="lobby-screen" class="hidden"></div>
            <div id="lobby-title"></div>
            <div id="lobby-room-code"></div>
            <div id="lobby-subtitle"></div>
            <div id="share-link-row" class="hidden"></div>
            <div id="share-link-input"></div>
            <div id="copy-link-btn"></div>
            <button id="lobby-start-btn"></button>
            <div id="lobby-waiting-msg"></div>
            <div id="moderator-play-toggle" class="hidden"></div>
            <input id="lobby-moderator-plays" type="checkbox" />
            <div id="lobby-player-list"></div>
        `;

        // Set up state for moderator
        state.role = "moderator";
        state.roomCode = "ABCDEF";
        state.onlinePlayers = [];
        state.moderatorPlaying = false;
        state.playerId = "mod1";
    });

    afterEach(() => {
        stopLobbySync();
        vi.useRealTimers();
        state.role = null;
        state.roomCode = null;
        state.onlinePlayers = [];
    });

    it("showLobby starts periodic sync interval", () => {
        showLobby();
        expect(wsSendCalls).toHaveLength(0);

        vi.advanceTimersByTime(5000);
        expect(wsSendCalls).toHaveLength(1);
        expect(wsSendCalls[0]).toEqual({ type: "sync" });

        vi.advanceTimersByTime(5000);
        expect(wsSendCalls).toHaveLength(2);
    });

    it("stopLobbySync clears the interval", () => {
        showLobby();

        vi.advanceTimersByTime(5000);
        expect(wsSendCalls).toHaveLength(1);

        stopLobbySync();

        vi.advanceTimersByTime(10000);
        expect(wsSendCalls).toHaveLength(1); // no more sends
    });

    it("calling showLobby twice does not create duplicate intervals", () => {
        showLobby();
        showLobby();

        vi.advanceTimersByTime(5000);
        // Should be exactly 1 sync, not 2 (old interval was cleared)
        expect(wsSendCalls).toHaveLength(1);
    });

    it("stopLobbySync is idempotent when no interval exists", () => {
        // Should not throw when called without showLobby
        expect(() => stopLobbySync()).not.toThrow();
        expect(() => stopLobbySync()).not.toThrow();
    });

    it("sync interval keeps firing across many ticks", () => {
        showLobby();

        // Interval fires consistently over a long period
        for (let i = 1; i <= 10; i++) {
            vi.advanceTimersByTime(5000);
            expect(wsSendCalls).toHaveLength(i);
            expect(wsSendCalls[i - 1]).toEqual({ type: "sync" });
        }
    });

    it("renderLobbyPlayers shows correct player count", () => {
        state.onlinePlayers = [
            { id: "p1", name: "Alice", connected: true },
            { id: "p2", name: "Bob", connected: true },
            { id: "p3", name: "Charlie", connected: true },
        ];
        showLobby();

        const list = document.getElementById("lobby-player-list")!;
        const items = list.querySelectorAll(".player-list-item");
        expect(items).toHaveLength(3);
    });

    it("renderLobbyPlayers shows disconnected player with offline dot", () => {
        state.onlinePlayers = [
            { id: "p1", name: "Alice", connected: true },
            { id: "p2", name: "Bob", connected: false },
        ];
        showLobby();

        const list = document.getElementById("lobby-player-list")!;
        const items = list.querySelectorAll(".player-list-item");
        expect(items).toHaveLength(2);

        const dots = list.querySelectorAll(".connection-dot");
        expect(dots[0].classList.contains("online")).toBe(true);
        expect(dots[1].classList.contains("offline")).toBe(true);
    });

    it("start button disabled when not enough players", () => {
        state.onlinePlayers = [];
        showLobby();

        const startBtn = document.getElementById("lobby-start-btn") as HTMLButtonElement;
        expect(startBtn.disabled).toBe(true);
    });

    it("start button enabled with enough players", () => {
        state.onlinePlayers = [
            { id: "p1", name: "Alice", connected: true },
            { id: "p2", name: "Bob", connected: true },
        ];
        showLobby();

        const startBtn = document.getElementById("lobby-start-btn") as HTMLButtonElement;
        expect(startBtn.disabled).toBe(false);
    });
});
