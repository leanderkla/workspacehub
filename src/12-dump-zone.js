'use strict';

// ===== src/12-dump-zone.js =====
// Wave-4 extraction (M0): the Dump Zone — the inbox for raw text / voice /
// sketch capture, with the suggestion engine that proposes converting a
// dump into a todo / note / reminder / commitment / delegation, plus the
// voice recording UI and sketch canvas. Calls into recurrence (extracted in
// src/04-recurrence.js) for reminder conversion and into mention/smart-link
// wiring in residual app.js for content rendering.
//
// var conversion (3 top-level declarations):
// - dumpVoiceState — module-internal recorder state (MediaRecorder ref,
//   chunks, audio context, level meter handle)
// - SKETCH_COLORS, sketchState — sketch canvas tool state
//
// All three were already module-private in spirit; the var conversion is
// applied for uniformity with the rest of the modularization.
//
// Cross-module call sites (verified):
// - convertDumpToReminder calls computeNextOccurrence in src/04-recurrence.js
//   when the dump suggests a recurring rule. One-way reference, resolved at
//   call time across the script-tag boundary.
// - cleanupNodeLinksOnEntityDelete (in src/05-node-links.js) is called when
//   a dump is deleted to clear any reverse-index entries pointing at it.
// ===== DUMP ZONE =====
var dumpVoiceState = { recorder: null, chunks: [], stream: null, startedAt: null, timerHandle: null, audioCtx: null, analyser: null, levelHandle: null, peak: 0 };

