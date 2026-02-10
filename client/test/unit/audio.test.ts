import { describe, it, expect, vi, beforeEach } from "vitest";
import { CHAR_AUDIO_KEY } from "../../src/audio/speech";
import { CONSONANTS, VOWELS } from "@thai-bingo/shared";

describe("CHAR_AUDIO_KEY", () => {
  it("has an entry for every consonant", () => {
    for (const ch of CONSONANTS) {
      expect(CHAR_AUDIO_KEY, `missing key for consonant: ${ch}`).toHaveProperty(ch);
    }
  });

  it("has an entry for every vowel", () => {
    for (const ch of VOWELS) {
      expect(CHAR_AUDIO_KEY, `missing key for vowel: ${ch}`).toHaveProperty(ch);
    }
  });

  it("all audio keys are unique", () => {
    const values = Object.values(CHAR_AUDIO_KEY);
    expect(new Set(values).size).toBe(values.length);
  });
});
