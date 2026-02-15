// Thai Bingo — Client Entry Point

import { APP_VERSION } from "./config";

// Styles
import "../styles/base.css";
import "../styles/setup.css";
import "../styles/game.css";
import "../styles/lobby.css";
import "../styles/win.css";
import "../styles/responsive.css";

// Modules
import { state } from "./state";
import { cycleLang, applyLang } from "./i18n/i18n";
import { $ } from "./ui/dom";
import { startGame } from "./ui/setup";
import { copyShareLink, toggleModeratorPlaying, onlineStartGame } from "./ui/lobby";
import { randomizeChar, replayChar, revealChar } from "./game/caller";
import { continueAfterWin, resetGame, backToSetup } from "./game/win";
import { ensureAudio } from "./audio/audio";
import { warmupVoiceover } from "./audio/speech";
import { tryRestoreSession } from "./restore";

// ============================================================
// INIT
// ============================================================

// Legacy ?room=CODE links → redirect to /rooms/CODE
const urlRoom = new URLSearchParams(location.search).get("room");
if (urlRoom) {
  history.replaceState(null, "", "/rooms/" + urlRoom.toUpperCase());
}

// Pre-set join state from URL path so initSetup() renders the online join form
const roomMatch = location.pathname.match(/^\/rooms\/([A-Z0-9]{4,8})$/i);
if (roomMatch && roomMatch[1].toLowerCase() !== "local") {
  state.gameType = "online";
  state.onlineRole = "join";
  state.roomCode = roomMatch[1].toUpperCase();
}

// Wire up event listeners (replacing inline onclick)
$("setup-lang-toggle")!.addEventListener("click", cycleLang);
$("game-lang-toggle")!.addEventListener("click", cycleLang);
$("start-game-btn")!.addEventListener("click", () => startGame());
$("random-btn")!.addEventListener("click", randomizeChar);
$("replay-btn")!.addEventListener("click", replayChar);
$("reveal-btn")!.addEventListener("click", revealChar);
$("back-to-setup-btn")!.addEventListener("click", backToSetup);
$("new-game-btn")!.addEventListener("click", resetGame);
$("continue-btn")!.addEventListener("click", continueAfterWin);
$("win-new-game-btn")!.addEventListener("click", resetGame);
$("copy-link-btn")!.addEventListener("click", copyShareLink);
$("moderator-play-toggle")!.addEventListener("click", (e) => toggleModeratorPlaying(e));
$("lobby-start-btn")!.addEventListener("click", onlineStartGame);

// Version info
const versionTag = APP_VERSION.startsWith('v') ? APP_VERSION : `v${APP_VERSION}`;
console.log(`[thai-bingo] client ${versionTag}`);
document.querySelector('meta[name="app-version"]')?.setAttribute('content', APP_VERSION);
document.querySelectorAll('[data-version-footer]').forEach(el => {
    el.textContent = `\u00A9 Thai Bingo ${versionTag}`;
});

// Apply language and render setup
applyLang();

// Restore session from URL (must run after applyLang so i18n is ready)
tryRestoreSession();

// Handle browser back/forward navigation
window.addEventListener("popstate", () => {
  if (location.pathname === "/" || location.pathname === "") {
    // Remember the room path so we can restore it if user cancels
    const roomPath = state.roomCode
      ? "/rooms/" + state.roomCode
      : state.gameType === "local" && state.boards.length > 0
        ? "/rooms/local"
        : null;
    backToSetup();
    // If backToSetup was cancelled (online confirm dialog), restore the URL
    if (roomPath && state.roomCode) {
      history.pushState(null, "", roomPath);
    }
  }
});

// Unlock audio on first user interaction (required for mobile browsers).
// Mobile Safari and Chrome require a user gesture to "bless" audio playback.
// Once blessed, the AudioContext and the reusable HTMLAudioElement can play
// from non-gesture contexts (e.g. WebSocket message handlers).
function unlockAudio(): void {
    ensureAudio();
    warmupVoiceover();
    document.removeEventListener("click", unlockAudio, true);
    document.removeEventListener("touchstart", unlockAudio, true);
}
document.addEventListener("click", unlockAudio, { capture: true });
document.addEventListener("touchstart", unlockAudio, { capture: true });
