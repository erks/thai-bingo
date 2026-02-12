import { buildGamePool, generateBoard } from "@thai-bingo/shared";
import { state } from "../state";
import { t } from "../i18n/i18n";
import { PLAYER_COLORS } from "../config";
import { ensureAudio } from "../audio/audio";
import { $ } from "./dom";
import { renderGame } from "./boards";
import { setVoiceStatus } from "../game/caller";
import { isAllBots, startAutoPlay } from "../game/bot";
import { generateRandomName } from "../game/names";

export function initSetup(): void {
    // --- Game type toggle ---
    let gtContainer = $("game-type-btns");
    if (!gtContainer) {
        const section = document.createElement("div");
        section.className = "setup-section";
        section.id = "game-type-section";
        const label = document.createElement("label");
        label.setAttribute("data-i18n", "gameType");
        label.textContent = t("gameType");
        section.appendChild(label);
        gtContainer = document.createElement("div");
        gtContainer.className = "btn-group";
        gtContainer.id = "game-type-btns";
        section.appendChild(gtContainer);
        const setupContainer = document.querySelector(".setup-container");
        if (setupContainer) {
            setupContainer.insertBefore(section, setupContainer.querySelector(".setup-section"));
        }
    }
    gtContainer.innerHTML = "";
    ([
        { key: "local" as const, i18n: "gameTypeLocal" as const },
        { key: "online" as const, i18n: "gameTypeOnline" as const },
    ]).forEach(g => {
        const btn = document.createElement("button");
        btn.textContent = t(g.i18n);
        btn.className = g.key === state.gameType ? "active" : "";
        btn.addEventListener("click", () => { state.gameType = g.key; initSetup(); });
        gtContainer!.appendChild(btn);
    });

    // --- Show/hide sections based on game type ---
    const localSections = ["player-count-btns", "name-inputs"].map(id => $(id)?.closest(".setup-section"));
    const startBtn = document.querySelector(".setup-container .start-button") as HTMLButtonElement | null;

    const oldOnline = $("online-setup-section");
    if (oldOnline) oldOnline.remove();

    if (state.gameType === "local") {
        localSections.forEach(s => { if (s) s.classList.remove("hidden"); });
        if (startBtn) {
            startBtn.classList.remove("hidden");
            startBtn.textContent = t("startGame");
        }
    } else {
        localSections.forEach(s => { if (s) s.classList.add("hidden"); });
        if (startBtn) startBtn.classList.add("hidden");
        renderOnlineSetup();
    }

    // --- Player count (local only) ---
    const pcContainer = $("player-count-btns");
    if (pcContainer) {
        pcContainer.innerHTML = "";
        [1, 2, 3, 4].forEach(n => {
            const btn = document.createElement("button");
            btn.textContent = n + " " + (n === 1 ? t("playerUnitSingular") : t("playerUnit"));
            btn.className = n === state.playerCount ? "active" : "";
            btn.addEventListener("click", () => {
                state.playerCount = n;
                // Resize botPlayers to match new player count
                while (state.botPlayers.length < n) state.botPlayers.push(false);
                state.botPlayers.length = n;
                initSetup();
            });
            pcContainer.appendChild(btn);
        });
    }

    // --- Name inputs (local only) ---
    const nameContainer = $("name-inputs");
    if (nameContainer) {
        nameContainer.innerHTML = "";
        // Ensure botPlayers array is sized correctly
        while (state.botPlayers.length < state.playerCount) state.botPlayers.push(false);
        state.botPlayers.length = state.playerCount;

        // Ensure players array is sized correctly
        while (state.players.length < state.playerCount) state.players.push("");
        state.players.length = state.playerCount;

        for (let i = 0; i < state.playerCount; i++) {
            const row = document.createElement("div");
            row.className = "name-input-row";
            const dot = document.createElement("div");
            dot.className = "color-dot";
            dot.style.background = PLAYER_COLORS[i];
            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = t("defaultPlayer") + " " + (i + 1);
            input.id = "name-" + i;

            const isBot = state.botPlayers[i];
            if (isBot) {
                input.value = state.players[i] || generateRandomName(state.lang);
                state.players[i] = input.value;
                input.disabled = true;
                input.classList.add("bot-input");
            } else if (state.players[i]) {
                input.value = state.players[i];
            }

            input.addEventListener("input", () => {
                state.players[i] = input.value;
            });

            const diceBtn = document.createElement("button");
            diceBtn.type = "button";
            diceBtn.className = "name-randomize";
            diceBtn.textContent = "\uD83C\uDFB2";
            diceBtn.title = t("randomName");
            diceBtn.addEventListener("click", () => {
                const name = generateRandomName(state.lang);
                input.value = name;
                state.players[i] = name;
            });

            const botBtn = document.createElement("button");
            botBtn.type = "button";
            botBtn.className = "bot-toggle" + (isBot ? " active" : "");
            botBtn.textContent = "\uD83E\uDD16";
            botBtn.title = t("botToggle");
            botBtn.addEventListener("click", () => {
                state.botPlayers[i] = !state.botPlayers[i];
                if (state.botPlayers[i]) {
                    state.players[i] = generateRandomName(state.lang);
                } else {
                    state.players[i] = "";
                }
                initSetup();
            });

            row.appendChild(dot);
            row.appendChild(input);
            row.appendChild(diceBtn);
            row.appendChild(botBtn);
            nameContainer.appendChild(row);
        }
    }

    // --- Mode buttons ---
    const modeContainer = $("mode-btns");
    if (modeContainer) {
        modeContainer.innerHTML = "";
        ([
            { key: "consonants", i18n: "modeConsonants" as const },
            { key: "vowels", i18n: "modeVowels" as const },
            { key: "mixed", i18n: "modeMixed" as const },
        ]).forEach(m => {
            const btn = document.createElement("button");
            btn.textContent = t(m.i18n);
            btn.className = m.key === state.mode ? "active" : "";
            btn.addEventListener("click", () => { state.mode = m.key; initSetup(); });
            modeContainer.appendChild(btn);
        });
    }
}

