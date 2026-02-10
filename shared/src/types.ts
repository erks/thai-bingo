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
