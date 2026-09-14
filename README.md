# Sticky Notes

A live, multiplayer shared sticky-note board. Start a board, share the
link, and everyone who opens it can add, move, recolor, and edit notes
together in real time — no accounts, no sign-up.

## How it works

- Visiting the page with no `?board=` in the URL creates a brand new
  board and updates the URL with a shareable board code.
- Opening a link that already has `?board=CODE` joins that board.
  Everyone in the same board sees the same notes, live — creating,
  dragging, recoloring, editing, and deleting a note, plus each other's
  live cursors, all sync in real time over a WebSocket.
- The board is stored server-side (not just in your browser), so anyone
  who joins later sees everything already on it.

## Frontend

Plain HTML/CSS/JavaScript, no build step, no framework — `index.html`,
`style.css`, `script.js`. Notes are real DOM elements (a `contenteditable`
`<div>` inside a positioned `<div>`), not canvas pixels — that keeps text
editing, hit-testing, and styling simple, and sidesteps the whole class
of canvas-backing-store quirks (size limits, `willReadFrequently`
forcing software rendering, etc.) that a pixel-based board would run
into on some mobile browsers.

A note's content is a small, allowlisted subset of HTML (bold/italic/
underline, headings, `<span>`s carrying only font-family/font-size/
font-weight/font-style/text-decoration) rather than plain text, so a
note can mix a bold heading with regular, italic, and differently-sized
or -fonted text in one body. Because the realtime server relays
whatever any peer sends without validating it, every client runs
incoming HTML (from a live peer update *and* from a board's stored
history) through an allowlist sanitizer before ever assigning it to
`innerHTML` — otherwise one malicious peer could run script in every
other viewer's tab just by joining the board.

The board lives on a fixed-size "world" area (3000×2000 CSS px)
independent of anyone's window size, panned/zoomed via a CSS `transform`
on a single `.world` container — phones and desktops share the exact
same coordinate space, so notes always line up between devices.

### Using it

- **Add a note** — tap the **+** button (bottom-left) to drop a note in
  the middle of your current view, or double-click empty board space on
  desktop. It's focused for typing immediately.
- **Move a note** — drag its colored header strip. (The body is for
  typing; only the header initiates a drag, so starting to type never
  fights with starting to drag.)
- **Edit text** — tap/click the note's body.
- **Resize a note** — drag the small grip in its bottom-right corner.
- **Recolor** — tap the ● button in a note's header for a small palette.
- **Format text** — select some text and tap the **Aa** button in a
  note's header for bold/italic/underline, headings, a font picker
  (a real list of named fonts, not just five presets), and font size.
  With nothing selected, a change applies to the whole note.
- **Custom fields** — tap the 🏷 button in a note's header to set values for
  whatever metadata fields the board defines (e.g. Status, Assignee,
  Priority, Tags, Due date), shown as small colored chips on the note.
  Define the fields themselves from the hamburger menu → **Manage Fields**:
  add a field, name it, and pick a type — text, number, checkbox, date,
  single-select, or multi-select (tags) — with a few one-tap presets to get
  started. Select/multi-select fields have their own colored options (e.g.
  "To do / In progress / Done" for Status), so a board can be run as a
  lightweight kanban-style todo list. There are no accounts in this app (see
  Known limitations), so "Assignee" isn't tied to a real identity — it's
  just a field like any other, typically free text or a select whose
  options are the names of whoever uses the board. Field definitions are
  shared board-wide state, just like the notes; clearing the board wipes
  notes but leaves the field definitions in place.
- **Delete** — tap the × button in a note's header.
- **Photo to notes** — tap 📷 (bottom-left, above **+**) to snap or pick a
  photo of a handwritten or printed to-do list; each item it finds
  becomes its own note, arranged in a grid at your current view.
  Requires the Worker's `ANTHROPIC_API_KEY` to be set (see Deploying).
- **Clear the board** — from the hamburger menu (☰, top right); wipes
  every note for everyone and can't be undone.
- **Pan** — drag empty board space.
- **Zoom** — pinch, scroll, or the +/− buttons; the ⤢ button fits
  everything on screen.

