# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Thai Bingo (บิงโกภาษาไทย) — a single-file web app for learning Thai alphabet characters through bingo. The entire application lives in `index.html` (HTML + CSS + vanilla JS, no build step, no dependencies beyond Google Fonts).

## Development

Open `index.html` directly in a browser. No build, install, or server required. There are no tests or linting configured.

## Architecture

Everything is in one `index.html` file with three inline sections:

- **`<style>`** — All CSS, including player color theming via CSS custom properties (`--p1` through `--p4`), responsive breakpoints, and animations
- **HTML** — Three screens toggled via `.hidden` class: setup screen, game screen, win overlay
- **`<script>`** — All game logic in vanilla JS

### Key Data Structures

- `CONSONANTS` (44 Thai consonants) and `VOWELS` (24 Thai vowels) — the character pools
- `CONSONANT_SPEECH` / `VOWEL_SPEECH` — maps each character to an array of spoken-form keywords (e.g., `['กอไก่','กอ ไก่','ไก่']`) used for Web Speech API matching
- `state` object — single global state holding player count, mode, boards (5x5 grid arrays), called characters, speech recognition instance, etc.

### Game Flow

1. **Setup screen** — player count (2-4), player names, mode selection (consonants only / vowels only / mixed), hints toggle
2. **`startGame()`** — shuffles character pool, slices to configured size (`GAME_POOL_SIZES`), generates 5x5 boards with center free space
3. **Character calling** — two input modes: voice (Web Speech API with `th-TH` locale) or manual picker grid
4. **`matchSpeechToChar()`** — matches speech recognition results against keyword lists, with fuzzy fallback to first recognized Thai consonant
5. **Cell marking** — validates character was called, checks win condition (row/col/diagonal), triggers win overlay with confetti

### UI Conventions

- Player boards are color-coded using CSS vars (`--p1` blue, `--p2` pink, `--p3` green, `--p4` orange)
- Sound effects use Web Audio API (`playTone()`) — no audio files
- All UI text is in Thai
