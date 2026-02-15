import { state } from "../state";
import { t } from "../i18n/i18n";
import { $ } from "./dom";
import { ensureAudio } from "../audio/audio";
import { speakChar } from "../audio/speech";
import { wsSend } from "../ws/connection";

export function renderOnlineStatusBanner(): void {
    if (state.gameType !== "online" || state.role === "moderator") return;

    let banner = $("online-status-banner");
    if (!banner) {
        banner = document.createElement("div");
        banner.className = "status-banner";
        banner.id = "online-status-banner";
        const gameScreen = $("game-screen");
        if (gameScreen) gameScreen.insertBefore(banner, gameScreen.firstChild);
    }

    if (state.pendingChar) {
        banner.textContent = t("statusSelectYourCell");
        banner.className = "status-banner selecting";
    } else if (state.currentChar) {
        banner.textContent = t("statusCharRevealed").replace("{char}", state.currentChar);
        banner.className = "status-banner revealed";
    } else {
        banner.textContent = t("statusModeratorRandomizing");
        banner.className = "status-banner pending";
    }
}

export function renderReadyButton(): void {
    if (state.gameType !== "online" || state.role !== "player") return;
    removeReadyButton();
    const btn = document.createElement("button");
    btn.className = "ready-button";
    btn.id = "ready-btn";
    btn.textContent = t("readyBtn");
    btn.addEventListener("click", () => { wsSend({ type: "ready" }); });
    const gameScreen = $("game-screen");
    const boardsContainer = $("boards-container");
    if (gameScreen && boardsContainer) gameScreen.insertBefore(btn, boardsContainer);
}

export function removeReadyButton(): void {
    const btn = $("ready-btn");
    if (btn) btn.remove();
}

export function renderPlayerReplayButton(): void {
    if (state.gameType !== "online" || state.role !== "player") return;
    if (!state.pendingChar) return;
    removePlayerReplayButton();
    const btn = document.createElement("button");
    btn.className = "replay-button player-replay-button";
    btn.id = "player-replay-btn";
    btn.textContent = t("replay");
    btn.addEventListener("click", () => { ensureAudio(); if (state.pendingChar) speakChar(state.pendingChar); });
    const gameScreen = $("game-screen");
    const boardsContainer = $("boards-container");
    if (gameScreen && boardsContainer) gameScreen.insertBefore(btn, boardsContainer);
}

export function removePlayerReplayButton(): void {
    const btn = $("player-replay-btn");
    if (btn) btn.remove();
}

export function updateReadyButton(): void {
    const btn = $("ready-btn");
    if (!btn) return;
    if (state.isReady) {
        btn.classList.add("active");
        btn.textContent = "✅ " + t("readyBtn").replace(/^🙋 /, "");
    } else {
        btn.classList.remove("active");
        btn.textContent = t("readyBtn");
    }
}

export function updateReadyIndicators(): void {
    if (state.gameType !== "online") return;
    const readySet = new Set(state.pendingReadyIds);
    const allCards = document.querySelectorAll<HTMLElement>(".board-card[data-player-id]");

    for (const card of allCards) {
        const pid = card.dataset.playerId;
        const header = card.querySelector(".board-header");
        if (pid && readySet.has(pid)) {
            card.classList.add("player-ready");
            if (header && !header.querySelector(".ready-badge")) {
                const badge = document.createElement("span");
                badge.className = "ready-badge";
                badge.textContent = t("readyStatus");
                header.appendChild(badge);
            }
        } else {
            card.classList.remove("player-ready");
            if (header) {
                const badge = header.querySelector(".ready-badge");
                if (badge) badge.remove();
            }
        }
    }
}

export function updateModeratorReadyInfo(): void {
    if (state.role !== "moderator") return;
    let info = $("moderator-ready-info");
    if (!info) {
        info = document.createElement("div");
        info.className = "ready-info";
        info.id = "moderator-ready-info";
        const voicePanel = document.querySelector(".voice-panel");
        if (voicePanel) voicePanel.appendChild(info);
    }
    const connectedPlayers = state.onlinePlayers.filter(p => p.connected !== false);
    const totalParticipants = connectedPlayers.length - (state.moderatorPlaying ? 1 : 0);
    const n = state.pendingReadyIds.length;
    const allReady = n === totalParticipants && totalParticipants > 0;
    info.textContent = allReady
        ? t("allReady")
        : t("playersReady").replace("{n}", String(n)).replace("{total}", String(totalParticipants));
    info.classList.toggle("all-ready", allReady);
}

export function clearModeratorReadyInfo(): void {
    const info = $("moderator-ready-info");
    if (info) info.remove();
}

export function clearReadyState(): void {
    state.pendingReadyIds = [];
    state.isReady = false;
    removeReadyButton();
    removePlayerReplayButton();
    updateReadyIndicators();
    clearModeratorReadyInfo();
}
