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
underline/strikethrough, headings, alignment, bullet/numbered/checklist
lists, links, images, and `<span>`s carrying only font-family/font-size/
font-weight/font-style/text-decoration/color) rather than plain text, so a
note can mix a bold heading with regular, italic, differently-sized/
-fonted/-colored/-aligned text, lists, links, and images in one body.
Because the realtime server relays whatever any peer sends without
validating it, every client runs incoming HTML (from a live peer update
*and* from a board's stored history) through an allowlist sanitizer before
ever assigning it to `innerHTML` — otherwise one malicious peer could run
script in every other viewer's tab just by joining the board. The same
sanitizer restricts links to `http(s):`/`mailto:` URLs (forcing
`target="_blank" rel="noopener noreferrer"` on every one, regardless of
what a peer's HTML said), restricts images to `data:image/...;base64,...`
URIs — never a remote `src`, which would let a peer plant a tracking pixel
that phones home to a third party the instant anyone merely opens the
board — and, for checklists, only ever accepts the literal class name
`checklist` and a `data-checked` value of `true`/`false`, never an
arbitrary attribute value from a peer's HTML.

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
- **Select multiple notes** — Ctrl/Cmd-click each note to add or remove it
  from the selection, or drag across empty board space to draw a lasso
  around a group. Drag any note in the selection to move them all together,
  each still snapping into its own zone independently on drop. Press
  **Delete**/**Backspace** to remove every selected note at once (only
  while you're not actively typing in one).
- **Edit text** — tap/click the note's body.
- **Resize a note** — drag the small grip in its bottom-right corner.
- **Recolor** — tap the ● button in a note's header for a small palette.
- **Format text** — hover a note (or tap/select it on a touch device) to
  reveal its formatting toolbar, with no dedicated button of its own on the
  note: font, size, text color, bold/italic/underline/strikethrough,
  headings, alignment, and indent/outdent. Select some text first to format
  just that part; with nothing selected, a change applies to the whole
  note. The toolbar stays open while the note is selected (i.e. while
  you're actively editing it) even if your mouse moves away; otherwise it
  follows the hover and disappears once you move on.
- **Lists** — in the same toolbar, the bullet, numbered, and checklist
  buttons turn the current line(s) into a list. Tap a checklist item's own
  checkbox (its left edge) to check it off — that toggles independently of
  placing a text cursor, the same way it works in any note-taking app.
  Indent/outdent (only enabled while your cursor is actually inside a list
  item) nest an item under the one above it.
- **Links** — select some text and tap the 🔗 button, then enter a URL to
  turn that text into a hyperlink. Links open in a new tab; inside the note
  itself, click-to-edit means you'll generally Ctrl/Cmd-click a link to
  actually follow it, same as most rich text editors.
- **Images** — tap the 🖼 button to insert a photo at your cursor (or in
  place of the current selection). Images are downscaled and recompressed
  in the browser before they're embedded, to keep notes from ballooning in
  size.
- **Your name** — tap the small circle next to ☰ to set your display name,
  two-letter initials, and a color. It's not an account (see Known
  limitations) — no password, no server-side verification, just a
  per-browser identity (saved in `localStorage`) that lets everyone else on
  the board tell who's who: it labels your live cursor, shows up in the
  presence row of avatars next to the ☰ button for everyone currently on
  the board, and is what a **Person(s)** custom field (below) offers as
  its choices. Leave it unset and you're just "Anonymous" with a random
  color — still visible to others, just not named.
- **Custom fields** — tap the 🏷 button in a note's header to set values for
  whatever metadata fields the board defines (e.g. Status, Assignee,
  Priority, Tags, Due date), shown as small colored chips on the note.
  Define the fields themselves from the hamburger menu → **Manage Fields**:
  add a field, name it, and pick a type — text, number, checkbox, date,
  single-select, multi-select (tags), or person(s) — with a few one-tap
  presets to get started. Select/multi-select fields have their own colored
  options (e.g. "To do / In progress / Done" for Status), so a board can be
  run as a lightweight kanban-style todo list. A **person(s)** field (e.g.
  "Assignee") is a select whose options aren't typed in by hand — its
  choices auto-fill with everyone who's set a name/color on this board
  (see "Your name" above), so assigning a note to someone is picking them
  from a list rather than retyping their name. Three checkboxes on the
  field itself (in Manage Fields) shape it: **allow more than one
  person**, which also exposes an **any of / all of** setting recording
  how a later filtering feature should treat a multi-person value; and
  **allow typing a name**, for assigning a note to someone who isn't using
  this board at all — shown with a dashed avatar to mark it as an
  unverified, freely-typed name rather than a real board member. Field
  definitions are shared board-wide state, just like the notes; clearing
  the board wipes notes but leaves the field definitions (and everyone's
  names) in place.
- **Background** — from the hamburger menu, pick the board's background:
  Grid (the default dotted-grid look), Whiteboard, Chalkboard, or Pinboard
  (a linen/cork texture). It's shared board-wide state, just like the
  custom fields — everyone viewing the board sees the same one.
- **Delete** — tap the × button in a note's header, or select one or more
  notes (see "Select multiple notes" above) and press Delete/Backspace.
- **Photo to notes** — tap 📷 (bottom-left, above **+**) to snap or pick a
  photo of a handwritten or printed to-do list; each item it finds
  becomes its own note, arranged in a grid at your current view.
  Requires the Worker's `ANTHROPIC_API_KEY` to be set (see Deploying).
- **Clear the board** — from the hamburger menu (☰, top right); wipes
  every note for everyone and can't be undone.
- **Pan** — hold Space and drag with a mouse (a plain drag on empty board
  space is the lasso instead — see "Select multiple notes" above); a
  two-finger drag pans on its own, no Space needed, on a trackpad or a
  touchscreen.
- **Zoom** — pinch (touch or trackpad), ctrl/cmd+scroll, or the +/−
  buttons; the ⤢ button fits everything on screen.

Not in this pass: connectors between notes — a natural next addition rather
than being folded in here. (Per-browser identity — name, initials, color,
live cursor labels, a presence row, and a Person(s) custom field built on
top of it — is covered above under "Your name" and "Custom fields"; a
board-wide custom-fields system covers todo-style status/tags the same way,
without needing real accounts.)

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

A client's chosen name/initials/color (see "Your name" above) is broadcast
once per connection and again on every edit, stored under its own key so
the board accumulates a roster of everyone who's ever used it — that
roster is what a Person(s) custom field's choices are built from. It's kept
separate from *who's currently connected*: each live connection also
tracks the identity it last announced, so a new connection's history
message can report both the all-time roster and who's online right now.
None of this is authentication — a client can claim any name it likes, the
same way it can send any note content it likes.

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
  Names/initials/colors (see "Your name" above) are entirely
  self-reported and unverified, same as everything else on a board — a
  display convenience, not an identity anyone else can trust.
- No per-user undo; deletes and clears are immediate and shared.
- Concurrent edits to the *same* note's text are last-write-wins (a rare
  collision for a hobby tool, not worth more machinery here).
- Images are embedded as inline data (not uploaded to separate storage),
  so a note's whole HTML — image included — is re-sent on every edit to
  that note. They're downscaled/recompressed client-side to stay well
  under the WebSocket message size limit, but a note with a photo in it
  is still much heavier to sync than a text-only one.