function suggestDumpActions(text) {
  const suggestions = [];
  const lc = (text || '').toLowerCase().trim();
  if (!lc) return suggestions;

  const remindRegex = /\b(remind me|reminder|erinnere mich|remember to|don['’]?t forget|um |at \d|on (mon|tue|wed|thu|fri|sat|sun))\b/;
  const dateLike = /\b(\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|tomorrow|today|next (week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|morgen|heute)\b/i;
  const todoRegex = /\b(todo|must|need to|have to|call|email|buy|fix|send|check|review|ask|book|schedule|write|muss|erledigen|anrufen|schreiben)\b/;
  const looksEmail = /^(from:|subject:|betreff:|von:)/im.test(text || '') || /<[a-z0-9._-]+@[a-z0-9.-]+>/i.test(text || '');
  const looksParagraph = (text || '').length > 160 || /\n\n/.test(text || '');

  if (remindRegex.test(lc) || dateLike.test(lc)) suggestions.push('reminder');
  if (todoRegex.test(lc) && lc.length < 240) suggestions.push('todo');
  if (looksEmail || looksParagraph) suggestions.push('note');

  if (!suggestions.length) {
    suggestions.push(lc.length < 100 ? 'todo' : 'note');
  }
  return Array.from(new Set(suggestions));
}

function addTextDump(text, type = 'text') {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  // Accept image-only HTML (pasted screenshots) — noteContentText strips tags
  // and returns empty for an <img>-only paste, but the dump is still meaningful.
  if (!noteContentText(trimmed) && !/<img\b/i.test(trimmed)) return null;
  const proj = getProject();
  if (!Array.isArray(proj.dumps)) proj.dumps = [];
  const dump = {
    id: generateId('dump'),
    type,
    text: trimmed,
    audio: null,
    subprojectId: state.pendingDumpSubprojectId || null,
    tags: [],
    created: new Date().toISOString(),
    processed: false
  };
  proj.dumps.unshift(dump);
  saveData();
  return dump;
}

function addVoiceDump(attachment, durationSec, transcript) {
  const proj = getProject();
  if (!Array.isArray(proj.dumps)) proj.dumps = [];
  const dump = {
    id: generateId('dump'),
    type: 'voice',
    text: (transcript || '').trim() || null,
    audio: attachment ? { relPath: attachment.relPath, name: attachment.name, size: attachment.size, durationSec: durationSec || null } : null,
    subprojectId: state.pendingDumpSubprojectId || null,
    tags: [],
    created: new Date().toISOString(),
    processed: false
  };
  proj.dumps.unshift(dump);
  saveData();
  return dump;
}

function setDumpSubproject(dumpId, spId) {
  const proj = getProject();
  const dump = (proj.dumps || []).find(d => d.id === dumpId);
  if (!dump) return false;
  const next = spId || null;
  if (dump.subprojectId === next) return false;
  dump.subprojectId = next;
  saveData();
  return true;
}

// Persists an inline edit from a dump card's contenteditable text region.
// Called on every input event (mirrors flowUpdateNodeText) — saveData() also
// pushes an undo snapshot, so granular edits are reversible step-by-step.
function updateDumpText(dumpId, html) {
  const proj = getProject();
  const dump = (proj.dumps || []).find(d => d.id === dumpId);
  if (!dump) return false;
  const next = (html || '').trim();
  if (dump.text === next) return false;
  dump.text = next;
  saveData();
  return true;
}

function deleteDump(dumpId) {
  const proj = getProject();
  const idx = (proj.dumps || []).findIndex(d => d.id === dumpId);
  if (idx === -1) return;
  const [removed] = proj.dumps.splice(idx, 1);
  if (removed?.audio?.relPath) {
    try { window.api.deleteAttachment(removed.audio.relPath); } catch {}
  }
  if (removed?.image?.relPath) {
    try { window.api.deleteAttachment(removed.image.relPath); } catch {}
    attachmentThumbCache.delete(removed.image.relPath);
  }
  saveData();
  refreshDumpHostView();
}

// Re-render whichever view is currently hosting dump cards. Dump-creation flows
// (voice stop, sketch save, archive/delete) used to hard-code renderDumpZone(),
// which broke the subproject view's embedded capture once it gained the same
// affordances.
function refreshDumpHostView() {
  if (state.view === 'subprojects') renderSubprojects();
  else if (state.view === 'dumpzone') renderDumpZone();
}

function hasTouchScreen() {
  if (typeof navigator === 'undefined') return false;
  if (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) return true;
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
  return false;
}

function addSketchDump(attachment, width, height, actions) {
  const proj = getProject();
  if (!Array.isArray(proj.dumps)) proj.dumps = [];
  const dump = {
    id: generateId('dump'),
    type: 'sketch',
    text: null,
    audio: null,
    image: {
      relPath: attachment.relPath,
      name: attachment.name,
      size: attachment.size,
      width,
      height,
      actions: actions ? JSON.parse(JSON.stringify(actions)) : []
    },
    subprojectId: state.pendingDumpSubprojectId || null,
    tags: [],
    created: new Date().toISOString(),
    processed: false
  };
  proj.dumps.unshift(dump);
  saveData();
  return dump;
}

function updateSketchDump(dumpId, attachment, width, height, actions) {
  const proj = getProject();
  const dump = (proj.dumps || []).find(d => d.id === dumpId);
  if (!dump) return null;
  const oldRel = dump.image?.relPath;
  dump.image = {
    relPath: attachment.relPath,
    name: attachment.name,
    size: attachment.size,
    width,
    height,
    actions: actions ? JSON.parse(JSON.stringify(actions)) : []
  };
  saveData();
  if (oldRel && oldRel !== attachment.relPath) {
    attachmentThumbCache.delete(oldRel);
    try { window.api.deleteAttachment(oldRel); } catch {}
  }
  attachmentThumbCache.delete(attachment.relPath);
  return dump;
}

var SKETCH_COLORS = ['#0f172a', '#dc2626', '#16a34a', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#ffffff'];
var sketchState = { actions: [], current: null, tool: 'pen', color: SKETCH_COLORS[0], strokeWidth: 4 };

function showSketchModal(existingDumpId) {
  const overlay = document.getElementById('modal-overlay');
  const proj = getProject();
  const existingDump = existingDumpId ? (proj.dumps || []).find(d => d.id === existingDumpId) : null;
  const isEdit = !!existingDump;
  const preloadedActions = isEdit && Array.isArray(existingDump.image?.actions)
    ? JSON.parse(JSON.stringify(existingDump.image.actions))
    : [];

  sketchState.actions = preloadedActions;
  sketchState.current = null;
  sketchState.tool = 'pen';
  sketchState.color = SKETCH_COLORS[0];
  sketchState.strokeWidth = 4;

  const tools = [
    { id: 'pen',     label: '✏', title: 'Pen' },
    { id: 'line',    label: '╱', title: 'Line' },
    { id: 'rect',    label: '▭', title: 'Rectangle' },
    { id: 'ellipse', label: '◯', title: 'Ellipse' },
    { id: 'arrow',   label: '→', title: 'Arrow' }
  ];
  const strokes = [2, 4, 8];

  overlay.innerHTML = `
    <div class="modal sketch-modal">
      <div class="sketch-header">
        <h3 style="margin:0;font-size:15px">✏ ${isEdit ? 'Edit sketch' : 'Sketch'}</h3>
        <span style="font-size:11px;color:var(--text-muted);margin-left:auto">${isEdit ? 'Continue drawing or undo previous strokes.' : 'Draw with finger, stylus, or mouse'}</span>
      </div>
      <div class="sketch-toolbar">
        <div class="sketch-tool-group">
          ${tools.map(t => `<button class="sketch-tool ${t.id==='pen'?'selected':''}" data-tool="${t.id}" title="${t.title}">${t.label}</button>`).join('')}
        </div>
        <div class="sketch-tool-group">
          ${SKETCH_COLORS.map((c, i) => `<button class="sketch-color ${i===0?'selected':''}" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')}
        </div>
        <div class="sketch-tool-group">
          ${strokes.map(s => `<button class="sketch-stroke ${s===4?'selected':''}" data-stroke="${s}" title="${s}px"><span style="width:${s+4}px;height:${s+4}px;border-radius:50%;background:currentColor;display:block"></span></button>`).join('')}
        </div>
        <div class="sketch-tool-group">
          <button id="sketch-zoom-out" class="sketch-tool" title="Zoom out">−</button>
          <button id="sketch-zoom-reset" class="sketch-tool" title="Reset zoom">⊟</button>
          <button id="sketch-zoom-in" class="sketch-tool" title="Zoom in">+</button>
        </div>
        <div class="sketch-tool-group" style="margin-left:auto">
          <button id="sketch-undo" class="sketch-tool" title="Undo">↶</button>
          <button id="sketch-clear" class="sketch-tool" title="Clear all">⌫</button>
        </div>
      </div>
      <div class="sketch-canvas-outer">
        <div class="sketch-canvas-wrap">
          <canvas id="sketch-canvas" width="1920" height="1200"></canvas>
        </div>
      </div>
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="sketch-cancel">Cancel</button>
        <button class="btn btn-primary" id="sketch-save">Save sketch</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');

  const canvas = document.getElementById('sketch-canvas');
  const ctx = canvas.getContext('2d');

  // The world is a fixed paper of WORLD_W × WORLD_H. The viewport is bounded
  // to stay inside these limits no matter how the user zooms or pans.
  //   canvasPx = (worldPx - panPx) * zoom
  const WORLD_W = canvas.width;
  const WORLD_H = canvas.height;
  // MIN_ZOOM = 1 means "show the whole paper" — zooming out any further has
  // no additional content to reveal.
  const MIN_ZOOM = 1, MAX_ZOOM = 4;
  let zoom = 1, panX = 0, panY = 0;
  let pinching = false;
  let pinchStart = null;

  const clientToCanvas = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height)
    };
  };
  const canvasToWorld = (cx, cy) => ({ x: cx / zoom + panX, y: cy / zoom + panY });
  const clientToWorld = (e) => {
    const c = clientToCanvas(e);
    return canvasToWorld(c.x, c.y);
  };

  // Keep the viewport inside the paper. If the viewport is larger than the
  // paper in one dimension (shouldn't happen with MIN_ZOOM=1), center it.
  const clampPan = () => {
    const viewW = canvas.width / zoom;
    const viewH = canvas.height / zoom;
    if (viewW >= WORLD_W) panX = (WORLD_W - viewW) / 2;
    else panX = Math.max(0, Math.min(WORLD_W - viewW, panX));
    if (viewH >= WORLD_H) panY = (WORLD_H - viewH) / 2;
    else panY = Math.max(0, Math.min(WORLD_H - viewH, panY));
  };

  const setZoomAround = (newZoom, cx, cy) => {
    const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    const world = canvasToWorld(cx, cy);
    zoom = clamped;
    panX = world.x - cx / zoom;
    panY = world.y - cy / zoom;
    clampPan();
    scheduleRedraw();
  };
  const resetView = () => { zoom = 1; panX = 0; panY = 0; clampPan(); scheduleRedraw(); };

  // Offscreen buffer holds all *committed* actions so we don't redraw the
  // whole history on every pointermove. Live drawing = buffer blit + current.
  const buffer = document.createElement('canvas');
  buffer.width = canvas.width;
  buffer.height = canvas.height;
  const bctx = buffer.getContext('2d');

  const drawActionOn = (c, a) => {
    c.strokeStyle = a.color;
    c.fillStyle = a.color;
    c.lineWidth = a.strokeWidth;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    if (a.tool === 'pen' && a.points && a.points.length) {
      c.beginPath();
      c.moveTo(a.points[0].x, a.points[0].y);
      for (let i = 1; i < a.points.length; i++) c.lineTo(a.points[i].x, a.points[i].y);
      if (a.points.length === 1) {
        c.arc(a.points[0].x, a.points[0].y, a.strokeWidth / 2, 0, Math.PI * 2);
        c.fill();
      } else {
        c.stroke();
      }
    } else if (a.tool === 'line' && a.start && a.end) {
      c.beginPath(); c.moveTo(a.start.x, a.start.y); c.lineTo(a.end.x, a.end.y); c.stroke();
    } else if (a.tool === 'rect' && a.start && a.end) {
      c.beginPath(); c.rect(a.start.x, a.start.y, a.end.x - a.start.x, a.end.y - a.start.y); c.stroke();
    } else if (a.tool === 'ellipse' && a.start && a.end) {
      const cx = (a.start.x + a.end.x) / 2, cy = (a.start.y + a.end.y) / 2;
      const rx = Math.abs(a.end.x - a.start.x) / 2, ry = Math.abs(a.end.y - a.start.y) / 2;
      c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.stroke();
    } else if (a.tool === 'arrow' && a.start && a.end) {
      c.beginPath(); c.moveTo(a.start.x, a.start.y); c.lineTo(a.end.x, a.end.y); c.stroke();
      const angle = Math.atan2(a.end.y - a.start.y, a.end.x - a.start.x);
      const head = Math.max(12, a.strokeWidth * 3);
      c.beginPath();
      c.moveTo(a.end.x, a.end.y);
      c.lineTo(a.end.x - head * Math.cos(angle - Math.PI/6), a.end.y - head * Math.sin(angle - Math.PI/6));
      c.moveTo(a.end.x, a.end.y);
      c.lineTo(a.end.x - head * Math.cos(angle + Math.PI/6), a.end.y - head * Math.sin(angle + Math.PI/6));
      c.stroke();
    }
  };

  // Buffer caches the CURRENT viewport (zoom+pan applied) with all committed
  // strokes rasterized in. Drawing then = drawImage(buffer) + single live
  // stroke. On zoom/pan change we rebuild the buffer once.
  const rebuildBuffer = () => {
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.fillStyle = '#ffffff';
    bctx.fillRect(0, 0, buffer.width, buffer.height);
    bctx.setTransform(zoom, 0, 0, zoom, -panX * zoom, -panY * zoom);
    sketchState.actions.forEach(a => drawActionOn(bctx, a));
    bctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  let rafScheduled = false;
  const paintFrame = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(buffer, 0, 0);
    if (sketchState.current) {
      ctx.setTransform(zoom, 0, 0, zoom, -panX * zoom, -panY * zoom);
      drawActionOn(ctx, sketchState.current);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
  };
  const scheduleRedraw = () => {
    if (rafScheduled) return;
    rafScheduled = true;
    requestAnimationFrame(() => { rafScheduled = false; paintFrame(); });
  };
  const redraw = () => paintFrame();

  rebuildBuffer();
  redraw();

  canvas.addEventListener('pointerdown', (e) => {
    if (pinching) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    const p = clientToWorld(e);
    if (sketchState.tool === 'pen') {
      sketchState.current = { tool: 'pen', color: sketchState.color, strokeWidth: sketchState.strokeWidth, points: [p] };
    } else {
      sketchState.current = { tool: sketchState.tool, color: sketchState.color, strokeWidth: sketchState.strokeWidth, start: p, end: p };
    }
    scheduleRedraw();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (pinching || !sketchState.current) return;
    e.preventDefault();
    const events = (typeof e.getCoalescedEvents === 'function') ? e.getCoalescedEvents() : null;
    if (events && events.length > 1) {
      for (const ev of events) {
        const p = clientToWorld(ev);
        if (sketchState.current.tool === 'pen') sketchState.current.points.push(p);
        else sketchState.current.end = p;
      }
    } else {
      const p = clientToWorld(e);
      if (sketchState.current.tool === 'pen') sketchState.current.points.push(p);
      else sketchState.current.end = p;
    }
    scheduleRedraw();
  });
  const finish = (e) => {
    if (!sketchState.current) return;
    const cur = sketchState.current;
    const valid = (cur.tool === 'pen' && cur.points && cur.points.length > 0)
               || (cur.start && cur.end);
    if (valid) {
      sketchState.actions.push(cur);
      // Commit just this action to the buffer using the current viewport transform
      bctx.setTransform(zoom, 0, 0, zoom, -panX * zoom, -panY * zoom);
      drawActionOn(bctx, cur);
      bctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    sketchState.current = null;
    redraw();
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
  canvas.addEventListener('pointerleave', finish);

  // Two-finger pinch = zoom + pan. Keeps the world point under the pinch
  // midpoint stationary so pinching feels natural.
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      sketchState.current = null;
      pinching = true;
      const a = e.touches[0], b = e.touches[1];
      const rect = canvas.getBoundingClientRect();
      const midClientX = (a.clientX + b.clientX) / 2;
      const midClientY = (a.clientY + b.clientY) / 2;
      const midCanvasX = (midClientX - rect.left) * (canvas.width / rect.width);
      const midCanvasY = (midClientY - rect.top)  * (canvas.height / rect.height);
      pinchStart = {
        dist: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
        zoom,
        midWorld: canvasToWorld(midCanvasX, midCanvasY)
      };
      rebuildBuffer();
      redraw();
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    if (pinching && e.touches.length === 2) {
      e.preventDefault();
      const a = e.touches[0], b = e.touches[1];
      const rect = canvas.getBoundingClientRect();
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const midClientX = (a.clientX + b.clientX) / 2;
      const midClientY = (a.clientY + b.clientY) / 2;
      const midCanvasX = (midClientX - rect.left) * (canvas.width / rect.width);
      const midCanvasY = (midClientY - rect.top)  * (canvas.height / rect.height);
      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStart.zoom * (dist / (pinchStart.dist || 1))));
      panX = pinchStart.midWorld.x - midCanvasX / zoom;
      panY = pinchStart.midWorld.y - midCanvasY / zoom;
      clampPan();
      rebuildBuffer();
      scheduleRedraw();
    }
  }, { passive: false });
  const endPinch = (e) => {
    if (e.touches && e.touches.length < 2) {
      pinching = false;
      pinchStart = null;
    }
  };
  canvas.addEventListener('touchend', endPinch);
  canvas.addEventListener('touchcancel', endPinch);

  overlay.querySelectorAll('.sketch-tool[data-tool]').forEach(b =>
    b.addEventListener('click', () => {
      sketchState.tool = b.dataset.tool;
      overlay.querySelectorAll('.sketch-tool[data-tool]').forEach(x => x.classList.toggle('selected', x === b));
    }));
  overlay.querySelectorAll('.sketch-color').forEach(b =>
    b.addEventListener('click', () => {
      sketchState.color = b.dataset.color;
      overlay.querySelectorAll('.sketch-color').forEach(x => x.classList.toggle('selected', x === b));
    }));
  overlay.querySelectorAll('.sketch-stroke').forEach(b =>
    b.addEventListener('click', () => {
      sketchState.strokeWidth = parseInt(b.dataset.stroke, 10);
      overlay.querySelectorAll('.sketch-stroke').forEach(x => x.classList.toggle('selected', x === b));
    }));

  document.getElementById('sketch-undo').onclick = () => { sketchState.actions.pop(); rebuildBuffer(); redraw(); };
  document.getElementById('sketch-clear').onclick = () => { sketchState.actions = []; rebuildBuffer(); redraw(); };
  document.getElementById('sketch-zoom-in').onclick = () => {
    setZoomAround(zoom * 1.25, canvas.width / 2, canvas.height / 2);
    rebuildBuffer(); redraw();
  };
  document.getElementById('sketch-zoom-out').onclick = () => {
    setZoomAround(zoom / 1.25, canvas.width / 2, canvas.height / 2);
    rebuildBuffer(); redraw();
  };
  document.getElementById('sketch-zoom-reset').onclick = () => { resetView(); rebuildBuffer(); redraw(); };

  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  document.getElementById('sketch-cancel').onclick = close;
  document.getElementById('sketch-save').onclick = () => {
    if (sketchState.actions.length === 0) { showToast('Sketch is empty.', 'error'); return; }
    // Ensure canvas shows the final committed state before exporting.
    redraw();
    canvas.toBlob(async (blob) => {
      if (!blob) { showToast('Failed to export sketch.', 'error'); return; }
      try {
        const buf = await blob.arrayBuffer();
        const base64 = arrayBufferToBase64(buf);
        const name = `sketch-${Date.now()}.png`;
        const res = await window.api.saveAttachment(state.project, base64, name);
        if (res && res.ok && res.attachment) {
          if (isEdit) {
            updateSketchDump(existingDumpId, res.attachment, canvas.width, canvas.height, sketchState.actions);
            showToast('Sketch updated.', 'success');
          } else {
            addSketchDump(res.attachment, canvas.width, canvas.height, sketchState.actions);
            showToast('Sketch saved.', 'success');
          }
          close();
          refreshDumpHostView();
        } else {
          showToast(`Save failed: ${res?.error || 'unknown'}`, 'error');
        }
      } catch (e) {
        console.error(e);
        showToast(`Sketch save error: ${e.message}`, 'error');
      }
    }, 'image/png');
  };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  redraw();
}

