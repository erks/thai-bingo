import type { Cell } from "@thai-bingo/shared";
import { state, type GameState } from "./state";

const SESSION_KEY = "bingo_session";

export interface OnlineSession {
    type: "online";
    roomCode: string;
    playerId: string;
    role: "moderator" | "player";
    moderatorPlaying: boolean;
    joinName: string;
}

export interface LocalSession {
    type: "local";
    mode: string;
    hintsOn: boolean;
    playerCount: number;
    players: string[];
    botPlayers: boolean[];
    boards: Cell[][][];
    gamePool: string[];
    calledChars: string[];
    currentChar: string | null;
    pendingChar: string | null;
    gameActive: boolean;
    winners: (number | string)[];
}

export type Session = OnlineSession | LocalSession;

export function buildOnlineSession(s: GameState): OnlineSession | null {
    if (s.gameType !== "online" || !s.roomCode) return null;
    return {
        type: "online",
        roomCode: s.roomCode,
        playerId: s.playerId || "",
        role: s.role as "moderator" | "player",
        moderatorPlaying: s.moderatorPlaying,
        joinName: s._joinName || "",
    };
}

export function buildLocalSession(s: GameState): LocalSession | null {
    if (s.gameType !== "local" || s.boards.length === 0) return null;
    return {
        type: "local",
        mode: s.mode,
        hintsOn: s.hintsOn,
        playerCount: s.playerCount,
        players: s.players,
        botPlayers: s.botPlayers,
        boards: s.boards,
        gamePool: s.gamePool,
        calledChars: s.calledChars,
        currentChar: s.currentChar,
        pendingChar: s.pendingChar,
        gameActive: s.gameActive,
        winners: s.winners,
    };
}

export function saveSession(session: Session): void {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
        // Quota exceeded or sessionStorage unavailable
    }
}

export function loadSession(): Session | null {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || !parsed.type) return null;
        return parsed as Session;
    } catch {
        return null;
    }
}

export function clearSession(): void {
    try {
        sessionStorage.removeItem(SESSION_KEY);
    } catch {
        // sessionStorage unavailable
    }
}

export function saveLocalIfActive(): void {
    if (state.gameType !== "local") return;
    const session = buildLocalSession(state);
    if (session) saveSession(session);
}
