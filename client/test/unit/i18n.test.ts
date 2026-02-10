import { describe, it, expect } from "vitest";
import { STRINGS, LANGS, LANG_LABELS } from "../../src/i18n/strings";

describe("i18n strings", () => {
  it("has all configured languages", () => {
    for (const lang of LANGS) {
      expect(STRINGS).toHaveProperty(lang);
    }
  });

  it("all languages have the same set of keys", () => {
    const refKeys = Object.keys(STRINGS.th).sort();
    for (const lang of LANGS) {
      const keys = Object.keys(STRINGS[lang]).sort();
      expect(keys).toEqual(refKeys);
    }
  });

  it("no values are empty strings", () => {
    for (const lang of LANGS) {
      for (const [key, val] of Object.entries(STRINGS[lang])) {
        expect(val, `${lang}.${key} is empty`).not.toBe("");
      }
    }
  });

  it("LANG_LABELS has an entry for each language", () => {
    for (const lang of LANGS) {
      expect(LANG_LABELS).toHaveProperty(lang);
    }
  });
});
