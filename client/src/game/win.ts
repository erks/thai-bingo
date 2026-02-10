import { state } from "../state";
import { t } from "../i18n/i18n";
import { sfxWin } from "../audio/audio";
import { stopCharVoiceover } from "../audio/speech";
import { $ } from "../ui/dom";
import { startConfetti, stopConfetti } from "./confetti";
import { wsSend } from "../ws/connection";
import { startGame } from "../ui/setup";

export function showWin(pi: number): void {
    sfxWin();
    state.gameActive = false;
    stopCharVoiceover();
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
}

export function resetGame(): void {
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
    stopConfetti();
    stopCharVoiceover();
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
}
