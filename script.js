(() => {
  "use strict";

  const boardWrap = document.getElementById("boardWrap");
  const world = document.getElementById("world");
  const cursorsEl = document.getElementById("cursors");
  const addNoteBtn = document.getElementById("addNoteBtn");
  const scanBtn = document.getElementById("scanBtn");
  const photoInput = document.getElementById("photoInput");
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const fitBtn = document.getElementById("fitBtn");
  const menuBtn = document.getElementById("menuBtn");
  const menuDrawer = document.getElementById("menuDrawer");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const clearBtn = document.getElementById("clearBtn");
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
  const noteFieldsPopover = document.getElementById("noteFieldsPopover");
  const manageFieldsBtn = document.getElementById("manageFieldsBtn");
  const fieldsModalBackdrop = document.getElementById("fieldsModalBackdrop");
  const fieldsModal = document.getElementById("fieldsModal");
  const fieldsModalCloseBtn = document.getElementById("fieldsModalCloseBtn");
  const fieldsList = document.getElementById("fieldsList");
  const fieldsPresets = document.getElementById("fieldsPresets");
  const addFieldBtn = document.getElementById("addFieldBtn");

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
  const COLORS = ["#fff59d", "#ffab91", "#f48fb1", "#a5d6a7", "#90caf9", "#ce93d8"];
  const CURSOR_COLORS = ["#ff6b3d", "#4dd0e1", "#ff4d4f", "#8bc34a", "#ba68c8", "#ffd54f"];

  // Real font names, mapped to a stack with sensible cross-platform fallbacks.
  // Also doubles as the allowlist the HTML sanitizer checks font-family values against.
  const FONT_OPTIONS = [
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
  const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "SPAN", "BR", "DIV", "H1", "H2", "H3", "P"]);
  const DROP_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "LINK", "META", "IMG", "SVG", "TEMPLATE"]);
  const FONT_SIZE_RE = /^(1[0-9]|[2-9][0-9]|1[0-4][0-9])px$/;
  const FONT_WEIGHT_RE = /^(bold|normal|[1-9]00)$/;
  const FONT_STYLE_RE = /^(italic|normal)$/;
  const TEXT_DECORATION_RE = /^(underline|none)$/;

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
    }
    return out.join(";");
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
          sanitizeWalk(node);
          while (node.firstChild) parent.insertBefore(node.firstChild, node);
          parent.removeChild(node);
        } else {
          const styleAttr = node.getAttribute("style");
          for (const attr of [...node.attributes]) node.removeAttribute(attr.name);
          if (styleAttr) {
            const clean = sanitizeStyle(styleAttr);
            if (clean) node.setAttribute("style", clean);
          }
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

  function createNoteElement(note) {
    const el = document.createElement("div");
    el.className = "note";
    el.dataset.id = note.id;
    el.style.width = note.w + "px";
    el.style.height = note.h + "px";
    el.style.background = note.color;

    const header = document.createElement("div");
    header.className = "note-header";
    const colorBtn = document.createElement("button");
    colorBtn.textContent = "●";
    colorBtn.title = "Color";
    const fontBtn = document.createElement("button");
    fontBtn.textContent = "Aa";
    fontBtn.title = "Format text";
    fontBtn.style.fontSize = "10px";
    const fieldsBtn = document.createElement("button");
    fieldsBtn.textContent = "🏷";
    fieldsBtn.title = "Fields";
    fieldsBtn.style.fontSize = "10px";
    const delBtn = document.createElement("button");
    delBtn.textContent = "×";
    delBtn.title = "Delete";
    header.appendChild(colorBtn);
    header.appendChild(fontBtn);
    header.appendChild(fieldsBtn);
    header.appendChild(delBtn);

    const fieldsRow = document.createElement("div");
    fieldsRow.className = "note-fields-row";
    fieldsRow.hidden = true;

    const editor = document.createElement("div");
    editor.className = "note-text";
    editor.contentEditable = "true";
    editor.dataset.placeholder = "Type…";
    editor.spellcheck = false;
    editor.innerHTML = initialNoteHtml(note);

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "note-resize";
    resizeHandle.title = "Drag to resize";

    el.appendChild(header);
    el.appendChild(fieldsRow);
    el.appendChild(editor);
    el.appendChild(resizeHandle);
    world.insertBefore(el, cursorsEl);

    colorBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openColorPopover(note.id);
    });
    fontBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openFormatToolbar(note.id);
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

    let debounceTimer = null;
    editor.addEventListener("focus", () => selectNote(note.id));
    editor.addEventListener("input", () => {
      // Chrome leaves a stray <br> behind when the last character is deleted;
      // normalize that back to empty so the CSS placeholder shows again.
      if (editor.innerHTML === "<br>") editor.innerHTML = "";
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

    noteEls.set(note.id, { el, header, editor, colorBtn, fieldsRow });
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
  }

  function clearAllNotes() {
    for (const id of [...notes.keys()]) deleteNote(id);
  }

  function selectNote(id) {
    if (selectedId && noteEls.has(selectedId)) {
      noteEls.get(selectedId).el.classList.remove("selected");
    }
    selectedId = id;
    bringToFront(id);
    if (noteEls.has(id)) noteEls.get(id).el.classList.add("selected");
  }

  function deselectNote() {
    if (selectedId && noteEls.has(selectedId)) {
      noteEls.get(selectedId).el.classList.remove("selected");
    }
    selectedId = null;
    closeColorPopover();
    closeFormatToolbar();
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
    if (refs) refs.el.style.background = color;
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
      if (remoteHtml !== null && document.activeElement !== refs.editor) {
        refs.editor.innerHTML = remoteHtml;
      }
      if (data.color) refs.el.style.background = data.color;
      if (typeof data.w === "number") refs.el.style.width = data.w + "px";
      if (typeof data.h === "number") refs.el.style.height = data.h + "px";
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

  // Positions a popover under a note's header, flipping above it instead of
  // clamping in place when there isn't room below -- clamping alone can push
  // a tall popover (the format toolbar) up far enough to overlap the very
  // button row it was opened from.
  function positionPopoverNear(popoverEl, id) {
    popoverEl.hidden = false; // must be visible/laid out to measure
    const { width, height } = popoverEl.getBoundingClientRect();
    const anchorRect = noteHeaderScreenRect(id);
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
    colorTargetId = id;
    positionPopoverNear(colorPopover, id);
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
    sendHtmlUpdate(formatTargetId);
  }

  function refreshToolbarState() {
    const editor = formatEditor();
    if (!editor) return;
    fmtBoldBtn.classList.toggle("active", document.queryCommandState("bold"));
    fmtItalicBtn.classList.toggle("active", document.queryCommandState("italic"));
    fmtUnderlineBtn.classList.toggle("active", document.queryCommandState("underline"));
    const block = document.queryCommandValue("formatBlock").toUpperCase();
    fmtHeadingSelect.value = block === "H2" || block === "H3" ? block : "P";
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

  fmtBoldBtn.addEventListener("mousedown", (e) => e.preventDefault());
  fmtItalicBtn.addEventListener("mousedown", (e) => e.preventDefault());
  fmtUnderlineBtn.addEventListener("mousedown", (e) => e.preventDefault());
  fmtBoldBtn.addEventListener("click", () => withEditorSelection(() => document.execCommand("bold")));
  fmtItalicBtn.addEventListener("click", () => withEditorSelection(() => document.execCommand("italic")));
  fmtUnderlineBtn.addEventListener("click", () => withEditorSelection(() => document.execCommand("underline")));
  fmtHeadingSelect.addEventListener("change", () => {
    const tag = fmtHeadingSelect.value === "P" ? "DIV" : fmtHeadingSelect.value;
    withEditorSelection(() => document.execCommand("formatBlock", false, `<${tag}>`));
  });
  fmtFontSelect.addEventListener("change", () => {
    withEditorSelection((editor) => applyFontFamily(editor, fmtFontSelect.value));
  });
  fmtSizeSelect.addEventListener("change", () => {
    withEditorSelection((editor) => applyFontSize(editor, Number(fmtSizeSelect.value)));
  });

  function openFormatToolbar(id) {
    if (!formatToolbar.hidden && formatTargetId === id) { closeFormatToolbar(); return; }
    closeColorPopover();
    closeNoteFieldsPopover();
    formatTargetId = id;
    positionPopoverNear(formatToolbar, id);
    const editor = formatEditor();
    if (editor) {
      editor.focus();
      ensureEditableSelection(id, editor);
    }
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
  // There are no user accounts in this app (see README), so "assignee" isn't
  // a real identity -- it's just a field, typically a select whose options
  // are the names of whoever uses the board, or a free-text field. That's
  // deliberate: the metadata system is generic, and assignee/status are one
  // instance of it rather than special-cased.
  const FIELD_TYPES = [
    { id: "text", label: "Text" },
    { id: "number", label: "Number" },
    { id: "checkbox", label: "Checkbox" },
    { id: "date", label: "Date" },
    { id: "select", label: "Single select" },
    { id: "multiselect", label: "Multi-select (tags)" },
  ];
  const FIELD_TYPE_IDS = new Set(FIELD_TYPES.map((t) => t.id));
  const FIELD_TYPES_WITH_OPTIONS = new Set(["select", "multiselect"]);
  const OPTION_COLORS = ["#90caf9", "#a5d6a7", "#ffe082", "#ffab91", "#ce93d8", "#f48fb1", "#80cbc4", "#bcaaa4"];
  const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
  const MAX_FIELD_TEXT_LEN = 200;

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
    { name: "Assignee", type: "text", options: [] },
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
      };
      if (FIELD_TYPES_WITH_OPTIONS.has(type) && f && Array.isArray(f.options)) {
        def.options = f.options.slice(0, 40).map((o) => ({
          id: o && typeof o.id === "string" && o.id ? o.id : makeId(),
          label: o && typeof o.label === "string" && o.label.trim() ? o.label.slice(0, 40) : "Option",
          color: sanitizeFieldColor(o && o.color),
        }));
      }
      return def;
    });
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
  }

  function applyRemoteFieldDefs(fields) {
    boardFields = normalizeFieldDefs(fields);
    renderFieldsManager();
    renderAllNoteFieldRows();
    if (fieldsPopoverNoteId) renderNoteFieldsPopoverContent(fieldsPopoverNoteId);
  }

  // ---------- Per-note field chips ----------
  function makeFieldChip(text, color) {
    const chip = document.createElement("span");
    chip.className = "field-chip";
    chip.textContent = text;
    if (color) chip.style.background = color;
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
      } else {
        // text, number, date
        if (value === undefined || value === null || value === "") continue;
        any = true;
        row.appendChild(makeFieldChip(field.name + ": " + value, null));
      }
    }
    row.hidden = !any;
  }

  function renderAllNoteFieldRows() {
    for (const id of notes.keys()) renderNoteFieldRow(id);
  }

  // ---------- Per-note fields popover ----------
  function openNoteFieldsPopover(id) {
    if (!noteFieldsPopover.hidden && fieldsPopoverNoteId === id) { closeNoteFieldsPopover(); return; }
    closeColorPopover();
    closeFormatToolbar();
    fieldsPopoverNoteId = id;
    renderNoteFieldsPopoverContent(id);
    positionPopoverNear(noteFieldsPopover, id);
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
            positionPopoverNear(noteFieldsPopover, id);
          });
          wrap.appendChild(optBtn);
        }
        row.appendChild(wrap);
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

    if (FIELD_TYPES_WITH_OPTIONS.has(field.type)) row.appendChild(renderFieldOptionsEditor(field));

    return row;
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
    // A blank note is created for immediate typing, so it should grab focus;
    // a batch of notes from a photo scan shouldn't steal focus from any of them.
    const refs = noteEls.get(id);
    if (refs && !text) refs.editor.focus();
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
    if (isUiChrome(e.target) || e.target.closest(".note")) return;
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
  let lastMoveSent = 0;
  let resizePointerId = null;
  let resizeNoteId = null;
  let resizeStart = null;

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
    panPointerId = null;
    panAnchorWorld = null;
    resizeNoteId = null;
    resizePointerId = null;
    resizeStart = null;
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

    const headerEl = e.target.closest(".note-header");
    if (headerEl && !e.target.closest("button")) {
      const noteEl = headerEl.closest(".note");
      const id = noteEl.dataset.id;
      const note = notes.get(id);
      if (!note) return;
      selectNote(id);
      const world = screenToWorld(e.clientX, e.clientY);
      dragOffset = { x: world.x - note.x, y: world.y - note.y };
      dragNoteId = id;
      dragPointerId = e.pointerId;
      e.preventDefault();
      return;
    }

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

    if (e.target.closest(".note")) return; // let the editor/buttons handle it natively

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
      const now = performance.now();
      if (now - lastMoveSent > 60) {
        MP.sendUpdate(resizeNoteId, { w: Math.round(note.w), h: Math.round(note.h) });
        lastMoveSent = now;
      }
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
      if (note) MP.sendMove(dragNoteId, note.x, note.y, note.z);
      dragNoteId = null;
      dragPointerId = null;
      dragOffset = null;
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
  });

  // ---------- Multiplayer (Cloudflare Worker + Durable Objects) ----------
  const myPointer = { x: -1, y: -1, active: false };
  const myColor = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];

  const MP = (() => {
    let ws = null;
    let boardId = "";
    let reconnectDelay = 1000;
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
      };
      ws.onclose = () => {
        setConnDot("disconnected");
        setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 1.6, 15000);
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

    function handleMessage(msg) {
      switch (msg.t) {
        case "history":
          applyRemoteFieldDefs(msg.fields);
          for (const note of msg.notes) {
            try {
              addNoteLocally(note);
            } catch (err) {
              console.error("Failed to add note from history", note, err);
            }
          }
          break;
        case "create":
          if (!notes.has(msg.id)) addNoteLocally(msg);
          break;
        case "move":
        case "update":
          applyRemoteNote(msg);
          break;
        case "delete":
          deleteNote(msg.id);
          break;
        case "clear":
          clearAllNotes();
          break;
        case "fields":
          applyRemoteFieldDefs(msg.fields);
          break;
        case "cursor":
          updateRemoteCursor(msg);
          break;
        case "leave":
          removeRemoteCursor(msg.from);
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
        cursorsEl.appendChild(el);
        remoteCursorEls.set(msg.from, el);
      }
      el.style.left = msg.x + "px";
      el.style.top = msg.y + "px";
      el.style.borderColor = msg.color || "#fff";
      el.style.background = msg.color || "#fff";
      remoteLastSeen.set(msg.from, performance.now());
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
        send({ t: "cursor", x: Math.round(myPointer.x), y: Math.round(myPointer.y), color: myColor });
        lastCursorSent = now;
      }
      sweepStaleCursors();
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
      sendFields: (fields) => send({ t: "fields", fields }),
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
