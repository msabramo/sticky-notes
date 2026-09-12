(() => {
  "use strict";

  const boardWrap = document.getElementById("boardWrap");
  const world = document.getElementById("world");
  const cursorsEl = document.getElementById("cursors");
  const addNoteBtn = document.getElementById("addNoteBtn");
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
  const fontPopover = document.getElementById("fontPopover");

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
  const FONT_STACKS = {
    sans: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`,
    serif: `Georgia, "Times New Roman", serif`,
    mono: `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`,
    hand: `"Comic Sans MS", "Comic Sans", cursive`,
    round: `"Trebuchet MS", "Segoe UI Rounded", sans-serif`,
  };

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function makeId() {
    // Avoids crypto.randomUUID for wider WebKit/webview compatibility.
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
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
  const notes = new Map(); // id -> {id,x,y,w,h,color,text,rot,z}
  const noteEls = new Map(); // id -> {el, header, textarea, colorBtn}
  let zCounter = Date.now();
  let selectedId = null;

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
    fontBtn.title = "Font";
    fontBtn.style.fontSize = "10px";
    const delBtn = document.createElement("button");
    delBtn.textContent = "×";
    delBtn.title = "Delete";
    header.appendChild(colorBtn);
    header.appendChild(fontBtn);
    header.appendChild(delBtn);

    const textarea = document.createElement("textarea");
    textarea.className = "note-text";
    textarea.placeholder = "Type…";
    textarea.value = note.text || "";
    textarea.spellcheck = false;
    if (note.font && FONT_STACKS[note.font]) textarea.style.fontFamily = FONT_STACKS[note.font];

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "note-resize";
    resizeHandle.title = "Drag to resize";

    el.appendChild(header);
    el.appendChild(textarea);
    el.appendChild(resizeHandle);
    world.insertBefore(el, cursorsEl);

    colorBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openColorPopover(note.id, colorBtn);
    });
    fontBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openFontPopover(note.id, fontBtn);
    });
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteNote(note.id);
      MP.sendDelete(note.id);
    });

    let debounceTimer = null;
    textarea.addEventListener("focus", () => selectNote(note.id));
    textarea.addEventListener("input", () => {
      const n = notes.get(note.id);
      if (!n) return;
      n.text = textarea.value;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => sendTextUpdate(note.id), 400);
    });
    textarea.addEventListener("blur", () => {
      if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
      sendTextUpdate(note.id);
    });

    noteEls.set(note.id, { el, header, textarea, colorBtn });
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
    zCounter = Math.max(zCounter, note.z || 0);
  }

  function deleteNote(id) {
    notes.delete(id);
    const refs = noteEls.get(id);
    if (refs) refs.el.remove();
    noteEls.delete(id);
    if (selectedId === id) selectedId = null;
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
    closeFontPopover();
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

  function setNoteFont(id, font) {
    const note = notes.get(id);
    if (!note || !FONT_STACKS[font]) return;
    note.font = font;
    const refs = noteEls.get(id);
    if (refs) refs.textarea.style.fontFamily = FONT_STACKS[font];
    MP.sendUpdate(id, { font });
  }

  function sendTextUpdate(id) {
    const note = notes.get(id);
    if (!note) return;
    MP.sendUpdate(id, { text: note.text });
  }

  function applyRemoteNote(data) {
    const note = notes.get(data.id);
    if (!note) return;
    Object.assign(note, data);
    delete note.t;
    delete note.from;
    const refs = noteEls.get(data.id);
    if (refs) {
      if (typeof data.text === "string" && document.activeElement !== refs.textarea) {
        refs.textarea.value = data.text;
      }
      if (data.color) refs.el.style.background = data.color;
      if (data.font && FONT_STACKS[data.font]) refs.textarea.style.fontFamily = FONT_STACKS[data.font];
      if (typeof data.w === "number") refs.el.style.width = data.w + "px";
      if (typeof data.h === "number") refs.el.style.height = data.h + "px";
    }
    positionNoteEl(data.id);
    zCounter = Math.max(zCounter, note.z || 0);
  }

  // ---------- Color popover ----------
  let colorTargetId = null;
  function openColorPopover(id, anchorEl) {
    if (!colorPopover.hidden && colorTargetId === id) { closeColorPopover(); return; }
    closeFontPopover();
    colorTargetId = id;
    const anchorRect = anchorEl.getBoundingClientRect();
    const wrapRect = boardWrap.getBoundingClientRect();
    colorPopover.style.left = clamp(anchorRect.left - wrapRect.left, 4, wrapRect.width - 190) + "px";
    colorPopover.style.top = clamp(anchorRect.bottom - wrapRect.top + 6, 4, wrapRect.height - 50) + "px";
    colorPopover.hidden = false;
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

  // ---------- Font popover ----------
  let fontTargetId = null;
  function openFontPopover(id, anchorEl) {
    if (!fontPopover.hidden && fontTargetId === id) { closeFontPopover(); return; }
    closeColorPopover();
    fontTargetId = id;
    const anchorRect = anchorEl.getBoundingClientRect();
    const wrapRect = boardWrap.getBoundingClientRect();
    fontPopover.style.left = clamp(anchorRect.left - wrapRect.left, 4, wrapRect.width - 220) + "px";
    fontPopover.style.top = clamp(anchorRect.bottom - wrapRect.top + 6, 4, wrapRect.height - 50) + "px";
    fontPopover.hidden = false;
  }
  function closeFontPopover() {
    fontPopover.hidden = true;
    fontTargetId = null;
  }
  fontPopover.addEventListener("click", (e) => {
    const btn = e.target.closest(".font-opt");
    if (!btn || !fontTargetId) return;
    setNoteFont(fontTargetId, btn.dataset.font);
    closeFontPopover();
  });

  // ---------- Adding notes ----------
  function addNote(worldX, worldY) {
    const id = makeId();
    zCounter += 1;
    const note = {
      id,
      x: worldX - NOTE_W / 2,
      y: worldY - NOTE_H / 2,
      w: NOTE_W,
      h: NOTE_H,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      text: "",
      rot: Math.round((Math.random() * 8 - 4) * 10) / 10,
      z: zCounter,
    };
    addNoteLocally(note);
    MP.sendCreate(note);
    const refs = noteEls.get(id);
    if (refs) refs.textarea.focus();
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

  boardWrap.addEventListener("dblclick", (e) => {
    if (isUiChrome(e.target) || e.target.closest(".note")) return;
    const p = screenToWorld(e.clientX, e.clientY);
    addNote(p.x, p.y);
  });

  // ---------- Pointer input: pan / drag note / pinch ----------
  const isUiChrome = (target) =>
    !!target.closest(".fab, .zoom-controls, .menu-btn, .menu-drawer, .menu-backdrop, .color-popover, .font-popover");

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

    if (e.target.closest(".note")) return; // let the textarea/buttons handle it natively

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

    function wsProtocolFor(host) {
      const h = host.split(":")[0];
      const isLocal =
        h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.") || h.startsWith("10.");
      return isLocal ? "ws" : "wss";
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
      sendCreate: (note) => send({ t: "create", ...note }),
      sendMove: (id, x, y, z) => send({ t: "move", id, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z }),
      sendUpdate: (id, fields) => send({ t: "update", id, ...fields }),
      sendDelete: (id) => send({ t: "delete", id }),
      sendClear: () => send({ t: "clear" }),
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
