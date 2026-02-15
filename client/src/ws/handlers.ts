import { state } from "../state";
import { t } from "../i18n/i18n";
import { ensureAudio, sfxCall, sfxMark, sfxWrong, sfxWin, sfxReady, sfxAllReady } from "../audio/audio";
import { speakChar, stopCharVoiceover } from "../audio/speech";
import { $ } from "../ui/dom";
import { renderGame, renderCalledHistory, updateHints, applyDisconnectedBadge } from "../ui/boards";
import { showLobby, renderLobbyPlayers, stopLobbySync } from "../ui/lobby";
import {
    renderOnlineStatusBanner, renderReadyButton, renderPlayerReplayButton,
    updateReadyButton, updateReadyIndicators, updateModeratorReadyInfo,
    clearReadyState,
} from "../ui/online-ui";
import { setVoiceStatus } from "../game/caller";
import { startConfetti } from "../game/confetti";
import { leaveToSetup } from "../game/win";
import { initSetup, showRoomCodeError } from "../ui/setup";
import { buildOnlineSession, saveSession, clearSession } from "../session";

export function handleServerMessage(msg: Record<string, unknown>): void {
    switch (msg.type) {
        case "joined": {
            state.playerId = msg.playerId as string;
            state.onlinePlayers = (msg.players as Array<{ id: string; name: string; connected: boolean }>) || [];
            state.onlinePhase = (msg.phase as "lobby" | "playing") || "lobby";
            state._joinPending = false;
            renderLobbyPlayers();
            const onlineSession = buildOnlineSession(state);
            if (onlineSession) saveSession(onlineSession);
            break;
        }

        case "player_joined":
            state.onlinePlayers = (msg.players as Array<{ id: string; name: string; connected: boolean }>) || [];
            renderLobbyPlayers();
            break;

        case "player_disconnected":
            markPlayerConnection(msg.playerId as string, false);
            break;

        case "player_reconnected":
            markPlayerConnection(msg.playerId as string, true);
            break;

        case "moderator_disconnected":
            break;

        case "game_start":
            stopLobbySync();
            onlineGameStart(msg);
            break;

        case "randomized":
            onlineRandomized(msg.pendingChar as string);
            break;

        case "char_pending":
            onlineCharPending(msg.char as string);
            break;

        case "char_pending_moderator":
            if (msg.char) speakChar(msg.char as string);
            break;

        case "char_replay":
            if (msg.char) speakChar(msg.char as string);
            break;

        case "revealed":
            onlineRevealed(msg);
            break;

        case "mark_result":
            onlineMarkResult(msg);
            break;

        case "win":
            onlineWin(msg);
            break;

        case "ready_update": {
            const prevCount = state.pendingReadyIds.length;
            state.pendingReadyIds = (msg.readyPlayerIds as string[]) || [];
            state.isReady = state.pendingReadyIds.includes(state.playerId || "");
            updateReadyButton();
            updateReadyIndicators();
            if (state.role === "moderator") updateModeratorReadyInfo();
            const connectedPlayers = state.onlinePlayers.filter(p => p.connected !== false);
            const totalParticipants = connectedPlayers.length - (state.moderatorPlaying ? 1 : 0);
            const allReady = state.pendingReadyIds.length === totalParticipants && totalParticipants > 0;
            if (state.pendingReadyIds.length > prevCount) {
                if (allReady) sfxAllReady(); else sfxReady();
            }
            break;
        }

        case "room_closed":
            alert(t("roomClosed"));
            leaveToSetup();
            break;

        case "error":
            if (msg.code === "room_not_found" || (msg.message as string)?.includes("not found")) {
                returnToJoinWithError(state.roomCode || "");
            } else {
                alert(msg.message);
            }
            break;
    }
}

function markPlayerConnection(playerId: string, connected: boolean): void {
    const p = state.onlinePlayers.find(p => p.id === playerId);
    if (p) p.connected = connected;
    renderLobbyPlayers();

    // Update board card during gameplay
    const card = document.querySelector(`.board-card[data-player-id="${playerId}"]`);
    if (card) {
        const header = card.querySelector(".board-header");
        if (header) applyDisconnectedBadge(card, header, !connected);
    }

    // Refresh ready count (total changes when a player disconnects/reconnects)
    if (state.role === "moderator") updateModeratorReadyInfo();
}

