import { DurableObject } from "cloudflare:workers";

/**
 * A sticky-note board is a flat set of mutable notes, one Durable Object
 * per board (so all connections to the same board share the same
 * in-memory state and the same SQLite-backed storage). Unlike an
 * append-only log, notes are stored keyed by id and simply overwritten or
 * deleted -- a new connection is caught up by sending every note as it
 * currently stands, not a history of edits.
 *
 * Message shape (all fields besides `t` are opaque to the server -- it
 * just stores/relays whatever the client sends, tagging it with the
 * sender's connection id):
 *   create: { t: "create", id, x, y, w, h, color, html, rot, z, fields? }
 *   move:   { t: "move", id, x, y, z }
 *   update: { t: "update", id, html?, color?, w?, h?, z?, fields? }
 *
 * `html` is rich text (bold/italic/underline, headings, fonts, sizes) as a
 * limited HTML subset. The server relays it unmodified -- each client is
 * responsible for sanitizing any HTML it renders from a peer, since this
 * server applies no validation of its own.
 *
 * `fields` is an opaque object of board-defined custom metadata values
 * (e.g. status/assignee/tags) keyed by field id, merged into the note like
 * any other property -- see the `fields` message below for the definitions
 * those ids refer to.
 *   delete: { t: "delete", id }
 *   clear:  { t: "clear" }
 *   cursor: { t: "cursor", x, y, color }  (never persisted)
 *   fields: { t: "fields", fields }  -- replaces the board's whole custom
 *     field schema (an array the client defines: name/type/options per
 *     field). Stored separately from notes so "clear" (which only wipes
 *     notes) leaves field definitions in place. A new connection receives
 *     the current schema alongside note history: { t: "history", notes,
 *     fields }.
 *   background: { t: "background", background }  -- sets the board's
 *     background type (a string id like "grid"/"whiteboard"/"chalkboard"/
 *     "pinboard", opaque to the server). Stored like `fields`, separately
 *     from notes, and included in the history payload as `background`.
 *
 * POST /board/<board-id>/vision is a separate, non-websocket endpoint: send
 * { image: "data:image/...;base64,..." } and get back { items: string[] }
 * extracted from a photo of a to-do list via the Anthropic API. It's gated
 * the same way the rest of the board is -- knowing the board's id -- rather
 * than requiring any accounts, since this app has none. That's obscurity,
 * not real authentication, so a per-board daily cap (VISION_DAILY_LIMIT)
 * bounds the damage if a board URL ever leaks, given the endpoint spends
 * the shared ANTHROPIC_API_KEY on every call.
 */

interface Env {
  BOARD: DurableObjectNamespace<NotesBoard>;
  ANTHROPIC_API_KEY?: string;
}

const NOTE_PREFIX = "note:";
const FIELDS_KEY = "schema:fields";
const BACKGROUND_KEY = "schema:background";
const MAX_NOTES = 2000;
const VISION_DAILY_LIMIT = 30;
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
type ConnAttachment = { id: string };
type Note = { id: string } & Record<string, unknown>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // UTC calendar day
}

/** Calls the Anthropic API with the photo and asks for a plain JSON array of
 * list-item strings back. Throws on any failure; the caller turns that into
 * a user-facing error response. */
