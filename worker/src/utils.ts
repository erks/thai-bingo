// ============================================================
// Thai Bingo — Worker Utility Functions
// ============================================================

import { CONFIG } from "./config";

// Re-export shared utility
export { shuffle } from "@thai-bingo/shared";

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
