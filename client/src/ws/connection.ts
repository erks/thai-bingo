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

    ws.onclose = (event) => {
        console.log("[ws] disconnected", event.code);
        state.ws = null;
        state._wsConnecting = false;

        // If join was never confirmed, treat any close as room-not-found
        if (state._joinPending) {
            state._joinPending = false;
            handleServerMessage({ type: "error", message: "Room not found", code: "room_not_found" });
            return;
        }

        updateConnectionStatus(false);
        if (state.gameType === "online" && state.roomCode && state.role) {
            setTimeout(() => {
                if (state.gameType === "online" && state.role && !state.ws && !state._wsConnecting) {
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
