import { describe, it, expect } from "vitest";
import { PLAYER_COLORS } from "../../src/config";
import { BOARD_SIZE, EXTRA_POOL_CHARS, buildGamePool, CONSONANTS, VOWELS } from "@thai-bingo/shared";

describe("config", () => {
  it("has 4 player colors", () => {
    expect(PLAYER_COLORS).toHaveLength(4);
  });
});

describe("buildGamePool", () => {
  it("pool size is BOARD_SIZE + EXTRA_POOL_CHARS, capped at available chars", () => {
    expect(buildGamePool("consonants")).toHaveLength(Math.min(BOARD_SIZE + EXTRA_POOL_CHARS, CONSONANTS.length));
    expect(buildGamePool("vowels")).toHaveLength(Math.min(BOARD_SIZE + EXTRA_POOL_CHARS, VOWELS.length));
    expect(buildGamePool("mixed")).toHaveLength(Math.min(BOARD_SIZE + EXTRA_POOL_CHARS, CONSONANTS.length + VOWELS.length));
  });

  it("uses all vowels in vowels mode (fewer than BOARD_SIZE + EXTRA_POOL_CHARS)", () => {
    expect(buildGamePool("vowels")).toHaveLength(VOWELS.length);
  });

  it("contains no duplicates", () => {
    for (const mode of ["consonants", "vowels", "mixed"]) {
      const pool = buildGamePool(mode);
      expect(new Set(pool).size).toBe(pool.length);
    }
  });
});
