import { state } from "../state";
import { t } from "../i18n/i18n";
import { PLAYER_COLORS } from "../config";
import { $ } from "./dom";
import { wsSend } from "../ws/connection";

export function showLobby(): void {
    const setupScreen = $("setup-screen");
    if (setupScreen) setupScreen.classList.add("hidden");
    const gameScreen = $("game-screen");
    if (gameScreen) gameScreen.classList.add("hidden");
    const lobbyScreen = $("lobby-screen");
    if (lobbyScreen) lobbyScreen.classList.remove("hidden");

    const title = $("lobby-title");
    const code = $("lobby-room-code");
    const subtitle = $("lobby-subtitle");
    const shareRow = $("share-link-row");
    const startBtn = $("lobby-start-btn") as HTMLButtonElement | null;
    const waitingMsg = $("lobby-waiting-msg");
    const playToggle = $("moderator-play-toggle");
    const playCheckbox = $("lobby-moderator-plays") as HTMLInputElement | null;

    if (code) code.textContent = state.roomCode || "";

    if (state.role === "moderator") {
        if (title) title.textContent = t("yourRoom");
        if (subtitle) subtitle.textContent = t("waitingForPlayers");
        if (shareRow) shareRow.classList.remove("hidden");
        const shareUrl = location.origin + location.pathname + "?room=" + state.roomCode;
        const shareInput = $("share-link-input") as HTMLInputElement | null;
        if (shareInput) shareInput.value = shareUrl;
        const copyBtn = $("copy-link-btn");
        if (copyBtn) copyBtn.textContent = t("copyLink");
        if (startBtn) {
            startBtn.textContent = t("startGameOnline");
            startBtn.classList.remove("hidden");
            startBtn.disabled = true;
        }
        if (waitingMsg) waitingMsg.classList.add("hidden");
        if (playToggle) playToggle.classList.remove("hidden");
        if (playCheckbox) playCheckbox.checked = state.moderatorPlaying;
        if (playToggle) {
            if (state.moderatorPlaying) playToggle.classList.add("active");
            else playToggle.classList.remove("active");
        }
    } else {
        if (title) title.textContent = t("youJoinedAs") + " " + (state._joinName || "");
        if (subtitle) subtitle.textContent = t("waitingForPlayers");
        if (shareRow) shareRow.classList.add("hidden");
        if (startBtn) startBtn.classList.add("hidden");
        if (waitingMsg) {
            waitingMsg.textContent = t("waitingForModerator");
            waitingMsg.classList.remove("hidden");
        }
        if (playToggle) playToggle.classList.add("hidden");
    }

    renderLobbyPlayers();
}

export function toggleModeratorPlaying(event: Event): void {
    const checkbox = $("lobby-moderator-plays") as HTMLInputElement | null;
    const toggle = $("moderator-play-toggle");
    if (!checkbox || !toggle) return;

    if (event.target !== checkbox) {
        checkbox.checked = !checkbox.checked;
    }
    state.moderatorPlaying = checkbox.checked;
    if (state.moderatorPlaying) toggle.classList.add("active");
    else toggle.classList.remove("active");
    renderLobbyPlayers();
}

export function renderLobbyPlayers(): void {
    const list = $("lobby-player-list");
    if (!list) return;
    list.innerHTML = "";

    state.onlinePlayers.forEach((p, i) => {
        const item = document.createElement("div");
        item.className = "player-list-item";

        const dot = document.createElement("div");
        dot.className = "color-dot";
        dot.style.background = PLAYER_COLORS[i % PLAYER_COLORS.length];
        item.appendChild(dot);

        const name = document.createElement("span");
        name.className = "player-name";
        name.textContent = p.name;
        item.appendChild(name);

        if (p.id === state.playerId) {
            const badge = document.createElement("span");
            badge.className = "you-badge";
            badge.textContent = t("you");
            item.appendChild(badge);
        }

        const connDot = document.createElement("div");
        connDot.className = "connection-dot " + (p.connected !== false ? "online" : "offline");
        item.appendChild(connDot);

        list.appendChild(item);
    });

    const subtitle = $("lobby-subtitle");
    const count = state.onlinePlayers.length;
    if (subtitle) {
        subtitle.textContent = count === 0
            ? t("waitingForPlayers")
            : t("lobbyPlayerCount").replace("{n}", String(count));
    }

    if (state.role === "moderator") {
        const startBtn = $("lobby-start-btn") as HTMLButtonElement | null;
        const minNeeded = state.moderatorPlaying ? 1 : 2;
        if (startBtn) startBtn.disabled = count < minNeeded;
    }
}

export function copyShareLink(): void {
    const input = $("share-link-input") as HTMLInputElement | null;
    if (!input) return;
    navigator.clipboard.writeText(input.value).then(() => {
        const btn = $("copy-link-btn");
        if (!btn) return;
        btn.textContent = t("linkCopied");
        btn.classList.add("copied");
        setTimeout(() => {
            btn.textContent = t("copyLink");
            btn.classList.remove("copied");
        }, 2000);
    });
}

export function onlineStartGame(): void {
    wsSend({ type: "start", moderatorPlaying: state.moderatorPlaying });
}
