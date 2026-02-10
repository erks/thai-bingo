// ============================================================
// Thai Bingo — Utility Functions
// ============================================================

import { CONFIG } from "./config";

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateCode(): string {
  const chars = CONFIG.roomCodeChars;
  let code = "";
  for (let i = 0; i < CONFIG.roomCodeLength; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
