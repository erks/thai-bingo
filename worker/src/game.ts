// ============================================================
// Thai Bingo — Game Logic (pure functions)
// ============================================================

import { CONFIG } from "./config";
import type { Cell } from "./types";
import { shuffle } from "./utils";

// ---------- Data (mirrored from client) ----------

export const CONSONANTS = [
  'ก','ข','ค','ฆ','ง','จ','ฉ','ช','ซ','ฌ','ญ','ฎ','ฏ',
  'ฐ','ฑ','ฒ','ณ','ด','ต','ถ','ท','ธ','น','บ','ป','ผ','ฝ','พ',
  'ฟ','ภ','ม','ย','ร','ล','ว','ศ','ษ','ส','ห','ฬ','อ','ฮ'
];

export const VOWELS = [
  '-ะ','-า','-ิ','-ี','-ึ','-ื','-ุ','-ู',
  'เ-','เ-ะ','แ-','แ-ะ','โ-','โ-ะ',
  'เ-าะ','-อ','เ-อ','เ-ีย','เ-ือ','-ัว',
  'ใ-','ไ-','-ำ','เ-า'
];

// ---------- Board generation ----------

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

// ---------- Win detection ----------

export function checkWin(board: Cell[][]): [number, number][] | null {
  // Rows
  for (let r = 0; r < 5; r++) {
    if (board[r].every(cell => cell.marked)) {
      return board[r].map((_, c) => [r, c] as [number, number]);
    }
  }
  // Columns
  for (let c = 0; c < 5; c++) {
    if (board.every(row => row[c].marked)) {
      return board.map((_, r) => [r, c] as [number, number]);
    }
  }
  // Diagonals
  if ([0,1,2,3,4].every(i => board[i][i].marked)) {
    return [0,1,2,3,4].map(i => [i, i] as [number, number]);
  }
  if ([0,1,2,3,4].every(i => board[i][4-i].marked)) {
    return [0,1,2,3,4].map(i => [i, 4-i] as [number, number]);
  }
  return null;
}

// ---------- Pool builder ----------

export function buildGamePool(mode: string): string[] {
  let fullPool: string[];
  if (mode === "consonants") fullPool = [...CONSONANTS];
  else if (mode === "vowels") fullPool = [...VOWELS];
  else fullPool = [...CONSONANTS, ...VOWELS];

  const poolSize = Math.min(CONFIG.gamePoolSizes[mode] || CONFIG.gamePoolSizeFallback, fullPool.length);
  return shuffle(fullPool).slice(0, poolSize);
}