function markDumpProcessed(dumpId) {
  const proj = getProject();
  const dump = (proj.dumps || []).find(d => d.id === dumpId);
  if (!dump) return;
  dump.processed = true;
  dump.processedAt = new Date().toISOString();
  saveData();
  refreshDumpHostView();
}

function unprocessDump(dumpId) {
  const proj = getProject();
  const dump = (proj.dumps || []).find(d => d.id === dumpId);
  if (!dump) return;
  dump.processed = false;
  dump.processedAt = null;
  saveData();
  refreshDumpHostView();
}

function dumpSummary(dump) {
  if (dump.text) return noteContentText(dump.text);
  if (dump.audio) return `Voice memo · ${dump.audio.name || ''}`;
  return '(empty dump)';
}

function dumpAudioAsAttachment(dump) {
  if (!dump.audio || !dump.audio.relPath) return null;
  return { relPath: dump.audio.relPath, name: dump.audio.name || 'voice-memo', size: dump.audio.size || 0 };
}

function askTitleForDumpConversion(dump, kind, onSave) {
  const overlay = document.getElementById('modal-overlay');
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  const suggested = noteContentText(dump.text || '').split('\n')[0].trim().slice(0, 120);
  const kindLabel = kind === 'todo' ? 'todo' : 'note';
  overlay.innerHTML = `
    <div class="modal dates-modal">
      <h3>Name this ${kindLabel}</h3>
      <div class="form-group" style="margin-bottom:10px">
        <label class="form-label">Title</label>
        <input type="text" class="form-input" id="dump-conv-title" placeholder="Enter a title..." value="${escapeHTML(suggested)}">
      </div>
      ${dump.audio ? `<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">🎙 Recording "${escapeHTML(dump.audio.name || '')}" will be attached.</div>` : ''}
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="dump-conv-cancel">Cancel</button>
        <button class="btn btn-primary" id="dump-conv-save">Create ${kindLabel}</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  const input = document.getElementById('dump-conv-title');
  input.focus();
  input.select();
  const trySave = () => {
    const title = input.value.trim();
    if (!title) { input.focus(); showToast('Please enter a title.', 'error'); return; }
    close();
    onSave(title);
  };
  document.getElementById('dump-conv-save').onclick = trySave;
  document.getElementById('dump-conv-cancel').onclick = close;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); trySave(); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
  overlay.onclick = e => { if (e.target === overlay) close(); };
}

