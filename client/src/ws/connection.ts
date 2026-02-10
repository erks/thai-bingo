import { state } from "../state";
import { API_BASE } from "../config";
import { $ } from "../ui/dom";
import { handleServerMessage } from "./handlers";

export function connectWebSocket(): void {
    const wsBase = API_BASE.replace(/^http/, "ws");
    const params = new URLSearchParams({
        role: state.role || "",
        id: state.playerId || "",
        name: state._joinName || "",
    });
    const url = `${wsBase}/api/room/${state.roomCode}/websocket?${params}`;
    const ws = new WebSocket(url);
    state._wsConnecting = true;

    ws.onopen = () => {
        console.log("[ws] connected");
        state.ws = ws;
        state._wsConnecting = false;
        if (state._wsSendQueue && state._wsSendQueue.length > 0) {
            const queue = state._wsSendQueue;
            state._wsSendQueue = [];
            queue.forEach(m => wsSend(m));
        }
        updateConnectionStatus(true);
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
    };

    ws.onclose = () => {
        console.log("[ws] disconnected");
        state.ws = null;
        state._wsConnecting = false;
        updateConnectionStatus(false);
        if (state.gameType === "online" && state.roomCode) {
            setTimeout(() => {
                if (state.gameType === "online" && !state.ws && !state._wsConnecting) {
                    connectWebSocket();
                }
            }, 1000);
        }
    };

    ws.onerror = () => {
        ws.close();
    };
}

export function wsSend(msg: Record<string, unknown>): boolean {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify(msg));
        return true;
    }
    if (!state._wsSendQueue) state._wsSendQueue = [];
    state._wsSendQueue.push(msg);
    console.warn("[ws] not connected, message queued:", (msg as { type?: string }).type);
    return false;
}

export function updateConnectionStatus(connected: boolean): void {
    const banner = $("connection-status");
    if (!banner) return;
    if (connected) {
        banner.classList.add("hidden");
    } else if (state.gameType === "online") {
        banner.classList.remove("hidden");
    }
}
