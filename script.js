(() => {
  "use strict";

  const boardWrap = document.getElementById("boardWrap");
  const world = document.getElementById("world");
  const cursorsEl = document.getElementById("cursors");
  const addNoteBtn = document.getElementById("addNoteBtn");
  const scanBtn = document.getElementById("scanBtn");
  const photoInput = document.getElementById("photoInput");
  const addImageNoteBtn = document.getElementById("addImageNoteBtn");
  const imageNoteInput = document.getElementById("imageNoteInput");
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const fitBtn = document.getElementById("fitBtn");
  const menuBtn = document.getElementById("menuBtn");
  const menuDrawer = document.getElementById("menuDrawer");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const clearBtn = document.getElementById("clearBtn");
  const createColumnsBtn = document.getElementById("createColumnsBtn");
  const createColumnsFromFieldBtn = document.getElementById("createColumnsFromFieldBtn");
  const drawZoneBtn = document.getElementById("drawZoneBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const boardCodeEl = document.getElementById("boardCode");
  const connDot = document.getElementById("connDot");
  const colorPopover = document.getElementById("colorPopover");
  const formatToolbar = document.getElementById("formatToolbar");
  const fmtBoldBtn = document.getElementById("fmtBoldBtn");
  const fmtItalicBtn = document.getElementById("fmtItalicBtn");
  const fmtUnderlineBtn = document.getElementById("fmtUnderlineBtn");
  const fmtHeadingSelect = document.getElementById("fmtHeadingSelect");
  const fmtFontSelect = document.getElementById("fmtFontSelect");
  const fmtSizeSelect = document.getElementById("fmtSizeSelect");
  const fmtColorInput = document.getElementById("fmtColorInput");
  const fmtStrikeBtn = document.getElementById("fmtStrikeBtn");
  const fmtBulletBtn = document.getElementById("fmtBulletBtn");
  const fmtNumberBtn = document.getElementById("fmtNumberBtn");
  const fmtChecklistBtn = document.getElementById("fmtChecklistBtn");
  const fmtLinkBtn = document.getElementById("fmtLinkBtn");
  const fmtAlignSelect = document.getElementById("fmtAlignSelect");
  const fmtIndentBtn = document.getElementById("fmtIndentBtn");
  const fmtOutdentBtn = document.getElementById("fmtOutdentBtn");
  const fmtImageBtn = document.getElementById("fmtImageBtn");
  const noteImageInput = document.getElementById("noteImageInput");
  const noteFieldsPopover = document.getElementById("noteFieldsPopover");
  const manageFieldsBtn = document.getElementById("manageFieldsBtn");
  const fieldsModalBackdrop = document.getElementById("fieldsModalBackdrop");
  const fieldsModal = document.getElementById("fieldsModal");
  const fieldsModalCloseBtn = document.getElementById("fieldsModalCloseBtn");
  const fieldsList = document.getElementById("fieldsList");
  const fieldsPresets = document.getElementById("fieldsPresets");
  const addFieldBtn = document.getElementById("addFieldBtn");
  const identityBtn = document.getElementById("identityBtn");
  const identityPopover = document.getElementById("identityPopover");
  const identityNameInput = document.getElementById("identityNameInput");
  const identityInitialsInput = document.getElementById("identityInitialsInput");
  const identityColorRow = document.getElementById("identityColorRow");
  const presenceRow = document.getElementById("presenceRow");
  const bgSwatches = document.getElementById("bgSwatches");

  const WORLD_W = 3000;
  const WORLD_H = 2000;
  const MIN_SCALE = 0.25;
  const MAX_SCALE = 3;
  const NOTE_W = 180;
  const NOTE_H = 160;
  const MIN_NOTE_W = 120;
  const MIN_NOTE_H = 100;
  const MAX_NOTE_W = 640;
  const MAX_NOTE_H = 560;
  const MIN_ZONE_W = 100;
  const MIN_ZONE_H = 80;
  const ZONE_LABEL_MAX_LEN = 80;
  const ZONE_HEADER_H = 30; // px, must match .zone-header's CSS height
  const ZONE_STACK_MARGIN = 14; // gap between a zone's edge and the notes stacked inside it
  const ZONE_STACK_GAP = 12; // gap between consecutively stacked notes
  const COLORS = [
    "#fff59d", "#ffab91", "#f48fb1", "#a5d6a7", "#90caf9", "#ce93d8",
    "#ffffff", "#f7f5f0", "#f2e2c4", "#e8d0a0", "#fbe0e6", "#f5c6d3",
  ];
  const CURSOR_COLORS = ["#ff6b3d", "#4dd0e1", "#ff4d4f", "#8bc34a", "#ba68c8", "#ffd54f"];
  // How far into a checklist <li>'s left padding (where its CSS-drawn
  // checkbox lives, in style.css) a click still counts as toggling the box
  // rather than placing a text caret -- kept as an em multiple, not a fixed
  // pixel count, since note text is autofit-scaled anywhere from 13px to
  // 64px. Must match ul.checklist li's padding-left in style.css.
  const CHECKLIST_BOX_EM = 1.7;
  // A pointerdown on a note that moves less than this before pointerup is a
  // click, not a drag -- see the pointerdown/pointermove/pointerup handlers.
  const CLICK_DRAG_THRESHOLD_PX = 4;

  // Real font names, mapped to a stack with sensible cross-platform fallbacks.
  // Also doubles as the allowlist the HTML sanitizer checks font-family values against.
  const FONT_OPTIONS = [
    { label: "Handwriting", value: `"Caveat", "Comic Sans MS", "Segoe Print", cursive` },
    { label: "System Sans", value: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` },
    { label: "Arial", value: `Arial, Helvetica, sans-serif` },
    { label: "Helvetica", value: `Helvetica, Arial, sans-serif` },
    { label: "Verdana", value: `Verdana, Geneva, sans-serif` },
    { label: "Tahoma", value: `Tahoma, Geneva, sans-serif` },
    { label: "Trebuchet MS", value: `"Trebuchet MS", sans-serif` },
    { label: "Georgia", value: `Georgia, "Times New Roman", serif` },
    { label: "Times New Roman", value: `"Times New Roman", Times, serif` },
    { label: "Garamond", value: `Garamond, Baskerville, serif` },
    { label: "Courier New", value: `"Courier New", Courier, monospace` },
    { label: "Consolas", value: `Consolas, "SF Mono", monospace` },
    { label: "Comic Sans MS", value: `"Comic Sans MS", "Comic Sans", cursive` },
    { label: "Brush Script", value: `"Brush Script MT", cursive` },
    { label: "Impact", value: `Impact, Haettenschweiler, sans-serif` },
    { label: "Papyrus", value: `Papyrus, fantasy` },
  ];
  const FONT_FAMILY_ALLOW = new Set(FONT_OPTIONS.map((f) => f.value));
  const SIZE_OPTIONS = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];
  const DEFAULT_FONT_SIZE = 14;

  // ---------- HTML sanitizer ----------
  // Notes are rendered as rich HTML (contenteditable), and that HTML is relayed
  // verbatim to every other peer on the board by a Durable Object that doesn't
  // validate anything -- so any HTML from a remote peer (or from a board's
  // stored history) must be sanitized before it's ever assigned to innerHTML,
  // otherwise one malicious peer could run script in every other viewer's tab.
  const ALLOWED_TAGS = new Set([
    "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "SPAN", "BR", "DIV", "H1", "H2", "H3", "P", "A", "IMG", "UL", "OL", "LI",
  ]);
  const DROP_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "SVG", "TEMPLATE"]);
  const FONT_SIZE_RE = /^(1[0-9]|[2-9][0-9]|1[0-4][0-9])px$/;
  const FONT_WEIGHT_RE = /^(bold|normal|[1-9]00)$/;
  const FONT_STYLE_RE = /^(italic|normal)$/;
  const TEXT_DECORATION_RE = /^(underline|line-through|none)$/;
  const TEXT_ALIGN_RE = /^(left|center|right|justify)$/;
  const COLOR_RE = /^(#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\))$/;
  // Only http(s)/mailto links: anything else (javascript:, data:, etc.) could
  // run script or otherwise misbehave when clicked.
  const SAFE_HREF_RE = /^(https?:|mailto:)\S+$/i;
  // Images may only be same-document data: URIs, never a remote src -- an
  // <img src="https://..."> would silently phone home to a third party (and
  // leak the viewer's IP) the instant anyone merely opens the board.
  const SAFE_IMG_SRC_RE = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/]+=*$/;

  // Same rule as an inline <img> above, applied to a whole image note's
  // `img` field -- that field is just as opaque-and-unvalidated coming from
  // a peer or board history as any other note property, so it must be
  // checked before it's ever assigned to a real <img>'s src.
  function sanitizeImgSrc(src) {
    return typeof src === "string" && SAFE_IMG_SRC_RE.test(src) ? src : "";
  }

  function sanitizeStyle(styleText) {
    const out = [];
    for (const decl of styleText.split(";")) {
      const idx = decl.indexOf(":");
      if (idx < 0) continue;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const value = decl.slice(idx + 1).trim();
      if (prop === "font-family" && FONT_FAMILY_ALLOW.has(value)) out.push(`font-family:${value}`);
      else if (prop === "font-size" && FONT_SIZE_RE.test(value)) out.push(`font-size:${value}`);
      else if (prop === "font-weight" && FONT_WEIGHT_RE.test(value)) out.push(`font-weight:${value}`);
      else if (prop === "font-style" && FONT_STYLE_RE.test(value)) out.push(`font-style:${value}`);
      else if (prop === "text-decoration" && TEXT_DECORATION_RE.test(value)) out.push(`text-decoration:${value}`);
      else if (prop === "color" && COLOR_RE.test(value)) out.push(`color:${value}`);
      else if (prop === "text-align" && TEXT_ALIGN_RE.test(value)) out.push(`text-align:${value}`);
    }
    return out.join(";");
  }

  function sanitizeStyledElement(node) {
    const styleAttr = node.getAttribute("style");
    for (const attr of [...node.attributes]) node.removeAttribute(attr.name);
    if (styleAttr) {
      const clean = sanitizeStyle(styleAttr);
      if (clean) node.setAttribute("style", clean);
    }
  }

  // Drops a wrapper element but keeps its (already-sanitized) children --
  // used for tags this app doesn't allow, and for an <a>/<img> whose only
  // attribute (href/src) failed validation, so the link/image disappears but
  // the surrounding text a peer typed doesn't.
  function unwrapElement(parent, node) {
    sanitizeWalk(node);
    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    parent.removeChild(node);
  }

  function sanitizeWalk(parent) {
    let node = parent.firstChild;
    while (node) {
      const next = node.nextSibling;
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName;
        if (DROP_TAGS.has(tag)) {
          node.remove();
        } else if (!ALLOWED_TAGS.has(tag)) {
          unwrapElement(parent, node);
        } else if (tag === "A") {
          const href = (node.getAttribute("href") || "").trim();
          if (SAFE_HREF_RE.test(href)) {
            sanitizeStyledElement(node);
            node.setAttribute("href", href);
            // Always force these, regardless of what a peer's HTML carried --
            // contenteditable links only need to *look* like links; actually
            // following one should never happen without the safety of a new,
            // unprivileged tab.
            node.setAttribute("target", "_blank");
            node.setAttribute("rel", "noopener noreferrer");
            sanitizeWalk(node);
          } else {
            unwrapElement(parent, node);
          }
        } else if (tag === "IMG") {
          const src = (node.getAttribute("src") || "").trim();
          if (SAFE_IMG_SRC_RE.test(src)) {
            for (const attr of [...node.attributes]) node.removeAttribute(attr.name);
            node.setAttribute("src", src);
            node.setAttribute("alt", "");
          } else {
            node.remove();
          }
        } else if (tag === "UL") {
          // The only class this app ever writes is the literal string
          // "checklist" (see applyChecklist) -- anything else is dropped
          // rather than let a peer's HTML smuggle an arbitrary class name in.
          const isChecklist = node.getAttribute("class") === "checklist";
          sanitizeStyledElement(node);
          if (isChecklist) node.setAttribute("class", "checklist");
          sanitizeWalk(node);
        } else if (tag === "LI") {
          const checked = node.getAttribute("data-checked");
          sanitizeStyledElement(node);
          if (checked === "true" || checked === "false") node.setAttribute("data-checked", checked);
          sanitizeWalk(node);
        } else {
          sanitizeStyledElement(node);
          sanitizeWalk(node);
        }
      } else if (node.nodeType !== Node.TEXT_NODE) {
        node.remove();
      }
      node = next;
    }
  }

  function sanitizeHtml(html) {
    if (typeof html !== "string") return "";
    // A <template>'s content is an inert document fragment -- parsing untrusted
    // HTML into it never executes scripts or loads images, unlike a live div.
    const template = document.createElement("template");
    template.innerHTML = html;
    sanitizeWalk(template.content);
    return template.innerHTML;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function legacyTextToHtml(text) {
    return escapeHtml(text).replace(/\n/g, "<br>");
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function makeId() {
    // Avoids crypto.randomUUID for wider WebKit/webview compatibility.
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  }

  // ---------- Local identity (name, initials, color) ----------
  // Still no accounts (see README) -- this is a per-browser display
  // identity, entirely client-chosen and unauthenticated: no password, no
  // server-side verification, just whatever this client claims. It's what
  // lets peers tell each other apart (live cursor labels, a presence row of
  // who's currently on the board) and what a "Person" custom field's
  // dropdown is built from. Persisted in localStorage so it survives
  // reloads, and broadcast to the board's Durable Object -- which keeps a
  // roster of everyone who's ever used it -- whenever it's set or changed.
  const IDENTITY_KEY = "sticky-notes:identity";
  const USER_ID_KEY = "sticky-notes:userId";

  function loadOrCreateUserId() {
    try {
      let id = localStorage.getItem(USER_ID_KEY);
      if (!id) {
        id = makeId();
        localStorage.setItem(USER_ID_KEY, id);
      }
      return id;
    } catch (err) {
      return makeId(); // storage unavailable (private mode, etc.) -- session-only id
    }
  }

  function initialsFrom(name) {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "?";
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  function loadIdentity() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(IDENTITY_KEY) || "null");
    } catch (err) { /* malformed or unavailable storage -- fall back to defaults */ }
    const color =
      saved && typeof saved.color === "string" && CURSOR_COLORS.includes(saved.color)
        ? saved.color
        : CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
    const name = saved && typeof saved.name === "string" ? saved.name.trim().slice(0, 24) : "";
    const initials =
      saved && typeof saved.initials === "string" && saved.initials.trim()
        ? saved.initials.trim().slice(0, 2).toUpperCase()
        : initialsFrom(name);
    return { name, initials, color };
  }

  const myUserId = loadOrCreateUserId();
  const myIdentity = loadIdentity();

  function saveIdentity() {
    try {
      localStorage.setItem(IDENTITY_KEY, JSON.stringify(myIdentity));
    } catch (err) { /* private mode / storage full -- identity just won't persist */ }
  }

  // userId -> { name, initials, color }, board-wide; everyone who has ever
  // opened this board (named themselves or not) ends up in here, since
  // identity is broadcast once on every connect -- see MP.sendIdentity.
  const roster = new Map();
  // connection id -> userId, for whoever's connected *right now* -- drives
  // the presence row and remote cursor labels. Cleared/rebuilt on
  // (re)connect, updated live via "identity"/"leave" messages.
  const onlineConnToUser = new Map();

  function applyRosterEntry(u) {
    if (!u || typeof u.id !== "string" || !u.id) return;
    roster.set(u.id, {
      name: typeof u.name === "string" ? u.name.trim().slice(0, 24) : "",
      initials:
        typeof u.initials === "string" && u.initials.trim() ? u.initials.trim().slice(0, 2).toUpperCase() : "?",
      color: typeof u.color === "string" && CURSOR_COLORS.includes(u.color) ? u.color : CURSOR_COLORS[0],
    });
  }

  applyRosterEntry({ id: myUserId, ...myIdentity });

  function renderIdentityButton() {
    if (!identityBtn) return;
    identityBtn.textContent = myIdentity.initials;
    identityBtn.style.background = myIdentity.color;
    identityBtn.title = myIdentity.name ? `You: ${myIdentity.name} (click to edit)` : "Set your name";
  }

  function renderPresenceRow() {
    if (!presenceRow) return;
    presenceRow.innerHTML = "";
    const seen = new Set();
    const addAvatar = (userId) => {
      if (seen.has(userId)) return;
      seen.add(userId);
      const u = roster.get(userId) || { name: "", initials: "?", color: CURSOR_COLORS[0] };
      const el = document.createElement("span");
      el.className = "presence-avatar";
      el.style.background = u.color;
      el.textContent = u.initials;
      el.title = u.name || "Anonymous";
      presenceRow.appendChild(el);
    };
    addAvatar(myUserId);
    for (const userId of onlineConnToUser.values()) addAvatar(userId);
  }

  function commitIdentity() {
    saveIdentity();
    applyRosterEntry({ id: myUserId, ...myIdentity });
    renderIdentityButton();
    renderPresenceRow();
    MP.sendIdentity();
    renderAllNoteFieldRows();
    if (fieldsPopoverNoteId) renderNoteFieldsPopoverContent(fieldsPopoverNoteId);
  }

  function renderIdentityColorRow() {
    if (!identityColorRow) return;
    identityColorRow.innerHTML = "";
    for (const c of CURSOR_COLORS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "identity-color-opt" + (c === myIdentity.color ? " active" : "");
      btn.style.background = c;
      btn.addEventListener("click", () => {
        myIdentity.color = c;
        commitIdentity();
        renderIdentityColorRow();
      });
      identityColorRow.appendChild(btn);
    }
  }

  function openIdentityPopover() {
    closeMenu();
    closeColorPopover();
    closeFormatToolbar();
    closeNoteFieldsPopover();
    identityNameInput.value = myIdentity.name;
    // Leave the initials input blank (showing its "??" placeholder) unless
    // the current initials were a deliberate override -- otherwise it'd
    // look pre-filled and the name-change handler below would treat that
    // as "already customized" and stop auto-deriving from the name.
    identityInitialsInput.value = myIdentity.initials === initialsFrom(myIdentity.name) ? "" : myIdentity.initials;
    renderIdentityColorRow();
    identityPopover.hidden = false;
    const rect = identityBtn.getBoundingClientRect();
    identityPopover.style.top = rect.bottom + 6 + "px";
    identityPopover.style.right = Math.max(4, window.innerWidth - rect.right) + "px";
  }
  function closeIdentityPopover() {
    identityPopover.hidden = true;
  }

  if (identityBtn) {
    identityBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      identityPopover.hidden ? openIdentityPopover() : closeIdentityPopover();
    });
    document.addEventListener("click", (e) => {
      if (!identityPopover.hidden && !identityPopover.contains(e.target) && e.target !== identityBtn) {
        closeIdentityPopover();
      }
    });
    identityNameInput.addEventListener("change", () => {
      const hadNoInitials = !identityInitialsInput.value.trim();
      myIdentity.name = identityNameInput.value.trim().slice(0, 24);
      if (hadNoInitials) {
        myIdentity.initials = initialsFrom(myIdentity.name);
        identityInitialsInput.value = myIdentity.initials;
      }
      commitIdentity();
    });
    identityInitialsInput.addEventListener("change", () => {
      const v = identityInitialsInput.value.trim().slice(0, 2).toUpperCase();
      myIdentity.initials = v || initialsFrom(myIdentity.name);
      identityInitialsInput.value = myIdentity.initials;
      commitIdentity();
    });
  }

  renderIdentityButton();
  renderPresenceRow();

  // A handwriting font still looks too uniform if every note leans the exact
  // same way, so each note gets a small deterministic (hash of its id, so it
  // stays put across re-renders/peers) chance of a slight extra slant on top
  // of its whole-note rotation -- "sometimes", not always.
  function noteTextSlantDeg(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    h = Math.abs(h);
    if (h % 100 < 55) return 0;
    const magnitude = 1.5 + (h % 30) / 10; // ~1.5deg - 4.4deg
    return h % 2 === 0 ? magnitude : -magnitude;
  }

  // ---------- Autofit: scale note text as big as will still fit the box ----------
  const AUTOFIT_MIN_PX = 13;
  const AUTOFIT_MAX_PX = 64;
  const autofitScheduled = new Set();

  function autofitNoteText(id) {
    const refs = noteEls.get(id);
    if (!refs || !refs.editor || !refs.editor.isConnected) return;
    const el = refs.editor;
    let lo = AUTOFIT_MIN_PX, hi = AUTOFIT_MAX_PX, best = AUTOFIT_MIN_PX;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      el.style.fontSize = mid + "px";
      const fits = el.scrollHeight <= el.clientHeight + 1 && el.scrollWidth <= el.clientWidth + 1;
      if (fits) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    el.style.fontSize = best + "px";
  }

  // Coalesces bursts of triggers (fast typing, a resize drag) into one
  // measurement per frame instead of one per event.
  function scheduleAutofit(id) {
    if (!id || autofitScheduled.has(id)) return;
    autofitScheduled.add(id);
    requestAnimationFrame(() => {
      autofitScheduled.delete(id);
      autofitNoteText(id);
    });
  }

  for (const { label, value } of FONT_OPTIONS) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    opt.style.fontFamily = value;
    fmtFontSelect.appendChild(opt);
  }
  for (const px of SIZE_OPTIONS) {
    const opt = document.createElement("option");
    opt.value = String(px);
    opt.textContent = px + "px";
    if (px === DEFAULT_FONT_SIZE) opt.selected = true;
    fmtSizeSelect.appendChild(opt);
  }

  // ---------- Camera (pan/zoom) ----------
  const camera = { x: 0, y: 0, scale: 1 };

  function viewportSize() {
    const rect = boardWrap.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  function clampCamera() {
    const { w, h } = viewportSize();
    const viewW = w / camera.scale;
    const viewH = h / camera.scale;
    const maxX = Math.max(0, WORLD_W - viewW);
    const maxY = Math.max(0, WORLD_H - viewH);
    camera.x = clamp(camera.x, 0, maxX);
    camera.y = clamp(camera.y, 0, maxY);
  }

  function applyCameraTransform() {
    camera.scale = clamp(camera.scale, MIN_SCALE, MAX_SCALE);
    clampCamera();
    world.style.transform = `scale(${camera.scale}) translate(${-camera.x}px, ${-camera.y}px)`;
  }

  function screenToWorld(clientX, clientY) {
    const rect = boardWrap.getBoundingClientRect();
    return {
      x: camera.x + (clientX - rect.left) / camera.scale,
      y: camera.y + (clientY - rect.top) / camera.scale,
    };
  }

  function visibleWorldRect() {
    const { w, h } = viewportSize();
    return { x: camera.x, y: camera.y, w: w / camera.scale, h: h / camera.scale };
  }

  function centerCamera() {
    const { w, h } = viewportSize();
    camera.scale = 1;
    camera.x = WORLD_W / 2 - w / 2 / camera.scale;
    camera.y = WORLD_H / 2 - h / 2 / camera.scale;
    applyCameraTransform();
  }

  function fitToScreen() {
    const { w, h } = viewportSize();
    camera.scale = clamp(Math.min(w / WORLD_W, h / WORLD_H), MIN_SCALE, MAX_SCALE);
    camera.x = 0;
    camera.y = 0;
    applyCameraTransform();
  }

  function zoomAround(clientX, clientY, factor) {
    const before = screenToWorld(clientX, clientY);
    camera.scale = clamp(camera.scale * factor, MIN_SCALE, MAX_SCALE);
    const rect = boardWrap.getBoundingClientRect();
    camera.x = before.x - (clientX - rect.left) / camera.scale;
    camera.y = before.y - (clientY - rect.top) / camera.scale;
    applyCameraTransform();
  }

  function zoomAroundCenter(factor) {
    const { w, h } = viewportSize();
    const rect = boardWrap.getBoundingClientRect();
    zoomAround(rect.left + w / 2, rect.top + h / 2, factor);
  }

  boardWrap.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomAround(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false }
  );

  zoomInBtn.addEventListener("click", () => zoomAroundCenter(1.3));
  zoomOutBtn.addEventListener("click", () => zoomAroundCenter(1 / 1.3));
  fitBtn.addEventListener("click", fitToScreen);
  window.addEventListener("resize", () => applyCameraTransform());

  // ---------- Hamburger menu ----------
  function openMenu() {
    closeIdentityPopover();
    menuDrawer.classList.add("open");
    menuBackdrop.classList.add("open");
  }
  function closeMenu() {
    menuDrawer.classList.remove("open");
    menuBackdrop.classList.remove("open");
  }
  menuBtn.addEventListener("click", () => {
    menuDrawer.classList.contains("open") ? closeMenu() : openMenu();
  });
  menuBackdrop.addEventListener("click", closeMenu);

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        const original = copyLinkBtn.textContent;
        copyLinkBtn.textContent = "Copied!";
        setTimeout(() => { copyLinkBtn.textContent = original; }, 1400);
      } catch (err) {
        prompt("Copy this link to invite others:", location.href);
      }
    });
  }

  clearBtn.addEventListener("click", () => {
    if (!confirm("Clear every note on this board for everyone? This can't be undone.")) return;
    clearAllNotes();
    MP.sendClear();
    closeMenu();
  });

  // ---------- Board background ----------
  // Like the custom fields schema, the chosen background is board-wide state
  // synced to every peer (see MP.sendBackground / the "background" message)
  // rather than a per-viewer preference, so everyone sees the same board.
  const BOARD_BACKGROUNDS = [
    "grid", "whiteboard", "snow", "linen", "blush",
    "plain-white", "plain-tan", "plain-pink",
    "chalkboard", "pinboard",
  ];
  let boardBackground = "grid";

  function normalizeBackground(bg) {
    return BOARD_BACKGROUNDS.includes(bg) ? bg : "grid";
  }

  function applyBoardBackground(bg) {
    boardBackground = normalizeBackground(bg);
    boardWrap.classList.remove(...BOARD_BACKGROUNDS.map((b) => "bg-" + b));
    boardWrap.classList.add("bg-" + boardBackground);
    if (bgSwatches) {
      for (const btn of bgSwatches.querySelectorAll(".bg-swatch")) {
        btn.classList.toggle("active", btn.dataset.bg === boardBackground);
      }
    }
  }

  function applyRemoteBackground(bg) {
    applyBoardBackground(bg);
  }

  if (bgSwatches) {
    bgSwatches.addEventListener("click", (e) => {
      const btn = e.target.closest(".bg-swatch");
      if (!btn) return;
      applyBoardBackground(btn.dataset.bg);
      MP.sendBackground(boardBackground);
    });
  }

  applyBoardBackground(boardBackground);

  // Lays out `count` equal-width columns spanning the whole board, used by
  // both "Create Columns..." (arbitrary names) and "Create Columns from
  // Field..." (one column per select-field option) below.
  function layoutEqualColumns(count) {
    const margin = 24;
    const gap = 16;
    const w = (WORLD_W - margin * 2 - gap * (count - 1)) / count;
    const h = WORLD_H - margin * 2;
    return Array.from({ length: count }, (_, i) => ({ x: margin + i * (w + gap), y: margin, w, h }));
  }

  createColumnsBtn.addEventListener("click", () => {
    closeMenu();
    const input = prompt("Enter column names, separated by commas:", "To do, In progress, Done");
    if (!input) return;
    const names = input.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
    if (names.length < 2) {
      alert("Enter at least 2 column names, separated by commas.");
      return;
    }
    const cols = layoutEqualColumns(names.length);
    names.forEach((name, i) => addZone(cols[i].x, cols[i].y, cols[i].w, cols[i].h, name));
  });

  // One column per option of an existing single-select field (e.g.
  // "Assignee" or "Status"), each linked to that option -- dropping a note
  // into one sets the note's field value to match, and changing the field
  // value on a note moves it into the matching column (see
  // syncNoteFieldToZone / syncZonePositionToField).
  createColumnsFromFieldBtn.addEventListener("click", () => {
    closeMenu();
    const selectFields = boardFields.filter((f) => f.type === "select" && f.options.length);
    if (!selectFields.length) {
      alert(
        'No single-select fields with options yet. Add one from the menu → Manage Fields first (e.g. the "Status" preset).'
      );
      return;
    }
    let field = selectFields[0];
    if (selectFields.length > 1) {
      const listText = selectFields.map((f, i) => `${i + 1}. ${f.name}`).join("\n");
      const input = prompt(`Create one column per option of which field?\n${listText}`, "1");
      if (input === null) return;
      field = selectFields[parseInt(input, 10) - 1];
      if (!field) {
        alert("Not a valid field number.");
        return;
      }
    }
    const cols = layoutEqualColumns(field.options.length);
    field.options.forEach((opt, i) => {
      addZone(cols[i].x, cols[i].y, cols[i].w, cols[i].h, opt.label, { fieldId: field.id, optionId: opt.id });
    });
  });

  drawZoneBtn.addEventListener("click", () => {
    closeMenu();
    drawZoneMode = true;
    boardWrap.classList.add("drawing-zone");
  });

  // ---------- Notes state ----------
  const notes = new Map(); // id -> {id,x,y,w,h,color,html,rot,z}
  const noteEls = new Map(); // id -> {el, header, editor, colorBtn}
  let zCounter = Date.now();
  let selectedId = null;

  function initialNoteHtml(note) {
    if (typeof note.html === "string") return sanitizeHtml(note.html);
    if (typeof note.text === "string") return legacyTextToHtml(note.text); // pre-rich-text notes
    return "";
  }

  // Shared by the editor's own mousedown listener (toggles the item) and the
  // boardWrap pointerdown handler (which needs to *not* treat the same click
  // as the start of a note drag) -- see their call sites.
  function checklistCheckboxHit(e) {
    const li = e.target.closest("li");
    if (!li || !li.closest("ul.checklist")) return null;
    const hitWidth = parseFloat(getComputedStyle(li).fontSize) * CHECKLIST_BOX_EM;
    return e.offsetX >= 0 && e.offsetX < hitWidth ? li : null;
  }

  function createNoteElement(note) {
    const isImage = note.kind === "image";
    const el = document.createElement("div");
    el.className = "note";
    el.dataset.id = note.id;
    el.dataset.kind = note.kind || "text";
    el.style.width = note.w + "px";
    el.style.height = note.h + "px";
    el.style.background = note.color;
    el.classList.toggle("note-bare", isImage || note.color === "transparent");

    const header = document.createElement("div");
    header.className = "note-header";
    const colorBtn = document.createElement("button");
    colorBtn.textContent = "●";
    colorBtn.title = "Color";
    header.appendChild(colorBtn);
    let replaceImageBtn = null;
    if (isImage) {
      replaceImageBtn = document.createElement("button");
      replaceImageBtn.textContent = "🖼";
      replaceImageBtn.title = "Replace image";
      header.appendChild(replaceImageBtn);
    }
    const fieldsBtn = document.createElement("button");
    fieldsBtn.textContent = "🏷";
    fieldsBtn.title = "Fields";
    fieldsBtn.style.fontSize = "10px";
    const delBtn = document.createElement("button");
    delBtn.textContent = "×";
    delBtn.title = "Delete";
    header.appendChild(fieldsBtn);
    header.appendChild(delBtn);

    const fieldsRow = document.createElement("div");
    fieldsRow.className = "note-fields-row";
    fieldsRow.hidden = true;

    // An image note swaps the contenteditable text body for a plain <img>
    // that fills the note's whole box (see .note-image/.note-bare in
    // style.css) -- everything else about it (drag/resize/rotate/z-order/
    // delete/fields, edit-mode header, and realtime sync of its position)
    // is the same generic note machinery a text note uses.
    let editor = null;
    let img = null;
    if (isImage) {
      img = document.createElement("img");
      img.className = "note-image";
      img.alt = "";
      img.draggable = false;
      img.src = sanitizeImgSrc(note.img);
    } else {
      editor = document.createElement("div");
      editor.className = "note-text";
      // Only editable in "edit mode" -- see enterEditMode/showFormatToolbarFor,
      // which flip this to "true" and back. Until then the note is a drag
      // target, not a text field (see the pointerdown handler further down).
      editor.contentEditable = "false";
      editor.dataset.placeholder = "Type…";
      editor.spellcheck = false;
      editor.innerHTML = initialNoteHtml(note);
      const slant = noteTextSlantDeg(note.id);
      if (slant) editor.style.fontStyle = `oblique ${slant}deg`;
    }

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "note-resize";
    resizeHandle.title = "Drag to resize";

    el.appendChild(header);
    el.appendChild(fieldsRow);
    el.appendChild(isImage ? img : editor);
    el.appendChild(resizeHandle);
    world.insertBefore(el, cursorsEl);

    colorBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openColorPopover(note.id);
    });
    fieldsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openNoteFieldsPopover(note.id);
    });
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteNote(note.id);
      MP.sendDelete(note.id);
    });

    if (isImage) {
      replaceImageBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        replaceNoteImage(note.id);
      });
      // No focus-based selection to wire up here (there's no editable
      // child) -- the boardWrap pointerdown handler below already selects
      // any note, image or text, on click.
    } else {
      let debounceTimer = null;
      editor.addEventListener("focus", () => selectNote(note.id));
      editor.addEventListener("input", () => {
        // Chrome leaves a stray <br> behind when the last character is deleted;
        // normalize that back to empty so the CSS placeholder shows again.
        if (editor.innerHTML === "<br>") editor.innerHTML = "";
        scheduleAutofit(note.id);
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => sendHtmlUpdate(note.id), 400);
      });
      editor.addEventListener("blur", () => {
        if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
        sendHtmlUpdate(note.id);
      });
      editor.addEventListener("paste", (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData("text/plain");
        document.execCommand("insertText", false, text);
      });
      // Checklist items store their checked state as a data attribute (see
      // applyChecklist) rather than a real <input type="checkbox">, so there's
      // nothing for contenteditable to fight over -- clicking the rendered
      // checkbox (a ::before box drawn inside the <li>'s own CHECKLIST_BOX_EM
      // of left padding, matching the CSS, so offsetX there is never negative)
      // just flips the attribute instead of placing a caret there. This works
      // whether or not the note is in edit mode -- ticking off an item
      // shouldn't require entering edit mode first -- so the boardWrap
      // pointerdown handler below checks the same hit test and steps aside
      // for it instead of starting a note drag.
      editor.addEventListener("mousedown", (e) => {
        const li = checklistCheckboxHit(e);
        if (!li || !editor.contains(li)) return;
        e.preventDefault();
        const checked = li.getAttribute("data-checked") === "true";
        li.setAttribute("data-checked", checked ? "false" : "true");
        sendHtmlUpdate(note.id);
      });
    }

    noteEls.set(note.id, { el, header, editor, colorBtn, fieldsRow, img });
    if (!isImage) autofitNoteText(note.id);
    return el;
  }

  function positionNoteEl(id) {
    const note = notes.get(id);
    const refs = noteEls.get(id);
    if (!note || !refs) return;
    refs.el.style.left = note.x + "px";
    refs.el.style.top = note.y + "px";
    refs.el.style.transform = `rotate(${note.rot}deg)`;
    refs.el.style.zIndex = note.z;
  }

  function addNoteLocally(note) {
    // A reconnect resends the whole board as a fresh "history" message
    // (see MP.handleMessage), unconditionally, for notes we may already be
    // tracking -- creating a second DOM element for an id already in
    // `notes` would leave the first one orphaned (removed from `noteEls`
    // but never removed from the page), a stuck "ghost" copy nothing can
    // select or delete. Reconcile onto the existing note/element instead.
    if (notes.has(note.id)) {
      applyRemoteNote(note);
      return;
    }
    notes.set(note.id, note);
    createNoteElement(note);
    positionNoteEl(note.id);
    renderNoteFieldRow(note.id);
    zCounter = Math.max(zCounter, note.z || 0);
  }

  function deleteNote(id) {
    notes.delete(id);
    const refs = noteEls.get(id);
    if (refs) refs.el.remove();
    noteEls.delete(id);
    if (selectedId === id) selectedId = null;
    if (fieldsPopoverNoteId === id) closeNoteFieldsPopover();
    if (editingNoteId === id || formatTargetId === id) exitEditMode(id);
  }

  function clearAllNotes() {
    for (const id of [...notes.keys()]) deleteNote(id);
  }

  // ---------- Zones (columns / custom regions) ----------
  // A zone is a labeled rectangle drawn behind the notes. Most zones are
  // purely a visual aid -- nothing tracks which notes are "inside" one.
  // A zone created via "Create Columns from Field" is the exception: it
  // carries fieldId/optionId tying it to one option of a board select
  // field, and note<->zone membership is kept in sync bidirectionally (see
  // syncNoteFieldToZone / syncZonePositionToField below) by matching each
  // note's *current position* against zone rectangles on demand -- there's
  // still no persisted note->zone link, so this only reconciles on a drag
  // drop or a field-value edit, not continuously.
  const zones = new Map(); // id -> {id,x,y,w,h,label,fieldId?,optionId?}
  const zoneEls = new Map(); // id -> {el, header, labelEl}

  function clampZoneLabel(label) {
    return String(label == null ? "" : label).trim().slice(0, ZONE_LABEL_MAX_LEN) || "Zone";
  }

  // Resolves a field-linked zone's live field/option definitions, or null
  // if the zone isn't field-linked (or the field/option it pointed to was
  // since renamed away/deleted from Manage Fields).
  function zoneFieldOption(zone) {
    if (!zone.fieldId || !zone.optionId) return null;
    const field = boardFields.find((f) => f.id === zone.fieldId);
    if (!field) return null;
    const option = findOptionDef(field, zone.optionId);
    return option ? { field, option } : null;
  }

  // Tints a field-linked zone's header with its option's color, so it's
  // visually obvious the column is wired to a field (vs. a plain column or
  // a freehand region). Safe to call on any zone; no-ops otherwise.
  function refreshZoneFieldTint(id) {
    const zone = zones.get(id);
    const refs = zoneEls.get(id);
    if (!zone || !refs) return;
    const match = zoneFieldOption(zone);
    if (match) {
      refs.header.style.background = match.option.color + "33";
      refs.header.style.borderBottomColor = match.option.color;
      refs.labelEl.title = `Tap to rename — linked to ${match.field.name}: ${match.option.label}`;
    } else {
      refs.header.style.background = "";
      refs.header.style.borderBottomColor = "";
      refs.labelEl.title = "Tap to rename";
    }
  }

  function refreshAllZoneFieldTints() {
    for (const id of zones.keys()) refreshZoneFieldTint(id);
  }

  function createZoneElement(zone) {
    const el = document.createElement("div");
    el.className = "zone";
    el.dataset.id = zone.id;
    el.style.width = zone.w + "px";
    el.style.height = zone.h + "px";

    const header = document.createElement("div");
    header.className = "zone-header";

    const labelEl = document.createElement("span");
    labelEl.className = "zone-label";
    labelEl.textContent = zone.label;
    labelEl.title = "Tap to rename";

    const delBtn = document.createElement("button");
    delBtn.className = "zone-del";
    delBtn.textContent = "×";
    delBtn.title = "Delete zone";

    header.appendChild(labelEl);
    header.appendChild(delBtn);

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "zone-resize";
    resizeHandle.title = "Drag to resize";

    el.appendChild(header);
    el.appendChild(resizeHandle);
    world.insertBefore(el, cursorsEl);

    labelEl.addEventListener("click", (e) => {
      e.stopPropagation();
      const next = prompt("Rename zone:", zone.label);
      if (next === null) return;
      setZoneLabel(zone.id, next);
    });
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteZone(zone.id);
      MP.sendZoneDelete(zone.id);
    });

    zoneEls.set(zone.id, { el, header, labelEl });
    refreshZoneFieldTint(zone.id);
    return el;
  }

  function positionZoneEl(id) {
    const zone = zones.get(id);
    const refs = zoneEls.get(id);
    if (!zone || !refs) return;
    refs.el.style.left = zone.x + "px";
    refs.el.style.top = zone.y + "px";
  }

  function addZoneLocally(zone) {
    zone.label = clampZoneLabel(zone.label);
    zones.set(zone.id, zone);
    createZoneElement(zone);
    positionZoneEl(zone.id);
  }

  // `extra` carries optional {fieldId, optionId} to link this zone (a
  // kanban-style column) to one option of a board select field.
  function addZone(x, y, w, h, label, extra) {
    const id = makeId();
    const zone = { id, x, y, w, h, label: clampZoneLabel(label), ...(extra || {}) };
    addZoneLocally(zone);
    MP.sendZoneCreate(zone);
    return id;
  }

  function deleteZone(id) {
    zones.delete(id);
    const refs = zoneEls.get(id);
    if (refs) refs.el.remove();
    zoneEls.delete(id);
  }

  function setZoneLabel(id, label) {
    const zone = zones.get(id);
    if (!zone) return;
    zone.label = clampZoneLabel(label);
    const refs = zoneEls.get(id);
    if (refs) refs.labelEl.textContent = zone.label;
    MP.sendZoneUpdate(id, { label: zone.label });
  }

  function applyRemoteZone(data) {
    const zone = zones.get(data.id);
    if (!zone) return;
    Object.assign(zone, data);
    delete zone.from;
    delete zone.t;
    delete zone.kind;
    if (typeof data.label === "string") zone.label = clampZoneLabel(data.label);
    const refs = zoneEls.get(data.id);
    if (refs) {
      refs.labelEl.textContent = zone.label;
      if (typeof data.w === "number") refs.el.style.width = zone.w + "px";
      if (typeof data.h === "number") refs.el.style.height = zone.h + "px";
    }
    positionZoneEl(data.id);
    refreshZoneFieldTint(data.id);
  }

  // ---------- Zone <-> note geometry (stacking, membership, collisions) ----------
  function zoneContentRect(zone) {
    return { x: zone.x, y: zone.y + ZONE_HEADER_H, w: zone.w, h: Math.max(0, zone.h - ZONE_HEADER_H) };
  }

  function noteCenter(note) {
    return { x: note.x + note.w / 2, y: note.y + note.h / 2 };
  }

  function pointInRect(p, r) {
    return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
  }

  // A note "belongs" to whichever zone its center point falls inside --
  // the same rule used to decide field membership and stacking order. If
  // zones overlap (rare -- freehand regions can be drawn on top of each
  // other), the first one created wins, since Map iteration is insertion
  // order.
  function findContainingZone(point) {
    for (const zone of zones.values()) {
      if (pointInRect(point, zoneContentRect(zone))) return zone;
    }
    return null;
  }

  function notesInZone(zoneId, excludeNoteId) {
    const zone = zones.get(zoneId);
    if (!zone) return [];
    const r = zoneContentRect(zone);
    const result = [];
    for (const note of notes.values()) {
      if (note.id === excludeNoteId) continue;
      if (pointInRect(noteCenter(note), r)) result.push(note);
    }
    return result;
  }

  // Auto-arranges `note` into zone's stack of notes, top to bottom, single
  // column. Where it lands in the order depends on where its *dropped*
  // center point falls relative to the other notes' current centers --
  // above the first note's midpoint puts it first, below the last puts it
  // last, and between two notes' midpoints inserts it between them. Every
  // other note in the zone is repositioned to keep the stack gapless, and
  // those repositions are broadcast; the caller is responsible for
  // broadcasting `note`'s own final position.
  function snapNoteIntoZoneStack(note, zone) {
    const r = zoneContentRect(zone);
    const others = notesInZone(zone.id, note.id).sort((a, b) => a.y - b.y);
    const dropCenterY = note.y + note.h / 2;
    let insertIndex = others.length;
    for (let i = 0; i < others.length; i++) {
      if (dropCenterY < others[i].y + others[i].h / 2) {
        insertIndex = i;
        break;
      }
    }
    others.splice(insertIndex, 0, note);
    let y = r.y + ZONE_STACK_MARGIN;
    for (const n of others) {
      n.x = zone.x + Math.max(0, (zone.w - n.w) / 2);
      n.y = y;
      y += n.h + ZONE_STACK_GAP;
      positionNoteEl(n.id);
      if (n.id !== note.id) MP.sendMove(n.id, n.x, n.y, n.z);
    }
  }

  // The Option/Alt-held "manual placement" path: keeps wherever the user
  // dropped the note, just nudged fully inside the zone so it doesn't end
  // up straddling the zone's border.
  function clampNoteFullyInsideZone(note, zone) {
    const r = zoneContentRect(zone);
    note.x = clamp(note.x, r.x, Math.max(r.x, r.x + r.w - note.w));
    note.y = clamp(note.y, r.y, Math.max(r.y, r.y + r.h - note.h));
  }

  // A note that lands outside every zone (by the center-point rule) should
  // still never end up straddling a zone's border -- so if it overlaps one
  // without being "inside" it, push it out through whichever edge it's
  // penetrating the least.
  function pushNoteOutOfOverlappingZones(note) {
    for (const zone of zones.values()) {
      const r = zoneContentRect(zone);
      const overlapsX = note.x < r.x + r.w && note.x + note.w > r.x;
      const overlapsY = note.y < r.y + r.h && note.y + note.h > r.y;
      if (!(overlapsX && overlapsY)) continue;
      const penLeft = note.x + note.w - r.x;
      const penRight = r.x + r.w - note.x;
      const penTop = note.y + note.h - r.y;
      const penBottom = r.y + r.h - note.y;
      const minPen = Math.min(penLeft, penRight, penTop, penBottom);
      if (minPen === penLeft) note.x = r.x - note.w;
      else if (minPen === penRight) note.x = r.x + r.w;
      else if (minPen === penTop) note.y = r.y - note.h;
      else note.y = r.y + r.h;
    }
  }

  // ---------- Field <-> zone bidirectional sync ----------
  // Drop -> field: dropping a note into a field-linked zone sets that
  // field's value on the note to the zone's option.
  function syncNoteFieldToZone(note, zone) {
    if (!zone.fieldId || !zone.optionId) return;
    if (noteFieldValues(note)[zone.fieldId] === zone.optionId) return;
    setNoteFieldValue(note.id, zone.fieldId, zone.optionId);
  }

  // Field -> drop: changing a select field's value (from the note's fields
  // popover) moves the note into whichever zone is linked to that
  // field/option, if any -- unless it's already there, which avoids
  // undoing the drop-side sync above re-triggering a redundant relayout.
  function syncZonePositionToField(note, fieldId, value) {
    if (!value) return;
    const field = boardFields.find((f) => f.id === fieldId);
    if (!field || field.type !== "select") return;
    const targetZone = [...zones.values()].find((z) => z.fieldId === fieldId && z.optionId === value);
    if (!targetZone) return;
    const current = findContainingZone(noteCenter(note));
    if (current && current.id === targetZone.id) return;
    snapNoteIntoZoneStack(note, targetZone);
    positionNoteEl(note.id);
    MP.sendMove(note.id, note.x, note.y, note.z);
  }

  // Resolves the destination of a note drag once the pointer is released:
  // finds which zone (if any) the note's dropped center point landed in,
  // arranges it there (auto-stacked, or just clamped-in-bounds if Option/
  // Alt is held), keeps a field-linked zone's field in sync, and otherwise
  // makes sure the note isn't left straddling some other zone's border.
  function finalizeNoteDrop(id, altPlacement) {
    const note = notes.get(id);
    if (!note) return;
    const zone = findContainingZone(noteCenter(note));
    if (zone) {
      if (altPlacement) clampNoteFullyInsideZone(note, zone);
      else snapNoteIntoZoneStack(note, zone);
      positionNoteEl(id);
      MP.sendMove(id, note.x, note.y, note.z);
      syncNoteFieldToZone(note, zone);
    } else {
      pushNoteOutOfOverlappingZones(note);
      positionNoteEl(id);
      MP.sendMove(id, note.x, note.y, note.z);
    }
  }

  function selectNote(id) {
    if (selectedId && noteEls.has(selectedId)) {
      noteEls.get(selectedId).el.classList.remove("selected");
    }
    selectedId = id;
    bringToFront(id);
    if (noteEls.has(id)) noteEls.get(id).el.classList.add("selected");
    // Moving selection to a different note (a click, a drag, a resize) means
    // we're no longer editing whatever note was previously being edited.
    if (editingNoteId && editingNoteId !== id) exitEditMode(editingNoteId);
  }

  // The note currently in "edit mode": contentEditable, I-beam cursor,
  // header (Color/Fields/Delete) visible -- see enterEditMode/exitEditMode.
  // Kept separate from formatTargetId/the toolbar's own visibility, because
  // opening the Color or Fields popover also hides the toolbar (to avoid
  // overlapping it) without leaving edit mode itself -- the header those
  // buttons live in needs to stay up while their popover is open.
  let editingNoteId = null;

  // The only way into "edit mode": clicking a note that's already selected,
  // without dragging it (see the boardWrap pointerdown/pointerup handlers
  // below). This is deliberately separate from selectNote, which also
  // happens on the *first* click (for dragging, resizing) -- edit mode is
  // reserved for when the user actually wants to type or see the format
  // toolbar. clientX/clientY, when given, are used to land the caret under
  // the click that triggered edit mode rather than always at the start of
  // the text.
  function enterEditMode(id, clientX, clientY) {
    selectNote(id);
    const refs = noteEls.get(id);
    if (!refs) return;
    editingNoteId = id;
    refs.el.classList.add("editing");
    // An image note has no text to edit -- "edit mode" for it just means
    // revealing its header (color/replace-image/fields/delete), the same
    // class toggle a text note uses, minus everything text-specific below.
    if (!refs.editor) return;
    refs.editor.contentEditable = "true";
    scheduleAutofit(id);
    showFormatToolbarFor(id);
    refs.editor.focus();
    if (typeof clientX !== "number") return;
    const range =
      document.caretRangeFromPoint
        ? document.caretRangeFromPoint(clientX, clientY)
        : document.caretPositionFromPoint
        ? (() => {
            const pos = document.caretPositionFromPoint(clientX, clientY);
            if (!pos) return null;
            const r = document.createRange();
            r.setStart(pos.offsetNode, pos.offset);
            r.collapse(true);
            return r;
          })()
        : null;
    if (range && refs.editor.contains(range.startContainer)) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function exitEditMode(id) {
    if (editingNoteId === id) editingNoteId = null;
    if (formatTargetId === id) closeFormatToolbar();
    const refs = noteEls.get(id);
    if (!refs) return;
    refs.el.classList.remove("editing");
    if (!refs.editor) return;
    refs.editor.contentEditable = "false";
    scheduleAutofit(id);
  }

  function deselectNote() {
    if (selectedId && noteEls.has(selectedId)) {
      noteEls.get(selectedId).el.classList.remove("selected");
    }
    selectedId = null;
    closeColorPopover();
    if (editingNoteId) exitEditMode(editingNoteId);
    closeNoteFieldsPopover();
  }

  function bringToFront(id) {
    const note = notes.get(id);
    if (!note) return;
    zCounter += 1;
    note.z = zCounter;
    positionNoteEl(id);
    MP.sendUpdate(id, { z: note.z });
  }

  function setNoteColor(id, color) {
    const note = notes.get(id);
    if (!note) return;
    note.color = color;
    const refs = noteEls.get(id);
    if (refs) {
      refs.el.style.background = color;
      refs.el.classList.toggle("note-bare", note.kind === "image" || color === "transparent");
    }
    MP.sendUpdate(id, { color });
  }

  function sendHtmlUpdate(id) {
    const note = notes.get(id);
    const refs = noteEls.get(id);
    if (!note || !refs) return;
    // Sanitize what gets stored/broadcast, but never rewrite the live editor's
    // DOM here: it's already safe (paste is plain-text-only; everything else
    // comes from our own execCommand output), and replacing nodes mid-edit
    // would invalidate whatever selection a chained toolbar command needs next.
    const html = sanitizeHtml(refs.editor.innerHTML);
    note.html = html;
    delete note.text;
    MP.sendUpdate(id, { html });
  }

  function applyRemoteNote(data) {
    const note = notes.get(data.id);
    if (!note) return;
    Object.assign(note, data);
    delete note.t;
    delete note.from;
    // Sanitize immediately, regardless of whether the DOM gets touched below --
    // note.html must never hold a peer's raw HTML, even transiently, since a
    // later code path could end up rendering it as-is.
    const remoteHtml = typeof data.html === "string" ? sanitizeHtml(data.html)
      : typeof data.text === "string" ? legacyTextToHtml(data.text)
      : null;
    if (remoteHtml !== null) {
      note.html = remoteHtml;
      delete note.text;
    }
    const refs = noteEls.get(data.id);
    if (refs) {
      if (remoteHtml !== null && refs.editor && document.activeElement !== refs.editor) {
        refs.editor.innerHTML = remoteHtml;
      }
      if (typeof data.img === "string" && refs.img) {
        const src = sanitizeImgSrc(data.img);
        if (src) refs.img.src = src;
      }
      if (data.color) refs.el.style.background = data.color;
      refs.el.classList.toggle("note-bare", note.kind === "image" || note.color === "transparent");
      if (typeof data.w === "number") refs.el.style.width = data.w + "px";
      if (typeof data.h === "number") refs.el.style.height = data.h + "px";
      scheduleAutofit(data.id);
    }
    positionNoteEl(data.id);
    renderNoteFieldRow(data.id);
    if (fieldsPopoverNoteId === data.id) renderNoteFieldsPopoverContent(data.id);
    zCounter = Math.max(zCounter, note.z || 0);
  }

  const NOTE_HEADER_H = 20; // px, must match .note-header's CSS height

  // A note's DOM element is rotated a few degrees for the sticky-note look,
  // so anchorEl.getBoundingClientRect() on a header button returns the
  // *rotated* axis-aligned bounding box -- visibly larger than the header's
  // true 20px height. Computing the header's screen rect from the note's own
  // (unrotated) world position instead sidesteps that skew entirely.
  function noteHeaderScreenRect(id) {
    const note = notes.get(id);
    const wrapRect = boardWrap.getBoundingClientRect();
    const left = wrapRect.left + (note.x - camera.x) * camera.scale;
    const top = wrapRect.top + (note.y - camera.y) * camera.scale;
    return {
      left,
      top,
      right: left + note.w * camera.scale,
      bottom: top + NOTE_HEADER_H * camera.scale,
    };
  }

  // Same idea, but covering the note's whole body rather than just its
  // 20px header strip -- used to anchor the format toolbar, which (unlike
  // the color/fields popovers, still opened by clicking a small header
  // button) is itself often taller/wider than a small note, so anchoring it
  // to only the header would routinely leave it overlapping the note's own
  // text underneath.
  function noteFullScreenRect(id) {
    const note = notes.get(id);
    const wrapRect = boardWrap.getBoundingClientRect();
    const left = wrapRect.left + (note.x - camera.x) * camera.scale;
    const top = wrapRect.top + (note.y - camera.y) * camera.scale;
    return {
      left,
      top,
      right: left + note.w * camera.scale,
      bottom: top + note.h * camera.scale,
    };
  }

  // Positions a popover just outside `anchorRect` (below it if there's room,
  // above it otherwise) rather than clamping in place when there isn't --
  // clamping alone can push a tall popover up far enough to overlap the very
  // element it was anchored to.
  function positionPopoverNear(popoverEl, anchorRect) {
    popoverEl.hidden = false; // must be visible/laid out to measure
    const { width, height } = popoverEl.getBoundingClientRect();
    const wrapRect = boardWrap.getBoundingClientRect();
    const left = clamp(anchorRect.left - wrapRect.left, 4, wrapRect.width - width - 4);
    const spaceBelow = wrapRect.height - (anchorRect.bottom - wrapRect.top);
    const top =
      spaceBelow >= height + 6
        ? anchorRect.bottom - wrapRect.top + 6
        : clamp(anchorRect.top - wrapRect.top - height - 6, 4, wrapRect.height - height - 4);
    popoverEl.style.left = left + "px";
    popoverEl.style.top = top + "px";
  }

  // ---------- Color popover ----------
  let colorTargetId = null;
  function openColorPopover(id) {
    if (!colorPopover.hidden && colorTargetId === id) { closeColorPopover(); return; }
    closeFormatToolbar();
    closeNoteFieldsPopover();
    closeIdentityPopover();
    colorTargetId = id;
    positionPopoverNear(colorPopover, noteHeaderScreenRect(id));
  }
  function closeColorPopover() {
    colorPopover.hidden = true;
    colorTargetId = null;
  }
  colorPopover.addEventListener("click", (e) => {
    const btn = e.target.closest(".color-opt");
    if (!btn || !colorTargetId) return;
    setNoteColor(colorTargetId, btn.dataset.color);
    closeColorPopover();
  });

  // ---------- Format toolbar (bold/italic/underline, heading, font, size) ----------
  // Rich formatting is applied with execCommand against the browser's current
  // selection. Clicking into a <select> or a toolbar button can shift focus
  // away from the note being edited, which would otherwise lose that
  // selection -- so the last real (non-collapsed) selection made inside a
  // note's editor is cached here and restored before every command runs.
  let formatTargetId = null;
  let savedRange = null;
  let savedRangeNoteId = null;

  document.addEventListener("selectionchange", () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const container = range.commonAncestorContainer;
    const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    const editorEl = el && el.closest(".note-text");
    if (!editorEl) return;
    savedRange = range.cloneRange();
    savedRangeNoteId = editorEl.closest(".note").dataset.id;
  });

  function ensureEditableSelection(id, editorEl) {
    const sel = window.getSelection();
    if (savedRangeNoteId === id && savedRange && editorEl.contains(savedRange.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRange);
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(editorEl);
    sel.removeAllRanges();
    sel.addRange(range);
    savedRange = range.cloneRange();
    savedRangeNoteId = id;
  }

  function formatEditor() {
    const refs = formatTargetId && noteEls.get(formatTargetId);
    return refs ? refs.editor : null;
  }

  function withEditorSelection(fn) {
    const editor = formatEditor();
    if (!editor) return;
    editor.focus();
    ensureEditableSelection(formatTargetId, editor);
    fn(editor);
    savedRange = window.getSelection().rangeCount ? window.getSelection().getRangeAt(0).cloneRange() : savedRange;
    savedRangeNoteId = formatTargetId;
    refreshToolbarState();
    scheduleAutofit(formatTargetId);
    sendHtmlUpdate(formatTargetId);
  }

  // Returns the <li> the current selection is inside, scoped to `editor` --
  // used to gate list-only commands (checklist active-state, indent/outdent)
  // so they only ever act on a real in-list cursor position, never on
  // whatever ensureEditableSelection's "nothing selected" fallback would
  // otherwise select.
  function selectionListItem(editor) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    const node = sel.getRangeAt(0).commonAncestorContainer;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    return el && editor.contains(el) ? el.closest("li") : null;
  }

  function refreshToolbarState() {
    const editor = formatEditor();
    if (!editor) return;
    fmtBoldBtn.classList.toggle("active", document.queryCommandState("bold"));
    fmtItalicBtn.classList.toggle("active", document.queryCommandState("italic"));
    fmtUnderlineBtn.classList.toggle("active", document.queryCommandState("underline"));
    fmtStrikeBtn.classList.toggle("active", document.queryCommandState("strikeThrough"));
    fmtBulletBtn.classList.toggle("active", document.queryCommandState("insertUnorderedList"));
    fmtNumberBtn.classList.toggle("active", document.queryCommandState("insertOrderedList"));
    const li = selectionListItem(editor);
    fmtChecklistBtn.classList.toggle("active", !!(li && li.closest("ul.checklist")));
    fmtIndentBtn.classList.toggle("disabled", !li);
    fmtOutdentBtn.classList.toggle("disabled", !li);
    const block = document.queryCommandValue("formatBlock").toUpperCase();
    fmtHeadingSelect.value = block === "H2" || block === "H3" ? block : "P";
    fmtAlignSelect.value = document.queryCommandState("justifyCenter")
      ? "center"
      : document.queryCommandState("justifyRight")
      ? "right"
      : document.queryCommandState("justifyFull")
      ? "justify"
      : "left";
  }

  // Replacing the <font> marker elements execCommand produces invalidates
  // whatever selection pointed into them, so every caller must re-select the
  // freshly-created spans afterward -- otherwise the *next* toolbar command
  // (e.g. size right after family) has nothing to apply to.
  function reselectSpans(spans) {
    if (!spans.length) return;
    const range = document.createRange();
    range.setStartBefore(spans[0]);
    range.setEndAfter(spans[spans.length - 1]);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function applyFontFamily(editor, cssStack) {
    const marker = "x-pending-font";
    document.execCommand("fontName", false, marker);
    const spans = [];
    editor.querySelectorAll(`font[face="${marker}"]`).forEach((f) => {
      const span = document.createElement("span");
      span.style.fontFamily = cssStack;
      while (f.firstChild) span.appendChild(f.firstChild);
      f.replaceWith(span);
      spans.push(span);
    });
    reselectSpans(spans);
  }

  function applyFontSize(editor, px) {
    document.execCommand("fontSize", false, "7");
    const spans = [];
    editor.querySelectorAll('font[size="7"]').forEach((f) => {
      const span = document.createElement("span");
      span.style.fontSize = px + "px";
      while (f.firstChild) span.appendChild(f.firstChild);
      f.replaceWith(span);
      spans.push(span);
    });
    reselectSpans(spans);
  }

  function applyTextColor(editor, hex) {
    document.execCommand("foreColor", false, hex);
    // Firefox emits <font color>; Chrome/Safari apply the style directly to a
    // <span> already, so only the <font> case needs normalizing to match the
    // sanitizer's allowlist (which only accepts `color` as a span style).
    const spans = [];
    editor.querySelectorAll("font[color]").forEach((f) => {
      const span = document.createElement("span");
      span.style.color = hex;
      while (f.firstChild) span.appendChild(f.firstChild);
      f.replaceWith(span);
      spans.push(span);
    });
    reselectSpans(spans);
  }

  // A checklist is a plain <ul> (so it survives round-tripping through
  // execCommand like any other list) marked with class="checklist", whose
  // <li>s carry a data-checked attribute the sanitizer allowlists -- see the
  // "Checklist item toggling" mousedown handler in createNoteElement for how
  // that attribute gets flipped. There's no native execCommand for this, so
  // it's built on top of insertUnorderedList: whichever <ul>(s) that command
  // creates (comparing before/after) are the ones just marked as a checklist.
  function applyChecklist(editor) {
    const before = new Set(editor.querySelectorAll("ul"));
    document.execCommand("insertUnorderedList");
    editor.querySelectorAll("ul").forEach((ul) => {
      if (before.has(ul)) return;
      ul.classList.add("checklist");
      ul.querySelectorAll("li").forEach((li) => {
        if (!li.hasAttribute("data-checked")) li.setAttribute("data-checked", "false");
      });
    });
  }

  fmtBoldBtn.addEventListener("mousedown", (e) => e.preventDefault());
  fmtItalicBtn.addEventListener("mousedown", (e) => e.preventDefault());
  fmtUnderlineBtn.addEventListener("mousedown", (e) => e.preventDefault());
  fmtStrikeBtn.addEventListener("mousedown", (e) => e.preventDefault());
  fmtBulletBtn.addEventListener("mousedown", (e) => e.preventDefault());
  fmtNumberBtn.addEventListener("mousedown", (e) => e.preventDefault());
  fmtChecklistBtn.addEventListener("mousedown", (e) => e.preventDefault());
  fmtLinkBtn.addEventListener("mousedown", (e) => e.preventDefault());
  fmtIndentBtn.addEventListener("mousedown", (e) => e.preventDefault());
  fmtOutdentBtn.addEventListener("mousedown", (e) => e.preventDefault());
  fmtImageBtn.addEventListener("mousedown", (e) => e.preventDefault());
  fmtBoldBtn.addEventListener("click", () => withEditorSelection(() => document.execCommand("bold")));
  fmtItalicBtn.addEventListener("click", () => withEditorSelection(() => document.execCommand("italic")));
  fmtUnderlineBtn.addEventListener("click", () => withEditorSelection(() => document.execCommand("underline")));
  fmtStrikeBtn.addEventListener("click", () => withEditorSelection(() => document.execCommand("strikeThrough")));
  fmtBulletBtn.addEventListener("click", () => withEditorSelection(() => document.execCommand("insertUnorderedList")));
  fmtNumberBtn.addEventListener("click", () => withEditorSelection(() => document.execCommand("insertOrderedList")));
  fmtChecklistBtn.addEventListener("click", () => withEditorSelection((editor) => applyChecklist(editor)));
  fmtIndentBtn.addEventListener("click", () => {
    const editor = formatEditor();
    if (!editor || !selectionListItem(editor)) return;
    withEditorSelection(() => document.execCommand("indent"));
  });
  fmtOutdentBtn.addEventListener("click", () => {
    const editor = formatEditor();
    if (!editor || !selectionListItem(editor)) return;
    withEditorSelection(() => document.execCommand("outdent"));
  });
  fmtHeadingSelect.addEventListener("change", () => {
    const tag = fmtHeadingSelect.value === "P" ? "DIV" : fmtHeadingSelect.value;
    withEditorSelection(() => document.execCommand("formatBlock", false, `<${tag}>`));
  });
  fmtAlignSelect.addEventListener("change", () => {
    const cmd = { left: "justifyLeft", center: "justifyCenter", right: "justifyRight", justify: "justifyFull" }[fmtAlignSelect.value];
    withEditorSelection(() => document.execCommand(cmd));
  });
  fmtFontSelect.addEventListener("change", () => {
    withEditorSelection((editor) => applyFontFamily(editor, fmtFontSelect.value));
  });
  fmtSizeSelect.addEventListener("change", () => {
    withEditorSelection((editor) => applyFontSize(editor, Number(fmtSizeSelect.value)));
  });
  fmtColorInput.addEventListener("change", () => {
    withEditorSelection((editor) => applyTextColor(editor, fmtColorInput.value));
  });

  // ---------- Links ----------
  // Only turns an existing selection into a link -- matches the toolbar's
  // "select some text first" pattern used everywhere else, and sidesteps the
  // extra UI a "no selection" insert-URL-as-text flow would need.
  fmtLinkBtn.addEventListener("click", () => {
    const editor = formatEditor();
    if (!editor) return;
    editor.focus();
    ensureEditableSelection(formatTargetId, editor);
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || sel.getRangeAt(0).collapsed) {
      alert("Select some text first, then tap the link button to turn it into a hyperlink.");
      return;
    }
    const url = prompt("Link URL:", "https://");
    if (url === null) return;
    const trimmed = url.trim();
    if (!SAFE_HREF_RE.test(trimmed)) {
      alert("Links must start with http://, https://, or mailto:.");
      return;
    }
    withEditorSelection((ed) => {
      document.execCommand("createLink", false, trimmed);
      ed.querySelectorAll("a[href]").forEach((a) => {
        if (a.getAttribute("href") !== trimmed) return;
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      });
    });
  });

  // ---------- Images ----------
  // Images are embedded inline as data: URIs (never a remote src -- see the
  // sanitizer) so they work the same for every peer with no server-side
  // storage or upload endpoint of their own. Downscaled/recompressed
  // client-side (same approach as the photo-scan feature) to keep a note's
  // HTML, which is re-sent in full on every edit and capped by the
  // WebSocket/Durable-Object message size, from ballooning.
  const MAX_NOTE_IMAGE_DATA_URL_LEN = 700_000; // ~700KB of base64 text
  let imageTargetId = null;
  let imageInsertRange = null;

  fmtImageBtn.addEventListener("click", () => {
    const editor = formatEditor();
    if (!editor) return;
    imageTargetId = formatTargetId;
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editor.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      imageInsertRange = sel.getRangeAt(0).cloneRange();
    } else {
      const r = document.createRange();
      r.selectNodeContents(editor);
      r.collapse(false);
      imageInsertRange = r;
    }
    noteImageInput.value = ""; // allow re-selecting the same file twice in a row
    noteImageInput.click();
  });

  async function pickCompressedImageDataUrl(file) {
    let dataUrl = await downscaleImageToDataUrl(file, 1000, 0.72);
    if (dataUrl.length > MAX_NOTE_IMAGE_DATA_URL_LEN) {
      dataUrl = await downscaleImageToDataUrl(file, 700, 0.55);
    }
    return dataUrl;
  }

  function insertImageIntoNote(id, dataUrl) {
    const refs = noteEls.get(id);
    if (!refs) return;
    const editor = refs.editor;
    const range = imageInsertRange && editor.contains(imageInsertRange.startContainer) ? imageInsertRange : null;
    const target = range || (() => {
      const r = document.createRange();
      r.selectNodeContents(editor);
      r.collapse(false);
      return r;
    })();
    const img = document.createElement("img");
    img.src = dataUrl;
    target.deleteContents();
    target.insertNode(img);
    target.setStartAfter(img);
    target.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(target);
    editor.focus();
    if (editor.innerHTML === "<br>") editor.innerHTML = "";
    scheduleAutofit(id);
    sendHtmlUpdate(id);
  }

  noteImageInput.addEventListener("change", async () => {
    const file = noteImageInput.files && noteImageInput.files[0];
    const id = imageTargetId;
    imageTargetId = null;
    if (!file || !id) return;
    fmtImageBtn.disabled = true;
    try {
      const dataUrl = await pickCompressedImageDataUrl(file);
      if (dataUrl.length > MAX_NOTE_IMAGE_DATA_URL_LEN) {
        alert("That image is too large even after compressing. Try a smaller photo.");
        return;
      }
      insertImageIntoNote(id, dataUrl);
    } catch (err) {
      alert((err && err.message) || "Couldn't insert that image.");
    } finally {
      fmtImageBtn.disabled = false;
      imageInsertRange = null;
    }
  });

  // Shows the format toolbar for a note -- only ever called by enterEditMode
  // (clicking an already-selected note), never by hover or plain selection,
  // so it doesn't pop up while the user is just dragging a note around.
  // Only ever shown for the note currently being edited (editingNoteId), but
  // gets hidden independently of edit mode itself -- e.g. while the Color or
  // Fields popover is open, to avoid overlapping it (see openColorPopover/
  // openNoteFieldsPopover) -- so it doesn't touch the `editing` class or
  // contentEditable; that's enterEditMode/exitEditMode's job.
  function showFormatToolbarFor(id) {
    if (!noteEls.has(id)) return;
    // Image notes have no rich-text editor for this toolbar to act on.
    const note = notes.get(id);
    if (note && note.kind === "image") return;
    if (formatTargetId === id && !formatToolbar.hidden) {
      refreshToolbarState();
      return;
    }
    closeColorPopover();
    closeNoteFieldsPopover();
    closeIdentityPopover();
    formatTargetId = id;
    positionPopoverNear(formatToolbar, noteFullScreenRect(id));
    refreshToolbarState();
  }

  function closeFormatToolbar() {
    formatToolbar.hidden = true;
    formatTargetId = null;
  }

  // ---------- Custom fields (metadata) ----------
  // Boards can define their own metadata fields -- status, assignee, tags,
  // priority, due date, or anything else -- rather than the app hardcoding a
  // fixed set. A field definition is { id, name, type, options }; options
  // (label + color) only apply to the select/multiselect types. A note's
  // values live in note.fields[fieldId], sent and merged the same opaque way
  // as every other note property. The definitions themselves are board-wide
  // state, synced like notes but stored under a separate server-side key so
  // "Clear Board" (which only wipes notes) leaves the schema intact.
  //
  // There are still no accounts in this app (see README), but a "Person(s)"
  // field lets one of the other deliberately generic types -- select --
  // specialize: instead of the board author typing out everyone's name as
  // manual options, its choices are whoever's local identity (see "Local
  // identity" above) has ever touched this board, kept in `roster`. A
  // value is an array of entries -- see the "user field values" comment
  // below -- resolved against `roster` at render time rather than a
  // name/color baked in when set, so renaming yourself updates every note
  // you're assigned to. Three field-level settings (stored on the field
  // definition, not per note) shape it: `userMulti` allows more than one
  // person; `userMatchMode` ("any" | "all") records, for a later filtering
  // feature, whether a note should match when *any* or *all* of a
  // multi-person field's people match; `userAllowFreeText` allows typing a
  // plain name for someone not using this board at all.
  const FIELD_TYPES = [
    { id: "text", label: "Text" },
    { id: "number", label: "Number" },
    { id: "checkbox", label: "Checkbox" },
    { id: "date", label: "Date" },
    { id: "select", label: "Single select" },
    { id: "multiselect", label: "Multi-select (tags)" },
    { id: "user", label: "Person(s)" },
  ];
  const FIELD_TYPE_IDS = new Set(FIELD_TYPES.map((t) => t.id));
  const FIELD_TYPES_WITH_OPTIONS = new Set(["select", "multiselect"]);
  const OPTION_COLORS = ["#90caf9", "#a5d6a7", "#ffe082", "#ffab91", "#ce93d8", "#f48fb1", "#80cbc4", "#bcaaa4"];
  const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
  const MAX_FIELD_TEXT_LEN = 200;
  const MAX_USER_FIELD_ENTRIES = 20;

  // Ready-made fields covering the common cases (todo-style status, an
  // assignee, priority, tags, a due date) so the feature is useful the
  // moment someone opens "Manage Fields", without forcing a hardcoded set
  // on boards that want something different.
  const FIELD_PRESETS = [
    {
      name: "Status",
      type: "select",
      options: [
        { label: "To do", color: "#90caf9" },
        { label: "In progress", color: "#ffe082" },
        { label: "Done", color: "#a5d6a7" },
      ],
    },
    { name: "Assignee", type: "user", options: [], userMulti: false, userAllowFreeText: true },
    {
      name: "Priority",
      type: "select",
      options: [
        { label: "Low", color: "#a5d6a7" },
        { label: "Medium", color: "#ffe082" },
        { label: "High", color: "#ffab91" },
      ],
    },
    { name: "Tags", type: "multiselect", options: [] },
    { name: "Due date", type: "date", options: [] },
  ];

  let boardFields = []; // [{id, name, type, options: [{id, label, color}]}]
  let fieldsPopoverNoteId = null;

  function sanitizeFieldColor(c) {
    return typeof c === "string" && HEX_COLOR_RE.test(c) ? c : OPTION_COLORS[0];
  }

  // Field definitions arrive over the wire from any peer (initial history, or
  // a live "fields" broadcast) with no server-side validation, so they're
  // normalized into a known shape before ever driving rendering -- this
  // keeps a malformed or malicious payload from crashing the UI. Values are
  // only ever assigned via textContent/style-property (never innerHTML), so
  // this isn't an HTML-injection concern like note.html is; it's just
  // defensive shape-checking.
  function normalizeFieldDefs(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 40).map((f) => {
      const type = f && FIELD_TYPE_IDS.has(f.type) ? f.type : "text";
      const def = {
        id: f && typeof f.id === "string" && f.id ? f.id : makeId(),
        name: f && typeof f.name === "string" && f.name.trim() ? f.name.slice(0, 60) : "Field",
        type,
        options: [],
        // Whether this field's value shows as a chip on the note card itself
        // (see renderNoteFieldRow), as opposed to only in the note's Fields
        // popover -- off by default so a board with many fields doesn't
        // clutter every card automatically.
        showOnCard: !!(f && f.showOnCard),
      };
      if (FIELD_TYPES_WITH_OPTIONS.has(type) && f && Array.isArray(f.options)) {
        def.options = f.options.slice(0, 40).map((o) => ({
          id: o && typeof o.id === "string" && o.id ? o.id : makeId(),
          label: o && typeof o.label === "string" && o.label.trim() ? o.label.slice(0, 40) : "Option",
          color: sanitizeFieldColor(o && o.color),
        }));
      }
      if (type === "user") {
        def.userMulti = !!(f && f.userMulti);
        def.userMatchMode = f && f.userMatchMode === "all" ? "all" : "any";
        def.userAllowFreeText = !!(f && f.userAllowFreeText);
      }
      return def;
    });
  }

  // A "user" field's per-note value is an array of entries, each either a
  // roster reference ({ u: userId }, resolved against `roster` at render
  // time) or a freely-typed name ({ n: "some name" }) for someone not
  // using this board -- kept as a tagged shape rather than plain strings
  // so a typed name can never collide with a roster id. Also accepts the
  // old pre-multi shape (a bare user id string) so notes saved before this
  // existed still render.
  function normalizeUserFieldValue(value) {
    if (Array.isArray(value)) {
      return value
        .map((e) => {
          if (e && typeof e === "object") {
            if (typeof e.u === "string" && e.u) return { u: e.u };
            if (typeof e.n === "string" && e.n.trim()) return { n: e.n.trim().slice(0, 40) };
          }
          return null;
        })
        .filter(Boolean)
        .slice(0, MAX_USER_FIELD_ENTRIES);
    }
    if (typeof value === "string" && value) return [{ u: value }];
    return [];
  }

  function findOptionDef(field, id) {
    return field && field.options.find((o) => o.id === id);
  }

  function noteFieldValues(note) {
    return note && note.fields && typeof note.fields === "object" ? note.fields : {};
  }

  function commitFieldDefs() {
    MP.sendFields(boardFields);
    renderFieldsManager();
    renderAllNoteFieldRows();
    if (fieldsPopoverNoteId) renderNoteFieldsPopoverContent(fieldsPopoverNoteId);
    refreshAllZoneFieldTints();
  }

  function applyRemoteFieldDefs(fields) {
    boardFields = normalizeFieldDefs(fields);
    renderFieldsManager();
    renderAllNoteFieldRows();
    if (fieldsPopoverNoteId) renderNoteFieldsPopoverContent(fieldsPopoverNoteId);
    refreshAllZoneFieldTints();
  }

  // ---------- Per-note field chips ----------
  function makeFieldChip(text, color) {
    const chip = document.createElement("span");
    chip.className = "field-chip";
    chip.textContent = text;
    if (color) chip.style.background = color;
    return chip;
  }

  // `entry` is one normalized user-field value: { u: userId } (resolved
  // against the roster) or { n: name } (a freely-typed name with no
  // identity behind it -- shown with a dashed avatar to mark it as such).
  function makeUserChip(entry) {
    const isFreeText = !!(entry && entry.n);
    const name = isFreeText ? entry.n : (roster.get(entry && entry.u) || {}).name || "Unknown";
    const initials = isFreeText ? initialsFrom(entry.n) : (roster.get(entry.u) || {}).initials || "?";
    const color = isFreeText ? "#888" : (roster.get(entry.u) || {}).color || "#888";
    const chip = document.createElement("span");
    chip.className = "field-chip user-chip" + (isFreeText ? " user-chip-freetext" : "");
    const dot = document.createElement("span");
    dot.className = "user-chip-avatar";
    dot.style.background = color;
    dot.textContent = initials;
    chip.appendChild(dot);
    chip.appendChild(document.createTextNode(name));
    return chip;
  }

  function renderNoteFieldRow(id) {
    const note = notes.get(id);
    const refs = noteEls.get(id);
    if (!note || !refs || !refs.fieldsRow) return;
    const row = refs.fieldsRow;
    row.innerHTML = "";
    const values = noteFieldValues(note);
    let any = false;
    for (const field of boardFields) {
      if (!field.showOnCard) continue;
      const value = values[field.id];
      if (field.type === "checkbox") {
        if (!value) continue;
        any = true;
        row.appendChild(makeFieldChip("✓ " + field.name, null));
      } else if (field.type === "select") {
        if (!value) continue;
        const opt = findOptionDef(field, value);
        if (!opt) continue;
        any = true;
        row.appendChild(makeFieldChip(opt.label, opt.color));
      } else if (field.type === "multiselect") {
        if (!Array.isArray(value)) continue;
        for (const optId of value) {
          const opt = findOptionDef(field, optId);
          if (!opt) continue;
          any = true;
          row.appendChild(makeFieldChip(opt.label, opt.color));
        }
      } else if (field.type === "user") {
        for (const entry of normalizeUserFieldValue(value)) {
          any = true;
          row.appendChild(makeUserChip(entry));
        }
      } else {
        // text, number, date
        if (value === undefined || value === null || value === "") continue;
        any = true;
        row.appendChild(makeFieldChip(field.name + ": " + value, null));
      }
    }
    // Toggling the row's visibility changes how much vertical space the
    // editor below it has, so text needs to re-fit -- but only when the
    // shown/hidden state actually flips, not on every chip content update.
    const wasHidden = row.hidden;
    row.hidden = !any;
    if (wasHidden !== row.hidden) scheduleAutofit(id);
  }

  function renderAllNoteFieldRows() {
    for (const id of notes.keys()) renderNoteFieldRow(id);
  }

  // ---------- Per-note fields popover ----------
  function openNoteFieldsPopover(id) {
    if (!noteFieldsPopover.hidden && fieldsPopoverNoteId === id) { closeNoteFieldsPopover(); return; }
    closeColorPopover();
    closeFormatToolbar();
    closeIdentityPopover();
    fieldsPopoverNoteId = id;
    renderNoteFieldsPopoverContent(id);
    positionPopoverNear(noteFieldsPopover, noteHeaderScreenRect(id));
  }

  function closeNoteFieldsPopover() {
    noteFieldsPopover.hidden = true;
    fieldsPopoverNoteId = null;
  }

  function setNoteFieldValue(id, fieldId, value) {
    const note = notes.get(id);
    if (!note) return;
    if (!note.fields || typeof note.fields !== "object") note.fields = {};
    const isEmpty =
      value === "" || value === null || value === undefined || value === false || (Array.isArray(value) && !value.length);
    if (isEmpty) delete note.fields[fieldId];
    else note.fields[fieldId] = value;
    renderNoteFieldRow(id);
    MP.sendUpdate(id, { fields: note.fields });
    if (!isEmpty) syncZonePositionToField(note, fieldId, value);
  }

  // A small text input + "Add" button for typing a free-form name into a
  // "user" field that allows it. Enter or the button both commit; `onAdd`
  // receives the trimmed, non-empty name.
  function makeFreeTextAddRow(onAdd) {
    const freeRow = document.createElement("div");
    freeRow.className = "user-field-freetext-row";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Type a name…";
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn small";
    addBtn.textContent = "Add";
    const submit = () => {
      const name = input.value.trim().slice(0, 40);
      if (!name) return;
      input.value = "";
      onAdd(name);
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
    addBtn.addEventListener("click", submit);
    freeRow.appendChild(input);
    freeRow.appendChild(addBtn);
    return freeRow;
  }

  // Builds the editor for a "user" field inside the per-note fields
  // popover. Single-person fields keep the old plain-<select> feel (plus a
  // freetext input alongside it, if the field allows one); multi-person
  // fields show removable chips for whoever's already assigned plus
  // always-visible "add" controls, mirroring the multiselect option-toggle
  // pattern elsewhere in this file but with a growing roster (+ freetext)
  // instead of a fixed option list.
  function renderUserFieldEditor(id, field, entries) {
    const wrap = document.createElement("div");
    wrap.className = "user-field-editor";
    const commitAndRerender = (next) => {
      setNoteFieldValue(id, field.id, next);
      renderNoteFieldsPopoverContent(id);
      positionPopoverNear(noteFieldsPopover, noteHeaderScreenRect(id));
    };

    if (field.userMulti) {
      if (entries.length) {
        const chipsRow = document.createElement("div");
        chipsRow.className = "user-field-selected";
        entries.forEach((entry, idx) => {
          const chip = makeUserChip(entry);
          const rm = document.createElement("button");
          rm.type = "button";
          rm.className = "chip-remove";
          rm.title = "Remove";
          rm.textContent = "×";
          rm.addEventListener("click", () => commitAndRerender(entries.filter((_, i) => i !== idx)));
          chip.appendChild(rm);
          chipsRow.appendChild(chip);
        });
        wrap.appendChild(chipsRow);
      }

      const addedUserIds = new Set(entries.filter((e) => e.u).map((e) => e.u));
      const candidates = [...roster.entries()]
        .filter(([userId]) => !addedUserIds.has(userId))
        .sort((a, b) => (a[1].name || "").localeCompare(b[1].name || ""));
      const select = document.createElement("select");
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "+ Add person…";
      select.appendChild(blank);
      for (const [userId, u] of candidates) {
        const o = document.createElement("option");
        o.value = userId;
        o.textContent = (u.name || "Anonymous") + (userId === myUserId ? " (you)" : "");
        select.appendChild(o);
      }
      select.addEventListener("change", () => {
        if (!select.value) return;
        commitAndRerender([...entries, { u: select.value }]);
      });
      wrap.appendChild(select);

      if (field.userAllowFreeText) {
        wrap.appendChild(makeFreeTextAddRow((name) => commitAndRerender([...entries, { n: name }])));
      }
    } else {
      const current = entries[0] || null;
      const select = document.createElement("select");
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "— Unassigned —";
      if (!current) blank.selected = true;
      select.appendChild(blank);
      let currentInRoster = false;
      const rosterEntries = [...roster.entries()].sort((a, b) => (a[1].name || "").localeCompare(b[1].name || ""));
      for (const [userId, u] of rosterEntries) {
        const isCurrent = !!current && current.u === userId;
        if (isCurrent) currentInRoster = true;
        const o = document.createElement("option");
        o.value = userId;
        o.textContent = (u.name || "Anonymous") + (userId === myUserId ? " (you)" : "");
        if (isCurrent) o.selected = true;
        select.appendChild(o);
      }
      // A value can outlive its roster entry only if this board's roster
      // was somehow cleared server-side -- keep it selectable rather than
      // silently discarding whoever it pointed to.
      if (current && current.u && !currentInRoster) {
        const o = document.createElement("option");
        o.value = current.u;
        o.textContent = "Unknown user";
        o.selected = true;
        select.appendChild(o);
      }
      select.addEventListener("change", () => {
        commitAndRerender(select.value ? [{ u: select.value }] : []);
      });
      wrap.appendChild(select);

      if (field.userAllowFreeText) {
        const freeInput = document.createElement("input");
        freeInput.type = "text";
        freeInput.placeholder = "…or type a name";
        freeInput.value = current && current.n ? current.n : "";
        freeInput.addEventListener("change", () => {
          const name = freeInput.value.trim().slice(0, 40);
          commitAndRerender(name ? [{ n: name }] : []);
        });
        wrap.appendChild(freeInput);
      }
    }

    return wrap;
  }

  function renderNoteFieldsPopoverContent(id) {
    const note = notes.get(id);
    noteFieldsPopover.innerHTML = "";
    if (!note) return;
    if (!boardFields.length) {
      const hint = document.createElement("p");
      hint.className = "note-fields-hint";
      hint.textContent = "No fields defined yet. Add some from the menu → Manage Fields.";
      noteFieldsPopover.appendChild(hint);
      return;
    }
    const values = noteFieldValues(note);
    for (const field of boardFields) {
      const row = document.createElement("div");
      row.className = "note-field-row";
      const label = document.createElement("label");
      label.textContent = field.name;
      row.appendChild(label);

      if (field.type === "text") {
        const input = document.createElement("input");
        input.type = "text";
        input.value = typeof values[field.id] === "string" ? values[field.id] : "";
        input.addEventListener("change", () => setNoteFieldValue(id, field.id, input.value.trim().slice(0, MAX_FIELD_TEXT_LEN)));
        row.appendChild(input);
      } else if (field.type === "number") {
        const input = document.createElement("input");
        input.type = "number";
        input.value = values[field.id] !== undefined && values[field.id] !== null ? values[field.id] : "";
        input.addEventListener("change", () => setNoteFieldValue(id, field.id, input.value));
        row.appendChild(input);
      } else if (field.type === "date") {
        const input = document.createElement("input");
        input.type = "date";
        input.value = typeof values[field.id] === "string" ? values[field.id] : "";
        input.addEventListener("change", () => setNoteFieldValue(id, field.id, input.value));
        row.appendChild(input);
      } else if (field.type === "checkbox") {
        const input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!values[field.id];
        input.addEventListener("change", () => setNoteFieldValue(id, field.id, input.checked));
        row.appendChild(input);
      } else if (field.type === "select") {
        const select = document.createElement("select");
        const blank = document.createElement("option");
        blank.value = "";
        blank.textContent = "—";
        select.appendChild(blank);
        for (const opt of field.options) {
          const o = document.createElement("option");
          o.value = opt.id;
          o.textContent = opt.label;
          if (values[field.id] === opt.id) o.selected = true;
          select.appendChild(o);
        }
        select.addEventListener("change", () => setNoteFieldValue(id, field.id, select.value));
        row.appendChild(select);
      } else if (field.type === "multiselect") {
        const wrap = document.createElement("div");
        wrap.className = "note-field-options";
        const selected = new Set(Array.isArray(values[field.id]) ? values[field.id] : []);
        for (const opt of field.options) {
          const optBtn = document.createElement("button");
          optBtn.type = "button";
          optBtn.className = "option-toggle" + (selected.has(opt.id) ? " active" : "");
          optBtn.textContent = opt.label;
          optBtn.style.background = opt.color;
          optBtn.addEventListener("click", () => {
            if (selected.has(opt.id)) selected.delete(opt.id);
            else selected.add(opt.id);
            setNoteFieldValue(id, field.id, [...selected]);
            renderNoteFieldsPopoverContent(id);
            positionPopoverNear(noteFieldsPopover, noteHeaderScreenRect(id));
          });
          wrap.appendChild(optBtn);
        }
        row.appendChild(wrap);
      } else if (field.type === "user") {
        row.appendChild(renderUserFieldEditor(id, field, normalizeUserFieldValue(values[field.id])));
      }
      noteFieldsPopover.appendChild(row);
    }
  }

  // ---------- Board fields manager (defines the schema above) ----------
  function renderFieldsManager() {
    if (!fieldsList) return;
    fieldsList.innerHTML = "";
    if (!boardFields.length) {
      const empty = document.createElement("p");
      empty.className = "fields-empty-hint";
      empty.textContent = "No fields yet. Add one below, or start from a preset.";
      fieldsList.appendChild(empty);
    }
    boardFields.forEach((field) => fieldsList.appendChild(renderFieldDefRow(field)));
  }

  function renderFieldDefRow(field) {
    const row = document.createElement("div");
    row.className = "field-def-row";

    const top = document.createElement("div");
    top.className = "field-def-top";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "field-name-input";
    nameInput.value = field.name;
    nameInput.placeholder = "Field name";
    nameInput.addEventListener("change", () => {
      field.name = nameInput.value.trim().slice(0, 60) || "Field";
      commitFieldDefs();
    });

    const typeSelect = document.createElement("select");
    typeSelect.className = "field-type-select";
    for (const t of FIELD_TYPES) {
      const o = document.createElement("option");
      o.value = t.id;
      o.textContent = t.label;
      if (t.id === field.type) o.selected = true;
      typeSelect.appendChild(o);
    }
    typeSelect.addEventListener("change", () => {
      field.type = typeSelect.value;
      if (FIELD_TYPES_WITH_OPTIONS.has(field.type) && !field.options.length) {
        field.options = [{ id: makeId(), label: "Option 1", color: OPTION_COLORS[0] }];
      }
      if (field.type === "user") {
        if (field.userMulti === undefined) field.userMulti = false;
        if (!field.userMatchMode) field.userMatchMode = "any";
        if (field.userAllowFreeText === undefined) field.userAllowFreeText = false;
      }
      commitFieldDefs();
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-btn danger";
    delBtn.textContent = "×";
    delBtn.title = "Delete field";
    delBtn.addEventListener("click", () => {
      if (!confirm('Delete the "' + field.name + '" field? Notes keep their other data, but this field\'s values are lost.')) return;
      boardFields = boardFields.filter((f) => f.id !== field.id);
      commitFieldDefs();
    });

    top.appendChild(nameInput);
    top.appendChild(typeSelect);
    top.appendChild(delBtn);
    row.appendChild(top);

    const showOnCardRow = document.createElement("label");
    showOnCardRow.className = "field-checkbox-row";
    const showOnCardCb = document.createElement("input");
    showOnCardCb.type = "checkbox";
    showOnCardCb.checked = !!field.showOnCard;
    showOnCardCb.addEventListener("change", () => {
      field.showOnCard = showOnCardCb.checked;
      commitFieldDefs();
    });
    showOnCardRow.appendChild(showOnCardCb);
    showOnCardRow.appendChild(document.createTextNode(" Show on card"));
    row.appendChild(showOnCardRow);

    if (FIELD_TYPES_WITH_OPTIONS.has(field.type)) row.appendChild(renderFieldOptionsEditor(field));
    if (field.type === "user") row.appendChild(renderUserFieldSettings(field));

    return row;
  }

  // Field-level (not per-note) settings for a "user" field: whether more
  // than one person can be assigned, how a later filtering feature should
  // treat a multi-person value ("any" vs "all" of them matching), and
  // whether a plain typed name is allowed alongside real board users.
  function renderUserFieldSettings(field) {
    const wrap = document.createElement("div");
    wrap.className = "field-options-editor user-field-settings";

    const multiRow = document.createElement("label");
    multiRow.className = "field-checkbox-row";
    const multiCb = document.createElement("input");
    multiCb.type = "checkbox";
    multiCb.checked = !!field.userMulti;
    multiCb.addEventListener("change", () => {
      field.userMulti = multiCb.checked;
      commitFieldDefs();
    });
    multiRow.appendChild(multiCb);
    multiRow.appendChild(document.createTextNode(" Allow more than one person"));
    wrap.appendChild(multiRow);

    if (field.userMulti) {
      const modeRow = document.createElement("label");
      modeRow.className = "field-checkbox-row";
      modeRow.appendChild(document.createTextNode("Note matches when "));
      const modeSelect = document.createElement("select");
      modeSelect.className = "field-type-select";
      for (const [val, label] of [["any", "any of them"], ["all", "all of them"]]) {
        const o = document.createElement("option");
        o.value = val;
        o.textContent = label;
        if ((field.userMatchMode || "any") === val) o.selected = true;
        modeSelect.appendChild(o);
      }
      modeSelect.addEventListener("change", () => {
        field.userMatchMode = modeSelect.value;
        commitFieldDefs();
      });
      modeRow.appendChild(modeSelect);
      modeRow.appendChild(document.createTextNode(" match (used by filtering, later)"));
      wrap.appendChild(modeRow);
    }

    const freeRow = document.createElement("label");
    freeRow.className = "field-checkbox-row";
    const freeCb = document.createElement("input");
    freeCb.type = "checkbox";
    freeCb.checked = !!field.userAllowFreeText;
    freeCb.addEventListener("change", () => {
      field.userAllowFreeText = freeCb.checked;
      commitFieldDefs();
    });
    freeRow.appendChild(freeCb);
    freeRow.appendChild(document.createTextNode(" Allow typing a name (for people not using this board)"));
    wrap.appendChild(freeRow);

    return wrap;
  }

  function renderFieldOptionsEditor(field) {
    const wrap = document.createElement("div");
    wrap.className = "field-options-editor";
    field.options.forEach((opt) => {
      const optRow = document.createElement("div");
      optRow.className = "field-option-row";

      const swatch = document.createElement("button");
      swatch.type = "button";
      swatch.className = "color-swatch";
      swatch.style.background = opt.color;
      swatch.title = "Change color";
      swatch.addEventListener("click", () => {
        const idx = OPTION_COLORS.indexOf(opt.color);
        opt.color = OPTION_COLORS[(idx + 1) % OPTION_COLORS.length];
        commitFieldDefs();
      });

      const labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.value = opt.label;
      labelInput.addEventListener("change", () => {
        opt.label = labelInput.value.trim().slice(0, 40) || "Option";
        commitFieldDefs();
      });

      const delOptBtn = document.createElement("button");
      delOptBtn.type = "button";
      delOptBtn.className = "icon-btn danger";
      delOptBtn.textContent = "×";
      delOptBtn.title = "Delete option";
      delOptBtn.addEventListener("click", () => {
        field.options = field.options.filter((o) => o.id !== opt.id);
        commitFieldDefs();
      });

      optRow.appendChild(swatch);
      optRow.appendChild(labelInput);
      optRow.appendChild(delOptBtn);
      wrap.appendChild(optRow);
    });

    const addOptBtn = document.createElement("button");
    addOptBtn.type = "button";
    addOptBtn.className = "btn small";
    addOptBtn.textContent = "+ Add option";
    addOptBtn.addEventListener("click", () => {
      field.options.push({
        id: makeId(),
        label: "Option " + (field.options.length + 1),
        color: OPTION_COLORS[field.options.length % OPTION_COLORS.length],
      });
      commitFieldDefs();
    });
    wrap.appendChild(addOptBtn);

    return wrap;
  }

  function renderFieldsPresets() {
    if (!fieldsPresets) return;
    fieldsPresets.innerHTML = "";
    const label = document.createElement("span");
    label.className = "fields-presets-label";
    label.textContent = "Quick add:";
    fieldsPresets.appendChild(label);
    for (const preset of FIELD_PRESETS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn small";
      btn.textContent = preset.name;
      btn.addEventListener("click", () => {
        boardFields.push({
          id: makeId(),
          name: preset.name,
          type: preset.type,
          options: preset.options.map((o) => ({ id: makeId(), label: o.label, color: o.color })),
          ...(preset.type === "user"
            ? {
                userMulti: !!preset.userMulti,
                userMatchMode: preset.userMatchMode === "all" ? "all" : "any",
                userAllowFreeText: !!preset.userAllowFreeText,
              }
            : {}),
        });
        commitFieldDefs();
      });
      fieldsPresets.appendChild(btn);
    }
  }

  function openFieldsModal() {
    closeMenu();
    fieldsModal.hidden = false;
    fieldsModalBackdrop.classList.add("open");
    renderFieldsManager();
  }
  function closeFieldsModal() {
    fieldsModal.hidden = true;
    fieldsModalBackdrop.classList.remove("open");
  }
  if (manageFieldsBtn) manageFieldsBtn.addEventListener("click", openFieldsModal);
  if (fieldsModalCloseBtn) fieldsModalCloseBtn.addEventListener("click", closeFieldsModal);
  if (fieldsModalBackdrop) fieldsModalBackdrop.addEventListener("click", closeFieldsModal);
  if (addFieldBtn) {
    addFieldBtn.addEventListener("click", () => {
      boardFields.push({ id: makeId(), name: "Field " + (boardFields.length + 1), type: "text", options: [] });
      commitFieldDefs();
    });
  }
  renderFieldsPresets();

  // ---------- Adding notes ----------
  function addNote(worldX, worldY, text) {
    const id = makeId();
    zCounter += 1;
    const note = {
      id,
      x: worldX - NOTE_W / 2,
      y: worldY - NOTE_H / 2,
      w: NOTE_W,
      h: NOTE_H,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      html: text ? sanitizeHtml(legacyTextToHtml(text)) : "",
      rot: Math.round((Math.random() * 8 - 4) * 10) / 10,
      z: zCounter,
      fields: {},
    };
    addNoteLocally(note);
    MP.sendCreate(note);
    // A blank note is created for immediate typing, so it should go straight
    // into edit mode; a batch of notes from a photo scan shouldn't steal
    // focus/edit mode from any of them.
    if (!text) enterEditMode(id);
    return id;
  }

  addNoteBtn.addEventListener("click", () => {
    const vr = visibleWorldRect();
    const jitter = 24;
    addNote(
      vr.x + vr.w / 2 + (Math.random() * jitter * 2 - jitter),
      vr.y + vr.h / 2 + (Math.random() * jitter * 2 - jitter)
    );
  });

  // ---------- Image notes (a photo sitting directly on the board) ----------
  // Sized to the image's own aspect ratio (capped by MIN/MAX_NOTE_W/H) rather
  // than the fixed square a text note starts as, so a tall portrait or wide
  // landscape photo lands looking like a photo, not a cropped square.
  function addImageNote(worldX, worldY, dataUrl) {
    return new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => {
        const maxDim = 220;
        const scale = Math.min(1, maxDim / Math.max(probe.naturalWidth, probe.naturalHeight));
        const w = clamp(Math.round((probe.naturalWidth || NOTE_W) * scale), MIN_NOTE_W, MAX_NOTE_W);
        const h = clamp(Math.round((probe.naturalHeight || NOTE_H) * scale), MIN_NOTE_H, MAX_NOTE_H);
        const id = makeId();
        zCounter += 1;
        const note = {
          id,
          x: worldX - w / 2,
          y: worldY - h / 2,
          w,
          h,
          color: "transparent",
          kind: "image",
          img: dataUrl,
          rot: Math.round((Math.random() * 6 - 3) * 10) / 10,
          z: zCounter,
          fields: {},
        };
        addNoteLocally(note);
        MP.sendCreate(note);
        resolve(id);
      };
      probe.onerror = () => resolve(null);
      probe.src = dataUrl;
    });
  }

  function setNoteImage(id, dataUrl) {
    const note = notes.get(id);
    const refs = noteEls.get(id);
    if (!note || !refs || !refs.img) return;
    note.img = dataUrl;
    refs.img.src = dataUrl;
    MP.sendUpdate(id, { img: dataUrl });
  }

  let replaceImageTargetId = null;

  function replaceNoteImage(id) {
    replaceImageTargetId = id;
    imageNoteInput.value = ""; // allow re-selecting the same file twice in a row
    imageNoteInput.click();
  }

  addImageNoteBtn.addEventListener("click", () => {
    replaceImageTargetId = null;
    imageNoteInput.value = "";
    imageNoteInput.click();
  });

  imageNoteInput.addEventListener("change", async () => {
    const file = imageNoteInput.files && imageNoteInput.files[0];
    const targetId = replaceImageTargetId;
    replaceImageTargetId = null;
    if (!file) return;
    addImageNoteBtn.disabled = true;
    try {
      const dataUrl = await pickCompressedImageDataUrl(file);
      if (dataUrl.length > MAX_NOTE_IMAGE_DATA_URL_LEN) {
        alert("That image is too large even after compressing. Try a smaller photo.");
        return;
      }
      if (targetId) {
        setNoteImage(targetId, dataUrl);
      } else {
        const vr = visibleWorldRect();
        const jitter = 24;
        await addImageNote(
          vr.x + vr.w / 2 + (Math.random() * jitter * 2 - jitter),
          vr.y + vr.h / 2 + (Math.random() * jitter * 2 - jitter),
          dataUrl
        );
      }
    } catch (err) {
      alert((err && err.message) || "Couldn't add that image.");
    } finally {
      addImageNoteBtn.disabled = false;
    }
  });

  // ---------- Photo-to-notes (Claude vision) ----------
  // Arranges a batch of extracted items into a centered grid in the current
  // view, roughly square, so they land as a readable cluster rather than
  // stacked on top of each other.
  function addNotesFromTexts(items) {
    const vr = visibleWorldRect();
    const cols = Math.max(1, Math.ceil(Math.sqrt(items.length)));
    const rows = Math.ceil(items.length / cols);
    const gapX = NOTE_W + 20;
    const gapY = NOTE_H + 20;
    const startX = vr.x + vr.w / 2 - ((cols - 1) * gapX) / 2;
    const startY = vr.y + vr.h / 2 - ((rows - 1) * gapY) / 2;
    items.forEach((text, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      addNote(startX + col * gapX, startY + row * gapY, text);
    });
  }

  // Downscales/recompresses the photo client-side before upload: phone
  // camera photos can be several MB, and the model doesn't need full
  // resolution to read a to-do list, so this keeps upload time and API
  // cost down.
  function downscaleImageToDataUrl(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Couldn't read that photo."));
      };
      img.src = objectUrl;
    });
  }

  scanBtn.addEventListener("click", () => {
    if (!MP.visionUrl()) {
      alert("Multiplayer isn't configured yet, so photo scanning isn't available either — see README.md.");
      return;
    }
    photoInput.value = ""; // allow re-selecting the same file twice in a row
    photoInput.click();
  });

  photoInput.addEventListener("change", async () => {
    const file = photoInput.files && photoInput.files[0];
    const url = MP.visionUrl();
    if (!file || !url) return;

    scanBtn.disabled = true;
    const originalLabel = scanBtn.textContent;
    scanBtn.textContent = "⏳";
    try {
      const dataUrl = await downscaleImageToDataUrl(file, 1600, 0.85);
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Photo scan failed.");
      const items = Array.isArray(data.items) ? data.items : [];
      if (!items.length) {
        alert("Couldn't find any list items in that photo.");
        return;
      }
      addNotesFromTexts(items);
    } catch (err) {
      alert((err && err.message) || "Photo scan failed. Try again.");
    } finally {
      scanBtn.disabled = false;
      scanBtn.textContent = originalLabel;
    }
  });

  boardWrap.addEventListener("dblclick", (e) => {
    if (isUiChrome(e.target) || e.target.closest(".note") || e.target.closest(".zone-header") || e.target.closest(".zone-resize")) return;
    const p = screenToWorld(e.clientX, e.clientY);
    addNote(p.x, p.y);
  });

  // ---------- Pointer input: pan / drag note / pinch ----------
  const isUiChrome = (target) =>
    !!target.closest(
      ".fab, .zoom-controls, .menu-btn, .menu-drawer, .menu-backdrop, .color-popover, .format-toolbar, .note-fields-popover, .fields-modal, .fields-modal-backdrop"
    );

  const activePointers = new Map(); // pointerId -> {x,y}
  let pinch = null;
  let panPointerId = null;
  let panAnchorWorld = null;
  let dragPointerId = null;
  let dragNoteId = null;
  let dragOffset = null;
  let dragMoved = false; // whether a note drag actually relocated it -- a plain click shouldn't trigger zone snapping
  let dragStartScreen = null; // screen coords at pointerdown, for the click-vs-drag threshold
  let dragEnterEditOnClick = false; // pointerdown landed on an already-selected, not-yet-editing note -- a plain click (no drag) enters edit mode
  let lastMoveSent = 0;
  let resizePointerId = null;
  let resizeNoteId = null;
  let resizeStart = null;
  let zoneDragPointerId = null;
  let zoneDragId = null;
  let zoneDragOffset = null;
  let zoneResizePointerId = null;
  let zoneResizeId = null;
  let zoneResizeStart = null;
  let drawZoneMode = false;
  let zoneDrawPointerId = null;
  let zoneDrawStart = null;
  let zoneDrawPreviewEl = null;

  function pointDist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function pointMid(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function startPinch() {
    const pts = [...activePointers.values()];
    pinch = { startDist: pointDist(pts[0], pts[1]), startScale: camera.scale };
  }

  function updatePinch() {
    const pts = [...activePointers.values()].slice(0, 2);
    if (pts.length < 2 || !pinch) return;
    const mid = pointMid(pts[0], pts[1]);
    const ratio = pointDist(pts[0], pts[1]) / (pinch.startDist || 1);
    camera.scale = clamp(pinch.startScale * ratio, MIN_SCALE, MAX_SCALE);
    const rect = boardWrap.getBoundingClientRect();
    if (!pinch.anchorWorld) pinch.anchorWorld = screenToWorld(mid.x, mid.y);
    camera.x = pinch.anchorWorld.x - (mid.x - rect.left) / camera.scale;
    camera.y = pinch.anchorWorld.y - (mid.y - rect.top) / camera.scale;
    applyCameraTransform();
  }

  function cancelDragAndPan() {
    dragNoteId = null;
    dragPointerId = null;
    dragOffset = null;
    dragMoved = false;
    dragStartScreen = null;
    dragEnterEditOnClick = false;
    panPointerId = null;
    panAnchorWorld = null;
    resizeNoteId = null;
    resizePointerId = null;
    resizeStart = null;
    zoneDragId = null;
    zoneDragPointerId = null;
    zoneDragOffset = null;
    zoneResizeId = null;
    zoneResizePointerId = null;
    zoneResizeStart = null;
    cancelZoneDraw();
  }

  function cancelZoneDraw() {
    if (zoneDrawPreviewEl) zoneDrawPreviewEl.remove();
    zoneDrawPreviewEl = null;
    zoneDrawPointerId = null;
    zoneDrawStart = null;
  }

  boardWrap.addEventListener("pointerdown", (e) => {
    if (isUiChrome(e.target)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 2) {
      cancelDragAndPan();
      startPinch();
      return;
    }
    if (activePointers.size > 2) return;

    const resizeEl = e.target.closest(".note-resize");
    if (resizeEl) {
      const noteEl = resizeEl.closest(".note");
      const id = noteEl.dataset.id;
      const note = notes.get(id);
      if (!note) return;
      selectNote(id);
      const world = screenToWorld(e.clientX, e.clientY);
      resizeStart = { worldX: world.x, worldY: world.y, w: note.w, h: note.h };
      resizeNoteId = id;
      resizePointerId = e.pointerId;
      e.preventDefault();
      return;
    }

    // A note in edit mode only drags from its header (visible while editing
    // -- see the .editing CSS); everywhere else in it is native
    // contentEditable territory, left to the editor itself. A note that
    // isn't being edited has no header to grab, so the whole note is the
    // drag target instead -- except a checklist checkbox hit, which the
    // editor's own mousedown listener needs to toggle instead of the note
    // starting a drag. Either way this only *arms* a drag; the
    // pointermove/pointerup handlers below decide whether the pointer
    // actually moved enough to count as one, or whether it was a plain
    // click (which selects the note, and enters edit mode if it was
    // already selected -- see dragEnterEditOnClick).
    const noteHit = e.target.closest(".note");
    if (noteHit) {
      const id = noteHit.dataset.id;
      const note = notes.get(id);
      if (!note) return;
      const editing = editingNoteId === id;
      if (editing) {
        const headerEl = e.target.closest(".note-header");
        if (!headerEl || e.target.closest("button")) return;
      } else if (checklistCheckboxHit(e)) {
        return;
      }
      const wasAlreadySelected = selectedId === id;
      selectNote(id);
      const world = screenToWorld(e.clientX, e.clientY);
      dragOffset = { x: world.x - note.x, y: world.y - note.y };
      dragNoteId = id;
      dragPointerId = e.pointerId;
      dragMoved = false;
      dragStartScreen = { x: e.clientX, y: e.clientY };
      dragEnterEditOnClick = !editing && wasAlreadySelected;
      e.preventDefault();
      return;
    }

    const zoneHeaderEl = e.target.closest(".zone-header");
    if (zoneHeaderEl && !e.target.closest("button") && !e.target.closest(".zone-label")) {
      const zoneEl = zoneHeaderEl.closest(".zone");
      const id = zoneEl.dataset.id;
      const zone = zones.get(id);
      if (!zone) return;
      const world = screenToWorld(e.clientX, e.clientY);
      zoneDragOffset = { x: world.x - zone.x, y: world.y - zone.y };
      zoneDragId = id;
      zoneDragPointerId = e.pointerId;
      e.preventDefault();
      return;
    }

    const zoneResizeEl = e.target.closest(".zone-resize");
    if (zoneResizeEl) {
      const zoneEl = zoneResizeEl.closest(".zone");
      const id = zoneEl.dataset.id;
      const zone = zones.get(id);
      if (!zone) return;
      const world = screenToWorld(e.clientX, e.clientY);
      zoneResizeStart = { worldX: world.x, worldY: world.y, w: zone.w, h: zone.h };
      zoneResizeId = id;
      zoneResizePointerId = e.pointerId;
      e.preventDefault();
      return;
    }

    if (drawZoneMode) {
      const p = screenToWorld(e.clientX, e.clientY);
      zoneDrawStart = p;
      zoneDrawPointerId = e.pointerId;
      zoneDrawPreviewEl = document.createElement("div");
      zoneDrawPreviewEl.className = "zone-draw-preview";
      zoneDrawPreviewEl.style.left = p.x + "px";
      zoneDrawPreviewEl.style.top = p.y + "px";
      zoneDrawPreviewEl.style.width = "0px";
      zoneDrawPreviewEl.style.height = "0px";
      world.insertBefore(zoneDrawPreviewEl, cursorsEl);
      e.preventDefault();
      return;
    }

    panPointerId = e.pointerId;
    panAnchorWorld = screenToWorld(e.clientX, e.clientY);
    deselectNote();
  });

  window.addEventListener("pointermove", (e) => {
    if (activePointers.has(e.pointerId)) {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }
    if (activePointers.size >= 2) {
      updatePinch();
      return;
    }

    if (dragNoteId && e.pointerId === dragPointerId) {
      const note = notes.get(dragNoteId);
      if (!note) return;
      if (!dragMoved) {
        if (pointDist({ x: e.clientX, y: e.clientY }, dragStartScreen) < CLICK_DRAG_THRESHOLD_PX) return;
        dragMoved = true;
        const refs = noteEls.get(dragNoteId);
        if (refs) refs.el.classList.add("dragging");
      }
      const world = screenToWorld(e.clientX, e.clientY);
      note.x = world.x - dragOffset.x;
      note.y = world.y - dragOffset.y;
      positionNoteEl(dragNoteId);
      const now = performance.now();
      if (now - lastMoveSent > 60) {
        MP.sendMove(dragNoteId, note.x, note.y, note.z);
        lastMoveSent = now;
      }
      return;
    }

    if (resizeNoteId && e.pointerId === resizePointerId) {
      const note = notes.get(resizeNoteId);
      if (!note) return;
      const world = screenToWorld(e.clientX, e.clientY);
      note.w = clamp(resizeStart.w + (world.x - resizeStart.worldX), MIN_NOTE_W, MAX_NOTE_W);
      note.h = clamp(resizeStart.h + (world.y - resizeStart.worldY), MIN_NOTE_H, MAX_NOTE_H);
      const refs = noteEls.get(resizeNoteId);
      if (refs) {
        refs.el.style.width = note.w + "px";
        refs.el.style.height = note.h + "px";
      }
      scheduleAutofit(resizeNoteId);
      const now = performance.now();
      if (now - lastMoveSent > 60) {
        MP.sendUpdate(resizeNoteId, { w: Math.round(note.w), h: Math.round(note.h) });
        lastMoveSent = now;
      }
      return;
    }

    if (zoneDragId && e.pointerId === zoneDragPointerId) {
      const zone = zones.get(zoneDragId);
      if (!zone) return;
      const world = screenToWorld(e.clientX, e.clientY);
      zone.x = world.x - zoneDragOffset.x;
      zone.y = world.y - zoneDragOffset.y;
      positionZoneEl(zoneDragId);
      const now = performance.now();
      if (now - lastMoveSent > 60) {
        MP.sendZoneMove(zoneDragId, zone.x, zone.y);
        lastMoveSent = now;
      }
      return;
    }

    if (zoneResizeId && e.pointerId === zoneResizePointerId) {
      const zone = zones.get(zoneResizeId);
      if (!zone) return;
      const world = screenToWorld(e.clientX, e.clientY);
      zone.w = Math.max(MIN_ZONE_W, zoneResizeStart.w + (world.x - zoneResizeStart.worldX));
      zone.h = Math.max(MIN_ZONE_H, zoneResizeStart.h + (world.y - zoneResizeStart.worldY));
      const refs = zoneEls.get(zoneResizeId);
      if (refs) {
        refs.el.style.width = zone.w + "px";
        refs.el.style.height = zone.h + "px";
      }
      const now = performance.now();
      if (now - lastMoveSent > 60) {
        MP.sendZoneUpdate(zoneResizeId, { w: Math.round(zone.w), h: Math.round(zone.h) });
        lastMoveSent = now;
      }
      return;
    }

    if (zoneDrawPointerId === e.pointerId && zoneDrawStart && zoneDrawPreviewEl) {
      const world = screenToWorld(e.clientX, e.clientY);
      const x = Math.min(zoneDrawStart.x, world.x);
      const y = Math.min(zoneDrawStart.y, world.y);
      const w = Math.abs(world.x - zoneDrawStart.x);
      const h = Math.abs(world.y - zoneDrawStart.y);
      zoneDrawPreviewEl.style.left = x + "px";
      zoneDrawPreviewEl.style.top = y + "px";
      zoneDrawPreviewEl.style.width = w + "px";
      zoneDrawPreviewEl.style.height = h + "px";
      return;
    }

    if (panPointerId === e.pointerId && panAnchorWorld) {
      const rect = boardWrap.getBoundingClientRect();
      camera.x = panAnchorWorld.x - (e.clientX - rect.left) / camera.scale;
      camera.y = panAnchorWorld.y - (e.clientY - rect.top) / camera.scale;
      applyCameraTransform();
      return;
    }

    const p = screenToWorld(e.clientX, e.clientY);
    myPointer.x = p.x;
    myPointer.y = p.y;
    myPointer.active = true;
  });

  window.addEventListener("pointerup", (e) => {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) pinch = null;

    if (dragNoteId && e.pointerId === dragPointerId) {
      const note = notes.get(dragNoteId);
      if (note) {
        if (dragMoved) {
          finalizeNoteDrop(dragNoteId, e.altKey);
        } else {
          MP.sendMove(dragNoteId, note.x, note.y, note.z);
          if (dragEnterEditOnClick) enterEditMode(dragNoteId, e.clientX, e.clientY);
        }
      }
      const refs = noteEls.get(dragNoteId);
      if (refs) refs.el.classList.remove("dragging");
      dragNoteId = null;
      dragPointerId = null;
      dragOffset = null;
      dragMoved = false;
      dragStartScreen = null;
      dragEnterEditOnClick = false;
    }
    if (resizeNoteId && e.pointerId === resizePointerId) {
      const note = notes.get(resizeNoteId);
      if (note) MP.sendUpdate(resizeNoteId, { w: Math.round(note.w), h: Math.round(note.h) });
      resizeNoteId = null;
      resizePointerId = null;
      resizeStart = null;
    }
    if (panPointerId === e.pointerId) {
      panPointerId = null;
      panAnchorWorld = null;
    }
    if (zoneDragId && e.pointerId === zoneDragPointerId) {
      const zone = zones.get(zoneDragId);
      if (zone) MP.sendZoneMove(zoneDragId, zone.x, zone.y);
      zoneDragId = null;
      zoneDragPointerId = null;
      zoneDragOffset = null;
    }
    if (zoneResizeId && e.pointerId === zoneResizePointerId) {
      const zone = zones.get(zoneResizeId);
      if (zone) MP.sendZoneUpdate(zoneResizeId, { w: Math.round(zone.w), h: Math.round(zone.h) });
      zoneResizeId = null;
      zoneResizePointerId = null;
      zoneResizeStart = null;
    }
    if (zoneDrawPointerId === e.pointerId && zoneDrawStart) {
      const world = screenToWorld(e.clientX, e.clientY);
      const x = Math.min(zoneDrawStart.x, world.x);
      const y = Math.min(zoneDrawStart.y, world.y);
      const w = Math.abs(world.x - zoneDrawStart.x);
      const h = Math.abs(world.y - zoneDrawStart.y);
      cancelZoneDraw();
      drawZoneMode = false;
      boardWrap.classList.remove("drawing-zone");
      if (w >= 20 && h >= 20) {
        const label = prompt("Name this zone:", "Zone");
        if (label !== null) {
          addZone(x, y, Math.max(MIN_ZONE_W, w), Math.max(MIN_ZONE_H, h), label);
        }
      }
    }
  });

  // ---------- Multiplayer (Cloudflare Worker + Durable Objects) ----------
  const myPointer = { x: -1, y: -1, active: false };

  const MP = (() => {
    let ws = null;
    let boardId = "";
    let reconnectDelay = 1000;
    let reconnectTimer = null;
    const remoteCursorEls = new Map(); // fromId -> element
    const remoteLastSeen = new Map();
    let lastCursorSent = 0;

    function randomBoardId() {
      const alphabet = "23456789abcdefghjkmnpqrstuvwxyz"; // no ambiguous chars
      let s = "";
      for (let i = 0; i < 6; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
      return s;
    }

    function resolveBoardId() {
      const params = new URLSearchParams(location.search);
      let id = params.get("board");
      if (!id) {
        id = randomBoardId();
        params.set("board", id);
        history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
      }
      return id;
    }

    function workerHost() {
      const host = location.hostname;
      if (host === "localhost" || host === "127.0.0.1") return "127.0.0.1:8787";
      const meta = document.querySelector('meta[name="worker-host"]');
      return (meta && meta.content) || "";
    }

    function isLocalHost(host) {
      const h = host.split(":")[0];
      return h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.") || h.startsWith("10.");
    }

    function wsProtocolFor(host) {
      return isLocalHost(host) ? "ws" : "wss";
    }

    function httpProtocolFor(host) {
      return isLocalHost(host) ? "http" : "https";
    }

    // Photo-scan requests go over plain HTTP(S), not the WebSocket, so they
    // need their own URL -- but they're gated the same way as everything
    // else here: knowing this board's id. Returns null when the worker host
    // isn't configured, same condition connect() checks.
    function visionUrl() {
      const host = workerHost();
      if (!host || host.includes("YOUR-")) return null;
      return `${httpProtocolFor(host)}://${host}/board/${boardId}/vision`;
    }

    function setConnDot(status, title) {
      if (!connDot) return;
      connDot.className = "conn-dot " + status;
      connDot.title =
        title ||
        (status === "connected" ? "Connected — live" : status === "connecting" ? "Connecting…" : "Disconnected — reconnecting…");
    }

    function connect() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      const host = workerHost();
      if (!host || host.includes("YOUR-")) {
        setConnDot("disconnected", "Multiplayer isn't configured yet — see README.md. Notes still work locally.");
        return;
      }
      const proto = wsProtocolFor(host);
      setConnDot("connecting");
      ws = new WebSocket(`${proto}://${host}/board/${boardId}`);
      ws.onopen = () => {
        reconnectDelay = 1000;
        setConnDot("connected");
        sendIdentity();
      };
      ws.onclose = () => {
        setConnDot("disconnected");
        onlineConnToUser.clear();
        renderPresenceRow();
        scheduleReconnect();
      };
      ws.onerror = () => {
        try { ws.close(); } catch (err) { /* already closing */ }
      };
      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        handleMessage(msg);
      };
    }

    // Skip reconnecting while the tab is hidden: nobody's watching this
    // board, so there's nothing to sync live, and a background tab still
    // retrying every few seconds is exactly the traffic pattern that trips
    // Cloudflare's workers.dev rate limiting when many tabs do it at once.
    // The visibilitychange listener below reconnects right away once the
    // tab is looked at again.
    function scheduleReconnect() {
      if (document.hidden) return;
      reconnectTimer = setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 1.6, 15000);
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
          ws.close();
        }
      } else if (!ws || ws.readyState === WebSocket.CLOSED) {
        reconnectDelay = 1000;
        connect();
      }
    });

    function handleMessage(msg) {
      switch (msg.t) {
        case "history":
          applyRemoteFieldDefs(msg.fields);
          applyRemoteBackground(msg.background);
          for (const u of msg.users || []) applyRosterEntry(u);
          onlineConnToUser.clear();
          for (const u of msg.online || []) {
            applyRosterEntry(u);
            if (u && u.connId) onlineConnToUser.set(u.connId, u.id);
          }
          renderPresenceRow();
          {
            const seenIds = new Set();
            for (const note of msg.notes) {
              seenIds.add(note.id);
              try {
                addNoteLocally(note);
              } catch (err) {
                console.error("Failed to add note from history", note, err);
              }
            }
            // History is the server's authoritative snapshot -- drop any
            // note we're still tracking locally that it no longer has (e.g.
            // deleted by a peer while this connection was reconnecting).
            for (const id of [...notes.keys()]) {
              if (!seenIds.has(id)) deleteNote(id);
            }
          }
          for (const zone of msg.zones || []) {
            try {
              addZoneLocally(zone);
            } catch (err) {
              console.error("Failed to add zone from history", zone, err);
            }
          }
          break;
        case "create":
          if (msg.kind === "zone") {
            if (!zones.has(msg.id)) addZoneLocally(msg);
          } else if (!notes.has(msg.id)) {
            addNoteLocally(msg);
          }
          break;
        case "move":
        case "update":
          if (msg.kind === "zone") applyRemoteZone(msg);
          else applyRemoteNote(msg);
          break;
        case "delete":
          if (msg.kind === "zone") deleteZone(msg.id);
          else deleteNote(msg.id);
          break;
        case "clear":
          clearAllNotes();
          break;
        case "fields":
          applyRemoteFieldDefs(msg.fields);
          break;
        case "identity":
          applyRosterEntry(msg);
          onlineConnToUser.set(msg.from, msg.id);
          renderPresenceRow();
          renderAllNoteFieldRows();
          if (fieldsPopoverNoteId) renderNoteFieldsPopoverContent(fieldsPopoverNoteId);
          refreshRemoteCursorLabel(msg.from);
          break;
        case "background":
          applyRemoteBackground(msg.background);
          break;
        case "cursor":
          updateRemoteCursor(msg);
          break;
        case "leave":
          removeRemoteCursor(msg.from);
          onlineConnToUser.delete(msg.from);
          renderPresenceRow();
          break;
        default:
          break;
      }
    }

    function updateRemoteCursor(msg) {
      let el = remoteCursorEls.get(msg.from);
      if (!el) {
        el = document.createElement("div");
        el.className = "remote-cursor";
        el.appendChild(document.createElement("span")).className = "remote-cursor-label";
        cursorsEl.appendChild(el);
        remoteCursorEls.set(msg.from, el);
      }
      el.style.left = msg.x + "px";
      el.style.top = msg.y + "px";
      el.style.borderColor = msg.color || "#fff";
      el.style.background = msg.color || "#fff";
      remoteLastSeen.set(msg.from, performance.now());
      refreshRemoteCursorLabel(msg.from);
    }

    // A cursor's label needs whichever identity is currently mapped to its
    // connection id, which can arrive after the cursor itself (join order
    // isn't guaranteed) -- so this is called both when a cursor moves and
    // when an "identity" message resolves a connection to a user.
    function refreshRemoteCursorLabel(connId) {
      const el = remoteCursorEls.get(connId);
      if (!el) return;
      const label = el.querySelector(".remote-cursor-label");
      if (!label) return;
      const userId = onlineConnToUser.get(connId);
      const u = userId && roster.get(userId);
      label.textContent = u && u.name ? u.name : "";
    }

    function removeRemoteCursor(from) {
      const el = remoteCursorEls.get(from);
      if (el) el.remove();
      remoteCursorEls.delete(from);
      remoteLastSeen.delete(from);
    }

    function sweepStaleCursors() {
      const now = performance.now();
      for (const [from, last] of remoteLastSeen) {
        if (now - last > 5000) removeRemoteCursor(from);
      }
    }

    function send(obj) {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
    }

    function tick(now) {
      if (myPointer.active && now - lastCursorSent > 66) {
        send({ t: "cursor", x: Math.round(myPointer.x), y: Math.round(myPointer.y), color: myIdentity.color });
        lastCursorSent = now;
      }
      sweepStaleCursors();
    }

    function sendIdentity() {
      send({ t: "identity", id: myUserId, name: myIdentity.name, initials: myIdentity.initials, color: myIdentity.color });
    }

    function init() {
      boardId = resolveBoardId();
      if (boardCodeEl) boardCodeEl.textContent = boardId;
      connect();
    }

    return {
      init,
      tick,
      visionUrl,
      sendCreate: (note) => send({ t: "create", ...note }),
      sendMove: (id, x, y, z) => send({ t: "move", id, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z }),
      sendUpdate: (id, fields) => send({ t: "update", id, ...fields }),
      sendDelete: (id) => send({ t: "delete", id }),
      sendClear: () => send({ t: "clear" }),
      sendZoneCreate: (zone) => send({ t: "create", kind: "zone", ...zone }),
      sendZoneMove: (id, x, y) => send({ t: "move", kind: "zone", id, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }),
      sendZoneUpdate: (id, fields) => send({ t: "update", kind: "zone", id, ...fields }),
      sendZoneDelete: (id) => send({ t: "delete", kind: "zone", id }),
      sendFields: (fields) => send({ t: "fields", fields }),
      sendIdentity,
      sendBackground: (background) => send({ t: "background", background }),
    };
  })();

  // ---------- Main loop ----------
  function loop(now) {
    MP.tick(now);
    requestAnimationFrame(loop);
  }

  // ---------- Init ----------
  function init() {
    centerCamera();
    MP.init();
    requestAnimationFrame(loop);
  }

  try {
    init();
  } catch (err) {
    console.error("Sticky Notes failed to start:", err);
    const box = document.createElement("div");
    box.style.cssText =
      "padding:24px;color:#fff;font-family:-apple-system,sans-serif;max-width:480px;line-height:1.5";
    const detail = (err && (err.stack || err.message)) || String(err);
    box.innerHTML =
      "<h2>Something went wrong starting the board</h2>" +
      '<p style="opacity:0.7">Try reloading, or opening this link in your browser app instead of an in-app browser.</p>' +
      '<p style="font-size:11px;opacity:0.6">' + navigator.userAgent + "</p>";
    const pre = document.createElement("pre");
    pre.style.cssText =
      "white-space:pre-wrap;word-break:break-word;font-size:12px;background:#000;padding:10px;border-radius:6px;opacity:0.85";
    pre.textContent = detail;
    box.insertBefore(pre, box.querySelector("p:last-child"));
    boardWrap.innerHTML = "";
    boardWrap.appendChild(box);
  }
})();