function onlineGameStart(msg: Record<string, unknown>): void {
    ensureAudio();

    state.onlinePhase = "playing";
    state.allBoards = msg.boards as Record<string, import("@thai-bingo/shared").Cell[][]>;
    state.gamePool = msg.gamePool as string[];
    state.onlinePlayers = msg.players as Array<{ id: string; name: string; connected: boolean }>;
    state.myBoardId = (msg.yourBoardId as string) || null;
    state.hintsOn = msg.hintsOn as boolean;
    state.calledChars = (msg.calledChars as string[]) || [];
    state.currentChar = (msg.currentChar as string) || null;
    state.winners = (msg.winners as string[]) || [];
    state.gameActive = true;
    state.pendingChar = (msg.pendingChar as string) || null;
    state.pendingSelections = {};
    state.pendingReadyIds = (msg.pendingReadyIds as string[]) || [];
    state.isReady = state.pendingReadyIds.includes(state.playerId || "");

    const playerIds = Object.keys(state.allBoards);
    state.boards = [];
    state.players = [];
    state._boardIdMap = {};
    state._boardIndexMap = {};

    if (state.role === "player" || (state.role === "moderator" && state.moderatorPlaying)) {
        if (state.myBoardId && state.allBoards[state.myBoardId]) {
            const idx = state.boards.length;
            state.boards.push(state.allBoards[state.myBoardId]);
            const info = state.onlinePlayers.find(p => p.id === state.myBoardId);
            state.players.push(info ? info.name : t("you"));
            state._boardIdMap[idx] = state.myBoardId;
            state._boardIndexMap[state.myBoardId] = idx;
        }
        for (const pid of playerIds) {
            if (pid === state.myBoardId) continue;
            const idx = state.boards.length;
            state.boards.push(state.allBoards[pid]);
            const info = state.onlinePlayers.find(p => p.id === pid);
            state.players.push(info ? info.name : pid);
            state._boardIdMap[idx] = pid;
            state._boardIndexMap[pid] = idx;
        }
    } else {
        for (const pid of playerIds) {
            const idx = state.boards.length;
            state.boards.push(state.allBoards[pid]);
            const info = state.onlinePlayers.find(p => p.id === pid);
            state.players.push(info ? info.name : pid);
            state._boardIdMap[idx] = pid;
            state._boardIndexMap[pid] = idx;
        }
    }

    state.playerCount = state.boards.length;

    const lobbyScreen = $("lobby-screen");
    if (lobbyScreen) lobbyScreen.classList.add("hidden");
    const setupScreen = $("setup-screen");
    if (setupScreen) setupScreen.classList.add("hidden");
    const gameScreen = $("game-screen");
    if (gameScreen) gameScreen.classList.remove("hidden");
    const winOverlay = $("win-overlay");
    if (winOverlay) winOverlay.classList.add("hidden");

    const callerSection = document.querySelector(".caller-section");
    if (callerSection) {
        if (state.role === "moderator") callerSection.classList.remove("hidden");
        else callerSection.classList.add("hidden");
    }

    renderGame();
    renderOnlineStatusBanner();

    const randomBtn = $("random-btn") as HTMLButtonElement | null;
    if (randomBtn) randomBtn.disabled = false;
    const replayBtn = $("replay-btn");
    if (replayBtn) replayBtn.classList.add("hidden");
    const revealBtn = $("reveal-btn");
    if (revealBtn) revealBtn.classList.add("hidden");
    setVoiceStatus(t("statusReady"), "", "statusReady");

    if (state.pendingChar) {
        renderReadyButton();
        renderPlayerReplayButton();
        updateReadyButton();
        updateReadyIndicators();
        if (state.role === "moderator") {
            if (randomBtn) randomBtn.disabled = true;
            if (replayBtn) replayBtn.classList.remove("hidden");
            if (revealBtn) revealBtn.classList.remove("hidden");
            setVoiceStatus(t("statusPending"), "", "statusPending");
            updateModeratorReadyInfo();
        }
    }
}

function onlineRandomized(pendingChar: string): void {
    state.pendingChar = pendingChar;
    state.pendingSelections = {};
    clearReadyState();

    const charEl = $("current-char");
    const display = $("caller-display");
    if (charEl) charEl.textContent = "?";
    if (display) display.classList.remove("has-char");

    speakChar(pendingChar);

    const randomBtn = $("random-btn") as HTMLButtonElement | null;
    if (randomBtn) randomBtn.disabled = true;
    const replayBtn = $("replay-btn");
    if (replayBtn) replayBtn.classList.remove("hidden");
    const revealBtn = $("reveal-btn");
    if (revealBtn) revealBtn.classList.remove("hidden");
    setVoiceStatus(t("statusPending"), "", "statusPending");
    updateModeratorReadyInfo();
}

function onlineCharPending(char: string): void {
    state.pendingChar = char || "__hidden__";
    state.pendingSelections = {};
    state.pendingReadyIds = [];
    state.isReady = false;

    if (char && state.role === "player") {
        ensureAudio();
        speakChar(char);
    }

    renderOnlineStatusBanner();
    renderReadyButton();
    renderPlayerReplayButton();
}

