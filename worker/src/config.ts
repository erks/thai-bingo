// ============================================================
// Thai Bingo — Server Configuration
// ============================================================
// All tunable parameters in one place. Durations are in
// milliseconds unless the name says otherwise.
// ============================================================

export const CONFIG = {
  // --- Room lifecycle ---

  /** Max time a room can exist before automatic cleanup. */
  roomMaxLifetimeMs: 2 * 60 * 60 * 1000, // 2 hours

  /** After a disconnect, wait this long before checking if the
   *  room is empty and eligible for cleanup. */
  disconnectCleanupDelayMs: 5 * 60 * 1000, // 5 minutes

  // --- Room codes ---

  /** Length of the generated room code. */
  roomCodeLength: 6,

  /** Characters used in room codes (ambiguous chars 0/O, 1/I removed). */
  roomCodeChars: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",

  // --- Players ---

  /** Minimum players required to start (when moderator is NOT playing). */
  minPlayersDefault: 2,

  /** Minimum players required to start (when moderator IS playing). */
  minPlayersModeratorPlaying: 1,
};
