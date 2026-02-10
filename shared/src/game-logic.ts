import type { Cell } from "./types.js";
import { CONSONANTS, VOWELS } from "./game-data.js";
import { shuffle } from "./utils.js";

/** Number of non-free cells on a 5×5 board. */
export const BOARD_SIZE = 24;

/** Extra characters beyond BOARD_SIZE included in the game pool. */
export const EXTRA_POOL_CHARS = 18;

export function buildGamePool(mode: string): string[] {
  let fullPool: string[];
  if (mode === "consonants") fullPool = [...CONSONANTS];
  else if (mode === "vowels") fullPool = [...VOWELS];
  else fullPool = [...CONSONANTS, ...VOWELS];

  const poolSize = Math.min(BOARD_SIZE + EXTRA_POOL_CHARS, fullPool.length);
  return shuffle(fullPool).slice(0, poolSize);
}

export function generateBoard(pool: string[]): Cell[][] {
  const picked = shuffle(pool).slice(0, 24);
  const board: Cell[][] = [];
  let idx = 0;
  for (let r = 0; r < 5; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < 5; c++) {
      if (r === 2 && c === 2) {
        row.push({ char: '⭐', marked: true, free: true });
      } else {
        row.push({ char: picked[idx++], marked: false, free: false });
      }
    }
    board.push(row);
  }
  return board;
}

export function checkWin(board: Cell[][]): [number, number][] | null {
  for (let r = 0; r < 5; r++) {
    if (board[r].every(cell => cell.marked)) {
      return board[r].map((_, c) => [r, c] as [number, number]);
    }
  }
  for (let c = 0; c < 5; c++) {
    if (board.every(row => row[c].marked)) {
      return board.map((_, r) => [r, c] as [number, number]);
    }
  }
  if ([0,1,2,3,4].every(i => board[i][i].marked)) {
    return [0,1,2,3,4].map(i => [i, i] as [number, number]);
  }
  if ([0,1,2,3,4].every(i => board[i][4-i].marked)) {
    return [0,1,2,3,4].map(i => [i, 4-i] as [number, number]);
  }
  return null;
}
