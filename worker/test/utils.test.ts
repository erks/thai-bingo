import { describe, it, expect } from "vitest";
import { shuffle, generateCode, generateId } from "../src/utils";

describe("shuffle", () => {
  it("returns same elements", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);
    expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("does not mutate the original array", () => {
    const arr = [1, 2, 3, 4, 5];
    const copy = [...arr];
    shuffle(arr);
    expect(arr).toEqual(copy);
  });

  it("returns a new array reference", () => {
    const arr = [1, 2, 3];
    const result = shuffle(arr);
    expect(result).not.toBe(arr);
  });

  it("produces different orderings over many runs", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = new Set<string>();
    for (let i = 0; i < 50; i++) {
      results.add(shuffle(arr).join(","));
    }
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("generateCode", () => {
  it("returns a 6-character string", () => {
    const code = generateCode();
    expect(code).toHaveLength(6);
  });

  it("only contains valid characters", () => {
    const valid = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let i = 0; i < 20; i++) {
      const code = generateCode();
      for (const ch of code) {
        expect(valid).toContain(ch);
      }
    }
  });
});

describe("generateId", () => {
  it("returns an 8-character alphanumeric string", () => {
    const id = generateId();
    expect(id).toHaveLength(8);
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });
});
