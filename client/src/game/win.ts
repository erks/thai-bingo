import { state } from "../state";
import { t } from "../i18n/i18n";
import { sfxWin } from "../audio/audio";
import { stopCharVoiceover } from "../audio/speech";
import { $ } from "../ui/dom";
import { startConfetti, stopConfetti } from "./confetti";
import { wsSend } from "../ws/connection";
import { initSetup, startGame } from "../ui/setup";
import { stopAutoPlay, startAutoPlay, isAllBots } from "./bot";
import { clearSession, saveLocalIfActive } from "../session";

export function showWin(pi: number): void {
    stopAutoPlay();
    sfxWin();
    state.gameActive = false;
    stopCharVoiceover();
    saveLocalIfActive();
    const winnerName = $("winner-name");
    if (winnerName) winnerName.textContent = state.players[pi];
    const overlay = $("win-overlay");
    if (overlay) overlay.classList.remove("hidden");
    startConfetti();
}

export function continueAfterWin(): void {
    stopConfetti();
    const overlay = $("win-overlay");
    if (overlay) overlay.classList.add("hidden");
    state.gameActive = true;
    saveLocalIfActive();
    if (isAllBots(state.botPlayers)) {
        startAutoPlay();
    }
}

export function resetGame(): void {
    stopAutoPlay();
    stopConfetti();
    stopCharVoiceover();
    const overlay = $("win-overlay");
    if (overlay) overlay.classList.add("hidden");
    if (state.gameType === "online") {
        if (state.role === "moderator") {
            wsSend({ type: "start", moderatorPlaying: state.moderatorPlaying });
        }
        return;
    }
    startGame();
}

export function backToSetup(): void {
    if (state.gameType === "online" && state.roomCode) {
        const msg = state.role === "moderator" ? t("confirmLeaveRoom") : t("confirmLeaveRoomPlayer");
        if (!confirm(msg)) return;
        // Moderator closing the room: notify server so all players are disconnected
        if (state.role === "moderator") {
            wsSend({ type: "close_room" });
        }
    }

    leaveToSetup();
}

export function leaveToSetup(): void {
    stopAutoPlay();
    stopConfetti();
    stopCharVoiceover();
    clearSession();
    if (state.ws) { state.ws.close(); state.ws = null; }
    state.gameType = "local";
    state.role = null;
    state.roomCode = null;
    state.onlinePhase = null;
    const banner = $("online-status-banner");
    if (banner) banner.remove();
    const callerSection = document.querySelector(".caller-section");
    if (callerSection) callerSection.classList.remove("hidden");

    const overlay = $("win-overlay");
    if (overlay) overlay.classList.add("hidden");
    const gameScreen = $("game-screen");
    if (gameScreen) gameScreen.classList.add("hidden");
    const lobbyScreen = $("lobby-screen");
    if (lobbyScreen) lobbyScreen.classList.add("hidden");
    const setupScreen = $("setup-screen");
    if (setupScreen) setupScreen.classList.remove("hidden");

    initSetup();

    if (location.pathname !== "/") {
        history.pushState(null, "", "/");
    }
}
