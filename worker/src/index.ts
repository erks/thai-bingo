// ============================================================
// Thai Bingo — Cloudflare Worker Entry Point
// ============================================================

import { BingoRoom } from "./room";
import { CONFIG } from "./config";
import type { Env } from "./types";
import { generateCode } from "./utils";

export { BingoRoom };

// CORS origins allowed to connect
const ALLOWED_ORIGINS = [
  "https://thaibingo.app",
  "https://www.thaibingo.app",
  "https://erks.github.io",
  "http://localhost:8787",
  "http://localhost:3000",
  "http://127.0.0.1:8787",
  "http://127.0.0.1:3000",
  "null", // file:// origin
];

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // POST /api/room — create a new room
    if (request.method === "POST" && url.pathname === "/api/room") {
      const body = await request.json() as {
        name: string;
        mode: string;
        hintsOn: boolean;
        playing: boolean;
      };

      const code = generateCode();
      const id = env.BINGO_ROOM.idFromName(code);
      const stub = env.BINGO_ROOM.get(id);

      // Initialize room in DO
      const initResp = await stub.fetch(new Request("https://do/init", {
        method: "POST",
        body: JSON.stringify({ code, ...body }),
        headers: { "Content-Type": "application/json" },
      }));
      const result = await initResp.json() as { room: string; moderatorId: string };

      return Response.json(result, { headers: corsHeaders(request) });
    }

    // GET /api/room/:code/websocket — WebSocket upgrade
    const wsMatch = url.pathname.match(new RegExp(`^/api/room/([A-Z0-9]{${CONFIG.roomCodeLength}})/websocket$`));
    if (wsMatch && request.headers.get("Upgrade") === "websocket") {
      const code = wsMatch[1];
      const id = env.BINGO_ROOM.idFromName(code);
      const stub = env.BINGO_ROOM.get(id);

      // Forward the WebSocket upgrade request to the DO, passing query params through
      const doUrl = new URL("https://do/ws");
      doUrl.searchParams.set("role", url.searchParams.get("role") || "");
      doUrl.searchParams.set("id", url.searchParams.get("id") || "");
      doUrl.searchParams.set("name", url.searchParams.get("name") || "");

      return stub.fetch(new Request(doUrl.toString(), {
        headers: request.headers,
      }));
    }

    return new Response("Not found", { status: 404, headers: corsHeaders(request) });
  },
};