function convertDumpToTodo(dumpId) {
  const proj = getProject();
  const dump = (proj.dumps || []).find(d => d.id === dumpId);
  if (!dump) return;
  const finalize = (title) => {
    const now = new Date().toISOString();
    const att = dumpAudioAsAttachment(dump);
    proj.todos.unshift({
      id: generateId('todo'),
      title,
      done: false,
      priority: 'medium',
      startDate: null,
      dueDate: null,
      subprojectId: dump.subprojectId || null,
      tags: [...(dump.tags || [])],
      created: now,
      completedAt: null,
      attachments: att ? [att] : [],
      steps: [],
      recurrence: null
    });
    markDumpProcessed(dumpId);
    showToast(`Added todo "${title}"`, 'success');
  };
  if (dump.audio) {
    askTitleForDumpConversion(dump, 'todo', finalize);
  } else {
    const title = noteContentText(dump.text || '').split('\n')[0].slice(0, 120);
    if (!title) { showToast('Nothing to convert.', 'info'); return; }
    finalize(title);
  }
}

function convertDumpToNote(dumpId) {
  const proj = getProject();
  const dump = (proj.dumps || []).find(d => d.id === dumpId);
  if (!dump) return;
  const finalize = (title) => {
    const body = (dump.text || '');
    const plainBody = noteContentText(body);
    const content = plainBody.length > title.length ? body : '';
    const att = dumpAudioAsAttachment(dump);
    const now = new Date().toISOString();
    proj.notes.unshift({
      id: generateId('note'),
      title,
      content,
      priority: 'medium',
      tags: ['from-dump'],
      subprojectId: dump.subprojectId || null,
      linkedTodos: [],
      created: now,
      updated: now,
      attachments: att ? [att] : []
    });
    markDumpProcessed(dumpId);
    showToast(`Added note "${title}"`, 'success');
  };
  if (dump.audio) {
    askTitleForDumpConversion(dump, 'note', finalize);
  } else {
    const firstLine = noteContentText(dump.text || '').split('\n')[0].trim();
    const title = firstLine.slice(0, 80) || 'Dump';
    finalize(title);
  }
}

