import { describe, it, expect } from "vitest";
import { NAME_POOLS, generateRandomName } from "../../src/game/names";
import { LANGS } from "../../src/i18n/strings";

describe("NAME_POOLS", () => {
  for (const lang of LANGS) {
    it(`${lang} has ≥100 adjectives`, () => {
      expect(NAME_POOLS[lang].adjectives.length).toBeGreaterThanOrEqual(100);
    });

    it(`${lang} has ≥100 animals`, () => {
      expect(NAME_POOLS[lang].animals.length).toBeGreaterThanOrEqual(100);
    });

    it(`${lang} has no empty strings`, () => {
      for (const adj of NAME_POOLS[lang].adjectives) {
        expect(adj).not.toBe("");
      }
      for (const animal of NAME_POOLS[lang].animals) {
        expect(animal).not.toBe("");
      }
    });

    it(`${lang} has no duplicate adjectives`, () => {
      const set = new Set(NAME_POOLS[lang].adjectives);
      expect(set.size).toBe(NAME_POOLS[lang].adjectives.length);
    });

    it(`${lang} has no duplicate animals`, () => {
      const set = new Set(NAME_POOLS[lang].animals);
      expect(set.size).toBe(NAME_POOLS[lang].animals.length);
    });
  }
});

describe("generateRandomName", () => {
  it("returns a non-empty string for each language", () => {
    for (const lang of LANGS) {
      const name = generateRandomName(lang);
      expect(name).toBeTruthy();
      expect(typeof name).toBe("string");
    }
  });

  it("produces varied results over 10 calls", () => {
    const names = new Set<string>();
    for (let i = 0; i < 10; i++) {
      names.add(generateRandomName("en"));
    }
    expect(names.size).toBeGreaterThan(1);
  });

  it("falls back to English for unknown language", () => {
    const name = generateRandomName("zz");
    expect(name).toBeTruthy();
    // Should be a valid English name (space-separated)
    expect(name).toContain(" ");
  });

  it("English names contain a space", () => {
    const name = generateRandomName("en");
    expect(name).toContain(" ");
  });

  it("Thai names do not contain a space", () => {
    const name = generateRandomName("th");
    expect(name).not.toContain(" ");
  });

  it("Thai names use noun-adjective order (animal first)", () => {
    // Run enough times to confirm pattern
    for (let i = 0; i < 20; i++) {
      const name = generateRandomName("th");
      const startsWithAnimal = NAME_POOLS.th.animals.some(a => name.startsWith(a));
      expect(startsWithAnimal, `"${name}" should start with an animal`).toBe(true);
    }
  });

  it("Japanese names do not contain a space", () => {
    const name = generateRandomName("ja");
    expect(name).not.toContain(" ");
  });
});
