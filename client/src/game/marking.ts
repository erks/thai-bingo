import { VOWELS } from "@thai-bingo/shared";
import { checkWin } from "@thai-bingo/shared";
import { state } from "../state";
import { ensureAudio, sfxMark, sfxWrong } from "../audio/audio";
import { $ } from "../ui/dom";
import { wsSend } from "../ws/connection";
import { highlightWinLine } from "../ui/dom";
import { showWin } from "./win";

export function markCell(pi: number, r: number, c: number): void {
    if (!state.gameActive) return;
    ensureAudio();

    const cell = state.boards[pi][r][c];
    if (cell.marked || cell.free) return;

    // Online mode: only allow marking own board
    if (state.gameType === "online") {
        const boardPlayerId = state._boardIdMap[pi];
        if (boardPlayerId !== state.myBoardId) return;

        if (state.pendingChar) {
            const prev = state.pendingSelections[pi];
            if (prev) {
                const prevEl = $(`cell-${pi}-${prev.r}-${prev.c}`);
                if (prevEl) prevEl.classList.remove("selected");
            }
            if (prev && prev.r === r && prev.c === c) {
                delete state.pendingSelections[pi];
                wsSend({ type: "select", r, c });
            } else {
                state.pendingSelections[pi] = { r, c };
                const el = $(`cell-${pi}-${r}-${c}`);
                if (el) el.classList.add("selected");
                sfxMark();
                wsSend({ type: "select", r, c });
            }
            return;
        }

        if (state.calledChars.includes(cell.char)) {
            wsSend({ type: "mark", r, c });
        } else {
            sfxWrong();
            const el = $(`cell-${pi}-${r}-${c}`);
            if (el) {
                el.classList.add("wrong");
                setTimeout(() => el.classList.remove("wrong"), 350);
            }
        }
        return;
    }

    // Local mode
    if (state.pendingChar) {
        const prev = state.pendingSelections[pi];
        if (prev) {
            const prevEl = $(`cell-${prev.pi ?? pi}-${prev.r}-${prev.c}`);
            if (prevEl) prevEl.classList.remove("selected");
        }
        if (prev && prev.r === r && prev.c === c) {
            delete state.pendingSelections[pi];
        } else {
            state.pendingSelections[pi] = { pi, r, c };
            const el = $(`cell-${pi}-${r}-${c}`);
            if (el) el.classList.add("selected");
            sfxMark();
        }
        return;
    }

    if (!state.calledChars.includes(cell.char)) {
        sfxWrong();
        const el = $(`cell-${pi}-${r}-${c}`);
        if (el) {
            el.classList.add("wrong");
            setTimeout(() => el.classList.remove("wrong"), 350);
        }
        return;
    }

    confirmMark(pi, r, c);
}

export function confirmMark(pi: number, r: number, c: number): void {
    const cell = state.boards[pi][r][c];
    cell.marked = true;
    sfxMark();

    const el = $(`cell-${pi}-${r}-${c}`);
    if (el) {
        el.classList.remove("selected", "hint-pulse");
        el.classList.add("marked", "mark-anim");
        el.onclick = null;
        setTimeout(() => el.classList.remove("mark-anim"), 400);
    }

    const winLine = checkWin(state.boards[pi]);
    if (winLine && !state.winners.includes(pi)) {
        state.winners.push(pi);
        highlightWinLine(pi, winLine);
        setTimeout(() => showWin(pi), 500);
    }
}
