import { STRINGS, LANGS, LANG_LABELS } from "./strings";
import type { StringKey } from "./strings";
import { state } from "../state";
import { initSetup } from "../ui/setup";
import { showLobby } from "../ui/lobby";
import { renderOnlineStatusBanner } from "../ui/online-ui";

export function t(key: StringKey): string {
    return STRINGS[state.lang][key];
}

export function cycleLang(): void {
    const i = LANGS.indexOf(state.lang);
    setLang(LANGS[(i + 1) % LANGS.length]);
}

export function setLang(lang: string): void {
    state.lang = lang;
    localStorage.setItem("lang", lang);
    applyLang();
}

export function applyLang(): void {
    document.querySelectorAll<HTMLElement>("[data-i18n]").forEach(el => {
        const key = el.dataset.i18n as StringKey;
        el.textContent = t(key);
    });
    initSetup();
    const nextLang = LANGS[(LANGS.indexOf(state.lang) + 1) % LANGS.length];
    document.querySelectorAll<HTMLElement>(".lang-toggle").forEach(btn => {
        btn.textContent = LANG_LABELS[nextLang];
    });
    const vs = document.getElementById("voice-status") as HTMLElement | null;
    if (vs && vs.dataset.statusKey) {
        vs.textContent = t(vs.dataset.statusKey as StringKey);
    }
    const lobbyScreen = document.getElementById("lobby-screen");
    if (lobbyScreen && !lobbyScreen.classList.contains("hidden")) {
        showLobby();
    }
    if (state.gameType === "online" && state.onlinePhase === "playing") {
        renderOnlineStatusBanner();
    }
}