async function extractListItems(apiKey: string, mediaType: string, base64: string): Promise<string[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            {
              type: "text",
              text:
                "This image shows a list of to-do items -- handwritten or typed, on paper, a " +
                "whiteboard, or a screen. Extract each distinct item as a short string, dropping " +
                "any checkboxes, bullets, or numbering. Respond with ONLY a JSON array of strings " +
                'and nothing else, e.g. ["Buy milk","Call dentist"]. If you see no list items, ' +
                "respond with [].",
            },
          ],
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API error (${res.status})`);
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.find((block) => block.type === "text")?.text ?? "[]";
  const match = text.match(/\[[\s\S]*\]/);
  let parsed: unknown;
  try {
    parsed = JSON.parse(match ? match[0] : "[]");
  } catch {
    throw new Error("Couldn't parse a list from that photo.");
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 40);
}

export class NotesBoard extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith("/vision")) {
      return this.handleVision(request);
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const id = crypto.randomUUID();
    server.serializeAttachment({ id } satisfies ConnAttachment);
    this.ctx.acceptWebSocket(server);

    const stored = await this.ctx.storage.list({ prefix: NOTE_PREFIX });
    const notes = [...stored.values()];
    const fields = (await this.ctx.storage.get(FIELDS_KEY)) as unknown[] | undefined;
    const background = (await this.ctx.storage.get(BACKGROUND_KEY)) as string | undefined;
    server.send(JSON.stringify({ t: "history", notes, fields: fields || [], background: background || "grid" }));

    return new Response(null, { status: 101, webSocket: client });
  }

  async handleVision(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
    if (!this.env.ANTHROPIC_API_KEY) {
      return jsonResponse({ error: "Photo scanning isn't configured on this server." }, 500);
    }

    const rateLimitKey = "visionCount:" + todayKey();
    const count = ((await this.ctx.storage.get(rateLimitKey)) as number) || 0;
    if (count >= VISION_DAILY_LIMIT) {
      return jsonResponse({ error: "This board has hit its daily photo-scan limit. Try again tomorrow." }, 429);
    }

    let body: { image?: string };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Malformed request." }, 400);
    }
    const match = typeof body.image === "string" && body.image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) {
      return jsonResponse({ error: "No image provided." }, 400);
    }
    const [, mediaType, base64] = match;

    try {
      const items = await extractListItems(this.env.ANTHROPIC_API_KEY, mediaType, base64);
      await this.ctx.storage.put(rateLimitKey, count + 1);
      return jsonResponse({ items });
    } catch (err) {
      return jsonResponse({ error: "Photo scan failed. Try again." }, 502);
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }
    const { id: senderId } = (ws.deserializeAttachment() as ConnAttachment) || {};
    data.from = senderId;
    const out = JSON.stringify(data);
    const noteId = typeof data.id === "string" ? data.id : null;

    switch (data.t) {
      case "create": {
        if (!noteId) return;
        const count = (await this.ctx.storage.list({ prefix: NOTE_PREFIX })).size;
        if (count >= MAX_NOTES) return;
        await this.ctx.storage.put(NOTE_PREFIX + noteId, data as Note);
        this.broadcast(out, senderId);
        break;
      }
      case "move":
      case "update": {
        if (!noteId) return;
        const existing = (await this.ctx.storage.get(NOTE_PREFIX + noteId)) as Note | undefined;
        if (!existing) return;
        const merged = { ...existing, ...data };
        await this.ctx.storage.put(NOTE_PREFIX + noteId, merged);
        this.broadcast(out, senderId);
        break;
      }
      case "delete": {
        if (!noteId) return;
        await this.ctx.storage.delete(NOTE_PREFIX + noteId);
        this.broadcast(out, senderId);
        break;
      }
      case "clear": {
        const stored = await this.ctx.storage.list({ prefix: NOTE_PREFIX });
        await Promise.all([...stored.keys()].map((k) => this.ctx.storage.delete(k)));
        this.broadcast(out, senderId);
        break;
      }
      case "cursor": {
        this.broadcast(out, senderId);
        break;
      }
      case "fields": {
        const fields = Array.isArray(data.fields) ? data.fields : [];
        await this.ctx.storage.put(FIELDS_KEY, fields);
        this.broadcast(out, senderId);
        break;
      }
      case "background": {
        const background = typeof data.background === "string" ? data.background : "grid";
        await this.ctx.storage.put(BACKGROUND_KEY, background);
        this.broadcast(out, senderId);
        break;
      }
      default:
        break;
    }
  }

  webSocketClose(ws: WebSocket) {
    const { id } = (ws.deserializeAttachment() as ConnAttachment) || {};
    if (id) this.broadcast(JSON.stringify({ t: "leave", from: id }), id);
  }

  broadcast(data: string, excludeId?: string) {
    for (const ws of this.ctx.getWebSockets()) {
      const { id } = (ws.deserializeAttachment() as ConnAttachment) || {};
      if (id !== excludeId) ws.send(data);
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    const visionMatch = url.pathname.match(/^\/board\/([A-Za-z0-9_-]+)\/vision$/);
    if (visionMatch) {
      const stub = env.BOARD.getByName(visionMatch[1]);
      return stub.fetch(request);
    }

    const wsMatch = url.pathname.match(/^\/board\/([A-Za-z0-9_-]+)$/);
    if (!wsMatch || request.headers.get("Upgrade") !== "websocket") {
      return new Response("Sticky Notes realtime server. Connect via WebSocket to /board/<board-id>.", {
        status: wsMatch ? 426 : 404,
      });
    }
    const stub = env.BOARD.getByName(wsMatch[1]);
    return stub.fetch(request);
  },
};
