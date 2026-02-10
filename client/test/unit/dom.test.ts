import { describe, it, expect, beforeEach } from "vitest";
import { $, show, hide, highlightWinLine } from "../../src/ui/dom";

describe("dom utilities", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test-el" class="hidden"></div>
      <div id="cell-0-1-2"></div>
      <div id="cell-0-1-3"></div>
    `;
  });

  it("$ returns element by id", () => {
    expect($("test-el")).toBe(document.getElementById("test-el"));
  });

  it("$ returns null for missing id", () => {
    expect($("nonexistent")).toBeNull();
  });

  it("show removes hidden class", () => {
    const el = $("test-el")!;
    expect(el.classList.contains("hidden")).toBe(true);
    show(el);
    expect(el.classList.contains("hidden")).toBe(false);
  });

  it("hide adds hidden class", () => {
    const el = $("test-el")!;
    show(el);
    hide(el);
    expect(el.classList.contains("hidden")).toBe(true);
  });

  it("highlightWinLine adds win-glow to cells", () => {
    highlightWinLine(0, [[1, 2], [1, 3]]);
    expect($("cell-0-1-2")!.classList.contains("win-glow")).toBe(true);
    expect($("cell-0-1-3")!.classList.contains("win-glow")).toBe(true);
  });
});
