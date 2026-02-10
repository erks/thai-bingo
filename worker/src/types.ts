// ============================================================
// Thai Bingo — Shared Types
// ============================================================

export interface Env {
  BINGO_ROOM: DurableObjectNamespace;
}

export interface Cell {
  char: string;
  marked: boolean;
  free: boolean;
}

export interface PlayerInfo {
  id: string;
  name: string;
  connected: boolean;
}

export interface PendingSelection {
  r: number;
  c: number;
}

export interface RoomState {
  code: string;
  moderatorId: string;
  moderatorName: string;
  moderatorPlaying: boolean;
  players: PlayerInfo[];
  mode: string;
  hintsOn: boolean;
  gamePool: string[];
  boards: Record<string, Cell[][]>;
  calledChars: string[];
  currentChar: string | null;
  pendingChar: string | null;
  pendingSelections: Record<string, PendingSelection>;
  pendingReadyIds: string[];
  phase: "lobby" | "playing";
  winners: string[];
  createdAt: number;
}

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "start"; moderatorPlaying?: boolean }
  | { type: "randomize" }
  | { type: "replay" }
  | { type: "reveal" }
  | { type: "select"; r: number; c: number }
  | { type: "mark"; r: number; c: number }
  | { type: "ready" };
