import type { Cell } from "@thai-bingo/shared";
import { state } from "../state";
import { markCell } from "./marking";
import { randomizeChar, revealChar } from "./caller";

// --- Pure functions (unit-testable) ---

export function findCellForChar(board: Cell[][], char: string): { r: number; c: number } | null {
    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
            const cell = board[r][c];
            if (cell.char === char && !cell.marked && !cell.free) {
                return { r, c };
            }
        }
    }
    return null;
}

export function botDelay(min = 300, max = 1500): number {
    return min + Math.random() * (max - min);
}

export function isAllBots(botPlayers: boolean[]): boolean {
    return botPlayers.every(b => b);
}

// --- Orchestration (side-effectful) ---

let botTimeouts: number[] = [];

export function scheduleBotSelections(): void {
    cancelBotSelections();
    if (!state.pendingChar) return;
    const char = state.pendingChar;

    for (let pi = 0; pi < state.boards.length; pi++) {
        if (!state.botPlayers[pi]) continue;
        const match = findCellForChar(state.boards[pi], char);
        if (match) {
            const timerId = window.setTimeout(() => {
                markCell(pi, match.r, match.c);
            }, botDelay());
            botTimeouts.push(timerId);
        }
    }
}

export function cancelBotSelections(): void {
    for (const id of botTimeouts) {
        window.clearTimeout(id);
    }
    botTimeouts = [];
}

export function startAutoPlay(): void {
    stopAutoPlay();
    const step = () => {
        if (!state.gameActive) return;
        randomizeChar();
        state.autoPlayTimerId = window.setTimeout(() => {
            if (!state.gameActive) return;
            revealChar();
            state.autoPlayTimerId = window.setTimeout(() => {
                if (!state.gameActive) return;
                step();
            }, 1500);
        }, 2000);
    };
    state.autoPlayTimerId = window.setTimeout(step, 500);
}

export function stopAutoPlay(): void {
    if (state.autoPlayTimerId !== null) {
        window.clearTimeout(state.autoPlayTimerId);
        state.autoPlayTimerId = null;
    }
    cancelBotSelections();
}
