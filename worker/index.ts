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
 *   create: { t: "create", id, x, y, w, h, color, text, font?, rot, z }
 *   move:   { t: "move", id, x, y, z }
 *   update: { t: "update", id, text?, color?, font?, w?, h?, z? }
 *   delete: { t: "delete", id }
 *   clear:  { t: "clear" }
 *   cursor: { t: "cursor", x, y, color }  (never persisted)
 */

interface Env {
  BOARD: DurableObjectNamespace<NotesBoard>;
}

const NOTE_PREFIX = "note:";
const MAX_NOTES = 2000;
type ConnAttachment = { id: string };
type Note = { id: string } & Record<string, unknown>;

export class NotesBoard extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    const id = crypto.randomUUID();
    server.serializeAttachment({ id } satisfies ConnAttachment);
    this.ctx.acceptWebSocket(server);

    const stored = await this.ctx.storage.list({ prefix: NOTE_PREFIX });
    const notes = [...stored.values()];
    server.send(JSON.stringify({ t: "history", notes }));

    return new Response(null, { status: 101, webSocket: client });
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
    const match = url.pathname.match(/^\/board\/([A-Za-z0-9_-]+)$/);
    if (!match || request.headers.get("Upgrade") !== "websocket") {
      return new Response("Sticky Notes realtime server. Connect via WebSocket to /board/<board-id>.", {
        status: match ? 426 : 404,
      });
    }
    const stub = env.BOARD.getByName(match[1]);
    return stub.fetch(request);
  },
};