function convertDumpToReminder(dumpId) {
  const proj = getProject();
  const dump = (proj.dumps || []).find(d => d.id === dumpId);
  if (!dump) return;
  const plainText = noteContentText(dump.text || '');
  const title = (plainText || 'Reminder').split('\n')[0].slice(0, 120);
  const overlay = document.getElementById('modal-overlay');
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = toDateString(tomorrow);
  overlay.innerHTML = `
    <div class="modal dates-modal">
      <h3>Create reminder</h3>
      <div class="form-group" style="margin-bottom:10px">
        <label class="form-label">Title</label>
        <input type="text" class="form-input" id="dump-rem-title" value="${escapeHTML(title)}">
      </div>
      <div class="dates-row">
        <div class="form-group" style="flex:1">
          <label class="form-label">Date</label>
          <input type="date" class="form-input" id="dump-rem-date" value="${defaultDate}">
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label">Time</label>
          <input type="time" class="form-input" id="dump-rem-time" value="09:00">
        </div>
      </div>
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="dump-rem-cancel">Cancel</button>
        <button class="btn btn-primary" id="dump-rem-save">Create</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  document.getElementById('dump-rem-cancel').onclick = close;
  document.getElementById('dump-rem-save').onclick = () => {
    const t = document.getElementById('dump-rem-title').value.trim();
    const d = document.getElementById('dump-rem-date').value;
    const time = document.getElementById('dump-rem-time').value;
    if (!t || !d || !time) { showToast('Fill in title, date, and time.', 'error'); return; }
    const datetime = new Date(`${d}T${time}:00`).toISOString();
    proj.reminders.push({
      id: generateId('rem'),
      title: t,
      note: plainText && plainText !== t ? plainText : '',
      datetime,
      fired: false,
      tags: [...(dump.tags || [])]
    });
    close();
    markDumpProcessed(dumpId);
    showToast(`Reminder set for ${formatDateTime(datetime)}`, 'success');
  };
}

// ===== Right-click "Create todo from selection" =====
// Lets the user select any span of text inside the dump capture box or a dump
// card, right-click, and spawn a todo from just that selection. Priority and
// due date can come from /slash tokens (/high, /tomorrow, /due 5d) or from
// natural-language phrases ("tomorrow", "fri", "in 3 days") — same parsers
// the main todo input uses, so the behavior is consistent.

// Returns the trimmed plain text of the current selection IF it lies entirely
// inside `el`. Empty string otherwise — that's the signal to fall through to
// the browser's default context menu (spellcheck, copy, paste, etc.).
function dumpSelectionTextInside(el) {
  const sel = (typeof window !== 'undefined' && window.getSelection) ? window.getSelection() : null;
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return '';
  const range = sel.getRangeAt(0);
  if (!el.contains(range.commonAncestorContainer)) return '';
  return (sel.toString() || '').trim();
}

function hideDumpSelectionContextMenu() {
  const m = document.getElementById('dump-selection-context-menu');
  if (m) m.remove();
  document.removeEventListener('mousedown', dumpSelectionContextMenuOutsideHandler, true);
  document.removeEventListener('keydown', dumpSelectionContextMenuKeyHandler, true);
  window.removeEventListener('blur', hideDumpSelectionContextMenu);
}
function dumpSelectionContextMenuOutsideHandler(e) {
  const m = document.getElementById('dump-selection-context-menu');
  if (m && !m.contains(e.target)) hideDumpSelectionContextMenu();
}
function dumpSelectionContextMenuKeyHandler(e) {
  if (e.key === 'Escape') { e.preventDefault(); hideDumpSelectionContextMenu(); }
}

function showDumpSelectionContextMenu(clientX, clientY, selectedText, subprojectId) {
  hideDumpSelectionContextMenu();
  const menu = document.createElement('div');
  menu.id = 'dump-selection-context-menu';
  menu.className = 'bm-context-menu';
  menu.innerHTML = `
    <button class="bm-ctx-item" data-action="todo">
      <span class="bm-ctx-icon">→</span><span>Create todo from selection</span>
    </button>`;
  document.body.appendChild(menu);
  // Clamp to the viewport so the menu never spills off-screen.
  const rect = menu.getBoundingClientRect();
  const x = Math.min(clientX, window.innerWidth - rect.width - 8);
  const y = Math.min(clientY, window.innerHeight - rect.height - 8);
  menu.style.left = `${Math.max(4, x)}px`;
  menu.style.top = `${Math.max(4, y)}px`;

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('.bm-ctx-item');
    if (!btn || btn.disabled) return;
    if (btn.dataset.action === 'todo') {
      hideDumpSelectionContextMenu();
      openCreateTodoFromSelectionModal(selectedText, subprojectId);
    }
  });

  // Defer the outside-click listeners by a tick so the right-click that opened
  // this menu doesn't immediately close it again.
  setTimeout(() => {
    document.addEventListener('mousedown', dumpSelectionContextMenuOutsideHandler, true);
    document.addEventListener('keydown', dumpSelectionContextMenuKeyHandler, true);
    window.addEventListener('blur', hideDumpSelectionContextMenu);
  }, 0);
}

// Opens the create-todo modal pre-filled from the selected text. /slash tokens
// (/high, /tomorrow, /due 5d) are stripped from the title and applied first.
// If no /due was set, parseQuickCapture pulls a natural-language date phrase
// ("tomorrow", "fri", "in 3 days") out of what remains. The form fields are
// the final source of truth — the user can still override anything.
function openCreateTodoFromSelectionModal(rawText, defaultSubprojectId) {
  const proj = getProject();
  if (!proj) return;
  const slash = parseTodoSlashCommands(rawText || '');
  let title = (slash.title || rawText || '').trim();
  let priority = slash.priority || 'medium';
  let dueDate = slash.dueDate || null;
  if (!dueDate) {
    const qc = parseQuickCapture(title);
    if (qc && qc.dueDate) { dueDate = qc.dueDate; title = (qc.title || title).trim(); }
  }
  // Long selections (paragraphs) would blow out the input. 200 chars matches the
  // longest practical title length the rest of the app handles comfortably.
  title = title.replace(/\s+/g, ' ').slice(0, 200);

  const overlay = document.getElementById('modal-overlay');
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  const sps = proj.subprojects || [];
  const spOptions = ['<option value="">— No subproject —</option>']
    .concat(sps.map(s => `<option value="${s.id}" ${s.id === defaultSubprojectId ? 'selected' : ''}>${escapeHTML(s.name)}</option>`))
    .join('');
  overlay.innerHTML = `
    <div class="modal dates-modal">
      <h3>Create todo from selection</h3>
      <div class="form-group" style="margin-bottom:10px">
        <label class="form-label">Title</label>
        <input type="text" class="form-input" id="sel-todo-title" value="${escapeHTML(title)}">
      </div>
      <div class="dates-row">
        <div class="form-group" style="flex:1">
          <label class="form-label">Priority</label>
          <select class="form-input" id="sel-todo-priority">
            <option value="high"   ${priority === 'high'   ? 'selected' : ''}>High</option>
            <option value="medium" ${priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="low"    ${priority === 'low'    ? 'selected' : ''}>Low</option>
          </select>
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label">Due date</label>
          <input type="date" class="form-input" id="sel-todo-due" value="${dueDate || ''}">
        </div>
      </div>
      ${sps.length ? `
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label">Subproject</label>
          <select class="form-input" id="sel-todo-sp">${spOptions}</select>
        </div>` : ''}
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="sel-todo-cancel">Cancel</button>
        <button class="btn btn-primary" id="sel-todo-save">Create todo</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  document.getElementById('sel-todo-cancel').onclick = close;
  // Focus + select the title so the user can either accept (Enter) or retype.
  setTimeout(() => {
    const t = document.getElementById('sel-todo-title');
    if (t) { t.focus(); t.select(); }
  }, 0);
  const save = () => {
    const t = (document.getElementById('sel-todo-title').value || '').trim();
    if (!t) { showToast('Title is required.', 'error'); return; }
    const p = document.getElementById('sel-todo-priority').value || 'medium';
    const d = document.getElementById('sel-todo-due').value || null;
    const sp = document.getElementById('sel-todo-sp')?.value || null;
    proj.todos.unshift({
      id: generateId('todo'),
      title: t,
      done: false,
      priority: p,
      startDate: null,
      dueDate: d,
      subprojectId: sp || null,
      tags: [],
      created: new Date().toISOString(),
      completedAt: null,
      attachments: [],
      steps: [],
      recurrence: null
    });
    saveData();
    close();
    showToast(`Added todo "${t}"`, 'success');
  };
  document.getElementById('sel-todo-save').onclick = save;
  // Enter inside the title saves — matches the keyboard-only feel of the main
  // todo input. Shift+Enter is left alone in case the field grows to textarea.
  document.getElementById('sel-todo-title').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); }
  });
}

// Hooks `contextmenu` on a dump-zone editor. The menu only appears when there's
// a non-empty selection inside `el` — right-clicks with no selection fall back
// to the browser default so spellcheck and paste still work. `subprojectIdGetter`
// is called lazily so per-card subproject changes (via the dropdown) are picked
// up at right-click time, not at handler-install time.
function attachDumpSelectionContextMenu(el, subprojectIdGetter) {
  if (!el || el.dataset.dumpSelMenuHooked === '1') return;
  el.dataset.dumpSelMenuHooked = '1';
  el.addEventListener('contextmenu', (e) => {
    const text = dumpSelectionTextInside(el);
    if (!text) return;
    e.preventDefault();
    const spId = typeof subprojectIdGetter === 'function' ? subprojectIdGetter() : (subprojectIdGetter || null);
    showDumpSelectionContextMenu(e.clientX, e.clientY, text, spId);
  });
}

