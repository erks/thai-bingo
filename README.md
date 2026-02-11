# บิงโกภาษาไทย (Thai Bingo)

A web-based bingo game for learning Thai alphabet characters — consonants, vowels, or both. Play locally on one screen or online with friends.

**Play now:** https://thaibingo.app

## How to Play

### Local Mode

1. **Open the app** at https://thaibingo.app (or run `make dev` locally)
2. **Set up** — choose player count (2–4), enter names, and select a mode:
   - **พยัญชนะ** — consonants only (42 characters)
   - **สระ** — vowels only (31 characters)
   - **ผสม** — mixed (consonants + vowels)
3. **Call characters** — click the randomize button to pick a character, then reveal it
4. **Players mark** — after a character is revealed, players select the matching cell on their board
5. **Bingo!** — first player to complete a row, column, or diagonal wins

### Online Mode

1. Select **Online** on the setup screen
2. **Moderator** creates a room — picks a mode, optionally checks "I'm playing too", and gets a 6-character room code
3. **Players** join by entering the room code (or clicking a shared link)
4. Moderator starts the game, randomizes characters, and reveals them
5. Players select cells on their own board before each reveal — correct guesses are marked automatically
6. Everyone sees all boards update in real time

## Development

```sh
make install   # install all workspace dependencies
make dev       # run client (Vite, port 3000) + worker (port 8787)
make           # type-check all packages (shared, worker, client)
make test      # run worker + client tests
make build     # production build of the client
make client    # run client dev server only
make worker    # run worker only
make clean     # kill dangling dev processes
```

### Project Structure

- **`shared/`** — shared types, game data, and logic (npm workspace: `@thai-bingo/shared`)
- **`client/`** — Vite + TypeScript frontend (npm workspace: `@thai-bingo/client`)
- **`worker/`** — Cloudflare Worker + Durable Object for multiplayer API (npm workspace: `@thai-bingo/worker`)

### CI/CD

- **PR checks:** type-checking, tests, and build run automatically on all PRs
- **Deploy:** worker auto-deploys to Cloudflare, client auto-deploys to GitHub Pages on push to `main`

### Initial Setup

After cloning, two secrets/settings are needed for CI/CD:

1. **Cloudflare Worker:** add a `CLOUDFLARE_API_TOKEN` secret in repo settings (Settings → Secrets and variables → Actions)
2. **GitHub Pages:** go to Settings → Pages → Build and deployment → Source, and select **"GitHub Actions"** (instead of "Deploy from a branch")

## Requirements

- A modern browser (Chrome/Edge recommended for audio features)
- Node.js 22+ for development
- Online mode requires the Cloudflare Worker backend (auto-deployed via GitHub Actions)
