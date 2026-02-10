// Thai Bingo — Client Entry Point

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

// Apply language and render setup
applyLang();
