# บิงโกภาษาไทย (Thai Bingo)

A web-based bingo game for learning Thai alphabet characters — consonants, vowels, or both. Play locally on one screen or online with friends.

**Play now:** https://erks.github.io/thai-bingo/

## How to Play

### Local Mode

1. **Open `index.html`** in a browser (or serve via `python3 -m http.server` for voice input support)
2. **Set up** — choose player count (2–4), enter names, and select a mode:
   - **พยัญชนะ** — consonants only (44 characters)
   - **สระ** — vowels only (24 characters)
   - **ผสม** — mixed (consonants + vowels)
3. **Call characters** using one of two input methods:
   - **Voice** (🎤) — speak the character's traditional name (e.g. "กอไก่" for ก, "สระอา" for -า). Requires localhost or HTTPS for Web Speech API access.
   - **Manual** (📋) — click characters from a picker grid
4. **Players guess** — after a character is called, boards are revealed and each player selects the cell they think matches
5. **Reveal** — click "เฉลย" to show the called character. Correct guesses are marked; wrong guesses are rejected.
6. **Bingo!** — first player to complete a row, column, or diagonal wins

### Online Mode

1. Select **Online** on the setup screen
2. **Moderator** creates a room — picks a mode, optionally checks "I'm playing too", and gets a 6-character room code
3. **Players** join by entering the room code (or clicking a shared link)
4. Moderator starts the game, randomizes characters, and reveals them
5. Players select cells on their own board before each reveal — correct guesses are marked automatically
6. Everyone sees all boards update in real time

## Voice Input

Voice recognition uses the Web Speech API with Thai (`th-TH`) locale. Characters are matched by their traditional names:

| Type | Example | Say |
|------|---------|-----|
| Consonant | ก | กอไก่ |
| Consonant | ช | ชอช้าง |
| Vowel | -า | สระอา |
| Vowel | ใ- | สระใอไม้ม้วน |

Speech debug output is logged to the browser console (`F12` → Console).

**Note:** Voice input requires a secure context. Open via `localhost` (e.g. `python3 -m http.server 8000`) rather than `file://`. If speech is unavailable, the game falls back to manual picker mode.

## Development

```sh
make install   # install worker dependencies
make dev       # run client (port 3000) + worker (port 8787)
make client    # run client only
make worker    # run worker only
make clean     # kill dangling dev processes
```

## Requirements

- A modern browser (Chrome/Edge recommended for Web Speech API)
- No build step, dependencies, or server required for local mode
- Online mode requires the Cloudflare Worker backend (auto-deployed via GitHub Actions)
