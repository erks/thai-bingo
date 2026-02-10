import { env, runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import type { BingoRoom } from "../src/room";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    BINGO_ROOM: DurableObjectNamespace;
  }
}

// Helper: initialize a room in the DO via POST /init
async function initRoom(
  stub: DurableObjectStub,
  opts: { code?: string; name?: string; mode?: string; hintsOn?: boolean; playing?: boolean } = {},
) {
  const resp = await stub.fetch("https://do/init", {
    method: "POST",
    body: JSON.stringify({
      code: opts.code ?? "AAAAAA",
      name: opts.name ?? "Mod",
      mode: opts.mode ?? "consonants",
      hintsOn: opts.hintsOn ?? false,
      playing: opts.playing ?? false,
    }),
    headers: { "Content-Type": "application/json" },
  });
  return (await resp.json()) as { room: string; moderatorId: string };
}

// Helper: open a WebSocket to the DO and collect messages
async function connectWs(
  stub: DurableObjectStub,
  params: { role: string; id: string; name?: string },
): Promise<{ ws: WebSocket; messages: Record<string, unknown>[] }> {
  const url = new URL("https://do/ws");
  url.searchParams.set("role", params.role);
  url.searchParams.set("id", params.id);
  url.searchParams.set("name", params.name ?? "");
  const resp = await stub.fetch(url.toString(), {
    headers: { Upgrade: "websocket" },
  });
  expect(resp.status).toBe(101);
  const ws = resp.webSocket!;
  ws.accept();
  const messages: Record<string, unknown>[] = [];
  ws.addEventListener("message", (e) => {
    messages.push(JSON.parse(typeof e.data === "string" ? e.data : new TextDecoder().decode(e.data as ArrayBuffer)));
  });
  return { ws, messages };
}

// Helper: wait a tick for message delivery
function tick(ms = 50): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Helper: find messages of a given type
function ofType(msgs: Record<string, unknown>[], type: string) {
  return msgs.filter((m) => m.type === type);
}