export function renderOnlineSetup(): void {
    const container = document.querySelector(".setup-container");
    if (!container) return;
    const section = document.createElement("div");
    section.id = "online-setup-section";

    // Role toggle: Create / Join
    const roleSection = document.createElement("div");
    roleSection.className = "setup-section";
    const roleLabel = document.createElement("label");
    roleLabel.textContent = t("onlineRole");
    roleSection.appendChild(roleLabel);
    const roleGroup = document.createElement("div");
    roleGroup.className = "btn-group";
    ([
        { key: "create" as const, i18n: "createRoom" as const },
        { key: "join" as const, i18n: "joinRoom" as const },
    ]).forEach(r => {
        const btn = document.createElement("button");
        btn.textContent = t(r.i18n);
        btn.className = r.key === state.onlineRole ? "active" : "";
        btn.addEventListener("click", () => { state.onlineRole = r.key; initSetup(); });
        roleGroup.appendChild(btn);
    });
    roleSection.appendChild(roleGroup);
    section.appendChild(roleSection);

    if (state.onlineRole === "create") {
        const nameDiv = document.createElement("div");
        nameDiv.className = "online-setup-section";
        const nameLabel = document.createElement("label");
        nameLabel.textContent = t("moderatorName");
        nameDiv.appendChild(nameLabel);
        const nameRow = document.createElement("div");
        nameRow.className = "name-input-row";
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.id = "moderator-name";
        nameInput.placeholder = t("moderatorName");
        nameRow.appendChild(nameInput);
        const modDice = document.createElement("button");
        modDice.type = "button";
        modDice.className = "name-randomize";
        modDice.textContent = "\uD83C\uDFB2";
        modDice.title = t("randomName");
        modDice.addEventListener("click", () => {
            nameInput.value = generateRandomName(state.lang);
        });
        nameRow.appendChild(modDice);
        nameDiv.appendChild(nameRow);
        section.appendChild(nameDiv);

        const createBtn = document.createElement("button");
        createBtn.type = "button";
        createBtn.className = "start-button";
        createBtn.textContent = t("createRoomBtn");
        createBtn.addEventListener("click", () => {
            import("../ws/room-api").then(mod => mod.createRoom());
        });
        section.appendChild(createBtn);
    } else {
        const codeDiv = document.createElement("div");
        codeDiv.className = "online-setup-section";
        const codeLabel = document.createElement("label");
        codeLabel.textContent = t("roomCodeLabel");
        codeDiv.appendChild(codeLabel);
        const codeInput = document.createElement("input");
        codeInput.type = "text";
        codeInput.id = "join-room-code";
        codeInput.className = "room-code-input";
        codeInput.placeholder = t("roomCodePlaceholder");
        codeInput.maxLength = 6;
        codeInput.addEventListener("input", () => {
            codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
        });
        codeDiv.appendChild(codeInput);
        section.appendChild(codeDiv);

        const urlRoom = new URLSearchParams(location.search).get("room");
        if (urlRoom) {
            setTimeout(() => {
                const el = $("join-room-code") as HTMLInputElement | null;
                if (el && !el.value) el.value = urlRoom.toUpperCase();
            }, 0);
        }

        const nameDiv = document.createElement("div");
        nameDiv.className = "online-setup-section";
        const nameLabel = document.createElement("label");
        nameLabel.textContent = t("joinName");
        nameDiv.appendChild(nameLabel);
        const nameRow = document.createElement("div");
        nameRow.className = "name-input-row";
        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.id = "join-player-name";
        nameInput.placeholder = t("joinName");
        nameRow.appendChild(nameInput);
        const joinDice = document.createElement("button");
        joinDice.type = "button";
        joinDice.className = "name-randomize";
        joinDice.textContent = "\uD83C\uDFB2";
        joinDice.title = t("randomName");
        joinDice.addEventListener("click", () => {
            nameInput.value = generateRandomName(state.lang);
        });
        nameRow.appendChild(joinDice);
        nameDiv.appendChild(nameRow);
        section.appendChild(nameDiv);

        const joinBtn = document.createElement("button");
        joinBtn.type = "button";
        joinBtn.className = "start-button";
        joinBtn.textContent = t("joinBtn");
        joinBtn.addEventListener("click", () => {
            import("../ws/room-api").then(mod => mod.joinRoom());
        });
        section.appendChild(joinBtn);
    }

    const hintsToggle = container.querySelector(".hint-toggle");
    if (hintsToggle) container.insertBefore(section, hintsToggle);
}

