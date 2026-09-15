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
 * those ids refer to. A "person" field's value is a user id, resolved
 * against the roster below.
 *   delete: { t: "delete", id }
 *   clear:  { t: "clear" }
 *   cursor: { t: "cursor", x, y, color }  (never persisted)
 *   fields: { t: "fields", fields }  -- replaces the board's whole custom
 *     field schema (an array the client defines: name/type/options per
 *     field). Stored separately from notes so "clear" (which only wipes
 *     notes) leaves field definitions in place. A new connection receives
 *     the current schema alongside note (and zone) history: { t: "history",
 *     notes, zones, fields, users, online, background }.
 *   identity: { t: "identity", id, name, initials, color } -- a per-browser
 *     display identity (see script.js), not an account: no password, no
 *     server-side verification, just whatever the sending client claims.
 *     Sent once when a connection opens and again whenever the user edits
 *     their name/initials/color. Stored under a separate key, keyed by the
 *     client-generated user id, so the board accumulates a roster of
 *     everyone who's used it (`users` in the history message) -- this is
 *     what lets a "Person" custom field offer a dropdown of the board's
 *     users instead of free text. The connection's live attachment also
 *     tracks the identity of whoever is on the other end of it, so a new
 *     connection's history message can report who's online *right now*
 *     (`online`, each entry carrying the sending connection's id as
 *     `connId` so peers can map it to "leave" events) as opposed to merely
 *     who has ever visited.
 *   background: { t: "background", background }  -- sets the board's
 *     background type (a string id like "grid"/"whiteboard"/"chalkboard"/
 *     "pinboard", opaque to the server). Stored like `fields`, separately
 *     from notes, and included in the history payload as `background`.
 *
 * Zones (labeled rectangular regions, e.g. kanban columns) reuse the same
 * create/move/update/delete verbs with `kind: "zone"` added, so they're
 * stored and broadcast the same way but under their own key prefix and
 * their own history list ("zones" alongside "notes") -- and, unlike
 * "clear", they aren't touched by a plain notes-only clear.
 *   create: { t: "create", kind: "zone", id, x, y, w, h, label }
 *   move:   { t: "move", kind: "zone", id, x, y }
 *   update: { t: "update", kind: "zone", id, x?, y?, w?, h?, label? }
 *   delete: { t: "delete", kind: "zone", id }
 *
 * POST /board/<board-id>/vision is a separate, non-websocket endpoint: send
 * { image: "data:image/...;base64,..." } and get back { items: string[] }
 * extracted from a photo of a to-do list via the Anthropic API. It's gated
 * the same way the rest of the board is -- knowing the board's id -- rather
 * than requiring any accounts, since this app has none. That's obscurity,
 * not real authentication, so a per-board daily cap (VISION_DAILY_LIMIT)
 * bounds the damage if a board URL ever leaks, given the endpoint spends
 * the shared ANTHROPIC_API_KEY on every call.
 *
 * POST /board/<board-id>/view-link mints (or returns the board's existing)
 * read-only viewer token and registers it with the ViewRegistry DO below,
 * responding with { token }. Connecting a WebSocket to /view/<token> instead
 * of /board/<board-id> resolves the token back to this board through that
 * registry and joins read-only: the server tags the connection and silently
 * drops any message from it that would mutate the board (see
 * READ_ONLY_BLOCKED_TYPES in webSocketMessage below), independent of
 * whatever the client-side UI does or doesn't show. The token is a separate
 * secret from the board id -- unlike the board id itself, knowing it never
 * lets you derive or recover the edit-capable board id, so sharing a
 * read-only link doesn't hand out edit access the way sharing the board's
 * own URL would.
 */

interface Env {
  BOARD: DurableObjectNamespace<NotesBoard>;
  REGISTRY: DurableObjectNamespace<ViewRegistry>;
  ANTHROPIC_API_KEY?: string;
}

const NOTE_PREFIX = "note:";
const ZONE_PREFIX = "zone:";
const USER_PREFIX = "user:";
const FIELDS_KEY = "schema:fields";
const BACKGROUND_KEY = "schema:background";
const VIEW_TOKEN_KEY = "meta:viewToken";
const MAX_NOTES = 2000;
const MAX_ZONES = 200;
const MAX_USERS = 500;
const VISION_DAILY_LIMIT = 30;
// Message types a read-only ("view") connection is never allowed to send --
// everything that would mutate shared board state. "cursor" and "identity"
// are left out on purpose: a viewer's live cursor and self-reported
// name/initials/color are harmless presence info, not board content.
const READ_ONLY_BLOCKED_TYPES = new Set(["create", "move", "update", "delete", "clear", "fields", "background"]);
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
type Identity = { id: string } & Record<string, unknown>;
type ConnAttachment = { id: string; identity?: Identity; readOnly?: boolean };
type Note = { id: string } & Record<string, unknown>;

/**
 * A single global Durable Object (always addressed by the fixed name
 * "global") mapping read-only view tokens to the board id they were minted
 * for. Kept separate from NotesBoard because a token needs to be resolved
 * to a board *before* we know which NotesBoard instance to talk to -- this
 * is the only piece of shared state not scoped to one board.
 */
export class ViewRegistry extends DurableObject<Env> {
  async register(token: string, boardId: string): Promise<void> {
    await this.ctx.storage.put(token, boardId);
  }

  async resolve(token: string): Promise<string | undefined> {
    return (await this.ctx.storage.get(token)) as string | undefined;
  }

  async unregister(token: string): Promise<void> {
    await this.ctx.storage.delete(token);
  }
}

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
    if (url.pathname.endsWith("/view-link")) {
      return this.handleViewLink(request);
    }

    const readOnly = url.searchParams.get("ro") === "1";
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const id = crypto.randomUUID();
    server.serializeAttachment({ id, readOnly } satisfies ConnAttachment);
    this.ctx.acceptWebSocket(server);

    const [storedNotes, storedZones, fields, storedUsers, background] = await Promise.all([
      this.ctx.storage.list({ prefix: NOTE_PREFIX }),
      this.ctx.storage.list({ prefix: ZONE_PREFIX }),
      this.ctx.storage.get(FIELDS_KEY) as Promise<unknown[] | undefined>,
      this.ctx.storage.list({ prefix: USER_PREFIX }),
      this.ctx.storage.get(BACKGROUND_KEY) as Promise<string | undefined>,
    ]);
    const notes = [...storedNotes.values()];
    const zones = [...storedZones.values()];
    const users = [...storedUsers.values()];
    const online = this.ctx
      .getWebSockets()
      .map((s) => {
        const att = s.deserializeAttachment() as ConnAttachment | null;
        return att && att.identity ? { ...att.identity, connId: att.id } : null;
      })
      .filter(Boolean);
    server.send(
      JSON.stringify({
        t: "history",
        notes,
        zones,
        fields: fields || [],
        users,
        online,
        background: background || "grid",
      })
    );

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

  /** Mints (or returns the board's existing) read-only view token and
   * records it in the ViewRegistry so /view/<token> can resolve back to
   * this board. The token is stored on the board itself so repeated calls
   * (e.g. re-opening the menu) return the same shareable link rather than
   * minting a fresh one -- and, unlike a plain note or field, it survives
   * "Clear Board", which only wipes notes. */
  async handleViewLink(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
    if (request.method === "DELETE") return this.handleViewLinkRevoke();
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

    const match = new URL(request.url).pathname.match(/^\/board\/([A-Za-z0-9_-]+)\/view-link$/);
    if (!match) return jsonResponse({ error: "Malformed request." }, 400);
    const boardId = match[1];

    let token = (await this.ctx.storage.get(VIEW_TOKEN_KEY)) as string | undefined;
    if (!token) {
      token = crypto.randomUUID().replace(/-/g, "");
      await this.ctx.storage.put(VIEW_TOKEN_KEY, token);
    }
    await this.env.REGISTRY.getByName("global").register(token, boardId);
    return jsonResponse({ token });
  }

  /** Un-mints this board's read-only view token, if it has one: forgets it
   * from the ViewRegistry (so /view/<old-token> immediately 404s, and can
   * never be reused even if the same token were somehow minted again) and
   * drops any already-connected read-only sockets, so a revoke also
   * disconnects anyone currently watching rather than just blocking new
   * joins. The next "Copy Read-only Link" mints an unrelated fresh token. */
  async handleViewLinkRevoke(): Promise<Response> {
    const token = (await this.ctx.storage.get(VIEW_TOKEN_KEY)) as string | undefined;
    if (token) {
      await this.ctx.storage.delete(VIEW_TOKEN_KEY);
      await this.env.REGISTRY.getByName("global").unregister(token);
    }
    for (const ws of this.ctx.getWebSockets()) {
      const att = ws.deserializeAttachment() as ConnAttachment | null;
      if (!att || !att.readOnly) continue;
      try {
        ws.close(1000, "Read-only link revoked.");
      } catch {
        // Already closing/closed -- nothing to do.
      }
    }
    return jsonResponse({ ok: true });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== "string") return;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(message);
    } catch {
      return;
    }
    const { id: senderId, readOnly } = (ws.deserializeAttachment() as ConnAttachment) || {};
    if (readOnly && READ_ONLY_BLOCKED_TYPES.has(data.t as string)) return;
    data.from = senderId;
    const out = JSON.stringify(data);
    const noteId = typeof data.id === "string" ? data.id : null;
    const isZone = data.kind === "zone";
    const prefix = isZone ? ZONE_PREFIX : NOTE_PREFIX;
    const maxCount = isZone ? MAX_ZONES : MAX_NOTES;

    switch (data.t) {
      case "create": {
        if (!noteId) return;
        const count = (await this.ctx.storage.list({ prefix })).size;
        if (count >= maxCount) return;
        await this.ctx.storage.put(prefix + noteId, data as Note);
        this.broadcast(out, senderId);
        break;
      }
      case "move":
      case "update": {
        if (!noteId) return;
        const existing = (await this.ctx.storage.get(prefix + noteId)) as Note | undefined;
        if (!existing) return;
        const merged = { ...existing, ...data };
        await this.ctx.storage.put(prefix + noteId, merged);
        this.broadcast(out, senderId);
        break;
      }
      case "delete": {
        if (!noteId) return;
        await this.ctx.storage.delete(prefix + noteId);
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
      case "identity": {
        const userId = noteId;
        if (!userId) return;
        const attachment = (ws.deserializeAttachment() as ConnAttachment) || { id: senderId };
        ws.serializeAttachment({ ...attachment, identity: data as Identity });
        const known = await this.ctx.storage.get(USER_PREFIX + userId);
        if (known || (await this.ctx.storage.list({ prefix: USER_PREFIX })).size < MAX_USERS) {
          await this.ctx.storage.put(USER_PREFIX + userId, data as Identity);
        }
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

    const viewLinkMatch = url.pathname.match(/^\/board\/([A-Za-z0-9_-]+)\/view-link$/);
    if (viewLinkMatch) {
      const stub = env.BOARD.getByName(viewLinkMatch[1]);
      return stub.fetch(request);
    }

    const viewMatch = url.pathname.match(/^\/view\/([A-Za-z0-9_-]+)$/);
    if (viewMatch) {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Sticky Notes realtime server. Connect via WebSocket to /view/<token>.", { status: 426 });
      }
      const boardId = await env.REGISTRY.getByName("global").resolve(viewMatch[1]);
      if (!boardId) {
        return new Response("This read-only link doesn't match any board.", { status: 404 });
      }
      const innerUrl = new URL(request.url);
      innerUrl.pathname = `/board/${boardId}`;
      innerUrl.searchParams.set("ro", "1");
      const stub = env.BOARD.getByName(boardId);
      return stub.fetch(new Request(innerUrl.toString(), request));
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
