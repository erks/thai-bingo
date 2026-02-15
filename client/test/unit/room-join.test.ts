import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { state } from "../../src/state";
import { showRoomCodeError } from "../../src/ui/setup";

// ---------- Mocks for handler tests ----------

// Mock audio (imported by handlers.ts)
vi.mock("../../src/audio/audio", () => ({
    ensureAudio: vi.fn(),
    sfxCall: vi.fn(),
    sfxMark: vi.fn(),
    sfxWrong: vi.fn(),
    sfxWin: vi.fn(),
    sfxReady: vi.fn(),
    sfxAllReady: vi.fn(),
}));
vi.mock("../../src/audio/speech", () => ({
    speakChar: vi.fn(),
    stopCharVoiceover: vi.fn(),
}));
// Mock confetti
vi.mock("../../src/game/confetti", () => ({
    startConfetti: vi.fn(),
    stopConfetti: vi.fn(),
}));

// Mock WebSocket connection
vi.mock("../../src/ws/connection", () => ({
    connectWebSocket: vi.fn(),
    wsSend: vi.fn(() => true),
    updateConnectionStatus: vi.fn(),
}));

// Import handler after mocks
import { handleServerMessage } from "../../src/ws/handlers";

// ---------- showRoomCodeError ----------

describe("showRoomCodeError", () => {
    let input: HTMLInputElement;

    beforeEach(() => {
        const container = document.createElement("div");
        input = document.createElement("input");
        input.className = "room-code-input";
        container.appendChild(input);
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.innerHTML = "";
    });

    it("adds error class to input", () => {
        showRoomCodeError(input, "Room not found");
        expect(input.classList.contains("error")).toBe(true);
    });

    it("creates error message div after input", () => {
        showRoomCodeError(input, "Room not found");
        const errDiv = input.parentElement!.querySelector(".room-code-error");
        expect(errDiv).not.toBeNull();
        expect(errDiv!.textContent).toBe("Room not found");
    });

    it("replaces existing error on re-call", () => {
        showRoomCodeError(input, "Error 1");
        showRoomCodeError(input, "Error 2");
        const errors = input.parentElement!.querySelectorAll(".room-code-error");
        expect(errors).toHaveLength(1);
        expect(errors[0].textContent).toBe("Error 2");
    });
});

// ---------- _joinPending lifecycle ----------

describe("_joinPending lifecycle", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="setup-screen" class="hidden"></div>
            <div id="game-screen" class="hidden"></div>
            <div id="lobby-screen"></div>
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
            <div id="connection-status" class="hidden"></div>
        `;
        state.gameType = "online";
        state.role = "player";
        state.roomCode = "ABCDEF";
        state.playerId = "p1";
        state._joinPending = true;
        state.onlinePlayers = [];
        state.onlinePhase = "lobby";
    });

    afterEach(() => {
        state.role = null;
        state.roomCode = null;
        state._joinPending = false;
        state.onlinePlayers = [];
        state.onlinePhase = null;
        state.gameType = "local";
        state.ws = null;
    });

    it("'joined' message clears _joinPending", () => {
        expect(state._joinPending).toBe(true);
        handleServerMessage({
            type: "joined",
            playerId: "p1",
            players: [{ id: "p1", name: "Alice", connected: true }],
            phase: "lobby",
        });
        expect(state._joinPending).toBe(false);
    });

    it("'joined' message updates playerId from server", () => {
        handleServerMessage({
            type: "joined",
            playerId: "server-assigned-id",
            players: [],
            phase: "lobby",
        });
        expect(state.playerId).toBe("server-assigned-id");
    });
});

// ---------- returnToJoinWithError (via error message) ----------

describe("error handler for room_not_found", () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="setup-screen" class="hidden"></div>
            <div id="game-screen" class="hidden"></div>
            <div id="lobby-screen"></div>
            <div id="connection-status"></div>
            <div id="game-type-section"><div class="setup-section"></div></div>
            <div class="setup-container">
                <div class="setup-section" id="player-count-section">
                    <div id="player-count-btns"></div>
                </div>
                <div class="setup-section" id="names-section">
                    <div id="name-inputs"></div>
                </div>
                <div class="setup-section" id="mode-section">
                    <div id="mode-btns"></div>
                </div>
                <div class="hint-toggle">
                    <input id="hints-check" type="checkbox" checked />
                </div>
                <button class="start-button"></button>
            </div>
        `;
        state.gameType = "online";
        state.role = "player";
        state.roomCode = "BADCODE";
        state.playerId = "p1";
        state.onlinePhase = "lobby";
        state.onlinePlayers = [];
    });

    afterEach(() => {
        state.role = null;
        state.roomCode = null;
        state.onlinePlayers = [];
        state.onlinePhase = null;
        state.gameType = "local";
        state.ws = null;
        vi.useRealTimers();
    });

    it("room_not_found error clears role and shows setup screen", () => {
        vi.useFakeTimers();
        handleServerMessage({ type: "error", code: "room_not_found", message: "Room not found" });

        expect(state.role).toBeNull();
        expect(state.onlinePhase).toBeNull();
        expect(state.onlineRole).toBe("join");

        // Setup screen should be visible
        const setup = document.getElementById("setup-screen")!;
        expect(setup.classList.contains("hidden")).toBe(false);

        // Lobby should be hidden
        const lobby = document.getElementById("lobby-screen")!;
        expect(lobby.classList.contains("hidden")).toBe(true);
    });

    it("room_not_found preserves room code for retry", () => {
        vi.useFakeTimers();
        handleServerMessage({ type: "error", code: "room_not_found", message: "Room not found" });

        expect(state.roomCode).toBe("BADCODE");
    });

    it("double-execution guard prevents crash when role already cleared", () => {
        vi.useFakeTimers();
        // First call clears role
        handleServerMessage({ type: "error", code: "room_not_found", message: "Room not found" });
        expect(state.role).toBeNull();

        // Second call should return early without crashing
        expect(() => {
            handleServerMessage({ type: "error", code: "room_not_found", message: "Room not found" });
        }).not.toThrow();
    });

    it("room_not_found detaches WebSocket to prevent reconnect", () => {
        const mockWs = { onclose: vi.fn(), close: vi.fn() } as unknown as WebSocket;
        state.ws = mockWs;

        vi.useFakeTimers();
        handleServerMessage({ type: "error", code: "room_not_found", message: "Room not found" });

        expect(mockWs.onclose).toBeNull();
        expect(mockWs.close).toHaveBeenCalled();
        expect(state.ws).toBeNull();
    });

    it("connection banner is hidden after room_not_found", () => {
        vi.useFakeTimers();
        const banner = document.getElementById("connection-status")!;
        banner.classList.remove("hidden"); // Simulate banner showing
        handleServerMessage({ type: "error", code: "room_not_found", message: "Room not found" });

        expect(banner.classList.contains("hidden")).toBe(true);
    });
});