export function startGame(): void {
    ensureAudio();

    state.players = [];
    for (let i = 0; i < state.playerCount; i++) {
        const input = $("name-" + i) as HTMLInputElement | null;
        state.players.push(input && input.value.trim() ? input.value.trim() : t("defaultPlayer") + " " + (i + 1));
    }
    state.hintsOn = ($("hints-check") as HTMLInputElement | null)?.checked ?? true;

    state.gamePool = buildGamePool(state.mode);
    state.calledChars = [];
    state.currentChar = null;
    state.pendingChar = null;
    state.pendingSelections = {};
    state.winners = [];
    state.gameActive = true;

    state.boards = [];
    for (let p = 0; p < state.playerCount; p++) {
        state.boards.push(generateBoard(state.gamePool));
    }

    renderGame();
    const setupScreen = $("setup-screen");
    if (setupScreen) setupScreen.classList.add("hidden");
    const gameScreen = $("game-screen");
    if (gameScreen) gameScreen.classList.remove("hidden");
    const winOverlay = $("win-overlay");
    if (winOverlay) winOverlay.classList.add("hidden");

    const randomBtn = $("random-btn") as HTMLButtonElement | null;
    if (randomBtn) randomBtn.disabled = false;
    const replayBtn = $("replay-btn");
    if (replayBtn) replayBtn.classList.add("hidden");
    const revealBtn = $("reveal-btn");
    if (revealBtn) revealBtn.classList.add("hidden");
    setVoiceStatus(t("statusReady"), "", "statusReady");

    if (isAllBots(state.botPlayers)) {
        startAutoPlay();
    }
}
