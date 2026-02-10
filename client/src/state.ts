import type { Cell } from "@thai-bingo/shared";

export interface GameState {
    lang: string;
    playerCount: number;
    mode: string;
    hintsOn: boolean;
    players: string[];
    boards: Cell[][][];
    gamePool: string[];
    calledChars: string[];
    currentChar: string | null;
    gameActive: boolean;
    winners: (number | string)[];
    confettiId: number | null;
    pendingChar: string | null;
    pendingSelections: Record<number, { pi?: number; r: number; c: number }>;
    // Online mode
    gameType: "local" | "online";
    onlineRole: "create" | "join";
    role: "moderator" | "player" | null;
    moderatorPlaying: boolean;
    ws: WebSocket | null;
    playerId: string | null;
    roomCode: string | null;
    onlinePlayers: Array<{ id: string; name: string; connected: boolean }>;
    allBoards: Record<string, Cell[][]>;
    myBoardId: string | null;
    onlinePhase: "lobby" | "playing" | null;
    pendingReadyIds: string[];
    isReady: boolean;
    // Internal
    _joinName?: string;
    _wsConnecting?: boolean;
    _wsSendQueue?: Array<Record<string, unknown>>;
    _boardIdMap: Record<number, string>;
    _boardIndexMap: Record<string, number>;
}

function getSavedLang(): string {
    try {
        return localStorage.getItem("lang") || "th";
    } catch {
        return "th";
    }
}

function createInitialState(): GameState {
    return {
        lang: getSavedLang(),
        playerCount: 2,
        mode: "mixed",
        hintsOn: true,
        players: [],
        boards: [],
        gamePool: [],
        calledChars: [],
        currentChar: null,
        gameActive: false,
        winners: [],
        confettiId: null,
        pendingChar: null,
        pendingSelections: {},
        gameType: "local",
        onlineRole: "create",
        role: null,
        moderatorPlaying: false,
        ws: null,
        playerId: null,
        roomCode: null,
        onlinePlayers: [],
        allBoards: {},
        myBoardId: null,
        onlinePhase: null,
        pendingReadyIds: [],
        isReady: false,
        _boardIdMap: {},
        _boardIndexMap: {},
    };
}

export let state: GameState = createInitialState();

export function resetGameState(): void {
    const lang = state.lang;
    state = createInitialState();
    state.lang = lang;
}
