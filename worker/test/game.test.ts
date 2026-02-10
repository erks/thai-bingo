import { describe, it, expect } from "vitest";
import { CONSONANTS, VOWELS, BOARD_SIZE, EXTRA_POOL_CHARS, generateBoard, checkWin, buildGamePool } from "../src/game";

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

describe("generateBoard", () => {
  const pool = CONSONANTS.slice(0, 30);

  it("returns a 5×5 grid", () => {
    const board = generateBoard(pool);
    expect(board).toHaveLength(5);
    for (const row of board) {
      expect(row).toHaveLength(5);
    }
  });

  it("has a free star in the center", () => {
    const board = generateBoard(pool);
    const center = board[2][2];
    expect(center.char).toBe("⭐");
    expect(center.marked).toBe(true);
    expect(center.free).toBe(true);
  });

  it("has 24 unique non-free characters", () => {
    const board = generateBoard(pool);
    const chars: string[] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!(r === 2 && c === 2)) {
          chars.push(board[r][c].char);
          expect(board[r][c].marked).toBe(false);
          expect(board[r][c].free).toBe(false);
        }
      }
    }
    expect(chars).toHaveLength(24);
    expect(new Set(chars).size).toBe(24);
  });

  it("only uses characters from the pool", () => {
    const board = generateBoard(pool);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!(r === 2 && c === 2)) {
          expect(pool).toContain(board[r][c].char);
        }
      }
    }
  });
});

describe("checkWin", () => {
  function makeBoard(): ReturnType<typeof generateBoard> {
    // All unmarked except the free center
    const board = [];
    for (let r = 0; r < 5; r++) {
      const row = [];
      for (let c = 0; c < 5; c++) {
        if (r === 2 && c === 2) {
          row.push({ char: "⭐", marked: true, free: true });
        } else {
          row.push({ char: `${r}${c}`, marked: false, free: false });
        }
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
    const result = checkWin(board);
    expect(result).toEqual([[0,0],[0,1],[0,2],[0,3],[0,4]]);
  });

  it("detects a column win", () => {
    const board = makeBoard();
    for (let r = 0; r < 5; r++) board[r][3].marked = true;
    const result = checkWin(board);
    expect(result).toEqual([[0,3],[1,3],[2,3],[3,3],[4,3]]);
  });

  it("detects main diagonal win", () => {
    const board = makeBoard();
    for (let i = 0; i < 5; i++) board[i][i].marked = true;
    const result = checkWin(board);
    expect(result).toEqual([[0,0],[1,1],[2,2],[3,3],[4,4]]);
  });

  it("detects anti-diagonal win", () => {
    const board = makeBoard();
    for (let i = 0; i < 5; i++) board[i][4-i].marked = true;
    const result = checkWin(board);
    expect(result).toEqual([[0,4],[1,3],[2,2],[3,1],[4,0]]);
  });

  it("does not detect win with partial marks", () => {
    const board = makeBoard();
    // Mark 4 of 5 in row 1
    for (let c = 0; c < 4; c++) board[1][c].marked = true;
    expect(checkWin(board)).toBeNull();
  });

  it("row wins take priority over diagonal", () => {
    // Row 2 includes center (already marked), mark the rest
    const board = makeBoard();
    for (let c = 0; c < 5; c++) board[2][c].marked = true;
    // Also mark diagonal
    for (let i = 0; i < 5; i++) board[i][i].marked = true;
    // Row check comes first
    const result = checkWin(board);
    expect(result).toEqual([[2,0],[2,1],[2,2],[2,3],[2,4]]);
  });
});

describe("buildGamePool", () => {
  const expectedSize = (available: number) => Math.min(BOARD_SIZE + EXTRA_POOL_CHARS, available);

  it("returns correct size for consonants mode", () => {
    const pool = buildGamePool("consonants");
    expect(pool).toHaveLength(expectedSize(CONSONANTS.length));
    for (const ch of pool) {
      expect(CONSONANTS).toContain(ch);
    }
  });

  it("returns correct size for vowels mode", () => {
    const pool = buildGamePool("vowels");
    expect(pool).toHaveLength(expectedSize(VOWELS.length));
    for (const ch of pool) {
      expect(VOWELS).toContain(ch);
    }
  });

  it("returns correct size for mixed mode", () => {
    const pool = buildGamePool("mixed");
    expect(pool).toHaveLength(expectedSize(CONSONANTS.length + VOWELS.length));
    const allChars = [...CONSONANTS, ...VOWELS];
    for (const ch of pool) {
      expect(allChars).toContain(ch);
    }
  });

  it("contains no duplicates", () => {
    const pool = buildGamePool("consonants");
    expect(new Set(pool).size).toBe(pool.length);
  });

  it("uses mixed pool for unknown mode", () => {
    const pool = buildGamePool("unknown");
    expect(pool).toHaveLength(expectedSize(CONSONANTS.length + VOWELS.length));
  });
});
