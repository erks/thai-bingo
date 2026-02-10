import { describe, it, expect } from "vitest";
import { CONSONANTS, VOWELS, shuffle, generateBoard, checkWin } from "@thai-bingo/shared";

describe("CONSONANTS", () => {
  it("has 42 entries", () => {
    expect(CONSONANTS).toHaveLength(42);
  });

  it("contains no duplicates", () => {
    expect(new Set(CONSONANTS).size).toBe(CONSONANTS.length);
  });
});

describe("VOWELS", () => {
  it("has 31 entries", () => {
    expect(VOWELS).toHaveLength(31);
  });

  it("contains no duplicates", () => {
    expect(new Set(VOWELS).size).toBe(VOWELS.length);
  });
});

describe("shuffle", () => {
  it("returns same elements", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffle(arr).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("does not mutate original", () => {
    const arr = [1, 2, 3];
    const copy = [...arr];
    shuffle(arr);
    expect(arr).toEqual(copy);
  });
});

describe("generateBoard", () => {
  const pool = CONSONANTS.slice(0, 30);

  it("returns a 5x5 grid", () => {
    const board = generateBoard(pool);
    expect(board).toHaveLength(5);
    for (const row of board) expect(row).toHaveLength(5);
  });

  it("has a free star in the center", () => {
    const center = generateBoard(pool)[2][2];
    expect(center).toEqual({ char: "⭐", marked: true, free: true });
  });

  it("has 24 unique non-free characters from the pool", () => {
    const board = generateBoard(pool);
    const chars: string[] = [];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        if (!(r === 2 && c === 2)) {
          chars.push(board[r][c].char);
          expect(board[r][c].marked).toBe(false);
          expect(pool).toContain(board[r][c].char);
        }
    expect(new Set(chars).size).toBe(24);
  });
});

describe("checkWin", () => {
  function makeBoard() {
    const board = [];
    for (let r = 0; r < 5; r++) {
      const row = [];
      for (let c = 0; c < 5; c++) {
        if (r === 2 && c === 2) row.push({ char: "⭐", marked: true, free: true });
        else row.push({ char: `${r}${c}`, marked: false, free: false });
      }
      board.push(row);
    }
    return board;
  }

  it("returns null when no win", () => {
    expect(checkWin(makeBoard())).toBeNull();
  });

  it("detects a row win", () => {
    const board = makeBoard();
    for (let c = 0; c < 5; c++) board[0][c].marked = true;
    expect(checkWin(board)).toEqual([[0,0],[0,1],[0,2],[0,3],[0,4]]);
  });

  it("detects a column win", () => {
    const board = makeBoard();
    for (let r = 0; r < 5; r++) board[r][1].marked = true;
    expect(checkWin(board)).toEqual([[0,1],[1,1],[2,1],[3,1],[4,1]]);
  });

  it("detects main diagonal win", () => {
    const board = makeBoard();
    for (let i = 0; i < 5; i++) board[i][i].marked = true;
    expect(checkWin(board)).toEqual([[0,0],[1,1],[2,2],[3,3],[4,4]]);
  });

  it("detects anti-diagonal win", () => {
    const board = makeBoard();
    for (let i = 0; i < 5; i++) board[i][4-i].marked = true;
    expect(checkWin(board)).toEqual([[0,4],[1,3],[2,2],[3,1],[4,0]]);
  });

  it("does not detect win with partial row", () => {
    const board = makeBoard();
    for (let c = 0; c < 4; c++) board[1][c].marked = true;
    expect(checkWin(board)).toBeNull();
  });
});
