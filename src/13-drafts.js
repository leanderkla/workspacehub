'use strict';

// ===== src/13-drafts.js =====
// Per-form draft cache. Snapshots in-progress input fields so switching views
// (or the entire app restarting) doesn't silently drop what the user typed.
//
// Scope key convention — kept as a plain string so it can be looked up
// statelessly from showView():
//   todos::<projectKey>
//   note::<projectKey>::<noteId|'new'>
//   commitments::<projectKey>
//   delegations::<projectKey>
//   reminders::<projectKey>
//
// Drafts are cleared explicitly by the success path of each add/save function
// (addTodo, saveNote, addReminder, etc). Stale drafts are otherwise sticky —
// preferred over silently losing user input.
//
// `var` (not `const`) so the namespace lands on globalThis for app.js + other
// src/ modules — same pattern as 01-types-state.js.

var DRAFT_LS_KEY = 'workspaceHubInputDrafts';

function _draftsLoadAll() {
  try { return JSON.parse(localStorage.getItem(DRAFT_LS_KEY)) || {}; }
  catch { return {}; }
}
function _draftsSaveAll(map) {
  try { localStorage.setItem(DRAFT_LS_KEY, JSON.stringify(map)); }
  catch {}
}
function _draftsValueIsEmpty(v) {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (typeof v === 'boolean') return v === false;
  return false;
}
function _draftsSnapshotIsEmpty(snap) {
  if (!snap) return true;
  return Object.keys(snap).every(k => _draftsValueIsEmpty(snap[k]));
}

function getDraft(scope) {
  const all = _draftsLoadAll();
  return all[scope] || null;
}
function setDraft(scope, snapshot) {
  const all = _draftsLoadAll();
  if (_draftsSnapshotIsEmpty(snapshot)) {
    if (scope in all) { delete all[scope]; _draftsSaveAll(all); }
    return;
  }
  all[scope] = snapshot;
  _draftsSaveAll(all);
}
function clearDraft(scope) {
  const all = _draftsLoadAll();
  if (scope in all) { delete all[scope]; _draftsSaveAll(all); }
}
function hasDraft(scope) {
  const d = getDraft(scope);
  return !!d && !_draftsSnapshotIsEmpty(d);
}

// Binds a list of input/textarea/select/contenteditable elements to a draft
// scope. On bind, restores any previously cached values into the elements.
// On every input/change, snapshots all bound fields back to the store.
//
// `fields` accepts either a string id ("todo-input") or
// `{ id, type }` where type === 'html' forces innerHTML read/write
// (otherwise the binder auto-detects contenteditable).
//
// `options.requiredFields` — array of field ids; if all of them are empty,
// the snapshot is treated as empty and removed from storage. Lets us avoid
// caching a draft when the user only ever touched a peripheral field
// (e.g. opened the priority dropdown but never typed a title).
function bindDraftForm(rootEl, scope, fields, options) {
  if (!rootEl) return null;
  const opts = options || {};
  const fieldDefs = fields.map(f => typeof f === 'string' ? { id: f } : f);
  const required = opts.requiredFields || null;

  const find = (id) => rootEl.querySelector('#' + (window.CSS && CSS.escape ? CSS.escape(id) : id));
  const readEl = (el, type) => {
    if (!el) return null;
    if (type === 'html' || el.isContentEditable) return el.innerHTML;
    if (el.type === 'checkbox' || el.type === 'radio') return !!el.checked;
    return el.value;
  };
  const writeEl = (el, val, type) => {
    if (!el || val == null) return;
    if (type === 'html' || el.isContentEditable) { el.innerHTML = val; return; }
    if (el.type === 'checkbox' || el.type === 'radio') { el.checked = !!val; return; }
    el.value = val;
  };

  // Step 1: restore any pending draft into the DOM.
  const initial = getDraft(scope);
  let restored = false;
  if (initial) {
    fieldDefs.forEach(({ id, type }) => {
      if (!(id in initial)) return;
      const el = find(id);
      if (el != null) { writeEl(el, initial[id], type); restored = true; }
    });
  }

  // Step 2: snapshot on every input/change.
  const snapshot = () => {
    const snap = {};
    fieldDefs.forEach(({ id, type }) => {
      const el = find(id);
      if (el == null) return;
      snap[id] = readEl(el, type);
    });
    if (required && required.every(id => _draftsValueIsEmpty(snap[id]))) {
      clearDraft(scope);
      return;
    }
    setDraft(scope, snap);
  };
  fieldDefs.forEach(({ id }) => {
    const el = find(id);
    if (!el) return;
    el.addEventListener('input', snapshot);
    el.addEventListener('change', snapshot);
  });

  return { restored, initial };
}

// View → list of scopes that could hold a draft for the CURRENT project view.
// Used by showView() to warn before navigating away.
function getActiveDraftScopesForCurrentView() {
  const project = state && state.project;
  if (!project) return [];
  switch (state.view) {
    case 'todos':       return [`todos::${project}`];
    case 'notes':       return state.editingNote ? [`note::${project}::${state.editingNote}`] : [];
    case 'commitments': return [`commitments::${project}`];
    case 'delegations': return [`delegations::${project}`];
    case 'reminders':   return [`reminders::${project}`];
    default: return [];
  }
}

function _draftScopeLabel(scope) {
  if (scope.startsWith('todos::'))       return 'a new todo';
  if (scope.startsWith('note::'))        return 'a note';
  if (scope.startsWith('commitments::')) return 'a new commitment';
  if (scope.startsWith('delegations::')) return 'a new delegation';
  if (scope.startsWith('reminders::'))   return 'a new reminder';
  return 'unsaved input';
}

// Returns array of friendly labels for any dirty drafts on the current view.
function getActiveDraftLabels() {
  return getActiveDraftScopesForCurrentView()
    .filter(s => hasDraft(s))
    .map(_draftScopeLabel);
}

// Convenience namespace for app.js callers — mirrors the individual globals.
var draftCache = {
  get: getDraft,
  set: setDraft,
  clear: clearDraft,
  has: hasDraft,
  bind: bindDraftForm,
  getActiveLabels: getActiveDraftLabels,
  getActiveScopes: getActiveDraftScopesForCurrentView
};