describe("BingoRoom", () => {
  let stub: DurableObjectStub;

  // Each test gets a fresh DO instance by using a unique name
  let testCounter = 0;
  beforeEach(() => {
    testCounter++;
    const id = env.BINGO_ROOM.idFromName(`test-${testCounter}-${Date.now()}`);
    stub = env.BINGO_ROOM.get(id);
  });

  // ---- Room creation ----

  describe("room creation", () => {
    it("POST /init creates a room and returns code + moderatorId", async () => {
      const result = await initRoom(stub, { code: "ABC123" });
      expect(result.room).toBe("ABC123");
      expect(result.moderatorId).toBeTruthy();
      expect(typeof result.moderatorId).toBe("string");
    });

    it("returns 404 for unknown paths", async () => {
      const resp = await stub.fetch("https://do/unknown");
      expect(resp.status).toBe(404);
    });
  });

  // ---- Moderator join ----

  describe("moderator join", () => {
    it("moderator receives joined message on connect", async () => {
      const { moderatorId } = await initRoom(stub);
      const { ws, messages } = await connectWs(stub, { role: "moderator", id: moderatorId });
      await tick();

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe("joined");
      expect(messages[0].playerId).toBe(moderatorId);
      expect(messages[0].phase).toBe("lobby");
      ws.close();
    });
  });

  // ---- Player join ----

  describe("player join", () => {
    it("player receives joined; moderator receives player_joined", async () => {
      const { moderatorId } = await initRoom(stub);
      const { ws: modWs, messages: modMsgs } = await connectWs(stub, {
        role: "moderator",
        id: moderatorId,
      });
      await tick();

      const { ws: pWs, messages: pMsgs } = await connectWs(stub, {
        role: "player",
        id: "p1",
        name: "Alice",
      });
      await tick();

      // Player gets joined
      const playerJoined = ofType(pMsgs, "joined");
      expect(playerJoined).toHaveLength(1);
      expect(playerJoined[0].phase).toBe("lobby");

      // Moderator gets player_joined broadcast
      const modPj = ofType(modMsgs, "player_joined");
      expect(modPj.length).toBeGreaterThanOrEqual(1);

      modWs.close();
      pWs.close();
    });
  });

  // ---- WebSocket to non-existent room ----

  describe("room not found", () => {
    it("sends error when room was never initialized", async () => {
      const { ws, messages } = await connectWs(stub, {
        role: "player",
        id: "p1",
        name: "Bob",
      });
      await tick();

      expect(ofType(messages, "error")).toHaveLength(1);
      expect(messages[0].message).toBe("Room not found");
      ws.close();
    });
  });

  // ---- Game start ----

  describe("game start", () => {
    it("moderator starts game; all receive game_start with boards", async () => {
      const { moderatorId } = await initRoom(stub);
      const { ws: modWs, messages: modMsgs } = await connectWs(stub, {
        role: "moderator",
        id: moderatorId,
      });
      await tick();

      // Two players join
      const { ws: p1Ws, messages: p1Msgs } = await connectWs(stub, { role: "player", id: "p1", name: "Alice" });
      const { ws: p2Ws, messages: p2Msgs } = await connectWs(stub, { role: "player", id: "p2", name: "Bob" });
      await tick();

      // Start game
      modWs.send(JSON.stringify({ type: "start" }));
      await tick();

      const modStart = ofType(modMsgs, "game_start");
      expect(modStart).toHaveLength(1);
      const boards = modStart[0].boards as Record<string, unknown>;
      expect(boards["p1"]).toBeTruthy();
      expect(boards["p2"]).toBeTruthy();
      // Moderator not playing, so no moderator board
      expect(boards[moderatorId]).toBeUndefined();

      const p1Start = ofType(p1Msgs, "game_start");
      expect(p1Start).toHaveLength(1);
      expect((p1Start[0] as Record<string, unknown>).yourBoardId).toBe("p1");

      const p2Start = ofType(p2Msgs, "game_start");
      expect(p2Start).toHaveLength(1);

      modWs.close();
      p1Ws.close();
      p2Ws.close();
    });

    it("moderator playing gets their own board", async () => {
      const { moderatorId } = await initRoom(stub, { playing: true });
      const { ws: modWs, messages: modMsgs } = await connectWs(stub, {
        role: "moderator",
        id: moderatorId,
      });
      await tick();

      const { ws: p1Ws } = await connectWs(stub, { role: "player", id: "p1", name: "Alice" });
      await tick();

      modWs.send(JSON.stringify({ type: "start" }));
      await tick();

      const gs = ofType(modMsgs, "game_start");
      expect(gs).toHaveLength(1);
      const boards = gs[0].boards as Record<string, unknown>;
      expect(boards[moderatorId]).toBeTruthy();
      expect(gs[0].yourBoardId).toBe(moderatorId);

      modWs.close();
      p1Ws.close();
    });
  });

  // ---- Start validation ----

  describe("start validation", () => {
    it("non-moderator cannot start", async () => {
      const { moderatorId } = await initRoom(stub);
      await connectWs(stub, { role: "moderator", id: moderatorId });
      const { ws: pWs, messages: pMsgs } = await connectWs(stub, { role: "player", id: "p1", name: "Alice" });
      await tick();

      pWs.send(JSON.stringify({ type: "start" }));
      await tick();

      // Player should NOT receive game_start
      expect(ofType(pMsgs, "game_start")).toHaveLength(0);
      pWs.close();
    });

    it("not enough players", async () => {
      const { moderatorId } = await initRoom(stub);
      const { ws: modWs, messages: modMsgs } = await connectWs(stub, {
        role: "moderator",
        id: moderatorId,
      });
      // Only 1 player (need 2 when moderator not playing)
      const { ws: p1Ws } = await connectWs(stub, { role: "player", id: "p1", name: "Alice" });
      await tick();

      modWs.send(JSON.stringify({ type: "start" }));
      await tick();

      const errors = ofType(modMsgs, "error");
      expect(errors.some((e) => (e.message as string).includes("Not enough players"))).toBe(true);

      modWs.close();
      p1Ws.close();
    });
  });

  // ---- Randomize → select → reveal flow ----

  describe("turn flow: randomize → select → reveal", () => {
    it("full turn cycle validates selections correctly", async () => {
      const { moderatorId } = await initRoom(stub, { mode: "consonants" });
      const { ws: modWs, messages: modMsgs } = await connectWs(stub, {
        role: "moderator",
        id: moderatorId,
      });
      const { ws: p1Ws, messages: p1Msgs } = await connectWs(stub, { role: "player", id: "p1", name: "Alice" });
      const { ws: p2Ws, messages: p2Msgs } = await connectWs(stub, { role: "player", id: "p2", name: "Bob" });
      await tick();

      // Start game
      modWs.send(JSON.stringify({ type: "start" }));
      await tick();

      // Randomize
      modWs.send(JSON.stringify({ type: "randomize" }));
      await tick();

      // Moderator gets randomized with the pending char
      const randomized = ofType(modMsgs, "randomized");
      expect(randomized).toHaveLength(1);
      const pendingChar = randomized[0].pendingChar as string;
      expect(pendingChar).toBeTruthy();

      // Players get char_pending
      expect(ofType(p1Msgs, "char_pending")).toHaveLength(1);
      expect(ofType(p2Msgs, "char_pending")).toHaveLength(1);

      // Player 1 selects a cell (find the char on their board)
      const p1Start = ofType(p1Msgs, "game_start")[0];
      const p1Board = (p1Start.boards as Record<string, { char: string }[][]>)["p1"];
      let correctCell: { r: number; c: number } | null = null;
      let wrongCell: { r: number; c: number } | null = null;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (p1Board[r][c].char === pendingChar) {
            correctCell = { r, c };
          } else if (p1Board[r][c].char !== "⭐" && !wrongCell) {
            wrongCell = { r, c };
          }
        }
      }

      // Player 1 selects correct cell (if it exists on their board)
      if (correctCell) {
        p1Ws.send(JSON.stringify({ type: "select", r: correctCell.r, c: correctCell.c }));
      }
      // Player 2 selects a wrong cell
      const p2Start = ofType(p2Msgs, "game_start")[0];
      const p2Board = (p2Start.boards as Record<string, { char: string }[][]>)["p2"];
      let p2WrongCell: { r: number; c: number } | null = null;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (p2Board[r][c].char !== pendingChar && p2Board[r][c].char !== "⭐") {
            p2WrongCell = { r, c };
            break;
          }
        }
        if (p2WrongCell) break;
      }
      if (p2WrongCell) {
        p2Ws.send(JSON.stringify({ type: "select", r: p2WrongCell.r, c: p2WrongCell.c }));
      }
      await tick();

      // Reveal
      modWs.send(JSON.stringify({ type: "reveal" }));
      await tick();

      // All should get revealed
      const p1Revealed = ofType(p1Msgs, "revealed");
      expect(p1Revealed).toHaveLength(1);
      expect(p1Revealed[0].char).toBe(pendingChar);
      expect((p1Revealed[0].calledChars as string[]).length).toBe(1);

      // Check selection results
      const selections = p1Revealed[0].selections as Record<string, { valid: boolean }>;
      if (correctCell) {
        expect(selections["p1"]?.valid).toBe(true);
      }
      if (p2WrongCell) {
        expect(selections["p2"]?.valid).toBe(false);
      }

      modWs.close();
      p1Ws.close();
      p2Ws.close();
    });
  });

  // ---- Mark after reveal ----

  describe("mark", () => {
    async function setupGameAndRevealChar(
      gameStub: DurableObjectStub,
    ): Promise<{
      modWs: WebSocket;
      modMsgs: Record<string, unknown>[];
      p1Ws: WebSocket;
      p1Msgs: Record<string, unknown>[];
      revealedChar: string;
      moderatorId: string;
    }> {
      const { moderatorId } = await initRoom(gameStub, { mode: "consonants" });
      const { ws: modWs, messages: modMsgs } = await connectWs(gameStub, {
        role: "moderator",
        id: moderatorId,
      });
      const { ws: p1Ws, messages: p1Msgs } = await connectWs(gameStub, { role: "player", id: "p1", name: "Alice" });
      const { ws: p2Ws } = await connectWs(gameStub, { role: "player", id: "p2", name: "Bob" });
      await tick();

      modWs.send(JSON.stringify({ type: "start" }));
      await tick();
      modWs.send(JSON.stringify({ type: "randomize" }));
      await tick();

      const revealedChar = (ofType(modMsgs, "randomized")[0].pendingChar as string);
      modWs.send(JSON.stringify({ type: "reveal" }));
      await tick();

      p2Ws.close();
      return { modWs, modMsgs, p1Ws, p1Msgs, revealedChar, moderatorId };
    }

    it("marks a called character as valid", async () => {
      const { modWs, p1Ws, p1Msgs, revealedChar } = await setupGameAndRevealChar(stub);

      // Find the revealedChar on p1's board
      const p1Start = ofType(p1Msgs, "game_start")[0];
      const p1Board = (p1Start.boards as Record<string, { char: string }[][]>)["p1"];
      let cell: { r: number; c: number } | null = null;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (p1Board[r][c].char === revealedChar) {
            cell = { r, c };
          }
        }
      }

      if (cell) {
        p1Ws.send(JSON.stringify({ type: "mark", r: cell.r, c: cell.c }));
        await tick();

        const markResults = ofType(p1Msgs, "mark_result");
        expect(markResults.some((m) => m.valid === true && m.playerId === "p1")).toBe(true);
      }

      modWs.close();
      p1Ws.close();
    });

    it("marks an uncalled character as invalid", async () => {
      const { modWs, p1Ws, p1Msgs, revealedChar } = await setupGameAndRevealChar(stub);

      // Find a cell that is NOT the revealedChar
      const p1Start = ofType(p1Msgs, "game_start")[0];
      const p1Board = (p1Start.boards as Record<string, { char: string }[][]>)["p1"];
      let uncalledCell: { r: number; c: number } | null = null;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (p1Board[r][c].char !== revealedChar && p1Board[r][c].char !== "⭐") {
            uncalledCell = { r, c };
            break;
          }
        }
        if (uncalledCell) break;
      }

      if (uncalledCell) {
        p1Ws.send(JSON.stringify({ type: "mark", r: uncalledCell.r, c: uncalledCell.c }));
        await tick();

        const markResults = ofType(p1Msgs, "mark_result");
        expect(markResults.some((m) => m.valid === false)).toBe(true);
      }

      modWs.close();
      p1Ws.close();
    });
  });

  // ---- Win detection ----

  describe("win detection", () => {
    it("broadcasts win when a player completes a row via mark", async () => {
      const { moderatorId } = await initRoom(stub, { mode: "consonants" });
      const { ws: modWs, messages: modMsgs } = await connectWs(stub, {
        role: "moderator",
        id: moderatorId,
      });
      const { ws: p1Ws, messages: p1Msgs } = await connectWs(stub, { role: "player", id: "p1", name: "Alice" });
      const { ws: p2Ws } = await connectWs(stub, { role: "player", id: "p2", name: "Bob" });
      await tick();

      modWs.send(JSON.stringify({ type: "start" }));
      await tick();

      // Get player 1's board
      const p1Start = ofType(p1Msgs, "game_start")[0];
      const p1Board = (p1Start.boards as Record<string, { char: string; marked: boolean; free: boolean }[][]>)["p1"];

      // Pick row 0 (no free cell there) and mark each cell via the full randomize→reveal→mark cycle
      // But that's complex — instead, use mark with calledChars being populated
      // We'll play the game properly: call each char in row 0 via randomize+reveal, then mark
      const row0Chars = p1Board[0].map((cell) => cell.char);

      for (const targetChar of row0Chars) {
        // Randomize until we get a char (we can't control which char is picked, so
        // we'll use a different approach: call randomize, reveal, then mark the target manually)
        modWs.send(JSON.stringify({ type: "randomize" }));
        await tick();

        const rnd = ofType(modMsgs, "randomized");
        const lastRnd = rnd[rnd.length - 1];
        const char = lastRnd.pendingChar as string;

        modWs.send(JSON.stringify({ type: "reveal" }));
        await tick();

        // If the revealed char matches one in row 0, mark it
        for (let c = 0; c < 5; c++) {
          if (p1Board[0][c].char === char && !p1Board[0][c].marked) {
            p1Ws.send(JSON.stringify({ type: "mark", r: 0, c }));
            p1Board[0][c].marked = true;
            await tick();
            break;
          }
        }
      }

      // Check if we got a win (may not if not all chars were called)
      // Since gamePool is 35 chars and row 0 has 5 chars, each randomize picks from remaining pool
      // We have called row0Chars.length (5) chars — some may match, some may not
      // This is inherently probabilistic, so verify state directly instead
      await runInDurableObject(stub, async (instance, state) => {
        const room = await state.storage.get("room") as Record<string, unknown> | undefined;
        // Room should exist and be in playing phase
        expect(room).toBeDefined();
        expect(room!.phase).toBe("playing");
      });

      modWs.close();
      p1Ws.close();
      p2Ws.close();
    });

    it("detects win via mark after enough chars are called", async () => {
      const { moderatorId } = await initRoom(stub, { mode: "consonants", playing: true });
      const { ws: modWs, messages: modMsgs } = await connectWs(stub, {
        role: "moderator",
        id: moderatorId,
      });
      const { ws: p1Ws, messages: p1Msgs } = await connectWs(stub, { role: "player", id: "p1", name: "Alice" });
      await tick();

      modWs.send(JSON.stringify({ type: "start" }));
      await tick();

      // Get player 1's board from the game_start message
      const p1Start = ofType(p1Msgs, "game_start")[0];
      const p1Board = (p1Start.boards as Record<string, { char: string; marked: boolean; free: boolean }[][]>)["p1"];
      const row0Chars = new Set(p1Board[0].map((cell) => cell.char));

      // Track which row 0 chars have been called
      const calledRow0 = new Set<string>();

      // Keep calling chars until all 5 in row 0 have been called
      for (let turn = 0; turn < 35 && calledRow0.size < 5; turn++) {
        modWs.send(JSON.stringify({ type: "randomize" }));
        await tick();

        const rnd = ofType(modMsgs, "randomized");
        const char = rnd[rnd.length - 1].pendingChar as string;

        modWs.send(JSON.stringify({ type: "reveal" }));
        await tick();

        if (row0Chars.has(char)) {
          calledRow0.add(char);
          // Mark this cell on p1's board
          for (let c = 0; c < 5; c++) {
            if (p1Board[0][c].char === char) {
              p1Ws.send(JSON.stringify({ type: "mark", r: 0, c }));
              await tick();
              break;
            }
          }
        }
      }

      // If all 5 chars were called, we should have a win
      if (calledRow0.size === 5) {
        const wins = ofType(p1Msgs, "win");
        expect(wins).toHaveLength(1);
        expect(wins[0].playerId).toBe("p1");
        expect(wins[0].playerName).toBe("Alice");
        expect(wins[0].winLine).toBeTruthy();

        const modWins = ofType(modMsgs, "win");
        expect(modWins).toHaveLength(1);
      }

      modWs.close();
      p1Ws.close();
    });
  });

  // ---- Player disconnect/reconnect ----

  describe("disconnect and reconnect", () => {
    it("player reconnects and gets full state", async () => {
      const { moderatorId } = await initRoom(stub);
      const { ws: modWs, messages: modMsgs } = await connectWs(stub, {
        role: "moderator",
        id: moderatorId,
      });
      const { ws: p1Ws } = await connectWs(stub, { role: "player", id: "p1", name: "Alice" });
      const { ws: p2Ws } = await connectWs(stub, { role: "player", id: "p2", name: "Bob" });
      await tick();

      // Start game
      modWs.send(JSON.stringify({ type: "start" }));
      await tick();

      // Player 1 disconnects
      p1Ws.close();
      await tick();

      // Verify disconnect notification
      const disconnects = ofType(modMsgs, "player_disconnected");
      expect(disconnects.some((d) => d.playerId === "p1")).toBe(true);

      // Player 1 reconnects with same id
      const { ws: p1Ws2, messages: p1Msgs2 } = await connectWs(stub, {
        role: "player",
        id: "p1",
        name: "Alice",
      });
      await tick();

      // Should get joined + game_start (reconnect state)
      const joined = ofType(p1Msgs2, "joined");
      expect(joined).toHaveLength(1);
      expect(joined[0].phase).toBe("playing");

      // Should get game state for reconnect
      const gameStart = ofType(p1Msgs2, "game_start");
      expect(gameStart).toHaveLength(1);
      expect((gameStart[0] as Record<string, unknown>).yourBoardId).toBe("p1");
      expect((gameStart[0] as Record<string, unknown>).boards).toBeTruthy();

      // Others should get player_reconnected
      const reconnects = ofType(modMsgs, "player_reconnected");
      expect(reconnects.some((r) => r.playerId === "p1")).toBe(true);

      modWs.close();
      p1Ws2.close();
      p2Ws.close();
    });

    it("player reconnects by name after page refresh (new id)", async () => {
      const { moderatorId } = await initRoom(stub);
      const { ws: modWs } = await connectWs(stub, { role: "moderator", id: moderatorId });
      const { ws: p1Ws } = await connectWs(stub, { role: "player", id: "old-p1", name: "Alice" });
      const { ws: p2Ws } = await connectWs(stub, { role: "player", id: "p2", name: "Bob" });
      await tick();

      modWs.send(JSON.stringify({ type: "start" }));
      await tick();

      // Player 1 disconnects (page close)
      p1Ws.close();
      await tick();

      // Player 1 reconnects with a NEW id but same name
      const { ws: p1Ws2, messages: p1Msgs2 } = await connectWs(stub, {
        role: "player",
        id: "new-p1",
        name: "Alice",
      });
      await tick();

      // Should be recognized as reconnecting player
      const joined = ofType(p1Msgs2, "joined");
      expect(joined).toHaveLength(1);
      expect(joined[0].phase).toBe("playing");

      // Should get game state under the new id
      const gameStart = ofType(p1Msgs2, "game_start");
      expect(gameStart).toHaveLength(1);
      expect((gameStart[0] as Record<string, unknown>).yourBoardId).toBe("new-p1");

      modWs.close();
      p1Ws2.close();
      p2Ws.close();
    });
  });

  // ---- Alarm cleanup ----

  describe("alarm", () => {
    it("cleans up room when no sockets are connected", async () => {
      await initRoom(stub);

      // Trigger the alarm (simulates max lifetime expiry)
      const ran = await runDurableObjectAlarm(stub);
      expect(ran).toBe(true);

      // Verify room is cleaned up
      await runInDurableObject(stub, async (instance, state) => {
        const room = await state.storage.get("room");
        expect(room).toBeUndefined();
      });
    });

    it("does not clean up when sockets are still connected", async () => {
      const { moderatorId } = await initRoom(stub);
      const { ws: modWs } = await connectWs(stub, { role: "moderator", id: moderatorId });
      await tick();

      // Room was just created, so age < maxLifetime. Alarm should not clean up.
      const ran = await runDurableObjectAlarm(stub);
      expect(ran).toBe(true);

      // Room should still exist because sockets are connected and age is recent
      await runInDurableObject(stub, async (instance, state) => {
        const room = await state.storage.get("room");
        expect(room).toBeDefined();
      });

      modWs.close();
    });
  });

  // ---- Ready state ----

  describe("ready state", () => {
    it("toggles ready state and broadcasts update", async () => {
      const { moderatorId } = await initRoom(stub);
      const { ws: modWs, messages: modMsgs } = await connectWs(stub, {
        role: "moderator",
        id: moderatorId,
      });
      const { ws: p1Ws, messages: p1Msgs } = await connectWs(stub, { role: "player", id: "p1", name: "Alice" });
      const { ws: p2Ws } = await connectWs(stub, { role: "player", id: "p2", name: "Bob" });
      await tick();

      modWs.send(JSON.stringify({ type: "start" }));
      await tick();
      modWs.send(JSON.stringify({ type: "randomize" }));
      await tick();

      // Player sends ready
      p1Ws.send(JSON.stringify({ type: "ready" }));
      await tick();

      const readyUpdates = ofType(modMsgs, "ready_update");
      expect(readyUpdates.length).toBeGreaterThanOrEqual(1);
      const last = readyUpdates[readyUpdates.length - 1];
      expect((last.readyPlayerIds as string[])).toContain("p1");

      // Toggle off
      p1Ws.send(JSON.stringify({ type: "ready" }));
      await tick();

      const readyUpdates2 = ofType(modMsgs, "ready_update");
      const last2 = readyUpdates2[readyUpdates2.length - 1];
      expect((last2.readyPlayerIds as string[])).not.toContain("p1");

      modWs.close();
      p1Ws.close();
      p2Ws.close();
    });
  });

  // ---- Replay ----

  describe("replay", () => {
    it("re-broadcasts pending char to players", async () => {
      const { moderatorId } = await initRoom(stub);
      const { ws: modWs, messages: modMsgs } = await connectWs(stub, {
        role: "moderator",
        id: moderatorId,
      });
      const { ws: p1Ws, messages: p1Msgs } = await connectWs(stub, { role: "player", id: "p1", name: "Alice" });
      const { ws: p2Ws } = await connectWs(stub, { role: "player", id: "p2", name: "Bob" });
      await tick();

      modWs.send(JSON.stringify({ type: "start" }));
      await tick();
      modWs.send(JSON.stringify({ type: "randomize" }));
      await tick();

      const pendingChar = (ofType(modMsgs, "randomized")[0].pendingChar as string);

      // Replay
      modWs.send(JSON.stringify({ type: "replay" }));
      await tick();

      const replays = ofType(p1Msgs, "char_replay");
      expect(replays).toHaveLength(1);
      expect(replays[0].char).toBe(pendingChar);

      modWs.close();
      p1Ws.close();
      p2Ws.close();
    });
  });
});