Not in this pass: images/attachments, connectors between notes, and
per-user identity (cursors are just colored blobs, chosen randomly per
session) — natural next additions rather than being folded in here. (A
board-wide custom-fields system covers todo-style status/assignee/tags
without needing real accounts — see Custom fields above.)

## Backend: Cloudflare Workers + Durable Objects

`worker/index.ts` is a small Cloudflare Worker: one [Durable
Object](https://developers.cloudflare.com/durable-objects/) instance per
board (`NotesBoard`), addressed by board code. Unlike an append-only
event log, a board is a flat set of mutable notes keyed by id in its own
SQLite-backed storage — creating, moving, editing, and deleting a note
just writes or removes that one key, and a new connection is caught up
by sending every note as it currently stands. Live cursor positions are
relayed but never persisted. A note's custom-field values ride along as
an opaque `fields` property on the note itself (the server never inspects
note content), while the board's custom-field *definitions* — the schema
those values are validated against client-side — are stored under a
separate key so "Clear Board" (which only wipes notes) leaves them
intact, and are sent to a new connection alongside note history.

This runs on Cloudflare's **Workers Free plan** — Durable Objects
(SQLite-backed) are included at no cost, no credit card required, with
limits (100k requests/day, 5GB storage) far beyond what a hobby board
needs.

### Photo-to-notes (Claude vision)

`POST /board/<board-id>/vision` sends a photo to the Anthropic API and
returns the to-do items it finds as `{ items: string[] }`. It's a
separate, non-WebSocket route handled by the same per-board Durable
Object.

This app has no accounts, so there's no per-user login to gate this
behind. Instead it's gated the same way the rest of a board already
is: knowing the board's id. That's obscurity, not real authentication
— good enough to keep it off search engines and random scanners, not
proof against someone you shared a board link with forwarding it
further. Two things bound the damage if a link does leak:

- The API key lives only in the Worker (`ANTHROPIC_API_KEY`, set via
  `wrangler secret put`, never shipped to the browser), so a leaked
  board link can spend it but can't extract it.
- Each board is capped at 30 photo scans/day (`VISION_DAILY_LIMIT` in
  `worker/index.ts`), so a leaked link costs at most a bounded amount
  per day, not an open tap on your account.

For tighter accounting, create the key in its own [Anthropic Console
workspace](https://console.anthropic.com) with a monthly spend limit,
rather than reusing a key from a workspace used for other things.

## Local development

```
npm install
npm run dev
```

This starts `wrangler dev`, which runs the Worker (and its Durable
Object) locally — no Cloudflare account needed. Then open `index.html`
directly, or serve it with any static server (e.g. `python3 -m http.server`)
so it can reach `ws://127.0.0.1:8787`.

To test photo-to-notes locally, put `ANTHROPIC_API_KEY=sk-ant-...` in a
`.dev.vars` file in the repo root (gitignored; `wrangler dev` reads it
automatically, no `wrangler secret put` needed for local runs).

## Deploying

1. `npx wrangler login` (one-time, needs a free Cloudflare account).
2. `npx wrangler secret put ANTHROPIC_API_KEY` (one-time, only needed
   for the photo-to-notes feature) — pastes your key in without it
   touching a file or shell history. Without this the rest of the app
   works fine; the 📷 button just returns a clear "not configured" error.
3. `npm run deploy` — deploys the Worker and prints its URL, something
   like `sticky-notes.YOUR-SUBDOMAIN.workers.dev`.
4. Put that host in `index.html`'s `<meta name="worker-host">` tag.
5. Host the three static files (`index.html`, `style.css`, `script.js`)
   anywhere — GitHub Pages, Cloudflare Pages, S3, your own server. No
   build step required.
6. Whenever you redeploy after changing `style.css` or `script.js`,
   bump the `?v=N` query string on their `<link>`/`<script>` tags in
   `index.html`. Browsers and CDNs cache those files by URL, so without
   a new version number some visitors keep getting old, possibly
   mismatched copies (e.g. a cached `script.js` referencing markup a
   newer `index.html` no longer has) until their cache happens to expire.

## Known limitations

- No accounts, no moderation — anyone with the link can edit the board.
- No per-user undo; deletes and clears are immediate and shared.
- Concurrent edits to the *same* note's text are last-write-wins (a rare
  collision for a hobby tool, not worth more machinery here).
