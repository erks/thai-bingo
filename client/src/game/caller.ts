import { state } from "../state";
import { t } from "../i18n/i18n";
import { ensureAudio, sfxCall, sfxWrong } from "../audio/audio";
import { speakChar, stopCharVoiceover } from "../audio/speech";
import { $ } from "../ui/dom";
import { wsSend } from "../ws/connection";
import { renderCalledHistory, updateHints } from "../ui/boards";
import { confirmMark } from "./marking";
import { scheduleBotSelections, cancelBotSelections } from "./bot";

export function setVoiceStatus(text: string, type: string, i18nKey?: string): void {
    const el = $("voice-status");
    if (!el) return;
    el.textContent = text;
    el.className = "voice-status" + (type ? " " + type : "");
    if (i18nKey) el.dataset.statusKey = i18nKey;
}

export function randomizeChar(): void {
    if (!state.gameActive) return;
    ensureAudio();

    if (state.gameType === "online" && state.role === "moderator") {
        wsSend({ type: "randomize" });
        return;
    }

    const remaining = state.gamePool.filter(ch => !state.calledChars.includes(ch));
    if (remaining.length === 0) {
        setVoiceStatus(t("statusEmpty"), "error", "statusEmpty");
        const btn = $("random-btn") as HTMLButtonElement | null;
        if (btn) btn.disabled = true;
        return;
    }

    const char = remaining[Math.floor(Math.random() * remaining.length)];
    state.pendingChar = char;

    const charEl = $("current-char");
    const display = $("caller-display");
    if (charEl) charEl.textContent = "?";
    if (display) display.classList.remove("has-char");

    speakChar(char);

    const randomBtn = $("random-btn") as HTMLButtonElement | null;
    if (randomBtn) randomBtn.disabled = true;
    const replayBtn = $("replay-btn");
    if (replayBtn) replayBtn.classList.remove("hidden");
    const revealBtn = $("reveal-btn");
    if (revealBtn) revealBtn.classList.remove("hidden");
    setVoiceStatus(t("statusPending"), "", "statusPending");
    scheduleBotSelections();
}

export function replayChar(): void {
    if (state.gameType === "online" && state.role === "moderator" && state.pendingChar) {
        wsSend({ type: "replay" });
        speakChar(state.pendingChar);
        return;
    }
    if (state.pendingChar) speakChar(state.pendingChar);
}

export function revealChar(): void {
    if (!state.pendingChar) return;
    cancelBotSelections();

    if (state.gameType === "online" && state.role === "moderator") {
        stopCharVoiceover();
        wsSend({ type: "reveal" });
        return;
    }

    stopCharVoiceover();
    const char = state.pendingChar;
    state.pendingChar = null;
    const revealBtn = $("reveal-btn");
    if (revealBtn) revealBtn.classList.add("hidden");
    const replayBtn = $("replay-btn");
    if (replayBtn) replayBtn.classList.add("hidden");
    callCharacter(char);

    // Validate pending selections
    const selections = { ...state.pendingSelections };
    state.pendingSelections = {};

    for (const piStr in selections) {
        const pi = parseInt(piStr);
        const { r, c } = selections[pi];
        const cell = state.boards[pi][r][c];
        const el = $(`cell-${pi}-${r}-${c}`);
        if (cell.char === char) {
            confirmMark(pi, r, c);
        } else if (el) {
            el.classList.remove("selected");
            el.classList.add("wrong");
            sfxWrong();
            setTimeout(() => el.classList.remove("wrong"), 350);
        }
    }

    const remaining = state.gamePool.filter(ch => !state.calledChars.includes(ch));
    const randomBtn = $("random-btn") as HTMLButtonElement | null;
    if (remaining.length > 0) {
        if (randomBtn) randomBtn.disabled = false;
        setVoiceStatus(t("statusNext"), "success", "statusNext");
    } else {
        if (randomBtn) randomBtn.disabled = true;
        setVoiceStatus(t("statusEmpty"), "", "statusEmpty");
    }
}

export function callCharacter(char: string): void {
    if (!state.gameActive) return;
    if (state.calledChars.includes(char)) return;

    state.currentChar = char;
    state.calledChars.push(char);
    sfxCall();

    const display = $("caller-display");
    const charEl = $("current-char");
    if (charEl) charEl.textContent = char;
    if (display) {
        display.classList.remove("pop", "has-char");
        void display.offsetWidth;
        display.classList.add("pop", "has-char");
    }

    const drawCount = $("draw-count");
    if (drawCount) drawCount.textContent = String(state.calledChars.length);
    renderCalledHistory();
    updateHints();
}
