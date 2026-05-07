'use strict';

// ===== src/03-undo-save.js =====
// Wave-1 extraction (M0): undo/redo machinery, the central saveData() that
// every mutation funnels through (200+ call sites in residual app.js), the
// _writeDataToDisk IPC bridge, the showToast / showModal global UI helpers,
// and the small linkage / brainmap-ancestor utilities that hang off
// getProject().
//
// var conversion: UNDO_MAX, undoStack, redoStack, undoSuspended. The first
// three are referenced from the undo() and redo() functions in this file
// only, but the var keeps the conversion rule uniform; undoSuspended is
// also referenced cross-file by callers that want to bypass snapshot push
// during programmatic mutations (none today, but the import path will).
//
// saveData() calls _invalidateSmartLinkIndex() through a typeof guard, so
// the dependency on src/05-node-links.js / smart-link index code in app.js
// is one-way and lazy — extraction order does not matter.
// ===== UNDO / REDO =====
// Stores up to UNDO_MAX deep-cloned snapshots of state.data, one per saveData call.
// Invariant after every save: undoStack[last] === current state.data (deep-equal).
var UNDO_MAX = 50;
var undoStack = [];
var redoStack = [];
var undoSuspended = false;

function pushUndoSnapshot() {
  if (undoSuspended) return;
  if (!state.data) return;
  try {
    const snap = JSON.parse(JSON.stringify(state.data));
    undoStack.push(snap);
    if (undoStack.length > UNDO_MAX) undoStack.shift();
    redoStack.length = 0;
  } catch (e) {
    console.error('[undo] snapshot failed', e);
  }
}

async function _writeDataToDisk() {
  state.data.activeProject = state.project;
  await window.api.saveData(state.data);
}

async function saveData() {
  pushUndoSnapshot();
  // Smart-link suggestions key off entity titles + tags; any data change
  // can shift the index. Invalidating here means the next refresh during
  // typing rebuilds — sub-ms work, no UX impact.
  if (typeof _invalidateSmartLinkIndex === 'function') _invalidateSmartLinkIndex();
  await _writeDataToDisk();
}

function captureInitialUndoSnapshot() {
  if (state.data && undoStack.length === 0) {
    try {
      undoStack.push(JSON.parse(JSON.stringify(state.data)));
    } catch {}
  }
}

function _restoreSnapshotIntoState(snap) {
  state.data = JSON.parse(JSON.stringify(snap));
  // Repair view pointers if the active project disappeared in the past state.
  if (state.data.activeProject && state.data.projects[state.data.activeProject]) {
    state.project = state.data.activeProject;
  } else if (!state.data.projects[state.project]) {
    state.project = Object.keys(state.data.projects)[0] || null;
  }
  document.body.setAttribute('data-project', state.project || '');
  applyCurrentTheme();
}

async function undo() {
  if (undoStack.length < 2) {
    showToast('Nothing to undo.', 'info');
    return;
  }
  // Move current state (top of undoStack) into redoStack
  redoStack.push(undoStack.pop());
  // Restore the previous one — now the new top
  const target = undoStack[undoStack.length - 1];
  undoSuspended = true;
  try {
    _restoreSnapshotIntoState(target);
    await _writeDataToDisk();
  } finally {
    undoSuspended = false;
  }
  renderApp();
  showToast(`Undone (${undoStack.length - 1} more available).`, 'info');
}

async function redo() {
  if (redoStack.length === 0) {
    showToast('Nothing to redo.', 'info');
    return;
  }
  const target = redoStack.pop();
  undoStack.push(target);
  undoSuspended = true;
  try {
    _restoreSnapshotIntoState(target);
    await _writeDataToDisk();
  } finally {
    undoSuspended = false;
  }
  renderApp();
  showToast(`Redone (${redoStack.length} more available).`, 'info');
}

function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3500);
}

function showModal(title, defaultVal, callback) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal">
      <h3>${escapeHTML(title)}</h3>
      <input type="text" class="modal-input" id="modal-input" value="${escapeHTML(defaultVal)}">
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
        <button class="btn btn-primary" id="modal-ok">OK</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  const inp = document.getElementById('modal-input');
  inp.focus(); inp.select();
  const close = (val) => { overlay.classList.add('hidden'); if (val !== null) callback(val); };
  document.getElementById('modal-ok').onclick = () => close(inp.value.trim());
  document.getElementById('modal-cancel').onclick = () => close(null);
  inp.onkeydown = (e) => { if (e.key === 'Enter') close(inp.value.trim()); if (e.key === 'Escape') close(null); };
}

function getNotesLinkedToTodo(todoId) {
  return getProject().notes.filter(n => (n.linkedTodos || []).includes(todoId));
}

function getSubprojectTodos(spId) {
  return getProject().todos.filter(t => t.subprojectId === spId);
}

function getSubprojectNotes(spId) {
  return getProject().notes.filter(n => n.subprojectId === spId);
}

function getSubprojectDumps(spId) {
  return (getProject().dumps || []).filter(d => d.subprojectId === spId);
}

function getSubprojectSparkNodes(spId) {
  const bm = getProject().brainmap;
  if (!bm || !bm.nodes) return [];
  return Object.values(bm.nodes).filter(n => n.subprojectId === spId);
}

function bmAncestorPath(nodeId) {
  const bm = getProject().brainmap;
  if (!bm || !bm.nodes || !bm.nodes[nodeId]) return '';
  const parts = [];
  let cur = bm.nodes[nodeId];
  while (cur && cur.parentId) {
    const parent = bm.nodes[cur.parentId];
    if (!parent) break;
    parts.unshift(parent.label);
    cur = parent;
  }
  return parts.join(' › ');
}