async function startVoiceRecording() {
  if (dumpVoiceState.recorder) return;
  console.log('[dump] startVoiceRecording');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Recording not supported: navigator.mediaDevices missing.', 'error');
    return;
  }
  if (typeof MediaRecorder === 'undefined') {
    showToast('Recording not supported: MediaRecorder missing.', 'error');
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    console.log('[dump] getUserMedia OK', stream);
  } catch (e) {
    console.error('[dump] getUserMedia failed', e);
    showToast(`Microphone access denied: ${e.name || ''} ${e.message || ''}. Fully restart the app so the permission handler loads.`, 'error');
    return;
  }
  let recorder;
  try {
    recorder = new MediaRecorder(stream);
    console.log('[dump] MediaRecorder created, mimeType:', recorder.mimeType);
  } catch (e) {
    console.error('[dump] MediaRecorder construction failed', e);
    stream.getTracks().forEach(t => t.stop());
    showToast(`MediaRecorder error: ${e.message}`, 'error');
    return;
  }
  const chunks = [];
  recorder.addEventListener('dataavailable', e => {
    console.log('[dump] dataavailable chunk', e.data?.size);
    if (e.data && e.data.size > 0) chunks.push(e.data);
  });
  recorder.addEventListener('error', e => {
    console.error('[dump] recorder error', e);
    showToast(`Recorder error: ${e.error?.message || 'unknown'}`, 'error');
  });
  recorder.addEventListener('stop', async () => {
    console.log('[dump] stop event fired, chunks:', chunks.length, 'first type:', chunks[0]?.type);
    console.log('[dump] session peak audio level:', dumpVoiceState.peak, '/128 (0 = silent, 128 = max)');
    const blob = new Blob(chunks, { type: chunks[0]?.type || recorder.mimeType || 'audio/webm' });
    console.log('[dump] blob size:', blob.size, 'type:', blob.type);
    stream.getTracks().forEach(t => t.stop());
    const durationSec = dumpVoiceState.startedAt ? Math.round((Date.now() - dumpVoiceState.startedAt) / 1000) : null;
    const sessionPeak = dumpVoiceState.peak;
    dumpVoiceState.recorder = null;
    dumpVoiceState.chunks = [];
    dumpVoiceState.stream = null;
    dumpVoiceState.startedAt = null;
    dumpVoiceState.peak = 0;
    if (dumpVoiceState.timerHandle) { clearInterval(dumpVoiceState.timerHandle); dumpVoiceState.timerHandle = null; }
    if (dumpVoiceState.levelHandle) { clearInterval(dumpVoiceState.levelHandle); dumpVoiceState.levelHandle = null; }
    if (dumpVoiceState.audioCtx) { try { dumpVoiceState.audioCtx.close(); } catch {} dumpVoiceState.audioCtx = null; }
    dumpVoiceState.analyser = null;
    if (sessionPeak < 3) {
      showToast(`Mic appears silent (peak ${sessionPeak}/128). Check Windows mic input device.`, 'error');
    }

    if (blob.size === 0) {
      showToast('Recording was empty (0 bytes). Speak longer or check your mic.', 'error');
      refreshDumpHostView();
      return;
    }
    try {
      const buf = await blob.arrayBuffer();
      const base64 = arrayBufferToBase64(buf);
      const ext = (blob.type && blob.type.includes('ogg')) ? '.ogg' : '.webm';
      const name = `voice-memo-${Date.now()}${ext}`;
      console.log('[dump] calling saveAttachment, project:', state.project, 'bytes:', buf.byteLength);
      if (!window.api || typeof window.api.saveAttachment !== 'function') {
        showToast('saveAttachment API missing. Fully restart the app.', 'error');
        refreshDumpHostView();
        return;
      }
      const res = await window.api.saveAttachment(state.project, base64, name);
      console.log('[dump] saveAttachment result:', res);
      if (res && res.ok && res.attachment) {
        addVoiceDump(res.attachment, durationSec, null);
        showToast(`Voice memo saved (${Math.round(blob.size/1024)} KB)`, 'success');
      } else {
        showToast(`Save failed: ${res?.error || 'unknown'}`, 'error');
      }
    } catch (e) {
      console.error('[dump] stop handler error', e);
      showToast(`Stop handler error: ${e.message}`, 'error');
    }
    refreshDumpHostView();
  });

  dumpVoiceState.recorder = recorder;
  dumpVoiceState.chunks = chunks;
  dumpVoiceState.stream = stream;
  dumpVoiceState.startedAt = Date.now();
  dumpVoiceState.peak = 0;

  // Audio level analyser so the user can see mic is picking up sound
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    dumpVoiceState.audioCtx = ctx;
    dumpVoiceState.analyser = analyser;
    const buf = new Uint8Array(analyser.fftSize);
    let peakSinceLog = 0;
    let lastLogTs = Date.now();
    dumpVoiceState.levelHandle = setInterval(() => {
      analyser.getByteTimeDomainData(buf);
      // Peak deviation from silence (128)
      let peak = 0;
      for (let i = 0; i < buf.length; i++) {
        const d = Math.abs(buf[i] - 128);
        if (d > peak) peak = d;
      }
      if (peak > peakSinceLog) peakSinceLog = peak;
      if (peak > dumpVoiceState.peak) dumpVoiceState.peak = peak;
      const bar = document.getElementById('dump-voice-level-bar');
      if (bar) bar.style.width = Math.min(100, (peak / 128) * 100) + '%';
      if (Date.now() - lastLogTs > 1000) {
        console.log('[dump] audio peak last 1s:', peakSinceLog, '/128');
        peakSinceLog = 0;
        lastLogTs = Date.now();
      }
    }, 50);
  } catch (e) {
    console.warn('[dump] audio level meter init failed', e);
  }

  try {
    recorder.start(500); // emit a chunk every 500ms so tiny recordings still produce data
    console.log('[dump] recorder.start(500) called, state:', recorder.state);
  } catch (e) {
    console.error('[dump] recorder.start threw', e);
    showToast(`recorder.start failed: ${e.message}`, 'error');
    stream.getTracks().forEach(t => t.stop());
    dumpVoiceState.recorder = null;
    return;
  }
  const indicator = document.getElementById('dump-voice-indicator');
  if (indicator) {
    indicator.classList.add('recording');
    dumpVoiceState.timerHandle = setInterval(() => {
      const el = document.getElementById('dump-voice-timer');
      if (!el) return;
      const secs = Math.floor((Date.now() - dumpVoiceState.startedAt) / 1000);
      el.textContent = `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
    }, 500);
  }
  const btn = document.getElementById('btn-dump-record');
  if (btn) { btn.textContent = '⏹ Stop'; btn.classList.add('recording'); }
}

function stopVoiceRecording() {
  const recorder = dumpVoiceState.recorder;
  if (!recorder) return;
  if (recorder.state !== 'inactive') recorder.stop();
}

// Color-tinted subproject dropdown used in dump cards and the capture toolbar.
// Extracted so the subproject-view embedded capture can render the same chip.
function dumpSubprojectSelectHTML(currentId, datasetKey, datasetValue) {
  const proj = getProject();
  const subprojects = proj.subprojects || [];
  if (!subprojects.length) return '';
  const spById = Object.fromEntries(subprojects.map(s => [s.id, s]));
  const sp = currentId ? spById[currentId] : null;
  const style = sp
    ? `background:${sp.color}22;color:${sp.color};border-color:${sp.color}44`
    : `background:transparent;color:#94a3b8;border-color:#cbd5e1`;
  return `<select class="todo-sp-select dump-sp-select" ${datasetKey}="${datasetValue}" title="Assign subproject" style="${style}">
    <option value="" ${!sp?'selected':''}>No subproject</option>
    ${subprojects.map(s => `<option value="${s.id}" ${s.id===currentId?'selected':''}>${escapeHTML(s.name)}</option>`).join('')}
  </select>`;
}

function dumpCardHTML(d, processedMode) {
  const proj = getProject();
  const spById = Object.fromEntries((proj.subprojects || []).map(s => [s.id, s]));
  const typeIcon = (t) => t === 'voice' ? '🎙' : t === 'email' ? '✉' : t === 'sketch' ? '✏' : '🗒';
  const suggestions = suggestDumpActions(noteContentText(d.text || '') || (d.type === 'sketch' ? 'sketch' : ''));
  const audio = d.audio;
  const image = d.image;
  return `<div class="dump-card ${processedMode?'processed':''}">
    <div class="dump-card-header">
      <span class="dump-type">${typeIcon(d.type)}</span>
      <span class="dump-time">${formatDateTime(d.created)}</span>
      ${audio && audio.durationSec ? `<span class="dump-time">· ${Math.floor(audio.durationSec/60)}:${String(audio.durationSec%60).padStart(2,'0')}</span>` : ''}
      ${image && image.width && image.height ? `<span class="dump-time">· ${image.width}×${image.height}</span>` : ''}
      ${!processedMode ? dumpSubprojectSelectHTML(d.subprojectId, 'data-dump-sp-id', d.id) : (d.subprojectId && spById[d.subprojectId] ? `<span class="todo-sp-chip" style="background:${spById[d.subprojectId].color}22;color:${spById[d.subprojectId].color};border:1px solid ${spById[d.subprojectId].color}44;margin-left:auto">${escapeHTML(spById[d.subprojectId].name)}</span>` : '')}
    </div>
    ${d.text ? `<div class="dump-text dump-text-edit" contenteditable="true" data-dump-text-id="${d.id}" data-placeholder="(empty)">${noteContentInitialHTML(d.text)}</div>` : ''}
    ${audio ? `<button class="btn btn-ghost btn-sm dump-play" data-audio-rel="${escapeHTML(audio.relPath)}" data-audio-mime="${audio.relPath.endsWith('.ogg') ? 'audio/ogg' : 'audio/webm'}">▶ Play voice memo</button>
      <div class="dump-audio-container" data-audio-container="${d.id}"></div>` : ''}
    ${image ? `<div class="dump-sketch"><img class="dump-sketch-img" data-sketch-rel="${escapeHTML(image.relPath)}" data-sketch-edit-id="${d.id}" alt="sketch" title="${(image.actions && image.actions.length) ? 'Click to edit' : 'Click to view'}"></div>` : ''}
    ${!processedMode ? `
      <div class="dump-card-footer">
        ${suggestions.length ? `<div class="dump-suggestions"><span class="dump-suggestions-label">Suggested:</span>${suggestions.map(s => `<span class="dump-suggestion-badge">${s}</span>`).join('')}</div>` : ''}
        <div class="dump-actions">
          <button class="btn btn-ghost btn-sm dump-action" data-dump-action="todo" data-dump-id="${d.id}" ${suggestions.includes('todo')?'data-suggested="1"':''}>→ Todo</button>
          <button class="btn btn-ghost btn-sm dump-action" data-dump-action="note" data-dump-id="${d.id}" ${suggestions.includes('note')?'data-suggested="1"':''}>→ Note</button>
          <button class="btn btn-ghost btn-sm dump-action" data-dump-action="reminder" data-dump-id="${d.id}" ${suggestions.includes('reminder')?'data-suggested="1"':''}>→ Reminder</button>
          <button class="btn btn-ghost btn-sm dump-action" data-dump-action="archive" data-dump-id="${d.id}">✓ Archive</button>
          <button class="btn btn-ghost btn-sm dump-action-danger" data-dump-action="delete" data-dump-id="${d.id}">✕</button>
        </div>
      </div>` : `
      <div class="dump-card-footer">
        <button class="btn btn-ghost btn-sm dump-action" data-dump-action="unarchive" data-dump-id="${d.id}">↺ Reopen</button>
        <button class="btn btn-ghost btn-sm dump-action-danger" data-dump-action="delete" data-dump-id="${d.id}">✕</button>
      </div>`}
  </div>`;
}

// The text/voice/sketch capture toolbar. `fixedSubprojectId` locks the dump to
// the given subproject (used by the subproject detail view); when null the
// regular dropdown is shown so the user can choose freely.
function dumpCaptureHTML(opts) {
  const { fixedSubprojectId = null } = opts || {};
  const proj = getProject();
  const spById = Object.fromEntries((proj.subprojects || []).map(s => [s.id, s]));
  const fixedSp = fixedSubprojectId && spById[fixedSubprojectId] ? spById[fixedSubprojectId] : null;
  const lockBadge = fixedSp
    ? `<span class="todo-sp-chip" style="background:${fixedSp.color}22;color:${fixedSp.color};border:1px solid ${fixedSp.color}44" title="Dumps captured here are assigned to this subproject">In: ${escapeHTML(fixedSp.name)}</span>`
    : '';
  const spSelect = fixedSubprojectId === null
    ? dumpSubprojectSelectHTML(state.pendingDumpSubprojectId, 'id', 'dump-capture-sp')
    : '';
  const captureLabel = fixedSp
    ? `Dump anything into <strong>${escapeHTML(fixedSp.name)}</strong> — typed, pasted email, voice`
    : 'Dump anything — typed, pasted email, voice';
  return `<div class="dump-capture">
    <div class="dump-capture-label">${captureLabel}</div>
    <div class="dump-rtf-toolbar" id="dump-rtf-toolbar">
      <button type="button" data-rtf="bold" title="Bold (Ctrl+B)"><b>B</b></button>
      <button type="button" data-rtf="italic" title="Italic (Ctrl+I)"><i>I</i></button>
      <button type="button" data-rtf="underline" title="Underline (Ctrl+U)"><u>U</u></button>
      <button type="button" data-rtf="strikeThrough" title="Strikethrough"><s>S</s></button>
      <span class="rtf-sep"></span>
      <button type="button" data-rtf="insertUnorderedList" title="Bulleted list">•</button>
      <button type="button" data-rtf="insertOrderedList" title="Numbered list">1.</button>
      <span class="rtf-sep"></span>
      <button type="button" data-rtf="removeFormat" title="Clear formatting">⌫</button>
    </div>
    <div class="dump-rich" id="dump-input" contenteditable="true" data-placeholder="Type a thought, paste an email, or record a voice memo…"></div>
    <div class="dump-capture-actions">
      <button class="btn btn-primary" id="btn-dump-save">Save thought</button>
      <button class="btn btn-secondary" id="btn-dump-save-email">Save as email</button>
      <button class="btn btn-ghost" id="btn-dump-record">🎙 Record</button>
      ${hasTouchScreen() ? `<button class="btn btn-ghost" id="btn-dump-sketch">✏ Sketch</button>` : ''}
      ${spSelect}
      ${lockBadge}
      <span class="dump-voice-status" id="dump-voice-indicator"><span class="dump-voice-dot"></span><span id="dump-voice-timer">00:00</span><span class="dump-voice-level"><span id="dump-voice-level-bar"></span></span></span>
    </div>
  </div>`;
}

function bindDumpCaptureControls(opts) {
  const { fixedSubprojectId = null } = opts || {};
  const proj = getProject();
  // Lock the pending sp at the moment a save/record/sketch starts. We mutate
  // state.pendingDumpSubprojectId here (rather than on view render) so that an
  // in-flight recording started in the dump-zone view doesn't get retargeted
  // just because the user navigated to a subproject.
  const applySpOverride = () => {
    if (fixedSubprojectId !== null) state.pendingDumpSubprojectId = fixedSubprojectId;
  };

  const saveThought = (type = 'text') => {
    const el = document.getElementById('dump-input');
    const html = el ? (el.innerHTML || '') : '';
    const plain = noteContentText(html);
    const hasImage = /<img\b/i.test(html);
    if (!plain && !hasImage) { showToast('Type or paste something first.', 'error'); el?.focus(); return; }
    applySpOverride();
    addTextDump(html, type);
    if (el) el.innerHTML = '';
    refreshDumpHostView();
    document.getElementById('dump-input')?.focus();
  };
  document.getElementById('btn-dump-save')?.addEventListener('click', () => saveThought('text'));
  document.getElementById('btn-dump-save-email')?.addEventListener('click', () => saveThought('email'));
  const dumpInputEl = document.getElementById('dump-input');
  if (dumpInputEl) {
    installRichEditorPaste(dumpInputEl);
    dumpInputEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); saveThought('text'); }
    });
    // Right-click on a selection → "Create todo from selection". Respects the
    // fixed subproject override so the todo lands in the same place a "Save
    // thought" would.
    attachDumpSelectionContextMenu(dumpInputEl, () =>
      fixedSubprojectId !== null ? fixedSubprojectId : (state.pendingDumpSubprojectId || null));
  }
  document.querySelectorAll('#dump-rtf-toolbar [data-rtf]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => {
      const editor = document.getElementById('dump-input');
      if (!editor) return;
      editor.focus();
      try { document.execCommand(btn.dataset.rtf, false, null); } catch {}
    });
  });

  document.getElementById('btn-dump-record')?.addEventListener('click', () => {
    if (dumpVoiceState.recorder) { stopVoiceRecording(); return; }
    applySpOverride();
    startVoiceRecording();
  });
  document.getElementById('btn-dump-sketch')?.addEventListener('click', () => {
    applySpOverride();
    showSketchModal();
  });

  // The freeform subproject selector only exists when there's no fixed override
  if (fixedSubprojectId === null) {
    document.querySelector('.dump-capture-actions .dump-sp-select')?.addEventListener('change', (e) => {
      state.pendingDumpSubprojectId = e.target.value || null;
      const sp = state.pendingDumpSubprojectId ? proj.subprojects.find(s => s.id === state.pendingDumpSubprojectId) : null;
      const style = sp
        ? `background:${sp.color}22;color:${sp.color};border-color:${sp.color}44`
        : `background:transparent;color:#94a3b8;border-color:#cbd5e1`;
      e.target.setAttribute('style', style);
    });
  }

  // If a recording was already in-flight before this render, restore the UI
  // affordances (record button label, indicator, ticking timer) — the recorder
  // itself lives in module state so it survived the re-render.
  if (dumpVoiceState.recorder) {
    const btn = document.getElementById('btn-dump-record');
    const indicator = document.getElementById('dump-voice-indicator');
    if (btn) { btn.textContent = '⏹ Stop'; btn.classList.add('recording'); }
    if (indicator) indicator.classList.add('recording');
    if (!dumpVoiceState.timerHandle && dumpVoiceState.startedAt) {
      dumpVoiceState.timerHandle = setInterval(() => {
        const el = document.getElementById('dump-voice-timer');
        if (!el) return;
        const secs = Math.floor((Date.now() - dumpVoiceState.startedAt) / 1000);
        el.textContent = `${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
      }, 500);
    }
  }
}

function bindDumpCardControls() {
  // Per-dump subproject selector (updates the stored dump)
  document.querySelectorAll('.dump-card .dump-sp-select[data-dump-sp-id]').forEach(sel => {
    sel.addEventListener('click', ev => ev.stopPropagation());
    sel.addEventListener('change', () => {
      if (setDumpSubproject(sel.dataset.dumpSpId, sel.value)) refreshDumpHostView();
    });
  });

  // Inline editing of dump text. Mirrors the flow-node-text pattern:
  // every input persists immediately so edits survive view switches and
  // app restarts. Re-rendering (subproject change, archive, etc.) blows
  // away focus — that's tolerable because those actions are click-driven,
  // and the user-initiated text edit doesn't trigger any re-render itself.
  document.querySelectorAll('[data-dump-text-id]').forEach(el => {
    installRichEditorPaste(el);
    el.addEventListener('input', () => {
      updateDumpText(el.dataset.dumpTextId, el.innerHTML || '');
    });
    // Ctrl+Enter inside an editable dump should NOT reach the global
    // submit handler — there's no primary button to fire here.
    el.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') e.stopPropagation();
    });
    // Right-click on a selection → "Create todo from selection". Lazy getter
    // so the subproject is read fresh (the per-card <select> can change it
    // between render and right-click without a re-render).
    attachDumpSelectionContextMenu(el, () => {
      const dumpId = el.dataset.dumpTextId;
      const proj = getProject();
      return (proj?.dumps || []).find(d => d.id === dumpId)?.subprojectId || null;
    });
  });

  // Lazy-load sketch thumbnails from the project attachments folder
  document.querySelectorAll('.dump-sketch-img[data-sketch-rel]').forEach(async (img) => {
    const rel = img.dataset.sketchRel;
    if (!rel) return;
    if (attachmentThumbCache.has(rel)) {
      const cached = attachmentThumbCache.get(rel);
      if (cached) img.src = cached;
      return;
    }
    try {
      const url = await window.api.readAttachmentDataUrl(rel);
      attachmentThumbCache.set(rel, url || null);
      if (url) img.src = url;
    } catch (e) {
      console.error('sketch thumbnail load:', e);
    }
  });

  // Click a sketch thumbnail to open it in edit mode
  document.querySelectorAll('.dump-sketch-img[data-sketch-edit-id]').forEach(img =>
    img.addEventListener('click', () => showSketchModal(img.dataset.sketchEditId)));

  document.querySelectorAll('.dump-action, .dump-action-danger').forEach(btn =>
    btn.addEventListener('click', () => {
      const action = btn.dataset.dumpAction;
      const id = btn.dataset.dumpId;
      if (action === 'todo') convertDumpToTodo(id);
      else if (action === 'note') convertDumpToNote(id);
      else if (action === 'reminder') convertDumpToReminder(id);
      else if (action === 'archive') markDumpProcessed(id);
      else if (action === 'unarchive') unprocessDump(id);
      else if (action === 'delete') { deleteDump(id); showToast('Dump deleted.', 'info'); }
    }));

  document.querySelectorAll('.dump-play').forEach(btn =>
    btn.addEventListener('click', async () => {
      const rel = btn.dataset.audioRel;
      const card = btn.closest('.dump-card');
      const container = card?.querySelector('.dump-audio-container');
      if (!container) return;
      if (container.firstChild) { container.innerHTML = ''; btn.textContent = '▶ Play voice memo'; return; }
      if (!window.api || typeof window.api.readAttachmentDataUrl !== 'function') {
        showToast('Audio API unavailable — please fully restart the app.', 'error');
        return;
      }
      try {
        const url = await window.api.readAttachmentDataUrl(rel);
        if (!url) {
          console.error('readAttachmentDataUrl returned null for', rel);
          showToast('Audio unreachable. Fully restart the app (close window + relaunch) so the new audio MIME handlers load.', 'error');
          return;
        }
        const audio = document.createElement('audio');
        audio.controls = true;
        audio.src = url;
        fixAudioDuration(audio);
        audio.style.width = '100%';
        audio.style.marginTop = '8px';
        audio.addEventListener('error', () => {
          console.error('audio element error', audio.error);
          showToast(`Audio playback failed (code ${audio.error?.code || '?'}). The recording may be corrupted.`, 'error');
        });
        container.innerHTML = '';
        container.appendChild(audio);
        audio.play().catch(() => {});
        btn.textContent = '⏸ Hide player';
      } catch (e) {
        console.error(e);
        showToast(`Audio error: ${e.message}`, 'error');
      }
    }));
}

function renderDumpZone() {
  const proj = getProject();
  if (!Array.isArray(proj.dumps)) proj.dumps = [];
  const pending = proj.dumps.filter(d => !d.processed);
  const processed = proj.dumps.filter(d => d.processed).sort((a,b) => new Date(b.processedAt || 0) - new Date(a.processedAt || 0));
  const spById = Object.fromEntries((proj.subprojects || []).map(s => [s.id, s]));

  // Reset pending-subproject if the user switched projects and the old id is gone
  if (state.pendingDumpSubprojectId && !spById[state.pendingDumpSubprojectId]) {
    state.pendingDumpSubprojectId = null;
  }

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-dumpzone">
      <div class="view-header">
        <div class="view-header-row">
          <div class="view-title">🧠 Dump Zone</div>
          <span style="font-size:13px;color:var(--text-muted)">Capture first, organize later · ${pending.length} pending</span>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:0 24px 24px">
        ${dumpCaptureHTML()}

        <div class="dump-section-title">To process <span class="dump-section-count">${pending.length}</span></div>
        ${pending.length
          ? `<div class="dump-list">${pending.map(d => dumpCardHTML(d, false)).join('')}</div>`
          : '<div class="empty-state" style="padding:20px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border)">Nothing to process. Dump a thought above to get started.</div>'}

        ${processed.length ? `
          <details class="dump-processed-wrap" ${pending.length === 0 ? 'open' : ''}>
            <summary class="dump-section-title dump-processed-summary">Processed <span class="dump-section-count">${processed.length}</span></summary>
            <div class="dump-list">${processed.map(d => dumpCardHTML(d, true)).join('')}</div>
          </details>` : ''}
      </div>
    </div>`;

  bindDumpCaptureControls();
  bindDumpCardControls();
}

