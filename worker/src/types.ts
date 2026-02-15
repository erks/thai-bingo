// ============================================================
// Thai Bingo — Worker Types
// ============================================================

// Re-export shared types
export type { Cell, PlayerInfo, PendingSelection } from "@thai-bingo/shared";

export interface Env {
  BINGO_ROOM: DurableObjectNamespace;
}

export interface RoomState {
  code: string;
  moderatorId: string;
  moderatorName: string;
  moderatorPlaying: boolean;
  players: import("@thai-bingo/shared").PlayerInfo[];
  mode: string;
  hintsOn: boolean;
  gamePool: string[];
  boards: Record<string, import("@thai-bingo/shared").Cell[][]>;
  calledChars: string[];
  currentChar: string | null;
  pendingChar: string | null;
  pendingSelections: Record<string, import("@thai-bingo/shared").PendingSelection>;
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
  | { type: "ready" }
  | { type: "sync" }
  | { type: "close_room" };