function onlineRevealed(msg: Record<string, unknown>): void {
    const char = msg.char as string;
    state.pendingChar = null;
    state.calledChars = msg.calledChars as string[];
    state.currentChar = char;

    const display = $("caller-display");
    const charEl = $("current-char");
    if (charEl) charEl.textContent = char;
    if (display) {
        display.classList.remove("pop", "has-char");
        void display.offsetWidth;
        display.classList.add("pop", "has-char");
    }
    const drawCount = $("draw-count");
    if (drawCount) drawCount.textContent = String(state.calledChars.length);
    sfxCall();
    renderCalledHistory();

    const selections = (msg.selections || {}) as Record<string, { r: number; c: number; valid: boolean }>;
    for (const [playerId, result] of Object.entries(selections)) {
        const pi = state._boardIndexMap[playerId];
        if (pi === undefined) continue;
        const el = $(`cell-${pi}-${result.r}-${result.c}`);
        if (!el) continue;

        if (result.valid) {
            state.boards[pi][result.r][result.c].marked = true;
            el.classList.remove("selected", "hint-pulse");
            el.classList.add("marked", "mark-anim");
            el.onclick = null;
            sfxMark();
            setTimeout(() => el.classList.remove("mark-anim"), 400);
        } else {
            el.classList.remove("selected");
            el.classList.add("wrong");
            sfxWrong();
            setTimeout(() => el.classList.remove("wrong"), 350);
        }
    }

    state.pendingSelections = {};

    if (state.role === "moderator") {
        const revealBtn = $("reveal-btn");
        if (revealBtn) revealBtn.classList.add("hidden");
        const replayBtn = $("replay-btn");
        if (replayBtn) replayBtn.classList.add("hidden");
        const remaining = state.gamePool.filter(ch => !state.calledChars.includes(ch));
        const randomBtn = $("random-btn") as HTMLButtonElement | null;
        if (randomBtn) randomBtn.disabled = remaining.length === 0;
        setVoiceStatus(
            remaining.length > 0 ? t("statusNext") : t("statusEmpty"),
            remaining.length > 0 ? "success" : "",
            remaining.length > 0 ? "statusNext" : "statusEmpty",
        );
    }

    clearReadyState();
    updateHints();
    renderOnlineStatusBanner();
}

function onlineMarkResult(msg: Record<string, unknown>): void {
    const playerId = msg.playerId as string;
    const r = msg.r as number;
    const c = msg.c as number;
    const valid = msg.valid as boolean;

    const pi = state._boardIndexMap[playerId];
    if (pi === undefined) return;
    const el = $(`cell-${pi}-${r}-${c}`);
    if (!el) return;

    if (valid) {
        state.boards[pi][r][c].marked = true;
        el.classList.remove("hint-pulse");
        el.classList.add("marked", "mark-anim");
        el.onclick = null;
        if (playerId === state.playerId) sfxMark();
        setTimeout(() => el.classList.remove("mark-anim"), 400);
    } else {
        if (playerId === state.playerId) {
            el.classList.add("wrong");
            sfxWrong();
            setTimeout(() => el.classList.remove("wrong"), 350);
        }
    }
    updateHints();
}

function onlineWin(msg: Record<string, unknown>): void {
    sfxWin();
    const playerId = msg.playerId as string;
    const winLine = msg.winLine as [number, number][] | undefined;
    const pi = state._boardIndexMap[playerId];
    if (pi !== undefined && winLine) {
        winLine.forEach(([r, c]) => {
            const el = $(`cell-${pi}-${r}-${c}`);
            if (el) el.classList.add("win-glow");
        });
    }
    state.winners.push(playerId);

    setTimeout(() => {
        stopCharVoiceover();
        const winnerName = $("winner-name");
        if (winnerName) winnerName.textContent = msg.playerName as string;
        const overlay = $("win-overlay");
        if (overlay) overlay.classList.remove("hidden");
        startConfetti();
    }, 500);
}

function returnToJoinWithError(roomCode: string): void {
    // Guard: don't run twice (onmessage + onclose can both trigger this)
    if (!state.role) return;

    clearSession();
    stopLobbySync();

    // Detach onclose before closing so it doesn't show the reconnecting
    // banner or schedule a reconnect attempt.
    if (state.ws) {
        state.ws.onclose = null;
        state.ws.close();
        state.ws = null;
    }

    // Set join form state so user can correct the code
    state.gameType = "online";
    state.onlineRole = "join";
    state.roomCode = roomCode;
    state.role = null;
    state.onlinePhase = null;

    const banner = $("connection-status");
    if (banner) banner.classList.add("hidden");

    const lobbyScreen = $("lobby-screen");
    if (lobbyScreen) lobbyScreen.classList.add("hidden");
    const setupScreen = $("setup-screen");
    if (setupScreen) setupScreen.classList.remove("hidden");

    initSetup();

    if (location.pathname !== "/") {
        history.pushState(null, "", "/");
    }

    // Show error on room code input after DOM renders (initSetup uses setTimeout for prefill)
    setTimeout(() => {
        const codeInput = $("join-room-code") as HTMLInputElement | null;
        if (codeInput) showRoomCodeError(codeInput, t("errorRoomNotFound"));
    }, 0);
}
