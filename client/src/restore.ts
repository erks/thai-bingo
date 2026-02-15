import { state } from "./state";
import { loadSession, clearSession } from "./session";
import type { LocalSession, OnlineSession } from "./session";
import { renderGame } from "./ui/boards";
import { setVoiceStatus } from "./game/caller";
import { $ } from "./ui/dom";
import { t } from "./i18n/i18n";
import { connectWebSocket } from "./ws/connection";
import { showLobby } from "./ui/lobby";

export function tryRestoreSession(): boolean {
    const path = location.pathname;

    if (path === "/rooms/local") {
        return restoreLocal();
    }

    const match = path.match(/^\/rooms\/([A-Z0-9]{4,8})$/i);
    if (match) {
        return restoreOnline(match[1].toUpperCase());
    }

    return false;
}

function restoreLocal(): boolean {
    const session = loadSession();
    if (!session || session.type !== "local") {
        clearSession();
        history.replaceState(null, "", "/");
        return false;
    }

    applyLocalSession(session);

    const setupScreen = $("setup-screen");
    if (setupScreen) setupScreen.classList.add("hidden");
    const gameScreen = $("game-screen");
    if (gameScreen) gameScreen.classList.remove("hidden");
    const winOverlay = $("win-overlay");
    if (winOverlay) winOverlay.classList.add("hidden");

    renderGame();

    // Restore caller UI state
    const randomBtn = $("random-btn") as HTMLButtonElement | null;
    const replayBtn = $("replay-btn");
    const revealBtn = $("reveal-btn");

    if (state.pendingChar) {
        if (randomBtn) randomBtn.disabled = true;
        if (replayBtn) replayBtn.classList.remove("hidden");
        if (revealBtn) revealBtn.classList.remove("hidden");
        setVoiceStatus(t("statusPending"), "", "statusPending");
    } else if (state.gameActive) {
        const remaining = state.gamePool.filter(ch => !state.calledChars.includes(ch));
        if (randomBtn) randomBtn.disabled = remaining.length === 0;
        if (replayBtn) replayBtn.classList.add("hidden");
        if (revealBtn) revealBtn.classList.add("hidden");
        setVoiceStatus(
            remaining.length > 0 ? t("statusReady") : t("statusEmpty"),
            "",
            remaining.length > 0 ? "statusReady" : "statusEmpty",
        );
    }

    return true;
}

function restoreOnline(roomCode: string): boolean {
    const session = loadSession();
    if (session && session.type === "online" && session.roomCode === roomCode) {
        applyOnlineSession(session);
        state.onlinePhase = "lobby";
        connectWebSocket();
        showLobby();
        return true;
    }

    // No matching session — treat as invite link (show setup with join form)
    clearSession();
    state.gameType = "online";
    state.onlineRole = "join";
    state.roomCode = roomCode;
    return false;
}

function applyLocalSession(s: LocalSession): void {
    state.gameType = "local";
    state.mode = s.mode;
    state.hintsOn = s.hintsOn;
    state.playerCount = s.playerCount;
    state.players = s.players;
    state.botPlayers = s.botPlayers;
    state.boards = s.boards;
    state.gamePool = s.gamePool;
    state.calledChars = s.calledChars;
    state.currentChar = s.currentChar;
    state.pendingChar = s.pendingChar;
    state.gameActive = s.gameActive;
    state.winners = s.winners;
}

function applyOnlineSession(s: OnlineSession): void {
    state.gameType = "online";
    state.roomCode = s.roomCode;
    state.playerId = s.playerId;
    state.role = s.role;
    state.moderatorPlaying = s.moderatorPlaying;
    state._joinName = s.joinName;
}
