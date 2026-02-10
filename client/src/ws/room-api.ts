import { state } from "../state";
import { t } from "../i18n/i18n";
import { API_BASE } from "../config";
import { $ } from "../ui/dom";
import { connectWebSocket } from "./connection";
import { showLobby } from "../ui/lobby";

export async function createRoom(): Promise<void> {
    const nameInput = $("moderator-name") as HTMLInputElement | null;
    const name = nameInput?.value.trim() || t("defaultPlayer") + " 1";

    try {
        const resp = await fetch(API_BASE + "/api/room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                mode: state.mode,
                hintsOn: ($("hints-check") as HTMLInputElement | null)?.checked ?? true,
                playing: false,
            }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        state.roomCode = data.room;
        state.playerId = data.moderatorId;
        state.role = "moderator";
        state.onlinePhase = "lobby";
        state.onlinePlayers = [];
        state.moderatorPlaying = false;

        connectWebSocket();
        showLobby();
    } catch {
        alert(t("errorConnection"));
    }
}

export function joinRoom(): void {
    const code = ($("join-room-code") as HTMLInputElement | null)?.value.trim().toUpperCase();
    const name = ($("join-player-name") as HTMLInputElement | null)?.value.trim() || t("defaultPlayer");
    if (!code || code.length !== 6) return;

    state.roomCode = code;
    state.playerId = Math.random().toString(36).slice(2, 10);
    state.role = "player";
    state.onlinePhase = "lobby";
    state._joinName = name;

    connectWebSocket();
    showLobby();
}
