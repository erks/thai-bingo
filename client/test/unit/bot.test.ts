import { describe, it, expect } from "vitest";
import type { Cell } from "@thai-bingo/shared";

import { findCellForChar, botDelay, isAllBots } from "../../src/game/bot";

function makeCell(char: string, marked = false, free = false): Cell {
  return { char, marked, free };
}

function makeBoard(cells: Cell[][]): Cell[][] {
  return cells;
}

describe("findCellForChar", () => {
  it("finds matching unmarked cell", () => {
    const board = makeBoard([
      [makeCell("ก"), makeCell("ข"), makeCell("ค"), makeCell("ง"), makeCell("จ")],
      [makeCell("ฉ"), makeCell("ช"), makeCell("ซ"), makeCell("ฌ"), makeCell("ญ")],
      [makeCell("ฎ"), makeCell("ฏ"), makeCell("★", false, true), makeCell("ฑ"), makeCell("ฒ")],
      [makeCell("ณ"), makeCell("ด"), makeCell("ต"), makeCell("ถ"), makeCell("ท")],
      [makeCell("ธ"), makeCell("น"), makeCell("บ"), makeCell("ป"), makeCell("ผ")],
    ]);
    const result = findCellForChar(board, "ซ");
    expect(result).toEqual({ r: 1, c: 2 });
  });

  it("returns null when char not on board", () => {
    const board = makeBoard([
      [makeCell("ก"), makeCell("ข"), makeCell("ค"), makeCell("ง"), makeCell("จ")],
      [makeCell("ฉ"), makeCell("ช"), makeCell("ซ"), makeCell("ฌ"), makeCell("ญ")],
      [makeCell("ฎ"), makeCell("ฏ"), makeCell("★", false, true), makeCell("ฑ"), makeCell("ฒ")],
      [makeCell("ณ"), makeCell("ด"), makeCell("ต"), makeCell("ถ"), makeCell("ท")],
      [makeCell("ธ"), makeCell("น"), makeCell("บ"), makeCell("ป"), makeCell("ผ")],
    ]);
    expect(findCellForChar(board, "ฮ")).toBeNull();
  });

  it("skips already marked cells", () => {
    const board = makeBoard([
      [makeCell("ก", true), makeCell("ข"), makeCell("ค"), makeCell("ง"), makeCell("จ")],
      [makeCell("ฉ"), makeCell("ช"), makeCell("ซ"), makeCell("ฌ"), makeCell("ญ")],
      [makeCell("ฎ"), makeCell("ฏ"), makeCell("★", false, true), makeCell("ฑ"), makeCell("ฒ")],
      [makeCell("ณ"), makeCell("ด"), makeCell("ต"), makeCell("ถ"), makeCell("ท")],
      [makeCell("ธ"), makeCell("น"), makeCell("บ"), makeCell("ป"), makeCell("ผ")],
    ]);
    expect(findCellForChar(board, "ก")).toBeNull();
  });

  it("skips free cell", () => {
    const board = makeBoard([
      [makeCell("ก"), makeCell("ข"), makeCell("ค"), makeCell("ง"), makeCell("จ")],
      [makeCell("ฉ"), makeCell("ช"), makeCell("ซ"), makeCell("ฌ"), makeCell("ญ")],
      [makeCell("ฎ"), makeCell("ฏ"), makeCell("★", false, true), makeCell("ฑ"), makeCell("ฒ")],
      [makeCell("ณ"), makeCell("ด"), makeCell("ต"), makeCell("ถ"), makeCell("ท")],
      [makeCell("ธ"), makeCell("น"), makeCell("บ"), makeCell("ป"), makeCell("ผ")],
    ]);
    expect(findCellForChar(board, "★")).toBeNull();
  });
});

describe("botDelay", () => {
  it("returns value within default range", () => {
    for (let i = 0; i < 50; i++) {
      const d = botDelay();
      expect(d).toBeGreaterThanOrEqual(300);
      expect(d).toBeLessThanOrEqual(1500);
    }
  });

  it("returns value within custom range", () => {
    for (let i = 0; i < 50; i++) {
      const d = botDelay(100, 200);
      expect(d).toBeGreaterThanOrEqual(100);
      expect(d).toBeLessThanOrEqual(200);
    }
  });
});

describe("isAllBots", () => {
  it("returns true when all are bots", () => {
    expect(isAllBots([true, true, true])).toBe(true);
  });

  it("returns false when any is human", () => {
    expect(isAllBots([true, false, true])).toBe(false);
  });

  it("returns true for empty array", () => {
    expect(isAllBots([])).toBe(true);
  });

  it("returns false for single human", () => {
    expect(isAllBots([false])).toBe(false);
  });

  it("returns true for single bot", () => {
    expect(isAllBots([true])).toBe(true);
  });
});
