import { VOWELS } from "@thai-bingo/shared";
import { state } from "../state";
import { $ } from "./dom";
import { markCell } from "../game/marking";

export function isVowel(ch: string): boolean {
    return VOWELS.includes(ch);
}

export function renderGame(): void {
    const totalCount = $("total-count");
    if (totalCount) totalCount.textContent = String(state.gamePool.length);
    const drawCount = $("draw-count");
    if (drawCount) drawCount.textContent = String(state.calledChars.length);
    const currentChar = $("current-char");
    if (currentChar) currentChar.textContent = state.currentChar || "?";

    const display = $("caller-display");
    if (display) {
        if (state.currentChar) display.classList.add("has-char");
        else display.classList.remove("has-char");
    }

    renderCalledHistory();
    renderBoards();
}

export function renderCalledHistory(): void {
    const container = $("called-history");
    if (!container) return;
    container.innerHTML = "";
    state.calledChars.forEach(ch => {
        const chip = document.createElement("span");
        chip.className = "called-chip " + (isVowel(ch) ? "vowel" : "consonant");
        chip.textContent = ch;
        container.appendChild(chip);
    });
    container.scrollTop = container.scrollHeight;
}

export function renderBoards(): void {
    const container = $("boards-container");
    if (!container) return;
    container.innerHTML = "";

    const isOnline = state.gameType === "online";
    const hasOwnBoard = isOnline && state.myBoardId;
    const isPlayerView = isOnline && (state.role === "player" || (state.role === "moderator" && state.moderatorPlaying));

    if (isPlayerView) {
        container.className = "boards-container online-player";
    } else {
        container.className = "boards-container players-" + state.playerCount;
    }

    let secondaryRow: HTMLDivElement | null = null;
    if (isPlayerView && state.boards.length > 1) {
        secondaryRow = document.createElement("div");
        secondaryRow.className = "secondary-boards-row";
    }

    state.boards.forEach((board, pi) => {
        const isPrimary = isPlayerView && pi === 0;
        const isSecondary = isPlayerView && pi > 0;

        const card = document.createElement("div");
        card.className = "board-card p" + (pi % 4);
        if (isOnline && state._boardIdMap) card.dataset.playerId = state._boardIdMap[pi] || "";
        if (isPrimary) card.classList.add("primary");
        if (isSecondary) card.classList.add("secondary");

        const header = document.createElement("div");
        header.className = "board-header";
        header.textContent = state.players[pi] + (state.botPlayers[pi] ? " \uD83E\uDD16" : "");
        card.appendChild(header);

        const grid = document.createElement("div");
        grid.className = "board-grid";

        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const cell = board[r][c];
                const el = document.createElement("div");
                el.className = "cell";
                el.id = `cell-${pi}-${r}-${c}`;
                el.textContent = cell.char;

                if (cell.free) el.classList.add("free");
                if (cell.marked && !cell.free) el.classList.add("marked");

                const canClick = !state.botPlayers[pi] && (!isOnline || (hasOwnBoard && state._boardIdMap[pi] === state.myBoardId));
                if (!cell.free && !cell.marked && canClick) {
                    el.addEventListener("click", () => markCell(pi, r, c));
                }

                grid.appendChild(el);
            }
        }

        card.appendChild(grid);

        if (isSecondary && secondaryRow) {
            secondaryRow.appendChild(card);
        } else {
            container.appendChild(card);
        }
    });

    if (secondaryRow && secondaryRow.children.length > 0) {
        container.appendChild(secondaryRow);
    }

    updateHints();
}

export function updateHints(): void {
    if (!state.hintsOn) return;
    state.boards.forEach((board, pi) => {
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const cell = board[r][c];
                const el = $(`cell-${pi}-${r}-${c}`);
                if (!el) continue;
                if (!cell.marked && !cell.free && state.calledChars.includes(cell.char)) {
                    el.classList.add("hint-pulse");
                } else {
                    el.classList.remove("hint-pulse");
                }
            }
        }
    });
}
