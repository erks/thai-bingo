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

// ============================================================
// INIT
// ============================================================

// Auto-switch to online join mode if ?room= is in URL
const urlRoom = new URLSearchParams(location.search).get("room");
if (urlRoom) {
  state.gameType = "online";
  state.onlineRole = "join";
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
console.log(`[thai-bingo] client v${APP_VERSION}`);
document.querySelector('meta[name="app-version"]')?.setAttribute('content', APP_VERSION);
const vf = document.getElementById('version-footer');
if (vf) vf.textContent = `v${APP_VERSION}`;

// Apply language and render setup
applyLang();

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
