'use strict';

// ===== TYPE DEFINITIONS =====
// JSDoc-only — no runtime impact. Editors with a TS language server (VS Code, JetBrains)
// will use these to autocomplete fields and flag typos like c.title vs c.description.

/**
 * @typedef {Object} Attachment
 * @property {string} id
 * @property {string} name
 * @property {string} relPath  Path relative to per-project attachments folder.
 * @property {number} size     Bytes.
 * @property {string} [added]  ISO timestamp.
 */

/**
 * @typedef {Object} TodoStep
 * @property {string} id
 * @property {string} title
 * @property {boolean} done
 */

/**
 * @typedef {Object} Recurrence
 * @property {'daily'|'weekly'|'monthly'|'yearly'|'custom'} type
 * @property {number} [interval]
 * @property {number[]} [weekdays]   0=Sun … 6=Sat
 * @property {number} [monthDay]
 * @property {number} [nthWeek]
 * @property {number} [nthWeekday]
 */

/**
 * @typedef {Object} Todo
 * @property {string} id
 * @property {string} title
 * @property {boolean} done
 * @property {'high'|'medium'|'low'} priority
 * @property {string|null} startDate    YYYY-MM-DD
 * @property {string|null} dueDate      YYYY-MM-DD
 * @property {string|null} subprojectId
 * @property {string} created           ISO timestamp
 * @property {string|null} completedAt  ISO timestamp
 * @property {Attachment[]} attachments
 * @property {TodoStep[]} steps
 * @property {Recurrence|null} recurrence
 * @property {string} [kind]            e.g. 'rueckbucher'
 */

/**
 * @typedef {Object} Note
 * @property {string} id
 * @property {string} title
 * @property {string} content   May be plain text or HTML; use noteContentText() to read as plain.
 * @property {'high'|'medium'|'low'} priority
 * @property {string[]} tags
 * @property {string|null} subprojectId
 * @property {string[]} linkedTodos     Todo ids this note references.
 * @property {string} created           ISO
 * @property {string} updated           ISO
 * @property {Attachment[]} attachments
 */

/**
 * @typedef {Object} Commitment
 * @property {string} id
 * @property {'i_owe'|'they_owe'} direction
 * @property {string} counterparty
 * @property {string} description
 * @property {string|null} due_date     YYYY-MM-DD
 * @property {'open'|'fulfilled'|'cancelled'} status
 * @property {string} context
 * @property {string} notes
 * @property {string} created_at        ISO
 * @property {string|null} fulfilled_at ISO
 * @property {string|null} cancelled_at ISO
 */

/**
 * @typedef {Object} Delegation
 * @property {string} id
 * @property {string} task
 * @property {string} delegated_to
 * @property {string} delegated_on      YYYY-MM-DD
 * @property {string|null} due_date     YYYY-MM-DD
 * @property {'waiting'|'done'|'cancelled'|'stale'} status
 * @property {string} context
 * @property {string} last_update       ISO
 * @property {string} notes
 * @property {string|null} commitment_id
 * @property {string} created_at        ISO
 */

/**
 * @typedef {Object} Subproject
 * @property {string} id
 * @property {string} name
 * @property {string} color
 * @property {string[]} tags
 * @property {Attachment[]} attachments
 * @property {string} [description]
 */

/**
 * @typedef {Object} Reminder
 * @property {string} id
 * @property {string} title
 * @property {string} note
 * @property {string} datetime          ISO timestamp the reminder fires.
 * @property {boolean} fired            Set true when notification dispatched OR user marks done.
 * @property {string} [doneAt]          ISO timestamp; only set when user explicitly clicks Done.
 */

/**
 * @typedef {Object} Dump
 * @property {string} id
 * @property {'text'|'voice'|'sketch'} type
 * @property {string|null} text
 * @property {{relPath: string, name: string, size: number, durationSec: number|null}|null} [audio]
 * @property {string|null} subprojectId
 * @property {string} created           ISO
 * @property {boolean} processed
 * @property {string} [processedAt]     ISO
 */

/**
 * @typedef {Object} NodeLink
 * @property {'todo'|'note'|'reminder'|'commitment'|'delegation'|'flow'} entityType
 * @property {string} entityId   ID of the entity within the same project as this node.
 */

/**
 * @typedef {Object} BrainmapNode
 * @property {string} id
 * @property {string|null} parentId
 * @property {string} label
 * @property {string|null} color
 * @property {'left'|'right'|null} side
 * @property {boolean} collapsed
 * @property {string} note
 * @property {number} order
 * @property {string|null} subprojectId
 * @property {NodeLink[]} linkedItems   APPEND-ONLY array of links from this
 *   node to entities in the same project. Mutate ONLY via addNodeLink /
 *   removeNodeLink / cleanupNodeLinksOnEntityDelete in the nodeLinks helper
 *   section. Direct writes will desync the reverse-index cache and break
 *   the chokepoint guarantees. Order is meaningful: oldest at index 0,
 *   newest at the end. Display layers slice the tail for "most recent N".
 */

/**
 * @typedef {Object} Brainmap
 * @property {string} rootId
 * @property {Object<string, BrainmapNode>} nodes
 */

/**
 * @typedef {Object} FlowOption
 * @property {string} id
 * @property {string} label
 * @property {string|null} nextNodeId
 */

/**
 * @typedef {Object} FlowNode
 * @property {string} id
 * @property {string} name
 * @property {string} text
 * @property {FlowOption[]} options
 */

/**
 * @typedef {Object} Flow
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string|null} color
 * @property {string} startNodeId
 * @property {Object<string, FlowNode>} nodes
 * @property {string} created           ISO
 * @property {string} updated           ISO
 */

/**
 * @typedef {Object} Project
 * @property {string} name
 * @property {string} color
 * @property {string|null} iconRelPath
 * @property {string} [theme]
 * @property {Subproject[]} subprojects
 * @property {Note[]} notes
 * @property {Todo[]} todos
 * @property {Commitment[]} commitments
 * @property {Delegation[]} delegations
 * @property {Dump[]} dumps
 * @property {Reminder[]} reminders
 * @property {Flow[]} flows
 * @property {Attachment[]} attachments
 * @property {Brainmap} brainmap
 */

/**
 * @typedef {Object} PinnedItem
 * @property {'todo'|'note'|'flow'|'project'|'subproject'} type
 * @property {string} projectKey
 * @property {string} refId            For type='project', equals projectKey.
 */

/**
 * @typedef {Object} WorkspaceData
 * @property {number} schemaVersion
 * @property {string} [activeProject]
 * @property {Object<string, Project>} projects
 * @property {PinnedItem[]} pinned
 */

// ===== STATE =====
const state = {
  data: null,
  project: 'energy-hero',
  view: 'dashboard',
  editingNote: null,       // null | 'new' | noteId
  noteSearch: '',
  todayFilter: new Set(),  // {} or Set of 'overdue'|'today'|'reminders'|'waiting'|'upcoming'
  selectedTodos: new Set(),  // ids of bulk-selected todos in current project
  flowEditing: null,
  flowRunning: null,
  flowRunCurrent: null,
  flowRunHistory: [],
  notePriorityFilter: 'all',
  noteSubprojectFilter: 'all',
  noteSortBy: 'updated',
  noteShowArchived: false,  // when true, the notes list shows ONLY archived notes
  showArchivedProjects: false,  // when true, sidebar reveals archived projects
  settingsTab: null,  // null on open → first tab; otherwise remembers last picked tab
  todoFilter: 'all',
  todoPriorityFilter: 'all',
  todoSubprojectFilter: 'all',
  todoSortBy: 'due',
  expandedTodos: new Set(),
  dashGanttExtendDays: 0,
  dashGanttExpanded: false,
  pendingTodoRecurrence: null,
  pendingReminderRecurrence: null,
  pendingDumpSubprojectId: null,
  stickyMode: false,
  activeSubproject: null,  // null | subprojectId
  editingSubproject: null, // null | 'new' | subprojectId
  subprojectTagFilter: new Set(),
  subprojectSortBy: 'default',
  commitmentFilter: { context: 'all', direction: 'all', overdue: false, showClosed: false },
  expandedCommitment: null,
  delegationFilter: { context: 'all', person: 'all', showDone: false },
  expandedDelegation: null,
  bm: {
    selectedId: null,
    editingId: null,
    zoom: 1,
    panX: 0,
    panY: 0,
    layout: null,
    dirty: false,
    // Per-node memory of the last-used link type in the detail panel.
    // Session-only — not persisted to state.data and reset on reload, by
    // design (per the v2 plan's "in-memory only" decision). Map for O(1)
    // get/set without prototype-pollution worries.
    lastLinkedTypeByNode: new Map(),
    // The id of the node whose linked-items list has been expanded via
    // "Show all (N)". Null = collapsed (default 8 most recent shown when
    // total > 10). Resets to null on selection change.
    detailExpandedNodeId: null,
    // Global session-only toggle for the linked-items panel: hide rows
    // whose entity is archived. Default off (archived rows render with
    // strike-through styling per the v2 plan).
    detailHideArchived: false,
    // Parallel toggle for done items (todo done, reminder doneAt, commitment
    // status='fulfilled', delegation status='done'). Default off — done
    // items render with strike-through; this hides them from the list.
    detailHideDone: false
  },
  // Molecular landing drill-down state. focusPath is a stack of node ids representing
  // the current focus depth: ['__you'] (root) → ['__you','p:eh'] (project) →
  // ['__you','p:eh','sp:q4'] (subproject). Persisted to localStorage on every change.
  molecular: {
    focusPath: ['__you']
  }
};

const SUBPROJECT_COLORS = [
  '#3b82f6','#0ea5e9','#06b6d4','#14b8a6','#10b981','#16a34a','#84cc16','#eab308',
  '#f59e0b','#f97316','#f75f1c','#dc2626','#f43f5e','#ec4899','#a855f7','#8b5cf6',
  '#7c3aed','#6366f1','#64748b','#404a4f'
];
const PROJECT_COLORS = ['#16a34a','#7c3aed','#3b82f6','#f59e0b','#ec4899','#14b8a6','#f97316','#dc2626'];
const LEGACY_PROJECT_COLORS = { 'energy-hero': '#16a34a', 'ai5innovation': '#7c3aed' };

function getAllProjectColorOptions() {
  const seen = new Set();
  const out = [];
  const push = (c) => {
    if (!c) return;
    const key = c.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(c);
  };
  PROJECT_COLORS.forEach(push);
  THEMES.forEach(t => { if (t.forceAccent) push(t.forceAccent); });
  return out;
}

// ===== HELPERS =====
function generateId(prefix) {
  return (prefix || 'id') + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function priorityBadge(p) {
  const map = { high: ['badge-high','High'], medium: ['badge-medium','Medium'], low: ['badge-low','Low'] };
  const [cls, lbl] = map[p] || ['badge-low','Low'];
  return `<span class="badge ${cls}">${lbl}</span>`;
}

function priorityBadgeEditable(todoId, p) {
  const cur = ['high','medium','low'].includes(p) ? p : 'low';
  const cls = { high:'badge-high', medium:'badge-medium', low:'badge-low' }[cur];
  return `<select class="badge ${cls} todo-priority-select" data-id="${todoId}" title="Change priority">
    <option value="high" ${cur==='high'?'selected':''}>High</option>
    <option value="medium" ${cur==='medium'?'selected':''}>Medium</option>
    <option value="low" ${cur==='low'?'selected':''}>Low</option>
  </select>`;
}

function getProject() { return state.data.projects[state.project]; }

// ===== UNDO / REDO =====
// Stores up to UNDO_MAX deep-cloned snapshots of state.data, one per saveData call.
// Invariant after every save: undoStack[last] === current state.data (deep-equal).
const UNDO_MAX = 50;
const undoStack = [];
const redoStack = [];
let undoSuspended = false;

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

// ===== THEMES =====
const THEMES = [
  { id: 'light',    name: 'Light',    swatches: ['#ffffff','#f1f5f9','#0f172a'] },
  { id: 'dark',     name: 'Dark',     swatches: ['#1e293b','#0f172a','#e2e8f0'] },
  { id: 'midnight', name: 'Midnight', swatches: ['#0b1220','#050914','#cbd5e1'] },
  { id: 'sepia',    name: 'Sepia',    swatches: ['#fbf5e9','#f1e7d0','#3b2f1c'] },
  { id: 'nord',     name: 'Nord',     swatches: ['#eceff4','#d8dee9','#2e3440'] },
  { id: 'rose',     name: 'Rose',     swatches: ['#fff1f2','#ffe4e6','#881337'] },
  { id: 'eh-sun',    name: 'EH Sun',    swatches: ['#F9A81A','#404A4F','#FFFFFF'], forceAccent: '#F9A81A' },
  { id: 'eh-sunset', name: 'EH Sunset', swatches: ['#F75F1C','#FFE3D4','#404A4F'], forceAccent: '#F75F1C' },
  { id: 'eh-ocean',  name: 'EH Ocean',  swatches: ['#00A99E','#9FD0E4','#404A4F'], forceAccent: '#00A99E' },
  { id: 'eh-sepia',  name: 'EH Sepia',  swatches: ['#F9A81A','#f1e7d0','#3b2f1c'], forceAccent: '#F9A81A' },
  { id: 'ai5-cyan',  name: 'AI5 Cyan',  swatches: ['#26c9e2','#0d0c12','#ffffff'], forceAccent: '#26c9e2' },
  { id: 'ai5-dark',  name: 'AI5 Dark',  swatches: ['#26c9e2','#18171f','#e9f7fa'], forceAccent: '#26c9e2' },
  { id: 'ai5-mist',  name: 'AI5 Mist',  swatches: ['#3499cd','#e8f3f7','#1c3540'], forceAccent: '#3499cd' },
  { id: 'solarized', name: 'Solarized',  swatches: ['#268bd2','#fdf6e3','#586e75'], forceAccent: '#268bd2' },
  { id: 'cyberpunk', name: 'Cyberpunk',  swatches: ['#ff00ff','#0a0014','#ffe6ff'], forceAccent: '#ff00ff' },
  { id: 'forest',    name: 'Forest',     swatches: ['#2d6a4f','#f4f9f4','#1b2e23'], forceAccent: '#2d6a4f' },
  { id: 'mono',      name: 'Mono',       swatches: ['#000000','#fafafa','#0a0a0a'], forceAccent: '#000000' },
  { id: 'lavender',  name: 'Lavender',   swatches: ['#a78bfa','#f8f5ff','#3b0764'], forceAccent: '#a78bfa' },
  { id: 'contrast',  name: 'High Contrast', swatches: ['#facc15','#000000','#ffffff'], forceAccent: '#facc15' },
  { id: 'terracotta',name: 'Terracotta', swatches: ['#c2410c','#fbf5ef','#44221a'], forceAccent: '#c2410c' },
  { id: 'glass',     name: 'Glass',      swatches: ['#ec4899','#4c1d95','#0ea5e9'], forceAccent: '#ec4899' }
];

function loadTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  applyTheme(saved, false);
}

function getEffectiveThemeId() {
  const proj = state.data?.projects?.[state.project];
  if (proj && proj.theme && THEMES.some(t => t.id === proj.theme)) return proj.theme;
  const saved = localStorage.getItem('theme') || 'light';
  return THEMES.some(t => t.id === saved) ? saved : 'light';
}

function applyTheme(id, persist = true) {
  const valid = THEMES.some(t => t.id === id) ? id : 'light';
  document.documentElement.setAttribute('data-theme', valid);
  if (persist) localStorage.setItem('theme', valid);
  reapplyAccent();
}

function applyCurrentTheme() {
  const id = getEffectiveThemeId();
  document.documentElement.setAttribute('data-theme', id);
  reapplyAccent();
}

function reapplyAccent() {
  const id = document.documentElement.getAttribute('data-theme') || 'light';
  const theme = THEMES.find(t => t.id === id);
  const proj = state.data?.projects?.[state.project];
  if (theme && theme.forceAccent) {
    document.documentElement.style.setProperty('--accent', theme.forceAccent);
  } else if (proj && proj.color) {
    document.documentElement.style.setProperty('--accent', proj.color);
  } else {
    document.documentElement.style.removeProperty('--accent');
  }
}

const SETTINGS_TABS = [
  { id: 'appearance', icon: '🎨', label: 'Appearance' },
  { id: 'workspace',  icon: '◈',  label: 'Workspace' },
  { id: 'contexts',   icon: '🏷',  label: 'Contexts' },
  { id: 'workflows',  icon: '⚡', label: 'Workflows' },
  { id: 'developer',  icon: '🔧', label: 'Developer' }
];

function settingsAppearanceGlobalHTML() {
  const current = localStorage.getItem('theme') || 'light';
  return `
    <div class="settings-section">
      <div class="settings-section-title">Global color scheme</div>
      <div class="settings-hint">Used by projects that don't pick their own.</div>
      <div class="theme-grid">
        ${THEMES.map(t => `
          <button class="theme-card ${t.id===current?'selected':''}" data-theme-id="${t.id}">
            <div class="theme-swatches">
              ${t.swatches.map(c => `<span class="theme-swatch" style="background:${c}"></span>`).join('')}
            </div>
            <div class="theme-name">${escapeHTML(t.name)}</div>
          </button>`).join('')}
      </div>
    </div>`;
}

// Tri-color preview pill — used both inline next to a project name and inside the theme dropdown.
function themePreviewHTML(theme, extraClass = '') {
  if (!theme) return '';
  return `<span class="project-theme-preview ${extraClass}">
    ${theme.swatches.map(c => `<span class="project-theme-preview-swatch" style="background:${c}"></span>`).join('')}
  </span>`;
}

// Custom dropdown: a button that previews the current theme + a popup of all themes
// (each row shows the tri-color preview). Native <option> can't render swatches, hence the popup.
function themeSelectHTML(key, proj) {
  const globalThemeId = localStorage.getItem('theme') || 'light';
  const effectiveId = proj.theme || globalThemeId;
  const effective = THEMES.find(t => t.id === effectiveId) || THEMES[0];
  const buttonLabel = proj.theme
    ? effective.name
    : `Use global · ${effective.name}`;
  return `<div class="theme-select" data-theme-select-root="${key}">
    <button class="theme-select-btn" data-theme-select-toggle="${key}" type="button" title="${escapeHTML(buttonLabel)}">
      ${themePreviewHTML(effective, 'small')}
      <span class="theme-select-name">${escapeHTML(buttonLabel)}</span>
      <span class="theme-select-caret">▾</span>
    </button>
    <div class="theme-select-menu" data-theme-select-menu="${key}" hidden>
      <button class="theme-select-option ${!proj.theme ? 'selected' : ''}" type="button" data-theme-pick="" data-project-key="${key}">
        ${themePreviewHTML(THEMES.find(t => t.id === globalThemeId), 'small')}
        <span class="theme-select-option-name">Use global · <span class="theme-select-option-sub">${escapeHTML((THEMES.find(t => t.id === globalThemeId) || {}).name || '')}</span></span>
      </button>
      <div class="theme-select-divider"></div>
      ${THEMES.map(t => `
        <button class="theme-select-option ${proj.theme === t.id ? 'selected' : ''}" type="button" data-theme-pick="${t.id}" data-project-key="${key}">
          ${themePreviewHTML(t, 'small')}
          <span class="theme-select-option-name">${escapeHTML(t.name)}</span>
          ${proj.theme === t.id ? '<span class="theme-select-check">✓</span>' : ''}
        </button>`).join('')}
    </div>
  </div>`;
}

function settingsAppearanceHTML() {
  const projectEntries = Object.entries(state.data.projects);
  return `
    ${settingsAppearanceGlobalHTML()}
    <div class="settings-section">
      <div class="settings-section-title">Per-project color scheme</div>
      <div class="settings-hint">Each project can use its own scheme or inherit the global one. The colored dot is the project's identity color.</div>
      <div class="project-theme-list">
        ${projectEntries.map(([key, proj]) => `
          <div class="project-theme-row ${proj.archived?'archived':''}">
            <div class="project-theme-head">
              ${proj.iconRelPath
                ? `<img class="project-theme-dot project-icon-preview project-icon-img" data-project-icon-rel="${escapeHTML(proj.iconRelPath)}" alt="">`
                : `<button class="project-theme-dot project-color-btn" data-color-project="${key}" style="background:${proj.color || '#16a34a'}" title="Change dot color"></button>`}
              <span class="project-theme-name">${escapeHTML(proj.name)}${proj.archived ? ' <span class="proj-archived-tag">📦 archived</span>' : ''}</span>
              <input type="file" accept="image/*" class="project-icon-input" data-icon-input="${key}" style="display:none">
              <button class="btn btn-ghost btn-sm project-icon-upload" data-icon-upload="${key}" title="${proj.iconRelPath ? 'Replace icon' : 'Upload an icon image'}">🖼 ${proj.iconRelPath ? 'Replace' : 'Icon'}</button>
              ${proj.iconRelPath ? `<button class="btn btn-ghost btn-sm project-icon-remove" data-icon-remove="${key}" title="Remove icon">✕</button>` : ''}
              ${themeSelectHTML(key, proj)}
            </div>
            <div class="project-color-picker" data-project-color-picker="${key}" hidden>
              ${getAllProjectColorOptions().map(c => `
                <button class="project-color-swatch ${proj.color && proj.color.toLowerCase()===c.toLowerCase()?'selected':''}" data-pick-color="${c}" data-project="${key}" style="background:${c}" title="${c}"></button>
              `).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

function settingsWorkspaceHTML() {
  return `
    <div class="settings-section">
      <div class="settings-section-title">Workspace features</div>
      <div class="settings-hint">Drag to reorder · Uncheck to hide from the sidebar.</div>
      <div class="nav-pref-list" id="nav-pref-list">
        ${getOrderedNavItems().map((item, idx) => `
          <div class="nav-pref-item" draggable="true" data-nav-id="${item.id}" data-nav-idx="${idx}">
            <span class="nav-pref-handle" title="Drag">⋮⋮</span>
            <span class="nav-pref-icon">${item.icon}</span>
            <span class="nav-pref-label">${escapeHTML(item.label)}</span>
            <label class="nav-pref-toggle">
              <input type="checkbox" data-nav-toggle="${item.id}" ${item.visible?'checked':''}>
            </label>
          </div>`).join('')}
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-ghost btn-sm" id="nav-pref-reset" title="Restore default order and show everything">Reset to defaults</button>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title">Keyboard shortcuts</div>
      <div class="settings-hint">All keyboard shortcuts in one cheatsheet.</div>
      <button class="btn btn-secondary" id="settings-open-cheatsheet">? Open cheatsheet</button>
    </div>`;
}

function settingsContextsHTML() {
  const contexts = loadSharedContexts();
  return `
    <div class="settings-section">
      <div class="settings-section-title">Shared contexts</div>
      <div class="settings-hint">Used by Commitments and Delegations for autocomplete and filtering.</div>
      <div class="shared-contexts-list">
        ${contexts.length
          ? contexts.map(ctx => `
              <span class="shared-context-chip">
                ${escapeHTML(ctx)}
                <button class="shared-context-remove" data-remove-context="${escapeHTML(ctx)}" title="Remove">✕</button>
              </span>`).join('')
          : '<span style="font-size:11px;color:var(--text-muted);font-style:italic">No shared contexts yet — add one below.</span>'}
      </div>
      <div class="shared-context-add">
        <input type="text" class="form-input" id="shared-context-input" placeholder="Add a context (e.g. Acme Corp)">
        <button class="btn btn-primary btn-sm" id="btn-shared-context-add">Add</button>
      </div>
    </div>`;
}

function settingsWorkflowsHTML() {
  return `
    <div class="settings-section">
      <div class="settings-section-title">Workflow shortcuts</div>
      <div class="settings-hint">Per-project quick-action buttons on the Todos view.</div>
      <label class="dev-checkbox-row">
        <input type="checkbox" id="workflow-rueckbucher-toggle" ${isRueckbucherButtonEnabled()?'checked':''}>
        <span>Energy Hero — "↻ Rückbucher" button
          <span class="settings-hint" style="display:block;margin-top:2px">Spawns three follow-up todos in one click: "2nd reminder" +7 calendar days, "last reminder" +14 calendar days, "inaktiv stellen" +3 workdays after the last reminder (skips Sat/Sun). Visible only when Energy Hero is the active project.</span>
        </span>
      </label>
    </div>`;
}

function settingsDeveloperHTML() {
  return `
    <div class="settings-section">
      <div class="settings-section-title">Developer</div>
      <div class="settings-hint">Unlocks internal tools and options.</div>
      <label class="dev-checkbox-row">
        <input type="checkbox" id="dev-mode-toggle" ${isDeveloperMode()?'checked':''}>
        <span>Developer mode</span>
      </label>
      ${isDeveloperMode() ? `
        <label class="dev-checkbox-row dev-checkbox-nested">
          <input type="checkbox" id="dev-ask-backups-toggle" ${isAskForBackups()?'checked':''}>
          <span>Ask for backups?
            <span class="settings-hint" style="display:block;margin-top:2px">Every 15 minutes a popup asks whether to create a local backup zip.</span>
          </span>
        </label>
        <div style="margin:6px 0 12px">
          <button class="btn btn-ghost btn-sm" id="btn-manual-backup">Backup now</button>
        </div>` : ''}
    </div>`;
}

function settingsTabContentHTML(tabId) {
  switch (tabId) {
    case 'appearance': return settingsAppearanceHTML();
    case 'projects':   return settingsAppearanceHTML(); // legacy id from before merge
    case 'workspace':  return settingsWorkspaceHTML();
    case 'contexts':   return settingsContextsHTML();
    case 'workflows':  return settingsWorkflowsHTML();
    case 'developer':  return settingsDeveloperHTML();
    default:           return settingsAppearanceHTML();
  }
}

function openSettings() {
  const overlay = document.getElementById('modal-overlay');
  const close = () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    overlay.onclick = null;
  };

  // Initialise tab if first open this session.
  if (!state.settingsTab || !SETTINGS_TABS.some(t => t.id === state.settingsTab)) {
    state.settingsTab = localStorage.getItem('settingsLastTab') || 'appearance';
    if (!SETTINGS_TABS.some(t => t.id === state.settingsTab)) state.settingsTab = 'appearance';
  }

  const renderKeepingScroll = () => {
    const pane = overlay.querySelector('.settings-content');
    const top = pane ? pane.scrollTop : 0;
    render();
    requestAnimationFrame(() => {
      const p = overlay.querySelector('.settings-content');
      if (p) p.scrollTop = top;
    });
  };

  const render = () => {
    const tabId = state.settingsTab;
    overlay.innerHTML = `
      <div class="modal settings-modal">
        <div class="settings-rail">
          <div class="settings-rail-title">Settings</div>
          <div class="settings-rail-list">
            ${SETTINGS_TABS.map(t => `
              <button class="settings-rail-item ${t.id===tabId?'active':''}" data-settings-tab="${t.id}">
                <span class="settings-rail-icon">${t.icon}</span>
                <span class="settings-rail-label">${escapeHTML(t.label)}</span>
              </button>`).join('')}
          </div>
          <div class="settings-rail-footer">
            <button class="btn btn-primary btn-sm" id="settings-close">Done</button>
          </div>
        </div>
        <div class="settings-content">
          ${settingsTabContentHTML(tabId)}
        </div>
      </div>`;

    // Tab switching — persist the choice so the user lands on the same place next time.
    overlay.querySelectorAll('[data-settings-tab]').forEach(btn =>
      btn.addEventListener('click', () => {
        state.settingsTab = btn.dataset.settingsTab;
        localStorage.setItem('settingsLastTab', state.settingsTab);
        render();
      }));
    document.getElementById('settings-open-cheatsheet')?.addEventListener('click', () => {
      close();
      openShortcutsCheatsheet();
    });
    overlay.querySelectorAll('.theme-card').forEach(btn =>
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.themeId);
        overlay.querySelectorAll('.theme-card').forEach(b => b.classList.toggle('selected', b === btn));
        applyCurrentTheme();
        // The Appearance tab shows tri-color previews that inherit the global theme — keep them in sync.
        renderKeepingScroll();
      }));

    // Custom theme dropdown — open/close + select.
    const closeAllThemeMenus = () => {
      overlay.querySelectorAll('.theme-select-menu').forEach(m => { m.hidden = true; });
      overlay.querySelectorAll('.theme-select-btn.open').forEach(b => b.classList.remove('open'));
    };
    overlay.querySelectorAll('[data-theme-select-toggle]').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.themeSelectToggle;
        const menu = overlay.querySelector(`[data-theme-select-menu="${key}"]`);
        const isOpen = menu && !menu.hidden;
        closeAllThemeMenus();
        if (menu && !isOpen) {
          menu.hidden = false;
          btn.classList.add('open');
          // Scroll the currently selected option into view so the menu opens at the right place.
          const sel = menu.querySelector('.theme-select-option.selected');
          if (sel) sel.scrollIntoView({ block: 'nearest' });
        }
      }));
    overlay.querySelectorAll('[data-theme-pick]').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.projectKey;
        const proj = state.data.projects[key];
        if (!proj) return;
        proj.theme = btn.dataset.themePick || null;
        saveData();
        applyCurrentTheme();
        renderApp();
        renderKeepingScroll();
      }));
    // closeAllThemeMenus is also used by the overlay click-outside handler set at the end of render().
    state._closeThemeMenusInOverlay = closeAllThemeMenus;

    overlay.querySelectorAll('.project-color-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        const key = btn.dataset.colorProject;
        const picker = overlay.querySelector(`[data-project-color-picker="${key}"]`);
        if (!picker) return;
        overlay.querySelectorAll('.project-color-picker').forEach(p => { if (p !== picker) p.hidden = true; });
        picker.hidden = !picker.hidden;
      }));

    overlay.querySelectorAll('[data-icon-upload]').forEach(btn =>
      btn.addEventListener('click', () => {
        const key = btn.dataset.iconUpload;
        const input = overlay.querySelector(`input[data-icon-input="${key}"]`);
        input?.click();
      }));
    overlay.querySelectorAll('.project-icon-input').forEach(inp =>
      inp.addEventListener('change', async (e) => {
        const key = inp.dataset.iconInput;
        const file = inp.files && inp.files[0];
        if (!file) return;
        const ok = await uploadProjectIcon(key, file);
        inp.value = '';
        if (ok) {
          renderApp();
          renderKeepingScroll();
        }
      }));
    overlay.querySelectorAll('[data-icon-remove]').forEach(btn =>
      btn.addEventListener('click', () => {
        if (removeProjectIcon(btn.dataset.iconRemove)) {
          renderApp();
          renderKeepingScroll();
          showToast('Icon removed.', 'info');
        }
      }));
    // Load any icon previews in the settings modal
    loadProjectIcons();

    overlay.querySelectorAll('[data-pick-color]').forEach(btn =>
      btn.addEventListener('click', () => {
        const key = btn.dataset.project;
        const color = btn.dataset.pickColor;
        const proj = state.data.projects[key];
        if (!proj) return;
        proj.color = color;
        saveData();
        applyCurrentTheme();
        renderApp();
        renderKeepingScroll();
      }));

    // Workspace features: visibility toggles (update sidebar only, don't rebuild modal)
    overlay.querySelectorAll('[data-nav-toggle]').forEach(cb =>
      cb.addEventListener('change', () => {
        const id = cb.dataset.navToggle;
        const prefs = loadNavPrefs();
        const entry = prefs.find(p => p.id === id);
        if (entry) entry.visible = cb.checked;
        saveNavPrefs(prefs);
        if (!cb.checked && state.view === id) {
          const first = prefs.find(p => p.visible);
          if (first) { state.view = first.id; renderContent(); }
        }
        renderSidebar();
      }));

    // Workspace features: drag-and-drop reorder (DOM-reorder in place, no modal rebuild)
    const list = overlay.querySelector('#nav-pref-list');
    if (list) {
      let dragSrcId = null;
      const clearTargetHighlight = () => {
        list.querySelectorAll('.nav-pref-item').forEach(r => r.classList.remove('drop-target'));
      };
      list.querySelectorAll('.nav-pref-item').forEach(row => {
        row.addEventListener('dragstart', (e) => {
          dragSrcId = row.dataset.navId;
          row.classList.add('dragging');
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', dragSrcId); } catch {}
          }
        });
        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          clearTargetHighlight();
          dragSrcId = null;
        });
        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          clearTargetHighlight();
          row.classList.add('drop-target');
        });
        row.addEventListener('dragleave', () => row.classList.remove('drop-target'));
        row.addEventListener('drop', (e) => {
          e.preventDefault();
          const targetId = row.dataset.navId;
          if (!dragSrcId || dragSrcId === targetId) { clearTargetHighlight(); return; }
          const prefs = loadNavPrefs();
          const fromIdx = prefs.findIndex(p => p.id === dragSrcId);
          const toIdx = prefs.findIndex(p => p.id === targetId);
          if (fromIdx === -1 || toIdx === -1) { clearTargetHighlight(); return; }
          const [moved] = prefs.splice(fromIdx, 1);
          prefs.splice(toIdx, 0, moved);
          saveNavPrefs(prefs);
          // Reorder the DOM in place — no full re-render, no scroll jump
          const srcEl = list.querySelector(`.nav-pref-item[data-nav-id="${dragSrcId}"]`);
          const tgtEl = list.querySelector(`.nav-pref-item[data-nav-id="${targetId}"]`);
          if (srcEl && tgtEl) list.insertBefore(srcEl, tgtEl);
          clearTargetHighlight();
          renderSidebar();
        });
      });
    }

    document.getElementById('nav-pref-reset')?.addEventListener('click', () => {
      localStorage.removeItem('navPrefs');
      renderApp();
      render();
    });

    document.getElementById('workflow-rueckbucher-toggle')?.addEventListener('change', e => {
      setRueckbucherButtonEnabled(e.target.checked);
      if (state.view === 'todos') renderTodos();
    });
    document.getElementById('dev-mode-toggle')?.addEventListener('change', e => {
      setDeveloperMode(e.target.checked);
      renderKeepingScroll();
    });
    document.getElementById('dev-ask-backups-toggle')?.addEventListener('change', e => {
      setAskForBackups(e.target.checked);
      if (e.target.checked) showToast('Backup prompt every 15 minutes enabled.', 'success');
      else showToast('Backup prompt disabled.', 'info');
    });
    document.getElementById('btn-manual-backup')?.addEventListener('click', () => runBackupNow());

    // Shared contexts editor
    const addSharedCtx = () => {
      const inp = document.getElementById('shared-context-input');
      if (!inp) return;
      const v = inp.value.trim();
      if (!v) return;
      if (addSharedContext(v)) {
        inp.value = '';
        renderKeepingScroll();
      } else {
        showToast('That context already exists.', 'info');
      }
    };
    document.getElementById('btn-shared-context-add')?.addEventListener('click', addSharedCtx);
    document.getElementById('shared-context-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addSharedCtx(); }
    });
    overlay.querySelectorAll('[data-remove-context]').forEach(btn =>
      btn.addEventListener('click', () => {
        removeSharedContext(btn.dataset.removeContext);
        renderKeepingScroll();
      }));

    document.getElementById('settings-close').onclick = close;
  };

  overlay.classList.remove('hidden');
  render();
  overlay.onclick = (e) => {
    if (e.target === overlay) { close(); return; }
    // Close any open theme dropdown when the click landed outside the dropdown.
    if (!e.target.closest('.theme-select')) state._closeThemeMenusInOverlay?.();
  };
}

// ===== SCHEMA VERSIONING + MIGRATIONS =====
// Each migration brings data from version N-1 → N. Numbered, runs in order.
// Add new migrations as new keys; never edit shipped ones.
const CURRENT_SCHEMA_VERSION = 2;
const SCHEMA_MIGRATIONS = {
  // v1: consolidates everything migrateAttachments() used to do ad-hoc.
  // For fresh installs schemaVersion starts at 0 and runs through all.
  1: (data) => {
    if (!Array.isArray(data.pinned)) data.pinned = [];
    for (const proj of Object.values(data.projects || {})) {
      if (!Array.isArray(proj.attachments)) proj.attachments = [];
      if (!('iconRelPath' in proj)) proj.iconRelPath = null;
      if (!Array.isArray(proj.dumps)) proj.dumps = [];
      proj.dumps.forEach(d => { if (!('subprojectId' in d)) d.subprojectId = null; });
      if (!Array.isArray(proj.commitments)) proj.commitments = [];
      if (!Array.isArray(proj.delegations)) proj.delegations = [];
      (proj.notes || []).forEach(n => { if (!Array.isArray(n.attachments)) n.attachments = []; });
      (proj.todos || []).forEach(t => {
        if (!Array.isArray(t.attachments)) t.attachments = [];
        if (!Array.isArray(t.steps)) t.steps = [];
        if (t.recurrence === undefined) t.recurrence = null;
      });
      (proj.subprojects || []).forEach(s => {
        if (!Array.isArray(s.attachments)) s.attachments = [];
        if (!Array.isArray(s.tags)) s.tags = [];
      });
      if (!Array.isArray(proj.flows)) proj.flows = [];
      proj.flows.forEach(f => {
        Object.values(f.nodes || {}).forEach(n => {
          if (typeof n.name !== 'string') n.name = '';
        });
      });
    }
    return data;
  },
  // v2: every brainmap node gains a linkedItems array — generic node→entity
  // linking infrastructure. Idempotent: backfilling an already-present
  // array is a no-op (the Array.isArray guard skips it).
  2: (data) => {
    for (const proj of Object.values(data.projects || {})) {
      const nodes = proj.brainmap && proj.brainmap.nodes;
      if (!nodes) continue;
      for (const node of Object.values(nodes)) {
        if (!Array.isArray(node.linkedItems)) node.linkedItems = [];
      }
    }
    return data;
  }
};

function runSchemaMigrations(data) {
  if (!data) return data;
  const from = data.schemaVersion || 0;
  for (let v = from + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const m = SCHEMA_MIGRATIONS[v];
    if (m) {
      try {
        data = m(data) || data;
        data.schemaVersion = v;
        if (typeof console !== 'undefined') console.info(`[schema] migrated to v${v}`);
      } catch (e) {
        console.error(`[schema] migration v${v} failed:`, e);
        break;
      }
    }
  }
  return data;
}

// Backwards-compatible wrapper. Init still calls migrateAttachments();
// keep the name so existing call sites don't break.
function migrateAttachments() {
  if (!state.data) return;
  state.data = runSchemaMigrations(state.data);
}

function formatFileSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024*1024)).toFixed(1)} MB`;
  return `${(bytes / (1024*1024*1024)).toFixed(1)} GB`;
}

const IMAGE_EXTS = ['png','jpg','jpeg','gif','webp','svg','bmp','ico'];
const attachmentThumbCache = new Map();

function isImageFile(name) {
  const ext = (name || '').toLowerCase().split('.').pop();
  return IMAGE_EXTS.includes(ext);
}

function fileIconFor(name) {
  const ext = (name || '').toLowerCase().split('.').pop();
  if (IMAGE_EXTS.includes(ext)) return '🖼';
  if (ext === 'pdf') return '📕';
  if (['doc','docx','odt','rtf'].includes(ext)) return '📄';
  if (['xls','xlsx','csv','ods'].includes(ext)) return '📊';
  if (['ppt','pptx','odp'].includes(ext)) return '📽';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return '🗜';
  if (['mp3','wav','flac','ogg','m4a'].includes(ext)) return '🎵';
  if (['mp4','mkv','mov','avi','webm'].includes(ext)) return '🎞';
  if (['js','ts','jsx','tsx','py','go','rs','java','c','cpp','html','css','json','xml','md'].includes(ext)) return '📝';
  return '📎';
}

async function loadAttachmentThumbnails(container) {
  if (!container || !window.api || typeof window.api.readAttachmentDataUrl !== 'function') return;
  const pending = container.querySelectorAll('.att-thumb[data-thumb-src]');
  for (const el of pending) {
    const relPath = el.dataset.thumbSrc;
    el.removeAttribute('data-thumb-src');
    if (!relPath) continue;
    if (attachmentThumbCache.has(relPath)) {
      const cached = attachmentThumbCache.get(relPath);
      if (cached) el.innerHTML = `<img class="att-thumb-img" src="${cached}" alt="">`;
      continue;
    }
    try {
      const url = await window.api.readAttachmentDataUrl(relPath);
      attachmentThumbCache.set(relPath, url || null);
      if (url) el.innerHTML = `<img class="att-thumb-img" src="${url}" alt="">`;
    } catch (e) {
      console.error('readAttachmentDataUrl:', e);
      attachmentThumbCache.set(relPath, null);
    }
  }
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function uploadFileToAttachment(file) {
  if (!window.api || typeof window.api.saveAttachment !== 'function') {
    showToast('Attachments API not available — please fully restart the app.', 'error');
    return null;
  }
  try {
    const buf = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buf);
    const res = await window.api.saveAttachment(state.project, base64, file.name);
    if (res && res.ok) return res.attachment;
    console.error('saveAttachment failed:', res && res.error);
    showToast(`Failed to save ${file.name}: ${res?.error || 'unknown error'}`, 'error');
  } catch (e) {
    console.error('uploadFileToAttachment:', e);
    showToast(`Failed to upload ${file.name}: ${e.message}`, 'error');
  }
  return null;
}

async function uploadProjectIcon(projectKey, file) {
  if (!window.api || typeof window.api.saveAttachment !== 'function') {
    showToast('Attachments API not available — please fully restart the app.', 'error');
    return false;
  }
  if (!file || !file.type || !file.type.startsWith('image/')) {
    showToast('Please pick an image file.', 'error');
    return false;
  }
  const proj = state.data.projects[projectKey];
  if (!proj) return false;
  try {
    const buf = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buf);
    const res = await window.api.saveAttachment(projectKey, base64, `project-icon-${Date.now()}.${file.name.split('.').pop() || 'png'}`);
    if (!res || !res.ok || !res.attachment) {
      showToast(`Icon upload failed: ${res?.error || 'unknown'}`, 'error');
      return false;
    }
    const oldRel = proj.iconRelPath;
    proj.iconRelPath = res.attachment.relPath;
    saveData();
    if (oldRel) {
      attachmentThumbCache.delete(oldRel);
      try { window.api.deleteAttachment(oldRel); } catch {}
    }
    showToast(`Icon set for "${proj.name}".`, 'success');
    return true;
  } catch (e) {
    console.error('uploadProjectIcon:', e);
    showToast(`Icon upload error: ${e.message}`, 'error');
    return false;
  }
}

function removeProjectIcon(projectKey) {
  const proj = state.data.projects[projectKey];
  if (!proj || !proj.iconRelPath) return false;
  const rel = proj.iconRelPath;
  proj.iconRelPath = null;
  saveData();
  attachmentThumbCache.delete(rel);
  try { window.api.deleteAttachment(rel); } catch {}
  return true;
}

function projectDotOrIconHTML(proj, size = 8, extraStyle = '') {
  if (proj && proj.iconRelPath) {
    return `<img class="project-icon-img" data-project-icon-rel="${escapeHTML(proj.iconRelPath)}" style="width:${size * 1.6}px;height:${size * 1.6}px;object-fit:cover;border-radius:4px;${extraStyle}" alt="">`;
  }
  const color = (proj && proj.color) || '#16a34a';
  return `<span class="project-dot" style="background:${color};width:${size}px;height:${size}px;${extraStyle}"></span>`;
}

function loadProjectIcons() {
  document.querySelectorAll('img.project-icon-img[data-project-icon-rel]').forEach(async (img) => {
    const rel = img.dataset.projectIconRel;
    img.removeAttribute('data-project-icon-rel');
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
      console.error('project icon load:', e);
    }
  });
}

async function addDroppedFilesToOwner(owner, fileList, onAfter) {
  if (!owner || !fileList || !fileList.length) return 0;
  if (!Array.isArray(owner.attachments)) owner.attachments = [];
  const added = [];
  for (const file of fileList) {
    const att = await uploadFileToAttachment(file);
    if (att) { owner.attachments.push(att); added.push(att); }
  }
  if (added.length) {
    saveData();
    showToast(`Added ${added.length} attachment${added.length===1?'':'s'}`, 'success');
    if (onAfter) onAfter();
  }
  return added.length;
}

async function pickAndAddAttachments(owner, onAfter) {
  if (!window.api || typeof window.api.pickAttachments !== 'function') {
    showToast('Attachments API not available — please fully restart the app.', 'error');
    return 0;
  }
  let res;
  try {
    res = await window.api.pickAttachments(state.project);
  } catch (e) {
    console.error('pickAttachments threw:', e);
    showToast(`File picker failed: ${e.message}`, 'error');
    return 0;
  }
  if (!res) { showToast('File picker returned no result.', 'error'); return 0; }
  if (!res.ok) { showToast(`File picker error: ${res.error || 'unknown'}`, 'error'); return 0; }
  if (!res.attachments || !res.attachments.length) return 0;
  if (!Array.isArray(owner.attachments)) owner.attachments = [];
  owner.attachments.push(...res.attachments);
  saveData();
  showToast(`Added ${res.attachments.length} attachment${res.attachments.length===1?'':'s'}`, 'success');
  if (onAfter) onAfter();
  return res.attachments.length;
}

async function removeAttachment(owner, attId, onAfter) {
  if (!owner || !Array.isArray(owner.attachments)) return;
  const idx = owner.attachments.findIndex(a => a.id === attId);
  if (idx === -1) return;
  const [removed] = owner.attachments.splice(idx, 1);
  if (removed && removed.relPath) {
    attachmentThumbCache.delete(removed.relPath);
    try { await window.api.deleteAttachment(removed.relPath); } catch (e) { console.error(e); }
  }
  saveData();
  if (onAfter) onAfter();
}

function openAttachmentFile(att) {
  if (att && att.relPath) window.api.openAttachment(att.relPath);
}

function isAudioAttachment(att) {
  const n = (att && (att.name || att.relPath) || '').toLowerCase();
  return /\.(webm|ogg|mp3|wav|m4a|aac|flac|opus)$/.test(n);
}
function audioMimeFor(name) {
  const n = (name || '').toLowerCase();
  if (n.endsWith('.ogg') || n.endsWith('.opus')) return 'audio/ogg';
  if (n.endsWith('.mp3')) return 'audio/mpeg';
  if (n.endsWith('.wav')) return 'audio/wav';
  if (n.endsWith('.m4a') || n.endsWith('.aac')) return 'audio/mp4';
  if (n.endsWith('.flac')) return 'audio/flac';
  return 'audio/webm';
}

function fixAudioDuration(audio) {
  const tryFix = () => {
    if (!isFinite(audio.duration)) {
      const onTime = () => {
        audio.removeEventListener('timeupdate', onTime);
        audio.currentTime = 0;
      };
      audio.addEventListener('timeupdate', onTime);
      audio.currentTime = 1e101;
    }
  };
  if (audio.readyState >= 1) tryFix();
  else audio.addEventListener('loadedmetadata', tryFix, { once: true });
}

function attachmentIconHTML(att) {
  if (isImageFile(att.name)) {
    const cached = attachmentThumbCache.get(att.relPath);
    if (cached) {
      return `<span class="att-icon att-thumb"><img class="att-thumb-img" src="${cached}" alt=""></span>`;
    }
    return `<span class="att-icon att-thumb" data-thumb-src="${escapeHTML(att.relPath || '')}">${fileIconFor(att.name)}</span>`;
  }
  return `<span class="att-icon">${fileIconFor(att.name)}</span>`;
}

function attachmentListHTML(taggedItems) {
  if (!taggedItems.length) {
    return `<div class="att-empty">No attachments yet.</div>`;
  }
  return `<div class="att-list">${taggedItems.map(ti => {
    const isAudio = isAudioAttachment(ti.att);
    return `<div class="att-item" data-att-id="${ti.att.id}">
      <div class="att-item-row">
        ${attachmentIconHTML(ti.att)}
        <button class="att-name" data-att-open="${ti.att.id}" data-owner-kind="${ti.ownerKind}" data-owner-id="${ti.ownerId}" title="Open ${escapeHTML(ti.att.name)}">${escapeHTML(ti.att.name)}</button>
        ${ti.sourceLabel ? `<span class="att-source" title="${escapeHTML(ti.sourceTooltip || ti.sourceLabel)}">${escapeHTML(ti.sourceLabel)}</span>` : ''}
        <span class="att-meta">${formatFileSize(ti.att.size)}</span>
        ${isAudio ? `<button class="att-play-btn" data-att-play="${escapeHTML(ti.att.relPath)}" title="Play inline">▶</button>` : ''}
        <button class="att-remove" data-att-remove="${ti.att.id}" data-owner-kind="${ti.ownerKind}" data-owner-id="${ti.ownerId}" title="Remove">✕</button>
      </div>
      ${isAudio ? `<div class="att-audio-container" data-att-audio-container="${ti.att.id}"></div>` : ''}
    </div>`;
  }).join('')}</div>`;
}

function ownerAttachmentsTagged(owner, ownerKind, ownerId) {
  return (owner.attachments || []).map(a => ({ att: a, ownerKind, ownerId }));
}

function subprojectMergedAttachments(sp) {
  const proj = getProject();
  const items = [];
  (sp.attachments || []).forEach(a =>
    items.push({ att: a, ownerKind: 'subproject', ownerId: sp.id, sourceLabel: 'Subproject', sourceTooltip: `Attached directly to ${sp.name}` }));
  (proj.todos || []).filter(t => t.subprojectId === sp.id).forEach(t =>
    (t.attachments || []).forEach(a =>
      items.push({ att: a, ownerKind: 'todo', ownerId: t.id, sourceLabel: `Todo: ${t.title}`, sourceTooltip: `From todo: ${t.title}` })));
  (proj.notes || []).filter(n => n.subprojectId === sp.id).forEach(n =>
    (n.attachments || []).forEach(a =>
      items.push({ att: a, ownerKind: 'note', ownerId: n.id, sourceLabel: `Note: ${n.title}`, sourceTooltip: `From note: ${n.title}` })));
  items.sort((a, b) => new Date(b.att.added || 0) - new Date(a.att.added || 0));
  return items;
}

function attachmentPanelHTML(owner, ownerKind, ownerId, title = 'Attachments', taggedItems) {
  const items = taggedItems || ownerAttachmentsTagged(owner, ownerKind, ownerId);
  const count = items.length;
  return `<div class="att-panel" data-owner-kind="${ownerKind}" data-owner-id="${ownerId}">
    <div class="att-panel-header">
      <span class="att-panel-title">${title} <span class="att-count">(${count})</span></span>
      <div class="att-panel-actions">
        <button class="btn btn-ghost btn-sm att-folder-btn" title="Open attachments folder in Explorer">📁 Folder</button>
        <button class="btn btn-ghost btn-sm att-add-btn">+ Add</button>
      </div>
    </div>
    <div class="att-dropzone">
      <div class="att-dropzone-hint">📎 Drag & drop files here</div>
      ${attachmentListHTML(items)}
    </div>
  </div>`;
}

function resolveAttachmentOwner(kind, id) {
  const proj = getProject();
  if (!proj) return null;
  if (kind === 'project')    return proj;
  if (kind === 'note')       return (proj.notes || []).find(n => n.id === id);
  if (kind === 'todo')       return (proj.todos || []).find(t => t.id === id);
  if (kind === 'subproject') return (proj.subprojects || []).find(s => s.id === id);
  return null;
}

function bindAttachmentPanel(container, onAfter) {
  if (!container) return;
  loadAttachmentThumbnails(container);
  const panels = container.querySelectorAll('.att-panel');
  panels.forEach(panel => {
    const kind = panel.dataset.ownerKind;
    const id = panel.dataset.ownerId;
    const owner = () => resolveAttachmentOwner(kind, id);

    panel.querySelector('.att-add-btn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      const o = owner();
      if (!o) return;
      await pickAndAddAttachments(o, onAfter);
    });

    panel.querySelector('.att-folder-btn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!window.api || typeof window.api.openProjectFolder !== 'function') {
        showToast('Attachments API not available — please fully restart the app.', 'error');
        return;
      }
      try {
        const err = await window.api.openProjectFolder(state.project);
        if (err) showToast(`Could not open folder: ${err}`, 'error');
      } catch (err) {
        showToast(`Could not open folder: ${err.message}`, 'error');
      }
    });

    panel.querySelectorAll('[data-att-open]').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const o = resolveAttachmentOwner(btn.dataset.ownerKind, btn.dataset.ownerId);
        if (!o) return;
        const att = (o.attachments || []).find(a => a.id === btn.dataset.attOpen);
        if (att) openAttachmentFile(att);
      }));

    panel.querySelectorAll('[data-att-remove]').forEach(btn =>
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const o = resolveAttachmentOwner(btn.dataset.ownerKind, btn.dataset.ownerId);
        if (!o) return;
        await removeAttachment(o, btn.dataset.attRemove, onAfter);
      }));

    panel.querySelectorAll('[data-att-play]').forEach(btn =>
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const rel = btn.dataset.attPlay;
        const item = btn.closest('.att-item');
        const container = item?.querySelector('.att-audio-container');
        if (!container) return;
        if (container.firstChild) { container.innerHTML = ''; btn.textContent = '▶'; return; }
        if (!window.api || typeof window.api.readAttachmentDataUrl !== 'function') {
          showToast('Audio API unavailable — please fully restart the app.', 'error');
          return;
        }
        try {
          const url = await window.api.readAttachmentDataUrl(rel);
          if (!url) { showToast('Audio unreachable. Fully restart the app so the new audio MIME handlers load.', 'error'); return; }
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.src = url;
          audio.style.width = '100%';
          audio.style.marginTop = '6px';
          audio.addEventListener('error', () => {
            showToast(`Audio playback failed (code ${audio.error?.code || '?'}).`, 'error');
          });
          container.innerHTML = '';
          container.appendChild(audio);
          fixAudioDuration(audio);
          audio.play().catch(() => {});
          btn.textContent = '⏸';
        } catch (err) {
          console.error(err);
          showToast(`Could not open audio: ${err.message}`, 'error');
        }
      }));

    const zone = panel.querySelector('.att-dropzone');
    if (zone) {
      zone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('att-dropzone-active');
      });
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        zone.classList.add('att-dropzone-active');
      });
      zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget)) zone.classList.remove('att-dropzone-active');
      });
      zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('att-dropzone-active');
        const o = owner();
        if (!o) { showToast('Could not find item to attach to.', 'error'); return; }
        const files = e.dataTransfer?.files;
        if (!files || !files.length) { showToast('No files detected in drop.', 'error'); return; }
        await addDroppedFilesToOwner(o, files, onAfter);
      });
    }
  });
}

function showTodoAttachmentsModal(todoId) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t) return;
  const overlay = document.getElementById('modal-overlay');
  const render = () => {
    overlay.innerHTML = `
      <div class="modal attachments-modal">
        <h3>Attachments — ${escapeHTML(t.title)}</h3>
        ${attachmentPanelHTML(t, 'todo', t.id)}
        <div class="modal-buttons">
          <button class="btn btn-primary" id="att-modal-close">Done</button>
        </div>
      </div>`;
    bindAttachmentPanel(overlay, render);
    document.getElementById('att-modal-close').onclick = () => {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
      overlay.onclick = null;
      renderTodos();
    };
  };
  overlay.classList.remove('hidden');
  render();
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
      overlay.onclick = null;
      renderTodos();
    }
  };
}

function setupGlobalDropGuard() {
  // Prevent the browser from navigating away when files are dropped outside a drop zone.
  window.addEventListener('dragover', (e) => { e.preventDefault(); }, false);
  window.addEventListener('drop', (e) => {
    if (!e.target.closest?.('.att-dropzone')) e.preventDefault();
  }, false);
}

function applyListPanelWidth() {
  const stored = parseInt(localStorage.getItem('listPanelWidth'), 10);
  const w = Number.isFinite(stored) && stored >= 200 ? stored : 280;
  document.documentElement.style.setProperty('--list-panel-w', w + 'px');
}

// ===== DEVELOPER / BACKUP PROMPT =====
const BACKUP_PROMPT_INTERVAL_MS = 15 * 60 * 1000;
const BACKUP_PROMPT_MIN_GAP_MS = 14 * 60 * 1000; // hard floor under the interval
let backupPromptTimerHandle = null;
let lastBackupPromptShownAt = 0;

function isDeveloperMode() { return localStorage.getItem('developerMode') === 'true'; }
function isAskForBackups() { return localStorage.getItem('askForBackups') === 'true'; }

function isRueckbucherButtonEnabled() { return localStorage.getItem('rueckbucherButtonEnabled') === 'true'; }
function setRueckbucherButtonEnabled(on) { localStorage.setItem('rueckbucherButtonEnabled', on ? 'true' : 'false'); }

function isRecurringBoxCollapsed() { return localStorage.getItem('recurringBoxCollapsed') === 'true'; }
function setRecurringBoxCollapsed(on) { localStorage.setItem('recurringBoxCollapsed', on ? 'true' : 'false'); }
function isRueckbucherBoxCollapsed() { return localStorage.getItem('rueckbucherBoxCollapsed') === 'true'; }
function setRueckbucherBoxCollapsed(on) { localStorage.setItem('rueckbucherBoxCollapsed', on ? 'true' : 'false'); }

function addWorkdays(fromDate, n) {
  // Skips Saturday (6) and Sunday (0). n counts actual workdays past fromDate.
  const d = new Date(fromDate);
  let remaining = Math.max(0, n);
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) remaining--;
  }
  return d;
}

function spawnRueckbucherFollowups() {
  const proj = getProject();
  if (!proj) return;
  if (!Array.isArray(proj.todos)) proj.todos = [];
  const now = new Date();
  const addDays = (n) => { const d = new Date(now); d.setDate(d.getDate() + n); return d; };
  const lastReminder = addDays(14);
  const inaktivStellen = addWorkdays(lastReminder, 3); // 3 workdays after "last reminder"
  const items = [
    { title: 'Rückbucher 2nd reminder',       dueDate: toDateString(addDays(7))        },
    { title: 'Rückbucher last reminder',      dueDate: toDateString(lastReminder)      },
    { title: 'Rückbucher inaktiv stellen',    dueDate: toDateString(inaktivStellen)    }
  ];
  const createdAt = now.toISOString();
  items.forEach((item, i) => {
    proj.todos.unshift({
      id: generateId('todo'),
      title: item.title,
      done: false,
      priority: 'medium',
      startDate: null,
      dueDate: item.dueDate,
      subprojectId: null,
      created: new Date(Date.now() + i).toISOString(),
      completedAt: null,
      attachments: [],
      steps: [],
      recurrence: null,
      kind: 'rueckbucher'
    });
  });
  saveData();
  showToast('3 Rückbucher follow-ups created.', 'success');
}

function setDeveloperMode(on) {
  localStorage.setItem('developerMode', on ? 'true' : 'false');
  if (!on) {
    localStorage.setItem('askForBackups', 'false');
    stopBackupPromptTimer();
  }
}

function setAskForBackups(on) {
  localStorage.setItem('askForBackups', on ? 'true' : 'false');
  if (on) startBackupPromptTimer();
  else stopBackupPromptTimer();
}

function startBackupPromptTimer() {
  stopBackupPromptTimer();
  // Reset the gap window so the *first* prompt after enabling is allowed
  // exactly one full interval from now, not blocked by a stale timestamp.
  lastBackupPromptShownAt = Date.now();
  backupPromptTimerHandle = setInterval(showBackupPrompt, BACKUP_PROMPT_INTERVAL_MS);
}

function stopBackupPromptTimer() {
  if (backupPromptTimerHandle) {
    clearInterval(backupPromptTimerHandle);
    backupPromptTimerHandle = null;
  }
}

function showBackupPrompt() {
  // Hard floor: never show two prompts within the minimum gap, regardless of
  // how many timers/retries somehow ended up scheduled.
  const now = Date.now();
  if (now - lastBackupPromptShownAt < BACKUP_PROMPT_MIN_GAP_MS) return;

  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  // If another modal is already open, skip this firing entirely. The next
  // setInterval tick (15 min later) will try again. No chained setTimeout.
  if (!overlay.classList.contains('hidden') && overlay.innerHTML.trim().length > 0) {
    return;
  }

  lastBackupPromptShownAt = now;
  overlay.innerHTML = `
    <div class="modal backup-prompt-modal">
      <h3>💾 Create a backup?</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
        15 minutes since the last check. Back up the app source and data now?
      </p>
      <p style="font-size:11px;color:var(--text-muted);margin-bottom:20px;font-style:italic">
        Creates a zip in <code>C:\\Users\\hallo\\Desktop\\WorkspaceHub-Backups\\</code>.
        You can disable this prompt in Settings → Developer.
      </p>
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="backup-prompt-skip">Skip</button>
        <button class="btn btn-primary" id="backup-prompt-go">Backup now</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');

  const close = () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    overlay.onclick = null;
  };

  document.getElementById('backup-prompt-skip').onclick = close;
  document.getElementById('backup-prompt-go').onclick = async () => {
    close();
    await runBackupNow();
  };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

async function runBackupNow() {
  if (!window.api || typeof window.api.createBackup !== 'function') {
    showToast('Backup API not available — please fully restart the app.', 'error');
    return;
  }
  showToast('Creating backup…', 'info');
  try {
    const res = await window.api.createBackup();
    if (res && res.ok) {
      const file = res.file ? res.file.split(/[\\/]/).pop() : 'backup';
      showToast(`Backup saved: ${file}${res.size ? ` (${res.size})` : ''}`, 'success');
    } else {
      console.error('createBackup error:', res);
      showToast(`Backup failed: ${res?.error || 'unknown error'}`, 'error');
    }
  } catch (e) {
    console.error('createBackup threw:', e);
    showToast(`Backup error: ${e.message}`, 'error');
  }
}

const SIDEBAR_COMPACT_THRESHOLD = 110;
function applySidebarCompactClass(width) {
  document.body.classList.toggle('sidebar-compact', Number.isFinite(width) && width < SIDEBAR_COMPACT_THRESHOLD);
}
function applySidebarWidth() {
  const stored = parseInt(localStorage.getItem('sidebarWidth'), 10);
  if (Number.isFinite(stored) && stored >= 50 && stored <= 480) {
    document.documentElement.style.setProperty('--sidebar-w', stored + 'px');
    applySidebarCompactClass(stored);
  } else {
    document.documentElement.style.removeProperty('--sidebar-w');
    applySidebarCompactClass(240);
  }
}

function setupSidebarResizer() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  if (sidebar.querySelector('#sidebar-resizer')) return;

  const resizer = document.createElement('div');
  resizer.id = 'sidebar-resizer';
  resizer.title = 'Drag to resize';
  sidebar.appendChild(resizer);

  const startDrag = (clientX) => {
    const startW = sidebar.getBoundingClientRect().width;
    const startX = clientX;
    resizer.classList.add('dragging');
    document.body.classList.add('resizing-horizontal');
    const onMove = (cx) => {
      const next = Math.max(50, Math.min(480, Math.round(startW + (cx - startX))));
      document.documentElement.style.setProperty('--sidebar-w', next + 'px');
      applySidebarCompactClass(next);
    };
    const onMouseMove = (e) => onMove(e.clientX);
    const onTouchMove = (e) => { if (e.touches[0]) onMove(e.touches[0].clientX); };
    const onEnd = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      resizer.classList.remove('dragging');
      document.body.classList.remove('resizing-horizontal');
      const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w'), 10);
      if (Number.isFinite(current)) localStorage.setItem('sidebarWidth', String(current));
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  };

  resizer.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    startDrag(e.clientX);
  });
  resizer.addEventListener('touchstart', (e) => {
    if (!e.touches[0]) return;
    e.stopPropagation();
    startDrag(e.touches[0].clientX);
  }, { passive: true });
  resizer.addEventListener('dblclick', (e) => {
    e.stopPropagation();
    localStorage.removeItem('sidebarWidth');
    document.documentElement.style.removeProperty('--sidebar-w');
    applySidebarCompactClass(240);
  });
}

function applyGanttLabelWidth() {
  const stored = parseInt(localStorage.getItem('ganttLabelWidth'), 10);
  if (Number.isFinite(stored) && stored >= 100 && stored <= 600) {
    document.documentElement.style.setProperty('--gantt-label-w', stored + 'px');
  } else {
    document.documentElement.style.removeProperty('--gantt-label-w');
  }
}

function setupGanttLabelResizers() {
  document.querySelectorAll('.gantt-label-resizer').forEach(resizer => {
    if (resizer.dataset.bound) return;
    resizer.dataset.bound = '1';

    const startDrag = (clientX) => {
      const header = resizer.parentElement;
      if (!header) return;
      const startW = header.getBoundingClientRect().width;
      const startX = clientX;
      resizer.classList.add('dragging');
      document.body.classList.add('resizing-horizontal');
      const onMove = (cx) => {
        const next = Math.max(100, Math.min(600, Math.round(startW + (cx - startX))));
        document.documentElement.style.setProperty('--gantt-label-w', next + 'px');
      };
      const onMouseMove = (e) => onMove(e.clientX);
      const onTouchMove = (e) => { if (e.touches[0]) onMove(e.touches[0].clientX); };
      const onEnd = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onEnd);
        window.removeEventListener('touchcancel', onEnd);
        resizer.classList.remove('dragging');
        document.body.classList.remove('resizing-horizontal');
        const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gantt-label-w'), 10);
        if (Number.isFinite(current)) localStorage.setItem('ganttLabelWidth', String(current));
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onEnd);
      window.addEventListener('touchcancel', onEnd);
    };

    resizer.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      startDrag(e.clientX);
    });
    resizer.addEventListener('touchstart', (e) => {
      if (!e.touches[0]) return;
      e.stopPropagation();
      startDrag(e.touches[0].clientX);
    }, { passive: true });
    resizer.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      localStorage.removeItem('ganttLabelWidth');
      document.documentElement.style.removeProperty('--gantt-label-w');
    });
  });
}

function ensureListPanelResizer() {
  document.querySelectorAll('.notes-layout').forEach(layout => {
    if (layout.querySelector('.list-panel-resizer')) return;
    const list = layout.querySelector('.notes-list-panel');
    const editor = layout.querySelector('.notes-editor-panel');
    if (!list || !editor) return;
    const resizer = document.createElement('div');
    resizer.className = 'list-panel-resizer';
    resizer.title = 'Drag to resize';
    layout.insertBefore(resizer, editor);

    const startDrag = (clientX) => {
      const startW = list.getBoundingClientRect().width;
      const startX = clientX;
      resizer.classList.add('dragging');
      document.body.classList.add('resizing-horizontal');
      const onMove = (cx) => {
        const next = Math.max(220, Math.min(640, startW + (cx - startX)));
        document.documentElement.style.setProperty('--list-panel-w', next + 'px');
      };
      const onMouseMove = (e) => onMove(e.clientX);
      const onTouchMove = (e) => { if (e.touches[0]) onMove(e.touches[0].clientX); };
      const onEnd = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onEnd);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onEnd);
        window.removeEventListener('touchcancel', onEnd);
        resizer.classList.remove('dragging');
        document.body.classList.remove('resizing-horizontal');
        const current = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--list-panel-w'), 10);
        if (Number.isFinite(current)) localStorage.setItem('listPanelWidth', String(current));
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onEnd);
      window.addEventListener('touchcancel', onEnd);
    };

    resizer.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      startDrag(e.clientX);
    });
    resizer.addEventListener('touchstart', (e) => {
      if (!e.touches[0]) return;
      startDrag(e.touches[0].clientX);
    }, { passive: true });
    resizer.addEventListener('dblclick', () => {
      document.documentElement.style.setProperty('--list-panel-w', '280px');
      localStorage.setItem('listPanelWidth', '280');
    });
  });
}

// ===== PROJECTS =====
function migrateProjectColors() {
  if (!state.data || !state.data.projects) return;
  for (const [key, proj] of Object.entries(state.data.projects)) {
    if (!proj.color) proj.color = LEGACY_PROJECT_COLORS[key] || '#16a34a';
  }
}

function applyProjectAccent(color) {
  // Deprecated in favor of reapplyAccent() which considers per-project themes.
  // Kept for backwards compatibility with older call sites.
  reapplyAccent();
}

function slugifyProjectKey(name) {
  const base = (name || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
  let key = base;
  let i = 2;
  while (state.data.projects[key]) { key = `${base}-${i++}`; }
  return key;
}

function createProject(name, color) {
  const trimmed = (name || '').trim();
  if (!trimmed) return null;
  const key = slugifyProjectKey(trimmed);
  const rootId = `bm-${key}-root`;
  state.data.projects[key] = {
    name: trimmed,
    color: color || '#16a34a',
    subprojects: [],
    notes: [],
    todos: [],
    brainmap: {
      rootId,
      nodes: {
        [rootId]: { id: rootId, parentId: null, label: trimmed, color: null, side: null, collapsed: false, note: '', order: 0, subprojectId: null }
      }
    },
    reminders: []
  };
  return key;
}

function showProjectContextMenu(clientX, clientY, projectKey) {
  hideProjectContextMenu();
  const proj = state.data.projects[projectKey];
  if (!proj) return;
  const projCount = Object.keys(state.data.projects).length;
  const pinned = isPinned('project', projectKey, projectKey);
  const menu = document.createElement('div');
  menu.id = 'project-context-menu';
  menu.className = 'bm-context-menu';
  const isArchived = !!proj.archived;
  menu.innerHTML = `
    <button class="bm-ctx-item" data-action="rename">
      <span class="bm-ctx-icon">✎</span><span>Rename</span>
    </button>
    <button class="bm-ctx-item" data-action="pin">
      <span class="bm-ctx-icon">${pinned ? '☆' : '⭐'}</span><span>${pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}</span>
    </button>
    <button class="bm-ctx-item" data-action="archive" ${(!isArchived && projCount <= 1) ? 'disabled' : ''} title="${(!isArchived && projCount <= 1) ? 'Cannot archive your only project' : ''}">
      <span class="bm-ctx-icon">${isArchived ? '↺' : '📦'}</span><span>${isArchived ? 'Restore project' : 'Archive project'}</span>
    </button>
    <div class="bm-ctx-divider"></div>
    <button class="bm-ctx-item bm-ctx-danger" data-action="delete" ${projCount <= 1 ? 'disabled' : ''}>
      <span class="bm-ctx-icon">✕</span><span>Delete project</span>
    </button>`;
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  const x = Math.min(clientX, window.innerWidth - rect.width - 8);
  const y = Math.min(clientY, window.innerHeight - rect.height - 8);
  menu.style.left = `${Math.max(4, x)}px`;
  menu.style.top = `${Math.max(4, y)}px`;

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('.bm-ctx-item');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.action;
    hideProjectContextMenu();
    if (action === 'rename') openRenameProjectModal(projectKey);
    else if (action === 'pin') { togglePin('project', projectKey, projectKey); renderApp(); }
    else if (action === 'archive') {
      const p = state.data.projects[projectKey];
      const willArchive = !p?.archived;
      if (setProjectArchived(projectKey, willArchive)) {
        // If archiving the active project, switch away to one that's still visible.
        if (willArchive && state.project === projectKey) {
          const next = Object.keys(state.data.projects).find(k => k !== projectKey && !state.data.projects[k].archived);
          if (next) state.project = next;
        }
        showToast(`Project ${willArchive ? 'archived' : 'restored'}.`, 'success');
        renderApp();
      }
    }
    else if (action === 'delete') confirmDeleteProjectStep1(projectKey);
  });

  setTimeout(() => {
    document.addEventListener('mousedown', projectContextMenuOutsideHandler, true);
    document.addEventListener('keydown', projectContextMenuKeyHandler, true);
    window.addEventListener('blur', hideProjectContextMenu);
  }, 0);
}

function hideProjectContextMenu() {
  const m = document.getElementById('project-context-menu');
  if (m) m.remove();
  document.removeEventListener('mousedown', projectContextMenuOutsideHandler, true);
  document.removeEventListener('keydown', projectContextMenuKeyHandler, true);
  window.removeEventListener('blur', hideProjectContextMenu);
}
function projectContextMenuOutsideHandler(e) {
  const m = document.getElementById('project-context-menu');
  if (m && !m.contains(e.target)) hideProjectContextMenu();
}
function projectContextMenuKeyHandler(e) {
  if (e.key === 'Escape') { e.preventDefault(); hideProjectContextMenu(); }
}

function openRenameProjectModal(projectKey) {
  const proj = state.data.projects[projectKey];
  if (!proj) return;
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal new-project-modal">
      <h3>Rename project</h3>
      <label class="settings-label">Name</label>
      <input type="text" class="modal-input" id="rename-project-name" value="${escapeHTML(proj.name)}" maxlength="40">
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="rename-project-cancel">Cancel</button>
        <button class="btn btn-primary" id="rename-project-ok">Save</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  const inp = document.getElementById('rename-project-name');
  inp.focus();
  inp.select();
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  const submit = () => {
    const name = inp.value.trim();
    if (!name) { inp.focus(); return; }
    if (name === proj.name) { close(); return; }
    proj.name = name;
    saveData();
    close();
    renderApp();
    showToast(`Project renamed to "${name}".`, 'success');
  };
  document.getElementById('rename-project-cancel').onclick = close;
  document.getElementById('rename-project-ok').onclick = submit;
  inp.onkeydown = (e) => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') close(); };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function confirmDeleteProjectStep1(projectKey) {
  const proj = state.data.projects[projectKey];
  if (!proj) return;
  const overlay = document.getElementById('modal-overlay');
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  overlay.innerHTML = `
    <div class="modal new-project-modal">
      <h3>Delete "${escapeHTML(proj.name)}"?</h3>
      <p style="font-size:13px; color:var(--text-secondary); line-height:1.55; margin:8px 0 14px">
        This will permanently remove the project and all of its data. This cannot be undone.
      </p>
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="del-proj-cancel1">Cancel</button>
        <button class="btn" id="del-proj-continue" style="background:#dc2626; color:white; border-color:#dc2626">Continue</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  document.getElementById('del-proj-cancel1').onclick = close;
  document.getElementById('del-proj-continue').onclick = () => { close(); confirmDeleteProjectStep2(projectKey); };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function confirmDeleteProjectStep2(projectKey) {
  const proj = state.data.projects[projectKey];
  if (!proj) return;
  const overlay = document.getElementById('modal-overlay');
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  const counts = {
    todos: (proj.todos || []).length,
    notes: (proj.notes || []).length,
    commitments: (proj.commitments || []).length,
    delegations: (proj.delegations || []).length,
    subprojects: (proj.subprojects || []).length,
    reminders: (proj.reminders || []).length,
    dumps: (proj.dumps || []).length,
    sparkNodes: proj.brainmap && proj.brainmap.nodes ? Math.max(0, Object.keys(proj.brainmap.nodes).length - 1) : 0,
    attachments: (proj.attachments || []).length
  };
  const lines = Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => `<li><strong>${v}</strong> ${k}</li>`).join('');
  const expectedText = proj.name;
  overlay.innerHTML = `
    <div class="modal new-project-modal">
      <h3 style="color:#dc2626">Absolutely sure?</h3>
      <p style="font-size:13px; color:var(--text-secondary); line-height:1.55; margin:8px 0 10px">
        You're about to permanently delete <strong>${escapeHTML(proj.name)}</strong> and everything in it:
      </p>
      ${lines ? `<ul style="font-size:13px; color:var(--text-primary); line-height:1.8; margin:0 0 12px 22px">${lines}</ul>` : ''}
      <label class="settings-label" style="margin-top:6px">Type the project name to confirm</label>
      <input type="text" class="modal-input" id="del-proj-confirm-input" placeholder="${escapeHTML(expectedText)}" autocomplete="off">
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="del-proj-cancel2">Cancel</button>
        <button class="btn" id="del-proj-confirm-btn" style="background:#9ca3af; color:white; border-color:#9ca3af; cursor:not-allowed" disabled>Delete forever</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  const input = document.getElementById('del-proj-confirm-input');
  const btn = document.getElementById('del-proj-confirm-btn');
  input.focus();
  input.addEventListener('input', () => {
    const ok = input.value === expectedText;
    btn.disabled = !ok;
    if (ok) { btn.style.background = '#dc2626'; btn.style.borderColor = '#dc2626'; btn.style.cursor = 'pointer'; }
    else { btn.style.background = '#9ca3af'; btn.style.borderColor = '#9ca3af'; btn.style.cursor = 'not-allowed'; }
  });
  document.getElementById('del-proj-cancel2').onclick = close;
  btn.onclick = () => { if (btn.disabled) return; close(); performDeleteProject(projectKey); };
  input.onkeydown = (e) => { if (e.key === 'Enter' && !btn.disabled) { close(); performDeleteProject(projectKey); } else if (e.key === 'Escape') close(); };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function performDeleteProject(projectKey) {
  const proj = state.data.projects[projectKey];
  if (!proj) return;
  const name = proj.name;
  delete state.data.projects[projectKey];
  if (state.project === projectKey) {
    const remaining = Object.keys(state.data.projects);
    state.project = remaining[0] || null;
    state.data.activeProject = state.project;
    document.body.setAttribute('data-project', state.project || '');
    applyCurrentTheme();
  }
  saveData();
  renderApp();
  showToast(`Project "${name}" deleted.`, 'info');
}

function openNewProjectModal() {
  const overlay = document.getElementById('modal-overlay');
  const palette = getAllProjectColorOptions();
  let selectedColor = palette[0];
  overlay.innerHTML = `
    <div class="modal new-project-modal">
      <h3>New Project</h3>
      <label class="settings-label">Name</label>
      <input type="text" class="modal-input" id="new-project-name" placeholder="My new project" maxlength="40">
      <label class="settings-label">Accent color</label>
      <div class="project-color-grid" id="new-project-colors">
        ${palette.map((c, i) => `
          <button class="project-color-swatch ${i===0?'selected':''}" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')}
      </div>
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="new-project-cancel">Cancel</button>
        <button class="btn btn-primary" id="new-project-ok">Create</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  const inp = document.getElementById('new-project-name');
  inp.focus();

  overlay.querySelectorAll('.project-color-swatch').forEach(b =>
    b.addEventListener('click', () => {
      selectedColor = b.dataset.color;
      overlay.querySelectorAll('.project-color-swatch').forEach(s => s.classList.toggle('selected', s === b));
    }));

  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  const submit = () => {
    const name = inp.value.trim();
    if (!name) { inp.focus(); return; }
    const key = createProject(name, selectedColor);
    if (!key) return;
    close();
    saveData();
    switchProject(key);
    showToast(`Project "${name}" created.`, 'success');
  };
  document.getElementById('new-project-cancel').onclick = close;
  document.getElementById('new-project-ok').onclick = submit;
  inp.onkeydown = (e) => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') close(); };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

// ===== INIT =====
async function init() {
  state.data = await window.api.loadData();
  migrateProjectColors();
  migrateAttachments();
  state.project = state.data.activeProject && state.data.projects[state.data.activeProject]
    ? state.data.activeProject
    : Object.keys(state.data.projects)[0];
  setupTitleBar();
  setupPalette();
  setupReminderListener();
  setupGlobalDropGuard();
  setupScrollPreservation();
  setupTextareaTabIndent();
  setupPinToggleDelegate();
  setupMentionClickDelegate();
  window.addEventListener('keydown', bmWindowKeyHandler, true);
  applyListPanelWidth();
  applyGanttLabelWidth();
  applySidebarWidth();
  if (isDeveloperMode() && isAskForBackups()) startBackupPromptTimer();
  document.body.setAttribute('data-project', state.project);
  applyCurrentTheme();
  // Overview is the only landing now. Pull / Today / Universe live in the
  // sidebar's Lab section and are reached on demand. Within-session
  // navigation persists via JS state; a full reload (Ctrl+R) returns here.
  try {
    if (state.project) {
      state.view = 'overview';
    }
    // Sweep up keys from prior landing-mode iterations (no current consumers).
    // A future "remember last view" feature can introduce its own well-named
    // key — these stale ones would only invite confusion.
    localStorage.removeItem('landingStyle');
    localStorage.removeItem('lastOpenedDate');
  } catch {}
  captureInitialUndoSnapshot();
  renderApp();
  await window.api.checkRemindersNow();
}

function refreshApp() {
  if (state.view === 'brainmap') { try { saveBrainmap(); } catch {} }
  location.reload();
}

// ===== KEYBOARD SHORTCUT CHEATSHEET =====
const KEY_SHORTCUTS = [
  {
    group: 'Global',
    items: [
      { keys: ['Ctrl', 'K'],          desc: 'Open command palette · search & quick capture' },
      { keys: ['Ctrl', 'Z'],          desc: 'Undo last change' },
      { keys: ['Ctrl', 'Y'],          desc: 'Redo' },
      { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo (alternative)' },
      { keys: ['Ctrl', 'R'],          desc: 'Refresh app' },
      { keys: ['?'],                  desc: 'Open this cheatsheet' },
      { keys: ['Esc'],                desc: 'Close any modal / palette / menu' }
    ]
  },
  {
    group: 'Command palette',
    items: [
      { keys: ['↑', '↓'],            desc: 'Navigate results' },
      { keys: ['Enter'],              desc: 'Open the highlighted result' },
      { keys: ['Ctrl', 'Enter'],      desc: 'Force capture as todo (skip search results)' },
      { keys: ['Click ☆'],            desc: 'Pin / unpin a result without navigating' }
    ]
  },
  {
    group: 'Capture syntax (in palette text)',
    items: [
      { keys: ['@projectname'],       desc: 'Route the new todo to a project (e.g. @eh)' },
      { keys: ['today'],              desc: 'Due today' },
      { keys: ['tomorrow'],           desc: 'Due tomorrow (also: morgen / heute)' },
      { keys: ['fri', 'monday', '…'], desc: 'Next occurrence of weekday (next mon = the one after)' },
      { keys: ['in 3 days'],          desc: 'Relative offset' },
      { keys: ['22.4'],               desc: 'DD.MM. shorthand (auto-rolls to next year if past)' }
    ]
  },
  {
    group: 'Pinned mode (bullseye)',
    items: [
      { keys: ['D'],                  desc: 'Mark selected item done' },
      { keys: ['N'],                  desc: 'Start focus session on selected todo' },
      { keys: ['S'],                  desc: 'Snooze selected todo by 1 day' },
      { keys: ['G'],                  desc: 'Jump to Delegations view' },
      { keys: ['Enter'],              desc: 'Skip to next item' },
      { keys: ['↑', '↓'],            desc: 'Move queue selection' },
      { keys: ['Space'],              desc: 'Pause / resume focus timer' }
    ]
  },
  {
    group: 'Spark Map',
    items: [
      { keys: ['Tab'],                desc: 'Add child node · while editing: commit and add child' },
      { keys: ['Enter'],              desc: 'Add sibling node' },
      { keys: ['F2'],                 desc: 'Rename selected node' },
      { keys: ['Del', 'Backspace'],   desc: 'Delete selected node' },
      { keys: ['Space'],              desc: 'Collapse / expand selected branch' },
      { keys: ['↑', '↓'],            desc: 'Reorder selected node among siblings' },
      { keys: ['←', '→'],            desc: 'Navigate left / right' }
    ]
  },
  {
    group: 'Notes editor',
    items: [
      { keys: ['Ctrl', 'B'],          desc: 'Bold' },
      { keys: ['Ctrl', 'I'],          desc: 'Italic' },
      { keys: ['Ctrl', 'U'],          desc: 'Underline' },
      { keys: ['Ctrl', 'S'],          desc: 'Save note' },
      { keys: ['Tab'],                desc: 'Indent list item · or insert tab' },
      { keys: ['Shift', 'Tab'],       desc: 'Outdent list item' }
    ]
  },
  {
    group: 'Sidebar',
    items: [
      { keys: ['Drag handle'],        desc: 'Resize sidebar — drag below 110px for compact icons-only mode' },
      { keys: ['Double-click handle'],desc: 'Reset sidebar to default width' },
      { keys: ['Right-click project'],desc: 'Rename · pin to sidebar · delete project' }
    ]
  }
];

function openShortcutsCheatsheet() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  const close = () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    overlay.onclick = null;
    document.removeEventListener('keydown', onKey, true);
  };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  };

  overlay.innerHTML = `
    <div class="modal cheatsheet-modal">
      <div class="cheatsheet-head">
        <h3>Keyboard shortcuts</h3>
        <input type="text" id="cheatsheet-search" class="form-input" placeholder="Filter… e.g. tab, focus, undo" autocomplete="off">
        <button class="btn btn-ghost btn-icon" id="cheatsheet-close" title="Close">✕</button>
      </div>
      <div class="cheatsheet-body" id="cheatsheet-body">
        ${cheatsheetHTML('')}
      </div>
      <div class="cheatsheet-foot">
        <kbd>Esc</kbd> to close
      </div>
    </div>`;
  overlay.classList.remove('hidden');

  const input = document.getElementById('cheatsheet-search');
  input.focus();
  input.addEventListener('input', () => {
    document.getElementById('cheatsheet-body').innerHTML = cheatsheetHTML(input.value.trim().toLowerCase());
  });
  document.getElementById('cheatsheet-close').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  document.addEventListener('keydown', onKey, true);
}

function cheatsheetHTML(query) {
  const q = (query || '').toLowerCase();
  const groups = KEY_SHORTCUTS
    .map(g => {
      const items = g.items.filter(it => {
        if (!q) return true;
        const hay = `${g.group} ${it.desc} ${(it.keys || []).join(' ')}`.toLowerCase();
        return hay.includes(q);
      });
      return { ...g, items };
    })
    .filter(g => g.items.length);

  if (!groups.length) {
    return `<div class="cheatsheet-empty">No shortcuts match “${escapeHTML(query)}”.</div>`;
  }

  return groups.map(g => `
    <div class="cheatsheet-group">
      <div class="cheatsheet-group-title">${escapeHTML(g.group)}</div>
      <div class="cheatsheet-list">
        ${g.items.map(it => `
          <div class="cheatsheet-row">
            <div class="cheatsheet-keys">
              ${(it.keys || []).map(k => /^[a-z]/i.test(k) && k.length > 2 ? `<span class="kbd-text">${escapeHTML(k)}</span>` : `<kbd>${escapeHTML(k)}</kbd>`).join('<span class="cheatsheet-plus">+</span>')}
            </div>
            <div class="cheatsheet-desc">${escapeHTML(it.desc)}</div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

const __scrollMemory = {};
function __getScrollEl(root) {
  if (!root) return null;
  return root.querySelector('.view-body-scrollable')
      || root.querySelector('[data-scroll-root]')
      || [...root.querySelectorAll('div')].find(el => {
           const s = el.getAttribute('style') || '';
           return /overflow-y\s*:\s*auto/.test(s);
         })
      || null;
}
function __scrollKey() {
  return `${state.project}::${state.view}`;
}
function setupMentionClickDelegate() {
  document.addEventListener('click', (e) => {
    // Mention chips inside note bodies
    const a = e.target.closest && e.target.closest('a.mention');
    if (a) {
      e.preventDefault();
      e.stopPropagation();
      const type = a.dataset.mentionType;
      const projKey = a.dataset.mentionProject;
      const refId = a.dataset.mentionRef;
      if (!type || !projKey || !refId) return;
      if (projKey !== state.project) switchProject(projKey);
      if (type === 'todo') showView('todos');
      else if (type === 'note') { state.editingNote = refId; showView('notes'); }
      else if (type === 'flow') { state.flowEditing = refId; showView('flows'); }
      else if (type === 'subproject') { state.activeSubproject = refId; showView('subprojects'); }
      else if (type === 'reminder') showView('reminders');
      else if (type === 'project') showView('dashboard');
      return;
    }
    // Backlink rows in any view's panel
    const back = e.target.closest && e.target.closest('[data-backlink-note]');
    if (back) {
      e.preventDefault();
      e.stopPropagation();
      const projKey = back.dataset.backlinkProject;
      if (projKey && projKey !== state.project) switchProject(projKey);
      state.editingNote = back.dataset.backlinkNote;
      showView('notes');
    }
  });
}

function setupPinToggleDelegate() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pin-toggle]');
    if (!btn) return;
    if (btn.closest('#palette') || btn.closest('#sidebar')) return;
    e.preventDefault();
    e.stopPropagation();
    togglePin(btn.dataset.pinType, btn.dataset.pinProject, btn.dataset.pinRef);
    renderApp();
  }, true);
}

function setupTextareaTabIndent() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (!t) return;

    if (t.isContentEditable) {
      e.preventDefault();
      const sel = window.getSelection();
      let node = sel && sel.anchorNode;
      while (node && node !== t) {
        if (node.nodeType === 1 && node.tagName === 'LI') break;
        node = node.parentNode;
      }
      const inListItem = node && node !== t && node.tagName === 'LI';
      if (e.shiftKey) {
        try { document.execCommand(inListItem ? 'outdent' : 'outdent'); } catch {}
      } else if (inListItem) {
        try { document.execCommand('indent'); } catch {}
      } else {
        try { document.execCommand('insertText', false, '\t'); } catch {}
      }
      t.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    if (t.tagName !== 'TEXTAREA') return;
    e.preventDefault();
    const start = t.selectionStart;
    const end = t.selectionEnd;
    const value = t.value;

    if (e.shiftKey) {
      // Outdent: remove a leading tab or up to 2 spaces from each affected line
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const segEnd = end;
      const segment = value.substring(lineStart, segEnd);
      const lines = segment.split('\n');
      let removedFirst = 0;
      let removedTotal = 0;
      const newLines = lines.map((ln, i) => {
        if (ln.startsWith('\t')) {
          if (i === 0) removedFirst = 1;
          removedTotal += 1;
          return ln.slice(1);
        } else if (ln.startsWith('  ')) {
          if (i === 0) removedFirst = 2;
          removedTotal += 2;
          return ln.slice(2);
        }
        return ln;
      });
      t.value = value.substring(0, lineStart) + newLines.join('\n') + value.substring(segEnd);
      t.selectionStart = Math.max(lineStart, start - removedFirst);
      t.selectionEnd = Math.max(t.selectionStart, end - removedTotal);
    } else if (start !== end && value.substring(start, end).indexOf('\n') !== -1) {
      // Multi-line indent: prepend tab to each affected line
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const segment = value.substring(lineStart, end);
      const indented = segment.replace(/^/gm, '\t');
      const added = indented.length - segment.length;
      t.value = value.substring(0, lineStart) + indented + value.substring(end);
      t.selectionStart = start + 1;
      t.selectionEnd = end + added;
    } else {
      // Single insert
      t.value = value.substring(0, start) + '\t' + value.substring(end);
      t.selectionStart = t.selectionEnd = start + 1;
    }
    t.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

/**
 * Run a render that preserves the user's interaction context:
 * - active element id (so input focus survives the re-render)
 * - selection range / cursor position inside that input/textarea
 * - the element ids/dataset markers that had open `<details>` panels
 * - scroll position is already handled by setupScrollPreservation()
 *
 * Use this whenever a small data tweak (toggle, edit, bulk action)
 * should not yank focus out of what the user was typing in.
 *
 * @param {() => void} renderFn  Synchronous render call.
 */
function preserveStateAcross(renderFn) {
  const active = document.activeElement;
  let activeId = null, selStart = null, selEnd = null, isCE = false;
  if (active && active !== document.body) {
    activeId = active.id || (active.dataset && active.dataset.id) || null;
    if (typeof active.selectionStart === 'number') {
      selStart = active.selectionStart;
      selEnd = active.selectionEnd;
    } else if (active.isContentEditable) {
      isCE = true;
    }
  }
  const openDetails = new Set();
  document.querySelectorAll('details[open]').forEach(d => {
    if (d.id) openDetails.add(d.id);
  });

  renderFn();

  if (activeId) {
    const restored = document.getElementById(activeId)
      || document.querySelector(`[data-id="${activeId}"]`);
    if (restored && typeof restored.focus === 'function') {
      try {
        restored.focus({ preventScroll: true });
        if (selStart !== null && typeof restored.setSelectionRange === 'function') {
          try { restored.setSelectionRange(selStart, selEnd); } catch {}
        }
      } catch {}
    }
  }
  openDetails.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS') el.open = true;
  });
}

function setupScrollPreservation() {
  const content = document.getElementById('content');
  if (!content) return;

  content.addEventListener('scroll', (e) => {
    const t = e.target;
    if (!t || !t.getBoundingClientRect) return;
    const inActiveView = t.closest && t.closest('.view.active');
    if (!inActiveView) return;
    __scrollMemory[__scrollKey()] = t.scrollTop;
  }, true);

  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const view = content.querySelector('.view.active');
      const el = __getScrollEl(view);
      if (!el) return;
      const saved = __scrollMemory[__scrollKey()];
      if (typeof saved !== 'number') return;
      if (el.scrollTop === 0 && saved !== 0) el.scrollTop = saved;
    });
  });
  observer.observe(content, { childList: true });
}

async function toggleStickyMode() {
  state.stickyMode = !state.stickyMode;
  try { await window.api.winSetAlwaysOnTop(state.stickyMode); } catch {}
  document.body.classList.toggle('sticky-mode', state.stickyMode);
  const btn = document.getElementById('btn-sticky');
  if (btn) btn.classList.toggle('active', state.stickyMode);
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.style.display = state.stickyMode ? 'none' : '';
  if (state.stickyMode) {
    try { await window.api.winSetStickyBounds({ compact: true, width: 420, height: 680 }); } catch {}
    window.addEventListener('keydown', stickyKeyHandler, true);
    startStickyTimerTick();
    renderStickyV3();
  } else {
    window.removeEventListener('keydown', stickyKeyHandler, true);
    stopStickyTimerTick();
    try { await window.api.winSetStickyBounds({ compact: false }); } catch {}
    renderApp();
  }
}

// ===== COMMAND PALETTE =====
let paletteState = { open: false, results: [], activeIdx: 0, query: '' };

function setupPalette() {
  if (document.getElementById('palette')) return;
  const host = document.createElement('div');
  host.id = 'palette';
  host.innerHTML = `
    <div class="palette-backdrop"></div>
    <div class="palette-box">
      <input id="palette-input" class="palette-input" placeholder="Search or capture — e.g. 'call Lukas tomorrow @eh'" autocomplete="off" spellcheck="false">
      <div id="palette-results" class="palette-results"></div>
      <div class="palette-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
        <span><kbd>↵</kbd> select</span>
        <span><kbd>Ctrl</kbd>+<kbd>↵</kbd> force capture</span>
        <span><kbd>Esc</kbd> close</span>
        <span class="palette-footer-hint">Tip: <code>@projectname</code> · <code>tomorrow</code> · <code>fri</code> · <code>in 3 days</code> · <code>22.4</code></span>
      </div>
    </div>`;
  document.body.appendChild(host);

  const input = document.getElementById('palette-input');
  input.addEventListener('input', () => {
    paletteState.query = input.value;
    paletteState.activeIdx = 0;
    renderPaletteResults();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closePalette(); return; }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      paletteState.activeIdx = Math.min(paletteState.results.length - 1, paletteState.activeIdx + 1);
      renderPaletteResults();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      paletteState.activeIdx = Math.max(0, paletteState.activeIdx - 1);
      renderPaletteResults();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) { captureFromPalette(); return; }
      const r = paletteState.results[paletteState.activeIdx];
      if (r) activatePaletteResult(r);
    }
  });

  host.querySelector('.palette-backdrop').addEventListener('click', closePalette);
}

function openPalette() {
  setupPalette();
  paletteState.open = true;
  paletteState.query = '';
  paletteState.activeIdx = 0;
  const host = document.getElementById('palette');
  const input = document.getElementById('palette-input');
  input.value = '';
  host.classList.add('open');
  renderPaletteResults();
  setTimeout(() => input.focus(), 0);
}

function closePalette() {
  paletteState.open = false;
  const host = document.getElementById('palette');
  if (host) host.classList.remove('open');
}

function searchEverything(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  const out = [];
  for (const [key, proj] of Object.entries(state.data.projects || {})) {
    if (proj.archived) continue;
    const meta = { project: key, projectName: proj.name, projectColor: proj.color || '#16a34a', projectIcon: proj.iconRelPath || null };
    if ((proj.name || '').toLowerCase().includes(q)) {
      out.push({ ...meta, type: 'project', icon: '◈', title: proj.name, subtitle: 'Project' });
    }
    (proj.todos || []).forEach(t => {
      if (t.archived) return;
      if ((t.title || '').toLowerCase().includes(q)) {
        out.push({ ...meta, type: 'todo', icon: t.done ? '☑' : '✅', title: t.title, id: t.id, subtitle: t.done ? 'Done' : 'Open', metaRight: t.dueDate ? formatDate(t.dueDate) : '', overdue: !t.done && t.dueDate && isOverdue(t.dueDate) });
      }
    });
    (proj.notes || []).forEach(n => {
      if (n.archived) return;
      const title = (n.title || '').trim();
      const content = noteContentText(n.content);
      if (title.toLowerCase().includes(q) || content.toLowerCase().includes(q)) {
        out.push({ ...meta, type: 'note', icon: '📝', title: title || content.slice(0, 60) || '(untitled note)', id: n.id, subtitle: 'Note' });
      }
    });
    (proj.commitments || []).forEach(c => {
      const haystack = [c.description, c.counterparty, c.context, c.notes].map(s => (s || '').toLowerCase()).join(' \u0000 ');
      if (haystack.includes(q)) {
        const arrow = c.direction === 'they_owe' ? '←' : '→';
        const who = c.counterparty || 'someone';
        out.push({
          ...meta, type: 'commitment', icon: '🤝',
          title: c.description || '(no description)',
          id: c.id,
          subtitle: `${arrow} ${who}${c.status && c.status !== 'open' ? ' · ' + c.status : ''}`,
          metaRight: c.due_date ? formatDate(c.due_date) : ''
        });
      }
    });
    (proj.delegations || []).forEach(d => {
      const haystack = [d.task, d.delegated_to, d.context, d.notes].map(s => (s || '').toLowerCase()).join(' \u0000 ');
      if (haystack.includes(q)) {
        out.push({
          ...meta, type: 'delegation', icon: '📤',
          title: d.task || '(no task)',
          id: d.id,
          subtitle: `→ ${d.delegated_to || 'someone'}${d.status && d.status !== 'waiting' ? ' · ' + d.status : ''}`,
          metaRight: d.due_date ? formatDate(d.due_date) : ''
        });
      }
    });
    (proj.subprojects || []).forEach(sp => {
      if ((sp.name || '').toLowerCase().includes(q)) {
        out.push({ ...meta, type: 'subproject', icon: '📁', title: sp.name, id: sp.id, subtitle: 'Subproject' });
      }
    });
    (proj.dumps || []).forEach(dm => {
      const txt = (dm.text || dm.title || '').trim();
      if (txt.toLowerCase().includes(q)) {
        out.push({ ...meta, type: 'dump', icon: '🧠', title: txt.slice(0, 80), id: dm.id, subtitle: 'Dump' });
      }
    });
    const bmNodes = proj.brainmap && proj.brainmap.nodes ? Object.values(proj.brainmap.nodes) : [];
    bmNodes.forEach(n => {
      const label = (n.label || '').trim();
      const note = (n.note || '').trim();
      if (label.toLowerCase().includes(q) || note.toLowerCase().includes(q)) {
        const isRoot = proj.brainmap && n.id === proj.brainmap.rootId;
        out.push({ ...meta, type: 'brainmap', icon: '✨', title: label || '(unnamed node)', id: n.id, subtitle: isRoot ? 'Spark Map · root' : 'Spark Map node' });
      }
    });
  }
  out.sort((a, b) => {
    const at = (a.title || '').toLowerCase();
    const bt = (b.title || '').toLowerCase();
    const aStarts = at.startsWith(q) ? 0 : 1;
    const bStarts = bt.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return at.indexOf(q) - bt.indexOf(q);
  });
  return out.slice(0, 30);
}

function parseQuickCapture(raw) {
  let text = (raw || '').trim();
  if (!text) return null;
  let projectKey = state.project;
  let projectMatched = false;
  let dueDate = null;
  let dateLabel = null;

  const atRx = /@([a-z0-9][a-z0-9-]*)/i;
  const atM = text.match(atRx);
  if (atM) {
    const q = atM[1].toLowerCase();
    const hit = Object.entries(state.data.projects).find(([k, p]) => {
      const nameKey = (p.name || '').toLowerCase().replace(/\s+/g, '');
      return k.toLowerCase().startsWith(q) || nameKey.startsWith(q);
    });
    if (hit) {
      projectKey = hit[0];
      projectMatched = true;
      text = text.replace(atM[0], '').trim();
    }
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const addD = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };
  const wdMap = { sun:0,sunday:0,mon:1,monday:1,tue:2,tuesday:2,wed:3,wednesday:3,thu:4,thursday:4,fri:5,friday:5,sat:6,saturday:6,
                   so:0,sonntag:0,mo:1,montag:1,di:2,dienstag:2,mi:3,mittwoch:3,do:4,donnerstag:4,fr:5,freitag:5,sa:6,samstag:6 };
  let consumed = null;
  let m;
  if (m = text.match(/\b(today|heute)\b/i)) { dueDate = toDateString(today); consumed = m[0]; dateLabel = 'today'; }
  else if (m = text.match(/\b(tomorrow|morgen)\b/i)) { dueDate = toDateString(addD(1)); consumed = m[0]; dateLabel = 'tomorrow'; }
  else if (m = text.match(/\bin\s+(\d+)\s*(days?|tagen?|d)\b/i)) { dueDate = toDateString(addD(parseInt(m[1], 10))); consumed = m[0]; dateLabel = `+${m[1]}d`; }
  else if (m = text.match(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat|sonntag|montag|dienstag|mittwoch|donnerstag|freitag|samstag|so|mo|di|mi|do|fr|sa)\b/i)) {
    const wd = wdMap[m[2].toLowerCase()];
    const forceNext = !!m[1];
    let delta = wd - today.getDay();
    if (delta <= 0 || forceNext) delta += 7;
    dueDate = toDateString(addD(delta));
    consumed = m[0];
    dateLabel = m[0].trim();
  }
  else if (m = text.match(/\b(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\b/)) {
    const d = parseInt(m[1], 10); const mo = parseInt(m[2], 10);
    let y = m[3] ? parseInt(m[3], 10) : today.getFullYear();
    if (y < 100) y += 2000;
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      const date = new Date(y, mo - 1, d);
      if (!m[3] && date < today) date.setFullYear(y + 1);
      dueDate = toDateString(date);
      consumed = m[0];
      dateLabel = `${d}.${mo}.`;
    }
  }
  if (consumed) text = text.replace(consumed, '').trim();
  text = text.replace(/\s+/g, ' ').replace(/^(on|am|at|re:?)\s+/i, '').replace(/\s+(on|am|at)$/i, '').trim();

  return { title: text, dueDate, projectKey, projectMatched, dateLabel };
}

// Inline /-commands inside a todo title: extract structured fields and return the
// cleaned title plus what was parsed. Examples a user can type:
//   "Call Lukas /tomorrow /high /sp:eh"     → due tomorrow, priority high, subproject eh
//   "Review deck /due 5d"                    → due in 5 days
//   "Standup /weekly /high"                  → recurrence weekly, priority high
// Tokens not recognised stay in the title untouched.
function parseTodoSlashCommands(raw) {
  let text = (raw || '').toString();
  const out = { title: text, dueDate: null, startDate: null, priority: null, subprojectId: null, recurrence: null, tokens: [] };
  if (!text) return out;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const addD = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

  const parseDateExpr = (s) => {
    if (!s) return null;
    const lc = s.toLowerCase();
    if (lc === 'today' || lc === 'heute') return toDateString(today);
    if (lc === 'tomorrow' || lc === 'morgen') return toDateString(addD(1));
    let m;
    if (m = lc.match(/^(\d+)d$/)) return toDateString(addD(parseInt(m[1], 10)));
    if (m = lc.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
    if (m = lc.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/)) {
      const d = parseInt(m[1], 10), mo = parseInt(m[2], 10);
      let y = m[3] ? parseInt(m[3], 10) : today.getFullYear();
      if (y < 100) y += 2000;
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
        const date = new Date(y, mo - 1, d);
        if (!m[3] && date < today) date.setFullYear(y + 1);
        return toDateString(date);
      }
    }
    return null;
  };

  text = text.replace(/\/due\s+(\S+)/gi, (full, arg) => {
    const d = parseDateExpr(arg);
    if (d) { out.dueDate = d; out.tokens.push({ type: 'due', label: arg }); return ''; }
    return full;
  });
  text = text.replace(/\/start\s+(\S+)/gi, (full, arg) => {
    const d = parseDateExpr(arg);
    if (d) { out.startDate = d; out.tokens.push({ type: 'start', label: arg }); return ''; }
    return full;
  });
  text = text.replace(/\/(today|heute|tomorrow|morgen)\b/gi, (full, w) => {
    const d = parseDateExpr(w);
    if (d) { out.dueDate = d; out.tokens.push({ type: 'due', label: w.toLowerCase() }); return ''; }
    return full;
  });
  text = text.replace(/\/(high|hi|medium|med|low|lo)\b/gi, (full, w) => {
    const lc = w.toLowerCase();
    const p = (lc === 'high' || lc === 'hi') ? 'high'
            : (lc === 'low'  || lc === 'lo') ? 'low'
            : 'medium';
    out.priority = p;
    out.tokens.push({ type: 'priority', label: p });
    return '';
  });
  // Subproject lookup uses a getProject() guard so the parser still works in tests
  // before the project state has been wired up.
  const _proj = (typeof getProject === 'function') ? getProject() : null;
  const _sps = _proj?.subprojects || [];
  text = text.replace(/\/(?:sp|sub)(?::(\S+)|\s+(\S+))/gi, (full, a, b) => {
    const q = (a || b || '').toLowerCase();
    if (!q) return full;
    const sp = _sps.find(s => (s.name || '').toLowerCase().includes(q));
    if (sp) {
      out.subprojectId = sp.id;
      out.tokens.push({ type: 'subproject', label: sp.name });
      return '';
    }
    return full;
  });
  text = text.replace(/\/(daily|weekly|monthly|yearly)\b/gi, (full, w) => {
    out.recurrence = { type: w.toLowerCase(), interval: 1 };
    out.tokens.push({ type: 'recurrence', label: w.toLowerCase() });
    return '';
  });

  out.title = text.replace(/\s+/g, ' ').trim();
  return out;
}

// All slash commands the suggestion engine knows about. Order matters — when the user's
// prefix matches multiple, the first one in this list wins. Most-useful first.
const SLASH_COMMANDS = [
  '/tomorrow', '/today', '/heute', '/morgen',
  '/due', '/start',
  '/high', '/medium', '/low', '/hi', '/med', '/lo',
  '/daily', '/weekly', '/monthly', '/yearly',
  '/sp:', '/sub'
];

// Given the input text and caret position, return the ghost-text completion (what to
// append, what's typed, the full command). Returns null when there's nothing to suggest.
// Also handles value-side completion for `/sp:<query>` against subproject names.
function suggestSlashCompletion(text, cursorPos) {
  const before = (text || '').slice(0, cursorPos);
  // Subproject value completion: /sp:sa → /sp:sales
  let m = before.match(/\/(?:sp|sub):([a-z0-9-]*)$/i);
  if (m) {
    const q = m[1].toLowerCase();
    if (q.length >= 1) {
      const proj = (typeof getProject === 'function') ? getProject() : null;
      const sps = proj?.subprojects || [];
      const hit = sps.find(s => (s.name || '').toLowerCase().startsWith(q));
      if (hit) {
        const remainder = hit.name.slice(q.length);
        if (remainder) return { typed: before, completion: remainder, full: before + remainder };
      }
    }
    return null;
  }
  // Slash-command completion: needs at least 2 chars (/ + 1 letter).
  m = before.match(/(\/[a-z]+)$/i);
  if (!m) return null;
  const prefix = m[1].toLowerCase();
  if (prefix.length < 2) return null;
  for (const cmd of SLASH_COMMANDS) {
    if (cmd.toLowerCase() === prefix) continue;        // already complete
    if (cmd.toLowerCase().startsWith(prefix)) {
      return { typed: before, completion: cmd.slice(prefix.length), full: before + cmd.slice(prefix.length) };
    }
  }
  return null;
}

function renderPaletteResults() {
  const host = document.getElementById('palette-results');
  if (!host) return;
  const q = paletteState.query;
  const results = searchEverything(q);
  const capture = q.trim() ? parseQuickCapture(q) : null;
  const items = [...results];
  if (capture && capture.title) {
    items.push({ type: '__capture', capture });
  }
  paletteState.results = items;
  if (paletteState.activeIdx >= items.length) paletteState.activeIdx = Math.max(0, items.length - 1);

  if (!items.length) {
    host.innerHTML = '<div class="palette-empty">Start typing to search or capture.</div>';
    return;
  }
  host.innerHTML = items.map((r, i) => {
    const active = i === paletteState.activeIdx ? ' active' : '';
    if (r.type === '__capture') {
      const c = r.capture;
      const proj = state.data.projects[c.projectKey];
      const projName = proj ? proj.name : '';
      const projColor = proj ? (proj.color || '#16a34a') : '#16a34a';
      const due = c.dateLabel ? ` · due ${escapeHTML(c.dateLabel)}` : '';
      return `<div class="palette-result palette-capture${active}" data-idx="${i}">
        <div class="palette-icon">⊕</div>
        <div class="palette-result-main">
          <div class="palette-result-title">Capture: "${escapeHTML(c.title)}"</div>
          <div class="palette-result-sub"><span class="project-dot" style="background:${projColor}"></span><span>→ ${escapeHTML(projName)}${due}</span></div>
        </div>
      </div>`;
    }
    const overdueCls = r.overdue ? ' overdue' : '';
    const pinnable = ['todo', 'note', 'flow', 'project', 'subproject'].includes(r.type);
    const pinned = pinnable && isPinned(r.type, r.project, r.id || r.project);
    const pinBtn = pinnable
      ? `<button class="palette-pin ${pinned ? 'pinned' : ''}" data-pin-toggle="${i}" title="${pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}">${pinned ? '★' : '☆'}</button>`
      : '';
    return `<div class="palette-result${active}${overdueCls}" data-idx="${i}">
      <div class="palette-icon">${r.icon || ''}</div>
      <div class="palette-result-main">
        <div class="palette-result-title">${escapeHTML(r.title || '')}</div>
        <div class="palette-result-sub">
          <span class="project-dot" style="background:${r.projectColor}"></span>
          <span>${escapeHTML(r.projectName || '')}</span>
          <span class="palette-sub-sep">·</span>
          <span>${escapeHTML(r.subtitle || '')}</span>
        </div>
      </div>
      ${r.metaRight ? `<div class="palette-result-meta">${escapeHTML(r.metaRight)}</div>` : ''}
      ${pinBtn}
    </div>`;
  }).join('');

  host.querySelectorAll('.palette-result').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.palette-pin')) return;
      const idx = parseInt(el.dataset.idx, 10);
      const r = paletteState.results[idx];
      if (r) activatePaletteResult(r);
    });
    el.addEventListener('mouseenter', () => {
      paletteState.activeIdx = parseInt(el.dataset.idx, 10);
      host.querySelectorAll('.palette-result').forEach(e => e.classList.toggle('active', parseInt(e.dataset.idx, 10) === paletteState.activeIdx));
    });
  });
  host.querySelectorAll('.palette-pin').forEach(btn =>
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.pinToggle, 10);
      const r = paletteState.results[idx];
      if (!r) return;
      const refId = r.id || r.project;
      togglePin(r.type, r.project, refId);
      renderPaletteResults();
      renderApp();
    }));
  const activeEl = host.querySelector('.palette-result.active');
  if (activeEl) activeEl.scrollIntoView({ block: 'nearest' });
}

function activatePaletteResult(r) {
  if (r.type === '__capture') { captureFromPalette(); return; }
  if (r.project && r.project !== state.project) switchProject(r.project);
  const viewMap = { todo: 'todos', note: 'notes', commitment: 'commitments', delegation: 'delegations', subproject: 'subprojects', dump: 'dumpzone', brainmap: 'brainmap', project: 'dashboard' };
  const target = viewMap[r.type] || 'dashboard';
  showView(target);
  closePalette();
}

function captureFromPalette() {
  const parsed = parseQuickCapture(paletteState.query);
  if (!parsed || !parsed.title) return;
  const proj = state.data.projects[parsed.projectKey];
  if (!proj) return;
  if (!Array.isArray(proj.todos)) proj.todos = [];
  proj.todos.unshift({
    id: generateId('todo'),
    title: parsed.title,
    done: false,
    priority: 'medium',
    startDate: null,
    dueDate: parsed.dueDate,
    subprojectId: null,
    created: new Date().toISOString(),
    completedAt: null,
    attachments: [],
    steps: [],
    recurrence: null
  });
  saveData();
  const dueTxt = parsed.dateLabel ? ` (due ${parsed.dateLabel})` : '';
  showToast(`Added to ${proj.name}${dueTxt}`, 'success');
  closePalette();
  renderApp();
}

// ===== STICKY MODE V3 =====
state.focusSession = { taskId: null, projectKey: null, startedAt: null, pausedAt: null, elapsedBeforePause: 0, duration: 25 * 60 * 1000 };
state.stickySelectedIdx = 0;
let __stickyTimerInterval = null;

function isStickyQueueCollapsed() { return localStorage.getItem('stickyQueueCollapsed') === 'true'; }
function setStickyQueueCollapsed(on) { localStorage.setItem('stickyQueueCollapsed', on ? 'true' : 'false'); }
function getStickyHiddenProjects() {
  try { return JSON.parse(localStorage.getItem('stickyHiddenProjects') || '[]'); } catch { return []; }
}
function setStickyHiddenProjects(arr) { localStorage.setItem('stickyHiddenProjects', JSON.stringify(arr || [])); }

function buildStickyQueue() {
  const hidden = new Set(getStickyHiddenProjects());
  const todayStr = toDateString(new Date());
  const items = [];
  for (const [key, proj] of Object.entries(state.data.projects || {})) {
    if (hidden.has(key)) continue;
    if (proj.archived) continue;
    const meta = { projectKey: key, projectName: proj.name, projectColor: proj.color || '#16a34a', projectIcon: proj.iconRelPath || null };
    (proj.todos || []).forEach(t => {
      if (t.archived || t.done || !t.dueDate) return;
      const overdue = isOverdue(t.dueDate);
      if (overdue || t.dueDate === todayStr) {
        items.push({ ...meta, kind: overdue ? 'overdue' : 'today', id: t.id, refType: 'todo', title: t.title, dueDate: t.dueDate });
      }
    });
    (proj.commitments || []).forEach(c => {
      if ((c.status && c.status !== 'open') || !c.due_date) return;
      if (isOverdue(c.due_date)) {
        const arrow = c.direction === 'they_owe' ? '←' : '→';
        items.push({ ...meta, kind: 'commitment', id: c.id, refType: 'commitment', title: `${arrow} ${c.counterparty}: ${c.description}`, dueDate: c.due_date });
      }
    });
    (proj.delegations || []).forEach(d => {
      if ((d.status && ['done', 'cancelled'].includes(d.status)) || !d.due_date) return;
      if (isOverdue(d.due_date)) {
        items.push({ ...meta, kind: 'delegation', id: d.id, refType: 'delegation', title: `→ ${d.delegated_to}: ${d.task}`, dueDate: d.due_date });
      }
    });
  }
  const order = { overdue: 0, commitment: 1, delegation: 2, today: 3 };
  return items.sort((a, b) => {
    if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
    return (a.dueDate || '').localeCompare(b.dueDate || '');
  });
}

function computeStickyStats() {
  const items = buildStickyQueue();
  return {
    total: items.length,
    overdue: items.filter(i => i.kind === 'overdue').length,
    today: items.filter(i => i.kind === 'today').length,
    waiting: items.filter(i => i.kind === 'commitment' || i.kind === 'delegation').length
  };
}

function getFocusRemaining() {
  const s = state.focusSession;
  if (!s.taskId) return null;
  let elapsed = s.elapsedBeforePause || 0;
  if (s.startedAt) elapsed += Date.now() - new Date(s.startedAt).getTime();
  return { elapsed, remaining: Math.max(0, s.duration - elapsed), duration: s.duration, paused: !!s.pausedAt };
}
function formatTimer(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function startStickyTimerTick() {
  if (__stickyTimerInterval) return;
  __stickyTimerInterval = setInterval(() => {
    if (!state.stickyMode) { stopStickyTimerTick(); return; }
    if (!state.focusSession.taskId || state.focusSession.pausedAt) return;
    updateFocusTimerDOM();
  }, 1000);
}
function stopStickyTimerTick() {
  if (__stickyTimerInterval) { clearInterval(__stickyTimerInterval); __stickyTimerInterval = null; }
}
function updateFocusTimerDOM() {
  const t = getFocusRemaining();
  if (!t) return;
  const timeEl = document.querySelector('.sv3-timer-time');
  const ringEl = document.querySelector('.sv3-timer-fg');
  if (timeEl) timeEl.textContent = formatTimer(t.remaining);
  if (ringEl) {
    const CIRC = 138;
    const frac = Math.min(1, t.elapsed / t.duration);
    ringEl.setAttribute('stroke-dashoffset', String(CIRC * frac));
  }
}

function stickyStartFocus(item) {
  if (item.refType !== 'todo') { showToast('Focus mode only works on todos.', 'info'); return; }
  state.focusSession = {
    taskId: item.id, projectKey: item.projectKey,
    startedAt: new Date().toISOString(), pausedAt: null,
    elapsedBeforePause: 0, duration: 25 * 60 * 1000
  };
  startStickyTimerTick();
  renderStickyV3();
}
function stickyTogglePauseFocus() {
  const s = state.focusSession;
  if (!s.taskId) return;
  if (s.pausedAt) {
    s.startedAt = new Date().toISOString();
    s.pausedAt = null;
  } else if (s.startedAt) {
    s.elapsedBeforePause += Date.now() - new Date(s.startedAt).getTime();
    s.startedAt = null;
    s.pausedAt = new Date().toISOString();
  }
  renderStickyV3();
}
function stickyEndFocus() {
  state.focusSession = { taskId: null, projectKey: null, startedAt: null, pausedAt: null, elapsedBeforePause: 0, duration: 25 * 60 * 1000 };
  renderStickyV3();
}
function stickyExtendFocus(mins) {
  if (!state.focusSession.taskId) return;
  state.focusSession.duration += mins * 60 * 1000;
  updateFocusTimerDOM();
}

function stickyFindObj(item) {
  const p = state.data.projects[item.projectKey];
  if (!p) return null;
  if (item.refType === 'todo') return p.todos?.find(x => x.id === item.id) || null;
  if (item.refType === 'commitment') return p.commitments?.find(x => x.id === item.id) || null;
  if (item.refType === 'delegation') return p.delegations?.find(x => x.id === item.id) || null;
  return null;
}

function stickyActionDone() {
  const items = buildStickyQueue();
  const it = items[state.stickySelectedIdx];
  if (!it) return;
  const obj = stickyFindObj(it);
  if (!obj) return;
  const now = new Date().toISOString();
  if (it.refType === 'todo') { obj.done = true; obj.completedAt = now; }
  else if (it.refType === 'commitment') { obj.status = 'fulfilled'; obj.fulfilled_at = now; }
  else if (it.refType === 'delegation') { obj.status = 'done'; obj.last_update = now; }
  saveData();
  if (state.focusSession.taskId === it.id) stickyEndFocus();
  else renderStickyV3();
}
function stickyActionNow() {
  const it = buildStickyQueue()[state.stickySelectedIdx];
  if (!it) return;
  stickyStartFocus(it);
}
function stickyActionSnooze(days = 1) {
  const it = buildStickyQueue()[state.stickySelectedIdx];
  if (!it || it.refType !== 'todo') { showToast('Snooze works on todos.', 'info'); return; }
  const obj = stickyFindObj(it);
  if (!obj || !obj.dueDate) return;
  const d = new Date(obj.dueDate);
  d.setDate(d.getDate() + days);
  obj.dueDate = toDateString(d);
  saveData();
  renderStickyV3();
}
function stickyActionDelegate() {
  const it = buildStickyQueue()[state.stickySelectedIdx];
  if (!it) return;
  const projKey = it.projectKey;
  toggleStickyMode().then(() => {
    if (projKey !== state.project) switchProject(projKey);
    showView('delegations');
  });
}
function stickyActionSkip() {
  const items = buildStickyQueue();
  if (!items.length) return;
  state.stickySelectedIdx = (state.stickySelectedIdx + 1) % items.length;
  renderStickyV3();
}
function stickyActionMove(delta) {
  const items = buildStickyQueue();
  if (!items.length) return;
  state.stickySelectedIdx = Math.max(0, Math.min(items.length - 1, state.stickySelectedIdx + delta));
  renderStickyV3();
}

function stickyKeyHandler(e) {
  if (!state.stickyMode) return;
  if (paletteState && paletteState.open) return;
  const tgt = e.target;
  const tag = tgt && tgt.tagName;
  if (tgt && (tgt.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')) return;
  const k = e.key.toLowerCase();
  let handled = true;
  if (k === 'd') stickyActionDone();
  else if (k === 'n') stickyActionNow();
  else if (k === 's') stickyActionSnooze(1);
  else if (k === 'g') stickyActionDelegate();
  else if (e.key === 'Enter') stickyActionSkip();
  else if (e.key === 'ArrowDown') stickyActionMove(1);
  else if (e.key === 'ArrowUp') stickyActionMove(-1);
  else if (k === ' ') {
    if (state.focusSession.taskId) stickyTogglePauseFocus();
    else handled = false;
  }
  else handled = false;
  if (handled) { e.preventDefault(); e.stopPropagation(); }
}

function toggleStickyProjectFilter(key) {
  const h = getStickyHiddenProjects();
  const idx = h.indexOf(key);
  if (idx >= 0) h.splice(idx, 1); else h.push(key);
  setStickyHiddenProjects(h);
  state.stickySelectedIdx = 0;
  renderStickyV3();
}

function openStickyFilterMenu(anchorEl) {
  document.getElementById('sv3-filter-menu')?.remove();
  const hidden = new Set(getStickyHiddenProjects());
  const projects = Object.entries(state.data.projects);
  const menu = document.createElement('div');
  menu.id = 'sv3-filter-menu';
  menu.className = 'sv3-filter-menu';
  menu.innerHTML = `
    <div class="sv3-filter-title">Show projects</div>
    ${projects.map(([key, p]) => `
      <label class="sv3-filter-item">
        <input type="checkbox" data-filter-project="${key}" ${hidden.has(key) ? '' : 'checked'}>
        <span class="sv3-filter-dot" style="background:${p.color || '#16a34a'}"></span>
        <span class="sv3-filter-name">${escapeHTML(p.name)}</span>
      </label>`).join('')}`;
  document.body.appendChild(menu);
  const rect = anchorEl.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;
  menu.querySelectorAll('[data-filter-project]').forEach(cb =>
    cb.addEventListener('change', () => toggleStickyProjectFilter(cb.dataset.filterProject)));
  const outside = (ev) => {
    if (!menu.contains(ev.target) && ev.target !== anchorEl && !anchorEl.contains(ev.target)) {
      menu.remove();
      document.removeEventListener('mousedown', outside, true);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', outside, true), 0);
}

function stickyShortProjName(name) {
  if (!name) return '';
  if (name.length <= 10) return name;
  const words = name.split(/\s+/);
  if (words.length > 1) return words.map(w => w[0]).join('').toUpperCase().slice(0, 4);
  return name.slice(0, 8);
}
function stickyFormatDateShort(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function resizeStickyToContent() {
  const view = document.querySelector('.sv3-view');
  if (!view) return;
  const titlebarH = 40;
  const scroll = view.querySelector('.sv3-scroll');
  const dock = view.querySelector('.sv3-dock');
  let contentH = 0;
  if (scroll) {
    scroll.childNodes.forEach(n => { if (n.nodeType === 1) contentH += n.offsetHeight; });
  }
  const dockH = dock ? dock.offsetHeight : 0;
  const totalH = titlebarH + contentH + dockH + 8;
  try { window.api.winSetStickyBounds({ compact: true, width: 440, height: Math.min(totalH, 820) }); } catch {}
}

function renderStickyV3() {
  const items = buildStickyQueue();
  if (items.length === 0) state.stickySelectedIdx = 0;
  else if (state.stickySelectedIdx >= items.length) state.stickySelectedIdx = items.length - 1;
  if (state.stickySelectedIdx < 0) state.stickySelectedIdx = 0;

  const stats = computeStickyStats();
  const queueCollapsed = isStickyQueueCollapsed();
  const session = state.focusSession;
  const sessionActive = !!session.taskId;
  let focusProj = null, focusTodo = null;
  if (sessionActive) {
    focusProj = state.data.projects[session.projectKey];
    focusTodo = focusProj?.todos?.find(t => t.id === session.taskId);
    if (!focusTodo) { stickyEndFocus(); return; }
  }
  const t = sessionActive ? getFocusRemaining() : null;
  const TCIRC = 138;
  const tOffset = t ? TCIRC * Math.min(1, t.elapsed / t.duration) : TCIRC;
  const pulseCirc = 252;
  const pulseFill = stats.total === 0
    ? pulseCirc
    : pulseCirc * Math.max(0.05, 1 - stats.overdue / Math.max(stats.total, 1));

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const hiddenCount = getStickyHiddenProjects().length;
  const noOverdue = stats.overdue === 0;

  document.getElementById('content').innerHTML = `
    <div class="view active sv3-view${noOverdue ? ' no-overdue' : ''}">
      <div class="sv3-scroll">
        <div class="sv3-pulse">
          <div class="sv3-ring">
            <svg width="88" height="88" viewBox="0 0 88 88" shape-rendering="geometricPrecision">
              <circle cx="44" cy="44" r="40" class="sv3-ring-bg" fill="none" stroke-width="6"></circle>
              <circle cx="44" cy="44" r="40" class="sv3-ring-fg" fill="none" stroke-width="6" stroke-linecap="round"
                      transform="rotate(-90 44 44)"
                      stroke-dasharray="${pulseCirc}" stroke-dashoffset="${pulseFill}"></circle>
            </svg>
            <div class="sv3-ring-center">
              <div class="sv3-ring-num">${stats.total}</div>
              <div class="sv3-ring-lbl">Due</div>
            </div>
          </div>
          <div class="sv3-pulse-right">
            <div class="sv3-pulse-title">${dateStr} · ${timeStr}</div>
            <div class="sv3-pulse-sub">${stats.overdue > 0 ? `<strong>${stats.overdue} overdue</strong>` : '<span>Nothing overdue</span>'} · ${stats.today} today · ${stats.waiting} waiting</div>
            <div class="sv3-tiny-tiles">
              <button class="sv3-tiny${stats.overdue ? ' alert' : ''}" data-sticky-filter-kind="overdue" title="Jump to overdue"><strong>${stats.overdue}</strong> overdue</button>
              <button class="sv3-tiny" data-sticky-filter-kind="today" title="Jump to today"><strong>${stats.today}</strong> today</button>
              <button class="sv3-tiny" data-sticky-filter-kind="waiting" title="Jump to waiting"><strong>${stats.waiting}</strong> waiting</button>
            </div>
          </div>
          <button class="sv3-filter-btn" id="sv3-filter-btn" title="${hiddenCount ? `${hiddenCount} project${hiddenCount > 1 ? 's' : ''} hidden` : 'Filter projects'}">
            ⚙${hiddenCount ? `<span class="sv3-filter-badge">${hiddenCount}</span>` : ''}
          </button>
        </div>

        ${sessionActive ? `
          <div class="sv3-focus" style="--focus-accent:${focusProj?.color || 'var(--accent)'}">
            <div class="sv3-focus-header">Focus · ${session.pausedAt ? 'paused' : 'in session'}</div>
            <div class="sv3-focus-title">${escapeHTML(focusTodo.title)}</div>
            <div class="sv3-focus-row">
              <div class="sv3-timer">
                <svg width="52" height="52" viewBox="0 0 52 52" shape-rendering="geometricPrecision">
                  <circle cx="26" cy="26" r="22" class="sv3-timer-bg" fill="none" stroke-width="5"></circle>
                  <circle cx="26" cy="26" r="22" class="sv3-timer-fg" fill="none" stroke-width="5" stroke-linecap="round"
                          transform="rotate(-90 26 26)"
                          stroke-dasharray="${TCIRC}" stroke-dashoffset="${tOffset}"></circle>
                </svg>
                <div class="sv3-timer-time">${formatTimer(t.remaining)}</div>
              </div>
              <div class="sv3-timer-info">
                <div class="sv3-timer-state">${session.pausedAt ? 'Paused' : 'Deep Work'}</div>
                <div class="sv3-timer-label">${Math.round(session.duration / 60000)}-min focus block</div>
                <div class="sv3-timer-ctls">
                  <button class="sv3-tmr-btn primary" data-focus-action="toggle">${session.pausedAt ? '▶ Resume' : '⏸ Pause'}</button>
                  <button class="sv3-tmr-btn" data-focus-action="ext5">+5m</button>
                  <button class="sv3-tmr-btn" data-focus-action="end">End</button>
                </div>
              </div>
            </div>
            ${(focusTodo.steps && focusTodo.steps.length) ? `
              <div class="sv3-focus-steps">
                <div class="sv3-focus-steps-head"><span>Sub-steps</span><span>${focusTodo.steps.filter(s => s.done).length}/${focusTodo.steps.length}</span></div>
                ${focusTodo.steps.map(s => `
                  <div class="sv3-step-row ${s.done ? 'done' : ''}" data-focus-step="${s.id}">
                    <div class="sv3-step-check ${s.done ? 'done' : ''}"></div>
                    <div class="sv3-step-label">${escapeHTML(s.title)}</div>
                  </div>`).join('')}
              </div>` : ''}
          </div>` : ''}

        <div class="sv3-triage ${queueCollapsed ? 'collapsed' : ''}">
          <button class="sv3-triage-toggle" id="sv3-queue-toggle">
            <span class="sv3-triage-caret">${queueCollapsed ? '▸' : '▾'}</span>
            <span class="sv3-triage-title">Queue</span>
            <span class="sv3-triage-count">${items.length}</span>
            <span class="sv3-triage-hint">${queueCollapsed ? 'Click to expand' : (items.length ? `${state.stickySelectedIdx + 1}/${items.length}` : '')}</span>
          </button>
          ${!queueCollapsed ? `
            <div class="sv3-queue">
              ${items.length ? items.map((it, idx) => {
                const sel = idx === state.stickySelectedIdx;
                const dotCls = it.kind === 'overdue' ? 'sv3-dot overdue' : it.kind === 'today' ? 'sv3-dot today' : 'sv3-dot wait';
                const dueCls = it.kind === 'overdue' || it.kind === 'commitment' || it.kind === 'delegation' ? 'overdue' : '';
                return `<div class="sv3-tri-item${sel ? ' selected' : ''}" data-sticky-idx="${idx}">
                  <span class="sv3-caret">▸</span>
                  <span class="${dotCls}"></span>
                  ${it.projectIcon ? `<img class="project-icon-img sv3-proj-icon" data-project-icon-rel="${escapeHTML(it.projectIcon)}" alt="">` : ''}
                  <span class="sv3-tri-txt" title="${escapeHTML(it.title)}">${escapeHTML(it.title)}</span>
                  <span class="sv3-tri-proj" style="background:color-mix(in srgb, ${it.projectColor} 22%, transparent); color:${it.projectColor}">${escapeHTML(stickyShortProjName(it.projectName))}</span>
                  <span class="sv3-tri-due ${dueCls}">${stickyFormatDateShort(it.dueDate)}</span>
                </div>`;
              }).join('') : '<div class="sv3-empty">Nothing urgent 🎉</div>'}
            </div>` : ''}
        </div>
      </div>

      <div class="sv3-dock">
        <div class="sv3-actions">
          <button class="sv3-act done" data-sticky-action="done" title="Mark done"><span>✓</span><span>Done</span><span class="sv3-kbd">D</span></button>
          <button class="sv3-act now" data-sticky-action="now" title="Focus this task"><span>⚡</span><span>Focus</span><span class="sv3-kbd">N</span></button>
          <button class="sv3-act" data-sticky-action="snooze" title="Snooze 1 day"><span>⏰</span><span>Snooze</span><span class="sv3-kbd">S</span></button>
          <button class="sv3-act" data-sticky-action="delegate" title="Go to delegations"><span>📤</span><span>Deleg.</span><span class="sv3-kbd">G</span></button>
          <button class="sv3-act" data-sticky-action="skip" title="Select next"><span>→</span><span>Skip</span><span class="sv3-kbd">↵</span></button>
        </div>
        <button class="sv3-capture" id="sv3-capture" title="Open command palette">
          <span class="sv3-capture-ico">⌕</span>
          <span class="sv3-capture-text">Search or capture…</span>
          <span class="sv3-capture-kbd">Ctrl K</span>
        </button>
      </div>
    </div>`;

  loadProjectIcons();

  document.getElementById('sv3-queue-toggle')?.addEventListener('click', () => {
    setStickyQueueCollapsed(!isStickyQueueCollapsed());
    renderStickyV3();
  });
  document.getElementById('sv3-filter-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openStickyFilterMenu(e.currentTarget);
  });
  document.getElementById('sv3-capture')?.addEventListener('click', openPalette);

  document.querySelectorAll('[data-sticky-idx]').forEach(el => {
    el.addEventListener('click', () => {
      state.stickySelectedIdx = parseInt(el.dataset.stickyIdx, 10);
      renderStickyV3();
    });
    el.addEventListener('dblclick', () => {
      const idx = parseInt(el.dataset.stickyIdx, 10);
      const it = buildStickyQueue()[idx];
      if (!it) return;
      const projKey = it.projectKey;
      const viewMap = { todo: 'todos', commitment: 'commitments', delegation: 'delegations' };
      const target = viewMap[it.refType] || 'dashboard';
      toggleStickyMode().then(() => {
        if (projKey !== state.project) switchProject(projKey);
        showView(target);
      });
    });
  });

  document.querySelectorAll('[data-sticky-action]').forEach(btn =>
    btn.addEventListener('click', () => {
      const a = btn.dataset.stickyAction;
      if (a === 'done') stickyActionDone();
      else if (a === 'now') stickyActionNow();
      else if (a === 'snooze') stickyActionSnooze(1);
      else if (a === 'delegate') stickyActionDelegate();
      else if (a === 'skip') stickyActionSkip();
    }));

  document.querySelectorAll('[data-focus-action]').forEach(btn =>
    btn.addEventListener('click', () => {
      const a = btn.dataset.focusAction;
      if (a === 'toggle') stickyTogglePauseFocus();
      else if (a === 'ext5') stickyExtendFocus(5);
      else if (a === 'end') stickyEndFocus();
    }));

  document.querySelectorAll('[data-focus-step]').forEach(el =>
    el.addEventListener('click', () => {
      const sid = el.dataset.focusStep;
      const proj = state.data.projects[session.projectKey];
      const tt = proj?.todos?.find(x => x.id === session.taskId);
      if (!tt) return;
      const step = (tt.steps || []).find(s => s.id === sid);
      if (!step) return;
      step.done = !step.done;
      saveData();
      renderStickyV3();
    }));

  document.querySelectorAll('[data-sticky-filter-kind]').forEach(btn =>
    btn.addEventListener('click', () => {
      const kind = btn.dataset.stickyFilterKind;
      const items2 = buildStickyQueue();
      const idx = items2.findIndex(i => {
        if (kind === 'overdue') return i.kind === 'overdue';
        if (kind === 'today') return i.kind === 'today';
        if (kind === 'waiting') return i.kind === 'commitment' || i.kind === 'delegation';
        return false;
      });
      if (idx >= 0) {
        state.stickySelectedIdx = idx;
        if (isStickyQueueCollapsed()) setStickyQueueCollapsed(false);
        renderStickyV3();
        setTimeout(() => document.querySelector(`[data-sticky-idx="${idx}"]`)?.scrollIntoView({ block: 'nearest' }), 0);
      }
    }));
}

function setupTitleBar() {
  document.getElementById('btn-sticky').onclick = toggleStickyMode;
  document.getElementById('palette-trigger')?.addEventListener('click', openPalette);
  document.getElementById('btn-shortcuts')?.addEventListener('click', openShortcutsCheatsheet);
  document.getElementById('btn-settings').onclick = openSettings;
  document.getElementById('btn-refresh').onclick = refreshApp;
  document.getElementById('btn-minimize').onclick = () => window.api.winMinimize();
  document.getElementById('btn-maximize').onclick = () => window.api.winMaximize();
  document.getElementById('btn-close').onclick = () => window.api.winClose();
  window.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 'r') {
      e.preventDefault();
      refreshApp();
      return;
    }
    if (ctrl && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (paletteState.open) closePalette();
      else openPalette();
      return;
    }
    if (ctrl && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
      const tgt = e.target;
      const tag = tgt && tgt.tagName;
      // Don't fight the browser's native text-undo inside editable fields.
      if (tgt && (tgt.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')) return;
      e.preventDefault();
      if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) redo();
      else undo();
      return;
    }
    if (e.key === '?' && !ctrl && !e.altKey) {
      const tgt = e.target;
      const tag = tgt && tgt.tagName;
      if (tgt && (tgt.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')) return;
      if (paletteState.open) return;
      e.preventDefault();
      openShortcutsCheatsheet();
      return;
    }
  });
}

function setupReminderListener() {
  window.api.onReminderFired((data) => {
    showToast(`🔔 Reminder: ${data.reminder.title}`, 'reminder');
    // If the fired reminder is recurring, spawn the next occurrence locally.
    // main.js already wrote fired=true to disk; we add the next instance and re-save.
    try {
      const proj = state.data.projects[data.project];
      if (proj && Array.isArray(proj.reminders)) {
        const live = proj.reminders.find(x => x.id === data.reminder.id);
        if (live && live.recurrence) {
          const next = spawnNextRecurringReminder(data.project, live);
          if (next) saveData();
        }
      }
    } catch {}
    renderApp();
  });
}

// ===== RENDER APP =====
function renderApp() { renderSidebar(); renderContent(); }

function switchProject(key) {
  if (!state.data.projects[key]) return;
  if (key === state.project) return;
  if (state.view === 'brainmap') { saveBrainmap(); teardownBrainmap(); }
  if (state.view === 'molecular') { teardownMolecular(); }
  state.editingNote = null;
  state.noteSearch = '';
  state.activeSubproject = null;
  state.editingSubproject = null;
  state.project = key;
  document.body.setAttribute('data-project', key);
  applyCurrentTheme();
  renderApp();
  saveData();
}

function showView(name) {
  if (state.view === 'brainmap' && name !== 'brainmap') { saveBrainmap(); teardownBrainmap(); }
  if (state.view === 'molecular' && name !== 'molecular') { teardownMolecular(); }
  if (state.view !== name) delete __scrollMemory[`${state.project}::${name}`];
  state.view = name;
  renderContent();
  renderSidebar();
}

function renderContent() {
  const views = {
    dashboard: renderDashboard,
    notes:     renderNotes,
    todos:     renderTodos,
    subprojects: renderSubprojects,
    brainmap:  renderBrainmap,
    reminders: renderReminders,
    overview:  renderOverview,
    today:     renderToday,
    pull:      renderPull,
    molecular: renderMolecular,
    dumpzone:  renderDumpZone,
    commitments: renderCommitments,
    delegations: renderDelegations,
    flows:     renderFlows
  };
  (views[state.view] || renderDashboard)();
  setupGanttLabelResizers();
  loadProjectIcons();
}

// ===== SIDEBAR =====
const DEFAULT_NAV_ITEMS = [
  { id: 'dashboard',    icon: '⊞',  label: 'Dashboard' },
  { id: 'dumpzone',     icon: '🧠', label: 'Dump Zone' },
  { id: 'notes',        icon: '📝', label: 'Notes' },
  { id: 'todos',        icon: '✅', label: 'Todos' },
  { id: 'commitments',  icon: '🤝', label: 'Commitments' },
  { id: 'delegations',  icon: '📤', label: 'Delegations' },
  { id: 'flows',        icon: '🔀', label: 'Flows' },
  { id: 'subprojects',  icon: '📁', label: 'Subprojects' },
  { id: 'brainmap',     icon: '✨', label: 'Spark Map' },
  { id: 'reminders',    icon: '🔔', label: 'Reminders' }
];

function loadNavPrefs() {
  const known = new Set(DEFAULT_NAV_ITEMS.map(n => n.id));
  const raw = localStorage.getItem('navPrefs');
  let list;
  try {
    list = raw ? JSON.parse(raw) : null;
  } catch {
    list = null;
  }
  if (!Array.isArray(list)) {
    return DEFAULT_NAV_ITEMS.map(n => ({ id: n.id, visible: true }));
  }
  const filtered = list.filter(p => p && known.has(p.id)).map(p => ({ id: p.id, visible: p.visible !== false }));
  const seen = new Set(filtered.map(p => p.id));
  DEFAULT_NAV_ITEMS.forEach(n => { if (!seen.has(n.id)) filtered.push({ id: n.id, visible: true }); });
  return filtered;
}

function saveNavPrefs(prefs) {
  localStorage.setItem('navPrefs', JSON.stringify(prefs));
}

function getOrderedNavItems() {
  const prefs = loadNavPrefs();
  const byId = Object.fromEntries(DEFAULT_NAV_ITEMS.map(n => [n.id, n]));
  return prefs.map(p => ({ ...byId[p.id], visible: p.visible !== false }));
}

function updateTitlebarCenter() {
  const nameEl = document.getElementById('tb-proj-name');
  const subEl = document.getElementById('tb-proj-sub');
  const dotEl = document.getElementById('tb-proj-dot');
  if (!nameEl || !subEl || !dotEl) return;
  if (!state.data || !state.data.projects) return;

  const now = new Date();
  const dayStr = now.toLocaleDateString('en-GB', { weekday: 'short' });
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  let name = '', color = '#16a34a', overdueCount = 0;
  if (state.view === 'overview') {
    name = 'Overview';
    color = '#64748b';
    for (const p of Object.values(state.data.projects)) {
      if (p.archived) continue;
      (p.todos || []).forEach(t => { if (!t.archived && !t.done && t.dueDate && isOverdue(t.dueDate)) overdueCount++; });
    }
  } else {
    const proj = state.data.projects[state.project];
    if (proj) {
      name = proj.name;
      color = proj.color || '#16a34a';
      overdueCount = (proj.todos || []).filter(t => !t.archived && !t.done && t.dueDate && isOverdue(t.dueDate)).length;
    }
  }

  nameEl.textContent = name;
  dotEl.style.background = color;
  const overduePart = overdueCount > 0
    ? ` · <span class="overdue-pill">${overdueCount} overdue</span>`
    : '';
  subEl.innerHTML = `${dayStr} · ${dateStr}${overduePart}`;
}

function isPinned(type, projectKey, refId) {
  if (!Array.isArray(state.data?.pinned)) return false;
  return state.data.pinned.some(p => p.type === type && p.projectKey === projectKey && p.refId === refId);
}
function togglePin(type, projectKey, refId) {
  if (!Array.isArray(state.data.pinned)) state.data.pinned = [];
  const idx = state.data.pinned.findIndex(p => p.type === type && p.projectKey === projectKey && p.refId === refId);
  if (idx >= 0) state.data.pinned.splice(idx, 1);
  else state.data.pinned.push({ type, projectKey, refId });
  saveData();
}
function reorderPinned(fromIndex, toIndex) {
  if (!Array.isArray(state.data.pinned)) return false;
  const len = state.data.pinned.length;
  if (fromIndex < 0 || fromIndex >= len) return false;
  if (toIndex < 0) toIndex = 0;
  if (toIndex > len) toIndex = len;
  if (fromIndex === toIndex || fromIndex + 1 === toIndex) return false;
  const [moved] = state.data.pinned.splice(fromIndex, 1);
  // Splicing shifts indices for any insertion point past fromIndex.
  if (toIndex > fromIndex) toIndex -= 1;
  state.data.pinned.splice(toIndex, 0, moved);
  saveData();
  return true;
}
function resolvePinnedItem(p) {
  const proj = state.data.projects[p.projectKey];
  if (!proj) return null;
  if (p.type === 'project') return { ...p, name: proj.name, color: proj.color || '#16a34a', view: 'dashboard' };
  if (p.type === 'todo') {
    const t = (proj.todos || []).find(x => x.id === p.refId);
    return t ? { ...p, name: t.title || '(untitled)', view: 'todos' } : null;
  }
  if (p.type === 'note') {
    const n = (proj.notes || []).find(x => x.id === p.refId);
    return n ? { ...p, name: n.title || '(untitled)', view: 'notes' } : null;
  }
  if (p.type === 'flow') {
    const f = (proj.flows || []).find(x => x.id === p.refId);
    return f ? { ...p, name: f.name || '(untitled)', view: 'flows' } : null;
  }
  if (p.type === 'subproject') {
    const sp = (proj.subprojects || []).find(x => x.id === p.refId);
    return sp ? { ...p, name: sp.name || '(untitled)', color: sp.color, view: 'subprojects' } : null;
  }
  return null;
}
// ===== ARCHIVE / DELETE =====
// Archived items stay in their array (so undo and references still work) but
// are hidden from default lists. Use the explicit "Archived" filter to see them.
function setTodoArchived(id, archived) {
  const proj = getProject();
  const t = (proj.todos || []).find(x => x.id === id);
  if (!t) return false;
  if (!!t.archived === !!archived) return false;
  t.archived = !!archived;
  if (archived) t.archivedAt = new Date().toISOString();
  else delete t.archivedAt;
  saveData();
  return true;
}
function setProjectArchived(key, archived) {
  const proj = state.data.projects?.[key];
  if (!proj) return false;
  if (!!proj.archived === !!archived) return false;
  proj.archived = !!archived;
  if (archived) proj.archivedAt = new Date().toISOString();
  else delete proj.archivedAt;
  saveData();
  return true;
}
function setNoteArchived(id, archived) {
  const proj = getProject();
  const n = (proj.notes || []).find(x => x.id === id);
  if (!n) return false;
  if (!!n.archived === !!archived) return false;
  n.archived = !!archived;
  if (archived) n.archivedAt = new Date().toISOString();
  else delete n.archivedAt;
  saveData();
  return true;
}
// Reusable confirm modal for destructive actions. onConfirm runs only if the user clicks OK.
function showConfirmModal({ title, body, confirmLabel = 'Delete', danger = true, onConfirm }) {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) { onConfirm?.(); return; }
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  const dangerStyle = danger ? 'background:#dc2626;color:white;border-color:#dc2626' : '';
  overlay.innerHTML = `
    <div class="modal new-project-modal">
      <h3>${escapeHTML(title)}</h3>
      <p style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin:8px 0 14px">${body || ''}</p>
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="confirm-cancel">Cancel</button>
        <button class="btn" id="confirm-ok" style="${dangerStyle}">${escapeHTML(confirmLabel)}</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  document.getElementById('confirm-cancel').onclick = close;
  document.getElementById('confirm-ok').onclick = () => { close(); onConfirm?.(); };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function pinIconFor(type) {
  if (type === 'todo') return '✓';
  if (type === 'note') return '📝';
  if (type === 'flow') return '🔀';
  if (type === 'project') return '●';
  if (type === 'subproject') return '📁';
  if (type === 'reminder') return '🔔';
  return '★';
}
function pinToggleButtonHTML(type, projectKey, refId, extraClass) {
  const pinned = isPinned(type, projectKey, refId);
  const cls = `pin-toggle${extraClass ? ' ' + extraClass : ''}${pinned ? ' pinned' : ''}`;
  return `<button class="${cls}" data-pin-toggle="1" data-pin-type="${type}" data-pin-project="${escapeHTML(projectKey)}" data-pin-ref="${escapeHTML(refId)}" title="${pinned ? 'Unpin from sidebar' : 'Pin to sidebar'}">${pinned ? '★' : '☆'}</button>`;
}

function renderSidebar() {
  updateTitlebarCenter();
  const p = state.project;
  const navItems = getOrderedNavItems().filter(n => n.visible);
  const projectEntries = Object.entries(state.data.projects);
  // Three landing-mode buttons: Pull (default daily), Today (bucketed list),
  // Universe (the molecular map). Each is its own ≥44 px button so touch users
  // can hit them reliably. The overdue badge moved to Pull because Pull is now
  // the urgency surface — Today still shows the count internally but doesn't
  // need a sidebar badge competing.
  const overdueCount = (() => {
    let n = 0;
    for (const p of Object.values(state.data.projects || {})) {
      if (p.archived) continue;
      n += (p.todos || []).filter(t => !t.archived && !t.done && t.dueDate && (isOverdue(t.dueDate) || t.dueDate === toDateString(new Date()))).length;
    }
    return n;
  })();
  // Whether the Lab section is expanded — persisted across reloads via
  // localStorage.labOpen ('1' = open, anything else = closed). Default
  // closed so the experimental views (Pull / Today / Universe) don't add
  // visual noise to the main nav.
  const labOpen = localStorage.getItem('labOpen') === '1';

  document.getElementById('sidebar').innerHTML = `
    <button class="overview-btn ${state.view==='overview'?'active':''}" id="btn-overview" aria-label="Overview — your daily landing">
      <span class="overview-btn-icon">◈</span>
      <span class="overview-btn-label">Overview</span>
      ${overdueCount > 0 ? `<span class="overview-btn-count">${overdueCount}</span>` : ''}
    </button>
    ${(() => {
      // Resolve in two arrays so that dataset.pinIndex maps to the *raw* index
      // in state.data.pinned (orphaned entries are skipped from the UI but the
      // index still has to point to the original array slot for reordering to work).
      const raw = state.data.pinned || [];
      const resolved = raw.map((p, i) => ({ item: resolvePinnedItem(p), rawIndex: i })).filter(r => r.item);
      if (!resolved.length) return '';
      return `<div class="pinned-section" id="pinned-section">
        <div class="pinned-label"><span>⭐ Pinned</span><button class="pinned-add" id="btn-pinned-add" title="Pin from search (Ctrl+K)">+</button></div>
        ${resolved.map(({ item, rawIndex }) => {
          const colorAttr = item.type === 'project' ? ` style="--pin-color:${item.color}"` : '';
          return `<button class="pin-row pin-${item.type}"${colorAttr} draggable="true" data-pin-index="${rawIndex}" data-pin-type="${item.type}" data-pin-project="${item.projectKey}" data-pin-ref="${escapeHTML(item.refId)}" title="${escapeHTML(item.name)}">
            <span class="pin-drag-handle" title="Drag to reorder">⋮⋮</span>
            <span class="pin-ic">${pinIconFor(item.type)}</span>
            <span class="pin-name">${escapeHTML(item.name)}</span>
            <span class="pin-star" title="Unpin">★</span>
          </button>`;
        }).join('')}
      </div>`;
    })()}
    <div class="project-switcher">
      <div class="project-label">Projects</div>
      ${(() => {
        const archivedCount = projectEntries.filter(([, proj]) => proj.archived).length;
        const visibleEntries = state.showArchivedProjects
          ? projectEntries
          : projectEntries.filter(([, proj]) => !proj.archived);
        const buttons = visibleEntries.map(([key, proj]) => `
          <button class="project-btn ${p === key ? 'active' : ''} ${proj.archived?'archived':''}" data-switch="${key}" title="${proj.archived ? 'Archived — right-click to restore' : ''}">
            ${projectDotOrIconHTML(proj, 10)}
            <span class="project-btn-name">${escapeHTML(proj.name)}${proj.archived ? ' <span class="proj-archived-tag">📦</span>' : ''}</span>
          </button>`).join('');
        const toggle = archivedCount > 0
          ? `<button class="project-btn project-btn-archived-toggle" id="btn-toggle-archived-projects" title="${state.showArchivedProjects ? 'Hide archived' : 'Show archived'}">
              <span class="project-dot project-dot-archived">📦</span>
              <span class="project-btn-name">${state.showArchivedProjects ? 'Hide archived' : `Show archived (${archivedCount})`}</span>
            </button>`
          : '';
        return buttons + toggle;
      })()}
      <button class="project-btn project-btn-new" id="btn-new-project" title="Create a new project">
        <span class="project-dot project-dot-new">+</span>
        <span class="project-btn-name">New project</span>
      </button>
    </div>
    <div class="sidebar-divider"></div>
    <div class="nav-section-label">Workspace</div>
    ${navItems.map(v => {
      const proj = state.data.projects[p];
      let count = 0;
      if (v.id === 'todos') {
        count = (proj?.todos || []).filter(t => !t.archived && !t.done && t.dueDate && isOverdue(t.dueDate)).length;
      } else if (v.id === 'commitments') {
        count = (proj?.commitments || []).filter(c => (!c.status || c.status === 'open') && c.due_date && isOverdue(c.due_date)).length;
      } else if (v.id === 'delegations') {
        count = (proj?.delegations || []).filter(d => !['done', 'cancelled'].includes(d.status) && d.due_date && isOverdue(d.due_date)).length;
      } else if (v.id === 'reminders') {
        const todayStr = new Date().toDateString();
        count = (proj?.reminders || []).filter(r => {
          if (r.fired) return false;
          if (r.doneAt) return false;
          if (!r.datetime) return false;
          return new Date(r.datetime).toDateString() === todayStr;
        }).length;
      }
      const countHTML = count > 0 ? `<span class="nav-count overdue">${count}</span>` : '';
      return `<button class="nav-item ${state.view === v.id ? 'active' : ''}" data-view="${v.id}">
        <span class="nav-icon">${v.icon}</span> <span class="nav-label">${v.label}</span>${countHTML}
      </button>`;
    }).join('')}
    <div class="sidebar-divider"></div>
    <details class="lab-section" id="lab-section"${labOpen ? ' open' : ''}>
      <summary class="lab-summary">
        <span class="lab-summary-chevron" aria-hidden="true">▸</span>
        <span class="lab-summary-label">Lab</span>
      </summary>
      <button class="nav-item lab-item ${state.view==='pull'?'active':''}" data-view="pull">
        <span class="nav-icon">↓</span> <span class="nav-label">Pull</span>
      </button>
      <button class="nav-item lab-item ${state.view==='today'?'active':''}" data-view="today">
        <span class="nav-icon">☀</span> <span class="nav-label">Today</span>
      </button>
      <button class="nav-item lab-item ${state.view==='molecular'?'active':''}" data-view="molecular">
        <span class="nav-icon">⚛</span> <span class="nav-label">Universe</span>
      </button>
    </details>`;

  // Listener hygiene: renderSidebar() resets #sidebar's innerHTML on every call.
  // Old DOM nodes + their listeners are orphaned and GC'd; fresh listeners are
  // attached on the new DOM. No event delegation needed — the re-render
  // boundary already cleans up. The Lab section's three items use the existing
  // [data-view] click handler at the bottom of this function.
  document.getElementById('btn-overview')?.addEventListener('click', () => showView('overview'));
  // Persist Lab open/closed across reloads. The browser fires `toggle` on
  // <details> any time the open state changes (clicked summary or scripted).
  document.getElementById('lab-section')?.addEventListener('toggle', (e) => {
    try { localStorage.setItem('labOpen', e.currentTarget.open ? '1' : '0'); } catch {}
  });
  document.getElementById('btn-pinned-add')?.addEventListener('click', openPalette);
  document.querySelectorAll('.pin-row').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (e.target.closest('.pin-star')) {
        togglePin(btn.dataset.pinType, btn.dataset.pinProject, btn.dataset.pinRef);
        renderApp();
        return;
      }
      const type = btn.dataset.pinType;
      const projKey = btn.dataset.pinProject;
      const refId = btn.dataset.pinRef;
      if (projKey && projKey !== state.project) switchProject(projKey);
      if (type === 'subproject') {
        state.activeSubproject = refId;
        showView('subprojects');
      } else {
        const viewMap = { todo: 'todos', note: 'notes', flow: 'flows', project: 'dashboard' };
        showView(viewMap[type] || 'dashboard');
      }
    });
  });
  setupPinnedDragReorder();
  document.querySelectorAll('[data-switch]').forEach(b => {
    b.addEventListener('click', () => {
      if (b.dataset.switch === state.project && state.view === 'overview') {
        showView('dashboard');
      } else {
        switchProject(b.dataset.switch);
        if (state.view === 'overview') showView('dashboard');
      }
    });
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showProjectContextMenu(e.clientX, e.clientY, b.dataset.switch);
    });
  });
  document.getElementById('btn-new-project')?.addEventListener('click', openNewProjectModal);
  document.getElementById('btn-toggle-archived-projects')?.addEventListener('click', () => {
    state.showArchivedProjects = !state.showArchivedProjects;
    renderSidebar();
  });
  document.querySelectorAll('[data-view]').forEach(b =>
    b.addEventListener('click', () => showView(b.dataset.view)));
  setupSidebarResizer();
  loadProjectIcons();
}

function setupPinnedDragReorder() {
  const section = document.getElementById('pinned-section');
  if (!section) return;
  const rows = section.querySelectorAll('.pin-row[draggable="true"]');
  if (!rows.length) return;
  let dragSourceIndex = null;
  const clearMarkers = () => {
    section.querySelectorAll('.pin-row.drag-over-before, .pin-row.drag-over-after, .pin-row.dragging')
      .forEach(el => el.classList.remove('drag-over-before', 'drag-over-after', 'dragging'));
  };
  rows.forEach(row => {
    row.addEventListener('dragstart', (e) => {
      dragSourceIndex = parseInt(row.dataset.pinIndex, 10);
      row.classList.add('dragging');
      try {
        e.dataTransfer.effectAllowed = 'move';
        // Required by Firefox to actually start a drag.
        e.dataTransfer.setData('text/plain', String(dragSourceIndex));
      } catch {}
    });
    row.addEventListener('dragend', () => {
      dragSourceIndex = null;
      clearMarkers();
    });
    row.addEventListener('dragover', (e) => {
      if (dragSourceIndex === null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = row.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      section.querySelectorAll('.pin-row.drag-over-before, .pin-row.drag-over-after')
        .forEach(el => el.classList.remove('drag-over-before', 'drag-over-after'));
      row.classList.add(before ? 'drag-over-before' : 'drag-over-after');
    });
    row.addEventListener('dragleave', (e) => {
      // Only clear if leaving the row entirely (not entering a child).
      if (e.relatedTarget && row.contains(e.relatedTarget)) return;
      row.classList.remove('drag-over-before', 'drag-over-after');
    });
    row.addEventListener('drop', (e) => {
      if (dragSourceIndex === null) return;
      e.preventDefault();
      const targetRawIndex = parseInt(row.dataset.pinIndex, 10);
      const rect = row.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      const insertAt = before ? targetRawIndex : targetRawIndex + 1;
      const moved = reorderPinned(dragSourceIndex, insertAt);
      dragSourceIndex = null;
      clearMarkers();
      if (moved) renderApp();
    });
  });
}

// ===== DASHBOARD =====
function renderDashboard() {
  const proj = getProject();
  const visibleTodos = (proj.todos || []).filter(t => !t.archived);
  const visibleNotes = (proj.notes || []).filter(n => !n.archived);
  const upcomingReminders = proj.reminders.filter(r => !r.fired).length;
  const recentNotes = [...visibleNotes].sort((a,b) => new Date(b.updated) - new Date(a.updated)).slice(0, 4);
  const overdueTodos = visibleTodos
    .filter(t => !t.done && t.dueDate && isOverdue(t.dueDate))
    .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
  const openTodos = visibleTodos.filter(t => !t.done).slice(0, 5);
  const nextReminder = proj.reminders.filter(r => !r.fired && r.datetime)
    .sort((a,b) => new Date(a.datetime) - new Date(b.datetime))[0];
  const hasSps = (proj.subprojects || []).length > 0;
  const openCommitments = (proj.commitments || []).filter(c => c.status === 'open');
  const overdueCommitments = openCommitments.filter(c => isCommitmentOverdue(c))
    .sort((a,b) => new Date(a.due_date || '9999') - new Date(b.due_date || '9999'));

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-dashboard">
      <div class="view-header">
        <div class="view-header-row">
          <div class="view-title">${proj.name}</div>
          <span style="font-size:13px;color:var(--text-muted)">${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</span>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:0 24px 24px">
        <div class="stats-grid">
          ${statCard('📝', visibleNotes.length, 'Notes', 'notes')}
          ${statCard('✅', `${visibleTodos.filter(t=>t.done).length}/${visibleTodos.length}`, 'Todos done', 'todos')}
          ${statCard('🤝', openCommitments.length, 'Open commitments', 'commitments')}
          ${statCard('🔔', upcomingReminders, 'Reminders', 'reminders')}
          ${statCard('✨', Object.keys(proj.brainmap?.nodes || {}).length, 'Spark nodes', 'brainmap')}
          ${hasSps ? statCard('📁', proj.subprojects.length, 'Subprojects', 'subprojects') : ''}
        </div>
        ${overdueTodos.length ? `
          <div class="dash-section dash-overdue-section">
            <div class="dash-section-header">
              <span class="dash-section-title dash-overdue-title">⚠ Overdue todos</span>
              <span class="dash-overdue-count">${overdueTodos.length}</span>
              <button class="btn btn-ghost btn-sm" id="btn-dash-view-all-overdue" style="margin-left:auto">View all</button>
            </div>
            <div class="dash-overdue-list">
              ${overdueTodos.slice(0, 6).map(t => `
                <div class="dash-todo-item dash-todo-overdue">
                  <div class="todo-checkbox ${t.done?'checked':''}" data-dash-todo-id="${t.id}"></div>
                  <span class="dash-todo-title ${t.done?'done':''}">${escapeHTML(t.title)}</span>
                  <span class="dash-overdue-date">⚠ ${formatDate(t.dueDate)}</span>
                  ${priorityBadge(t.priority)}
                  <button class="btn btn-ghost btn-sm dash-overdue-extend" data-dash-overdue-extend="${t.id}" title="Push due date by 1 day">+1d</button>
                </div>`).join('')}
              ${overdueTodos.length > 6 ? `<div class="dash-overdue-more">+ ${overdueTodos.length - 6} more — <a href="#" id="btn-dash-overdue-more">view all</a></div>` : ''}
            </div>
          </div>
        ` : ''}
        <div class="dashboard-grid">
          <div class="dash-section">
            <div class="dash-section-header">
              <span class="dash-section-title">Recent Notes</span>
              <button class="btn btn-ghost btn-sm" id="btn-dash-view-all-notes">View all</button>
            </div>
            ${recentNotes.length ? recentNotes.map(n => `
              <div class="dash-note-item" data-note-id="${n.id}">
                <div class="dash-note-title">${priorityBadge(n.priority)} ${escapeHTML(n.title)}</div>
                <div class="dash-note-meta">${formatDate(n.updated)}</div>
              </div>`).join('') : '<div class="empty-state">No notes yet</div>'}
          </div>
          <div class="dash-section">
            <div class="dash-section-header">
              <span class="dash-section-title">Open Todos</span>
              <button class="btn btn-ghost btn-sm" id="btn-dash-view-all-todos">View all</button>
            </div>
            ${openTodos.length ? openTodos.map(t => `
              <div class="dash-todo-item">
                <div class="todo-checkbox ${t.done?'checked':''}" data-dash-todo-id="${t.id}"></div>
                <span class="dash-todo-title ${t.done?'done':''}">${escapeHTML(t.title)}</span>
                ${priorityBadge(t.priority)}
              </div>`).join('') : '<div class="empty-state">All done!</div>'}
          </div>
          <div class="dash-section" style="grid-column:1/-1">
            <div class="dash-section-header">
              <span class="dash-section-title">Next Reminder</span>
              <button class="btn btn-ghost btn-sm" id="btn-dash-view-all-reminders">All reminders</button>
            </div>
            ${nextReminder ? `
              <div class="reminder-next">
                <div class="reminder-next-title">🔔 ${escapeHTML(nextReminder.title)}</div>
                <div class="reminder-next-time">${formatDateTime(nextReminder.datetime)}</div>
                ${nextReminder.note ? `<div class="reminder-note">${escapeHTML(nextReminder.note)}</div>` : ''}
              </div>` : '<div class="empty-state">No upcoming reminders</div>'}
          </div>
          ${openCommitments.length ? `
          <div class="dash-section" style="grid-column:1/-1">
            <div class="dash-section-header">
              <span class="dash-section-title">Open Commitments${overdueCommitments.length ? ` <span style="color:#dc2626;font-size:11px">· ${overdueCommitments.length} overdue</span>` : ''}</span>
              <button class="btn btn-ghost btn-sm" id="btn-dash-view-all-commitments">View all</button>
            </div>
            ${openCommitments.sort((a,b) => (new Date(a.due_date||'9999'))-(new Date(b.due_date||'9999'))).slice(0, 6).map(c => {
              const overdue = isCommitmentOverdue(c);
              const dir = c.direction === 'i_owe' ? 'I owe → ' : '← They owe: ';
              return `<div class="overview-list-item ${overdue?'dash-commitment-overdue':''}">
                <span class="overview-list-dot" style="background:${overdue?'#dc2626':'var(--accent)'}"></span>
                <span class="overview-list-title"><span style="font-size:11px;color:var(--text-muted)">${dir}</span>${escapeHTML(c.counterparty)} — ${escapeHTML(c.description)}</span>
                ${c.due_date ? `<span class="overview-list-meta ${overdue?'overview-list-meta-alert':''}">${formatDate(c.due_date)}</span>` : ''}
                ${c.context ? `<span class="overview-list-project">${escapeHTML(c.context)}</span>` : ''}
              </div>`;
            }).join('')}
            ${openCommitments.length > 6 ? `<div class="dash-overdue-more">+ ${openCommitments.length - 6} more</div>` : ''}
          </div>` : ''}
          ${proj.todos.some(t => t.startDate || t.dueDate) ? `
          <div class="dash-section" style="grid-column:1/-1">
            <div class="dash-section-header">
              <span class="dash-section-title">Todos Timeline${state.dashGanttExtendDays ? ` <span style="font-weight:400;color:var(--text-muted);font-size:11px">(+${state.dashGanttExtendDays} days)</span>` : ''}</span>
              <div style="display:flex;gap:6px;align-items:center">
                <button class="btn btn-ghost btn-sm" id="btn-dash-gantt-extend" title="Extend timeline by 30 days">+ 30d</button>
                ${state.dashGanttExtendDays ? `<button class="btn btn-ghost btn-sm" id="btn-dash-gantt-reset" title="Reset timeline">Reset</button>` : ''}
                <button class="btn btn-ghost btn-sm" id="btn-dash-view-all-sps">${hasSps ? 'Subprojects' : 'All todos'}</button>
              </div>
            </div>
            ${allSubprojectsGanttHTML(getProject(), state.project, { compact: true, limit: 30 })}
          </div>` : ''}
        </div>
      </div>
    </div>`;

  document.getElementById('btn-dash-view-all-todos')?.addEventListener('click', () => showView('todos'));
  document.getElementById('btn-dash-view-all-overdue')?.addEventListener('click', () => showView('todos'));
  document.getElementById('btn-dash-overdue-more')?.addEventListener('click', (e) => { e.preventDefault(); showView('todos'); });
  document.querySelectorAll('[data-dash-overdue-extend]').forEach(btn =>
    btn.addEventListener('click', () => {
      const id = btn.dataset.dashOverdueExtend;
      const t = proj.todos.find(x => x.id === id);
      if (!t || !t.dueDate) return;
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const oldDue = new Date(t.dueDate);
      const deltaDays = Math.round((tomorrow - oldDue) / 86400000);
      t.dueDate = toDateString(tomorrow);
      if (t.startDate) {
        const s = new Date(t.startDate);
        s.setDate(s.getDate() + deltaDays);
        t.startDate = toDateString(s);
      }
      saveData();
      showToast(`Pushed "${t.title}" to ${formatDate(t.dueDate)}`, 'success');
      renderDashboard();
    }));
  document.getElementById('btn-dash-view-all-notes')?.addEventListener('click', () => showView('notes'));
  document.getElementById('btn-dash-view-all-reminders')?.addEventListener('click', () => showView('reminders'));
  document.getElementById('btn-dash-view-all-commitments')?.addEventListener('click', () => showView('commitments'));
  document.getElementById('btn-dash-view-all-sps')?.addEventListener('click', () => showView(hasSps ? 'subprojects' : 'todos'));
  document.querySelectorAll('.stat-card[data-stat-view]').forEach(card =>
    card.addEventListener('click', () => showView(card.dataset.statView)));
  document.getElementById('btn-dash-gantt-extend')?.addEventListener('click', () => {
    state.dashGanttExtendDays = (state.dashGanttExtendDays || 0) + 30;
    renderDashboard();
  });
  document.getElementById('btn-dash-gantt-reset')?.addEventListener('click', () => {
    state.dashGanttExtendDays = 0;
    renderDashboard();
  });
  document.querySelectorAll('.dash-gantt-toggle').forEach(btn =>
    btn.addEventListener('click', () => {
      state.dashGanttExpanded = !state.dashGanttExpanded;
      renderDashboard();
    }));
  document.querySelectorAll('.dash-todo-item .todo-checkbox[data-dash-todo-id]').forEach(cb =>
    cb.addEventListener('click', () => toggleTodoFrom(cb.dataset.dashTodoId, 'dashboard')));
  document.querySelectorAll('.dash-note-item[data-note-id]').forEach(el =>
    el.addEventListener('click', () => openNoteFromDash(el.dataset.noteId)));
  document.querySelectorAll('.dash-gantt-row').forEach(el =>
    el.addEventListener('click', () => {
      const spId = el.dataset.spId;
      if (spId) {
        state.activeSubproject = spId;
        state.editingSubproject = null;
        showView('subprojects');
      } else {
        showView('todos');
      }
    }));
}

function statCard(icon, num, label, view) {
  return `<div class="stat-card" data-stat-view="${view}" title="Open ${label.toLowerCase()}">
    <div class="stat-icon">${icon}</div>
    <div class="stat-number">${num}</div>
    <div class="stat-label">${label}</div>
  </div>`;
}

// ===== TODAY (cross-project landing view) =====
function todayGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Good night';
}

function buildTodayBuckets() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = toDateString(today);
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7);

  const overdueTodos = [];
  const todayTodos = [];
  const upcomingTodos = []; // 1–7 days
  const todayReminders = [];
  const overdueCommitments = [];
  const overdueDelegations = [];

  for (const [key, proj] of Object.entries(state.data.projects || {})) {
    if (proj.archived) continue;
    const meta = { projectKey: key, projectName: proj.name, projectColor: proj.color || '#16a34a' };
    (proj.todos || []).forEach(t => {
      if (t.archived || t.done || !t.dueDate) return;
      if (isOverdue(t.dueDate)) {
        overdueTodos.push({ ...meta, todo: t });
      } else if (t.dueDate === todayStr) {
        todayTodos.push({ ...meta, todo: t });
      } else {
        const d = new Date(t.dueDate);
        if (d > today && d <= weekEnd) upcomingTodos.push({ ...meta, todo: t });
      }
    });
    (proj.reminders || []).forEach(r => {
      if (r.fired || r.doneAt || !r.datetime) return;
      const dt = new Date(r.datetime);
      const dtMidnight = new Date(dt); dtMidnight.setHours(0, 0, 0, 0);
      if (dtMidnight.getTime() === today.getTime()) {
        todayReminders.push({ ...meta, reminder: r });
      }
    });
    (proj.commitments || []).forEach(c => {
      if ((c.status && c.status !== 'open') || !c.due_date) return;
      if (isOverdue(c.due_date) || c.due_date === todayStr) {
        overdueCommitments.push({ ...meta, commitment: c });
      }
    });
    (proj.delegations || []).forEach(d => {
      if (['done', 'cancelled'].includes(d.status) || !d.due_date) return;
      if (isOverdue(d.due_date) || d.due_date === todayStr) {
        overdueDelegations.push({ ...meta, delegation: d });
      }
    });
  }

  // Sort: oldest overdue first, today by priority, upcoming by date
  const prio = { high: 0, medium: 1, low: 2 };
  overdueTodos.sort((a, b) => (a.todo.dueDate || '').localeCompare(b.todo.dueDate || ''));
  todayTodos.sort((a, b) => (prio[a.todo.priority] ?? 1) - (prio[b.todo.priority] ?? 1));
  upcomingTodos.sort((a, b) => (a.todo.dueDate || '').localeCompare(b.todo.dueDate || ''));
  todayReminders.sort((a, b) => new Date(a.reminder.datetime) - new Date(b.reminder.datetime));
  overdueCommitments.sort((a, b) => (a.commitment.due_date || '').localeCompare(b.commitment.due_date || ''));
  overdueDelegations.sort((a, b) => (a.delegation.due_date || '').localeCompare(b.delegation.due_date || ''));

  return { overdueTodos, todayTodos, upcomingTodos, todayReminders, overdueCommitments, overdueDelegations };
}

// ===== PULL LANDING =====
// The daily question — "what do I do next?" — answered as a calm, sparse,
// prioritised list. Cross-project (no per-project grouping). No animation,
// no 3D, no spinning. The molecular landing is the weekly review surface;
// this is the daily one.
//
// Scoring reuses the same recency / urgency helpers as the molecular view
// (molTouchWeight, molReminderWeight, isOverdue) so both surfaces share a
// single underlying urgency model — Pull just renders it as a list.

const PULL_GREETING_BREAKPOINTS = { morning: 5, afternoon: 12, evening: 18 };  // local hours
const PULL_LIST_CAP = 9;
const PULL_DRIFT_CAP = 3;
const PULL_NEGLECTED_NOTE_DAYS = 14;     // notes with linkedTodos untouched ≥ 14d are "neglected threads"

// Heuristic mapping: due-date proximity → score for todos.
// Top of the list = score ≥ ~0.95 (overdue / due today).
function computePullScore(item, kind, proj) {
  const isPinned = (state.data.pinned || []).some(p =>
    p.projectKey === proj.key && p.refId === item.id &&
    (kind === 'todo' ? p.type === 'todo'
     : kind === 'note' ? p.type === 'note'
     : kind === 'reminder' ? p.type === 'reminder' : false));
  const pinBonus = isPinned ? 0.25 : 0;

  if (kind === 'reminder') {
    return molReminderWeight(item) + pinBonus;
  }
  if (kind === 'todo') {
    if (item.dueDate && isOverdue(item.dueDate)) {
      const daysLate = molDaysSince(item.dueDate);
      // Overdue: 1.0 baseline, gentle decay so 60-day-overdue isn't max forever.
      return Math.max(0.7, 1.0 - daysLate / 60) + pinBonus;
    }
    if (item.dueDate) {
      const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
      const dueMid = new Date(item.dueDate); dueMid.setHours(0, 0, 0, 0);
      const daysToDue = (dueMid.getTime() - todayMid.getTime()) / 86400000;
      if (daysToDue <= 0) return 0.95 + pinBonus;     // due today
      if (daysToDue <= 1) return 0.80 + pinBonus;     // due tomorrow
      if (daysToDue <= 3) return 0.60 + pinBonus;     // due in 2–3d
      if (daysToDue <= 7) return 0.35 + pinBonus;     // due this week
    }
    // No due date: only pinned undated todos rise above the cutoff.
    return pinBonus * 2;
  }
  if (kind === 'note') {
    // "Neglected thread": note with linkedTodos that hasn't been updated in
    // PULL_NEGLECTED_NOTE_DAYS+. The more linked todos, the stronger the pull.
    const linkedCount = (item.linkedTodos || []).length;
    const days = molDaysSince(item.updated || item.created);
    if (linkedCount > 0 && days >= PULL_NEGLECTED_NOTE_DAYS) {
      return Math.min(0.7, 0.3 + linkedCount * 0.05 + (days - PULL_NEGLECTED_NOTE_DAYS) / 60) + pinBonus;
    }
    return pinBonus * 2;
  }
  return 0;
}

// Walks every non-archived item in every non-archived project and scores each
// via computePullScore. Returns the flat array of `{kind, item, proj, score}`
// entries. Reusable by the Pull view AND the Overview "Quietly slipping"
// section so neither has to duplicate the iteration / archive-skip logic.
function _walkAllScoredItems() {
  const allItems = [];
  for (const [pkey, proj] of Object.entries(state.data.projects || {})) {
    if (proj.archived) continue;
    const projMeta = { key: pkey, name: proj.name, color: proj.color || '#6366f1' };

    (proj.todos || []).forEach(t => {
      if (t.archived || t.done) return;
      allItems.push({ kind: 'todo', item: t, proj: projMeta, score: computePullScore(t, 'todo', projMeta) });
    });
    (proj.reminders || []).forEach(r => {
      if (r.fired || r.doneAt) return;
      allItems.push({ kind: 'reminder', item: r, proj: projMeta, score: computePullScore(r, 'reminder', projMeta) });
    });
    (proj.notes || []).forEach(n => {
      if (n.archived) return;
      allItems.push({ kind: 'note', item: n, proj: projMeta, score: computePullScore(n, 'note', projMeta) });
    });
  }
  return allItems;
}

// Top-N stalest items across all projects, ranked by inverse touch / reminder
// weight. Optional `excludeIds` is a Set of `${kind}:${item.id}` strings to
// skip — Pull view passes the ids of its pulling list so items don't double-
// show; Overview passes nothing (it has no separate urgency list to dedupe).
function buildSlippingItems(excludeIds = null) {
  const items = _walkAllScoredItems();
  const candidates = excludeIds
    ? items.filter(e => !excludeIds.has(`${e.kind}:${e.item.id}`))
    : items;
  return candidates
    .map(e => ({
      ...e,
      _stale: e.kind === 'reminder'
        ? 1 - molReminderWeight(e.item)
        : 1 - molTouchWeight(e.item)
    }))
    .sort((a, b) => b._stale - a._stale)
    .slice(0, PULL_DRIFT_CAP);
}

function buildPullList() {
  const allItems = _walkAllScoredItems();
  const todayKey = toDateString(new Date());
  const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
  const tomorrowMid = new Date(todayMid); tomorrowMid.setDate(tomorrowMid.getDate() + 1);

  const pulling = allItems.filter(e => {
    // TUNING: revisit thresholds after 1-2 weeks of real usage data.
    if (e.kind === 'todo') return e.score > 0.25;
    return e.score > 0.4;
  });
  pulling.sort((a, b) => b.score - a.score);
  const top = pulling.slice(0, PULL_LIST_CAP);
  const overflowCount = Math.max(0, pulling.length - PULL_LIST_CAP);

  // "Quietly slipping": stalest items not already shown in pulling.
  const topIds = new Set(top.map(e => `${e.kind}:${e.item.id}`));
  const slipping = buildSlippingItems(topIds);

  // Numbers for the state sentence. todayCount = todos due today PLUS
  // reminders firing today, so the line reflects both.
  const remindersToday = allItems.filter(e => {
    if (e.kind !== 'reminder' || !e.item.datetime) return false;
    const d = new Date(e.item.datetime);
    return d >= todayMid && d < tomorrowMid;
  }).length;
  const summary = {
    overdueCount: allItems.filter(e => e.kind === 'todo' && e.item.dueDate && isOverdue(e.item.dueDate)).length,
    todayCount:   allItems.filter(e => e.kind === 'todo' && e.item.dueDate === todayKey).length + remindersToday,
    remindersFiring: allItems.filter(e => e.kind === 'reminder' && molReminderWeight(e.item) >= 0.9).length,
  };

  return { pulling: top, slipping, summary, overflowCount };
}

function pullGreeting() {
  // Returns the bare phrase — caller appends a period.
  const h = new Date().getHours();
  if (h < PULL_GREETING_BREAKPOINTS.afternoon) return 'Good morning';
  if (h < PULL_GREETING_BREAKPOINTS.evening) return 'Good afternoon';
  return 'Good evening';
}

function pullStateSentence(s) {
  const parts = [];
  if (s.overdueCount) parts.push(`${s.overdueCount} thing${s.overdueCount === 1 ? '' : 's'} overdue`);
  if (s.todayCount)   parts.push(`${s.todayCount} due today`);
  if (s.remindersFiring) parts.push(`${s.remindersFiring} reminder${s.remindersFiring === 1 ? '' : 's'} firing`);
  if (parts.length === 0) return 'Nothing urgent — good time to think.';
  return parts.join(', ') + '.';
}

function relativeTimeHint(item, kind) {
  if (kind === 'reminder' && item.datetime) {
    const days = (Date.now() - new Date(item.datetime).getTime()) / 86400000;
    if (days >= 0) return days < 1 ? 'firing now' : `overdue ${Math.floor(days)}d`;
    if (days >= -1) return 'firing today';
    return `in ${Math.ceil(-days)}d`;
  }
  if (kind === 'todo' && item.dueDate) {
    if (isOverdue(item.dueDate)) {
      const days = molDaysSince(item.dueDate);
      return days < 1 ? 'due today' : `overdue ${Math.floor(days)}d`;
    }
    if (item.dueDate === toDateString(new Date())) return 'due today';
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    if (item.dueDate === toDateString(tomorrow)) return 'due tomorrow';
    const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
    const dueMid = new Date(item.dueDate); dueMid.setHours(0, 0, 0, 0);
    const daysToDue = Math.ceil((dueMid - todayMid) / 86400000);
    return `due in ${daysToDue}d`;
  }
  if (kind === 'note') {
    const days = Math.floor(molDaysSince(item.updated || item.created));
    return days >= 1 ? `stale ${days}d` : 'just now';
  }
  return '';
}

function pullRowHTML(entry, idx, total, opts = {}) {
  const icon = entry.kind === 'todo' ? '✓'
            : entry.kind === 'note' ? '◆'
            : entry.kind === 'reminder' ? '🔔' : '·';
  // Visual weight: top item full opacity, last item ~0.55. Linear ramp.
  // Drifting rows fix at 0.7 — they're a deliberate counterweight, not urgent.
  const opacity = opts.isDrift ? 0.7
    : (total <= 1 ? 1 : 1 - (idx / (total - 1)) * 0.45);
  const projForRow = state.data.projects[entry.proj.key];
  const sp = (projForRow?.subprojects || []).find(s => s.id === entry.item.subprojectId);
  const projTag = `<span class="pull-tag">${escapeHTML(entry.proj.name)}${sp ? ' · ' + escapeHTML(sp.name) : ''}</span>`;
  const hint = relativeTimeHint(entry.item, entry.kind);
  return `<button class="pull-row${idx === 0 && !opts.isDrift ? ' pull-row--top' : ''}"
            type="button"
            role="listitem"
            data-pull-kind="${entry.kind}"
            data-pull-project="${escapeHTML(entry.proj.key)}"
            data-pull-id="${escapeHTML(entry.item.id)}"
            style="opacity:${opacity.toFixed(2)}">
    <span class="pull-row-icon" style="color:${entry.proj.color}">${icon}</span>
    <span class="pull-row-body">
      <span class="pull-row-title">${escapeHTML(entry.item.title || '(untitled)')}</span>
      <span class="pull-row-meta">${projTag}<span class="pull-row-hint">${escapeHTML(hint)}</span></span>
    </span>
  </button>`;
}

function renderPull() {
  const { pulling, slipping, summary, overflowCount } = buildPullList();
  const stateLine = pullStateSentence(summary);

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-pull">
      <div class="view-header pull-header">
        <div class="pull-greeting">${escapeHTML(pullGreeting())}.</div>
        <div class="pull-state">${escapeHTML(stateLine)}</div>
        <button type="button" class="pull-shape-link" id="pull-go-universe">
          See the shape of your work →
        </button>
      </div>
      <div class="view-body-scrollable pull-body">
        ${pulling.length === 0 ? '' : `
          <div class="pull-list" role="list">
            ${pulling.map((e, i) => pullRowHTML(e, i, pulling.length)).join('')}
          </div>
          ${overflowCount > 0
            ? `<button type="button" class="pull-overflow-link" id="pull-go-today">+${overflowCount} more in Today →</button>`
            : ''}`}
        ${slipping.length === 0 ? '' : `
          <div class="pull-section pull-slipping">
            <div class="pull-section-title">Quietly slipping</div>
            <div class="pull-list pull-list--drift" role="list">
              ${slipping.map(e => pullRowHTML(e, 0, 1, { isDrift: true })).join('')}
            </div>
          </div>`}
      </div>
    </div>`;

  setupPullViewEvents();
}

// LISTENER HYGIENE: every renderPull() call wipes #content's innerHTML, which
// orphans the previous #view-pull DOM and any listeners on it (eligible for GC).
// We attach a single delegated handler set to the freshly-created #view-pull
// parent — children (.pull-row, #pull-go-universe, #pull-go-today) get their
// events via bubbling. No per-row listeners, no listener stacking on re-render.
// Same pattern the existing Notes / Today views use; matches the Phase A
// audit's pattern (c) "attach to a parent that survives the re-render scope".
function setupPullViewEvents() {
  const root = document.getElementById('view-pull');
  if (!root) return;

  // Touch press feedback. Mouse :active CSS handles itself, but touch users
  // need an explicit class because there's no :hover analog and :active on
  // touch is fleeting. Uses pointer events so it works for both inputs.
  root.addEventListener('pointerdown', (e) => {
    const row = e.target.closest('.pull-row');
    if (row) row.classList.add('pull-row--pressed');
  });
  const clearPressed = () => {
    root.querySelectorAll('.pull-row--pressed').forEach(r => r.classList.remove('pull-row--pressed'));
  };
  root.addEventListener('pointerup', clearPressed);
  root.addEventListener('pointercancel', clearPressed);
  root.addEventListener('pointerleave', clearPressed);

  // Click handles taps, mouse clicks, and keyboard Enter/Space on focused
  // <button>s for free.
  root.addEventListener('click', (e) => {
    const row = e.target.closest('.pull-row');
    if (row) {
      navigateToPullItem(row.dataset.pullKind, row.dataset.pullProject, row.dataset.pullId);
      return;
    }
    if (e.target.closest('#pull-go-universe')) {
      // Reset the molecular focus path so the universe opens at root.
      state.molecular = state.molecular || { focusPath: ['__you'] };
      state.molecular.focusPath = ['__you'];
      try { localStorage.setItem('molFocusPath', JSON.stringify(['__you'])); } catch {}
      showView('molecular');
      return;
    }
    if (e.target.closest('#pull-go-today')) {
      showView('today');
      return;
    }
  });
}

function navigateToPullItem(kind, projectKey, itemId) {
  if (projectKey && projectKey !== state.project) switchProject(projectKey);
  if (kind === 'todo') {
    showView('todos');
  } else if (kind === 'reminder') {
    showView('reminders');
  } else if (kind === 'note') {
    state.editingNote = itemId;
    showView('notes');
  }
}

// ===== MOLECULAR LANDING (3D) =====
// A 3D force-directed knowledge graph of the user's workspace, centered on `[you]`.
// Built with Three.js — drag to rotate the universe, scroll to zoom, click any
// node to open it. Idle auto-rotation makes the graph feel alive.
//
// Architecture:
//   buildMolecularGraph() → { nodes, edges } purely from state.data (no 3D yet)
//   molSimulate3D()       → assigns x/y/z positions via force layout,
//                            seeded with project nodes on a Fibonacci sphere
//   renderMolecular()     → Three.js scene + OrbitControls + raycaster
//   teardownMolecular()   → dispose geometries/materials, cancel RAF, remove listeners

const MOL_TIME_DECAY_DAYS = 30;     // anything older than this drifts to the rim
const MOL_PROJECT_ITEM_LIMIT = 200; // safety cap so a runaway project can't tank the layout
// Label visibility is zoom-driven now (handled in the animation loop), not capped:
// when zoomed in, all labels show; when zoomed out, only the most recent ones do.

const molState = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  raycaster: null,
  mouse: null,
  nodeMeshes: [],          // [{ id, mesh, halo, label3D, type, projectKey, refId, label, weight }]
  edgeLines: [],           // [{ source, target, line, kind, baseColor, baseOpacity }]
  hoveredId: null,
  rafHandle: null,
  resizeHandler: null,
  pointerDownHandler: null,
  pointerMoveHandler: null,
  pointerUpHandler: null,
  pointerCancelHandler: null,
  pointerLeaveHandler: null,
  contextMenuHandler: null,
  loaderRetry: null,
  // Per-frame focus state used by the renderer + animation loop
  focusTags: null,         // Map<id, 'bright' | 'dim' | 'hidden'> from applyFocusFilter
  // Tap-vs-drag detection
  pointer: null,           // { id, x0, y0, t0, moved, type } during an active gesture
  // Auto-rotate management
  autoRotateUserChoice: true, // user's intent — survives touch pauses
  autoRotateResumeTimer: null
};

// ===== MOLECULAR FOCUS PERSISTENCE =====
// Round-trip state.molecular.focusPath through localStorage so reopening the app
// returns the user to the same cluster they were inside.

const MOL_FOCUS_STORAGE_KEY = 'molFocusPath';

function persistMolFocusPath() {
  try {
    localStorage.setItem(MOL_FOCUS_STORAGE_KEY, JSON.stringify(state.molecular.focusPath));
  } catch {}
}

// Read whatever's in localStorage and validate it against current data — projects
// and subprojects can be archived or deleted between sessions, so a stored path
// may point at nodes that no longer exist. Falls back to the deepest valid prefix.
function restoreMolFocusPath() {
  let raw;
  try { raw = localStorage.getItem(MOL_FOCUS_STORAGE_KEY); } catch { return; }
  if (!raw) return;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return; }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed[0] !== '__you') return;

  const validated = ['__you'];
  // Segment 1 should be 'p:KEY' — verify the project exists and isn't archived.
  if (parsed.length >= 2 && typeof parsed[1] === 'string' && parsed[1].startsWith('p:')) {
    const projKey = parsed[1].slice(2);
    const proj = state.data?.projects?.[projKey];
    if (proj && !proj.archived) {
      validated.push(parsed[1]);
      // Segment 2 should be 'sp:ID' — verify the subproject exists on that project.
      if (parsed.length >= 3 && typeof parsed[2] === 'string' && parsed[2].startsWith('sp:')) {
        const spId = parsed[2].slice(3);
        // Special case: the loose bucket has id 'sp:__loose__KEY'.
        if (spId.startsWith('__loose__')) {
          if (spId === '__loose__' + projKey) validated.push(parsed[2]);
        } else {
          const sp = (proj.subprojects || []).find(s => s.id === spId && !s.archived);
          if (sp) validated.push(parsed[2]);
        }
      }
    }
  }
  state.molecular.focusPath = validated;
}

function molDaysSince(iso) {
  if (!iso) return 9999;
  const d = new Date(iso);
  if (isNaN(d)) return 9999;
  return Math.max(0, (Date.now() - d.getTime()) / 86400000);
}

// Recency-weighted score 0..1. 1 = touched today, 0 = older than 30 days.
function molTouchWeight(item) {
  const candidates = [item.completedAt, item.updated, item.created, item.archivedAt].filter(Boolean);
  if (!candidates.length) return 0.05;
  const newest = candidates.map(molDaysSince).reduce((a, b) => Math.min(a, b), 9999);
  return Math.max(0.05, 1 - (newest / MOL_TIME_DECAY_DAYS));
}

// Reminders are weighted by proximity to firing — soon-firing or already-overdue
// reminders are very hot; reminders weeks away cool off toward the rim.
function molReminderWeight(rem) {
  if (!rem.datetime) return 0.05;
  const dt = new Date(rem.datetime);
  if (isNaN(dt)) return 0.05;
  const daysFromNow = (dt.getTime() - Date.now()) / 86400000;
  if (daysFromNow < 0) return 0.95;                                       // overdue/past not-done = very hot
  return Math.max(0.1, 1 - daysFromNow / MOL_TIME_DECAY_DAYS);
}

function buildMolecularGraph() {
  const nodes = [];
  const edges = [];
  const seen = new Set();
  const pushNode = (n) => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };

  // Center: the user, fixed at origin.
  pushNode({ id: '__you', type: 'self', label: 'You', color: getCssVar('--accent') || '#6366f1', weight: 1, fixed: true, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });

  const projects = Object.entries(state.data.projects || {}).filter(([, p]) => !p.archived);

  for (const [key, proj] of projects) {
    const projId = 'p:' + key;
    pushNode({ id: projId, type: 'project', label: proj.name, color: proj.color || '#6366f1', weight: 0.8, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, projectKey: key });
    edges.push({ source: '__you', target: projId, kind: 'primary', restLen: 440 });

    // Pull in todos, notes, and live reminders. Each with its own weight calc so the
    // layout naturally pulls hot items inward and lets cold ones drift to the rim.
    const todoNodes = (proj.todos || [])
      .filter(t => !t.archived && !t.done)
      .map(t => ({ ...t, _w: molTouchWeight(t), _kind: 'todo' }));
    const noteNodes = (proj.notes || [])
      .filter(n => !n.archived)
      .map(n => ({ ...n, _w: molTouchWeight(n), _kind: 'note' }));
    const reminderNodes = (proj.reminders || [])
      .filter(r => !r.doneAt)
      .map(r => ({ ...r, title: r.title || 'Reminder', _w: molReminderWeight(r), _kind: 'reminder' }));
    const items = [...todoNodes, ...noteNodes, ...reminderNodes].sort((a, b) => b._w - a._w).slice(0, MOL_PROJECT_ITEM_LIMIT);

    // Items grouped by subprojectId. Items without a subproject go into a "loose"
    // bucket (only created if the project actually has subprojects to contrast against
    // — otherwise items hang directly off the project).
    const projSubs = (proj.subprojects || []).filter(s => !s.archived);
    const validSpIds = new Set(projSubs.map(s => s.id));
    const itemsBySp = new Map();
    const looseItems = [];
    for (const it of items) {
      if (it.subprojectId && validSpIds.has(it.subprojectId)) {
        if (!itemsBySp.has(it.subprojectId)) itemsBySp.set(it.subprojectId, []);
        itemsBySp.get(it.subprojectId).push(it);
      } else {
        looseItems.push(it);
      }
    }

    // Subproject nodes: one per subproject the project has, sitting between project and items.
    for (const sp of projSubs) {
      const spId = 'sp:' + sp.id;
      pushNode({
        id: spId,
        type: 'subproject',
        label: sp.name || '(untitled)',
        color: sp.color || proj.color || '#6366f1',
        weight: 0.7,
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        projectKey: key,
        refId: sp.id
      });
      edges.push({ source: projId, target: spId, kind: 'primary', restLen: 220 });

      const spItems = itemsBySp.get(sp.id) || [];
      for (const it of spItems) {
        const id = it._kind[0] + ':' + it.id;
        pushNode({
          id,
          type: it._kind,
          label: (it.title || '').slice(0, 60) || '(untitled)',
          color: sp.color || proj.color || '#6366f1',
          weight: it._w,
          x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
          projectKey: key,
          refId: it.id
        });
        edges.push({ source: spId, target: id, kind: 'primary', restLen: 110 + (1 - it._w) * 120 });
      }
    }

    // "Loose" bucket — items without a subproject. Only render this node if the project
    // has subprojects (so it visually contrasts with the grouped items). Otherwise hang
    // items straight off the project to keep the graph clean.
    if (projSubs.length > 0 && looseItems.length > 0) {
      const looseId = 'sp:__loose__' + key;
      pushNode({
        id: looseId,
        type: 'loose',
        label: 'No subproject',
        color: proj.color || '#6366f1',
        weight: 0.4,
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        projectKey: key
      });
      edges.push({ source: projId, target: looseId, kind: 'primary', restLen: 200 });
      for (const it of looseItems) {
        const id = it._kind[0] + ':' + it.id;
        pushNode({
          id,
          type: it._kind,
          label: (it.title || '').slice(0, 60) || '(untitled)',
          color: proj.color || '#6366f1',
          weight: it._w,
          x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
          projectKey: key,
          refId: it.id
        });
        edges.push({ source: looseId, target: id, kind: 'primary', restLen: 110 + (1 - it._w) * 120 });
      }
    } else if (projSubs.length === 0) {
      // No subprojects at all — items hang directly off the project (legacy behaviour).
      for (const it of looseItems) {
        const id = it._kind[0] + ':' + it.id;
        pushNode({
          id,
          type: it._kind,
          label: (it.title || '').slice(0, 60) || '(untitled)',
          color: proj.color || '#6366f1',
          weight: it._w,
          x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
          projectKey: key,
          refId: it.id
        });
        edges.push({ source: projId, target: id, kind: 'primary', restLen: 130 + (1 - it._w) * 140 });
      }
    }
  }

  // Pinned items get an extra direct bond to [you].
  for (const p of (state.data.pinned || [])) {
    if (p.type === 'project') {
      const id = 'p:' + p.projectKey;
      if (seen.has(id)) edges.push({ source: '__you', target: id, kind: 'primary', restLen: 220 });
    } else if (p.type === 'subproject') {
      const id = 'sp:' + p.refId;
      if (seen.has(id)) edges.push({ source: '__you', target: id, kind: 'primary', restLen: 200 });
    } else if (p.type === 'todo' || p.type === 'note') {
      const id = p.type[0] + ':' + p.refId;
      if (seen.has(id)) edges.push({ source: '__you', target: id, kind: 'primary', restLen: 180 });
    }
  }

  // Secondary bonds — @-mention edges.
  for (const [, proj] of projects) {
    for (const note of (proj.notes || [])) {
      if (note.archived) continue;
      const sourceId = 'n:' + note.id;
      if (!seen.has(sourceId)) continue;
      const html = note.content || '';
      const re = /<a[^>]*\bdata-mention-type="([^"]+)"[^>]*\bdata-mention-ref="([^"]+)"/gi;
      let m;
      while ((m = re.exec(html)) !== null) {
        const type = m[1], ref = m[2];
        const prefix = type === 'project' ? 'p:'
                     : type === 'subproject' ? 'sp:'
                     : type[0] + ':';
        const targetId = prefix + ref;
        if (seen.has(targetId) && targetId !== sourceId) {
          edges.push({ source: sourceId, target: targetId, kind: 'secondary', restLen: 130 });
        }
      }
    }
  }

  return { nodes, edges };
}

// 3D force layout. Project nodes seed on a Fibonacci sphere so they distribute
// evenly across the sphere surface, not in a flat ring. Items seed near their
// parent project. Forces: n² repulsion + spring on edges + soft pull toward
// the gravity anchor.
//
// `anchorId` (optional): node id to act as the gravity center. When null,
// gravity pulls toward (0,0,0). When set, the named node is fixed at origin
// and centerPull pulls all others toward (0,0,0) — same vector math, but the
// resulting layout has the focused node at the universe's hot center.
// Used at first render only when state.molecular.focusPath is non-root
// (e.g. user reopens the app while focused on a project).
function molSimulate3D(graph, iterations = 500, anchorId = null) {
  const { nodes, edges } = graph;
  const idx = new Map(nodes.map((n, i) => [n.id, i]));

  // If an anchor is requested, find it; if not, the You node (id '__you') already
  // sits at origin and is fixed, so gravity-toward-origin is gravity-toward-You.
  // For project/subproject anchors, free You from its origin pin and pin the
  // anchor there instead — only one fixed node at a time, otherwise the
  // simulation has two rigid overlapping points and distorts.
  let anchorNode = null;
  if (anchorId && anchorId !== '__you') {
    anchorNode = nodes[idx.get(anchorId)] || null;
    if (anchorNode) {
      const youNode = nodes[idx.get('__you')];
      if (youNode) youNode.fixed = false;
      anchorNode.fixed = true;
      anchorNode.x = 0; anchorNode.y = 0; anchorNode.z = 0;
      anchorNode.vx = 0; anchorNode.vy = 0; anchorNode.vz = 0;
    }
  }

  const projectNodes = nodes.filter(n => n.type === 'project');
  const projectPos = new Map();
  // Fibonacci sphere distribution — golden angle gives near-optimal even spread.
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const ringR = 460;
  projectNodes.forEach((p, i) => {
    const t = projectNodes.length === 1 ? 0.5 : i / (projectNodes.length - 1);
    const y = (1 - 2 * t);                                  // -1 to 1
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = goldenAngle * i;
    p.x = Math.cos(phi) * r * ringR;
    p.y = y * ringR;
    p.z = Math.sin(phi) * r * ringR;
    p.vx = 0; p.vy = 0; p.vz = 0;
    projectPos.set(p.id, { x: p.x, y: p.y, z: p.z });
  });

  // Item nodes seed in a small sphere around their parent project.
  const itemParent = new Map();
  for (const e of edges) {
    if (e.kind !== 'primary') continue;
    const a = nodes[idx.get(e.source)];
    if (a && a.type === 'project') itemParent.set(e.target, a);
  }
  for (const n of nodes) {
    if (n.fixed || n.type === 'project') continue;
    const parent = itemParent.get(n.id);
    const r = 80 + Math.random() * 60;
    // Random direction on the unit sphere.
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const dx = s * Math.cos(a), dy = u, dz = s * Math.sin(a);
    if (parent) {
      n.x = parent.x + dx * r;
      n.y = parent.y + dy * r;
      n.z = parent.z + dz * r;
    } else {
      n.x = dx * 200; n.y = dy * 200; n.z = dz * 200;
    }
    n.vx = 0; n.vy = 0; n.vz = 0;
  }

  // Numbers tuned for graphs with up to ~200 nodes spread across a wide spherical shell.
  const repelStrength = 24000;
  const damping = 0.78;
  const centerPull = 0.0019;
  const minDist2 = 64;

  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (a.fixed) continue;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const d2 = Math.max(minDist2, dx * dx + dy * dy + dz * dz);
        const inv = 1 / Math.sqrt(d2);
        const f = (repelStrength / d2) * 0.001;
        a.vx += dx * inv * f;
        a.vy += dy * inv * f;
        a.vz += dz * inv * f;
      }
    }
    for (const e of edges) {
      const a = nodes[idx.get(e.source)];
      const b = nodes[idx.get(e.target)];
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const d = Math.max(0.1, Math.sqrt(dx * dx + dy * dy + dz * dz));
      const stiffness = e.kind === 'primary' ? 0.04 : 0.014;
      const f = (d - e.restLen) * stiffness;
      const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
      if (!a.fixed) { a.vx += fx; a.vy += fy; a.vz += fz; }
      if (!b.fixed) { b.vx -= fx; b.vy -= fy; b.vz -= fz; }
    }
    for (const n of nodes) {
      if (n.fixed) continue;
      n.vx += -n.x * centerPull;
      n.vy += -n.y * centerPull;
      n.vz += -n.z * centerPull;
      n.vx *= damping; n.vy *= damping; n.vz *= damping;
      n.x += n.vx; n.y += n.vy; n.z += n.vz;
    }
  }
  return graph;
}

// Helper: read a CSS variable from :root so we can pick up the user's accent at runtime.
function getCssVar(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || null;
}

// Resolve any color string Three.js might choke on (CSS var, named, hex) to a hex string.
function resolveColor(c) {
  if (!c) return '#6366f1';
  if (c.startsWith('var(')) {
    const m = c.match(/var\((--[a-z0-9-]+)\)/i);
    if (m) {
      const resolved = getCssVar(m[1]);
      if (resolved) return resolved;
    }
    return '#6366f1';
  }
  return c;
}

// ===== MOLECULAR FOCUS FILTER =====
// Walks the graph and tags each node 'bright' / 'dim' / 'hidden' based on the
// current focusPath. Returns the tag map plus the deepest valid anchorId for
// the simulation to use as a gravity anchor (only at first render).
//
//   ['__you']                  → You + projects bright; everything else hidden.
//   ['__you','p:eh']           → You + project eh + eh's subprojects + eh's loose
//                                + items inside eh's subprojects/loose are bright.
//                                Other projects are dim. Items inside other projects hidden.
//   ['__you','p:eh','sp:q4']   → subproject q4 + its items bright. Project eh and
//                                sibling subprojects dim. Everything else hidden.
function applyFocusFilter(graph, focusPath) {
  const tags = new Map();
  const set = (id, t) => tags.set(id, t);
  const nodes = graph.nodes;
  const edges = graph.edges;

  // Build a quick parent lookup: child id → parent id (via primary edges).
  const primaryParent = new Map();
  for (const e of edges) {
    if (e.kind === 'primary') primaryParent.set(e.target, e.source);
  }

  const depth = focusPath.length;
  // Default everything hidden, then promote what should be visible.
  for (const n of nodes) set(n.id, 'hidden');

  if (depth === 1) {
    // Root: You + every project node bright; rest hidden.
    set('__you', 'bright');
    for (const n of nodes) {
      if (n.type === 'project') set(n.id, 'bright');
    }
  } else if (depth === 2) {
    // Project focus: focused project + its subprojects/loose + their items bright.
    // Other projects dim, everything else hidden.
    const focusedProjId = focusPath[1];
    set('__you', 'bright');
    set(focusedProjId, 'bright');
    for (const n of nodes) {
      if (n.type === 'project') {
        if (n.id !== focusedProjId) set(n.id, 'dim');
      } else if (n.type === 'subproject' || n.type === 'loose') {
        if (primaryParent.get(n.id) === focusedProjId) set(n.id, 'bright');
      } else if (n.type === 'todo' || n.type === 'note' || n.type === 'reminder') {
        // Items hang off either a subproject/loose (which hangs off the project)
        // or directly off the project (when the project has no subprojects).
        const parent = primaryParent.get(n.id);
        if (!parent) continue;
        if (parent === focusedProjId) {
          set(n.id, 'bright');
        } else {
          // Parent is a subproject/loose — check if its parent is the focused project.
          const grandparent = primaryParent.get(parent);
          if (grandparent === focusedProjId) set(n.id, 'bright');
        }
      }
    }
  } else if (depth >= 3) {
    // Subproject focus: focused subproject + its items bright. Project + sibling
    // subprojects dim. Everything else hidden.
    const focusedProjId = focusPath[1];
    const focusedSubId = focusPath[2];
    set(focusedSubId, 'bright');
    set(focusedProjId, 'dim');
    set('__you', 'dim');
    for (const n of nodes) {
      if ((n.type === 'subproject' || n.type === 'loose') && primaryParent.get(n.id) === focusedProjId && n.id !== focusedSubId) {
        set(n.id, 'dim');
      } else if (n.type === 'todo' || n.type === 'note' || n.type === 'reminder') {
        if (primaryParent.get(n.id) === focusedSubId) set(n.id, 'bright');
      }
    }
  }

  // Resolve the gravity anchor for the simulation. Deepest segment wins, but if
  // it points at a node that doesn't exist (subproject was removed mid-session,
  // graph dropped it under some condition, etc.), fall back to the parent.
  const idsInGraph = new Set(nodes.map(n => n.id));
  let anchorId = null;
  for (let i = focusPath.length - 1; i >= 0; i--) {
    if (idsInGraph.has(focusPath[i])) { anchorId = focusPath[i]; break; }
  }
  if (!anchorId) anchorId = '__you';

  return { tags, anchorId };
}

// Smooth camera fly-to. OrbitControls' `target` is the orbit center; we lerp it
// AND camera.position toward the new spot, preserving the camera's offset
// direction so the user keeps their orientation.
function flyCameraTo(targetPos, distance, ms = 600) {
  const camera = molState.camera;
  const controls = molState.controls;
  if (!camera || !controls) return;
  const startTarget = controls.target.clone();
  const startCam = camera.position.clone();
  const endTarget = targetPos.clone();
  // Preserve current viewing direction; if the camera is currently sitting on top
  // of the target (degenerate), use the world-Y axis as a fallback.
  let dir = startCam.clone().sub(startTarget);
  if (dir.lengthSq() < 0.0001) dir = new window.THREE.Vector3(0, 0.2, 1);
  dir.normalize();
  const endCam = endTarget.clone().add(dir.multiplyScalar(distance));
  const t0 = performance.now();
  const tick = () => {
    const t = Math.min(1, (performance.now() - t0) / ms);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
    controls.target.lerpVectors(startTarget, endTarget, e);
    camera.position.lerpVectors(startCam, endCam, e);
    controls.update();
    if (t < 1 && state.view === 'molecular') requestAnimationFrame(tick);
  };
  tick();
}

// Per-focus-level camera distance (orbit radius from the focus node).
function molFocusDistance(depth) {
  if (depth <= 1) return 1200;
  if (depth === 2) return 600;
  return 300;
}

// Push a node id onto the focus stack. Validates that the push is legal
// (project at root, subproject at project, no deeper). Persists + applies.
function pushMolFocus(nodeId) {
  if (!molState.scene) return;
  const path = state.molecular.focusPath;
  // Defend against duplicate pushes.
  if (path[path.length - 1] === nodeId) return;
  // Cap at depth 3.
  const newPath = (path.length >= 3 ? path.slice(0, 2) : path.slice()).concat(nodeId);
  state.molecular.focusPath = newPath;
  persistMolFocusPath();
  applyFocusToScene();
}

// Truncate the focus stack to a given segment index (0 = root). Persist + apply.
function popMolFocusTo(index) {
  if (!molState.scene) return;
  const path = state.molecular.focusPath;
  const targetIdx = Math.max(0, Math.min(path.length - 1, index));
  if (targetIdx === path.length - 1) return; // already there
  state.molecular.focusPath = path.slice(0, targetIdx + 1);
  persistMolFocusPath();
  applyFocusToScene();
}

// Re-apply the current focus path to the existing scene without re-running the
// simulation. Updates: visibility tags on every node mesh + halo + label,
// edge opacity, camera fly-to, autorotate level, and the breadcrumb DOM.
function applyFocusToScene() {
  if (!molState.scene) return;
  const graph = { nodes: molState.nodeMeshes.map(nm => ({ id: nm.id, type: nm.type })),
                  edges: molState.edgeLines.map(e => ({ source: e.source, target: e.target, kind: e.kind })) };
  const { tags, anchorId } = applyFocusFilter(graph, state.molecular.focusPath);
  molState.focusTags = tags;

  // Apply tags to every node's mesh / halo / label.
  for (const nm of molState.nodeMeshes) {
    const tag = tags.get(nm.id) || 'hidden';
    if (tag === 'hidden') {
      nm.mesh.visible = false;
      if (nm.halo) nm.halo.visible = false;
      if (nm.label3D) nm.label3D.visible = false;
    } else if (tag === 'dim') {
      nm.mesh.visible = true;
      nm.mesh.material.transparent = true;
      nm.mesh.material.opacity = 0.18;
      if (nm.halo) nm.halo.visible = false;
      if (nm.label3D) { nm.label3D.visible = false; }
    } else { // bright
      nm.mesh.visible = true;
      nm.mesh.material.transparent = false;
      nm.mesh.material.opacity = 1;
      if (nm.halo) nm.halo.visible = true;
      if (nm.label3D) nm.label3D.visible = true; // animate-loop will set per-distance opacity
    }
  }

  // Apply tags to edges.
  for (const e of molState.edgeLines) {
    const sTag = tags.get(e.source) || 'hidden';
    const tTag = tags.get(e.target) || 'hidden';
    // Worst tag wins: bright > dim > hidden.
    const worst = (sTag === 'hidden' || tTag === 'hidden') ? 'hidden'
                : (sTag === 'dim' || tTag === 'dim') ? 'dim' : 'bright';
    if (worst === 'hidden') { e.line.visible = false; }
    else if (worst === 'dim') { e.line.visible = true; e.line.material.opacity = 0.05; }
    else { e.line.visible = true; e.line.material.opacity = e.baseOpacity; }
  }

  // Fly the camera to the anchor's current position.
  const anchorNm = molState.nodeMeshes.find(nm => nm.id === anchorId);
  const anchorPos = anchorNm ? anchorNm.mesh.position : new window.THREE.Vector3(0, 0, 0);
  flyCameraTo(anchorPos, molFocusDistance(state.molecular.focusPath.length));

  // Auto-rotate: on at root + project levels (when user hasn't manually toggled it
  // off), off at subproject level.
  const depth = state.molecular.focusPath.length;
  if (molState.controls) {
    if (depth >= 3) {
      molState.controls.autoRotate = false;
    } else if (molState.autoRotateUserChoice && !molState.pointer) {
      molState.controls.autoRotate = true;
    }
  }

  // Re-render the breadcrumb chrome (cheap DOM swap, no full view re-render).
  rebuildMolBreadcrumbDOM();
}

// Resolve a focusPath segment id to its display label. Used by the breadcrumb.
function molLabelFor(id) {
  if (id === '__you') return 'You';
  if (id.startsWith('p:')) {
    const proj = state.data?.projects?.[id.slice(2)];
    return proj ? (proj.name || '(project)') : '(project)';
  }
  if (id.startsWith('sp:')) {
    const spId = id.slice(3);
    if (spId.startsWith('__loose__')) return 'No subproject';
    for (const proj of Object.values(state.data?.projects || {})) {
      const sp = (proj.subprojects || []).find(s => s.id === spId);
      if (sp) return sp.name || '(subproject)';
    }
    return '(subproject)';
  }
  return id;
}

// Re-render the breadcrumb chrome in-place (no full view re-render). Each
// non-final segment is a tappable button; the final segment is plain text.
function rebuildMolBreadcrumbDOM() {
  const host = document.getElementById('mol-breadcrumb');
  if (!host) return;
  const path = state.molecular.focusPath;
  const lastIdx = path.length - 1;
  host.innerHTML = path.map((id, i) => {
    const label = escapeHTML(molLabelFor(id));
    if (i < lastIdx) {
      return `<button class="mol-bc-btn" type="button" data-mol-focus-index="${i}" aria-label="Pop focus to ${label}">${i === 0 ? '⌂ ' : ''}${label}</button>` +
             `<span class="mol-bc-sep" aria-hidden="true">›</span>`;
    }
    return `<span class="mol-bc-current">${i === 0 ? '⌂ ' : ''}${label}</span>`;
  }).join('');
  // Wire each breadcrumb segment to popMolFocusTo. We use click here (works
  // for mouse + tap once `touch-action: manipulation` is in place via CSS).
  host.querySelectorAll('[data-mol-focus-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      popMolFocusTo(parseInt(btn.dataset.molFocusIndex, 10));
    });
  });
}

function renderMolecular() {
  // Three.js loads as an ES module and is deferred — if we get here before it's ready,
  // show a tiny loading state and retry once the global appears.
  if (!window.THREE || !window.THREE_OrbitControls) {
    document.getElementById('content').innerHTML = `
      <div class="view active" id="view-molecular">
        <div class="mol-loading">
          <div class="mol-loading-orb"></div>
          <div class="mol-loading-msg">Loading 3D engine…</div>
        </div>
      </div>`;
    if (molState.loaderRetry) clearTimeout(molState.loaderRetry);
    molState.loaderRetry = setTimeout(() => renderMolecular(), 150);
    return;
  }
  if (molState.loaderRetry) { clearTimeout(molState.loaderRetry); molState.loaderRetry = null; }

  teardownMolecular();

  // Restore the persisted focusPath from the last session and validate it
  // against current data. Validation strips segments pointing at projects /
  // subprojects that have been removed or archived since the user last
  // looked at the universe.
  if (!Array.isArray(state.molecular.focusPath) || state.molecular.focusPath[0] !== '__you') {
    state.molecular.focusPath = ['__you'];
  }
  restoreMolFocusPath();

  const graph = buildMolecularGraph();

  // Compute the focus filter once (derives the gravity anchor for the sim) and
  // again later for visibility tags after the scene is built.
  const initialFilter = applyFocusFilter(graph, state.molecular.focusPath);

  // Simulate with anchor only when restoring a non-root focus — otherwise the
  // default origin gravity (You at center) is what we want.
  molSimulate3D(graph, 500, initialFilter.anchorId);

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-molecular">
      <div class="mol-toolbar">
        <div class="mol-title">⚛ <strong>Your universe</strong> · ${graph.nodes.length - 1} nodes · ${graph.edges.length} bonds</div>
        <div class="mol-breadcrumb" id="mol-breadcrumb" role="navigation" aria-label="Molecular focus"></div>
        <div class="mol-legend" title="Node shape by item type">
          <span class="mol-legend-item"><span class="mol-legend-dot mol-legend-subproject"></span>subproject</span>
          <span class="mol-legend-item"><span class="mol-legend-dot mol-legend-todo"></span>todo</span>
          <span class="mol-legend-item"><span class="mol-legend-dot mol-legend-note"></span>note</span>
          <span class="mol-legend-item"><span class="mol-legend-dot mol-legend-reminder"></span>reminder</span>
        </div>
        <div class="mol-toolbar-actions">
          <button class="btn btn-ghost btn-sm" id="mol-toggle-rotate" title="Toggle auto-rotate">↻ Spin</button>
          <button class="btn btn-ghost btn-sm" id="mol-fit" title="Reset camera">Reset</button>
          <button class="btn btn-ghost btn-sm" id="mol-refresh" title="Re-run layout">⟳</button>
        </div>
      </div>
      <div class="mol-canvas-wrap" id="mol-canvas-wrap">
        <div class="mol-hover-label" id="mol-hover-label" hidden></div>
        <div class="mol-hint">Drag to rotate · scroll to zoom · tap a node to drill in</div>
      </div>
    </div>`;

  setupMolecularThree(graph);
  // After scene is built, apply the focus filter so dim/hidden tags are reflected
  // in mesh visibility and the camera flies to the anchor. This also paints the
  // breadcrumb chrome.
  applyFocusToScene();
}

function setupMolecularThree(graph) {
  const wrap = document.getElementById('mol-canvas-wrap');
  if (!wrap) return;
  const w = Math.max(300, wrap.clientWidth);
  const h = Math.max(300, wrap.clientHeight);

  const THREE = window.THREE;
  const OrbitControls = window.THREE_OrbitControls;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07070d);
  scene.fog = new THREE.FogExp2(0x07070d, 0.0008);

  const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 6000);
  camera.position.set(0, 140, 1200);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(w, h);
  renderer.domElement.classList.add('mol-canvas');
  wrap.insertBefore(renderer.domElement, wrap.firstChild);

  // Lighting — ambient base + a glowing point light at the user's position.
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const accentHex = resolveColor(getCssVar('--accent') || '#6366f1');
  const youLight = new THREE.PointLight(new THREE.Color(accentHex), 2.2, 1200, 1.4);
  youLight.position.set(0, 0, 0);
  scene.add(youLight);

  // Distant starfield — adds depth and the "universe" feel.
  const starGeo = new THREE.BufferGeometry();
  const starCount = 1200;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 1400 + Math.random() * 1200;
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    positions[i * 3]     = s * Math.cos(phi) * r;
    positions[i * 3 + 1] = u * r;
    positions[i * 3 + 2] = s * Math.sin(phi) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0.55 });
  scene.add(new THREE.Points(starGeo, starMat));

  // Node spheres + halo for the larger ones.
  for (const n of graph.nodes) {
    const isYou = n.id === '__you';
    const isProject = n.type === 'project';
    const isSubproject = n.type === 'subproject' || n.type === 'loose';
    const r = isYou ? 26
            : isProject ? 16
            : isSubproject ? 11
            : (5 + n.weight * 6.5);
    const colorHex = resolveColor(n.color);
    const color = new THREE.Color(colorHex);

    const geo = (isYou || isProject) ? new THREE.SphereGeometry(r, 28, 22) : makeNodeGeometry(n.type, r);
    // Per-type material: notes are matter (paper), reminders pulse hot (alarm),
    // subprojects sit in the middle (container), loose is muted (the "rest").
    const matOpts = { color, emissive: color, roughness: 0.5, metalness: 0.1 };
    if (isYou) {
      // Drop emissive on You — bright basic + halo + light source already do the work.
    } else if (isProject) {
      matOpts.emissiveIntensity = 0.55;
    } else if (n.type === 'subproject') {
      matOpts.emissiveIntensity = 0.4;
      matOpts.roughness = 0.4;
    } else if (n.type === 'loose') {
      // Loose bucket: dim, no glow, washed out — visually a placeholder, not a real container.
      matOpts.emissiveIntensity = 0.05;
      matOpts.roughness = 0.85;
      matOpts.color = new THREE.Color(0x6b7280);
      matOpts.emissive = new THREE.Color(0x6b7280);
    } else if (n.type === 'note') {
      matOpts.emissiveIntensity = 0.18;
      matOpts.roughness = 0.65;
    } else if (n.type === 'reminder') {
      matOpts.emissiveIntensity = 0.5;
      matOpts.roughness = 0.35;
    } else {                                                         // todo
      matOpts.emissiveIntensity = 0.32;
    }
    const mat = isYou
      ? new THREE.MeshBasicMaterial({ color })
      : new THREE.MeshStandardMaterial(matOpts);
    const mesh = new THREE.Mesh(geo, mat);
    // Slow rotation on non-spheres so the facets catch light differently — adds life
    // and reinforces the shape distinction at a glance. Subproject/loose cubes spin slow.
    if (!isYou && !isProject) {
      const baseRate = n.type === 'reminder' ? 0.6
                     : n.type === 'subproject' ? 0.2
                     : n.type === 'loose' ? 0.15
                     : 0.25;
      mesh.userData.spinRate = baseRate + Math.random() * 0.2;
      mesh.userData.spinAxis = new THREE.Vector3(Math.random() - 0.5, 1, Math.random() - 0.5).normalize();
    }
    mesh.position.set(n.x, n.y, n.z);
    mesh.userData = { id: n.id, type: n.type, projectKey: n.projectKey, refId: n.refId, label: n.label };
    scene.add(mesh);

    // Halo: a slightly larger inverted sphere with a soft transparent material gives the glow effect.
    // Skip on loose buckets (they shouldn't grab attention) and items (too noisy with many of them).
    let halo = null;
    if (isYou || isProject || n.type === 'subproject') {
      const haloScale = isYou ? 2.4 : isProject ? 1.7 : 1.5;
      const haloOpacity = isYou ? 0.18 : isProject ? 0.13 : 0.09;
      const haloGeo = new THREE.SphereGeometry(r * haloScale, 20, 16);
      const haloMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: haloOpacity, side: THREE.BackSide, depthWrite: false });
      halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(mesh.position);
      scene.add(halo);
    }

    // Every node except [you] gets a canvas-textured sprite label.
    //   project + subproject + loose → always visible (they're the "anchors")
    //   todo / note / reminder       → fade in/out by camera distance (handled in animate loop)
    let label3D = null;
    if (!isYou) {
      const isAnchor = isProject || n.type === 'subproject' || n.type === 'loose';
      const truncated = isAnchor ? n.label : (n.label.length > 36 ? n.label.slice(0, 35) + '…' : n.label);
      label3D = makeLabelSprite(truncated, colorHex, isAnchor ? 'project' : 'item');
      label3D.position.copy(mesh.position);
      label3D.position.y += r + (isAnchor ? 14 : 8);
      // Item labels start hidden; the animation loop fades them in/out per camera distance.
      if (!isAnchor) label3D.material.opacity = 0;
      scene.add(label3D);
    }

    molState.nodeMeshes.push({ id: n.id, mesh, halo, label3D, type: n.type, projectKey: n.projectKey, refId: n.refId, label: n.label, weight: n.weight, baseRadius: r, baseColor: color.clone() });
  }

  // Edges: thin lines, opacity by kind. Hover dims the rest.
  for (const e of graph.edges) {
    const a = graph.nodes.find(n => n.id === e.source);
    const b = graph.nodes.find(n => n.id === e.target);
    if (!a || !b) continue;
    const isPrimary = e.kind === 'primary';
    const colorHex = isPrimary ? resolveColor(b.color || a.color || '#6366f1') : '#6b7280';
    const baseOpacity = isPrimary ? 0.55 : 0.22;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(a.x, a.y, a.z),
      new THREE.Vector3(b.x, b.y, b.z)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(colorHex), transparent: true, opacity: baseOpacity });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    molState.edgeLines.push({ source: e.source, target: e.target, line, kind: e.kind, baseColor: new THREE.Color(colorHex), baseOpacity });
  }

  // OrbitControls — drag to rotate, scroll to zoom, right-drag (or two-finger) to pan.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotate = molState.autoRotateUserChoice;
  controls.autoRotateSpeed = 0.35;
  controls.minDistance = 200;
  controls.maxDistance = 2000;
  controls.enablePan = true;
  // Touch gestures: one finger rotates the universe, two fingers pinch-zoom + pan.
  // Without this explicit map, OrbitControls' touch defaults are inconsistent
  // across versions. THREE.TOUCH.* enums are: ROTATE = 0, PAN = 1, DOLLY_PAN = 2,
  // DOLLY_ROTATE = 3.
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  };

  // Raycaster for hover/click.
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Animation loop.
  let lastTime = performance.now();
  const animate = () => {
    molState.rafHandle = requestAnimationFrame(animate);
    const t = performance.now();
    const dt = (t - lastTime) * 0.001;
    lastTime = t;
    controls.update();

    // Camera distance from origin (= roughly how zoomed-out we are). OrbitControls'
    // target is (0,0,0), so position.length() is the orbit radius.
    const camDist = camera.position.length();
    // At camDist <= 500: all item labels fully visible.
    // At camDist >= 1700: only the very hottest items barely visible.
    // Linear remap → threshold weight required to be visible at the current zoom.
    const visMin = 500, visMax = 1700;
    const tNorm = Math.max(0, Math.min(1, (camDist - visMin) / (visMax - visMin)));

    const focusTags = molState.focusTags;
    for (const nm of molState.nodeMeshes) {
      // Skip nodes that the focus filter has hidden — no need to spin or bob
      // off-screen geometry, and we'd just thrash visibility flags otherwise.
      const focusTag = focusTags ? focusTags.get(nm.id) : 'bright';
      if (focusTag === 'hidden') continue;

      // Subtle bobbing on item-level nodes (skip projects/you so they stay anchored).
      if (nm.id !== '__you' && nm.type !== 'project') {
        const phase = (nm.id.charCodeAt(2) || 0) + (nm.id.charCodeAt(3) || 0);
        nm.mesh.position.y += Math.sin((t + phase * 90) * 0.0009) * 0.04;
        // Spin non-sphere shapes so their facets catch the light from different angles.
        const spinRate = nm.mesh.userData.spinRate;
        const spinAxis = nm.mesh.userData.spinAxis;
        if (spinRate && spinAxis) {
          nm.mesh.rotateOnAxis(spinAxis, dt * spinRate);
        }
      }
      // Item label opacity: heavy (recent) items fight through more zoom-out.
      // Each item has weight 0..1; show it when weight > tNorm, with a soft fade band.
      // Skip anchors (project/subproject/loose) — those are always visible.
      // Skip dim items — applyFocusToScene already set their label visible=false.
      const isAnchorType = nm.type === 'project' || nm.type === 'subproject' || nm.type === 'loose';
      if (nm.label3D && !isAnchorType && nm.id !== '__you' && focusTag === 'bright') {
        // If hovered, override and force full opacity for the hovered node + neighbours.
        let opacity;
        if (molState.hoveredId) {
          const involved = molState.hoveredId === nm.id || molState.edgeLines.some(e =>
            (e.source === molState.hoveredId && e.target === nm.id) ||
            (e.target === molState.hoveredId && e.source === nm.id));
          opacity = involved ? 1 : 0;
        } else {
          const fade = (nm.weight - tNorm) / 0.18;       // 0.18 = fade band width
          opacity = Math.max(0, Math.min(1, fade));
        }
        nm.label3D.material.opacity = opacity;
        nm.label3D.visible = opacity > 0.02;
      }
    }

    renderer.render(scene, camera);
  };
  animate();

  // Hover + tap detection via pointer events. Pointer events unify mouse,
  // pen, and touch under one event model — and OrbitControls captures the
  // gesture for rotation/zoom independently. We layer our hover/tap on top.
  //
  // Tap-vs-drag: track movement + duration on pointerdown→pointerup. If
  // movement > TAP_MOVE_PX or duration > TAP_TIME_MS, treat as a drag and
  // skip navigation. This prevents OrbitControls' touch-rotate from
  // accidentally firing the click handler.
  const TAP_MOVE_PX = 6;
  const TAP_TIME_MS = 300;
  const AUTOROTATE_RESUME_MS = 3000;

  const hoverLabel = document.getElementById('mol-hover-label');

  // Filter the raycaster to only bright-tagged meshes — dimmed/hidden nodes
  // shouldn't be tappable or hoverable.
  const pickAt = (clientX, clientY) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const tags = molState.focusTags;
    const meshes = molState.nodeMeshes
      .filter(nm => !tags || tags.get(nm.id) === 'bright')
      .map(nm => nm.mesh);
    const intersects = raycaster.intersectObjects(meshes);
    return intersects.length ? { hit: intersects[0].object.userData, rect } : { hit: null, rect };
  };

  const updateHover = (hit, rect, clientX, clientY) => {
    if (hit) {
      if (molState.hoveredId !== hit.id) {
        molState.hoveredId = hit.id;
        applyHoverHighlight();
      }
      if (hoverLabel) {
        hoverLabel.textContent = hit.label || '';
        hoverLabel.style.left = (clientX - rect.left + 14) + 'px';
        hoverLabel.style.top  = (clientY - rect.top + 14) + 'px';
        hoverLabel.hidden = false;
      }
      renderer.domElement.style.cursor = 'pointer';
    } else {
      if (molState.hoveredId !== null) {
        molState.hoveredId = null;
        applyHoverHighlight();
      }
      if (hoverLabel) hoverLabel.hidden = true;
      renderer.domElement.style.cursor = '';
    }
  };

  // Drill the focus path one level deeper. Items at subproject focus level
  // are no-ops in Phase A — Phase D will handle the side panel.
  const dispatchTapTarget = (nm) => {
    if (!nm) return;
    const depth = state.molecular.focusPath.length;
    if (depth === 1 && nm.type === 'project') {
      pushMolFocus('p:' + nm.projectKey);
    } else if (depth === 2 && (nm.type === 'subproject' || nm.type === 'loose')) {
      // Subproject id is sp:ID; loose bucket id is sp:__loose__KEY.
      const id = nm.type === 'loose' ? 'sp:__loose__' + nm.projectKey : 'sp:' + nm.refId;
      pushMolFocus(id);
    }
    // depth === 3 (subproject focus): tapping items is a Phase D concern.
  };

  const scheduleAutoRotateResume = () => {
    if (molState.autoRotateResumeTimer) clearTimeout(molState.autoRotateResumeTimer);
    molState.autoRotateResumeTimer = setTimeout(() => {
      molState.autoRotateResumeTimer = null;
      if (molState.pointer) return;             // still touching
      if (state.view !== 'molecular') return;
      const depth = state.molecular.focusPath.length;
      if (depth >= 3) return;                   // subproject level: stay paused
      if (molState.controls && molState.autoRotateUserChoice) {
        molState.controls.autoRotate = true;
      }
    }, AUTOROTATE_RESUME_MS);
  };

  const onPointerDown = (e) => {
    molState.pointer = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: Date.now(), moved: 0, type: e.pointerType };
    // Pause auto-rotate while a touch is in progress; we'll resume after release + idle.
    if (molState.autoRotateResumeTimer) {
      clearTimeout(molState.autoRotateResumeTimer);
      molState.autoRotateResumeTimer = null;
    }
    if (molState.controls) molState.controls.autoRotate = false;
  };
  const onPointerMove = (e) => {
    // Mouse-only hover. Touch doesn't have a hover semantic — we don't want
    // a swipe to spam hover updates and re-rendering.
    if (e.pointerType === 'mouse' && (!molState.pointer || molState.pointer.type === 'mouse')) {
      const { hit, rect } = pickAt(e.clientX, e.clientY);
      updateHover(hit, rect, e.clientX, e.clientY);
    }
    if (molState.pointer && e.pointerId === molState.pointer.id) {
      const dx = e.clientX - molState.pointer.x0;
      const dy = e.clientY - molState.pointer.y0;
      molState.pointer.moved = Math.max(molState.pointer.moved, Math.sqrt(dx*dx + dy*dy));
    }
  };
  const onPointerUp = (e) => {
    const p = molState.pointer;
    molState.pointer = null;
    scheduleAutoRotateResume();
    if (!p || e.pointerId !== p.id) return;
    const dt = Date.now() - p.t0;
    const isTap = p.moved <= TAP_MOVE_PX && dt <= TAP_TIME_MS;
    if (!isTap) return;
    // Resolve the tapped node by raycasting at the current pointer position.
    // For touch, hover state is unreliable — always re-pick on tap.
    const { hit } = pickAt(e.clientX, e.clientY);
    if (!hit) return;
    const nm = molState.nodeMeshes.find(x => x.id === hit.id);
    dispatchTapTarget(nm);
  };
  const onPointerCancel = () => {
    molState.pointer = null;
    scheduleAutoRotateResume();
  };
  const onPointerLeave = () => {
    if (molState.hoveredId !== null) { molState.hoveredId = null; applyHoverHighlight(); }
    if (hoverLabel) hoverLabel.hidden = true;
  };
  // Held finger / right click on the canvas should NOT pop the system context
  // menu — users expect a long press to do nothing visible (or to be a future
  // gesture).
  const onContextMenu = (e) => { e.preventDefault(); };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerCancel);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);
  renderer.domElement.addEventListener('contextmenu', onContextMenu);
  molState.pointerDownHandler = onPointerDown;
  molState.pointerMoveHandler = onPointerMove;
  molState.pointerUpHandler = onPointerUp;
  molState.pointerCancelHandler = onPointerCancel;
  molState.pointerLeaveHandler = onPointerLeave;
  molState.contextMenuHandler = onContextMenu;

  // Resize handler so the canvas tracks the panel size.
  const onResize = () => {
    if (!wrap || !renderer) return;
    const ww = Math.max(300, wrap.clientWidth);
    const hh = Math.max(300, wrap.clientHeight);
    camera.aspect = ww / hh;
    camera.updateProjectionMatrix();
    renderer.setSize(ww, hh);
  };
  window.addEventListener('resize', onResize);
  molState.resizeHandler = onResize;

  // Toolbar. Reset pops focus all the way out and flies back to the home view.
  document.getElementById('mol-fit')?.addEventListener('click', () => {
    if (state.molecular.focusPath.length > 1) {
      popMolFocusTo(0);
    } else {
      // Already at root — just re-center the camera if the user has dragged it.
      camera.position.set(0, 140, 1200);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  });
  document.getElementById('mol-refresh')?.addEventListener('click', () => renderMolecular());
  document.getElementById('mol-toggle-rotate')?.addEventListener('click', (e) => {
    // The user's intent toggles independently of the auto-pause-on-touch state.
    molState.autoRotateUserChoice = !molState.autoRotateUserChoice;
    // Apply immediately if we're not deeper than project level (subproject focus
    // forces autorotate off).
    const depth = state.molecular.focusPath.length;
    controls.autoRotate = molState.autoRotateUserChoice && depth < 3 && !molState.pointer;
    e.currentTarget.classList.toggle('on', molState.autoRotateUserChoice);
  });

  molState.scene = scene;
  molState.camera = camera;
  molState.renderer = renderer;
  molState.controls = controls;
  molState.raycaster = raycaster;
  molState.mouse = mouse;
}

// Different node types get different geometries so the user can tell them apart at a glance:
//   todo       → sphere       (round, action atom)
//   note       → octahedron   (8-sided, paper-fold / crystal feel)
//   reminder   → tetrahedron  (pointy, "alarm" silhouette)
//   subproject → cube         (container of items)
//   loose      → cube (dim)   (the "no subproject" bucket — same shape, faded look)
//   project    → sphere       (large, with halo)
//   self       → sphere       (largest, glowing)
function makeNodeGeometry(type, r) {
  const THREE = window.THREE;
  if (type === 'note')       return new THREE.OctahedronGeometry(r, 0);
  if (type === 'reminder')   return new THREE.TetrahedronGeometry(r * 1.15, 0);
  if (type === 'subproject' || type === 'loose') return new THREE.BoxGeometry(r * 1.5, r * 1.5, r * 1.5);
  return new THREE.SphereGeometry(r, 28, 22);
}

// Build a sprite with text baked into a canvas texture. Sprites always face the camera,
// so labels stay readable as the universe rotates. Two visual variants:
//   variant='project'  → bigger bold text with a colored glow halo, always visible
//   variant='item'     → smaller, soft-grey text, opacity zoom-driven by the renderer
function makeLabelSprite(text, colorHex, variant = 'project') {
  const THREE = window.THREE;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const isProject = variant === 'project';
  const fontSize = isProject ? 48 : 32;
  const fontWeight = isProject ? 600 : 500;
  const padding = isProject ? 16 : 10;
  const fontStr = `${fontWeight} ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.font = fontStr;
  const metrics = ctx.measureText(text);
  canvas.width = Math.ceil(metrics.width + padding * 2);
  canvas.height = fontSize + padding * 2;
  // Re-set font after canvas resize (resizing clears state).
  ctx.font = fontStr;
  ctx.fillStyle = isProject ? 'rgba(255,255,255,0.96)' : 'rgba(220,225,235,0.92)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (isProject) {
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 18;
  } else {
    // Subtle dark stroke under item labels so they stay legible against bright nodes.
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeText(text, padding, canvas.height / 2);
  }
  ctx.fillText(text, padding, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  // Sprite size: width / height in world units. Smaller multiplier = more readable at distance.
  const mult = isProject ? 0.18 : 0.13;
  sprite.scale.set(canvas.width * mult, canvas.height * mult, 1);
  return sprite;
}

// Dim everything not connected to the hovered node, restore on un-hover.
function applyHoverHighlight() {
  const id = molState.hoveredId;
  if (!id) {
    for (const nm of molState.nodeMeshes) {
      nm.mesh.material.opacity = 1;
      if (nm.mesh.material.transparent !== undefined) nm.mesh.material.transparent = false;
      if (nm.halo) nm.halo.visible = true;
    }
    for (const e of molState.edgeLines) {
      e.line.material.opacity = e.baseOpacity;
    }
    return;
  }
  const involvedIds = new Set([id]);
  for (const e of molState.edgeLines) {
    if (e.source === id) involvedIds.add(e.target);
    if (e.target === id) involvedIds.add(e.source);
  }
  for (const nm of molState.nodeMeshes) {
    const involved = involvedIds.has(nm.id);
    if (!involved) {
      nm.mesh.material.transparent = true;
      nm.mesh.material.opacity = 0.18;
      if (nm.halo) nm.halo.visible = false;
    } else {
      nm.mesh.material.opacity = 1;
      if (nm.halo) nm.halo.visible = true;
    }
  }
  for (const e of molState.edgeLines) {
    const involved = e.source === id || e.target === id;
    e.line.material.opacity = involved ? Math.max(0.7, e.baseOpacity * 1.5) : 0.05;
  }
}

function teardownMolecular() {
  if (molState.rafHandle) {
    cancelAnimationFrame(molState.rafHandle);
    molState.rafHandle = null;
  }
  if (molState.autoRotateResumeTimer) {
    clearTimeout(molState.autoRotateResumeTimer);
    molState.autoRotateResumeTimer = null;
  }
  if (molState.resizeHandler) { window.removeEventListener('resize', molState.resizeHandler); molState.resizeHandler = null; }
  if (molState.controls) { molState.controls.dispose(); molState.controls = null; }
  if (molState.renderer) {
    const dom = molState.renderer.domElement;
    if (dom) {
      if (molState.pointerDownHandler)   dom.removeEventListener('pointerdown', molState.pointerDownHandler);
      if (molState.pointerMoveHandler)   dom.removeEventListener('pointermove', molState.pointerMoveHandler);
      if (molState.pointerUpHandler)     dom.removeEventListener('pointerup', molState.pointerUpHandler);
      if (molState.pointerCancelHandler) dom.removeEventListener('pointercancel', molState.pointerCancelHandler);
      if (molState.pointerLeaveHandler)  dom.removeEventListener('pointerleave', molState.pointerLeaveHandler);
      if (molState.contextMenuHandler)   dom.removeEventListener('contextmenu', molState.contextMenuHandler);
    }
    molState.renderer.dispose();
    if (dom && dom.parentNode) dom.parentNode.removeChild(dom);
    molState.renderer = null;
  }
  if (molState.scene) {
    molState.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose && m.dispose());
        else if (obj.material.dispose) obj.material.dispose();
      }
      if (obj.material && obj.material.map && obj.material.map.dispose) obj.material.map.dispose();
    });
    molState.scene = null;
  }
  molState.nodeMeshes = [];
  molState.edgeLines = [];
  molState.hoveredId = null;
  molState.pointer = null;
  molState.focusTags = null;
  molState.pointerDownHandler = null;
  molState.pointerMoveHandler = null;
  molState.pointerUpHandler = null;
  molState.pointerCancelHandler = null;
  molState.pointerLeaveHandler = null;
  molState.contextMenuHandler = null;
  molState.camera = null;
  molState.raycaster = null;
  molState.mouse = null;
}



function renderToday() {
  const buckets = buildTodayBuckets();
  const total = buckets.overdueTodos.length + buckets.todayTodos.length + buckets.todayReminders.length + buckets.overdueCommitments.length + buckets.overdueDelegations.length;
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long' });
  const greeting = todayGreeting();

  if (!(state.todayFilter instanceof Set)) state.todayFilter = new Set();
  const filter = state.todayFilter;
  const filterActive = filter.size > 0;
  const showSection = (kind) => !filterActive || filter.has(kind);

  const mostUrgent = buckets.overdueTodos[0] || buckets.todayTodos[0] || null;

  const session = state.focusSession;
  const sessionActive = !!(session && session.taskId);
  let focusProj = null, focusTodo = null, focusRemain = null;
  if (sessionActive) {
    focusProj = state.data.projects[session.projectKey];
    focusTodo = focusProj?.todos?.find(t => t.id === session.taskId);
    if (focusTodo) focusRemain = getFocusRemaining();
  }

  const waitingCount = buckets.overdueCommitments.length + buckets.overdueDelegations.length;

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-today">
      <div class="view-body-scrollable" style="padding:24px 36px 32px">

        <header class="today-hero">
          <div class="today-hero-eyebrow">${dateStr.toUpperCase()}</div>
          <h1 class="today-hero-title">${escapeHTML(greeting)}.</h1>
          <div class="today-hero-summary">
            ${total === 0
              ? `<span class="today-summary-clean">Nothing pressing today. 🎉</span>`
              : `${buckets.overdueTodos.length > 0 ? `<button class="today-summary-pill alert ${filter.has('overdue')?'active':''}" data-today-filter="overdue">⚠ ${buckets.overdueTodos.length} overdue</button>` : ''}
                 ${buckets.todayTodos.length > 0 ? `<button class="today-summary-pill warn ${filter.has('today')?'active':''}" data-today-filter="today">📅 ${buckets.todayTodos.length} today</button>` : ''}
                 ${buckets.todayReminders.length > 0 ? `<button class="today-summary-pill ${filter.has('reminders')?'active':''}" data-today-filter="reminders">🔔 ${buckets.todayReminders.length} reminder${buckets.todayReminders.length === 1 ? '' : 's'}</button>` : ''}
                 ${waitingCount > 0 ? `<button class="today-summary-pill ${filter.has('waiting')?'active':''}" data-today-filter="waiting">🤝 ${waitingCount} waiting</button>` : ''}
                 ${buckets.upcomingTodos.length > 0 ? `<button class="today-summary-pill muted ${filter.has('upcoming')?'active':''}" data-today-filter="upcoming">📆 ${buckets.upcomingTodos.length} this week</button>` : ''}
                 ${filterActive ? `<button class="today-summary-pill clear" id="today-filter-clear">✕ Clear filter</button>` : ''}`}
          </div>
        </header>

        ${sessionActive && focusTodo ? `
          <section class="today-focus" style="--focus-accent:${focusProj?.color || 'var(--accent)'}">
            <div class="today-focus-card">
              <div class="today-focus-eyebrow">🔥 In focus</div>
              <div class="today-focus-title">${escapeHTML(focusTodo.title)}</div>
              <div class="today-focus-meta">${escapeHTML(focusProj?.name || '')} · ${focusRemain ? formatTimer(focusRemain.remaining) : ''} remaining</div>
              <div class="today-focus-actions">
                <button class="btn btn-ghost btn-sm" data-today-focus="toggle">${session.pausedAt ? '▶ Resume' : '⏸ Pause'}</button>
                <button class="btn btn-ghost btn-sm" data-today-focus="ext5">+5m</button>
                <button class="btn btn-ghost btn-sm" data-today-focus="end">End</button>
              </div>
            </div>
          </section>` : ''}

        ${mostUrgent && !sessionActive && !filterActive ? `
          <section class="today-next-up">
            <div class="today-next-card" data-today-jump-todo="${mostUrgent.todo.id}" data-today-jump-project="${mostUrgent.projectKey}">
              <div class="today-next-eyebrow" style="color:${mostUrgent.projectColor}">⚡ Next up · ${escapeHTML(mostUrgent.projectName)}${mostUrgent.todo.dueDate && isOverdue(mostUrgent.todo.dueDate) ? ` · ⚠ ${daysOverdueLabel(mostUrgent.todo.dueDate)}` : ''}</div>
              <div class="today-next-title">${escapeHTML(mostUrgent.todo.title)}</div>
              <div class="today-next-actions">
                <button class="btn btn-primary btn-sm" data-today-action="done" data-todo-id="${mostUrgent.todo.id}" data-project-key="${mostUrgent.projectKey}">✓ Done</button>
                <button class="btn btn-secondary btn-sm" data-today-action="focus" data-todo-id="${mostUrgent.todo.id}" data-project-key="${mostUrgent.projectKey}">⚡ Focus</button>
                <button class="btn btn-secondary btn-sm" data-today-action="snooze" data-todo-id="${mostUrgent.todo.id}" data-project-key="${mostUrgent.projectKey}">⏰ Tomorrow</button>
                <button class="btn btn-ghost btn-sm" data-today-action="open" data-todo-id="${mostUrgent.todo.id}" data-project-key="${mostUrgent.projectKey}">↗ Open</button>
              </div>
            </div>
          </section>` : ''}

        <div class="today-grid">

          ${showSection('overdue') && buckets.overdueTodos.length > 0 ? `
            <section class="today-card today-card-alert">
              <div class="today-card-header">
                <span class="today-card-icon">⚠</span>
                <span class="today-card-title">Overdue</span>
                <span class="today-card-count">${buckets.overdueTodos.length}</span>
              </div>
              <div class="today-card-body">
                ${buckets.overdueTodos.map(it => todayTodoRowHTML(it, 'overdue')).join('')}
              </div>
            </section>` : ''}

          ${showSection('today') && buckets.todayTodos.length > 0 ? `
            <section class="today-card today-card-warn">
              <div class="today-card-header">
                <span class="today-card-icon">📅</span>
                <span class="today-card-title">Due today</span>
                <span class="today-card-count">${buckets.todayTodos.length}</span>
              </div>
              <div class="today-card-body">
                ${buckets.todayTodos.map(it => todayTodoRowHTML(it, 'today')).join('')}
              </div>
            </section>` : ''}

          ${showSection('reminders') && buckets.todayReminders.length > 0 ? `
            <section class="today-card">
              <div class="today-card-header">
                <span class="today-card-icon">🔔</span>
                <span class="today-card-title">Reminders today</span>
                <span class="today-card-count">${buckets.todayReminders.length}</span>
              </div>
              <div class="today-card-body">
                ${buckets.todayReminders.map(it => `
                  <div class="today-row" data-today-jump-reminder="${it.reminder.id}" data-today-jump-project="${it.projectKey}">
                    <span class="today-row-proj-pill" style="background:color-mix(in srgb, ${it.projectColor} 18%, transparent); color:${it.projectColor}; border-color:${it.projectColor}55">${escapeHTML(shortProjLabel(it.projectName))}</span>
                    <span class="today-row-title">${escapeHTML(it.reminder.title)}</span>
                    <span class="today-row-meta">${formatDateTime(it.reminder.datetime)}</span>
                  </div>`).join('')}
              </div>
            </section>` : ''}

          ${showSection('waiting') && waitingCount > 0 ? `
            <section class="today-card">
              <div class="today-card-header">
                <span class="today-card-icon">🤝</span>
                <span class="today-card-title">Waiting on people</span>
                <span class="today-card-count">${waitingCount}</span>
              </div>
              <div class="today-card-body">
                ${buckets.overdueCommitments.map(it => {
                  const c = it.commitment;
                  const arrow = c.direction === 'they_owe' ? '←' : '→';
                  return `<div class="today-row" data-today-jump-commitment="${c.id}" data-today-jump-project="${it.projectKey}">
                    <span class="today-row-proj-pill" style="background:color-mix(in srgb, ${it.projectColor} 18%, transparent); color:${it.projectColor}; border-color:${it.projectColor}55">${escapeHTML(shortProjLabel(it.projectName))}</span>
                    <span class="today-row-title"><span class="today-row-prefix">${arrow} ${escapeHTML(c.counterparty)}:</span> ${escapeHTML(c.description)}</span>
                    <span class="today-row-meta ${isOverdue(c.due_date) ? 'overdue' : ''}">${formatDate(c.due_date)}</span>
                  </div>`;
                }).join('')}
                ${buckets.overdueDelegations.map(it => {
                  const d = it.delegation;
                  return `<div class="today-row" data-today-jump-delegation="${d.id}" data-today-jump-project="${it.projectKey}">
                    <span class="today-row-proj-pill" style="background:color-mix(in srgb, ${it.projectColor} 18%, transparent); color:${it.projectColor}; border-color:${it.projectColor}55">${escapeHTML(shortProjLabel(it.projectName))}</span>
                    <span class="today-row-title"><span class="today-row-prefix">→ ${escapeHTML(d.delegated_to)}:</span> ${escapeHTML(d.task)}</span>
                    <span class="today-row-meta ${isOverdue(d.due_date) ? 'overdue' : ''}">${formatDate(d.due_date)}</span>
                  </div>`;
                }).join('')}
              </div>
            </section>` : ''}

          ${showSection('upcoming') && buckets.upcomingTodos.length > 0 ? `
            <section class="today-card today-card-muted today-card-wide">
              <div class="today-card-header">
                <span class="today-card-icon">📆</span>
                <span class="today-card-title">Coming up this week</span>
                <span class="today-card-count">${buckets.upcomingTodos.length}</span>
              </div>
              <div class="today-card-body">
                ${buckets.upcomingTodos.map(it => todayTodoRowHTML(it, 'upcoming')).join('')}
              </div>
            </section>` : ''}

        </div>

        ${total === 0 ? `
          <section class="today-empty">
            <div style="font-size:48px; margin-bottom:12px">🎉</div>
            <div style="font-size:18px; font-weight:600; margin-bottom:6px">All caught up.</div>
            <div style="color:var(--text-secondary); font-size:13px; line-height:1.6; max-width:480px; margin:0 auto">
              No overdue items, nothing due today, no reminders firing, nobody waiting on you.
              Use this time to plan ahead, or capture something new with <kbd>Ctrl+K</kbd>.
            </div>
          </section>` : ''}

        ${filterActive && total > 0 ? (() => {
          const visibleSections = ['overdue','today','reminders','waiting','upcoming'].filter(s => filter.has(s) && (
            (s === 'overdue' && buckets.overdueTodos.length) ||
            (s === 'today' && buckets.todayTodos.length) ||
            (s === 'reminders' && buckets.todayReminders.length) ||
            (s === 'waiting' && waitingCount) ||
            (s === 'upcoming' && buckets.upcomingTodos.length)
          ));
          return visibleSections.length === 0 ? `
            <section class="today-empty">
              <div style="font-size:14px; color:var(--text-secondary)">Nothing matches the active filter.</div>
              <button class="btn btn-ghost btn-sm" id="today-filter-clear-2" style="margin-top:10px">Clear filter</button>
            </section>` : '';
        })() : ''}

      </div>
    </div>`;

  // Filter pills
  document.querySelectorAll('[data-today-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.todayFilter;
      if (state.todayFilter.has(f)) state.todayFilter.delete(f);
      else state.todayFilter.add(f);
      renderToday();
    });
  });
  const clearFilter = () => { state.todayFilter.clear(); renderToday(); };
  document.getElementById('today-filter-clear')?.addEventListener('click', clearFilter);
  document.getElementById('today-filter-clear-2')?.addEventListener('click', clearFilter);

  // Wire up actions
  document.querySelectorAll('[data-today-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.todayAction;
      const todoId = btn.dataset.todoId;
      const projKey = btn.dataset.projectKey;
      handleTodayAction(action, projKey, todoId);
    });
  });
  document.querySelectorAll('.today-row[data-today-jump-todo], .today-next-card[data-today-jump-todo]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const projKey = el.dataset.todayJumpProject;
      if (projKey && projKey !== state.project) switchProject(projKey);
      showView('todos');
    });
  });
  document.querySelectorAll('[data-today-jump-reminder]').forEach(el => {
    el.addEventListener('click', () => {
      const projKey = el.dataset.todayJumpProject;
      if (projKey && projKey !== state.project) switchProject(projKey);
      showView('reminders');
    });
  });
  document.querySelectorAll('[data-today-jump-commitment]').forEach(el => {
    el.addEventListener('click', () => {
      const projKey = el.dataset.todayJumpProject;
      if (projKey && projKey !== state.project) switchProject(projKey);
      showView('commitments');
    });
  });
  document.querySelectorAll('[data-today-jump-delegation]').forEach(el => {
    el.addEventListener('click', () => {
      const projKey = el.dataset.todayJumpProject;
      if (projKey && projKey !== state.project) switchProject(projKey);
      showView('delegations');
    });
  });
  document.querySelectorAll('[data-today-focus]').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.todayFocus;
      if (a === 'toggle') stickyTogglePauseFocus();
      else if (a === 'ext5') stickyExtendFocus(5);
      else if (a === 'end') stickyEndFocus();
      renderToday();
    });
  });
}

function shortProjLabel(name) {
  if (!name) return '';
  if (name.length <= 12) return name;
  const words = name.split(/\s+/);
  if (words.length > 1) return words.map(w => w[0]).join('').toUpperCase().slice(0, 4);
  return name.slice(0, 10);
}

function todayTodoRowHTML(item, kind) {
  const t = item.todo;
  const dueLabel = kind === 'overdue'
    ? `⚠ ${daysOverdueLabel(t.dueDate)}`
    : kind === 'today' ? 'today' : formatDate(t.dueDate);
  return `<div class="today-row today-row-todo today-row-${kind}" data-today-jump-todo="${t.id}" data-today-jump-project="${item.projectKey}">
    <span class="today-row-proj-pill" style="background:color-mix(in srgb, ${item.projectColor} 18%, transparent); color:${item.projectColor}; border-color:${item.projectColor}55" title="${escapeHTML(item.projectName)}">${escapeHTML(shortProjLabel(item.projectName))}</span>
    <span class="today-row-title">${escapeHTML(t.title)}</span>
    <span class="today-row-meta ${kind === 'overdue' ? 'overdue' : ''}">${dueLabel}</span>
    <span class="today-row-actions">
      <button class="btn btn-ghost btn-icon" data-today-action="done" data-todo-id="${t.id}" data-project-key="${item.projectKey}" title="Mark done">✓</button>
      <button class="btn btn-ghost btn-icon" data-today-action="snooze" data-todo-id="${t.id}" data-project-key="${item.projectKey}" title="Push to tomorrow">⏰</button>
    </span>
  </div>`;
}

function daysOverdueLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((today - d) / 86400000);
  if (days <= 0) return formatDate(dateStr);
  if (days === 1) return '1 day overdue';
  return `${days} days overdue`;
}

function handleTodayAction(action, projKey, todoId) {
  const proj = state.data.projects[projKey];
  if (!proj) return;
  const t = (proj.todos || []).find(x => x.id === todoId);
  if (!t) return;
  if (action === 'done') {
    t.done = true;
    t.completedAt = new Date().toISOString();
    if (t.recurrence) {
      const clone = spawnNextRecurringTodo(t);
      if (clone) showToast(`Next: ${clone.title} → ${formatDate(clone.dueDate)}`, 'success');
    }
    saveData();
    renderApp();
    return;
  }
  if (action === 'snooze') {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const oldDue = t.dueDate ? new Date(t.dueDate) : tomorrow;
    const delta = Math.round((tomorrow - oldDue) / 86400000);
    t.dueDate = toDateString(tomorrow);
    if (t.startDate && delta) {
      const s = new Date(t.startDate);
      s.setDate(s.getDate() + delta);
      t.startDate = toDateString(s);
    }
    saveData();
    showToast(`Pushed "${t.title}" to tomorrow`, 'success');
    renderApp();
    return;
  }
  if (action === 'focus') {
    if (projKey !== state.project) switchProject(projKey);
    stickyStartFocus({ refType: 'todo', id: todoId, projectKey: projKey });
    if (!state.stickyMode) toggleStickyMode();
    return;
  }
  if (action === 'open') {
    if (projKey !== state.project) switchProject(projKey);
    showView('todos');
    return;
  }
}

// ===== OVERVIEW (ALL PROJECTS) =====
function renderOverview() {
  const projects = state.data.projects;
  // Overview is the cross-project dashboard — archived projects are intentionally excluded.
  // The user can restore them from the sidebar to bring them back in.
  const entries = Object.entries(projects).filter(([, proj]) => !proj.archived);
  const archivedCount = Object.values(projects).filter(p => p.archived).length;

  const today = new Date(); today.setHours(0,0,0,0);
  const in7d = new Date(today); in7d.setDate(in7d.getDate() + 7);

  const perProject = entries.map(([key, proj]) => {
    const notes = proj.notes || [];
    const todos = proj.todos || [];
    const sps   = proj.subprojects || [];
    const rems  = proj.reminders || [];
    const coms  = proj.commitments || [];
    const openTodos = todos.filter(t => !t.done);
    const doneTodos = todos.filter(t => t.done);
    const overdueTodos = openTodos.filter(t => t.dueDate && isOverdue(t.dueDate));
    const upcomingRems = rems.filter(r => !r.fired);
    const openComs = coms.filter(c => c.status === 'open');
    const overdueComs = openComs.filter(c => isCommitmentOverdue(c));
    const pct = todos.length ? Math.round((doneTodos.length / todos.length) * 100) : 0;
    return {
      key, proj,
      counts: {
        notes: notes.length,
        todosOpen: openTodos.length,
        todosDone: doneTodos.length,
        todosTotal: todos.length,
        commitmentsOpen: openComs.length,
        commitmentsOverdue: overdueComs.length,
        overdue: overdueTodos.length,
        subprojects: sps.length,
        reminders: upcomingRems.length,
        pct
      }
    };
  });

  const totals = perProject.reduce((a, p) => ({
    notes:     a.notes     + p.counts.notes,
    todosOpen: a.todosOpen + p.counts.todosOpen,
    todosDone: a.todosDone + p.counts.todosDone,
    overdue:   a.overdue   + p.counts.overdue,
    subprojects: a.subprojects + p.counts.subprojects,
    reminders: a.reminders + p.counts.reminders,
    commitmentsOpen: a.commitmentsOpen + p.counts.commitmentsOpen,
    commitmentsOverdue: a.commitmentsOverdue + p.counts.commitmentsOverdue
  }), { notes:0, todosOpen:0, todosDone:0, overdue:0, subprojects:0, reminders:0, commitmentsOpen:0, commitmentsOverdue:0 });

  const allOverdueCommitments = entries.flatMap(([key, proj]) =>
    (proj.commitments || []).filter(c => c.status === 'open' && isCommitmentOverdue(c))
      .map(c => ({ ...c, projectKey: key, projectName: proj.name, projectColor: proj.color }))
  ).sort((a,b) => new Date(a.due_date||'9999') - new Date(b.due_date||'9999')).slice(0, 6);

  const allReminders = entries.flatMap(([key, proj]) =>
    (proj.reminders || []).filter(r => !r.fired && r.datetime).map(r => ({ ...r, projectKey: key, projectName: proj.name, projectColor: proj.color }))
  ).sort((a,b) => new Date(a.datetime) - new Date(b.datetime)).slice(0, 6);

  const allOverdue = entries.flatMap(([key, proj]) =>
    (proj.todos || []).filter(t => !t.done && t.dueDate && isOverdue(t.dueDate))
      .map(t => ({ ...t, projectKey: key, projectName: proj.name, projectColor: proj.color }))
  ).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 6);

  const allDueSoon = entries.flatMap(([key, proj]) =>
    (proj.todos || []).filter(t => {
      if (t.done || !t.dueDate) return false;
      const d = new Date(t.dueDate); d.setHours(0,0,0,0);
      return d >= today && d <= in7d;
    }).map(t => ({ ...t, projectKey: key, projectName: proj.name, projectColor: proj.color }))
  ).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 6);

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-overview">
      <div class="view-header">
        <div class="view-header-row">
          <div class="view-title">Overview</div>
          <span style="font-size:13px;color:var(--text-muted)">${entries.length} project${entries.length===1?'':'s'}${archivedCount ? ` · ${archivedCount} archived` : ''} · ${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</span>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:0 24px 24px">
        <div class="overview-stats">
          <div class="overview-stat"><div class="overview-stat-num">${entries.length}</div><div class="overview-stat-label">Projects</div></div>
          <div class="overview-stat"><div class="overview-stat-num">${totals.notes}</div><div class="overview-stat-label">Notes</div></div>
          <div class="overview-stat"><div class="overview-stat-num">${totals.todosOpen}</div><div class="overview-stat-label">Open todos</div></div>
          <div class="overview-stat ${totals.overdue ? 'overview-stat-alert' : ''}"><div class="overview-stat-num">${totals.overdue}</div><div class="overview-stat-label">Overdue</div></div>
          <div class="overview-stat ${totals.commitmentsOverdue ? 'overview-stat-alert' : ''}"><div class="overview-stat-num">${totals.commitmentsOpen}</div><div class="overview-stat-label">Commitments</div></div>
          <div class="overview-stat"><div class="overview-stat-num">${totals.reminders}</div><div class="overview-stat-label">Reminders</div></div>
          <div class="overview-stat"><div class="overview-stat-num">${totals.subprojects}</div><div class="overview-stat-label">Subprojects</div></div>
        </div>

        <div class="overview-section-title">Projects</div>
        <div class="overview-project-grid">
          ${perProject.map(p => `
            <div class="overview-project-card" data-project-key="${p.key}" style="--card-accent:${p.proj.color || '#16a34a'}">
              <div class="overview-project-header">
                ${p.proj.iconRelPath ? `<img class="project-icon-img overview-project-dot" data-project-icon-rel="${escapeHTML(p.proj.iconRelPath)}" style="width:18px;height:18px;object-fit:cover;border-radius:4px" alt="">` : `<span class="overview-project-dot" style="background:${p.proj.color || '#16a34a'}"></span>`}
                <span class="overview-project-name">${escapeHTML(p.proj.name)}</span>
                ${p.counts.overdue ? `<span class="overview-project-alert" title="${p.counts.overdue} overdue">!${p.counts.overdue}</span>` : ''}
              </div>
              <div class="overview-project-progress">
                <div class="overview-project-progress-bar" style="width:${p.counts.pct}%;background:${p.proj.color || '#16a34a'}"></div>
              </div>
              <div class="overview-project-progress-label">${p.counts.todosDone}/${p.counts.todosTotal} todos · ${p.counts.pct}%</div>
              <div class="overview-project-metrics">
                <div class="overview-project-metric" data-metric-project="${p.key}" data-metric-view="notes" title="Open notes"><span>📝</span>${p.counts.notes}</div>
                <div class="overview-project-metric" data-metric-project="${p.key}" data-metric-view="todos" title="Open todos"><span>✅</span>${p.counts.todosOpen}</div>
                <div class="overview-project-metric" data-metric-project="${p.key}" data-metric-view="subprojects" title="Open subprojects"><span>📁</span>${p.counts.subprojects}</div>
                <div class="overview-project-metric" data-metric-project="${p.key}" data-metric-view="commitments" title="Open commitments"><span>🤝</span>${p.counts.commitmentsOpen}</div>
                <div class="overview-project-metric" data-metric-project="${p.key}" data-metric-view="reminders" title="Open reminders"><span>🔔</span>${p.counts.reminders}</div>
              </div>
            </div>`).join('')}
        </div>

        <div class="overview-grid">
          <div class="dash-section">
            <div class="dash-section-header">
              <span class="dash-section-title">Overdue todos</span>
            </div>
            ${allOverdue.length ? allOverdue.map(t => `
              <div class="overview-list-item" data-jump-project="${t.projectKey}" data-jump-view="todos">
                <button class="overview-todo-check" data-overview-todo-check="${t.id}" data-overview-todo-project="${t.projectKey}" title="Mark done"></button>
                <span class="overview-list-dot" style="background:${t.projectColor || '#16a34a'}"></span>
                <span class="overview-list-title">${escapeHTML(t.title)}</span>
                <span class="overview-list-meta overview-list-meta-alert">${formatDate(t.dueDate)}</span>
                <span class="overview-list-project">${escapeHTML(t.projectName)}</span>
              </div>`).join('') : '<div class="empty-state">Nothing overdue 🎉</div>'}
          </div>

          <div class="dash-section">
            <div class="dash-section-header">
              <span class="dash-section-title">Due this week</span>
            </div>
            ${allDueSoon.length ? allDueSoon.map(t => `
              <div class="overview-list-item" data-jump-project="${t.projectKey}" data-jump-view="todos">
                <button class="overview-todo-check" data-overview-todo-check="${t.id}" data-overview-todo-project="${t.projectKey}" title="Mark done"></button>
                <span class="overview-list-dot" style="background:${t.projectColor || '#16a34a'}"></span>
                <span class="overview-list-title">${escapeHTML(t.title)}</span>
                <span class="overview-list-meta">${formatDate(t.dueDate)}</span>
                <span class="overview-list-project">${escapeHTML(t.projectName)}</span>
              </div>`).join('') : '<div class="empty-state">Nothing due in the next 7 days</div>'}
          </div>

          ${allOverdueCommitments.length ? `
          <div class="dash-section">
            <div class="dash-section-header">
              <span class="dash-section-title" style="color:#dc2626">⚠ Overdue commitments</span>
            </div>
            ${allOverdueCommitments.map(c => {
              const dir = c.direction === 'i_owe' ? 'I owe →' : '← They owe:';
              return `<div class="overview-list-item" data-jump-project="${c.projectKey}" data-jump-view="commitments">
                <span class="overview-list-dot" style="background:#dc2626"></span>
                <span class="overview-list-title"><span style="font-size:10px;color:var(--text-muted)">${dir}</span> ${escapeHTML(c.counterparty)} — ${escapeHTML(c.description)}</span>
                ${c.due_date ? `<span class="overview-list-meta overview-list-meta-alert">${formatDate(c.due_date)}</span>` : ''}
                <span class="overview-list-project">${escapeHTML(c.projectName)}</span>
              </div>`;
            }).join('')}
          </div>` : ''}

          ${(() => {
            // Quietly slipping — counterweight to the urgency block above. The
            // 3 stalest items across the workspace (todos / notes / reminders)
            // ranked by inverse touch weight. Reuses the Pull view's row markup
            // and click delegation so the slipping component looks identical
            // wherever it appears.
            const slipping = buildSlippingItems();
            if (!slipping.length) return '';
            return `<div class="dash-section pull-slipping" style="grid-column:1/-1">
              <div class="dash-section-header">
                <span class="dash-section-title">Quietly slipping</span>
              </div>
              <div class="pull-list pull-list--drift" role="list">
                ${slipping.map(e => pullRowHTML(e, 0, 1, { isDrift: true })).join('')}
              </div>
            </div>`;
          })()}

          <div class="dash-section" style="grid-column:1/-1">
            <div class="dash-section-header">
              <span class="dash-section-title">Upcoming reminders</span>
            </div>
            ${allReminders.length ? allReminders.map(r => `
              <div class="overview-list-item" data-jump-project="${r.projectKey}" data-jump-view="reminders">
                <span class="overview-list-dot" style="background:${r.projectColor || '#16a34a'}"></span>
                <span class="overview-list-title">🔔 ${escapeHTML(r.title)}</span>
                <span class="overview-list-meta">${formatDateTime(r.datetime)}</span>
                <span class="overview-list-project">${escapeHTML(r.projectName)}</span>
              </div>`).join('') : '<div class="empty-state">No upcoming reminders</div>'}
          </div>
        </div>

        <div class="overview-timelines-header">
          <div class="overview-section-title" style="margin:0">Project timelines${state.dashGanttExtendDays ? ` <span style="font-weight:400;color:var(--text-muted);font-size:11px">(+${state.dashGanttExtendDays} days)</span>` : ''}</div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" id="btn-overview-gantt-extend" title="Extend all project timelines by 30 days">+ 30d</button>
            ${state.dashGanttExtendDays ? `<button class="btn btn-ghost btn-sm" id="btn-overview-gantt-reset" title="Reset timeline extension">Reset</button>` : ''}
          </div>
        </div>
        ${(() => {
          const dated = entries.filter(([, proj]) => (proj.todos || []).some(t => !t.done && (t.startDate || t.dueDate)));
          if (!dated.length) return '<div class="empty-state" style="padding:20px">No projects have dated todos yet.</div>';

          // Compute one shared window across ALL project gantts so they line up.
          const allDates = [];
          dated.forEach(([, proj]) => {
            (proj.todos || []).forEach(t => {
              if (!t.done) {
                if (t.startDate) allDates.push(new Date(t.startDate));
                if (t.dueDate)   allDates.push(new Date(t.dueDate));
              }
            });
          });
          const sharedStart = new Date(Math.min(...allDates));
          sharedStart.setDate(sharedStart.getDate() - 2);
          sharedStart.setHours(0, 0, 0, 0);
          let sharedEnd = new Date(Math.max(...allDates));
          sharedEnd.setDate(sharedEnd.getDate() + 3 + (state.dashGanttExtendDays || 0));
          sharedEnd.setHours(0, 0, 0, 0);
          const minEnd = new Date(); minEnd.setHours(0, 0, 0, 0);
          minEnd.setDate(minEnd.getDate() + 60 + (state.dashGanttExtendDays || 0));
          if (sharedEnd < minEnd) sharedEnd = minEnd;

          return dated.map(([key, proj]) => `
            <div class="dash-section overview-gantt-section" style="margin-bottom:14px;border-left:4px solid ${proj.color || '#16a34a'}">
              <div class="dash-section-header">
                <span class="dash-section-title">
                  <span class="dash-gantt-dot" style="background:${proj.color || '#16a34a'}"></span>
                  ${escapeHTML(proj.name)}
                </span>
                <button class="btn btn-ghost btn-sm" data-overview-open-project="${key}">Open</button>
              </div>
              ${allSubprojectsGanttHTML(proj, key, { compact: true, limit: 30, windowStart: sharedStart, windowEnd: sharedEnd })}
            </div>`).join('');
        })()}
      </div>
    </div>`;

  document.querySelectorAll('.overview-project-card').forEach(el =>
    el.addEventListener('click', (e) => {
      if (e.target.closest('.overview-project-metric')) return;
      const key = el.dataset.projectKey;
      if (key && key !== state.project) switchProject(key);
      showView('dashboard');
    }));
  document.querySelectorAll('.overview-project-metric[data-metric-view]').forEach(el =>
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = el.dataset.metricProject;
      const view = el.dataset.metricView;
      if (key && key !== state.project) switchProject(key);
      if (view) showView(view);
    }));
  document.querySelectorAll('.overview-list-item[data-jump-project]').forEach(el =>
    el.addEventListener('click', (e) => {
      if (e.target.closest('.overview-todo-check')) return;
      const key = el.dataset.jumpProject;
      const v = el.dataset.jumpView || 'dashboard';
      if (key && key !== state.project) switchProject(key);
      showView(v);
    }));
  // "Quietly slipping" rows reuse the Pull view's pull-row markup with
  // data-pull-* attrs. Same navigation as Pull → navigateToPullItem.
  document.querySelectorAll('#view-overview .pull-row[data-pull-kind]').forEach(el =>
    el.addEventListener('click', () => {
      navigateToPullItem(el.dataset.pullKind, el.dataset.pullProject, el.dataset.pullId);
    }));
  document.querySelectorAll('.overview-todo-check[data-overview-todo-check]').forEach(btn =>
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const projKey = btn.dataset.overviewTodoProject;
      const todoId = btn.dataset.overviewTodoCheck;
      const proj = state.data.projects[projKey];
      if (!proj) return;
      const t = (proj.todos || []).find(x => x.id === todoId);
      if (!t) return;
      t.done = true;
      t.completedAt = new Date().toISOString();
      if (t.recurrence) {
        // Spawn next recurrence into the correct project (not necessarily the active one)
        const base = t.dueDate ? new Date(t.dueDate) : new Date();
        const next = computeNextOccurrence(t.recurrence, base);
        if (next) {
          proj.todos.unshift({
            id: generateId('todo'),
            title: t.title,
            done: false,
            priority: t.priority,
            subprojectId: t.subprojectId,
            startDate: null,
            dueDate: toDateString(next),
            created: new Date().toISOString(),
            completedAt: null,
            attachments: [],
            steps: (t.steps || []).map(s => ({ id: generateId('step'), title: s.title, done: false, created: new Date().toISOString() })),
            recurrence: { ...t.recurrence, weekdays: t.recurrence.weekdays ? [...t.recurrence.weekdays] : undefined }
          });
        }
      }
      saveData();
      showToast(`Marked "${t.title}" as done.`, 'success');
      renderOverview();
    }));
  document.querySelectorAll('[data-overview-open-project]').forEach(btn =>
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = btn.dataset.overviewOpenProject;
      if (key && key !== state.project) switchProject(key);
      showView('dashboard');
    }));
  document.getElementById('btn-overview-gantt-extend')?.addEventListener('click', () => {
    state.dashGanttExtendDays = (state.dashGanttExtendDays || 0) + 30;
    renderOverview();
  });
  document.getElementById('btn-overview-gantt-reset')?.addEventListener('click', () => {
    state.dashGanttExtendDays = 0;
    renderOverview();
  });
  document.querySelectorAll('.dash-gantt-toggle').forEach(btn =>
    btn.addEventListener('click', () => {
      state.dashGanttExpanded = !state.dashGanttExpanded;
      renderOverview();
    }));
  document.querySelectorAll('.overview-gantt-section .dash-gantt-row').forEach(el =>
    el.addEventListener('click', () => {
      const key = el.dataset.projKey;
      if (key && key !== state.project) switchProject(key);
      const spId = el.dataset.spId;
      if (spId) {
        state.activeSubproject = spId;
        state.editingSubproject = null;
        showView('subprojects');
      } else {
        showView('todos');
      }
    }));
}

function openNoteFromDash(id) { state.editingNote = id; showView('notes'); }
function sortTodosByStatus(todos, options = {}) {
  const sortBy = options.sortBy || 'priority';
  const spOrder = options.spOrder || {};
  const po = { high: 0, medium: 1, low: 2 };
  return [...todos].sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    if (a.done) {
      const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return tb - ta;
    }
    if (sortBy === 'due') {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (da !== db) return da - db;
    } else if (sortBy === 'subproject') {
      const sa = a.subprojectId ? (spOrder[a.subprojectId] ?? 9998) : 9999;
      const sb = b.subprojectId ? (spOrder[b.subprojectId] ?? 9998) : 9999;
      if (sa !== sb) return sa - sb;
    }
    return (po[a.priority] ?? 2) - (po[b.priority] ?? 2);
  });
}

function toggleTodoFrom(id, from) {
  const proj = getProject();
  const t = proj.todos.find(x => x.id === id);
  if (t) {
    const becomingDone = !t.done;
    t.done = becomingDone;
    if (becomingDone) {
      t.completedAt = new Date().toISOString();
      if (t.recurrence) {
        const clone = spawnNextRecurringTodo(t);
        if (clone) showToast(`Next: ${clone.title} → ${formatDate(clone.dueDate)}`, 'success');
      }
    } else {
      t.completedAt = null;
    }
    saveData();
  }
  if (from === 'dashboard') renderDashboard();
  else if (from === 'todos') renderTodos();
  else if (from === 'subprojects') renderSubprojects();
}

// ===== NOTES =====
function renderNotes() {
  const proj = getProject();
  const q = state.noteSearch.toLowerCase();
  const pf = state.notePriorityFilter;
  const spf = state.noteSubprojectFilter;
  const subprojects = proj.subprojects || [];
  if (spf !== 'all' && spf !== 'none' && !subprojects.some(s => s.id === spf)) {
    state.noteSubprojectFilter = 'all';
  }
  const sort = state.noteSortBy;

  const showArchived = !!state.noteShowArchived;
  const filtered = (proj.notes || []).filter(n => {
    // Archived view shows ONLY archived notes; default view excludes them.
    if (showArchived ? !n.archived : !!n.archived) return false;
    if (pf !== 'all' && (n.priority || 'medium') !== pf) return false;
    if (spf === 'none' && n.subprojectId) return false;
    if (spf !== 'all' && spf !== 'none' && n.subprojectId !== spf) return false;
    if (q) {
      const inTitle = (n.title || '').toLowerCase().includes(q);
      const inContent = noteContentText(n.content).toLowerCase().includes(q);
      const inTags = (n.tags || []).join(' ').toLowerCase().includes(q);
      if (!inTitle && !inContent && !inTags) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sort === 'priority') {
      const po = { high: 0, medium: 1, low: 2 };
      const ap = po[a.priority] ?? 1;
      const bp = po[b.priority] ?? 1;
      if (ap !== bp) return ap - bp;
    } else if (sort === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    } else if (sort === 'created') {
      return new Date(b.created || 0) - new Date(a.created || 0);
    }
    return new Date(b.updated) - new Date(a.updated);
  });

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-notes">
      <div class="view-header">
        <div class="view-header-row">
          <div class="view-title">Notes</div>
          <button class="btn btn-primary" id="btn-new-note">+ New Note</button>
        </div>
      </div>
      <div class="notes-layout">
        <div class="notes-list-panel">
          <div class="notes-list-header">
            <input type="text" class="search-input" id="note-search"
              placeholder="Search notes…" value="${escapeHTML(state.noteSearch)}">
            <div class="notes-filter-block">
              <div class="notes-filter-label">
                <span>Sort</span>
              </div>
              <div class="notes-filter-chips">
                <button class="notes-filter-chip ${sort==='updated' ?'selected':''}" data-note-sort="updated">Updated</button>
                <button class="notes-filter-chip ${sort==='created' ?'selected':''}" data-note-sort="created">Created</button>
                <button class="notes-filter-chip ${sort==='priority'?'selected':''}" data-note-sort="priority">Priority</button>
                <button class="notes-filter-chip ${sort==='title'   ?'selected':''}" data-note-sort="title">Title</button>
              </div>
            </div>
            ${(() => {
              const archivedCount = (proj.notes || []).filter(n => n.archived).length;
              if (!archivedCount && !showArchived) return '';
              return `<div class="notes-filter-block">
                <div class="notes-filter-chips">
                  <button class="notes-filter-chip ${showArchived?'selected':''}" data-note-archived-toggle="1" title="Toggle archived view">
                    📦 ${showArchived ? 'Showing archived' : 'Show archived'}
                    <span style="opacity:0.7;margin-left:4px">${archivedCount}</span>
                  </button>
                </div>
              </div>`;
            })()}
            <div class="notes-filter-block">
              <div class="notes-filter-label">
                <span>Priority</span>
                ${pf!=='all' ? `<button class="btn btn-ghost btn-sm" data-note-pf="all" style="padding:2px 8px;font-size:11px">Clear</button>` : ''}
              </div>
              <div class="notes-filter-chips">
                <button class="notes-filter-chip ${pf==='all'   ?'selected':''}" data-note-pf="all">All</button>
                <button class="notes-filter-chip prio-high   ${pf==='high'  ?'selected':''}" data-note-pf="high">🔴 High</button>
                <button class="notes-filter-chip prio-medium ${pf==='medium'?'selected':''}" data-note-pf="medium">🟡 Medium</button>
                <button class="notes-filter-chip prio-low    ${pf==='low'   ?'selected':''}" data-note-pf="low">🟢 Low</button>
              </div>
            </div>
            ${subprojects.length ? `
              <div class="notes-filter-block">
                <div class="notes-filter-label">
                  <span>Subproject</span>
                  ${spf!=='all' ? `<button class="btn btn-ghost btn-sm" data-note-spf="all" style="padding:2px 8px;font-size:11px">Clear</button>` : ''}
                </div>
                <div class="notes-filter-chips">
                  <button class="notes-filter-chip ${spf==='all' ?'selected':''}" data-note-spf="all">All</button>
                  <button class="notes-filter-chip ${spf==='none'?'selected':''}" data-note-spf="none">None</button>
                  ${subprojects.map(s => `<button class="notes-filter-chip ${spf===s.id?'selected':''}" data-note-spf="${s.id}" style="${spf===s.id?`background:${s.color};border-color:${s.color};color:#fff`:`color:${s.color};border-color:${s.color}55`}">${escapeHTML(s.name)}</button>`).join('')}
                </div>
              </div>` : ''}
          </div>
          <div class="notes-list-items">
            ${filtered.length
              ? filtered.map(noteListItemHTML).join('')
              : `<div class="empty-state" style="padding:20px">${(proj.notes || []).length ? 'No notes match the filters' : 'No notes yet'}</div>`}
          </div>
        </div>
        <div class="notes-editor-panel" id="notes-editor-panel">
          ${noteEditorHTML()}
        </div>
      </div>
    </div>`;

  document.getElementById('btn-new-note').onclick = () => { state.editingNote = 'new'; renderNotes(); };
  document.getElementById('note-search').oninput = (e) => { state.noteSearch = e.target.value; renderNotes(); };
  document.querySelectorAll('[data-note-sort]').forEach(btn =>
    btn.addEventListener('click', () => { state.noteSortBy = btn.dataset.noteSort; renderNotes(); }));
  document.querySelectorAll('[data-note-pf]').forEach(btn =>
    btn.addEventListener('click', () => { state.notePriorityFilter = btn.dataset.notePf; renderNotes(); }));
  document.querySelectorAll('[data-note-spf]').forEach(btn =>
    btn.addEventListener('click', () => { state.noteSubprojectFilter = btn.dataset.noteSpf; renderNotes(); }));
  document.querySelector('[data-note-archived-toggle]')?.addEventListener('click', () => {
    state.noteShowArchived = !state.noteShowArchived;
    state.editingNote = null;
    renderNotes();
  });
  document.querySelectorAll('.note-list-item').forEach(el =>
    el.addEventListener('click', () => { state.editingNote = el.dataset.id; renderNotes(); }));
  setupNoteEditorEvents();
}

/**
 * Find every note across all projects whose body contains an @-mention to
 * the given (type, projectKey, refId). Cheap two-pass: a quick `.includes`
 * filter on refId, then a regex check for the full mention markup.
 */
/**
 * Walk every mention chip inside `root` and add status classes based on the
 * current state of the target item. Used after rendering the note editor so
 * a chip that points at a done todo shows as struck-through, and a chip
 * whose target was deleted shows as orphan.
 */
function decorateMentions(root) {
  if (!root) return;
  root.querySelectorAll('a.mention').forEach(a => {
    const type = a.dataset.mentionType;
    const projKey = a.dataset.mentionProject;
    const refId = a.dataset.mentionRef;
    const proj = state.data.projects?.[projKey];
    let exists = !!proj;
    let isDone = false;
    if (proj) {
      if (type === 'todo') {
        const t = (proj.todos || []).find(x => x.id === refId);
        if (!t) exists = false; else isDone = !!t.done;
      } else if (type === 'reminder') {
        const r = (proj.reminders || []).find(x => x.id === refId);
        if (!r) exists = false; else isDone = !!(r.doneAt || r.fired);
      } else if (type === 'note') {
        exists = (proj.notes || []).some(x => x.id === refId);
      } else if (type === 'flow') {
        exists = (proj.flows || []).some(x => x.id === refId);
      } else if (type === 'subproject') {
        exists = (proj.subprojects || []).some(x => x.id === refId);
      } else if (type === 'project') {
        exists = projKey === refId;
      }
    }
    a.classList.toggle('mention-done', exists && isDone);
    a.classList.toggle('mention-orphan', !exists);
    if (!exists) a.title = 'This item was deleted';
    else if (isDone) a.title = 'Marked done · click to open';
    else a.title = 'Click to open';
  });
}

function getBacklinksTo(type, projectKey, refId) {
  const out = [];
  const re = new RegExp(`<a[^>]*\\bclass="mention"[^>]*\\bdata-mention-type="${type}"[^>]*\\bdata-mention-project="${projectKey}"[^>]*\\bdata-mention-ref="${refId}"`, 'i');
  for (const [pkey, proj] of Object.entries(state.data.projects || {})) {
    if (proj.archived) continue;
    for (const note of (proj.notes || [])) {
      if (note.archived) continue;
      const html = note.content || '';
      if (!html.includes(refId)) continue;
      if (!re.test(html)) continue;
      out.push({
        noteId: note.id,
        projectKey: pkey,
        projectName: proj.name,
        projectColor: proj.color || '#16a34a',
        noteTitle: note.title || '(untitled)'
      });
    }
  }
  return out;
}

function backlinksPanelHTML(type, projectKey, refId) {
  const links = getBacklinksTo(type, projectKey, refId);
  if (!links.length) return '';
  return `<div class="backlinks-panel">
    <div class="backlinks-label">↺ Mentioned in ${links.length} note${links.length === 1 ? '' : 's'}</div>
    <div class="backlinks-list">
      ${links.map(l => `<button class="backlinks-row" data-backlink-note="${l.noteId}" data-backlink-project="${l.projectKey}">
        <span class="backlinks-icon" style="color:${l.projectColor}">📝</span>
        <span class="backlinks-title">${escapeHTML(l.noteTitle)}</span>
        <span class="backlinks-proj">${escapeHTML(l.projectName)}</span>
      </button>`).join('')}
    </div>
  </div>`;
}

function noteContentText(content) {
  if (!content) return '';
  if (/<[a-z!\/][\s\S]*?>/i.test(content)) {
    const tmp = document.createElement('div');
    tmp.innerHTML = content;
    return (tmp.textContent || tmp.innerText || '').trim();
  }
  return content.trim();
}
function noteContentInitialHTML(content) {
  if (!content) return '';
  if (/<[a-z!\/][\s\S]*?>/i.test(content)) return content;
  return escapeHTML(content).replace(/\n/g, '<br>');
}

// Strips inline styles/classes/scripts from pasted HTML so the editor stays in
// our visual language. Used by every contenteditable (notes, dump zone, flow steps).
function installRichEditorPaste(el) {
  if (!el || el.dataset.pasteHooked === '1') return;
  el.dataset.pasteHooked = '1';
  el.addEventListener('paste', (e) => {
    const html = e.clipboardData?.getData('text/html');
    const text = e.clipboardData?.getData('text/plain') || '';
    if (!html && !text) return;
    e.preventDefault();
    if (html) {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      tmp.querySelectorAll('script,style,meta,link').forEach(n => n.remove());
      tmp.querySelectorAll('*').forEach(n => {
        n.removeAttribute('style');
        n.removeAttribute('class');
        n.removeAttribute('id');
      });
      try { document.execCommand('insertHTML', false, tmp.innerHTML); } catch {}
    } else {
      try { document.execCommand('insertText', false, text); } catch {}
    }
  });
}

function noteListItemHTML(n) {
  const active = state.editingNote === n.id ? 'active' : '';
  const preview = noteContentText(n.content).split('\n')[0].slice(0, 60);
  const sp = (getProject().subprojects || []).find(s => s.id === n.subprojectId);
  return `<div class="note-list-item ${active} ${n.archived?'archived':''}" data-id="${n.id}">
    <div class="note-item-header">
      <span class="note-item-title">${escapeHTML(n.title)}</span>
      ${pinToggleButtonHTML('note', state.project, n.id, 'pin-toggle-inline')}
      <span class="note-item-date">${formatDate(n.updated)}</span>
    </div>
    <div class="note-item-preview">${escapeHTML(preview) || 'No content'}</div>
    <div class="note-item-tags">
      ${priorityBadge(n.priority)}
      ${sp ? `<span class="todo-sp-chip" style="background:${sp.color}22;color:${sp.color};border:1px solid ${sp.color}44">${escapeHTML(sp.name)}</span>` : ''}
      ${(n.tags||[]).map(t => `<span class="tag-chip">${escapeHTML(t)}</span>`).join('')}
    </div>
  </div>`;
}

function noteEditorHTML() {
  const proj = getProject();
  if (!state.editingNote) {
    return `<div class="editor-empty-state">
      <div class="editor-empty-icon">📝</div>
      <div class="editor-empty-text">Select a note or create a new one</div>
    </div>`;
  }
  let note;
  if (state.editingNote === 'new') {
    note = { id: 'new', title: '', content: '', priority: 'medium', tags: [], subprojectId: null, linkedTodos: [] };
  } else {
    note = proj.notes.find(n => n.id === state.editingNote);
    if (!note) { state.editingNote = null; return noteEditorHTML(); }
  }

  const linkedCount = (note.linkedTodos || []).length;
  const subprojects = proj.subprojects || [];

  return `<div class="note-editor" id="note-editor">
    <div class="editor-topbar">
      <div class="editor-meta" style="flex-wrap:wrap;gap:8px">
        <select class="form-select" id="note-priority" style="width:130px">
          <option value="high"   ${note.priority==='high'   ?'selected':''}>🔴 High</option>
          <option value="medium" ${note.priority==='medium' ?'selected':''}>🟡 Medium</option>
          <option value="low"    ${note.priority==='low'    ?'selected':''}>🟢 Low</option>
        </select>
        <select class="form-select" id="note-subproject" style="width:160px">
          <option value="">No subproject</option>
          ${subprojects.map(s => `<option value="${s.id}" ${note.subprojectId===s.id?'selected':''}>${escapeHTML(s.name)}</option>`).join('')}
        </select>
        <input type="text" class="form-input" id="note-tags"
          placeholder="Tags (comma separated)" value="${escapeHTML((note.tags||[]).join(', '))}" style="width:200px">
      </div>
      <div class="editor-actions">
        ${note.id !== 'new' ? `<button class="btn btn-secondary btn-sm" id="btn-archive-note" title="${note.archived ? 'Restore from archive' : 'Archive — hide from list but keep history'}">${note.archived ? '↺ Restore' : '📦 Archive'}</button>` : ''}
        ${note.id !== 'new' ? `<button class="btn btn-danger btn-sm" id="btn-delete-note">Delete</button>` : ''}
        <button class="btn btn-primary btn-sm" id="btn-save-note">Save</button>
      </div>
    </div>
    <input type="text" class="form-input note-title-input" id="note-title"
      placeholder="Note title…" value="${escapeHTML(note.title)}">
    <div class="note-rtf-toolbar" id="note-rtf-toolbar">
      <button type="button" data-rtf="bold" title="Bold (Ctrl+B)"><b>B</b></button>
      <button type="button" data-rtf="italic" title="Italic (Ctrl+I)"><i>I</i></button>
      <button type="button" data-rtf="underline" title="Underline (Ctrl+U)"><u>U</u></button>
      <button type="button" data-rtf="strikeThrough" title="Strikethrough"><s>S</s></button>
      <span class="rtf-sep"></span>
      <button type="button" data-rtf="formatBlock-h2" title="Heading">H</button>
      <button type="button" data-rtf="insertUnorderedList" title="Bulleted list">•</button>
      <button type="button" data-rtf="insertOrderedList" title="Numbered list">1.</button>
      <span class="rtf-sep"></span>
      <button type="button" data-rtf="removeFormat" title="Clear formatting">⌫</button>
    </div>
    <div class="note-rich" id="note-content" contenteditable="true"
      data-placeholder="Write your note here…">${noteContentInitialHTML(note.content)}</div>
    <details class="linked-todos-panel" ${linkedCount > 0 ? 'open' : ''}>
      <summary class="linked-todos-summary">
        Linked Todos <span class="linked-count">(${linkedCount})</span>
      </summary>
      <div class="linked-todos-list" id="linked-todos-list">
        ${proj.todos.length ? proj.todos.map(t => `
          <label class="linked-todo-item">
            <input type="checkbox" class="linked-todo-checkbox" value="${t.id}"
              ${(note.linkedTodos||[]).includes(t.id) ? 'checked' : ''}>
            <span class="linked-todo-title ${t.done?'linked-todo-done':''}">${escapeHTML(t.title)}</span>
            ${priorityBadge(t.priority)}
            ${t.startDate&&t.dueDate ? `<span style="font-size:11px;color:var(--text-muted)">${formatDate(t.startDate)} → ${formatDate(t.dueDate)}</span>` : ''}
          </label>`).join('')
          : '<span style="color:var(--text-muted);font-size:13px">No todos yet — create some in the Todos view</span>'}
      </div>
    </details>
    ${note.id !== 'new' ? linkedNodesPanelHTML('note', note.id) : ''}
    ${note.id !== 'new' ? backlinksPanelHTML('note', state.project, note.id) : ''}
    ${note.id !== 'new' ? attachmentPanelHTML(note, 'note', note.id) : `<div class="att-panel-placeholder">Save the note first to add attachments.</div>`}
  </div>`;
}

// Renders the "Linked spark-map nodes" details panel beneath the note editor's
// linked-todos panel. Visually mirrors that panel for consistency. Hidden when
// there are no node links — no empty box.
function linkedNodesPanelHTML(entityType, entityId) {
  const nodes = getLinkedNodes(entityType, entityId);
  if (nodes.length === 0) return '';
  return `<details class="linked-nodes-panel" open>
    <summary class="linked-nodes-summary">↔ Linked spark-map nodes <span class="linked-count">(${nodes.length})</span></summary>
    <div class="linked-nodes-list">
      ${nodes.map(n => `<button class="linked-node-row" type="button" data-action="open-node" data-node-id="${escapeHTML(n.id)}">${escapeHTML(n.label || '(empty)')}</button>`).join('')}
    </div>
  </details>`;
}

// ===== @-MENTIONS =====
const mentionState = { open: false, results: [], activeIdx: 0, query: '', anchor: null };

function buildMentionResults(query) {
  const q = (query || '').toLowerCase();
  const out = [];
  const seenLimit = 25;
  for (const [pkey, proj] of Object.entries(state.data.projects || {})) {
    if (out.length >= seenLimit) break;
    if (proj.archived) continue;
    if ((proj.name || '').toLowerCase().includes(q)) {
      out.push({ type: 'project', projectKey: pkey, refId: pkey, label: proj.name, projectName: proj.name, projectColor: proj.color || '#16a34a' });
    }
    (proj.todos || []).forEach(t => {
      if (t.archived) return;
      if ((t.title || '').toLowerCase().includes(q)) {
        out.push({ type: 'todo', projectKey: pkey, refId: t.id, label: t.title, projectName: proj.name, projectColor: proj.color || '#16a34a', done: !!t.done });
      }
    });
    (proj.notes || []).forEach(n => {
      if (n.archived) return;
      const title = (n.title || '').trim();
      if (title.toLowerCase().includes(q)) {
        out.push({ type: 'note', projectKey: pkey, refId: n.id, label: title || '(untitled)', projectName: proj.name, projectColor: proj.color || '#16a34a' });
      }
    });
    (proj.flows || []).forEach(f => {
      if ((f.name || '').toLowerCase().includes(q)) {
        out.push({ type: 'flow', projectKey: pkey, refId: f.id, label: f.name, projectName: proj.name, projectColor: proj.color || '#16a34a' });
      }
    });
    (proj.subprojects || []).forEach(s => {
      if ((s.name || '').toLowerCase().includes(q)) {
        out.push({ type: 'subproject', projectKey: pkey, refId: s.id, label: s.name, projectName: proj.name, projectColor: proj.color || '#16a34a' });
      }
    });
    (proj.reminders || []).forEach(r => {
      if ((r.title || '').toLowerCase().includes(q)) {
        out.push({ type: 'reminder', projectKey: pkey, refId: r.id, label: r.title, projectName: proj.name, projectColor: proj.color || '#16a34a', done: !!r.doneAt || !!r.fired });
      }
    });
  }
  out.sort((a, b) => {
    const aStart = a.label.toLowerCase().startsWith(q) ? 0 : 1;
    const bStart = b.label.toLowerCase().startsWith(q) ? 0 : 1;
    if (aStart !== bStart) return aStart - bStart;
    return a.label.length - b.label.length;
  });
  return out.slice(0, 12);
}

function findCaretMention() {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return null;
  const node = range.startContainer;
  if (node.nodeType !== 3) return null;
  const text = node.textContent || '';
  const offset = range.startOffset;
  let i = offset - 1;
  while (i >= 0 && /\S/.test(text[i])) i--;
  const word = text.slice(i + 1, offset);
  if (!word.startsWith('@')) return null;
  const afterAt = word.slice(1);
  if (afterAt.length > 40) return null;
  // Don't trigger inside an existing mention link
  let p = node.parentElement;
  while (p && p !== document.body) {
    if (p.tagName === 'A' && p.classList.contains('mention')) return null;
    p = p.parentElement;
  }
  return { node, startOffset: i + 1, endOffset: offset, query: afterAt };
}

function ensureMentionMenu() {
  let menu = document.getElementById('mention-menu');
  if (menu) return menu;
  menu = document.createElement('div');
  menu.id = 'mention-menu';
  menu.className = 'mention-menu';
  document.body.appendChild(menu);
  return menu;
}

function openMentionCompleter(anchor) {
  mentionState.open = true;
  mentionState.anchor = anchor;
  mentionState.query = anchor.query;
  mentionState.activeIdx = 0;
  mentionState.results = buildMentionResults(anchor.query);
  renderMentionMenu();
  positionMentionMenu();
}

function closeMentionCompleter() {
  mentionState.open = false;
  mentionState.anchor = null;
  mentionState.results = [];
  const menu = document.getElementById('mention-menu');
  if (menu) menu.remove();
}

function renderMentionMenu() {
  const menu = ensureMentionMenu();
  if (!mentionState.results.length) {
    menu.innerHTML = `<div class="mention-empty">No matches for “@${escapeHTML(mentionState.query)}”</div>`;
    return;
  }
  menu.innerHTML = mentionState.results.map((r, i) => {
    const icon = pinIconFor(r.type);
    const active = i === mentionState.activeIdx ? ' active' : '';
    const doneCls = r.done ? ' mention-row-is-done' : '';
    const doneBadge = r.done ? `<span class="mention-row-done-badge">✓ done</span>` : '';
    return `<div class="mention-row${active}${doneCls}" data-mention-idx="${i}">
      <span class="mention-row-icon">${icon}</span>
      <span class="mention-row-label">${escapeHTML(r.label)}</span>
      ${doneBadge}
      <span class="mention-row-proj"><span class="mention-row-dot" style="background:${r.projectColor}"></span>${escapeHTML(r.projectName)}</span>
    </div>`;
  }).join('');
  menu.querySelectorAll('.mention-row').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      mentionState.activeIdx = parseInt(el.dataset.mentionIdx, 10);
      insertMentionFromCompleter();
    });
    el.addEventListener('mouseenter', () => {
      mentionState.activeIdx = parseInt(el.dataset.mentionIdx, 10);
      menu.querySelectorAll('.mention-row').forEach(e2 =>
        e2.classList.toggle('active', parseInt(e2.dataset.mentionIdx, 10) === mentionState.activeIdx));
    });
  });
}

function positionMentionMenu() {
  const menu = document.getElementById('mention-menu');
  if (!menu) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const x = rect.left;
  const y = rect.bottom + 4;
  const menuRect = menu.getBoundingClientRect();
  const maxX = window.innerWidth - menuRect.width - 8;
  menu.style.left = `${Math.min(Math.max(8, x), maxX)}px`;
  if (y + menuRect.height > window.innerHeight) {
    menu.style.top = `${rect.top - menuRect.height - 4}px`;
  } else {
    menu.style.top = `${y}px`;
  }
}

function insertMentionFromCompleter() {
  const item = mentionState.results[mentionState.activeIdx];
  const anchor = mentionState.anchor;
  if (!item || !anchor) { closeMentionCompleter(); return; }
  const { node, startOffset, endOffset } = anchor;
  const range = document.createRange();
  try {
    range.setStart(node, startOffset);
    range.setEnd(node, endOffset);
  } catch {
    closeMentionCompleter();
    return;
  }
  range.deleteContents();
  const a = document.createElement('a');
  a.className = 'mention';
  a.setAttribute('href', '#');
  a.setAttribute('data-mention-type', item.type);
  a.setAttribute('data-mention-project', item.projectKey);
  a.setAttribute('data-mention-ref', item.refId);
  a.textContent = '@' + item.label;
  range.insertNode(a);
  const space = document.createTextNode(' ');
  if (a.parentNode) a.parentNode.insertBefore(space, a.nextSibling);
  const newRange = document.createRange();
  newRange.setStartAfter(space);
  newRange.collapse(true);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(newRange);
  closeMentionCompleter();
  // Trigger input event so dirty-tracking, autosave, etc. fire
  const editor = document.getElementById('note-content');
  if (editor) editor.dispatchEvent(new Event('input', { bubbles: true }));
}

function setupNoteEditorEvents() {
  ensureListPanelResizer();
  document.getElementById('btn-save-note')?.addEventListener('click', saveNote);
  document.getElementById('btn-archive-note')?.addEventListener('click', () => {
    if (!state.editingNote || state.editingNote === 'new') return;
    const proj = getProject();
    const note = (proj.notes || []).find(n => n.id === state.editingNote);
    if (!note) return;
    const isArchiving = !note.archived;
    setNoteArchived(state.editingNote, isArchiving);
    showToast(`Note ${isArchiving ? 'archived' : 'restored'}. Ctrl+Z to undo.`, 'info');
    if (isArchiving) state.editingNote = null;
    renderNotes();
  });
  document.getElementById('btn-delete-note')?.addEventListener('click', () => {
    if (!state.editingNote || state.editingNote === 'new') return;
    const proj = getProject();
    const note = (proj.notes || []).find(n => n.id === state.editingNote);
    if (!note) { deleteNote(); return; }
    showConfirmModal({
      title: `Delete "${(note.title || 'note').slice(0, 60)}"?`,
      body: 'This cannot be undone from the menu, but you can <strong>Ctrl+Z</strong> to restore. Tip: archive (📦) instead if you might want it back later.',
      confirmLabel: 'Delete',
      onConfirm: deleteNote
    });
  });
  document.getElementById('note-subproject')?.addEventListener('change', () => {
    if (state.editingNote && state.editingNote !== 'new') {
      const proj = getProject();
      const note = proj.notes.find(n => n.id === state.editingNote);
      if (note) {
        note.subprojectId = document.getElementById('note-subproject').value || null;
        note.updated = new Date().toISOString();
        saveData();
        const sp = (proj.subprojects || []).find(s => s.id === note.subprojectId);
        showToast(sp ? `Moved to "${sp.name}"` : 'Subproject cleared', 'success');
      }
    }
  });
  bindAttachmentPanel(document.getElementById('note-editor'), renderNotes);
  decorateMentions(document.getElementById('note-content'));
  document.querySelectorAll('[data-backlink-note]').forEach(btn =>
    btn.addEventListener('click', () => {
      const projKey = btn.dataset.backlinkProject;
      if (projKey && projKey !== state.project) switchProject(projKey);
      state.editingNote = btn.dataset.backlinkNote;
      showView('notes');
    }));
  const editorRoot = document.getElementById('note-editor');
  if (editorRoot) {
    editorRoot.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        e.stopPropagation();
        saveNote();
      }
    });
  }
  const richEditor = document.getElementById('note-content');
  if (richEditor) {
    richEditor.addEventListener('input', () => {
      const anchor = findCaretMention();
      if (anchor) openMentionCompleter(anchor);
      else closeMentionCompleter();
    });
    richEditor.addEventListener('keydown', (e) => {
      if (!mentionState.open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        mentionState.activeIdx = Math.min(mentionState.results.length - 1, mentionState.activeIdx + 1);
        renderMentionMenu();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        mentionState.activeIdx = Math.max(0, mentionState.activeIdx - 1);
        renderMentionMenu();
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (mentionState.results.length) {
          e.preventDefault();
          insertMentionFromCompleter();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeMentionCompleter();
      }
    });
    richEditor.addEventListener('blur', () => {
      // Slight delay so click handlers on the menu can fire first
      setTimeout(() => closeMentionCompleter(), 150);
    });
  }
  document.querySelectorAll('#note-rtf-toolbar [data-rtf]').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => {
      const editor = document.getElementById('note-content');
      if (!editor) return;
      editor.focus();
      const cmd = btn.dataset.rtf;
      try {
        if (cmd === 'formatBlock-h2') document.execCommand('formatBlock', false, 'h2');
        else document.execCommand(cmd, false, null);
      } catch {}
    });
  });
  installRichEditorPaste(document.getElementById('note-content'));
}

function saveNote() {
  const title = document.getElementById('note-title').value.trim();
  if (!title) { showToast('Please enter a note title.', 'error'); return; }
  const contentEl = document.getElementById('note-content');
  const content = contentEl ? (contentEl.innerHTML || '').trim() : '';
  const priority    = document.getElementById('note-priority').value;
  const tagsRaw     = document.getElementById('note-tags').value;
  const tags        = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  const subprojectId = document.getElementById('note-subproject').value || null;
  const linkedTodos = [...document.querySelectorAll('.linked-todo-checkbox:checked')].map(cb => cb.value);

  const proj = getProject();
  const now = new Date().toISOString();

  if (state.editingNote === 'new') {
    const note = { id: generateId('note'), title, content, priority, tags, subprojectId, linkedTodos, created: now, updated: now };
    proj.notes.unshift(note);
    state.editingNote = note.id;
    showToast('Note created.', 'success');
  } else {
    const note = proj.notes.find(n => n.id === state.editingNote);
    if (note) Object.assign(note, { title, content, priority, tags, subprojectId, linkedTodos, updated: now });
    showToast('Note saved.', 'success');
  }
  saveData();
  renderNotes();
}

function deleteNote() {
  if (!state.editingNote || state.editingNote === 'new') return;
  const proj = getProject();
  const deletedId = state.editingNote;
  proj.notes = proj.notes.filter(n => n.id !== deletedId);
  cleanupNodeLinksOnEntityDelete(state.project, 'note', deletedId);
  state.editingNote = null;
  saveData();
  showToast('Note deleted.', 'info');
  renderNotes();
}

// ===== TODOS =====
// ===== BULK ACTIONS ON TODOS =====
function bulkActionBarHTML(visibleTodos) {
  if (!(state.selectedTodos instanceof Set)) state.selectedTodos = new Set();
  // Drop ids that no longer exist in current project's visible set
  const visibleIds = new Set((visibleTodos || []).map(t => t.id));
  for (const id of state.selectedTodos) {
    if (!visibleIds.has(id)) state.selectedTodos.delete(id);
  }
  const n = state.selectedTodos.size;
  if (n === 0) return '';
  const proj = getProject();
  const sps = proj?.subprojects || [];
  return `<div class="bulk-bar">
    <div class="bulk-bar-count">${n} selected</div>
    <div class="bulk-bar-actions">
      <button class="btn btn-primary btn-sm" data-bulk="done">✓ Mark done</button>
      <select class="form-select form-select-sm" id="bulk-priority" title="Set priority for all selected">
        <option value="">Priority…</option>
        <option value="high">🔴 High</option>
        <option value="medium">🟡 Medium</option>
        <option value="low">🟢 Low</option>
      </select>
      ${sps.length ? `<select class="form-select form-select-sm" id="bulk-subproject" title="Move to subproject">
        <option value="">Subproject…</option>
        <option value="__none__">— No subproject</option>
        ${sps.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('')}
      </select>` : ''}
      <button class="btn btn-secondary btn-sm" data-bulk="due">📅 Set due…</button>
      <button class="btn btn-secondary btn-sm" data-bulk="snooze">⏰ +1 day</button>
      <button class="btn btn-secondary btn-sm" data-bulk="archive">📦 ${state.todoFilter === 'archived' ? 'Restore' : 'Archive'}</button>
      <button class="btn btn-secondary btn-sm" data-bulk="delete" style="color:#dc2626">✕ Delete</button>
      <button class="btn btn-ghost btn-sm" data-bulk="select-all">${state.selectedTodos.size === (visibleTodos || []).length ? 'Deselect all' : 'Select all'}</button>
      <button class="btn btn-ghost btn-sm" data-bulk="clear">Clear</button>
    </div>
  </div>`;
}

function bulkSelectedTodoObjects() {
  const proj = getProject();
  if (!proj) return [];
  return (proj.todos || []).filter(t => state.selectedTodos.has(t.id));
}

function bulkActionDone() {
  const todos = bulkSelectedTodoObjects();
  if (!todos.length) return;
  const now = new Date().toISOString();
  todos.forEach(t => {
    if (t.done) return;
    t.done = true;
    t.completedAt = now;
    if (t.recurrence) {
      try { spawnNextRecurringTodo(t); } catch {}
    }
  });
  state.selectedTodos.clear();
  saveData();
  showToast(`Marked ${todos.length} todo${todos.length === 1 ? '' : 's'} done.`, 'success');
  renderApp();
}

function bulkActionSetPriority(priority) {
  if (!['high','medium','low'].includes(priority)) return;
  const todos = bulkSelectedTodoObjects();
  if (!todos.length) return;
  todos.forEach(t => { t.priority = priority; });
  saveData();
  showToast(`Set ${todos.length} todo${todos.length === 1 ? '' : 's'} to ${priority}.`, 'success');
  renderApp();
}

function bulkActionSetSubproject(spValue) {
  const todos = bulkSelectedTodoObjects();
  if (!todos.length) return;
  const newSp = spValue === '__none__' ? null : spValue;
  todos.forEach(t => { t.subprojectId = newSp; });
  saveData();
  showToast(`Moved ${todos.length} todo${todos.length === 1 ? '' : 's'}.`, 'success');
  renderApp();
}

function bulkActionSnooze() {
  const todos = bulkSelectedTodoObjects();
  if (!todos.length) return;
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toDateString(tomorrow);
  todos.forEach(t => {
    if (!t.dueDate) return;
    const oldDue = new Date(t.dueDate);
    const delta = Math.round((tomorrow - oldDue) / 86400000);
    t.dueDate = tomorrowStr;
    if (t.startDate && delta) {
      const s = new Date(t.startDate);
      s.setDate(s.getDate() + delta);
      t.startDate = toDateString(s);
    }
  });
  saveData();
  showToast(`Pushed ${todos.length} todo${todos.length === 1 ? '' : 's'} to tomorrow.`, 'success');
  renderApp();
}

function bulkActionSetDue() {
  const todos = bulkSelectedTodoObjects();
  if (!todos.length) return;
  const overlay = document.getElementById('modal-overlay');
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  overlay.innerHTML = `
    <div class="modal dates-modal">
      <h3>Set due date for ${todos.length} todo${todos.length === 1 ? '' : 's'}</h3>
      <div class="form-group" style="margin-bottom:14px">
        <label class="form-label">Due date</label>
        <input type="date" id="bulk-due-input" class="form-input">
      </div>
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="bulk-due-cancel">Cancel</button>
        <button class="btn" id="bulk-due-clear" style="margin-right:auto">Clear due dates</button>
        <button class="btn btn-primary" id="bulk-due-ok">Apply</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  const inp = document.getElementById('bulk-due-input');
  inp.focus();
  document.getElementById('bulk-due-cancel').onclick = close;
  document.getElementById('bulk-due-clear').onclick = () => {
    todos.forEach(t => { t.dueDate = null; t.startDate = null; });
    saveData();
    close();
    showToast(`Cleared due date on ${todos.length} todo${todos.length === 1 ? '' : 's'}.`, 'success');
    renderApp();
  };
  document.getElementById('bulk-due-ok').onclick = () => {
    const v = inp.value;
    if (!v) { inp.focus(); return; }
    todos.forEach(t => { t.dueDate = v; });
    saveData();
    close();
    showToast(`Due date set on ${todos.length} todo${todos.length === 1 ? '' : 's'}.`, 'success');
    renderApp();
  };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function bulkActionArchive() {
  const todos = bulkSelectedTodoObjects();
  if (!todos.length) return;
  // If we're already viewing archived items, the action restores instead.
  const restoring = state.todoFilter === 'archived';
  const now = new Date().toISOString();
  todos.forEach(t => {
    t.archived = !restoring;
    if (restoring) delete t.archivedAt;
    else t.archivedAt = now;
  });
  state.selectedTodos.clear();
  saveData();
  showToast(`${restoring ? 'Restored' : 'Archived'} ${todos.length} todo${todos.length === 1 ? '' : 's'}.`, 'success');
  renderApp();
}

function bulkActionDelete() {
  const todos = bulkSelectedTodoObjects();
  if (!todos.length) return;
  const overlay = document.getElementById('modal-overlay');
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  overlay.innerHTML = `
    <div class="modal new-project-modal">
      <h3>Delete ${todos.length} todo${todos.length === 1 ? '' : 's'}?</h3>
      <p style="font-size:13px; color:var(--text-secondary); line-height:1.5; margin:8px 0 14px">
        This cannot be undone from the menu, but you can <strong>Ctrl+Z</strong> to restore.
      </p>
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="bulk-del-cancel">Cancel</button>
        <button class="btn" id="bulk-del-ok" style="background:#dc2626; color:white; border-color:#dc2626">Delete ${todos.length}</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  document.getElementById('bulk-del-cancel').onclick = close;
  document.getElementById('bulk-del-ok').onclick = () => {
    const proj = getProject();
    const idsToDelete = new Set(state.selectedTodos);
    proj.todos = (proj.todos || []).filter(t => !idsToDelete.has(t.id));
    state.selectedTodos.clear();
    close();
    saveData();
    showToast(`Deleted ${idsToDelete.size} todo${idsToDelete.size === 1 ? '' : 's'}. Ctrl+Z to undo.`, 'info');
    renderApp();
  };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function renderTodos() {
  const proj = getProject();
  const f = state.todoFilter;
  const pf = state.todoPriorityFilter;
  const spf = state.todoSubprojectFilter;
  const subprojects = proj.subprojects || [];

  if (spf !== 'all' && spf !== 'none' && !subprojects.some(s => s.id === spf)) {
    state.todoSubprojectFilter = 'all';
  }

  const spOrderMap = Object.fromEntries((proj.subprojects || []).map((s, i) => [s.id, i]));
  const filteredRaw = proj.todos.filter(t => {
    // Archived view shows ONLY archived items; every other view excludes them.
    if (f === 'archived') {
      if (!t.archived) return false;
    } else {
      if (t.archived) return false;
      if (f === 'active' && t.done) return false;
      if (f === 'done' && !t.done) return false;
    }
    if (pf !== 'all' && t.priority !== pf) return false;
    if (spf === 'none' && t.subprojectId) return false;
    if (spf !== 'all' && spf !== 'none' && t.subprojectId !== spf) return false;
    return true;
  });
  const todayStr = toDateString(new Date());
  const isFutureRecurring = (t) => !!t.recurrence && !t.done && !!t.dueDate && t.dueDate > todayStr;
  const isFutureRueckbucher = (t) => t.kind === 'rueckbucher' && !t.done && !!t.dueDate && t.dueDate > todayStr;
  const futureRecurring = sortTodosByStatus(filteredRaw.filter(isFutureRecurring), { sortBy: state.todoSortBy, spOrder: spOrderMap });
  const futureRueckbucher = sortTodosByStatus(filteredRaw.filter(t => !isFutureRecurring(t) && isFutureRueckbucher(t)), { sortBy: state.todoSortBy, spOrder: spOrderMap });
  const filtered = sortTodosByStatus(filteredRaw.filter(t => !isFutureRecurring(t) && !isFutureRueckbucher(t)), { sortBy: state.todoSortBy, spOrder: spOrderMap });
  const showRueckbucherBtn = state.project === 'energy-hero' && isRueckbucherButtonEnabled();
  const recurringCollapsed = isRecurringBoxCollapsed();
  const rueckbucherCollapsed = isRueckbucherBoxCollapsed();

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-todos">
      <div class="view-header">
        <div class="view-header-row"><div class="view-title">Todos</div></div>
      </div>
      ${bulkActionBarHTML(filtered)}
      <div class="view-body-scrollable">
        <div class="todo-add-form">
          <div class="todo-add-row1">
            <div class="todo-input-wrap">
              <div class="todo-input-ghost" id="todo-input-ghost" aria-hidden="true"></div>
              <input type="text" class="form-input todo-input" id="todo-input" placeholder="New todo… try /tomorrow /high /sp:name" autocomplete="off" spellcheck="false">
            </div>
            <button class="btn btn-ghost btn-sm" id="btn-todo-slash-help" type="button" title="Slash command reference">/?</button>
            <button class="btn btn-primary" id="btn-add-todo">Add</button>
          </div>
          <div class="todo-slash-chips" id="todo-slash-chips" hidden></div>
          <div class="todo-add-row2">
            <select class="form-select" id="todo-priority">
              <option value="high">🔴 High</option>
              <option value="medium" selected>🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
            <select class="form-select" id="todo-subproject">
              <option value="">No subproject</option>
              ${subprojects.map(s => `<option value="${s.id}">${escapeHTML(s.name)}</option>`).join('')}
            </select>
            <label class="date-field"><span>Start</span><input type="date" class="form-input" id="todo-start"></label>
            <label class="date-field"><span>Due</span><input type="date" class="form-input" id="todo-due"></label>
            <button class="btn btn-ghost btn-sm todo-add-recur ${state.pendingTodoRecurrence?'active':''}" id="btn-add-todo-recur" title="${state.pendingTodoRecurrence ? describeRecurrence(state.pendingTodoRecurrence) : 'Set recurrence'}">
              🔁 ${state.pendingTodoRecurrence ? escapeHTML(describeRecurrence(state.pendingTodoRecurrence)) : 'Repeat'}
            </button>
            ${showRueckbucherBtn ? `<button class="btn btn-secondary btn-sm" id="btn-spawn-rueckbucher" title="Spawn 3 Rückbucher follow-ups: +7 days, +14 days, +14 days + 3 workdays">↻ Rückbucher</button>` : ''}
          </div>
        </div>
        <div class="todo-filters">
          ${(() => {
            const visible = proj.todos.filter(t => !t.archived);
            const archivedCount = proj.todos.filter(t => t.archived).length;
            const filters = [
              { id: 'all',      label: 'All',      count: visible.length },
              { id: 'active',   label: 'Active',   count: visible.filter(t => !t.done).length },
              { id: 'done',     label: 'Done',     count: visible.filter(t =>  t.done).length },
            ];
            if (archivedCount > 0) filters.push({ id: 'archived', label: '📦 Archived', count: archivedCount });
            return filters.map(ff => `
              <button class="filter-btn ${f===ff.id?'active':''}" data-filter="${ff.id}">
                ${ff.label}
                <span style="opacity:0.7;margin-left:4px">${ff.count}</span>
              </button>`).join('');
          })()}
          <div class="todo-filter-spacer"></div>
          <select class="form-select todo-filter-select" id="todo-sort-by" title="Sort open todos by">
            <option value="priority" ${state.todoSortBy==='priority'?'selected':''}>⇅ Priority</option>
            <option value="due" ${state.todoSortBy==='due'?'selected':''}>⇅ Due date</option>
            <option value="subproject" ${state.todoSortBy==='subproject'?'selected':''}>⇅ Subproject</option>
          </select>
          <select class="form-select todo-filter-select" id="todo-filter-priority" title="Filter by priority">
            <option value="all" ${pf==='all'?'selected':''}>All priorities</option>
            <option value="high" ${pf==='high'?'selected':''}>🔴 High</option>
            <option value="medium" ${pf==='medium'?'selected':''}>🟡 Medium</option>
            <option value="low" ${pf==='low'?'selected':''}>🟢 Low</option>
          </select>
          <select class="form-select todo-filter-select" id="todo-filter-subproject" title="Filter by subproject">
            <option value="all" ${spf==='all'?'selected':''}>All subprojects</option>
            <option value="none" ${spf==='none'?'selected':''}>No subproject</option>
            ${subprojects.map(s => `<option value="${s.id}" ${spf===s.id?'selected':''}>${escapeHTML(s.name)}</option>`).join('')}
          </select>
          ${(pf!=='all' || spf!=='all') ? `<button class="btn btn-ghost btn-sm" id="btn-clear-todo-filters" title="Clear filters">Clear</button>` : ''}
        </div>
        <div id="todos-area">
          ${futureRecurring.length ? `
            <div class="todo-recurring-box ${recurringCollapsed?'collapsed':''}">
              <div class="todo-recurring-box-header">
                <button class="todo-box-toggle" id="btn-toggle-recurring-box" title="${recurringCollapsed?'Expand':'Collapse'}">${recurringCollapsed?'▸':'▾'}</button>
                <span class="todo-recurring-box-title">🔁 Recurring — upcoming</span>
                <span class="todo-recurring-box-count">${futureRecurring.length}</span>
                <span class="todo-recurring-box-hint">Moves to the main list once due date is reached</span>
              </div>
              ${recurringCollapsed ? '' : `<div class="todo-list todo-recurring-list">
                ${futureRecurring.map(t => todoItemHTML(t)).join('')}
              </div>`}
            </div>` : ''}
          ${futureRueckbucher.length ? `
            <div class="todo-recurring-box todo-rueckbucher-box ${rueckbucherCollapsed?'collapsed':''}">
              <div class="todo-recurring-box-header">
                <button class="todo-box-toggle" id="btn-toggle-rueckbucher-box" title="${rueckbucherCollapsed?'Expand':'Collapse'}">${rueckbucherCollapsed?'▸':'▾'}</button>
                <span class="todo-recurring-box-title">↻ Rückbucher — follow-ups</span>
                <span class="todo-recurring-box-count">${futureRueckbucher.length}</span>
                <span class="todo-recurring-box-hint">Moves to the main list once due date is reached</span>
              </div>
              ${rueckbucherCollapsed ? '' : `<div class="todo-list todo-recurring-list">
                ${futureRueckbucher.map(t => todoItemHTML(t)).join('')}
              </div>`}
            </div>` : ''}
          <div class="todo-list" id="todo-list">
            ${filtered.length
              ? filtered.map(t => todoItemHTML(t)).join('')
              : `<div class="empty-state" style="padding:20px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border)">
                  ${f==='done' ? 'Nothing done yet — keep going!' : ((futureRecurring.length || futureRueckbucher.length) ? 'Nothing due yet — upcoming follow-ups are above.' : 'No todos here. Add one above.')}</div>`}
          </div>
        </div>
      </div>
    </div>`;

  document.getElementById('btn-add-todo').onclick = addTodo;
  const todoInputEl = document.getElementById('todo-input');
  // Slash-command UX: ghost completion + Tab-accept + live chips + real-time
  // sync of the form fields (priority/due/start/subproject) below the input.
  // Single shared helper drives both this view and the spark-map detail panel.
  installTodoSlashCompletion(
    todoInputEl,
    document.getElementById('todo-input-ghost'),
    document.getElementById('todo-slash-chips'),
    {
      priority:   document.getElementById('todo-priority'),
      due:        document.getElementById('todo-due'),
      start:      document.getElementById('todo-start'),
      subproject: document.getElementById('todo-subproject')
    }
  );
  todoInputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTodo();
  });
  document.getElementById('btn-todo-slash-help')?.addEventListener('click', openTodoSlashHelp);
  document.getElementById('btn-add-todo-recur')?.addEventListener('click', openPendingRecurrenceEditor);
  document.getElementById('btn-spawn-rueckbucher')?.addEventListener('click', () => {
    spawnRueckbucherFollowups();
    renderTodos();
  });
  document.getElementById('btn-toggle-recurring-box')?.addEventListener('click', () => {
    setRecurringBoxCollapsed(!isRecurringBoxCollapsed());
    renderTodos();
  });
  document.getElementById('btn-toggle-rueckbucher-box')?.addEventListener('click', () => {
    setRueckbucherBoxCollapsed(!isRueckbucherBoxCollapsed());
    renderTodos();
  });
  document.querySelectorAll('.filter-btn').forEach(b =>
    b.addEventListener('click', () => { state.todoFilter = b.dataset.filter; renderTodos(); }));
  document.getElementById('todo-sort-by')?.addEventListener('change', e => {
    state.todoSortBy = e.target.value;
    renderTodos();
  });
  document.getElementById('todo-filter-priority')?.addEventListener('change', e => {
    state.todoPriorityFilter = e.target.value;
    renderTodos();
  });
  document.getElementById('todo-filter-subproject')?.addEventListener('change', e => {
    state.todoSubprojectFilter = e.target.value;
    renderTodos();
  });
  document.getElementById('btn-clear-todo-filters')?.addEventListener('click', () => {
    state.todoPriorityFilter = 'all';
    state.todoSubprojectFilter = 'all';
    renderTodos();
  });
  bindTodoRowEvents('#todos-area', renderTodos, 'todos');
  document.body.classList.toggle('todos-has-selection', state.selectedTodos.size > 0);

  // Bulk action bar wiring
  document.querySelectorAll('[data-bulk]').forEach(btn =>
    btn.addEventListener('click', () => {
      const a = btn.dataset.bulk;
      if (a === 'done')        bulkActionDone();
      else if (a === 'snooze') bulkActionSnooze();
      else if (a === 'due')    bulkActionSetDue();
      else if (a === 'archive') bulkActionArchive();
      else if (a === 'delete') bulkActionDelete();
      else if (a === 'clear')  { state.selectedTodos.clear(); renderTodos(); }
      else if (a === 'select-all') {
        if (state.selectedTodos.size === filtered.length) state.selectedTodos.clear();
        else filtered.forEach(t => state.selectedTodos.add(t.id));
        renderTodos();
      }
    }));
  document.getElementById('bulk-priority')?.addEventListener('change', (e) => {
    if (e.target.value) {
      bulkActionSetPriority(e.target.value);
      e.target.value = '';
    }
  });
  document.getElementById('bulk-subproject')?.addEventListener('change', (e) => {
    if (e.target.value) {
      bulkActionSetSubproject(e.target.value);
      e.target.value = '';
    }
  });
}

function bindTodoRowEvents(scopeSelector, onRefresh, toggleFrom) {
  const scope = document.querySelector(scopeSelector);
  if (!scope) return;
  toggleFrom = toggleFrom || 'todos';
  // Bulk-select toggle on each row
  scope.querySelectorAll('.todo-bulk-select').forEach(el =>
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = el.dataset.bulkId;
      if (state.selectedTodos.has(id)) state.selectedTodos.delete(id);
      else state.selectedTodos.add(id);
      renderTodos();
    }));
  scope.querySelectorAll('.todo-checkbox').forEach(cb =>
    cb.addEventListener('click', () => toggleTodoFrom(cb.dataset.id, toggleFrom)));
  scope.querySelectorAll('.todo-archive').forEach(b =>
    b.addEventListener('click', () => {
      const proj = getProject();
      const t = (proj.todos || []).find(x => x.id === b.dataset.id);
      if (!t) return;
      const isArchiving = !t.archived;
      setTodoArchived(b.dataset.id, isArchiving);
      showToast(`Todo ${isArchiving ? 'archived' : 'restored'}. Ctrl+Z to undo.`, 'info');
      renderApp();
    }));
  scope.querySelectorAll('.todo-delete').forEach(b =>
    b.addEventListener('click', () => {
      const proj = getProject();
      const t = (proj.todos || []).find(x => x.id === b.dataset.id);
      if (!t) return;
      // Done or archived todos delete instantly (already "out of the way"); active todos confirm.
      if (t.done || t.archived) { deleteTodo(b.dataset.id); return; }
      showConfirmModal({
        title: `Delete "${(t.title || '').slice(0, 60)}"?`,
        body: 'This cannot be undone from the menu, but you can <strong>Ctrl+Z</strong> to restore. Tip: archive (📦) instead if you might want it back later.',
        confirmLabel: 'Delete',
        onConfirm: () => deleteTodo(b.dataset.id)
      });
    }));
  scope.querySelectorAll('.todo-attachments').forEach(b =>
    b.addEventListener('click', () => showTodoAttachmentsModal(b.dataset.id)));
  scope.querySelectorAll('.todo-recurrence').forEach(b =>
    b.addEventListener('click', () => showRecurrenceModal(b.dataset.id)));
  scope.querySelectorAll('.todo-dates').forEach(b =>
    b.addEventListener('click', () => showTodoDatesModal(b.dataset.id)));
  scope.querySelectorAll('.todo-to-note').forEach(b =>
    b.addEventListener('click', () => convertTodoToNote(b.dataset.id)));
  scope.querySelectorAll('.todo-priority-select').forEach(sel =>
    sel.addEventListener('change', () => { if (setTodoPriority(sel.dataset.id, sel.value)) onRefresh(); }));
  scope.querySelectorAll('.todo-sp-select').forEach(sel => {
    sel.addEventListener('click', e => e.stopPropagation());
    sel.addEventListener('change', () => {
      if (setTodoSubproject(sel.dataset.id, sel.value)) onRefresh();
    });
  });
  scope.querySelectorAll('.todo-project-select').forEach(sel => {
    sel.addEventListener('click', e => e.stopPropagation());
    sel.addEventListener('change', () => {
      const proj = state.data.projects[sel.value];
      if (moveTodoToProject(sel.dataset.id, sel.value)) {
        showToast(`Moved to "${proj.name}"`, 'success');
        onRefresh();
      }
    });
  });
  scope.querySelectorAll('.todo-expand').forEach(b =>
    b.addEventListener('click', () => {
      if (!state.expandedTodos) state.expandedTodos = new Set();
      const id = b.dataset.expandId;
      if (state.expandedTodos.has(id)) state.expandedTodos.delete(id);
      else state.expandedTodos.add(id);
      onRefresh();
    }));
  scope.querySelectorAll('.todo-step-checkbox').forEach(cb =>
    cb.addEventListener('click', () => { if (toggleTodoStep(cb.dataset.todoId, cb.dataset.stepId)) onRefresh(); }));
  scope.querySelectorAll('.todo-step-delete').forEach(b =>
    b.addEventListener('click', () => { if (deleteTodoStep(b.dataset.todoId, b.dataset.stepId)) onRefresh(); }));
  scope.querySelectorAll('.todo-step-title').forEach(el => {
    const original = el.textContent;
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); el.textContent = original; el.blur(); }
    });
    el.addEventListener('blur', () => {
      if (updateTodoStepTitle(el.dataset.todoId, el.dataset.stepId, el.textContent)) onRefresh();
      else el.textContent = original;
    });
  });
  scope.querySelectorAll('.todo-step-input').forEach(inp =>
    inp.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (addTodoStep(inp.dataset.todoId, inp.value)) { inp.value = ''; onRefresh(); }
    }));
  bindEditableTodoTitles(scopeSelector, onRefresh);
}

function todoItemHTML(t) {
  const proj = getProject();
  const overdue = t.dueDate && !t.done && isOverdue(t.dueDate);
  const sps = proj.subprojects || [];
  const sp = sps.find(s => s.id === t.subprojectId);
  const linkedNotes = getNotesLinkedToTodo(t.id);
  const dateRange = t.startDate && t.dueDate
    ? `${formatDate(t.startDate)} → ${formatDate(t.dueDate)}`
    : t.dueDate ? `Due ${formatDate(t.dueDate)}` : '';
  const projectEntries = Object.entries(state.data.projects);
  const spStyle = sp
    ? `background:${sp.color}22;color:${sp.color};border-color:${sp.color}44`
    : `background:transparent;color:#94a3b8;border-color:#cbd5e1`;
  const steps = t.steps || [];
  const stepsDone = steps.filter(s => s.done).length;
  const expanded = state.expandedTodos?.has(t.id);

  const isSelected = state.selectedTodos.has(t.id);
  return `<div class="todo-card ${expanded?'expanded':''} ${overdue?'overdue':''} ${isSelected?'bulk-selected':''} ${t.archived?'archived':''}" data-todo-id="${t.id}">
    <div class="todo-item ${t.done?'done':''}">
      <span class="todo-bulk-select ${isSelected?'on':''}" data-bulk-id="${t.id}" title="Select for bulk actions">${isSelected?'✓':''}</span>
      <button class="todo-expand ${expanded?'open':''}" data-expand-id="${t.id}" title="${steps.length?'Toggle steps':'Add steps'}">▸</button>
      <div class="todo-checkbox ${t.done?'checked':''}" data-id="${t.id}"></div>
      <span class="todo-title" contenteditable="true" spellcheck="false" data-id="${t.id}" title="Click to edit">${escapeHTML(t.title)}</span>
      ${steps.length ? `<span class="todo-steps-count" title="${stepsDone} of ${steps.length} steps done">${stepsDone}/${steps.length}</span>` : ''}
      ${priorityBadgeEditable(t.id, t.priority)}
      ${sps.length ? `
        <select class="todo-sp-select" data-id="${t.id}" title="Change subproject" style="${spStyle}">
          <option value="" ${!sp?'selected':''}>No subproject</option>
          ${sps.map(s => `<option value="${s.id}" ${s.id===t.subprojectId?'selected':''}>${escapeHTML(s.name)}</option>`).join('')}
        </select>` : ''}
      ${dateRange ? `<button class="todo-due todo-dates ${overdue?'overdue':''}" data-id="${t.id}" title="Edit timeline">${overdue?'⚠ ':''}${dateRange}</button>` : `<button class="btn btn-ghost btn-icon todo-dates" data-id="${t.id}" title="Set timeline">📅</button>`}
      ${linkedNotes.length ? `<span class="linked-notes-chip" title="Linked: ${linkedNotes.map(n=>n.title).join(', ')}">📝 ${linkedNotes.length}</span>` : ''}
      ${genericLinksChip('todo', t.id)}
      ${projectEntries.length > 1 ? `
        <select class="todo-project-select" data-id="${t.id}" title="Move to project" style="border-color:${proj.color || '#16a34a'};color:${proj.color || '#16a34a'}">
          ${projectEntries.map(([key, p]) => `<option value="${key}" ${key===state.project?'selected':''}>${escapeHTML(p.name)}</option>`).join('')}
        </select>` : ''}
      <button class="btn btn-ghost btn-icon todo-attachments" data-id="${t.id}" title="Attachments${(t.attachments||[]).length?` (${(t.attachments||[]).length})`:''}">📎${(t.attachments||[]).length?`<span class="todo-att-count">${t.attachments.length}</span>`:''}</button>
      <button class="btn btn-ghost btn-icon todo-recurrence ${t.recurrence?'active':''}" data-id="${t.id}" title="${t.recurrence ? describeRecurrence(t.recurrence) : 'Set recurrence'}">🔁</button>
      ${pinToggleButtonHTML('todo', state.project, t.id, 'btn btn-ghost btn-icon')}
      <button class="btn btn-ghost btn-sm todo-to-note" data-id="${t.id}" title="Convert to note">→ Note</button>
      <button class="btn btn-ghost btn-icon todo-archive" data-id="${t.id}" title="${t.archived ? 'Restore from archive' : 'Archive'}">${t.archived ? '↺' : '📦'}</button>
      <button class="btn btn-ghost btn-icon todo-delete" data-id="${t.id}" title="Delete">✕</button>
    </div>
    ${expanded ? todoStepsPanelHTML(t) : ''}
    ${expanded ? backlinksPanelHTML('todo', state.project, t.id) : ''}
  </div>`;
}

function todoStepsPanelHTML(t) {
  const steps = t.steps || [];
  return `<div class="todo-steps-panel">
    ${steps.map(s => `
      <div class="todo-step ${s.done?'done':''}">
        <div class="todo-step-checkbox ${s.done?'checked':''}" data-todo-id="${t.id}" data-step-id="${s.id}"></div>
        <span class="todo-step-title" contenteditable="true" spellcheck="false" data-todo-id="${t.id}" data-step-id="${s.id}">${escapeHTML(s.title)}</span>
        <button class="todo-step-delete" data-todo-id="${t.id}" data-step-id="${s.id}" title="Remove">✕</button>
      </div>`).join('')}
    <div class="todo-step-add">
      <span class="todo-step-add-icon">+</span>
      <input type="text" class="todo-step-input" data-todo-id="${t.id}" placeholder="Add step…">
    </div>
  </div>`;
}

// ===== RECURRENCE =====
const WEEKDAY_LABELS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const NTH_LABELS = { '1':'first', '2':'second', '3':'third', '4':'fourth', '-1':'last' };

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nthWeekdayOfMonth(year, month, nth, weekday) {
  if (nth === -1) {
    const last = new Date(year, month + 1, 0);
    const diff = (last.getDay() - weekday + 7) % 7;
    last.setDate(last.getDate() - diff);
    return last;
  }
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const date = 1 + offset + (nth - 1) * 7;
  const result = new Date(year, month, date);
  if (result.getMonth() !== month) return null;
  return result;
}

function computeNextOccurrence(rule, fromDate) {
  if (!rule) return null;
  const d = new Date(fromDate);
  d.setHours(0, 0, 0, 0);
  const n = Math.max(1, parseInt(rule.interval) || 1);

  switch (rule.type) {
    case 'daily': {
      d.setDate(d.getDate() + n);
      return d;
    }
    case 'weekly': {
      const days = (rule.weekdays && rule.weekdays.length)
        ? [...rule.weekdays].sort((a,b) => a - b)
        : [d.getDay()];
      const cur = d.getDay();
      const later = days.find(x => x > cur);
      if (later != null && n === 1) {
        const next = new Date(d);
        next.setDate(d.getDate() + (later - cur));
        return next;
      }
      const next = new Date(d);
      next.setDate(d.getDate() + (7 * n) - cur + days[0]);
      return next;
    }
    case 'monthly-date': {
      const day = rule.monthDay || d.getDate();
      const next = new Date(d);
      next.setDate(1);
      next.setMonth(next.getMonth() + n);
      const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(day, lastDay));
      return next;
    }
    case 'monthly-nth': {
      const next = new Date(d.getFullYear(), d.getMonth() + n, 1);
      return nthWeekdayOfMonth(next.getFullYear(), next.getMonth(), rule.nthWeek, rule.nthWeekday) || next;
    }
    case 'yearly': {
      const next = new Date(d);
      next.setFullYear(d.getFullYear() + n);
      return next;
    }
  }
  return null;
}

function computeFirstUpcomingOccurrence(rule, fromDate) {
  if (!rule) return null;
  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);

  switch (rule.type) {
    case 'daily':
      return new Date(today);
    case 'weekly': {
      const days = (rule.weekdays && rule.weekdays.length)
        ? [...rule.weekdays].sort((a,b) => a - b)
        : [today.getDay()];
      const cur = today.getDay();
      const same = days.find(x => x >= cur);
      if (same != null) {
        const d = new Date(today);
        d.setDate(today.getDate() + (same - cur));
        return d;
      }
      const d = new Date(today);
      d.setDate(today.getDate() + (7 - cur) + days[0]);
      return d;
    }
    case 'monthly-date': {
      const day = rule.monthDay || 1;
      const lastDayThis = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), Math.min(day, lastDayThis));
      if (thisMonth >= today) return thisMonth;
      const nextMonthFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const lastDayNext = new Date(nextMonthFirst.getFullYear(), nextMonthFirst.getMonth() + 1, 0).getDate();
      nextMonthFirst.setDate(Math.min(day, lastDayNext));
      return nextMonthFirst;
    }
    case 'monthly-nth': {
      const thisMonth = nthWeekdayOfMonth(today.getFullYear(), today.getMonth(), rule.nthWeek, rule.nthWeekday);
      if (thisMonth && thisMonth >= today) return thisMonth;
      const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      return nthWeekdayOfMonth(next.getFullYear(), next.getMonth(), rule.nthWeek, rule.nthWeekday) || next;
    }
    case 'yearly':
      return new Date(today);
  }
  return null;
}

function describeRecurrence(r) {
  if (!r) return '';
  const n = Math.max(1, parseInt(r.interval) || 1);
  switch (r.type) {
    case 'daily':
      return n === 1 ? 'Every day' : `Every ${n} days`;
    case 'weekly': {
      const days = (r.weekdays || []).slice().sort((a,b)=>a-b).map(d => WEEKDAY_LABELS_SHORT[d]).join(', ');
      if (n === 1) return days ? `Every week on ${days}` : 'Every week';
      return days ? `Every ${n} weeks on ${days}` : `Every ${n} weeks`;
    }
    case 'monthly-date':
      return (n === 1 ? 'Every month' : `Every ${n} months`) + ` on day ${r.monthDay}`;
    case 'monthly-nth':
      return (n === 1 ? 'Every month' : `Every ${n} months`) + ` on the ${NTH_LABELS[String(r.nthWeek)]} ${WEEKDAY_LABELS_SHORT[r.nthWeekday]}`;
    case 'yearly':
      return n === 1 ? 'Every year' : `Every ${n} years`;
  }
  return '';
}

/**
 * Spawn the next occurrence of a recurring reminder. Adds a new reminder
 * to the project's reminder list with the next datetime. Returns the new
 * reminder or null. Caller should saveData() afterwards.
 */
function spawnNextRecurringReminder(projectKey, r) {
  if (!r || !r.recurrence || !r.datetime) return null;
  const proj = state.data.projects[projectKey];
  if (!proj) return null;
  const baseDate = new Date(r.datetime);
  const nextDay = computeNextOccurrence(r.recurrence, baseDate);
  if (!nextDay) return null;
  // Preserve the original time-of-day on the new occurrence
  nextDay.setHours(baseDate.getHours(), baseDate.getMinutes(), 0, 0);
  const clone = {
    id: generateId('rem'),
    title: r.title,
    note: r.note || '',
    datetime: nextDay.toISOString(),
    fired: false,
    recurrence: { ...r.recurrence, weekdays: r.recurrence.weekdays ? [...r.recurrence.weekdays] : undefined }
  };
  proj.reminders.push(clone);
  return clone;
}

function spawnNextRecurringTodo(t) {
  if (!t || !t.recurrence) return null;
  const base = t.dueDate ? new Date(t.dueDate) : new Date();
  const next = computeNextOccurrence(t.recurrence, base);
  if (!next) return null;
  const clone = {
    id: generateId('todo'),
    title: t.title,
    done: false,
    priority: t.priority,
    subprojectId: t.subprojectId,
    startDate: null,
    dueDate: toDateString(next),
    created: new Date().toISOString(),
    attachments: [],
    steps: (t.steps || []).map(s => ({
      id: generateId('step'),
      title: s.title,
      done: false,
      created: new Date().toISOString()
    })),
    recurrence: { ...t.recurrence, weekdays: t.recurrence.weekdays ? [...t.recurrence.weekdays] : undefined }
  };
  if (t.startDate && t.dueDate) {
    const diffMs = new Date(t.dueDate) - new Date(t.startDate);
    if (!isNaN(diffMs)) {
      const newStart = new Date(next.getTime() - diffMs);
      clone.startDate = toDateString(newStart);
    }
  }
  getProject().todos.unshift(clone);
  return clone;
}

function openRecurrenceEditor({ title, initial, hasExisting, onSave, onRemove, onRestart }) {
  const overlay = document.getElementById('modal-overlay');
  const today = new Date();
  let draft = initial ? JSON.parse(JSON.stringify(initial)) : null;

  const presetDefault = (type) => {
    switch (type) {
      case 'daily':        return { type, interval: 1 };
      case 'weekly':       return { type, interval: 1, weekdays: [today.getDay()] };
      case 'monthly-date': return { type, interval: 1, monthDay: today.getDate() };
      case 'monthly-nth':  return { type, interval: 1, nthWeek: Math.min(4, Math.ceil(today.getDate() / 7)), nthWeekday: today.getDay() };
      case 'yearly':       return { type, interval: 1 };
    }
    return null;
  };

  const close = () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    overlay.onclick = null;
  };

  const render = () => {
    const type = draft?.type || 'none';
    const unit = { daily: 'days', weekly: 'weeks', 'monthly-date': 'months', 'monthly-nth': 'months', yearly: 'years' }[type] || '';
    const isMonthly = type === 'monthly-date' || type === 'monthly-nth';
    overlay.innerHTML = `
      <div class="modal recurrence-modal">
        <h3>Repeat — ${escapeHTML(title)}</h3>
        <div class="settings-label">Frequency</div>
        <div class="recur-presets">
          ${['none','daily','weekly','monthly','yearly'].map(p => {
            const active = (p === 'none' && type === 'none') ||
              (p === 'daily' && type === 'daily') ||
              (p === 'weekly' && type === 'weekly') ||
              (p === 'monthly' && isMonthly) ||
              (p === 'yearly' && type === 'yearly');
            const label = { none:'Never', daily:'Daily', weekly:'Weekly', monthly:'Monthly', yearly:'Yearly' }[p];
            return `<button class="recur-preset ${active?'selected':''}" data-preset="${p}">${label}</button>`;
          }).join('')}
        </div>
        ${type !== 'none' ? `
          <div class="recur-row">
            <span>Every</span>
            <input type="number" min="1" max="99" class="recur-interval" value="${draft.interval || 1}">
            <span>${unit}</span>
          </div>
          ${type === 'weekly' ? `
            <div class="settings-label">On these days</div>
            <div class="recur-weekdays">
              ${WEEKDAY_LABELS_SHORT.map((lbl, i) => `
                <button class="recur-day ${draft.weekdays?.includes(i)?'selected':''}" data-weekday="${i}">${lbl}</button>
              `).join('')}
            </div>` : ''}
          ${isMonthly ? `
            <div class="recur-row recur-month-mode">
              <label class="recur-radio">
                <input type="radio" name="monthly-mode" value="date" ${type==='monthly-date'?'checked':''}>
                On day
                <input type="number" min="1" max="31" class="recur-month-day" value="${draft.monthDay || 1}" ${type!=='monthly-date'?'disabled':''}>
              </label>
            </div>
            <div class="recur-row recur-month-mode">
              <label class="recur-radio">
                <input type="radio" name="monthly-mode" value="nth" ${type==='monthly-nth'?'checked':''}>
                On the
                <select class="recur-nth-week" ${type!=='monthly-nth'?'disabled':''}>
                  ${[[1,'First'],[2,'Second'],[3,'Third'],[4,'Fourth'],[-1,'Last']].map(([v,l]) => `<option value="${v}" ${draft.nthWeek==v?'selected':''}>${l}</option>`).join('')}
                </select>
                <select class="recur-nth-weekday" ${type!=='monthly-nth'?'disabled':''}>
                  ${WEEKDAY_LABELS_SHORT.map((lbl, i) => `<option value="${i}" ${draft.nthWeekday==i?'selected':''}>${lbl}</option>`).join('')}
                </select>
              </label>
            </div>` : ''}
          <div class="recur-preview">🔁 ${escapeHTML(describeRecurrence(draft))}</div>
        ` : '<div class="recur-preview recur-preview-muted">This todo will not repeat.</div>'}
        <div class="modal-buttons">
          ${hasExisting ? `<button class="btn btn-danger btn-sm" id="recur-remove" style="margin-right:auto">Remove</button>` : ''}
          ${draft && onRestart ? `<button class="btn btn-secondary btn-sm" id="recur-restart" title="Reset due date to the next upcoming occurrence from today">↺ Restart</button>` : ''}
          <button class="btn btn-secondary" id="recur-cancel">Cancel</button>
          <button class="btn btn-primary" id="recur-save">Save</button>
        </div>
      </div>`;

    overlay.querySelectorAll('[data-preset]').forEach(btn => btn.addEventListener('click', () => {
      const p = btn.dataset.preset;
      if (p === 'none') draft = null;
      else if (p === 'monthly') draft = presetDefault('monthly-date');
      else draft = presetDefault(p);
      render();
    }));

    const intervalInput = overlay.querySelector('.recur-interval');
    intervalInput?.addEventListener('input', () => {
      draft.interval = Math.max(1, parseInt(intervalInput.value) || 1);
      const preview = overlay.querySelector('.recur-preview');
      if (preview) preview.textContent = '🔁 ' + describeRecurrence(draft);
    });

    overlay.querySelectorAll('.recur-day').forEach(b => b.addEventListener('click', () => {
      const d = parseInt(b.dataset.weekday);
      if (!Array.isArray(draft.weekdays)) draft.weekdays = [];
      if (draft.weekdays.includes(d)) draft.weekdays = draft.weekdays.filter(x => x !== d);
      else draft.weekdays.push(d);
      render();
    }));

    overlay.querySelectorAll('input[name="monthly-mode"]').forEach(r => r.addEventListener('change', () => {
      if (r.value === 'date') draft = presetDefault('monthly-date');
      else draft = presetDefault('monthly-nth');
      render();
    }));

    overlay.querySelector('.recur-month-day')?.addEventListener('change', (e) => {
      draft.monthDay = Math.max(1, Math.min(31, parseInt(e.target.value) || 1));
      render();
    });
    overlay.querySelector('.recur-nth-week')?.addEventListener('change', (e) => {
      draft.nthWeek = parseInt(e.target.value);
      render();
    });
    overlay.querySelector('.recur-nth-weekday')?.addEventListener('change', (e) => {
      draft.nthWeekday = parseInt(e.target.value);
      render();
    });

    document.getElementById('recur-remove')?.addEventListener('click', () => {
      close();
      if (onRemove) onRemove();
    });
    document.getElementById('recur-restart')?.addEventListener('click', () => {
      if (!draft) return;
      if (draft.type === 'weekly' && (!draft.weekdays || !draft.weekdays.length)) {
        showToast('Pick at least one weekday first.', 'error');
        return;
      }
      close();
      if (onRestart) onRestart(draft);
    });
    document.getElementById('recur-cancel').onclick = close;
    document.getElementById('recur-save').onclick = () => {
      if (draft && draft.type === 'weekly' && (!draft.weekdays || !draft.weekdays.length)) {
        showToast('Pick at least one weekday.', 'error');
        return;
      }
      close();
      if (onSave) onSave(draft);
    };
  };

  overlay.classList.remove('hidden');
  render();
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function showRecurrenceModal(todoId) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t) return;
  openRecurrenceEditor({
    title: t.title,
    initial: t.recurrence,
    hasExisting: !!t.recurrence,
    onSave: (rule) => {
      t.recurrence = rule;
      if (rule && !t.dueDate) {
        const first = computeNextOccurrence(rule, new Date());
        if (first) t.dueDate = toDateString(first);
      }
      saveData();
      renderApp();
    },
    onRemove: () => {
      t.recurrence = null;
      saveData();
      renderApp();
    },
    onRestart: (draft) => {
      const first = computeFirstUpcomingOccurrence(draft, new Date());
      if (!first) { showToast('Could not compute next occurrence.', 'error'); return; }
      const newDue = toDateString(first);
      if (t.dueDate === newDue) {
        showToast(`Already set to ${formatDate(newDue)}.`, 'info');
        return;
      }
      if (t.startDate && t.dueDate) {
        const diffMs = new Date(t.dueDate) - new Date(t.startDate);
        if (!isNaN(diffMs) && diffMs >= 0) {
          t.startDate = toDateString(new Date(first.getTime() - diffMs));
        }
      }
      t.dueDate = newDue;
      t.recurrence = draft;
      t.done = false;
      saveData();
      renderApp();
      showToast(`Restarted → due ${formatDate(newDue)}`, 'success');
    }
  });
}

function updatePendingRecurrenceButton(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  const rule = state.pendingTodoRecurrence;
  btn.classList.toggle('active', !!rule);
  btn.title = rule ? describeRecurrence(rule) : 'Set recurrence';
  btn.textContent = rule ? `🔁 ${describeRecurrence(rule)}` : '🔁 Repeat';
}

function openPendingRecurrenceEditor(options = {}) {
  const inputId = options.inputId || 'todo-input';
  const buttonId = options.buttonId || 'btn-add-todo-recur';
  const title = document.getElementById(inputId)?.value.trim() || 'New todo';
  openRecurrenceEditor({
    title,
    initial: state.pendingTodoRecurrence,
    hasExisting: !!state.pendingTodoRecurrence,
    onSave: (rule) => {
      state.pendingTodoRecurrence = rule;
      updatePendingRecurrenceButton(buttonId);
      document.getElementById(inputId)?.focus();
    },
    onRemove: () => {
      state.pendingTodoRecurrence = null;
      updatePendingRecurrenceButton(buttonId);
      document.getElementById(inputId)?.focus();
    }
  });
}

function toggleTodoExpanded(todoId) {
  if (!state.expandedTodos) state.expandedTodos = new Set();
  if (state.expandedTodos.has(todoId)) state.expandedTodos.delete(todoId);
  else state.expandedTodos.add(todoId);
  renderTodos();
}

function addTodoStep(todoId, title) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t) return false;
  const trimmed = (title || '').trim();
  if (!trimmed) return false;
  if (!Array.isArray(t.steps)) t.steps = [];
  t.steps.push({ id: generateId('step'), title: trimmed, done: false, created: new Date().toISOString() });
  state.expandedTodos.add(todoId);
  saveData();
  return true;
}

function toggleTodoStep(todoId, stepId) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t || !Array.isArray(t.steps)) return false;
  const s = t.steps.find(x => x.id === stepId);
  if (!s) return false;
  s.done = !s.done;
  saveData();
  return true;
}

function deleteTodoStep(todoId, stepId) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t || !Array.isArray(t.steps)) return false;
  t.steps = t.steps.filter(x => x.id !== stepId);
  saveData();
  return true;
}

function updateTodoStepTitle(todoId, stepId, newTitle) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t || !Array.isArray(t.steps)) return false;
  const s = t.steps.find(x => x.id === stepId);
  if (!s) return false;
  const trimmed = (newTitle || '').trim();
  if (!trimmed || trimmed === s.title) return false;
  s.title = trimmed;
  saveData();
  return true;
}

function convertTodoToNote(todoId) {
  const proj = getProject();
  const t = proj.todos.find(x => x.id === todoId);
  if (!t) return;

  const lines = [];
  const meta = [];
  if (t.priority && t.priority !== 'medium') meta.push(`Priority: ${t.priority}`);
  if (t.startDate && t.dueDate) meta.push(`${formatDate(t.startDate)} → ${formatDate(t.dueDate)}`);
  else if (t.dueDate) meta.push(`Due: ${formatDate(t.dueDate)}`);
  else if (t.startDate) meta.push(`Starts: ${formatDate(t.startDate)}`);
  if (t.recurrence) meta.push(`Repeats: ${describeRecurrence(t.recurrence)}`);
  if (meta.length) {
    lines.push(meta.join(' · '));
    lines.push('');
  }
  if (Array.isArray(t.steps) && t.steps.length) {
    t.steps.forEach(s => {
      lines.push(`${s.done ? '☑' : '☐'} ${s.title}`);
    });
  }
  const content = lines.join('\n');

  const now = new Date().toISOString();
  const note = {
    id: generateId('note'),
    title: t.title,
    content,
    priority: t.priority || 'medium',
    tags: [],
    subprojectId: t.subprojectId || null,
    linkedTodos: [t.id],
    created: now,
    updated: now,
    attachments: []
  };
  proj.notes.unshift(note);
  saveData();
  showToast(`Converted to note: "${t.title}"`, 'success');

  state.editingNote = note.id;
  showView('notes');
}

function setTodoDates(todoId, startDate, dueDate) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t) return false;
  const s = startDate || null;
  const d = dueDate || null;
  if (s && d && new Date(s) > new Date(d)) return false;
  if (t.startDate === s && t.dueDate === d) return false;
  t.startDate = s;
  t.dueDate = d;
  saveData();
  return true;
}

function showTodoDatesModal(todoId) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t) return;
  const overlay = document.getElementById('modal-overlay');
  const close = () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    overlay.onclick = null;
  };
  overlay.innerHTML = `
    <div class="modal dates-modal">
      <h3>Set dates</h3>
      <div style="font-size:12px; color:var(--text-muted); margin:-8px 0 14px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${escapeHTML(t.title)}</div>
      <div class="dates-row">
        <div class="form-group" style="flex:1">
          <label class="form-label">Start</label>
          <input type="date" class="form-input" id="dates-start" value="${t.startDate || ''}">
        </div>
        <div class="form-group" style="flex:1">
          <label class="form-label">Due</label>
          <input type="date" class="form-input" id="dates-due" value="${t.dueDate || ''}">
        </div>
      </div>
      <div class="dates-hint">Leave either field empty to remove it.</div>
      <div class="modal-buttons">
        ${(t.startDate || t.dueDate) ? `<button class="btn btn-danger btn-sm" id="dates-clear" style="margin-right:auto">Clear</button>` : ''}
        <button class="btn btn-secondary" id="dates-cancel">Cancel</button>
        <button class="btn btn-primary" id="dates-save">Save</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');

  document.getElementById('dates-clear')?.addEventListener('click', () => {
    if (setTodoDates(todoId, null, null)) { close(); renderApp(); }
    else close();
  });
  document.getElementById('dates-cancel').onclick = close;
  document.getElementById('dates-save').onclick = () => {
    const s = document.getElementById('dates-start').value || null;
    const d = document.getElementById('dates-due').value || null;
    if (s && d && new Date(s) > new Date(d)) {
      showToast('Start date must be on or before due date.', 'error');
      return;
    }
    setTodoDates(todoId, s, d);
    close();
    renderApp();
  };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function setTodoSubproject(todoId, spId) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t) return false;
  const next = spId || null;
  if (t.subprojectId === next) return false;
  t.subprojectId = next;
  saveData();
  return true;
}

function moveTodoToProject(todoId, targetKey) {
  if (!state.data.projects[targetKey]) return false;
  if (targetKey === state.project) return false;
  const source = state.data.projects[state.project];
  const idx = source.todos.findIndex(t => t.id === todoId);
  if (idx === -1) return false;
  const [todo] = source.todos.splice(idx, 1);
  todo.subprojectId = null;
  source.notes.forEach(n => {
    if (Array.isArray(n.linkedTodos)) n.linkedTodos = n.linkedTodos.filter(id => id !== todoId);
  });
  state.data.projects[targetKey].todos.unshift(todo);
  saveData();
  return true;
}

function setTodoPriority(id, priority) {
  if (!['high','medium','low'].includes(priority)) return false;
  const t = getProject().todos.find(x => x.id === id);
  if (!t || t.priority === priority) return false;
  t.priority = priority;
  saveData();
  return true;
}

function updateTodoTitle(id, newTitle) {
  const t = getProject().todos.find(x => x.id === id);
  if (!t) return false;
  const trimmed = newTitle.trim();
  if (!trimmed || trimmed === t.title) return false;
  t.title = trimmed;
  saveData();
  return true;
}

function bindEditableTodoTitles(scopeSelector, onCommit) {
  document.querySelectorAll(`${scopeSelector} .todo-title[contenteditable="true"]`).forEach(el => {
    const id = el.dataset.id;
    const original = el.textContent;
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
      else if (e.key === 'Escape') { e.preventDefault(); el.textContent = original; el.blur(); }
    });
    el.addEventListener('blur', () => {
      const changed = updateTodoTitle(id, el.textContent);
      if (changed) onCommit();
      else el.textContent = original;
    });
  });
}

function addTodo() {
  const rawTitle = document.getElementById('todo-input').value.trim();
  if (!rawTitle) return;
  // Slash commands inside the title override the form fields so power users can
  // capture priority, due date, subproject etc. without leaving the keyboard.
  const slash = parseTodoSlashCommands(rawTitle);
  const title = slash.title || rawTitle;
  if (!title) return;
  const priority     = slash.priority || document.getElementById('todo-priority').value;
  const subprojectId = slash.subprojectId || document.getElementById('todo-subproject').value || null;
  const startDate    = slash.startDate || document.getElementById('todo-start').value;
  let   dueDate      = slash.dueDate || document.getElementById('todo-due').value;
  const recurrence   = slash.recurrence
    ? JSON.parse(JSON.stringify(slash.recurrence))
    : (state.pendingTodoRecurrence ? JSON.parse(JSON.stringify(state.pendingTodoRecurrence)) : null);
  if (recurrence && !dueDate) {
    const first = computeNextOccurrence(recurrence, new Date());
    if (first) dueDate = toDateString(first);
  }
  const proj = getProject();
  proj.todos.unshift({
    id: generateId('todo'), title, done: false, priority, startDate, dueDate, subprojectId,
    created: new Date().toISOString(),
    attachments: [], steps: [], recurrence
  });
  state.pendingTodoRecurrence = null;
  saveData();
  renderTodos();
}

// Renders the grey ghost-text completion behind the todo input. The ghost div mirrors
// the input's typed text in transparent ink (so it takes up the same horizontal space)
// and appends the suggestion in a muted color right after the caret position.
// Element refs default to the main todos-view IDs so existing callers keep
// working unchanged. Pass explicit elements to drive a different input/ghost
// pair (the spark-map detail panel uses this for its own todo input).
function updateTodoSlashGhost(input, ghost) {
  input = input || document.getElementById('todo-input');
  ghost = ghost || document.getElementById('todo-input-ghost');
  if (!input || !ghost) return;
  const cur = input.selectionStart ?? input.value.length;
  // Only show the ghost when the caret is at the end of the value AND of the slash token.
  // If the user has the caret in the middle of the input, suggesting feels wrong.
  if (cur !== input.value.length) {
    ghost.hidden = true;
    ghost.innerHTML = '';
    return;
  }
  const sug = suggestSlashCompletion(input.value, cur);
  if (!sug || !sug.completion) {
    ghost.hidden = true;
    ghost.innerHTML = '';
    return;
  }
  ghost.hidden = false;
  ghost.innerHTML = `<span class="todo-input-ghost-typed">${escapeHTML(sug.typed)}</span><span class="todo-input-ghost-suggest">${escapeHTML(sug.completion)}</span><span class="todo-input-ghost-tab" title="Press Tab to accept">⇥ Tab</span>`;
}

// Live feedback for the slash-command parser — shown as chips under the input.
// `host` defaults to the main todos-view chips container; pass a different
// element to drive a panel-specific chips strip (spark-map detail panel).
function updateTodoSlashChips(rawText, host) {
  host = host || document.getElementById('todo-slash-chips');
  if (!host) return;
  const slash = parseTodoSlashCommands(rawText || '');
  if (!slash.tokens.length) {
    host.hidden = true;
    host.innerHTML = '';
    return;
  }
  const iconFor = (type) => type === 'due' ? '📅'
                          : type === 'start' ? '▶'
                          : type === 'priority' ? '🎯'
                          : type === 'subproject' ? '📁'
                          : type === 'recurrence' ? '🔁' : '·';
  host.hidden = false;
  host.innerHTML = slash.tokens.map(tok =>
    `<span class="slash-chip slash-chip-${tok.type}">
      <span class="slash-chip-ic">${iconFor(tok.type)}</span>
      <span>${escapeHTML(tok.label)}</span>
    </span>`
  ).join('');
}

// Wires ghost-text completion + live chips + Tab-accept onto an arbitrary
// input. Both the main todos-view and the spark-map detail panel call this
// to get identical slash-command UX. `chipsHost` and `fields` are optional.
//
// `fields`, when provided, gives a real-time sync: as the user types a slash
// command, the corresponding form field's value updates so the user sees the
// parse reflected in the controls below. Manually changing a field releases
// our control and remembers the user's pick — backspacing the slash then
// reverts to that manual value, not the hard default.
function installTodoSlashCompletion(input, ghost, chipsHost, fields) {
  if (!input) return;
  fields = fields || {};

  // Manual-change listener per synced field. When the user manually changes
  // a field while slash had control of it, we record the slash value at
  // that moment as `slashOverrideFor` — future refreshes that see the same
  // slash value skip re-taking control, so the manual pick survives across
  // keystrokes. As soon as the slash command resolves to a different value
  // (or disappears), control is taken back / released cleanly.
  Object.values(fields).forEach(el => {
    if (!el || el._slashChangeHooked) return;
    el.addEventListener('change', () => {
      if (el.dataset.slashControlled === '1') {
        el.dataset.slashOverrideFor = el.dataset.slashControlValue || '';
      }
      delete el.dataset.slashControlled;
      delete el.dataset.slashManual;
      delete el.dataset.slashControlValue;
    });
    el._slashChangeHooked = true;
  });

  const refresh = () => {
    if (ghost) updateTodoSlashGhost(input, ghost);
    const slash = parseTodoSlashCommands(input.value);
    if (chipsHost) updateTodoSlashChips(input.value, chipsHost);
    syncSlashField(fields.priority,   slash.priority,    'medium');
    syncSlashField(fields.due,        slash.dueDate,     '');
    syncSlashField(fields.start,      slash.startDate,   '');
    syncSlashField(fields.subproject, slash.subprojectId, '');
  };

  input.addEventListener('input', refresh);
  input.addEventListener('focus', refresh);
  input.addEventListener('click', refresh);
  input.addEventListener('keyup', (e) => {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) refresh();
  });
  input.addEventListener('blur', () => {
    if (ghost) { ghost.hidden = true; ghost.innerHTML = ''; }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || e.shiftKey) return;
    const sug = suggestSlashCompletion(input.value, input.selectionStart || 0);
    if (!sug || !sug.completion) return;
    e.preventDefault();
    e.stopPropagation();
    const cur = input.selectionStart || 0;
    input.value = input.value.slice(0, cur) + sug.completion + input.value.slice(cur);
    const newPos = cur + sug.completion.length;
    input.setSelectionRange(newPos, newPos);
    refresh();
  });
  refresh();
}

// Drive a single form field from a slash-parsed value. The state machine:
//
//   slash has value, no override:     take control, snapshot manual baseline,
//                                     remember slash value for override check
//   slash has value, override matches: leave field alone (user overrode)
//   slash has value, override differs: take control again (slash command
//                                     changed; the previous override no
//                                     longer applies)
//   slash has no value, was controlled: revert to manual baseline (or hard
//                                       default if none was captured)
//
// The slashControlled / slashControlValue / slashOverrideFor data attributes
// double as a styling hook so users can see at a glance which fields are
// currently driven by their typed slash command.
function syncSlashField(el, slashValue, hardDefault) {
  if (!el) return;
  const isControlled = el.dataset.slashControlled === '1';
  const overrideFor  = el.dataset.slashOverrideFor;
  if (slashValue !== undefined && slashValue !== null && slashValue !== '') {
    const slashStr = String(slashValue);
    if (overrideFor !== undefined && overrideFor === slashStr) {
      return;  // user overrode this exact slash value — respect their pick
    }
    if (!isControlled) {
      el.dataset.slashManual = el.value;
    }
    if (el.value !== slashStr) el.value = slashStr;
    el.dataset.slashControlled = '1';
    el.dataset.slashControlValue = slashStr;
    delete el.dataset.slashOverrideFor;  // fresh slash value retakes control
  } else if (isControlled) {
    el.value = el.dataset.slashManual !== undefined ? el.dataset.slashManual : hardDefault;
    delete el.dataset.slashControlled;
    delete el.dataset.slashManual;
    delete el.dataset.slashControlValue;
    delete el.dataset.slashOverrideFor;
  }
}

function openTodoSlashHelp() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  const rows = [
    ['/today, /tomorrow', 'Set due date'],
    ['/heute, /morgen', 'German aliases'],
    ['/due 5d', 'Due in N days'],
    ['/due 2026-05-01', 'Due on a specific date'],
    ['/due 5.5.', 'Due on D.M. (rolls to next year if past)'],
    ['/start <date>', 'Set start date (same syntax)'],
    ['/high, /medium, /low', 'Set priority (also /hi /med /lo)'],
    ['/sp:name, /sub name', 'Move to subproject (matches by name)'],
    ['/daily, /weekly, /monthly, /yearly', 'Set recurrence'],
  ];
  overlay.innerHTML = `
    <div class="modal slash-help-modal">
      <h3>Slash commands</h3>
      <p class="slash-help-intro">Type these inside a new todo title — they override the form fields and get stripped from the saved title.</p>
      <table class="slash-help-table">
        ${rows.map(([cmd, desc]) => `
          <tr>
            <td><code>${escapeHTML(cmd)}</code></td>
            <td>${escapeHTML(desc)}</td>
          </tr>`).join('')}
      </table>
      <div class="slash-help-example"><strong>Example:</strong> <code>Call Lukas /tomorrow /high /sp:eh</code></div>
      <div class="modal-buttons">
        <button class="btn btn-primary" id="slash-help-close">Got it</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  document.getElementById('slash-help-close').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function toggleTodo(id) {
  const t = getProject().todos.find(x => x.id === id);
  if (t) { t.done = !t.done; saveData(); }
}

function deleteTodo(id) {
  const proj = getProject();
  proj.todos = proj.todos.filter(t => t.id !== id);
  // Remove from any notes that linked to this todo
  proj.notes.forEach(n => { if (n.linkedTodos) n.linkedTodos = n.linkedTodos.filter(tid => tid !== id); });
  // Remove from any spark-map node linkedItems in this project (Phase 1
  // orphan cleanup — keeps the link graph tidy without relying on
  // orphan rendering as a safety net).
  cleanupNodeLinksOnEntityDelete(state.project, 'todo', id);
  saveData();
  if (state.view === 'todos') renderTodos();
  else if (state.view === 'subprojects') renderSubprojects();
  else if (state.view === 'dashboard') renderDashboard();
}

function hexToHsl(hex) {
  if (!hex) return { h: 0, s: 0, l: 0 };
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) return { h: 0, s: 0, l: 0 };
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let s = 0, hue = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) hue = ((b - r) / d + 2);
    else hue = ((r - g) / d + 4);
    hue *= 60;
  }
  return { h: hue, s, l };
}

function sortSubprojects(sps, sortBy) {
  const arr = [...sps];
  if (sortBy === 'name') {
    arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  } else if (sortBy === 'color') {
    arr.sort((a, b) => {
      const ha = hexToHsl(a.color);
      const hb = hexToHsl(b.color);
      const aGray = ha.s < 0.1 ? 1 : 0;
      const bGray = hb.s < 0.1 ? 1 : 0;
      if (aGray !== bGray) return aGray - bGray;
      if (aGray) return ha.l - hb.l;
      return ha.h - hb.h;
    });
  } else if (sortBy === 'firstTag') {
    arr.sort((a, b) => {
      const ta = (a.tags && a.tags[0]) || '';
      const tb = (b.tags && b.tags[0]) || '';
      if (!ta && !tb) return 0;
      if (!ta) return 1;
      if (!tb) return -1;
      return ta.localeCompare(tb);
    });
  }
  return arr;
}

function getAllProjectTags() {
  const proj = getProject();
  if (!proj) return [];
  const tags = new Set();
  (proj.notes || []).forEach(n => (n.tags || []).forEach(t => { if (t) tags.add(t); }));
  (proj.subprojects || []).forEach(s => (s.tags || []).forEach(t => { if (t) tags.add(t); }));
  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

// ===== SUBPROJECTS =====
function renderSubprojects() {
  const proj = getProject();
  const sps = proj.subprojects || [];

  if (!(state.subprojectTagFilter instanceof Set)) state.subprojectTagFilter = new Set();
  const activeTagFilter = state.subprojectTagFilter;

  const allTags = Array.from(new Set(sps.flatMap(sp => sp.tags || []))).sort((a, b) => a.localeCompare(b));
  for (const t of Array.from(activeTagFilter)) {
    if (!allTags.includes(t)) activeTagFilter.delete(t);
  }

  const filteredSps = sortSubprojects(
    activeTagFilter.size === 0
      ? sps
      : sps.filter(sp => (sp.tags || []).some(t => activeTagFilter.has(t))),
    state.subprojectSortBy
  );

  if (state.activeSubproject && !filteredSps.some(sp => sp.id === state.activeSubproject)) {
    state.activeSubproject = null;
  }

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-subprojects">
      <div class="view-header">
        <div class="view-header-row">
          <div class="view-title">Subprojects</div>
          <button class="btn btn-primary" id="btn-new-subproject">+ New</button>
        </div>
      </div>
      <div class="notes-layout">
        <div class="notes-list-panel">
          <div class="sp-sort-bar">
            <label class="sp-sort-label">Sort</label>
            <select class="form-select sp-sort-select" id="sp-sort-select">
              <option value="default" ${state.subprojectSortBy==='default'?'selected':''}>Default</option>
              <option value="name" ${state.subprojectSortBy==='name'?'selected':''}>Alphabetical</option>
              <option value="color" ${state.subprojectSortBy==='color'?'selected':''}>Color (rainbow)</option>
              <option value="firstTag" ${state.subprojectSortBy==='firstTag'?'selected':''}>First tag</option>
            </select>
          </div>
          ${allTags.length ? `
            <div class="sp-tag-filter">
              <div class="sp-tag-filter-label">
                <span>Filter by tag</span>
                ${activeTagFilter.size ? `<button class="btn btn-ghost btn-sm" id="sp-tag-clear" style="padding:2px 8px;font-size:11px">Clear</button>` : ''}
              </div>
              <div class="sp-tag-filter-chips">
                ${allTags.map(tag => `
                  <button class="sp-tag-chip ${activeTagFilter.has(tag)?'selected':''}" data-sp-tag="${escapeHTML(tag)}">${escapeHTML(tag)}</button>
                `).join('')}
              </div>
            </div>` : ''}
          <div class="notes-list-items">
            ${filteredSps.length ? filteredSps.map(sp => {
              const tCount = getSubprojectTodos(sp.id).length;
              const nCount = getSubprojectNotes(sp.id).length;
              const active = state.activeSubproject === sp.id && !state.editingSubproject ? 'active' : '';
              return `<div class="sp-list-item ${active}" data-id="${sp.id}">
                <div class="sp-list-item-row">
                  <span class="sp-color-dot" style="background:${sp.color}"></span>
                  <span class="sp-list-name">${escapeHTML(sp.name)}</span>
                  ${pinToggleButtonHTML('subproject', state.project, sp.id, 'pin-toggle-inline')}
                  <span class="sp-list-meta">${tCount}t · ${nCount}n</span>
                </div>
                ${(sp.tags || []).length ? `
                  <div class="sp-list-tags">
                    ${(sp.tags || []).map(tag => `<span class="sp-list-tag">${escapeHTML(tag)}</span>`).join('')}
                  </div>` : ''}
              </div>`;
            }).join('') : (sps.length
                ? `<div class="empty-state" style="padding:20px">No subprojects match the selected tag${activeTagFilter.size===1?'':'s'}.</div>`
                : `<div class="empty-state" style="padding:20px">No subprojects yet.<br>Create one to get started.</div>`)}
          </div>
        </div>
        <div class="notes-editor-panel" id="sp-right-panel">
          ${state.editingSubproject
            ? subprojectFormHTML()
            : (state.activeSubproject
                ? subprojectDetailHTML(state.activeSubproject)
                : `<div class="editor-empty-state">
                    <div class="editor-empty-icon">📁</div>
                    <div class="editor-empty-text">Select a subproject or create a new one</div>
                  </div>`)}
        </div>
      </div>
    </div>`;

  setupSubprojectEvents();
}

function subprojectFormHTML() {
  const proj = getProject();
  const isNew = state.editingSubproject === 'new';
  const sp = isNew ? null : (proj.subprojects||[]).find(s => s.id === state.editingSubproject);
  const currentColor = sp?.color || SUBPROJECT_COLORS[0];

  return `<div style="padding:24px;overflow-y:auto;height:100%">
    <h2 style="font-size:18px;font-weight:700;margin-bottom:20px">${isNew ? 'New Subproject' : 'Edit Subproject'}</h2>
    <div class="form-group" style="margin-bottom:14px">
      <label class="form-label">Name</label>
      <input type="text" class="form-input" id="sp-name-input" value="${escapeHTML(sp?.name||'')}" placeholder="Subproject name…">
    </div>
    <div class="form-group" style="margin-bottom:14px">
      <label class="form-label">Description (optional)</label>
      <input type="text" class="form-input" id="sp-desc-input" value="${escapeHTML(sp?.description||'')}" placeholder="What is this subproject about?">
    </div>
    <div class="form-group" style="margin-bottom:14px">
      <label class="form-label">Tags (comma separated)</label>
      <input type="text" class="form-input" id="sp-tags-input" value="${escapeHTML((sp?.tags||[]).join(', '))}" placeholder="e.g. urgent, client-work, q2">
      ${(() => {
        const suggestions = getAllProjectTags();
        if (!suggestions.length) return '';
        const currentSet = new Set((sp?.tags || []).map(t => t.toLowerCase()));
        return `<div class="tag-suggestions">
          <div class="tag-suggestions-label">Click to toggle</div>
          <div class="tag-suggestions-chips">
            ${suggestions.map(t => `<button class="tag-suggestion-chip ${currentSet.has(t.toLowerCase())?'selected':''}" data-suggest-tag="${escapeHTML(t)}">${escapeHTML(t)}</button>`).join('')}
          </div>
        </div>`;
      })()}
    </div>
    <div class="form-group" style="margin-bottom:24px">
      <label class="form-label">Color</label>
      <div class="sp-color-swatches">
        ${SUBPROJECT_COLORS.map(c => `
          <label class="sp-swatch-label">
            <input type="radio" name="sp-color" class="sp-color-radio" value="${c}"
              ${currentColor===c?'checked':''} style="display:none">
            <span class="sp-color-swatch ${currentColor===c?'selected':''}" style="background:${c}"></span>
          </label>`).join('')}
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" id="btn-save-sp">${isNew ? 'Create Subproject' : 'Save Changes'}</button>
      <button class="btn btn-secondary" id="btn-cancel-sp">Cancel</button>
    </div>
  </div>`;
}

function subprojectDetailHTML(spId) {
  const proj = getProject();
  const sp = (proj.subprojects||[]).find(s => s.id === spId);
  if (!sp) return `<div class="editor-empty-state"><div class="editor-empty-text">Subproject not found.</div></div>`;

  const spTodos = sortTodosByStatus(getSubprojectTodos(spId));
  const spNotes = getSubprojectNotes(spId).sort((a,b) => new Date(b.updated) - new Date(a.updated));
  const spSparkNodes = getSubprojectSparkNodes(spId);
  const spDumps = getSubprojectDumps(spId).sort((a,b) => new Date(b.created) - new Date(a.created));
  const openCount = spTodos.filter(t=>!t.done).length;
  const dumpTypeIcon = (t) => t === 'voice' ? '🎙' : t === 'email' ? '✉' : t === 'sketch' ? '✏' : '🗒';

  return `<div class="sp-detail">
    <div class="sp-detail-header">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <span class="sp-color-circle" style="background:${sp.color};width:16px;height:16px;border-radius:50%;display:inline-block;flex-shrink:0"></span>
        <h2 style="font-size:20px;font-weight:700;flex:1">${escapeHTML(sp.name)}</h2>
        <button class="btn btn-secondary btn-sm" id="btn-edit-sp">Edit</button>
        <button class="btn btn-danger btn-sm" id="btn-delete-sp">Delete</button>
      </div>
      ${sp.description ? `<p style="font-size:13px;color:var(--text-secondary)">${escapeHTML(sp.description)}</p>` : ''}
      ${(sp.tags || []).length ? `
        <div class="sp-detail-tags">
          ${(sp.tags || []).map(tag => `<span class="sp-list-tag">${escapeHTML(tag)}</span>`).join('')}
        </div>` : ''}
    </div>

    <div class="sp-section-title">Timeline</div>
    ${ganttHTML(spId)}

    <div class="sp-section-title" style="margin-top:20px">
      Todos
      <span style="font-weight:400;color:var(--text-muted)">${openCount} open / ${spTodos.length} total</span>
    </div>
    <div class="sp-todo-add-row" style="margin-bottom:10px">
      <input type="text" class="form-input" id="sp-todo-input" placeholder="Add a todo…" style="flex:1;min-width:120px">
      <select class="form-select" id="sp-todo-priority">
        <option value="high">🔴 High</option>
        <option value="medium" selected>🟡 Medium</option>
        <option value="low">🟢 Low</option>
      </select>
      <label class="date-field"><span>Start</span><input type="date" class="form-input" id="sp-todo-start"></label>
      <label class="date-field"><span>Due</span><input type="date" class="form-input" id="sp-todo-due"></label>
      <button class="btn btn-ghost btn-sm todo-add-recur ${state.pendingTodoRecurrence?'active':''}" id="btn-sp-add-todo-recur" title="${state.pendingTodoRecurrence ? describeRecurrence(state.pendingTodoRecurrence) : 'Set recurrence'}">
        🔁 ${state.pendingTodoRecurrence ? escapeHTML(describeRecurrence(state.pendingTodoRecurrence)) : 'Repeat'}
      </button>
      <button class="btn btn-primary btn-sm" id="btn-sp-add-todo">Add</button>
    </div>
    <div class="todo-list sp-todo-list" id="sp-todo-list" style="margin-bottom:20px">
      ${spTodos.length
        ? spTodos.map(t => todoItemHTML(t)).join('')
        : `<div class="empty-state" style="padding:14px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border)">No todos yet — add one above.</div>`}
    </div>

    <div class="sp-section-title">
      Notes
      <button class="btn btn-ghost btn-sm" id="btn-new-sp-note" style="margin-left:6px;font-weight:500">+ New Note</button>
      <button class="btn btn-ghost btn-sm" id="btn-link-note" style="margin-left:4px;font-weight:500">+ Link Note</button>
    </div>
    <div id="sp-new-note-panel" class="hidden"></div>
    <div id="sp-link-panel" class="hidden"></div>
    <div class="sp-notes-list" id="sp-notes-list">
      ${spNotes.length ? spNotes.map(n => {
        const linkedTodosOfNote = (n.linkedTodos||[]).map(tid => proj.todos.find(t=>t.id===tid)).filter(Boolean);
        return `<div class="sp-note-card">
          <div class="sp-note-header">
            ${priorityBadge(n.priority)}
            <span class="sp-note-title" data-id="${n.id}">${escapeHTML(n.title)}</span>
            <span style="font-size:11px;color:var(--text-muted)">${formatDate(n.updated)}</span>
            <button class="btn btn-ghost btn-icon sp-unlink-note" data-id="${n.id}" title="Unlink">✕</button>
          </div>
          ${linkedTodosOfNote.length ? `<div style="margin-top:5px;display:flex;gap:4px;flex-wrap:wrap">
            <span style="font-size:11px;color:var(--text-muted);margin-right:2px">Links to:</span>
            ${linkedTodosOfNote.map(t=>`<span style="font-size:11px;background:var(--content-bg);padding:1px 7px;border-radius:4px;border:1px solid var(--border)">${escapeHTML(t.title)}</span>`).join('')}
          </div>` : ''}
        </div>`;
      }).join('')
      : `<div class="empty-state" style="padding:14px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border)">No notes linked. Use "+ Link Note" or set the subproject in the Notes view.</div>`}
    </div>

    <div class="sp-section-title" style="margin-top:20px">
      Spark Map Nodes
      <span style="font-weight:400;color:var(--text-muted)">${spSparkNodes.length}</span>
    </div>
    <div class="sp-spark-list" id="sp-spark-list">
      ${spSparkNodes.length ? spSparkNodes.map(n => {
        const path = bmAncestorPath(n.id);
        return `<div class="sp-spark-card" style="border-left:4px solid ${sp.color}">
          <div class="sp-spark-body">
            <span class="sp-spark-title" data-id="${n.id}">✨ ${escapeHTML(n.label)}</span>
            ${path ? `<span class="sp-spark-path">${escapeHTML(path)}</span>` : ''}
          </div>
          <button class="btn btn-ghost btn-icon sp-spark-unlink" data-id="${n.id}" title="Unlink from subproject">✕</button>
        </div>`;
      }).join('')
      : `<div class="empty-state" style="padding:14px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border)">No Spark Map nodes linked. Open the Spark Map and use the subproject dropdown in the toolbar.</div>`}
    </div>

    <div class="sp-section-title" style="margin-top:20px">
      Dumps
      <span style="font-weight:400;color:var(--text-muted)">${spDumps.length}${spDumps.length ? ` · ${spDumps.filter(d=>!d.processed).length} pending` : ''}</span>
    </div>
    <div class="sp-dumps-list">
      ${spDumps.length ? spDumps.map(d => {
        const plain = d.text ? noteContentText(d.text) : '';
        const preview = plain ? (plain.length > 140 ? plain.slice(0, 138) + '…' : plain) : (d.type === 'voice' ? '🎙 Voice memo' : d.type === 'sketch' ? '✏ Sketch' : '(empty)');
        return `<div class="sp-dump-card ${d.processed?'processed':''}" data-sp-dump-id="${d.id}" title="Open in Dump Zone">
          <div class="sp-dump-head">
            <span class="sp-dump-type">${dumpTypeIcon(d.type)}</span>
            <span class="sp-dump-time">${formatDateTime(d.created)}</span>
            ${d.processed ? `<span class="sp-dump-tag">archived</span>` : `<span class="sp-dump-tag sp-dump-tag-pending">pending</span>`}
            <button class="btn btn-ghost btn-icon sp-dump-unlink" data-id="${d.id}" title="Remove subproject assignment">✕</button>
          </div>
          <div class="sp-dump-text">${escapeHTML(preview)}</div>
        </div>`;
      }).join('')
      : `<div class="empty-state" style="padding:14px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border)">No dumps assigned to this subproject yet. Use the subproject dropdown in the Dump Zone.</div>`}
    </div>

    <div class="sp-section-title" style="margin-top:20px">Attachments <span style="font-weight:400;color:var(--text-muted)">(incl. linked todos & notes)</span></div>
    ${attachmentPanelHTML(sp, 'subproject', sp.id, 'Attachments', subprojectMergedAttachments(sp))}
    ${backlinksPanelHTML('subproject', state.project, sp.id)}
  </div>`;
}

function setupSubprojectEvents() {
  ensureListPanelResizer();
  // Sort selector
  document.getElementById('sp-sort-select')?.addEventListener('change', e => {
    state.subprojectSortBy = e.target.value;
    renderSubprojects();
  });

  // Tag filter toggles
  document.querySelectorAll('.sp-tag-chip[data-sp-tag]').forEach(btn =>
    btn.addEventListener('click', () => {
      const tag = btn.dataset.spTag;
      if (!(state.subprojectTagFilter instanceof Set)) state.subprojectTagFilter = new Set();
      if (state.subprojectTagFilter.has(tag)) state.subprojectTagFilter.delete(tag);
      else state.subprojectTagFilter.add(tag);
      renderSubprojects();
    }));
  document.getElementById('sp-tag-clear')?.addEventListener('click', () => {
    state.subprojectTagFilter = new Set();
    renderSubprojects();
  });

  // List item selection
  document.querySelectorAll('.sp-list-item').forEach(el =>
    el.addEventListener('click', () => {
      state.activeSubproject = el.dataset.id;
      state.editingSubproject = null;
      renderSubprojects();
    }));

  // New subproject
  document.getElementById('btn-new-subproject')?.addEventListener('click', () => {
    state.editingSubproject = 'new';
    state.activeSubproject = null;
    renderSubprojects();
    const input = document.getElementById('sp-name-input');
    if (input) { input.focus(); input.select(); }
  });

  // Form save/cancel
  document.getElementById('btn-save-sp')?.addEventListener('click', saveSubproject);
  document.getElementById('btn-cancel-sp')?.addEventListener('click', () => {
    state.editingSubproject = null;
    renderSubprojects();
  });

  // Tag suggestion chips toggle their tag in the sp-tags-input
  document.querySelectorAll('.tag-suggestion-chip[data-suggest-tag]').forEach(chip =>
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const input = document.getElementById('sp-tags-input');
      if (!input) return;
      const tag = chip.dataset.suggestTag;
      const lcTag = tag.toLowerCase();
      const current = input.value.split(',').map(t => t.trim()).filter(Boolean);
      const idx = current.findIndex(t => t.toLowerCase() === lcTag);
      if (idx === -1) current.push(tag);
      else current.splice(idx, 1);
      input.value = current.join(', ');
      chip.classList.toggle('selected', idx === -1);
      input.focus();
    }));

  // Color swatches
  document.querySelectorAll('.sp-color-radio').forEach(radio =>
    radio.addEventListener('change', () => {
      document.querySelectorAll('.sp-color-swatch').forEach(s => s.classList.remove('selected'));
      radio.nextElementSibling.classList.add('selected');
    }));

  // Edit / delete subproject
  document.getElementById('btn-edit-sp')?.addEventListener('click', () => {
    state.editingSubproject = state.activeSubproject;
    renderSubprojects();
  });
  document.getElementById('btn-delete-sp')?.addEventListener('click', () =>
    deleteSubproject(state.activeSubproject));

  // Add todo to subproject
  document.getElementById('btn-sp-add-todo')?.addEventListener('click', addSubprojectTodo);
  document.getElementById('sp-todo-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') addSubprojectTodo();
  });
  document.getElementById('btn-sp-add-todo-recur')?.addEventListener('click', () =>
    openPendingRecurrenceEditor({ inputId: 'sp-todo-input', buttonId: 'btn-sp-add-todo-recur' }));

  // Full todo row features (same as the main Todos view)
  bindTodoRowEvents('.sp-todo-list', renderSubprojects, 'subprojects');

  // Open note in editor
  document.querySelectorAll('.sp-note-title').forEach(el =>
    el.addEventListener('click', () => { state.editingNote = el.dataset.id; showView('notes'); }));

  // Unlink note from subproject
  document.querySelectorAll('.sp-unlink-note').forEach(b =>
    b.addEventListener('click', () => unlinkNoteFromSubproject(b.dataset.id)));

  // Jump to Spark Map node
  document.querySelectorAll('.sp-spark-title').forEach(el =>
    el.addEventListener('click', () => {
      state.bm.selectedId = el.dataset.id;
      showView('brainmap');
    }));

  // Unlink Spark Map node from subproject
  document.querySelectorAll('.sp-spark-unlink').forEach(b =>
    b.addEventListener('click', () => unlinkSparkNodeFromSubproject(b.dataset.id)));

  // Link note
  document.getElementById('btn-link-note')?.addEventListener('click', showLinkNotePanel);
  document.getElementById('btn-new-sp-note')?.addEventListener('click', showNewSubprojectNotePanel);

  // Dump cards: click to jump to Dump Zone, ✕ to remove the subproject link
  document.querySelectorAll('.sp-dump-card').forEach(card =>
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      showView('dumpzone');
    }));
  document.querySelectorAll('.sp-dump-unlink').forEach(btn =>
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setDumpSubproject(btn.dataset.id, null);
      renderSubprojects();
    }));

  // Attachments panel
  bindAttachmentPanel(document.getElementById('sp-right-panel'), renderSubprojects);

  // Scroll gantt to today after render
  requestAnimationFrame(scrollGanttToToday);
}

function saveSubproject() {
  const name = document.getElementById('sp-name-input').value.trim();
  if (!name) { showToast('Please enter a subproject name.', 'error'); return; }
  const description = document.getElementById('sp-desc-input').value.trim();
  const tagsRaw = document.getElementById('sp-tags-input')?.value || '';
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  const color = document.querySelector('.sp-color-radio:checked')?.value || SUBPROJECT_COLORS[0];
  const proj = getProject();

  if (state.editingSubproject === 'new') {
    const sp = { id: generateId('sp'), name, description, color, tags, attachments: [] };
    proj.subprojects.push(sp);
    state.activeSubproject = sp.id;
    showToast('Subproject created.', 'success');
  } else {
    const sp = (proj.subprojects||[]).find(s => s.id === state.editingSubproject);
    if (sp) Object.assign(sp, { name, description, color, tags });
    state.activeSubproject = state.editingSubproject;
    showToast('Subproject updated.', 'success');
  }
  state.editingSubproject = null;
  saveData();
  renderSubprojects();
}

function deleteSubproject(spId) {
  const proj = getProject();
  proj.subprojects = (proj.subprojects||[]).filter(s => s.id !== spId);
  proj.todos.forEach(t => { if (t.subprojectId === spId) t.subprojectId = null; });
  proj.notes.forEach(n => { if (n.subprojectId === spId) n.subprojectId = null; });
  if (proj.brainmap && proj.brainmap.nodes) {
    for (const n of Object.values(proj.brainmap.nodes)) {
      if (n.subprojectId === spId) n.subprojectId = null;
    }
  }
  state.activeSubproject = null;
  saveData();
  showToast('Subproject deleted.', 'info');
  renderSubprojects();
}

function addSubprojectTodo() {
  const title = document.getElementById('sp-todo-input').value.trim();
  if (!title) return;
  const priority  = document.getElementById('sp-todo-priority').value;
  const startDate = document.getElementById('sp-todo-start').value;
  let   dueDate   = document.getElementById('sp-todo-due').value;
  const recurrence = state.pendingTodoRecurrence
    ? JSON.parse(JSON.stringify(state.pendingTodoRecurrence))
    : null;
  if (recurrence && !dueDate) {
    const first = computeNextOccurrence(recurrence, new Date());
    if (first) dueDate = toDateString(first);
  }
  const proj = getProject();
  proj.todos.unshift({
    id: generateId('todo'), title, done: false, priority,
    startDate, dueDate, subprojectId: state.activeSubproject,
    created: new Date().toISOString(),
    attachments: [], steps: [], recurrence
  });
  state.pendingTodoRecurrence = null;
  saveData();
  renderSubprojects();
}

function unlinkNoteFromSubproject(noteId) {
  const note = getProject().notes.find(n => n.id === noteId);
  if (note) note.subprojectId = null;
  saveData();
  renderSubprojects();
}

function unlinkSparkNodeFromSubproject(nodeId) {
  const bm = getProject().brainmap;
  if (!bm || !bm.nodes || !bm.nodes[nodeId]) return;
  bm.nodes[nodeId].subprojectId = null;
  saveData();
  renderSubprojects();
}

function showNewSubprojectNotePanel() {
  const panel = document.getElementById('sp-new-note-panel');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.innerHTML = `<div class="sp-link-panel sp-new-note-panel-inner">
    <div style="display:flex;flex-direction:column;gap:6px;flex:1">
      <input type="text" class="form-input" id="sp-new-note-title" placeholder="Note title…">
      <textarea class="form-textarea" id="sp-new-note-content" placeholder="Content (optional)…" rows="3" style="resize:vertical;min-height:48px;font-family:var(--font)"></textarea>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:stretch">
      <button class="btn btn-primary btn-sm" id="btn-create-sp-note">Create</button>
      <button class="btn btn-ghost btn-sm" id="btn-cancel-sp-note">Cancel</button>
    </div>
  </div>`;
  const titleInput = document.getElementById('sp-new-note-title');
  titleInput?.focus();

  const submit = () => {
    const title = titleInput.value.trim();
    if (!title) { showToast('Please enter a note title.', 'error'); titleInput.focus(); return; }
    const content = document.getElementById('sp-new-note-content').value;
    const now = new Date().toISOString();
    const proj = getProject();
    proj.notes.unshift({
      id: generateId('note'),
      title,
      content,
      priority: 'medium',
      tags: [],
      subprojectId: state.activeSubproject,
      linkedTodos: [],
      created: now,
      updated: now,
      attachments: []
    });
    saveData();
    showToast('Note created.', 'success');
    renderSubprojects();
  };
  document.getElementById('btn-create-sp-note').onclick = submit;
  titleInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });
  document.getElementById('btn-cancel-sp-note').onclick = () => {
    panel.classList.add('hidden');
    panel.innerHTML = '';
  };
}

function showLinkNotePanel() {
  const proj = getProject();
  const available = proj.notes.filter(n => n.subprojectId !== state.activeSubproject);
  const panel = document.getElementById('sp-link-panel');
  if (!panel) return;
  panel.classList.remove('hidden');
  panel.innerHTML = `<div class="sp-link-panel">
    <select class="form-select" id="sp-link-note-sel" style="flex:1">
      <option value="">Select a note to link…</option>
      ${available.map(n => `<option value="${n.id}">${escapeHTML(n.title)}</option>`).join('')}
    </select>
    <button class="btn btn-primary btn-sm" id="btn-confirm-link">Link</button>
    <button class="btn btn-ghost btn-sm" id="btn-cancel-link">Cancel</button>
  </div>`;
  document.getElementById('btn-confirm-link').onclick = () => {
    const noteId = document.getElementById('sp-link-note-sel').value;
    if (!noteId) return;
    const note = proj.notes.find(n => n.id === noteId);
    if (note) note.subprojectId = state.activeSubproject;
    saveData(); renderSubprojects();
  };
  document.getElementById('btn-cancel-link').onclick = () => { panel.classList.add('hidden'); panel.innerHTML = ''; };
}

// ===== GANTT =====
function ganttHTML(spId) {
  const todos = getSubprojectTodos(spId).filter(t => t.startDate || t.dueDate);
  if (!todos.length) {
    return `<div class="gantt-empty" style="background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius)">
      Add <strong>start</strong> and <strong>due dates</strong> to todos to see them on the timeline.
    </div>`;
  }

  const DAY_MS = 86400000;
  const COL_W  = 28;
  const LABEL_W = 180;

  const allDates = todos.flatMap(t => [t.startDate, t.dueDate].filter(Boolean)).map(s => {
    const d = new Date(s); d.setHours(0,0,0,0); return d;
  });
  const wStart = new Date(Math.min(...allDates)); wStart.setDate(wStart.getDate() - 2); wStart.setHours(0,0,0,0);
  let wEnd = new Date(Math.max(...allDates)); wEnd.setDate(wEnd.getDate() + 3); wEnd.setHours(0,0,0,0);
  const minEnd = new Date(); minEnd.setHours(0,0,0,0); minEnd.setDate(minEnd.getDate() + 60);
  if (wEnd < minEnd) wEnd = minEnd;

  const totalDays = Math.round((wEnd - wStart) / DAY_MS) + 1;
  const days = Array.from({length: totalDays}, (_, i) => {
    const d = new Date(wStart); d.setDate(d.getDate() + i); return d;
  });

  const today = new Date(); today.setHours(0,0,0,0);
  const todayIdx = Math.round((today - wStart) / DAY_MS);

  const sorted = [...todos].sort((a,b) => new Date(a.startDate||a.dueDate) - new Date(b.startDate||b.dueDate));

  return `<div class="gantt-container" id="gantt-container">
    <div class="gantt-inner" style="width:calc(var(--gantt-label-w, ${LABEL_W}px) + ${totalDays * COL_W}px)">
      <div class="gantt-header">
        <div class="gantt-header-labels">Task<div class="gantt-label-resizer" title="Drag to resize"></div></div>
        <div class="gantt-header-days">
          ${days.map((d, i) => {
            const isToday = i === todayIdx;
            const showMonth = d.getDate() === 1 || i === 0;
            return `<div class="gantt-day-cell ${isToday?'today-col':''}" style="width:${COL_W}px">
              ${showMonth ? `<span class="gantt-month-label">${d.toLocaleDateString('en-GB',{month:'short'})}</span>` : ''}
              ${d.getDate()}
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="gantt-body">
        ${todayIdx >= 0 && todayIdx < totalDays
          ? `<div class="gantt-today-line" style="left:calc(var(--gantt-label-w, ${LABEL_W}px) + ${todayIdx * COL_W + COL_W/2}px)"></div>` : ''}
        ${sorted.map(t => {
          const tS = new Date(t.startDate || t.dueDate); tS.setHours(0,0,0,0);
          const tE = new Date(t.dueDate || t.startDate); tE.setHours(0,0,0,0);
          const si = Math.max(0, Math.round((tS - wStart) / DAY_MS));
          const ei = Math.min(totalDays - 1, Math.round((tE - wStart) / DAY_MS));
          const barLeft  = si * COL_W;
          const barWidth = Math.max(COL_W - 2, (ei - si + 1) * COL_W - 2);
          const linked = getNotesLinkedToTodo(t.id);
          return `<div class="gantt-row">
            <div class="gantt-row-label">
              <span class="gantt-label-text" title="${escapeHTML(t.title)}">${escapeHTML(t.title)}</span>
              ${linked.length ? `<span class="gantt-note-badge" title="${linked.map(n=>n.title).join(', ')}">📝</span>` : ''}
            </div>
            <div class="gantt-row-track" style="width:${totalDays * COL_W}px">
              ${days.map((d, i) => `<div class="gantt-grid-cell ${i===todayIdx?'today-col':''} ${d.getDay()===0||d.getDay()===6?'weekend':''}" style="width:${COL_W}px"></div>`).join('')}
              <div class="gantt-bar bar-${t.priority||'low'} ${t.done?'gantt-done':''}"
                   style="left:${barLeft}px;width:${barWidth}px"
                   title="${escapeHTML(t.title)}: ${formatDate(t.startDate)} → ${formatDate(t.dueDate)}">
                <span class="gantt-bar-label">${barWidth > 55 ? escapeHTML(t.title) : ''}</span>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function allSubprojectsGanttHTML(proj, projectKey, options = {}) {
  proj = proj || getProject();
  projectKey = projectKey || state.project;
  const compact = !!options.compact;
  const limit = options.limit;
  const sps = proj.subprojects || [];
  const spById = Object.fromEntries(sps.map(s => [s.id, s]));

  const todos = proj.todos.filter(t => !t.done && (t.startDate || t.dueDate));
  if (!todos.length) {
    return `<div class="gantt-empty" style="background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius)">
      Add <strong>start</strong> and <strong>due dates</strong> to todos to see them on the timeline.
    </div>`;
  }

  const DAY_MS = 86400000;
  const COL_W  = 24;
  const LABEL_W = 200;
  const NO_SP_COLOR = '#64748b';

  let wStart, wEnd;
  if (options.windowStart && options.windowEnd) {
    wStart = new Date(options.windowStart); wStart.setHours(0,0,0,0);
    wEnd   = new Date(options.windowEnd);   wEnd.setHours(0,0,0,0);
  } else {
    const allDates = todos.flatMap(t => [t.startDate, t.dueDate].filter(Boolean)).map(s => {
      const d = new Date(s); d.setHours(0,0,0,0); return d;
    });
    wStart = new Date(Math.min(...allDates)); wStart.setDate(wStart.getDate() - 2); wStart.setHours(0,0,0,0);
    wEnd = new Date(Math.max(...allDates));
    wEnd.setDate(wEnd.getDate() + 3 + (state.dashGanttExtendDays || 0));
    wEnd.setHours(0,0,0,0);
    const minEnd = new Date(); minEnd.setHours(0,0,0,0);
    minEnd.setDate(minEnd.getDate() + 60 + (state.dashGanttExtendDays || 0));
    if (wEnd < minEnd) wEnd = minEnd;
  }

  const totalDays = Math.round((wEnd - wStart) / DAY_MS) + 1;
  const days = Array.from({length: totalDays}, (_, i) => {
    const d = new Date(wStart); d.setDate(d.getDate() + i); return d;
  });

  const today = new Date(); today.setHours(0,0,0,0);
  const todayIdx = Math.round((today - wStart) / DAY_MS);

  const spOrder = Object.fromEntries(sps.map((s, i) => [s.id, i]));
  const sorted = [...todos].sort((a, b) => {
    const ao = a.subprojectId ? (spOrder[a.subprojectId] ?? 9998) : 9999;
    const bo = b.subprojectId ? (spOrder[b.subprojectId] ?? 9998) : 9999;
    if (ao !== bo) return ao - bo;
    return new Date(a.startDate || a.dueDate) - new Date(b.startDate || b.dueDate);
  });

  const limited = (limit && !state.dashGanttExpanded) ? sorted.slice(0, limit) : sorted;
  const hiddenCount = sorted.length - limited.length;
  const containerClasses = ['gantt-container', 'dash-gantt-container'];
  if (compact) containerClasses.push('dash-gantt-compact');

  return `<div class="${containerClasses.join(' ')}">
    <div class="gantt-inner" style="width:calc(var(--gantt-label-w, ${LABEL_W}px) + ${totalDays * COL_W}px)">
      <div class="gantt-header">
        <div class="gantt-header-labels">Task<div class="gantt-label-resizer" title="Drag to resize"></div></div>
        <div class="gantt-header-days">
          ${days.map((d, i) => {
            const isToday = i === todayIdx;
            const showMonth = d.getDate() === 1 || i === 0;
            return `<div class="gantt-day-cell ${isToday?'today-col':''}" style="width:${COL_W}px">
              ${showMonth ? `<span class="gantt-month-label">${d.toLocaleDateString('en-GB',{month:'short'})}</span>` : ''}
              ${d.getDate()}
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="gantt-body">
        ${todayIdx >= 0 && todayIdx < totalDays
          ? `<div class="gantt-today-line" style="left:calc(var(--gantt-label-w, ${LABEL_W}px) + ${todayIdx * COL_W + COL_W/2}px)"></div>` : ''}
        ${limited.map(t => {
          const sp = t.subprojectId ? spById[t.subprojectId] : null;
          const color = sp ? sp.color : NO_SP_COLOR;
          const tS = new Date(t.startDate || t.dueDate); tS.setHours(0,0,0,0);
          const tE = new Date(t.dueDate   || t.startDate); tE.setHours(0,0,0,0);
          const si = Math.max(0, Math.round((tS - wStart) / DAY_MS));
          const ei = Math.min(totalDays - 1, Math.round((tE - wStart) / DAY_MS));
          const barLeft  = si * COL_W;
          const barWidth = Math.max(COL_W - 2, (ei - si + 1) * COL_W - 2);
          const label = t.title;
          const tooltip = `${t.title}${sp ? ' — ' + sp.name : ''}: ${formatDate(t.startDate || t.dueDate)} → ${formatDate(t.dueDate || t.startDate)}`;

          // Ghost occurrences: future instances of recurring todos up to wEnd
          const ghostBars = [];
          if (t.recurrence && t.dueDate) {
            const durationMs = (t.startDate ? new Date(t.dueDate) - new Date(t.startDate) : 0);
            let cursor = new Date(t.dueDate); cursor.setHours(0,0,0,0);
            for (let i = 0; i < 200; i++) {
              const next = computeNextOccurrence(t.recurrence, cursor);
              if (!next) break;
              next.setHours(0,0,0,0);
              if (next > wEnd) break;
              const gEnd = next;
              const gStart = durationMs > 0 ? new Date(next.getTime() - durationMs) : next;
              const gsi = Math.max(0, Math.round((gStart - wStart) / DAY_MS));
              const gei = Math.min(totalDays - 1, Math.round((gEnd - wStart) / DAY_MS));
              if (gei >= 0 && gsi <= totalDays - 1) {
                const left  = gsi * COL_W;
                const width = Math.max(COL_W - 2, (gei - gsi + 1) * COL_W - 2);
                ghostBars.push({ left, width, date: next });
              }
              cursor = next;
            }
          }

          return `<div class="gantt-row dash-gantt-row" data-todo-id="${t.id}" data-proj-key="${projectKey}" ${sp?`data-sp-id="${sp.id}"`:''} title="${escapeHTML(tooltip)}">
            <div class="gantt-row-label">
              <span class="dash-gantt-dot" style="background:${color}" title="${sp ? escapeHTML(sp.name) : 'No subproject'}"></span>
              <span class="gantt-label-text ${t.done?'dash-gantt-done-label':''}">${escapeHTML(label)}${t.recurrence ? ' <span class="gantt-recur-icon" title="Recurring">🔁</span>' : ''}</span>
            </div>
            <div class="gantt-row-track" style="width:${totalDays * COL_W}px">
              ${days.map((d, i) => `<div class="gantt-grid-cell ${i===todayIdx?'today-col':''} ${d.getDay()===0||d.getDay()===6?'weekend':''}" style="width:${COL_W}px"></div>`).join('')}
              <div class="gantt-bar dash-gantt-bar ${t.done?'gantt-done':''}"
                   style="left:${barLeft}px;width:${barWidth}px;background:${color}">
                <span class="gantt-bar-label">${barWidth > 55 ? escapeHTML(t.title) : ''}</span>
              </div>
              ${ghostBars.map(g => `
                <div class="gantt-bar dash-gantt-bar gantt-bar-ghost"
                     style="left:${g.left}px;width:${g.width}px;border-color:${color};color:${color}"
                     title="Recurring occurrence: ${formatDate(toDateString(g.date))}">
                </div>`).join('')}
            </div>
          </div>`;
        }).join('')}
        ${(limit && sorted.length > limit) ? `
          <div class="dash-gantt-more-row">
            <button class="btn btn-ghost btn-sm dash-gantt-toggle">
              ${state.dashGanttExpanded ? `Show less` : `Show ${hiddenCount} more`}
            </button>
          </div>` : ''}
      </div>
    </div>
  </div>`;
}

function scrollGanttToToday() {
  const container = document.getElementById('gantt-container');
  const todayLine = container?.querySelector('.gantt-today-line');
  if (container && todayLine) {
    const left = parseInt(todayLine.style.left, 10);
    container.scrollLeft = Math.max(0, left - container.clientWidth / 2);
  }
}

// ===== REMINDERS =====
// ===== DUMP ZONE =====
const dumpVoiceState = { recorder: null, chunks: [], stream: null, startedAt: null, timerHandle: null, audioCtx: null, analyser: null, levelHandle: null, peak: 0 };

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
  if (!trimmed || !noteContentText(trimmed)) return null;
  const proj = getProject();
  if (!Array.isArray(proj.dumps)) proj.dumps = [];
  const dump = {
    id: generateId('dump'),
    type,
    text: trimmed,
    audio: null,
    subprojectId: state.pendingDumpSubprojectId || null,
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
  renderDumpZone();
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

const SKETCH_COLORS = ['#0f172a', '#dc2626', '#16a34a', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#ffffff'];
const sketchState = { actions: [], current: null, tool: 'pen', color: SKETCH_COLORS[0], strokeWidth: 4 };

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
          renderDumpZone();
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
  renderDumpZone();
}

function unprocessDump(dumpId) {
  const proj = getProject();
  const dump = (proj.dumps || []).find(d => d.id === dumpId);
  if (!dump) return;
  dump.processed = false;
  dump.processedAt = null;
  saveData();
  renderDumpZone();
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
      fired: false
    });
    close();
    markDumpProcessed(dumpId);
    showToast(`Reminder set for ${formatDateTime(datetime)}`, 'success');
  };
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
      renderDumpZone();
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
        renderDumpZone();
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
    renderDumpZone();
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

function renderDumpZone() {
  const proj = getProject();
  if (!Array.isArray(proj.dumps)) proj.dumps = [];
  const pending = proj.dumps.filter(d => !d.processed);
  const processed = proj.dumps.filter(d => d.processed).sort((a,b) => new Date(b.processedAt || 0) - new Date(a.processedAt || 0));
  const subprojects = proj.subprojects || [];
  const spById = Object.fromEntries(subprojects.map(s => [s.id, s]));

  // Reset pending-subproject if the user switched projects and the old id is gone
  if (state.pendingDumpSubprojectId && !spById[state.pendingDumpSubprojectId]) {
    state.pendingDumpSubprojectId = null;
  }

  const now = new Date();
  const todayStr = toDateString(now);

  const typeIcon = (t) => t === 'voice' ? '🎙' : t === 'email' ? '✉' : t === 'sketch' ? '✏' : '🗒';

  const subprojectSelectHTML = (currentId, datasetKey, datasetValue) => {
    if (!subprojects.length) return '';
    const sp = currentId ? spById[currentId] : null;
    const style = sp
      ? `background:${sp.color}22;color:${sp.color};border-color:${sp.color}44`
      : `background:transparent;color:#94a3b8;border-color:#cbd5e1`;
    return `<select class="todo-sp-select dump-sp-select" ${datasetKey}="${datasetValue}" title="Assign subproject" style="${style}">
      <option value="" ${!sp?'selected':''}>No subproject</option>
      ${subprojects.map(s => `<option value="${s.id}" ${s.id===currentId?'selected':''}>${escapeHTML(s.name)}</option>`).join('')}
    </select>`;
  };

  const dumpCardHTML = (d, processedMode) => {
    const suggestions = suggestDumpActions(noteContentText(d.text || '') || (d.type === 'sketch' ? 'sketch' : ''));
    const audio = d.audio;
    const image = d.image;
    return `<div class="dump-card ${processedMode?'processed':''}">
      <div class="dump-card-header">
        <span class="dump-type">${typeIcon(d.type)}</span>
        <span class="dump-time">${formatDateTime(d.created)}</span>
        ${audio && audio.durationSec ? `<span class="dump-time">· ${Math.floor(audio.durationSec/60)}:${String(audio.durationSec%60).padStart(2,'0')}</span>` : ''}
        ${image && image.width && image.height ? `<span class="dump-time">· ${image.width}×${image.height}</span>` : ''}
        ${!processedMode ? subprojectSelectHTML(d.subprojectId, 'data-dump-sp-id', d.id) : (d.subprojectId && spById[d.subprojectId] ? `<span class="todo-sp-chip" style="background:${spById[d.subprojectId].color}22;color:${spById[d.subprojectId].color};border:1px solid ${spById[d.subprojectId].color}44;margin-left:auto">${escapeHTML(spById[d.subprojectId].name)}</span>` : '')}
      </div>
      ${d.text ? `<div class="dump-text">${noteContentInitialHTML(d.text)}</div>` : ''}
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
  };

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-dumpzone">
      <div class="view-header">
        <div class="view-header-row">
          <div class="view-title">🧠 Dump Zone</div>
          <span style="font-size:13px;color:var(--text-muted)">Capture first, organize later · ${pending.length} pending</span>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:0 24px 24px">
        <div class="dump-capture">
          <div class="dump-capture-label">Dump anything — typed, pasted email, voice</div>
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
            ${subprojectSelectHTML(state.pendingDumpSubprojectId, 'id', 'dump-capture-sp')}
            <span class="dump-voice-status" id="dump-voice-indicator"><span class="dump-voice-dot"></span><span id="dump-voice-timer">00:00</span><span class="dump-voice-level"><span id="dump-voice-level-bar"></span></span></span>
          </div>
        </div>

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

  const saveThought = (type = 'text') => {
    const el = document.getElementById('dump-input');
    const html = el ? (el.innerHTML || '') : '';
    const plain = noteContentText(html);
    if (!plain) { showToast('Type something first.', 'error'); el?.focus(); return; }
    addTextDump(html, type);
    if (el) el.innerHTML = '';
    renderDumpZone();
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
    if (dumpVoiceState.recorder) stopVoiceRecording();
    else startVoiceRecording();
  });
  document.getElementById('btn-dump-sketch')?.addEventListener('click', () => showSketchModal());

  // Subproject selector on capture form (applies to next dump)
  document.querySelector('.dump-capture-actions .dump-sp-select')?.addEventListener('change', (e) => {
    state.pendingDumpSubprojectId = e.target.value || null;
    // Update the select's color to reflect the new selection without a full re-render
    const sp = state.pendingDumpSubprojectId ? proj.subprojects.find(s => s.id === state.pendingDumpSubprojectId) : null;
    const style = sp
      ? `background:${sp.color}22;color:${sp.color};border-color:${sp.color}44`
      : `background:transparent;color:#94a3b8;border-color:#cbd5e1`;
    e.target.setAttribute('style', style);
  });

  // Per-dump subproject selector (updates the stored dump)
  document.querySelectorAll('.dump-card .dump-sp-select[data-dump-sp-id]').forEach(sel => {
    sel.addEventListener('click', ev => ev.stopPropagation());
    sel.addEventListener('change', () => {
      if (setDumpSubproject(sel.dataset.dumpSpId, sel.value)) renderDumpZone();
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

// ===== SHARED CONTEXTS (used by Commitments + Delegations) =====
function loadSharedContexts() {
  try {
    const raw = localStorage.getItem('sharedContexts');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string' && x.trim()) : [];
  } catch {
    return [];
  }
}

function saveSharedContexts(list) {
  localStorage.setItem('sharedContexts', JSON.stringify(list));
}

function getAllContexts() {
  const fromStorage = loadSharedContexts();
  const fromData = new Set(fromStorage);
  const proj = getProject();
  if (proj) {
    (proj.commitments || []).forEach(c => { if (c.context) fromData.add(c.context); });
    (proj.delegations || []).forEach(d => { if (d.context) fromData.add(d.context); });
  }
  return Array.from(fromData).sort((a, b) => a.localeCompare(b));
}

function addSharedContext(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) return false;
  const list = loadSharedContexts();
  if (list.some(c => c.toLowerCase() === trimmed.toLowerCase())) return false;
  list.push(trimmed);
  saveSharedContexts(list);
  return true;
}

function removeSharedContext(name) {
  const list = loadSharedContexts().filter(c => c !== name);
  saveSharedContexts(list);
}

// ===== DELEGATIONS =====
const DELEGATION_STATUSES = ['waiting', 'in_progress', 'blocked', 'done', 'cancelled'];
const DELEGATION_STATUS_LABELS = {
  waiting: 'Waiting',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled'
};
const DELEGATION_COLUMN_ORDER = ['waiting', 'in_progress', 'blocked', 'done'];

function loadDelegationNudgeDays() {
  const stored = parseInt(localStorage.getItem('delegationNudgeDays'), 10);
  return Number.isFinite(stored) && stored >= 1 ? stored : 5;
}

function saveDelegationNudgeDays(days) {
  localStorage.setItem('delegationNudgeDays', String(Math.max(1, parseInt(days, 10) || 5)));
}

function daysSince(iso) {
  if (!iso) return null;
  const then = new Date(iso);
  if (isNaN(then)) return null;
  const now = new Date();
  return Math.floor((now - then) / 86400000);
}

function isDelegationStale(d) {
  if (!d || d.status === 'done' || d.status === 'cancelled') return false;
  const ref = d.last_update || d.delegated_on || d.created_at;
  const days = daysSince(ref);
  return days != null && days >= loadDelegationNudgeDays();
}

function isDelegationOverdue(d) {
  if (!d || !d.due_date) return false;
  if (d.status === 'done' || d.status === 'cancelled') return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(d.due_date); due.setHours(0,0,0,0);
  return due < today;
}

function addDelegation({ task, delegated_to, delegated_on, due_date, context, notes, commitment_id }) {
  const proj = getProject();
  if (!Array.isArray(proj.delegations)) proj.delegations = [];
  const now = new Date().toISOString();
  const d = {
    id: generateId('del'),
    task: (task || '').trim(),
    delegated_to: (delegated_to || '').trim(),
    delegated_on: delegated_on || toDateString(new Date()),
    due_date: due_date || null,
    status: 'waiting',
    context: (context || '').trim(),
    last_update: now,
    notes: (notes || '').trim(),
    commitment_id: commitment_id || null,
    created_at: now
  };
  if (!d.task || !d.delegated_to) return null;
  proj.delegations.unshift(d);
  saveData();
  return d;
}

function updateDelegationStatus(id, status) {
  const proj = getProject();
  const d = (proj.delegations || []).find(x => x.id === id);
  if (!d || !DELEGATION_STATUSES.includes(status)) return false;
  d.status = status;
  d.last_update = new Date().toISOString();
  saveData();
  return true;
}

function updateDelegationFields(id, patch) {
  const proj = getProject();
  const d = (proj.delegations || []).find(x => x.id === id);
  if (!d) return false;
  const keys = ['task','delegated_to','delegated_on','due_date','context','notes','commitment_id'];
  let changed = false;
  keys.forEach(k => {
    if (patch[k] !== undefined && patch[k] !== d[k]) {
      d[k] = patch[k];
      changed = true;
    }
  });
  if (changed) {
    d.last_update = new Date().toISOString();
    saveData();
  }
  return changed;
}

function touchDelegation(id) {
  const proj = getProject();
  const d = (proj.delegations || []).find(x => x.id === id);
  if (!d) return false;
  d.last_update = new Date().toISOString();
  saveData();
  return true;
}

function deleteDelegation(id) {
  const proj = getProject();
  const idx = (proj.delegations || []).findIndex(x => x.id === id);
  if (idx === -1) return;
  proj.delegations.splice(idx, 1);
  cleanupNodeLinksOnEntityDelete(state.project, 'delegation', id);
  saveData();
}

function getAllDelegationPeople() {
  const proj = getProject();
  const set = new Set();
  (proj.delegations || []).forEach(d => { if (d.delegated_to) set.add(d.delegated_to); });
  return Array.from(set).sort((a,b) => a.localeCompare(b));
}

function delegationCardHTML(d, expanded) {
  const proj = getProject();
  const stale = isDelegationStale(d);
  const overdue = isDelegationOverdue(d);
  const daysSinceUpdate = daysSince(d.last_update || d.created_at);
  const linkedCommitment = d.commitment_id ? (proj.commitments || []).find(c => c.id === d.commitment_id) : null;
  const contexts = getAllContexts();

  if (expanded) {
    return `<div class="del-card expanded ${overdue?'overdue':''} ${stale?'stale':''}" data-del-id="${d.id}">
      <div class="del-card-header">
        <input type="text" class="form-input del-edit-task" data-del-field="task" value="${escapeHTML(d.task)}">
        <button class="btn btn-ghost btn-icon del-collapse" data-del-id="${d.id}" title="Collapse">▴</button>
      </div>
      <div class="del-edit-row">
        <label class="del-edit-label">To</label>
        <input type="text" class="form-input del-edit-field" data-del-field="delegated_to" value="${escapeHTML(d.delegated_to)}">
      </div>
      <div class="del-edit-row">
        <label class="del-edit-label">Delegated on</label>
        <input type="date" class="form-input del-edit-field" data-del-field="delegated_on" value="${d.delegated_on || ''}">
        <label class="del-edit-label">Due</label>
        <input type="date" class="form-input del-edit-field" data-del-field="due_date" value="${d.due_date || ''}">
      </div>
      <div class="del-edit-row">
        <label class="del-edit-label">Context</label>
        <input type="text" class="form-input del-edit-field" data-del-field="context" value="${escapeHTML(d.context || '')}" list="del-context-list">
        <label class="del-edit-label">Status</label>
        <select class="form-select del-edit-status" data-del-id="${d.id}">
          ${DELEGATION_STATUSES.map(s => `<option value="${s}" ${d.status===s?'selected':''}>${DELEGATION_STATUS_LABELS[s]}</option>`).join('')}
        </select>
      </div>
      <div class="del-edit-row">
        <label class="del-edit-label">Notes</label>
        <textarea class="form-textarea del-edit-field" data-del-field="notes" rows="3">${escapeHTML(d.notes || '')}</textarea>
      </div>
      <div class="del-card-footer">
        <span class="del-meta">Last update: ${daysSinceUpdate!=null ? `${daysSinceUpdate}d ago` : '—'}</span>
        <button class="btn btn-ghost btn-sm del-touch" data-del-id="${d.id}" title="Mark as checked-in now">✓ Checked in</button>
        <button class="btn btn-danger btn-sm del-delete" data-del-id="${d.id}" style="margin-left:auto">Delete</button>
      </div>
    </div>`;
  }

  return `<div class="del-card ${overdue?'overdue':''} ${stale?'stale':''}" data-del-id="${d.id}">
    <div class="del-card-top">
      <span class="del-task">${escapeHTML(d.task)}</span>
      ${stale ? `<span class="del-badge del-badge-stale" title="Last update ${daysSinceUpdate}d ago">⏰ Nudge due</span>` : ''}
      ${overdue ? `<span class="del-badge del-badge-overdue">⚠ Overdue</span>` : ''}
    </div>
    <div class="del-card-meta">
      <span class="del-person">👤 ${escapeHTML(d.delegated_to)}</span>
      ${d.due_date ? `<span class="del-due ${overdue?'overdue':''}">📅 ${formatDate(d.due_date)}</span>` : ''}
      <span class="del-last-update ${stale?'stale':''}">↻ ${daysSinceUpdate!=null ? `${daysSinceUpdate}d ago` : 'never'}</span>
    </div>
    ${(() => {
      const linksChip = genericLinksChip('delegation', d.id);
      if (!d.context && !linkedCommitment && !linksChip) return '';
      return `<div class="del-chips">
        ${d.context ? `<span class="del-context">${escapeHTML(d.context)}</span>` : ''}
        ${linkedCommitment ? `<span class="del-commitment-link" title="Linked commitment">↔ ${escapeHTML(linkedCommitment.counterparty)}</span>` : ''}
        ${linksChip}
      </div>`;
    })()}
  </div>`;
}

function renderDelegations() {
  const proj = getProject();
  if (!Array.isArray(proj.delegations)) proj.delegations = [];
  const filter = state.delegationFilter;
  const nudgeDays = loadDelegationNudgeDays();
  const contexts = getAllContexts();
  const people = getAllDelegationPeople();

  const filtered = proj.delegations.filter(d => {
    if (!filter.showDone && (d.status === 'done' || d.status === 'cancelled')) return false;
    if (filter.context !== 'all' && d.context !== filter.context) return false;
    if (filter.person !== 'all' && d.delegated_to !== filter.person) return false;
    return true;
  });

  const byColumn = {};
  DELEGATION_COLUMN_ORDER.forEach(s => { byColumn[s] = []; });
  filtered.forEach(d => {
    if (byColumn[d.status]) byColumn[d.status].push(d);
  });
  // Sort each column: stale first, then overdue first, then by due date, then by last update age
  Object.values(byColumn).forEach(col => col.sort((a, b) => {
    const staleA = isDelegationStale(a) ? 0 : 1;
    const staleB = isDelegationStale(b) ? 0 : 1;
    if (staleA !== staleB) return staleA - staleB;
    const overA = isDelegationOverdue(a) ? 0 : 1;
    const overB = isDelegationOverdue(b) ? 0 : 1;
    if (overA !== overB) return overA - overB;
    const da = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const db = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    if (da !== db) return da - db;
    return (daysSince(b.last_update) || 0) - (daysSince(a.last_update) || 0);
  }));

  const waitingCount = filtered.filter(d => d.status === 'waiting').length;
  const overdueCount = filtered.filter(d => isDelegationOverdue(d)).length;
  const nudgeCount = filtered.filter(d => isDelegationStale(d)).length;

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-delegations">
      <div class="view-header">
        <div class="view-header-row">
          <div class="view-title">📤 Delegations</div>
          <span class="del-summary">${waitingCount} waiting · ${overdueCount} overdue · ${nudgeCount} need a nudge</span>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:0 24px 24px">
        <datalist id="del-context-list">
          ${contexts.map(c => `<option value="${escapeHTML(c)}"></option>`).join('')}
        </datalist>

        <div class="del-filter-bar">
          <select class="form-select com-filter-select" id="del-filter-context">
            <option value="all" ${filter.context==='all'?'selected':''}>All contexts</option>
            ${contexts.map(c => `<option value="${escapeHTML(c)}" ${filter.context===c?'selected':''}>${escapeHTML(c)}</option>`).join('')}
          </select>
          <select class="form-select com-filter-select" id="del-filter-person">
            <option value="all" ${filter.person==='all'?'selected':''}>Everyone</option>
            ${people.map(p => `<option value="${escapeHTML(p)}" ${filter.person===p?'selected':''}>${escapeHTML(p)}</option>`).join('')}
          </select>
          <label class="com-filter-check">
            <input type="checkbox" id="del-filter-done" ${filter.showDone?'checked':''}>
            Show done/cancelled
          </label>
          <label class="com-filter-check" style="margin-left:auto">
            Nudge after
            <input type="number" min="1" max="60" id="del-nudge-days" value="${nudgeDays}" style="width:52px;padding:4px 6px;font-size:12px;border-radius:4px;border:1px solid var(--border-strong);font-family:var(--font);background:var(--card-bg);color:var(--text-primary);margin:0 4px">
            days
          </label>
          ${(filter.context!=='all' || filter.person!=='all' || filter.showDone) ? `<button class="btn btn-ghost btn-sm" id="btn-del-clear-filters">Clear</button>` : ''}
        </div>

        <div class="del-kanban">
          ${DELEGATION_COLUMN_ORDER.map(status => `
            <div class="del-column" data-column="${status}">
              <div class="del-column-header">
                <span class="del-column-title del-column-${status}">${DELEGATION_STATUS_LABELS[status]}</span>
                <span class="del-column-count">${byColumn[status].length}</span>
              </div>
              ${status === 'waiting' ? `
                <div class="del-add-form">
                  <input type="text" class="form-input" id="del-add-task" placeholder="What to delegate?">
                  <div class="del-add-row">
                    <input type="text" class="form-input" id="del-add-person" placeholder="To whom?" list="del-people-list">
                    <input type="date" class="form-input" id="del-add-due" title="Due date">
                  </div>
                  <div class="del-add-row">
                    <input type="text" class="form-input" id="del-add-context" placeholder="Context" list="del-context-list">
                    <button class="btn btn-primary btn-sm" id="btn-del-add">Add</button>
                  </div>
                </div>
                <datalist id="del-people-list">
                  ${people.map(p => `<option value="${escapeHTML(p)}"></option>`).join('')}
                </datalist>
              ` : ''}
              <div class="del-column-list">
                ${byColumn[status].length
                  ? byColumn[status].map(d => delegationCardHTML(d, state.expandedDelegation === d.id)).join('')
                  : '<div class="del-column-empty">—</div>'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;

  // Add form
  const submitAdd = () => {
    const task = document.getElementById('del-add-task').value;
    const person = document.getElementById('del-add-person').value;
    const due = document.getElementById('del-add-due').value;
    const ctx = document.getElementById('del-add-context').value;
    if (!task.trim() || !person.trim()) {
      showToast('Task and person are required.', 'error');
      return;
    }
    addDelegation({ task, delegated_to: person, due_date: due, context: ctx });
    showToast('Delegation added.', 'success');
    renderDelegations();
  };
  document.getElementById('btn-del-add')?.addEventListener('click', submitAdd);
  ['del-add-task','del-add-person','del-add-context'].forEach(id =>
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submitAdd(); }
    }));

  // Filters
  document.getElementById('del-filter-context')?.addEventListener('change', e => {
    state.delegationFilter.context = e.target.value;
    renderDelegations();
  });
  document.getElementById('del-filter-person')?.addEventListener('change', e => {
    state.delegationFilter.person = e.target.value;
    renderDelegations();
  });
  document.getElementById('del-filter-done')?.addEventListener('change', e => {
    state.delegationFilter.showDone = e.target.checked;
    renderDelegations();
  });
  document.getElementById('btn-del-clear-filters')?.addEventListener('click', () => {
    state.delegationFilter = { context: 'all', person: 'all', showDone: false };
    renderDelegations();
  });
  document.getElementById('del-nudge-days')?.addEventListener('change', e => {
    saveDelegationNudgeDays(e.target.value);
    renderDelegations();
  });

  // Card click (expand), ignoring clicks inside inputs/buttons
  document.querySelectorAll('.del-card:not(.expanded)').forEach(card =>
    card.addEventListener('click', (e) => {
      if (e.target.closest('button, input, select, textarea')) return;
      state.expandedDelegation = card.dataset.delId;
      renderDelegations();
    }));
  document.querySelectorAll('.del-collapse').forEach(b =>
    b.addEventListener('click', () => {
      state.expandedDelegation = null;
      renderDelegations();
    }));

  // Inline edits on expanded card
  document.querySelectorAll('.del-card.expanded').forEach(card => {
    const id = card.dataset.delId;
    const commit = () => {
      const patch = {};
      card.querySelectorAll('[data-del-field]').forEach(el => {
        const key = el.dataset.delField;
        patch[key] = el.value.trim ? el.value.trim() : el.value;
      });
      if (patch.due_date === '') patch.due_date = null;
      updateDelegationFields(id, patch);
    };
    card.querySelectorAll('[data-del-field]').forEach(el => {
      el.addEventListener('change', commit);
      el.addEventListener('blur', commit);
      el.addEventListener('click', e => e.stopPropagation());
    });
    card.querySelector('.del-edit-status')?.addEventListener('change', (e) => {
      updateDelegationStatus(id, e.target.value);
      renderDelegations();
    });
    card.querySelector('.del-touch')?.addEventListener('click', () => {
      touchDelegation(id);
      showToast('Checked in.', 'success');
      renderDelegations();
    });
    card.querySelector('.del-delete')?.addEventListener('click', () => {
      deleteDelegation(id);
      state.expandedDelegation = null;
      showToast('Delegation deleted.', 'info');
      renderDelegations();
    });
  });
}

// ===== COMMITMENTS =====
function isCommitmentOverdue(c) {
  if (c.status !== 'open' || !c.due_date) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(c.due_date); due.setHours(0,0,0,0);
  return due < today;
}

function addCommitment({ direction, counterparty, description, due_date, context, notes }) {
  const proj = getProject();
  if (!Array.isArray(proj.commitments)) proj.commitments = [];
  const now = new Date().toISOString();
  const c = {
    id: generateId('com'),
    direction: direction === 'they_owe' ? 'they_owe' : 'i_owe',
    counterparty: (counterparty || '').trim(),
    description: (description || '').trim(),
    due_date: due_date || null,
    status: 'open',
    context: (context || '').trim(),
    notes: (notes || '').trim(),
    created_at: now,
    fulfilled_at: null,
    cancelled_at: null
  };
  if (!c.counterparty || !c.description) return null;
  proj.commitments.unshift(c);
  saveData();
  return c;
}

function updateCommitmentStatus(id, newStatus) {
  const proj = getProject();
  const c = (proj.commitments || []).find(x => x.id === id);
  if (!c) return false;
  const now = new Date().toISOString();
  c.status = newStatus;
  if (newStatus === 'fulfilled') c.fulfilled_at = now;
  else if (newStatus === 'cancelled') c.cancelled_at = now;
  else if (newStatus === 'open') { c.fulfilled_at = null; c.cancelled_at = null; }
  saveData();
  return true;
}

function deleteCommitment(id) {
  const proj = getProject();
  const idx = (proj.commitments || []).findIndex(x => x.id === id);
  if (idx === -1) return;
  proj.commitments.splice(idx, 1);
  cleanupNodeLinksOnEntityDelete(state.project, 'commitment', id);
  saveData();
}

function updateCommitmentFields(id, patch) {
  const proj = getProject();
  const c = (proj.commitments || []).find(x => x.id === id);
  if (!c) return false;
  const keys = ['direction','counterparty','description','due_date','context','notes'];
  let changed = false;
  for (const k of keys) {
    if (patch[k] !== undefined && patch[k] !== c[k]) {
      c[k] = patch[k];
      changed = true;
    }
  }
  if (changed) saveData();
  return changed;
}

function getAllCommitmentContexts() {
  return getAllContexts();
}

function commitmentCardHTML(c) {
  const overdue = isCommitmentOverdue(c);
  const closed = c.status !== 'open';
  const dueDisplay = c.due_date ? formatDate(c.due_date) : '—';
  const expanded = state.expandedCommitment === c.id;
  const contexts = getAllContexts();

  if (expanded) {
    return `<div class="com-card expanded ${c.direction} ${closed ? 'closed' : ''} ${overdue ? 'overdue' : ''}" data-com-id="${c.id}">
      <div class="com-edit-header">
        <div class="com-add-direction">
          <button class="com-direction-btn ${c.direction==='i_owe'?'selected':''}" data-com-edit-direction="i_owe" data-com-id="${c.id}">I owe</button>
          <button class="com-direction-btn ${c.direction==='they_owe'?'selected':''}" data-com-edit-direction="they_owe" data-com-id="${c.id}">They owe me</button>
        </div>
        <button class="btn btn-ghost btn-icon com-collapse" data-com-id="${c.id}" title="Collapse">▴</button>
      </div>
      <div class="com-edit-row">
        <label class="com-edit-label">Counterparty</label>
        <input type="text" class="form-input com-edit-field" data-com-field="counterparty" value="${escapeHTML(c.counterparty)}">
      </div>
      <div class="com-edit-row">
        <label class="com-edit-label">Description</label>
        <input type="text" class="form-input com-edit-field" data-com-field="description" value="${escapeHTML(c.description)}">
      </div>
      <div class="com-edit-row">
        <label class="com-edit-label">Due</label>
        <input type="date" class="form-input com-edit-field" data-com-field="due_date" value="${c.due_date || ''}">
        <label class="com-edit-label">Context</label>
        <input type="text" class="form-input com-edit-field" data-com-field="context" value="${escapeHTML(c.context || '')}" list="com-context-suggestions-edit">
        <datalist id="com-context-suggestions-edit">
          ${contexts.map(ctx => `<option value="${escapeHTML(ctx)}"></option>`).join('')}
        </datalist>
      </div>
      <div class="com-edit-row">
        <label class="com-edit-label">Notes</label>
        <textarea class="form-textarea com-edit-field" data-com-field="notes" rows="2">${escapeHTML(c.notes || '')}</textarea>
      </div>
      <div class="com-actions">
        ${c.status === 'open' ? `
          <button class="btn btn-ghost btn-sm com-fulfill" data-com-id="${c.id}">✓ Fulfilled</button>
          <button class="btn btn-ghost btn-sm com-cancel" data-com-id="${c.id}">✕ Cancel</button>
        ` : `
          <button class="btn btn-ghost btn-sm com-reopen" data-com-id="${c.id}">↺ Reopen</button>
        `}
        <button class="com-trash com-delete" data-com-id="${c.id}" title="Delete commitment" style="margin-left:auto">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/>
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
    </div>`;
  }

  return `<div class="com-card ${c.direction} ${closed ? 'closed' : ''} ${overdue ? 'overdue' : ''}" data-com-id="${c.id}">
    <div class="com-card-header">
      <span class="com-counterparty">${escapeHTML(c.counterparty)}</span>
      ${overdue ? `<span class="com-badge com-badge-overdue">⚠ Overdue</span>` : ''}
      ${c.status === 'fulfilled' ? `<span class="com-badge com-badge-done">✓ Fulfilled</span>` : ''}
      ${c.status === 'cancelled' ? `<span class="com-badge com-badge-cancelled">✕ Cancelled</span>` : ''}
    </div>
    <div class="com-description">${escapeHTML(c.description)}</div>
    <div class="com-meta">
      <span class="com-due ${overdue ? 'overdue' : ''}">📅 ${dueDisplay}</span>
      ${c.context ? `<span class="com-context">${escapeHTML(c.context)}</span>` : ''}
      ${genericLinksChip('commitment', c.id)}
    </div>
    ${c.notes ? `<div class="com-notes">${escapeHTML(c.notes)}</div>` : ''}
    <div class="com-actions">
      ${c.status === 'open' ? `
        <button class="btn btn-ghost btn-sm com-fulfill" data-com-id="${c.id}">✓ Fulfilled</button>
        <button class="btn btn-ghost btn-sm com-cancel" data-com-id="${c.id}">✕ Cancel</button>
      ` : `
        <button class="btn btn-ghost btn-sm com-reopen" data-com-id="${c.id}">↺ Reopen</button>
      `}
      <button class="com-trash com-delete" data-com-id="${c.id}" title="Delete commitment" style="margin-left:auto">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/>
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </button>
    </div>
  </div>`;
}

// ===== FLOWS =====
function createFlow(name) {
  const proj = getProject();
  if (!Array.isArray(proj.flows)) proj.flows = [];
  const startId = generateId('fnode');
  const flow = {
    id: generateId('flow'),
    name: (name || 'Untitled flow').trim() || 'Untitled flow',
    description: '',
    color: null,
    startNodeId: startId,
    nodes: { [startId]: { id: startId, name: '', text: '', options: [] } },
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  proj.flows.unshift(flow);
  saveData();
  return flow;
}
function findFlow(id) {
  const proj = getProject();
  return (proj.flows || []).find(f => f.id === id) || null;
}
function deleteFlow(id) {
  const proj = getProject();
  proj.flows = (proj.flows || []).filter(f => f.id !== id);
  cleanupNodeLinksOnEntityDelete(state.project, 'flow', id);
  saveData();
}
function flowAddNode(flowId, afterNodeId) {
  const flow = findFlow(flowId);
  if (!flow) return null;
  const id = generateId('fnode');
  flow.nodes[id] = { id, name: '', text: '', options: [] };
  flow.updated = new Date().toISOString();
  saveData();
  return id;
}
function flowDeleteNode(flowId, nodeId) {
  const flow = findFlow(flowId);
  if (!flow) return;
  if (flow.startNodeId === nodeId) {
    const remaining = Object.keys(flow.nodes).filter(k => k !== nodeId);
    if (remaining.length === 0) return;
    flow.startNodeId = remaining[0];
  }
  delete flow.nodes[nodeId];
  for (const n of Object.values(flow.nodes)) {
    n.options = (n.options || []).map(o => o.nextNodeId === nodeId ? { ...o, nextNodeId: null } : o);
  }
  flow.updated = new Date().toISOString();
  saveData();
}
function flowUpdateNodeText(flowId, nodeId, text) {
  const flow = findFlow(flowId);
  if (!flow || !flow.nodes[nodeId]) return;
  flow.nodes[nodeId].text = text;
  flow.updated = new Date().toISOString();
  saveData();
}
function flowUpdateNodeName(flowId, nodeId, name) {
  const flow = findFlow(flowId);
  if (!flow || !flow.nodes[nodeId]) return;
  flow.nodes[nodeId].name = name;
  flow.updated = new Date().toISOString();
  saveData();
}
function flowAddOption(flowId, nodeId) {
  const flow = findFlow(flowId);
  if (!flow || !flow.nodes[nodeId]) return;
  flow.nodes[nodeId].options.push({ id: generateId('fopt'), label: '', nextNodeId: null });
  flow.updated = new Date().toISOString();
  saveData();
}
function flowUpdateOption(flowId, nodeId, optId, patch) {
  const flow = findFlow(flowId);
  if (!flow || !flow.nodes[nodeId]) return;
  const opt = flow.nodes[nodeId].options.find(o => o.id === optId);
  if (!opt) return;
  Object.assign(opt, patch);
  flow.updated = new Date().toISOString();
  saveData();
}
function flowDeleteOption(flowId, nodeId, optId) {
  const flow = findFlow(flowId);
  if (!flow || !flow.nodes[nodeId]) return;
  flow.nodes[nodeId].options = flow.nodes[nodeId].options.filter(o => o.id !== optId);
  flow.updated = new Date().toISOString();
  saveData();
}
function flowSetStart(flowId, nodeId) {
  const flow = findFlow(flowId);
  if (!flow || !flow.nodes[nodeId]) return;
  flow.startNodeId = nodeId;
  flow.updated = new Date().toISOString();
  saveData();
}

function renderFlows() {
  if (state.flowRunning) { renderFlowRunner(); return; }
  if (state.flowEditing) { renderFlowEditor(); return; }
  renderFlowList();
}

function renderFlowList() {
  const proj = getProject();
  const flows = proj.flows || [];
  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-flows">
      <div class="view-header">
        <div class="view-header-row">
          <div class="view-title">Flows</div>
          <button class="btn btn-primary" id="btn-new-flow">+ New flow</button>
        </div>
        <div class="view-subtitle" style="font-size:12px;color:var(--text-muted);margin-top:2px">Branching scripts you can step through during conversations or any guided process.</div>
      </div>
      <div class="view-body-scrollable" style="padding:0 24px 24px">
        ${flows.length === 0 ? `
          <div class="empty-state" style="padding:60px 20px; text-align:center">
            <div style="font-size:36px; margin-bottom:8px">🔀</div>
            <div style="font-size:14px; color:var(--text-secondary); margin-bottom:12px">No flows yet. Build a step-by-step script with branching responses.</div>
            <button class="btn btn-primary" id="btn-new-flow-2">+ Create your first flow</button>
          </div>` : `
          <div class="flow-grid">
            ${flows.map(f => {
              const nodeCount = Object.keys(f.nodes || {}).length;
              const startNode = f.nodes[f.startNodeId];
              const preview = startNode ? (startNode.text || '').slice(0, 100) : '';
              return `<div class="flow-card" data-flow-id="${f.id}">
                <div class="flow-card-head">
                  <span class="flow-card-icon">🔀</span>
                  <span class="flow-card-name">${escapeHTML(f.name)}</span>
                </div>
                ${f.description ? `<div class="flow-card-desc">${escapeHTML(f.description)}</div>` : ''}
                ${preview ? `<div class="flow-card-preview">${escapeHTML(preview)}${(startNode.text || '').length > 100 ? '…' : ''}</div>` : '<div class="flow-card-preview" style="font-style:italic;color:var(--text-muted)">Empty start</div>'}
                <div class="flow-card-meta">
                  <span>${nodeCount} step${nodeCount === 1 ? '' : 's'}</span>
                  <span class="flow-card-actions">
                    ${pinToggleButtonHTML('flow', state.project, f.id, 'btn btn-ghost btn-sm')}
                    <button class="btn btn-ghost btn-sm" data-flow-action="run" data-flow-id="${f.id}" title="Step through this flow">▶ Run</button>
                    <button class="btn btn-ghost btn-sm" data-flow-action="edit" data-flow-id="${f.id}" title="Edit nodes & branches">✎ Edit</button>
                    <button class="btn btn-ghost btn-sm" data-flow-action="delete" data-flow-id="${f.id}" title="Delete flow">✕</button>
                  </span>
                </div>
              </div>`;
            }).join('')}
          </div>`}
      </div>
    </div>`;

  document.getElementById('btn-new-flow')?.addEventListener('click', openFlowNameModal);
  document.getElementById('btn-new-flow-2')?.addEventListener('click', openFlowNameModal);

  document.querySelectorAll('[data-flow-action]').forEach(btn =>
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.flowAction;
      const id = btn.dataset.flowId;
      if (action === 'run') { state.flowRunning = id; state.flowRunCurrent = null; state.flowRunHistory = []; renderFlows(); }
      else if (action === 'edit') { state.flowEditing = id; renderFlows(); }
      else if (action === 'delete') confirmDeleteFlow(id);
    }));
  document.querySelectorAll('.flow-card').forEach(el =>
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-flow-action]')) return;
      state.flowEditing = el.dataset.flowId;
      renderFlows();
    }));
}

function confirmDeleteFlow(id) {
  const f = findFlow(id);
  if (!f) return;
  const overlay = document.getElementById('modal-overlay');
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  overlay.innerHTML = `
    <div class="modal new-project-modal">
      <h3>Delete "${escapeHTML(f.name)}"?</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin:8px 0 14px">
        This flow has ${Object.keys(f.nodes || {}).length} step${Object.keys(f.nodes || {}).length === 1 ? '' : 's'}. This cannot be undone.
      </p>
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="flow-del-cancel">Cancel</button>
        <button class="btn" id="flow-del-ok" style="background:#dc2626;color:white;border-color:#dc2626">Delete</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  document.getElementById('flow-del-cancel').onclick = close;
  document.getElementById('flow-del-ok').onclick = () => {
    deleteFlow(id);
    close();
    renderFlows();
    showToast(`Flow "${f.name}" deleted.`, 'info');
  };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

// `onCreate` (optional) is invoked after a NEW flow is created and persisted.
// When provided, it FULLY OWNS post-creation behavior — the modal closes and
// the callback is responsible for whatever navigation/linking should happen.
// This is how Phase 2's spark-map detail panel forms an atomic node→flow link
// at creation time (no pending-state dance). For the Rename branch onCreate
// is ignored.
function openFlowNameModal(prefillId, onCreate) {
  const overlay = document.getElementById('modal-overlay');
  const existing = prefillId ? findFlow(prefillId) : null;
  overlay.innerHTML = `
    <div class="modal new-project-modal">
      <h3>${existing ? 'Rename flow' : 'New flow'}</h3>
      <label class="settings-label">Name</label>
      <input type="text" class="modal-input" id="flow-name-input" placeholder="e.g. Discovery script · Onboarding · Triage" maxlength="80" value="${existing ? escapeHTML(existing.name) : ''}">
      <label class="settings-label" style="margin-top:10px">Description (optional)</label>
      <input type="text" class="modal-input" id="flow-desc-input" placeholder="Short summary" maxlength="200" value="${existing ? escapeHTML(existing.description || '') : ''}">
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="flow-name-cancel">Cancel</button>
        <button class="btn btn-primary" id="flow-name-ok">${existing ? 'Save' : 'Create'}</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  const inp = document.getElementById('flow-name-input');
  inp.focus(); inp.select();
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  const submit = () => {
    const name = inp.value.trim();
    if (!name) { inp.focus(); return; }
    const desc = document.getElementById('flow-desc-input').value.trim();
    if (existing) {
      existing.name = name;
      existing.description = desc;
      existing.updated = new Date().toISOString();
      saveData();
      close();
      renderFlows();
    } else {
      const f = createFlow(name);
      f.description = desc;
      saveData();
      close();
      if (typeof onCreate === 'function') {
        onCreate(f);
      } else {
        state.flowEditing = f.id;
        renderFlows();
      }
    }
  };
  document.getElementById('flow-name-cancel').onclick = close;
  document.getElementById('flow-name-ok').onclick = submit;
  inp.onkeydown = (e) => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') close(); };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function renderFlowEditor() {
  const flow = findFlow(state.flowEditing);
  if (!flow) { state.flowEditing = null; renderFlows(); return; }
  const nodes = Object.values(flow.nodes);
  const nodeOptions = nodes.map((n, idx) => {
    const trimmedName = (n.name || '').trim();
    const previewText = (n.text || '').trim().split('\n')[0].slice(0, 50);
    const baseLabel = trimmedName || `Step ${idx + 1}`;
    const fullLabel = trimmedName
      ? (previewText ? `${trimmedName} · ${previewText}` : trimmedName)
      : (previewText ? `Step ${idx + 1} · ${previewText}` : `Step ${idx + 1}`);
    return {
      id: n.id,
      label: fullLabel,
      shortLabel: baseLabel,
      isStart: n.id === flow.startNodeId
    };
  });

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-flow-editor">
      <div class="view-header">
        <div class="view-header-row">
          <div style="display:flex;align-items:center;gap:10px">
            <button class="btn btn-ghost btn-sm" id="flow-back">← Flows</button>
            <span class="view-title">${escapeHTML(flow.name)}</span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" id="flow-rename">✎ Rename</button>
            <button class="btn btn-primary" id="flow-run-now">▶ Run</button>
          </div>
        </div>
        ${flow.description ? `<div class="view-subtitle" style="font-size:12px;color:var(--text-muted);margin-top:2px">${escapeHTML(flow.description)}</div>` : ''}
        ${(() => {
          const linksChip = genericLinksChip('flow', flow.id);
          return linksChip ? `<div class="flow-editor-meta" style="margin-top:6px">${linksChip}</div>` : '';
        })()}
      </div>
      <div class="view-body-scrollable" style="padding:0 24px 32px">
        <div class="flow-editor">
          ${nodes.map((n, i) => flowNodeEditorHTML(flow, n, i, nodeOptions)).join('')}
          <button class="btn btn-secondary flow-add-node" id="flow-add-node-btn">+ Add step</button>
        </div>
        ${backlinksPanelHTML('flow', state.project, flow.id)}
      </div>
    </div>`;

  document.getElementById('flow-back').onclick = () => { state.flowEditing = null; renderFlows(); };
  document.getElementById('flow-rename').onclick = () => openFlowNameModal(flow.id);
  document.getElementById('flow-run-now').onclick = () => {
    state.flowRunning = flow.id; state.flowEditing = null;
    state.flowRunCurrent = flow.startNodeId; state.flowRunHistory = [];
    renderFlows();
  };
  document.getElementById('flow-add-node-btn').onclick = () => {
    flowAddNode(flow.id);
    renderFlows();
  };

  document.querySelectorAll('[data-flow-node-text]').forEach(el => {
    installRichEditorPaste(el);
    el.addEventListener('input', () => {
      flowUpdateNodeText(flow.id, el.dataset.flowNodeText, el.innerHTML || '');
      refreshFlowTargetLabels(flow.id);
    });
  });
  document.querySelectorAll('[data-flow-node-name]').forEach(inp => {
    inp.addEventListener('input', () => {
      flowUpdateNodeName(flow.id, inp.dataset.flowNodeName, inp.value);
      refreshFlowTargetLabels(flow.id);
    });
  });
  document.querySelectorAll('[data-flow-set-start]').forEach(btn =>
    btn.addEventListener('click', () => { flowSetStart(flow.id, btn.dataset.flowSetStart); renderFlows(); }));
  document.querySelectorAll('[data-flow-delete-node]').forEach(btn =>
    btn.addEventListener('click', () => {
      flowDeleteNode(flow.id, btn.dataset.flowDeleteNode);
      renderFlows();
    }));
  document.querySelectorAll('[data-flow-add-option]').forEach(btn =>
    btn.addEventListener('click', () => {
      flowAddOption(flow.id, btn.dataset.flowAddOption);
      renderFlows();
    }));
  document.querySelectorAll('[data-flow-opt-label]').forEach(inp => {
    inp.addEventListener('input', () => {
      flowUpdateOption(flow.id, inp.dataset.flowNode, inp.dataset.flowOptLabel, { label: inp.value });
    });
  });
  document.querySelectorAll('[data-flow-opt-target]').forEach(sel => {
    sel.addEventListener('change', () => {
      flowUpdateOption(flow.id, sel.dataset.flowNode, sel.dataset.flowOptTarget, {
        nextNodeId: sel.value || null
      });
    });
  });
  document.querySelectorAll('[data-flow-delete-opt]').forEach(btn =>
    btn.addEventListener('click', () => {
      flowDeleteOption(flow.id, btn.dataset.flowNode, btn.dataset.flowDeleteOpt);
      renderFlows();
    }));
}

function refreshFlowTargetLabels(flowId) {
  const flow = findFlow(flowId);
  if (!flow) return;
  const nodes = Object.values(flow.nodes);
  const idIndex = new Map(nodes.map((n, i) => [n.id, i]));
  document.querySelectorAll('[data-flow-opt-target]').forEach(sel => {
    const sourceNodeId = sel.dataset.flowNode;
    const currentValue = sel.value;
    const opts = ['<option value="">— End —</option>'];
    nodes.forEach((n, i) => {
      if (n.id === sourceNodeId) return;
      const trimmedName = (n.name || '').trim();
      const previewText = noteContentText(n.text || '').split('\n')[0].slice(0, 50);
      const label = trimmedName
        ? (previewText ? `${trimmedName} · ${previewText}` : trimmedName)
        : (previewText ? `Step ${i + 1} · ${previewText}` : `Step ${i + 1}`);
      const isStart = n.id === flow.startNodeId;
      const safeLabel = (isStart ? '★ ' : '') + label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const sel2 = currentValue === n.id ? ' selected' : '';
      opts.push(`<option value="${n.id}"${sel2}>${safeLabel}</option>`);
    });
    sel.innerHTML = opts.join('');
  });
}

function flowNodeEditorHTML(flow, node, index, nodeOptions) {
  const isStart = node.id === flow.startNodeId;
  const stepNumber = index + 1;
  return `<div class="flow-node ${isStart ? 'is-start' : ''}" data-node-id="${node.id}">
    <div class="flow-node-head">
      <span class="flow-node-badge">${isStart ? 'START' : `#${stepNumber}`}</span>
      <input type="text" class="flow-node-name" data-flow-node-name="${node.id}"
        placeholder="Step name (optional, e.g. ‘Objection: too expensive’)" value="${escapeHTML(node.name || '')}" maxlength="80">
      ${!isStart ? `<button class="btn btn-ghost btn-sm" data-flow-set-start="${node.id}" title="Make this the starting step">⤴ Set start</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-flow-delete-node="${node.id}" title="Delete this step">✕</button>
    </div>
    <div class="flow-node-text" data-flow-node-text="${node.id}" contenteditable="true" data-placeholder="What you'll say at this step… (Ctrl+B / Ctrl+I for formatting)">${noteContentInitialHTML(node.text || '')}</div>
    <div class="flow-options">
      ${(node.options || []).map(opt => `
        <div class="flow-option" data-opt-id="${opt.id}">
          <span class="flow-option-arrow">→</span>
          <input type="text" class="flow-option-label" data-flow-opt-label="${opt.id}" data-flow-node="${node.id}"
            placeholder="If they respond…" value="${escapeHTML(opt.label || '')}">
          <span class="flow-option-then">then go to</span>
          <select class="flow-option-target" data-flow-opt-target="${opt.id}" data-flow-node="${node.id}">
            <option value="">— End —</option>
            ${nodeOptions.filter(no => no.id !== node.id).map(no => `<option value="${no.id}" ${opt.nextNodeId===no.id?'selected':''}>${no.isStart?'★ ':''}${escapeHTML(no.label)}</option>`).join('')}
          </select>
          <button class="btn btn-ghost btn-sm" data-flow-delete-opt="${opt.id}" data-flow-node="${node.id}" title="Remove branch">✕</button>
        </div>`).join('')}
      <button class="btn btn-ghost btn-sm flow-option-add" data-flow-add-option="${node.id}">+ Add branch</button>
    </div>
  </div>`;
}

function renderFlowRunner() {
  const flow = findFlow(state.flowRunning);
  if (!flow) { state.flowRunning = null; renderFlows(); return; }
  if (!state.flowRunCurrent || !flow.nodes[state.flowRunCurrent]) {
    state.flowRunCurrent = flow.startNodeId;
    state.flowRunHistory = [];
  }
  const node = flow.nodes[state.flowRunCurrent];
  if (!node) { state.flowRunning = null; renderFlows(); return; }
  const opts = node.options || [];

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-flow-runner">
      <div class="view-header">
        <div class="view-header-row">
          <div style="display:flex;align-items:center;gap:10px">
            <button class="btn btn-ghost btn-sm" id="flow-runner-exit">✕ Close</button>
            <span class="view-title">${escapeHTML(flow.name)}</span>
            <span class="flow-runner-step">step ${state.flowRunHistory.length + 1}</span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" id="flow-runner-back" ${state.flowRunHistory.length === 0 ? 'disabled' : ''}>← Back</button>
            <button class="btn btn-ghost btn-sm" id="flow-runner-restart">⟲ Restart</button>
            <button class="btn btn-ghost btn-sm" id="flow-runner-edit">✎ Edit</button>
          </div>
        </div>
      </div>
      <div class="view-body-scrollable" style="padding:0 24px 32px">
        <div class="flow-runner">
          <div class="flow-runner-text">${noteContentText(node.text || '') ? noteContentInitialHTML(node.text || '') : '<em style="color:var(--text-muted)">No text for this step</em>'}</div>
          ${opts.length > 0 ? `
            <div class="flow-runner-prompt">Pick the response that matches what they said:</div>
            <div class="flow-runner-options">
              ${opts.map(o => `<button class="flow-runner-option" data-flow-runner-go="${o.nextNodeId || ''}">
                <span class="flow-runner-option-label">${escapeHTML(o.label || '(unlabeled branch)')}</span>
                <span class="flow-runner-option-arrow">${o.nextNodeId ? '→' : '⌧'}</span>
              </button>`).join('')}
            </div>` : `
            <div class="flow-runner-end">
              <div style="font-size:18px; font-weight:600; margin-bottom:6px">End of this branch</div>
              <div style="font-size:13px; color:var(--text-secondary)">No next steps defined here. Use Back to return or Restart to start over.</div>
            </div>`}
          ${state.flowRunHistory.length > 0 ? `
            <details class="flow-runner-history">
              <summary>Path so far (${state.flowRunHistory.length} step${state.flowRunHistory.length===1?'':'s'})</summary>
              <ol class="flow-runner-history-list">
                ${state.flowRunHistory.map(h => {
                  const n = flow.nodes[h.nodeId];
                  const optLabel = h.optLabel || '(no choice)';
                  return `<li><div class="frh-text">${escapeHTML((n?.text || '').trim().slice(0, 120) || '(empty)')}</div><div class="frh-choice">→ ${escapeHTML(optLabel)}</div></li>`;
                }).join('')}
              </ol>
            </details>` : ''}
        </div>
      </div>
    </div>`;

  document.getElementById('flow-runner-exit').onclick = () => { state.flowRunning = null; state.flowRunCurrent = null; state.flowRunHistory = []; renderFlows(); };
  document.getElementById('flow-runner-back').onclick = () => {
    if (state.flowRunHistory.length === 0) return;
    const prev = state.flowRunHistory.pop();
    state.flowRunCurrent = prev.nodeId;
    renderFlows();
  };
  document.getElementById('flow-runner-restart').onclick = () => {
    state.flowRunCurrent = flow.startNodeId; state.flowRunHistory = [];
    renderFlows();
  };
  document.getElementById('flow-runner-edit').onclick = () => {
    state.flowEditing = flow.id; state.flowRunning = null; renderFlows();
  };
  document.querySelectorAll('[data-flow-runner-go]').forEach(btn =>
    btn.addEventListener('click', () => {
      const next = btn.dataset.flowRunnerGo;
      const optLabel = btn.querySelector('.flow-runner-option-label')?.textContent || '';
      state.flowRunHistory.push({ nodeId: state.flowRunCurrent, optLabel });
      if (next) state.flowRunCurrent = next;
      else state.flowRunCurrent = null;
      if (!state.flowRunCurrent) {
        showToast('End of this branch.', 'info');
        state.flowRunCurrent = state.flowRunHistory[state.flowRunHistory.length - 1]?.nodeId || flow.startNodeId;
      }
      renderFlows();
    }));
}

function renderCommitments() {
  const proj = getProject();
  if (!Array.isArray(proj.commitments)) proj.commitments = [];
  const filter = state.commitmentFilter;
  const contexts = getAllCommitmentContexts();

  const filtered = proj.commitments.filter(c => {
    if (!filter.showClosed && c.status !== 'open') return false;
    if (filter.context !== 'all' && c.context !== filter.context) return false;
    if (filter.direction !== 'all' && c.direction !== filter.direction) return false;
    if (filter.overdue && !isCommitmentOverdue(c)) return false;
    return true;
  });

  const iOwe = filtered.filter(c => c.direction === 'i_owe')
    .sort((a,b) => (new Date(a.due_date || '9999-12-31')) - (new Date(b.due_date || '9999-12-31')));
  const theyOwe = filtered.filter(c => c.direction === 'they_owe')
    .sort((a,b) => (new Date(a.due_date || '9999-12-31')) - (new Date(b.due_date || '9999-12-31')));

  const openCount = proj.commitments.filter(c => c.status === 'open').length;
  const overdueCount = proj.commitments.filter(c => isCommitmentOverdue(c)).length;

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-commitments">
      <div class="view-header">
        <div class="view-header-row">
          <div class="view-title">🤝 Commitments</div>
          <span style="font-size:13px;color:var(--text-muted)">${openCount} open${overdueCount ? ` · ${overdueCount} overdue` : ''}</span>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:0 24px 24px">
        <div class="com-add-form">
          <div class="com-add-direction">
            <button class="com-direction-btn selected" data-direction="i_owe">I owe</button>
            <button class="com-direction-btn" data-direction="they_owe">They owe me</button>
          </div>
          <div class="com-add-row">
            <input type="text" class="form-input" id="com-counterparty" placeholder="Counterparty (name)" style="flex:1;min-width:160px">
            <input type="text" class="form-input" id="com-description" placeholder="What was promised?" style="flex:2;min-width:200px">
          </div>
          <div class="com-add-row">
            <input type="date" class="form-input" id="com-due-date" title="Due date" style="width:160px">
            <input type="text" class="form-input" id="com-context" placeholder="Context (e.g. Acme Corp)" style="flex:1;min-width:160px" list="com-context-suggestions">
            <datalist id="com-context-suggestions">
              ${contexts.map(ctx => `<option value="${escapeHTML(ctx)}"></option>`).join('')}
            </datalist>
            <button class="btn btn-primary" id="btn-com-add">Add</button>
          </div>
          <textarea class="form-textarea com-notes-input" id="com-notes" placeholder="Optional notes…" rows="2"></textarea>
        </div>

        <div class="com-filter-bar">
          <select class="form-select com-filter-select" id="com-filter-context">
            <option value="all" ${filter.context==='all'?'selected':''}>All contexts</option>
            ${contexts.map(ctx => `<option value="${escapeHTML(ctx)}" ${filter.context===ctx?'selected':''}>${escapeHTML(ctx)}</option>`).join('')}
          </select>
          <select class="form-select com-filter-select" id="com-filter-direction">
            <option value="all" ${filter.direction==='all'?'selected':''}>Both directions</option>
            <option value="i_owe" ${filter.direction==='i_owe'?'selected':''}>I owe</option>
            <option value="they_owe" ${filter.direction==='they_owe'?'selected':''}>They owe me</option>
          </select>
          <label class="com-filter-check">
            <input type="checkbox" id="com-filter-overdue" ${filter.overdue?'checked':''}>
            Overdue only
          </label>
          <label class="com-filter-check">
            <input type="checkbox" id="com-filter-closed" ${filter.showClosed?'checked':''}>
            Show closed
          </label>
          ${(filter.context!=='all' || filter.direction!=='all' || filter.overdue || filter.showClosed) ? `<button class="btn btn-ghost btn-sm" id="btn-com-clear-filters">Clear</button>` : ''}
        </div>

        <div class="com-groups">
          <div class="com-group">
            <div class="com-group-header">
              <span class="com-group-title">I owe</span>
              <span class="com-group-count">${iOwe.length}</span>
            </div>
            ${iOwe.length
              ? `<div class="com-list">${iOwe.map(c => commitmentCardHTML(c)).join('')}</div>`
              : '<div class="empty-state" style="padding:20px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border)">Nothing here.</div>'}
          </div>
          <div class="com-group">
            <div class="com-group-header">
              <span class="com-group-title">They owe me</span>
              <span class="com-group-count">${theyOwe.length}</span>
            </div>
            ${theyOwe.length
              ? `<div class="com-list">${theyOwe.map(c => commitmentCardHTML(c)).join('')}</div>`
              : '<div class="empty-state" style="padding:20px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border)">Nothing here.</div>'}
          </div>
        </div>
      </div>
    </div>`;

  // Direction toggle for add form
  let selectedDirection = 'i_owe';
  document.querySelectorAll('.com-direction-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      selectedDirection = btn.dataset.direction;
      document.querySelectorAll('.com-direction-btn').forEach(b => b.classList.toggle('selected', b === btn));
    }));

  // Add form submit
  const submitAdd = () => {
    const counterparty = document.getElementById('com-counterparty').value;
    const description = document.getElementById('com-description').value;
    const due_date = document.getElementById('com-due-date').value;
    const context = document.getElementById('com-context').value;
    const notes = document.getElementById('com-notes').value;
    if (!counterparty.trim() || !description.trim()) {
      showToast('Counterparty and description are required.', 'error');
      return;
    }
    addCommitment({ direction: selectedDirection, counterparty, description, due_date, context, notes });
    showToast('Commitment added.', 'success');
    renderCommitments();
  };
  document.getElementById('btn-com-add')?.addEventListener('click', submitAdd);
  ['com-counterparty','com-description','com-context'].forEach(id =>
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submitAdd(); }
    }));

  // Filter handlers
  document.getElementById('com-filter-context')?.addEventListener('change', e => {
    state.commitmentFilter.context = e.target.value;
    renderCommitments();
  });
  document.getElementById('com-filter-direction')?.addEventListener('change', e => {
    state.commitmentFilter.direction = e.target.value;
    renderCommitments();
  });
  document.getElementById('com-filter-overdue')?.addEventListener('change', e => {
    state.commitmentFilter.overdue = e.target.checked;
    renderCommitments();
  });
  document.getElementById('com-filter-closed')?.addEventListener('change', e => {
    state.commitmentFilter.showClosed = e.target.checked;
    renderCommitments();
  });
  document.getElementById('btn-com-clear-filters')?.addEventListener('click', () => {
    state.commitmentFilter = { context: 'all', direction: 'all', overdue: false, showClosed: false };
    renderCommitments();
  });

  // Card actions
  document.querySelectorAll('.com-fulfill').forEach(b =>
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      updateCommitmentStatus(b.dataset.comId, 'fulfilled');
      renderCommitments();
    }));
  document.querySelectorAll('.com-cancel').forEach(b =>
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      updateCommitmentStatus(b.dataset.comId, 'cancelled');
      renderCommitments();
    }));
  document.querySelectorAll('.com-reopen').forEach(b =>
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      updateCommitmentStatus(b.dataset.comId, 'open');
      renderCommitments();
    }));
  document.querySelectorAll('.com-delete').forEach(b =>
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = b.dataset.comId;
      deleteCommitment(id);
      if (state.expandedCommitment === id) state.expandedCommitment = null;
      showToast('Commitment deleted.', 'info');
      renderCommitments();
    }));

  // Click a collapsed card to expand it (ignore clicks on buttons/inputs)
  document.querySelectorAll('.com-card:not(.expanded)').forEach(card =>
    card.addEventListener('click', (e) => {
      if (e.target.closest('button, input, select, textarea')) return;
      state.expandedCommitment = card.dataset.comId;
      renderCommitments();
    }));
  document.querySelectorAll('.com-collapse').forEach(b =>
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      state.expandedCommitment = null;
      renderCommitments();
    }));

  // Inline edits inside expanded card
  document.querySelectorAll('.com-card.expanded').forEach(card => {
    const id = card.dataset.comId;
    const commit = () => {
      const patch = {};
      card.querySelectorAll('[data-com-field]').forEach(el => {
        const key = el.dataset.comField;
        let val = el.value;
        if (typeof val === 'string') val = val.trim();
        if (key === 'due_date' && !val) val = null;
        patch[key] = val;
      });
      updateCommitmentFields(id, patch);
    };
    card.querySelectorAll('[data-com-field]').forEach(el => {
      el.addEventListener('change', commit);
      el.addEventListener('blur', commit);
      el.addEventListener('click', e => e.stopPropagation());
    });
    card.querySelectorAll('[data-com-edit-direction]').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dir = btn.dataset.comEditDirection;
        if (updateCommitmentFields(id, { direction: dir })) renderCommitments();
      }));
  });
}

function renderReminders() {
  const proj = getProject();
  const upcoming = proj.reminders.filter(r => !r.fired).sort((a,b) => new Date(a.datetime) - new Date(b.datetime));
  const past = proj.reminders.filter(r => r.fired).sort((a,b) => new Date(b.datetime) - new Date(a.datetime));

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-reminders">
      <div class="view-header">
        <div class="view-header-row"><div class="view-title">Reminders</div></div>
      </div>
      <div class="view-body-scrollable">
        <div class="reminder-add-form">
          <div class="form-row">
            <div class="form-group"><label class="form-label">Title</label>
              <input type="text" class="form-input" id="rem-title" placeholder="Reminder title…"></div>
            <div class="form-group"><label class="form-label">Date</label>
              <input type="date" class="form-input" id="rem-date"></div>
            <div class="form-group"><label class="form-label">Time</label>
              <input type="time" class="form-input" id="rem-time"></div>
          </div>
          <div class="form-row-2">
            <div class="form-group"><label class="form-label">Note (optional)</label>
              <input type="text" class="form-input" id="rem-note" placeholder="Details…"></div>
            <button class="btn btn-secondary" id="btn-rem-recurrence" type="button" title="Set repeat schedule" style="height:38px">${state.pendingReminderRecurrence ? `🔁 ${escapeHTML(describeRecurrence(state.pendingReminderRecurrence))}` : '🔁 Repeat'}</button>
            <button class="btn btn-primary" id="btn-add-reminder" style="height:38px">Add Reminder</button>
          </div>
        </div>
        ${upcoming.length ? `
          <div class="reminder-section-title">🔔 Upcoming (${upcoming.length})</div>
          <div class="reminder-list">${upcoming.map(reminderItemHTML).join('')}</div>` : ''}
        ${past.length ? `
          <div class="reminder-section-title" style="margin-top:20px">✓ Past</div>
          <div class="reminder-list">${past.slice(0,10).map(reminderItemHTML).join('')}</div>` : ''}
        ${!upcoming.length && !past.length
          ? `<div class="empty-state" style="padding:24px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border)">No reminders yet.</div>` : ''}
      </div>
    </div>`;

  const soon = new Date(Date.now() + 3600000);
  document.getElementById('rem-date').value = soon.toISOString().split('T')[0];
  document.getElementById('rem-time').value = soon.toTimeString().slice(0,5);
  document.getElementById('btn-add-reminder').onclick = addReminder;
  document.getElementById('rem-title').onkeydown = (e) => { if (e.key === 'Enter') addReminder(); };
  document.getElementById('btn-rem-recurrence')?.addEventListener('click', () => {
    openRecurrenceEditor({
      title: 'New reminder',
      initial: state.pendingReminderRecurrence,
      hasExisting: !!state.pendingReminderRecurrence,
      onSave: (rule) => { state.pendingReminderRecurrence = rule; renderReminders(); },
      onRemove: () => { state.pendingReminderRecurrence = null; renderReminders(); },
      onRestart: () => {}
    });
  });
  document.querySelectorAll('.reminder-set-recur').forEach(b =>
    b.addEventListener('click', () => showReminderRecurrenceModal(b.dataset.id)));
  document.querySelectorAll('[data-rem-recur]').forEach(el =>
    el.addEventListener('click', () => showReminderRecurrenceModal(el.dataset.remRecur)));
  document.querySelectorAll('.reminder-delete').forEach(b =>
    b.addEventListener('click', () => deleteReminder(b.dataset.id)));
  document.querySelectorAll('.reminder-done').forEach(b =>
    b.addEventListener('click', () => markReminderDone(b.dataset.id)));
  document.querySelectorAll('.reminder-undone').forEach(b =>
    b.addEventListener('click', () => markReminderUndone(b.dataset.id)));
}

function markReminderDone(id) {
  const proj = getProject();
  const r = (proj.reminders || []).find(x => x.id === id);
  if (!r) return;
  r.fired = true;
  r.doneAt = new Date().toISOString();
  let spawnedMsg = '';
  if (r.recurrence) {
    const next = spawnNextRecurringReminder(state.project, r);
    if (next) spawnedMsg = ` Next: ${formatDateTime(next.datetime)}`;
  }
  saveData();
  showToast(`Marked "${r.title}" as done.${spawnedMsg}`, 'success');
  renderApp();
}
function markReminderUndone(id) {
  const proj = getProject();
  const r = (proj.reminders || []).find(x => x.id === id);
  if (!r) return;
  r.fired = false;
  delete r.doneAt;
  saveData();
  renderApp();
}

function reminderItemHTML(r) {
  const linksChip = genericLinksChip('reminder', r.id);
  return `<div class="reminder-item ${r.fired?'fired':''}" data-reminder-id="${r.id}">
    <div class="reminder-icon">${r.fired?'✅':'🔔'}</div>
    <div class="reminder-body">
      <div class="reminder-title">${escapeHTML(r.title)}${r.recurrence ? ` <span class="reminder-recur-chip" data-rem-recur="${r.id}" title="${escapeHTML(describeRecurrence(r.recurrence))} · click to edit">🔁 ${escapeHTML(describeRecurrence(r.recurrence))}</span>` : ''}</div>
      <div class="reminder-time">${formatDateTime(r.datetime)}${linksChip ? ` ${linksChip}` : ''}</div>
      ${r.note ? `<div class="reminder-note">${escapeHTML(r.note)}</div>` : ''}
    </div>
    ${!r.recurrence ? `<button class="btn btn-ghost btn-icon reminder-set-recur" data-id="${r.id}" title="Set repeat schedule">🔁</button>` : ''}
    ${!r.fired ? `<button class="btn btn-ghost btn-icon reminder-done" data-id="${r.id}" title="Mark as done">✓</button>` : `<button class="btn btn-ghost btn-icon reminder-undone" data-id="${r.id}" title="Reopen">↺</button>`}
    <button class="btn btn-ghost btn-icon reminder-delete" data-id="${r.id}" title="Delete">✕</button>
  </div>`;
}

function addReminder() {
  const title = document.getElementById('rem-title').value.trim();
  const date  = document.getElementById('rem-date').value;
  const time  = document.getElementById('rem-time').value;
  const note  = document.getElementById('rem-note').value.trim();
  if (!title) { showToast('Please enter a reminder title.', 'error'); return; }
  if (!date || !time) { showToast('Please set a date and time.', 'error'); return; }
  const datetime = new Date(`${date}T${time}`).toISOString();
  if (new Date(datetime) < new Date()) { showToast('Please pick a future time.', 'error'); return; }
  const proj = getProject();
  const reminder = { id: generateId('rem'), title, note, datetime, fired: false };
  if (state.pendingReminderRecurrence) {
    reminder.recurrence = state.pendingReminderRecurrence;
    state.pendingReminderRecurrence = null;
  }
  proj.reminders.push(reminder);
  saveData();
  showToast(reminder.recurrence ? `Reminder set · repeats ${describeRecurrence(reminder.recurrence)}` : 'Reminder set.', 'success');
  renderReminders();
}

function showReminderRecurrenceModal(reminderId) {
  const proj = getProject();
  const r = (proj.reminders || []).find(x => x.id === reminderId);
  if (!r) return;
  openRecurrenceEditor({
    title: r.title,
    initial: r.recurrence,
    hasExisting: !!r.recurrence,
    onSave: (rule) => {
      r.recurrence = rule;
      saveData();
      renderReminders();
    },
    onRemove: () => {
      r.recurrence = null;
      saveData();
      renderReminders();
    },
    onRestart: (draft) => {
      const next = computeNextOccurrence(draft, new Date());
      if (!next) { showToast('Could not compute next occurrence.', 'error'); return; }
      next.setHours(new Date(r.datetime).getHours(), new Date(r.datetime).getMinutes(), 0, 0);
      r.datetime = next.toISOString();
      r.fired = false;
      delete r.doneAt;
      saveData();
      renderReminders();
      showToast(`Reset to ${formatDateTime(r.datetime)}`, 'success');
    }
  });
}

function deleteReminder(id) {
  const proj = getProject();
  proj.reminders = proj.reminders.filter(r => r.id !== id);
  cleanupNodeLinksOnEntityDelete(state.project, 'reminder', id);
  saveData();
  renderReminders();
}

// ===== SPARK MAP (brand-new mind map, SVG-rendered, tidy-tree layout) =====
const BM_PAD_X = 16;
const BM_FONT = '13px "Segoe UI", system-ui, sans-serif';
const BM_ROOT_FONT = '15px "Segoe UI", system-ui, sans-serif';
const BM_H_GAP = 72;
const BM_V_GAP = 14;
const BM_NODE_H = 34;
const BM_ROOT_H = 44;
const BM_SWATCH_COLORS = ['#16a34a','#3b82f6','#f59e0b','#ec4899','#8b5cf6','#14b8a6','#f97316','#64748b'];
const BM_SVG_NS = 'http://www.w3.org/2000/svg';

let _bmMeasureCtx = null;
function bmMeasure(label, isRoot, hasAccent) {
  if (!_bmMeasureCtx) _bmMeasureCtx = document.createElement('canvas').getContext('2d');
  _bmMeasureCtx.font = isRoot ? BM_ROOT_FONT : BM_FONT;
  const w = _bmMeasureCtx.measureText(label || ' ').width;
  const extra = hasAccent && !isRoot ? 12 : 0;
  return { w: Math.max(60, Math.round(w)) + BM_PAD_X * 2 + extra, h: isRoot ? BM_ROOT_H : BM_NODE_H };
}

function getBrainmap() {
  const proj = getProject();
  if (!proj.brainmap || !proj.brainmap.rootId || !proj.brainmap.nodes) {
    const rootId = 'bm-root';
    proj.brainmap = {
      rootId,
      nodes: { [rootId]: { id: rootId, parentId: null, label: proj.name || 'Workspace', color: null, side: null, collapsed: false, note: '', order: 0 } }
    };
  }
  return proj.brainmap;
}

function bmAccent() {
  return getProject().color || '#16a34a';
}

function bmGetChildren(bm, parentId) {
  return Object.values(bm.nodes)
    .filter(n => n.parentId === parentId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

function bmBranchColor(bm, node) {
  let n = node;
  while (n && n.parentId && !n.color) n = bm.nodes[n.parentId];
  if (n && n.color) return n.color;
  return bmAccent();
}

function bmSubprojectOf(node) {
  if (!node || !node.subprojectId) return null;
  return (getProject().subprojects || []).find(s => s.id === node.subprojectId) || null;
}

function bmLayout(bm) {
  const out = {};
  const root = bm.nodes[bm.rootId];
  const rootSize = bmMeasure(root.label, true, !!root.subprojectId);
  out[root.id] = { x: 0, y: 0, w: rootSize.w, h: rootSize.h, side: 'center' };

  function subtreeHeight(nodeId) {
    const node = bm.nodes[nodeId];
    const size = bmMeasure(node.label, nodeId === bm.rootId, !!node.subprojectId);
    if (node.collapsed) return size.h;
    const kids = bmGetChildren(bm, nodeId);
    if (!kids.length) return size.h;
    const totals = kids.map(k => subtreeHeight(k.id));
    const sum = totals.reduce((a, b) => a + b, 0) + (kids.length - 1) * BM_V_GAP;
    return Math.max(size.h, sum);
  }

  function layoutDescendants(nodeId, nx, ny, dir) {
    const node = bm.nodes[nodeId];
    if (node.collapsed) return;
    const kids = bmGetChildren(bm, nodeId);
    if (!kids.length) return;
    const heights = kids.map(k => subtreeHeight(k.id));
    const total = heights.reduce((a, b) => a + b, 0) + (kids.length - 1) * BM_V_GAP;
    const parentSize = bmMeasure(node.label, nodeId === bm.rootId, !!node.subprojectId);
    let cursor = ny - total / 2;
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i];
      const h = heights[i];
      const ksize = bmMeasure(k.label, false, !!k.subprojectId);
      const cy = cursor + h / 2;
      const cx = dir > 0
        ? nx + parentSize.w / 2 + BM_H_GAP + ksize.w / 2
        : nx - parentSize.w / 2 - BM_H_GAP - ksize.w / 2;
      out[k.id] = { x: cx, y: cy, w: ksize.w, h: ksize.h, side: dir > 0 ? 'right' : 'left' };
      layoutDescendants(k.id, cx, cy, dir);
      cursor += h + BM_V_GAP;
    }
  }

  const all = bmGetChildren(bm, bm.rootId);
  const right = [];
  const left = [];
  let altRight = true;
  for (const n of all) {
    if (n.side === 'left') left.push(n);
    else if (n.side === 'right') right.push(n);
    else { (altRight ? right : left).push(n); altRight = !altRight; }
  }

  function layoutRootSide(kids, dir) {
    if (!kids.length) return;
    const heights = kids.map(k => subtreeHeight(k.id));
    const total = heights.reduce((a, b) => a + b, 0) + (kids.length - 1) * BM_V_GAP;
    let cursor = 0 - total / 2;
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i];
      const h = heights[i];
      const ksize = bmMeasure(k.label, false, !!k.subprojectId);
      const cy = cursor + h / 2;
      const cx = dir > 0
        ? 0 + rootSize.w / 2 + BM_H_GAP + ksize.w / 2
        : 0 - rootSize.w / 2 - BM_H_GAP - ksize.w / 2;
      out[k.id] = { x: cx, y: cy, w: ksize.w, h: ksize.h, side: dir > 0 ? 'right' : 'left' };
      layoutDescendants(k.id, cx, cy, dir);
      cursor += h + BM_V_GAP;
    }
  }

  layoutRootSide(right, +1);
  layoutRootSide(left, -1);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const id in out) {
    const n = out[id];
    if (n.x - n.w / 2 < minX) minX = n.x - n.w / 2;
    if (n.x + n.w / 2 > maxX) maxX = n.x + n.w / 2;
    if (n.y - n.h / 2 < minY) minY = n.y - n.h / 2;
    if (n.y + n.h / 2 > maxY) maxY = n.y + n.h / 2;
  }
  return { nodes: out, bounds: { minX, maxX, minY, maxY } };
}

function renderBrainmap() {
  const bm = getBrainmap();
  const proj = getProject();
  if (!state.bm.selectedId || !bm.nodes[state.bm.selectedId]) {
    state.bm.selectedId = bm.rootId;
  }
  const subprojects = proj.subprojects || [];
  const spOptions = subprojects.map(sp =>
    `<option value="${sp.id}">${escapeHTML(sp.name)}</option>`
  ).join('');
  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-brainmap">
      <div class="bm-toolbar">
        <button class="btn btn-secondary btn-sm" id="bm-add-child" title="Tab">+ Child</button>
        <button class="btn btn-secondary btn-sm" id="bm-add-sibling" title="Enter">+ Sibling</button>
        <button class="btn btn-secondary btn-sm" id="bm-rename" title="F2 / double-click">Rename</button>
        <button class="btn btn-secondary btn-sm" id="bm-delete" title="Del">Delete</button>
        <button class="btn btn-secondary btn-sm" id="bm-collapse" title="Space">Collapse</button>
        <div class="bm-tb-divider"></div>
        <div class="bm-color-swatches" id="bm-colors">
          ${BM_SWATCH_COLORS.map(c => `<button class="bm-swatch" data-color="${c}" style="background:${c}" title="Color branch"></button>`).join('')}
          <button class="bm-swatch bm-swatch-clear" data-color="" title="Clear color">×</button>
        </div>
        ${subprojects.length ? `
        <div class="bm-tb-divider"></div>
        <select class="form-select bm-sp-assign" id="bm-sp-assign" title="Link selected node to a subproject">
          <option value="">No subproject</option>
          ${spOptions}
        </select>` : ''}
        <div class="bm-tb-divider"></div>
        <button class="btn btn-secondary btn-sm" id="bm-flip" title="Swap side of a root child">Flip side</button>
        <button class="btn btn-secondary btn-sm" id="bm-zoom-in">＋</button>
        <button class="btn btn-secondary btn-sm" id="bm-zoom-out">−</button>
        <button class="btn btn-secondary btn-sm" id="bm-fit">Fit</button>
        <div class="bm-tb-divider"></div>
        <button class="btn btn-primary btn-sm" id="bm-save">Save</button>
        <span class="bm-hint" id="bm-hint">Tab child · Enter sibling · F2 rename · Del remove · Space collapse · Arrows navigate</span>
      </div>
      <div class="bm-main">
        <div class="bm-stage" id="bm-stage" tabindex="0">
          <svg id="bm-svg" xmlns="http://www.w3.org/2000/svg">
            <g id="bm-pan">
              <g id="bm-edges"></g>
              <g id="bm-nodes"></g>
            </g>
          </svg>
          <div id="bm-edit-layer"></div>
        </div>
        <aside class="bm-detail-panel" id="bm-detail-panel" aria-label="Selected node detail"></aside>
      </div>
      <div class="bm-status" id="bm-status"></div>
    </div>`;

  drawBrainmap();
  // On arrival, center on the selected node when one is set (and isn't the
  // root) — that's the case when the user got here via a reverse-link chip
  // or the linked-items row, and they expect to land on that node, not on
  // a fitted overview where it might be tiny. Default fit-all otherwise.
  requestAnimationFrame(() => {
    if (!bmCenterOnSelected()) bmFitToView();
    setupBrainmapEvents();
  });
}

// Returns true when it centered on a non-root selected node, false otherwise
// (caller should fall back to fit-to-view). Picks a comfortable zoom (1.2x)
// so the selected node sits prominently with parent/sibling context still
// visible around it.
function bmCenterOnSelected() {
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  if (!id || id === bm.rootId) return false;
  const stage = document.getElementById('bm-stage');
  const ln = state.bm.layout && state.bm.layout.nodes[id];
  if (!stage || !ln) return false;
  state.bm.zoom = 1.2;
  state.bm.panX = stage.clientWidth  / 2 - ln.x * state.bm.zoom;
  state.bm.panY = stage.clientHeight / 2 - ln.y * state.bm.zoom;
  applyBmTransform();
  bmUpdateStatus();
  return true;
}

function drawBrainmap() {
  const bm = getBrainmap();
  const layout = bmLayout(bm);
  state.bm.layout = layout;

  const edgesG = document.getElementById('bm-edges');
  const nodesG = document.getElementById('bm-nodes');
  if (!edgesG || !nodesG) return;
  while (edgesG.firstChild) edgesG.removeChild(edgesG.firstChild);
  while (nodesG.firstChild) nodesG.removeChild(nodesG.firstChild);

  for (const id in layout.nodes) {
    const node = bm.nodes[id];
    if (!node || !node.parentId) continue;
    const pn = layout.nodes[node.parentId];
    const cn = layout.nodes[id];
    if (!pn || !cn) continue;
    const dir = cn.x >= pn.x ? 1 : -1;
    const sx = pn.x + dir * pn.w / 2;
    const sy = pn.y;
    const ex = cn.x - dir * cn.w / 2;
    const ey = cn.y;
    const mx = (sx + ex) / 2;
    const color = bmBranchColor(bm, node);
    const path = document.createElementNS(BM_SVG_NS, 'path');
    path.setAttribute('d', `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', node.parentId === bm.rootId ? '3' : '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('class', 'bm-edge');
    edgesG.appendChild(path);
  }

  for (const id in layout.nodes) {
    const node = bm.nodes[id];
    if (!node) continue;
    const ln = layout.nodes[id];
    const isRoot = id === bm.rootId;
    const isSel = state.bm.selectedId === id;
    const color = isRoot ? bmAccent() : bmBranchColor(bm, node);
    const kids = bmGetChildren(bm, id);
    const hasKids = kids.length > 0;

    const g = document.createElementNS(BM_SVG_NS, 'g');
    g.setAttribute('class', 'bm-node' + (isSel ? ' bm-node-selected' : '') + (isRoot ? ' bm-node-root' : ''));
    g.setAttribute('transform', `translate(${ln.x - ln.w / 2}, ${ln.y - ln.h / 2})`);
    g.setAttribute('data-id', id);

    const rect = document.createElementNS(BM_SVG_NS, 'rect');
    rect.setAttribute('width', ln.w);
    rect.setAttribute('height', ln.h);
    rect.setAttribute('rx', isRoot ? 12 : 9);
    rect.setAttribute('ry', isRoot ? 12 : 9);
    rect.setAttribute('fill', isRoot ? color : '#ffffff');
    rect.setAttribute('stroke', color);
    rect.setAttribute('stroke-width', isSel ? '3' : '2');
    g.appendChild(rect);

    const sp = bmSubprojectOf(node);
    if (sp && !isRoot) {
      const bar = document.createElementNS(BM_SVG_NS, 'rect');
      bar.setAttribute('x', '4');
      bar.setAttribute('y', '4');
      bar.setAttribute('width', '5');
      bar.setAttribute('height', ln.h - 8);
      bar.setAttribute('rx', '2.5');
      bar.setAttribute('ry', '2.5');
      bar.setAttribute('fill', sp.color);
      g.appendChild(bar);
    }

    const textX = (sp && !isRoot) ? (ln.w / 2) + 6 : ln.w / 2;
    const text = document.createElementNS(BM_SVG_NS, 'text');
    text.setAttribute('x', textX);
    text.setAttribute('y', ln.h / 2 + (isRoot ? 5 : 4));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', '"Segoe UI", system-ui, sans-serif');
    text.setAttribute('font-size', isRoot ? '15' : '13');
    text.setAttribute('font-weight', isRoot ? '600' : '500');
    text.setAttribute('fill', isRoot ? '#ffffff' : '#0f172a');
    text.textContent = node.label || '(empty)';
    g.appendChild(text);

    if (sp && isRoot) {
      const dot = document.createElementNS(BM_SVG_NS, 'circle');
      dot.setAttribute('cx', ln.w - 10);
      dot.setAttribute('cy', 10);
      dot.setAttribute('r', 5);
      dot.setAttribute('fill', sp.color);
      dot.setAttribute('stroke', '#ffffff');
      dot.setAttribute('stroke-width', 1.5);
      g.appendChild(dot);
    }

    if (hasKids && !isRoot) {
      const dir = ln.side === 'right' ? 1 : -1;
      const bx = dir > 0 ? ln.w + 6 : -20;
      const badge = document.createElementNS(BM_SVG_NS, 'g');
      badge.setAttribute('class', 'bm-badge');
      badge.setAttribute('transform', `translate(${bx}, ${ln.h / 2 - 8})`);
      const circ = document.createElementNS(BM_SVG_NS, 'circle');
      circ.setAttribute('cx', '8'); circ.setAttribute('cy', '8'); circ.setAttribute('r', '8');
      circ.setAttribute('fill', color);
      badge.appendChild(circ);
      const bt = document.createElementNS(BM_SVG_NS, 'text');
      bt.setAttribute('x', '8'); bt.setAttribute('y', '12');
      bt.setAttribute('text-anchor', 'middle');
      bt.setAttribute('font-size', '11');
      bt.setAttribute('font-weight', '700');
      bt.setAttribute('fill', '#ffffff');
      bt.textContent = node.collapsed ? '+' : '−';
      badge.appendChild(bt);
      g.appendChild(badge);
    }

    // Linked-items count badge — skipped at 0 per the v2 plan to avoid
    // clutter on every empty node. Positioned above-right outside the node
    // box. Tapping it routes selection to this node and ensures the detail
    // panel scrolls its linked-items section into view (handled in the
    // svg-click delegate). Render this AFTER the collapse badge so it
    // overlaps neither the subproject color bar nor the collapse '+/−'.
    const linkCount = nodeLinkCount(id);
    if (linkCount > 0) {
      const lbadge = document.createElementNS(BM_SVG_NS, 'g');
      lbadge.setAttribute('class', 'bm-link-badge');
      lbadge.setAttribute('data-link-badge-for', id);
      lbadge.setAttribute('transform', `translate(${ln.w - 6}, -10)`);
      const lcirc = document.createElementNS(BM_SVG_NS, 'circle');
      lcirc.setAttribute('cx', '0'); lcirc.setAttribute('cy', '0');
      lcirc.setAttribute('r', '9');
      lcirc.setAttribute('fill', '#0f172a');
      lcirc.setAttribute('stroke', '#ffffff');
      lcirc.setAttribute('stroke-width', '1.5');
      lbadge.appendChild(lcirc);
      const ltxt = document.createElementNS(BM_SVG_NS, 'text');
      ltxt.setAttribute('x', '0'); ltxt.setAttribute('y', '4');
      ltxt.setAttribute('text-anchor', 'middle');
      ltxt.setAttribute('font-size', linkCount > 9 ? '10' : '11');
      ltxt.setAttribute('font-weight', '700');
      ltxt.setAttribute('fill', '#ffffff');
      ltxt.textContent = linkCount > 99 ? '99+' : String(linkCount);
      lbadge.appendChild(ltxt);
      g.appendChild(lbadge);
    }

    nodesG.appendChild(g);
  }

  applyBmTransform();
  bmUpdateStatus();
  bmSyncSpSelect();
  bmRenderDetailPanel();
}

function bmSyncSpSelect() {
  const sel = document.getElementById('bm-sp-assign');
  if (!sel) return;
  const bm = getBrainmap();
  const node = bm.nodes[state.bm.selectedId];
  sel.value = (node && node.subprojectId) || '';
}

function bmUpdateStatus() {
  const s = document.getElementById('bm-status');
  if (!s) return;
  const count = Object.keys(getBrainmap().nodes).length;
  s.textContent = `${count} node${count === 1 ? '' : 's'}  ·  zoom ${Math.round(state.bm.zoom * 100)}%`;
}

function applyBmTransform() {
  const g = document.getElementById('bm-pan');
  if (!g) return;
  g.setAttribute('transform', `translate(${state.bm.panX} ${state.bm.panY}) scale(${state.bm.zoom})`);
}

function bmFitToView() {
  const layout = state.bm.layout;
  const stage = document.getElementById('bm-stage');
  if (!layout || !stage) return;
  if (stage.clientWidth === 0 || stage.clientHeight === 0) {
    requestAnimationFrame(bmFitToView);
    return;
  }
  const { minX, maxX, minY, maxY } = layout.bounds;
  const w = Math.max(1, maxX - minX) + 80;
  const h = Math.max(1, maxY - minY) + 80;
  const scale = Math.min(stage.clientWidth / w, stage.clientHeight / h, 1.4);
  state.bm.zoom = Math.max(0.25, scale);
  state.bm.panX = stage.clientWidth / 2 - ((minX + maxX) / 2) * state.bm.zoom;
  state.bm.panY = stage.clientHeight / 2 - ((minY + maxY) / 2) * state.bm.zoom;
  applyBmTransform();
  bmUpdateStatus();
}

function setupBrainmapEvents() {
  const stage = document.getElementById('bm-stage');
  const svg = document.getElementById('bm-svg');
  if (!stage || !svg) return;

  document.getElementById('bm-add-child').onclick   = bmAddChild;
  document.getElementById('bm-add-sibling').onclick = bmAddSibling;
  document.getElementById('bm-rename').onclick      = bmStartRename;
  document.getElementById('bm-delete').onclick      = bmDeleteSelected;
  document.getElementById('bm-collapse').onclick    = bmToggleCollapse;
  document.getElementById('bm-flip').onclick        = bmFlipSide;
  document.getElementById('bm-zoom-in').onclick     = () => bmZoomAt(1.15);
  document.getElementById('bm-zoom-out').onclick    = () => bmZoomAt(1 / 1.15);
  document.getElementById('bm-fit').onclick         = bmFitToView;
  document.getElementById('bm-save').onclick        = () => { saveBrainmap(); showToast('Spark map saved.', 'success'); };

  document.getElementById('bm-colors').addEventListener('click', (e) => {
    const sw = e.target.closest('[data-color]');
    if (!sw) return;
    bmApplyColor(sw.dataset.color || null);
  });

  const spSel = document.getElementById('bm-sp-assign');
  if (spSel) {
    spSel.addEventListener('change', (e) => {
      bmAssignToSubproject(e.target.value || null);
    });
  }

  svg.addEventListener('click', (e) => {
    const badge = e.target.closest('.bm-badge');
    const linkBadge = e.target.closest('.bm-link-badge');
    const g = e.target.closest('.bm-node');
    if (badge && g) {
      state.bm.selectedId = g.dataset.id;
      bmToggleCollapse();
      return;
    }
    if (linkBadge && g) {
      // Select the node and surface the linked-items section. Panel is
      // always visible; we just scroll it to the section header so taps
      // behave the same whether the panel was scrolled or not.
      state.bm.selectedId = g.dataset.id;
      drawBrainmap();
      const panel = document.getElementById('bm-detail-panel');
      const section = panel && panel.querySelector('.bm-dp-linked');
      if (section) section.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    if (g) {
      state.bm.selectedId = g.dataset.id;
      drawBrainmap();
      stage.focus();
    }
  });

  svg.addEventListener('dblclick', (e) => {
    const g = e.target.closest('.bm-node');
    if (!g) return;
    state.bm.selectedId = g.dataset.id;
    bmStartRename();
  });

  svg.addEventListener('contextmenu', (e) => {
    const g = e.target.closest('.bm-node');
    if (!g) return;
    e.preventDefault();
    state.bm.selectedId = g.dataset.id;
    drawBrainmap();
    showBmContextMenu(e.clientX, e.clientY);
  });

  let panning = false, panStart = null;
  svg.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.bm-node') || e.target.closest('.bm-edge')) return;
    panning = true;
    panStart = { x: e.clientX, y: e.clientY, panX: state.bm.panX, panY: state.bm.panY };
    stage.classList.add('bm-panning');
  });
  const onMouseMove = (e) => {
    if (!panning) return;
    state.bm.panX = panStart.panX + (e.clientX - panStart.x);
    state.bm.panY = panStart.panY + (e.clientY - panStart.y);
    applyBmTransform();
  };
  const onMouseUp = () => {
    if (!panning) return;
    panning = false;
    stage.classList.remove('bm-panning');
  };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  state.bm._mouseMoveHandler = onMouseMove;
  state.bm._mouseUpHandler = onMouseUp;

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= 400;
    const sensitivity = e.ctrlKey ? 0.008 : 0.0022;
    let factor = Math.exp(-dy * sensitivity);
    factor = Math.max(0.85, Math.min(1.18, factor));
    bmZoomAt(factor, cx, cy);
  }, { passive: false });

  // Touch: one-finger pan, two-finger pinch zoom, long-press contextmenu
  let touchState = null;
  let longPressTimer = null;
  const LONG_PRESS_MS = 500;
  const LONG_PRESS_MOVE_TOL = 10;

  const clearLongPress = () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  };

  const touchDist = (a, b) => {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  };
  const touchMid = (a, b) => ({
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2
  });

  svg.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const nodeEl = document.elementFromPoint(t.clientX, t.clientY)?.closest('.bm-node');
      touchState = {
        mode: 'pan',
        startX: t.clientX,
        startY: t.clientY,
        panX: state.bm.panX,
        panY: state.bm.panY,
        onNode: nodeEl ? nodeEl.dataset.id : null,
        moved: false
      };
      stage.classList.add('bm-panning');
      if (nodeEl) {
        longPressTimer = setTimeout(() => {
          longPressTimer = null;
          if (touchState && !touchState.moved) {
            state.bm.selectedId = nodeEl.dataset.id;
            drawBrainmap();
            showBmContextMenu(t.clientX, t.clientY);
            touchState.mode = 'longpress';
            stage.classList.remove('bm-panning');
          }
        }, LONG_PRESS_MS);
      }
    } else if (e.touches.length === 2) {
      clearLongPress();
      const [a, b] = [e.touches[0], e.touches[1]];
      const rect = stage.getBoundingClientRect();
      const mid = touchMid(a, b);
      touchState = {
        mode: 'pinch',
        startDist: touchDist(a, b),
        lastDist: touchDist(a, b),
        lastMidX: mid.x - rect.left,
        lastMidY: mid.y - rect.top
      };
      stage.classList.remove('bm-panning');
    }
  }, { passive: true });

  svg.addEventListener('touchmove', (e) => {
    if (!touchState) return;
    if (touchState.mode === 'pan' && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - touchState.startX;
      const dy = t.clientY - touchState.startY;
      if (!touchState.moved && Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOL) {
        touchState.moved = true;
        clearLongPress();
      }
      if (touchState.moved) {
        e.preventDefault();
        state.bm.panX = touchState.panX + dx;
        state.bm.panY = touchState.panY + dy;
        applyBmTransform();
      }
    } else if (touchState.mode === 'pinch' && e.touches.length === 2) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = touchDist(a, b);
      const mid = touchMid(a, b);
      const rect = stage.getBoundingClientRect();
      const cx = mid.x - rect.left;
      const cy = mid.y - rect.top;
      const oldZoom = state.bm.zoom;
      const rawZoom = oldZoom * (dist / touchState.lastDist);
      const newZoom = Math.max(0.2, Math.min(3, rawZoom));
      // Keep the content that was under the previous midpoint stationary
      // relative to the new midpoint, while zooming around it.
      state.bm.panX = cx - (touchState.lastMidX - state.bm.panX) * (newZoom / oldZoom);
      state.bm.panY = cy - (touchState.lastMidY - state.bm.panY) * (newZoom / oldZoom);
      state.bm.zoom = newZoom;
      touchState.lastDist = dist;
      touchState.lastMidX = cx;
      touchState.lastMidY = cy;
      applyBmTransform();
      bmUpdateStatus();
    }
  }, { passive: false });

  const endTouch = (e) => {
    if (!touchState) return;
    clearLongPress();
    if (touchState.mode === 'pan' && !touchState.moved && touchState.onNode) {
      state.bm.selectedId = touchState.onNode;
      drawBrainmap();
    }
    if (e.touches && e.touches.length === 1 && touchState.mode === 'pinch') {
      // Transition from pinch to single-finger pan without dropping the gesture
      const t = e.touches[0];
      touchState = {
        mode: 'pan',
        startX: t.clientX,
        startY: t.clientY,
        panX: state.bm.panX,
        panY: state.bm.panY,
        onNode: null,
        moved: true
      };
      return;
    }
    touchState = null;
    stage.classList.remove('bm-panning');
  };
  svg.addEventListener('touchend', endTouch, { passive: true });
  svg.addEventListener('touchcancel', endTouch, { passive: true });

  stage.focus();
}

function bmWindowKeyHandler(e) {
  if (state.view !== 'brainmap') return;
  if (paletteState && paletteState.open) return;
  const tgt = e.target;
  if (tgt && tgt.classList && tgt.classList.contains('bm-rename-input')) {
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      bmCommitRenameThenAddChild();
    }
    return;
  }
  const tag = tgt && tgt.tagName;
  const editable = tgt && (tgt.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
  const inStage = tgt && tgt.closest && tgt.closest('#bm-stage');
  if (editable && !inStage) return;
  const k = e.key;
  if (k === 'Tab' || k === 'Enter' || k === 'F2' || k === 'Delete' || k === 'Backspace' || k === ' ' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') {
    e.preventDefault();
    e.stopPropagation();
    bmKeyHandler(e);
  }
}

function bmCommitRenameThenAddChild() {
  const layer = document.getElementById('bm-edit-layer');
  const input = layer && layer.querySelector('.bm-rename-input');
  const id = state.bm.editingId;
  if (!input || !id) { bmAddChild(); return; }
  const bm = getBrainmap();
  if (bm.nodes[id]) bm.nodes[id].label = input.value.trim() || 'Untitled';
  state.bm.editingId = null;
  layer.innerHTML = '';
  drawBrainmap();
  saveBrainmap();
  bmAddChild();
}

function bmZoomAt(factor, cx, cy) {
  const stage = document.getElementById('bm-stage');
  if (!stage) return;
  if (cx == null) { cx = stage.clientWidth / 2; cy = stage.clientHeight / 2; }
  const oldZoom = state.bm.zoom;
  const newZoom = Math.max(0.2, Math.min(3, oldZoom * factor));
  state.bm.panX = cx - (cx - state.bm.panX) * (newZoom / oldZoom);
  state.bm.panY = cy - (cy - state.bm.panY) * (newZoom / oldZoom);
  state.bm.zoom = newZoom;
  applyBmTransform();
  bmUpdateStatus();
}

function hideBmContextMenu() {
  const m = document.getElementById('bm-context-menu');
  if (m) m.remove();
  document.removeEventListener('mousedown', bmContextMenuOutsideHandler, true);
  document.removeEventListener('keydown', bmContextMenuKeyHandler, true);
  window.removeEventListener('blur', hideBmContextMenu);
}

function bmContextMenuOutsideHandler(e) {
  const m = document.getElementById('bm-context-menu');
  if (m && !m.contains(e.target)) hideBmContextMenu();
}

function bmContextMenuKeyHandler(e) {
  if (e.key === 'Escape') { e.preventDefault(); hideBmContextMenu(); }
}

function showBmContextMenu(clientX, clientY) {
  hideBmContextMenu();
  const bm = getBrainmap();
  const sel = bm.nodes[state.bm.selectedId];
  if (!sel) return;
  const isRoot = !sel.parentId;

  const menu = document.createElement('div');
  menu.id = 'bm-context-menu';
  menu.className = 'bm-context-menu';
  menu.innerHTML = `
    <button class="bm-ctx-item" data-action="rename">
      <span class="bm-ctx-icon">✎</span><span>Rename</span><span class="bm-ctx-shortcut">F2</span>
    </button>
    <button class="bm-ctx-item" data-action="add-child">
      <span class="bm-ctx-icon">＋</span><span>Add child</span><span class="bm-ctx-shortcut">Tab</span>
    </button>
    <button class="bm-ctx-item" data-action="add-sibling" ${isRoot ? 'disabled' : ''}>
      <span class="bm-ctx-icon">＋</span><span>Add sibling</span><span class="bm-ctx-shortcut">Enter</span>
    </button>
    <div class="bm-ctx-divider"></div>
    <button class="bm-ctx-item bm-ctx-danger" data-action="delete" ${isRoot ? 'disabled' : ''}>
      <span class="bm-ctx-icon">✕</span><span>Delete</span><span class="bm-ctx-shortcut">Del</span>
    </button>`;
  document.body.appendChild(menu);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = menu.getBoundingClientRect();
  const x = Math.min(clientX, vw - rect.width - 8);
  const y = Math.min(clientY, vh - rect.height - 8);
  menu.style.left = `${Math.max(4, x)}px`;
  menu.style.top  = `${Math.max(4, y)}px`;

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('.bm-ctx-item');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.action;
    hideBmContextMenu();
    if (action === 'rename')           bmStartRename();
    else if (action === 'add-child')   bmAddChild();
    else if (action === 'add-sibling') bmAddSibling();
    else if (action === 'delete')      bmDeleteSelected();
  });

  setTimeout(() => {
    document.addEventListener('mousedown', bmContextMenuOutsideHandler, true);
    document.addEventListener('keydown', bmContextMenuKeyHandler, true);
    window.addEventListener('blur', hideBmContextMenu);
  }, 0);
}

function bmKeyHandler(e) {
  if (state.bm.editingId) return;
  const k = e.key;
  if (k === 'Tab')       { e.preventDefault(); bmAddChild();   return; }
  if (k === 'Enter')     { e.preventDefault(); bmAddSibling(); return; }
  if (k === 'F2')        { e.preventDefault(); bmStartRename();return; }
  if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); bmDeleteSelected(); return; }
  if (k === ' ')         { e.preventDefault(); bmToggleCollapse(); return; }
  if (k === 'ArrowUp')   { e.preventDefault(); bmReorderSibling(-1); return; }
  if (k === 'ArrowDown') { e.preventDefault(); bmReorderSibling(+1); return; }
  if (k === 'ArrowLeft') { e.preventDefault(); bmNavigate('left');  return; }
  if (k === 'ArrowRight'){ e.preventDefault(); bmNavigate('right'); return; }
}

function bmAddChild() {
  const bm = getBrainmap();
  const parentId = state.bm.selectedId || bm.rootId;
  const parent = bm.nodes[parentId];
  if (!parent) return;
  const siblings = bmGetChildren(bm, parentId);
  let side = null;
  if (parentId === bm.rootId) {
    const r = siblings.filter(n => n.side === 'right').length;
    const l = siblings.filter(n => n.side === 'left').length;
    side = r <= l ? 'right' : 'left';
  }
  const newId = generateId('bm');
  bm.nodes[newId] = { id: newId, parentId, label: 'New idea', color: null, side, collapsed: false, note: '', order: siblings.length, subprojectId: null, linkedItems: [] };
  if (parent.collapsed) parent.collapsed = false;
  state.bm.selectedId = newId;
  drawBrainmap();
  saveBrainmap();
  bmStartRename();
}

function bmAddSibling() {
  const bm = getBrainmap();
  const sel = bm.nodes[state.bm.selectedId];
  if (!sel) return;
  if (!sel.parentId) { bmAddChild(); return; }
  const parentId = sel.parentId;
  const newId = generateId('bm');
  const side = parentId === bm.rootId ? (sel.side || 'right') : null;
  bm.nodes[newId] = { id: newId, parentId, label: 'New idea', color: null, side, collapsed: false, note: '', order: (sel.order || 0) + 0.5, subprojectId: null, linkedItems: [] };
  bmGetChildren(bm, parentId).forEach((n, i) => { n.order = i; });
  state.bm.selectedId = newId;
  drawBrainmap();
  saveBrainmap();
  bmStartRename();
}

function bmStartRename() {
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  const ln = state.bm.layout && state.bm.layout.nodes[id];
  if (!id || !bm.nodes[id] || !ln) return;
  const layer = document.getElementById('bm-edit-layer');
  const stage = document.getElementById('bm-stage');
  if (!layer || !stage) return;
  state.bm.editingId = id;
  layer.innerHTML = '';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'bm-rename-input';
  input.value = bm.nodes[id].label;
  const screenX = state.bm.panX + ln.x * state.bm.zoom;
  const screenY = state.bm.panY + ln.y * state.bm.zoom;
  const w = Math.max(160, ln.w * state.bm.zoom + 20);
  input.style.left = `${screenX - w / 2}px`;
  input.style.top = `${screenY - 18}px`;
  input.style.width = `${w}px`;
  layer.appendChild(input);
  input.focus();
  input.select();
  const commit = (save) => {
    if (state.bm.editingId !== id) return;
    if (save) bm.nodes[id].label = input.value.trim() || 'Untitled';
    state.bm.editingId = null;
    layer.innerHTML = '';
    drawBrainmap();
    if (save) saveBrainmap();
    stage.focus();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(true); }
    else if (e.key === 'Escape') { e.preventDefault(); commit(false); }
    else e.stopPropagation();
  });
  input.addEventListener('blur', () => commit(true));
}

function bmDeleteSelected() {
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  if (!id) return;
  if (id === bm.rootId) { showToast('Cannot delete the root.', 'info'); return; }
  const node = bm.nodes[id];
  if (!node) return;
  const toDelete = new Set();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop();
    toDelete.add(cur);
    for (const child of bmGetChildren(bm, cur)) stack.push(child.id);
  }
  const parentId = node.parentId;
  toDelete.forEach(d => delete bm.nodes[d]);
  bmGetChildren(bm, parentId).forEach((n, i) => { n.order = i; });
  state.bm.selectedId = parentId || bm.rootId;
  drawBrainmap();
  saveBrainmap();
}

function bmToggleCollapse() {
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  if (!id || id === bm.rootId) return;
  const node = bm.nodes[id];
  if (!node || !bmGetChildren(bm, id).length) return;
  node.collapsed = !node.collapsed;
  drawBrainmap();
  saveBrainmap();
}

function bmFlipSide() {
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  const node = bm.nodes[id];
  if (!node || node.parentId !== bm.rootId) {
    showToast('Only direct children of the root have a side.', 'info');
    return;
  }
  node.side = node.side === 'right' ? 'left' : 'right';
  drawBrainmap();
  saveBrainmap();
}

function bmApplyColor(color) {
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  const node = bm.nodes[id];
  if (!node) return;
  node.color = color || null;
  drawBrainmap();
  saveBrainmap();
}

function bmAssignToSubproject(spId) {
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  const node = bm.nodes[id];
  if (!node) return;
  node.subprojectId = spId || null;
  drawBrainmap();
  saveBrainmap();
  showToast(spId ? 'Node linked to subproject.' : 'Node unlinked.', 'success');
}

// ============================================================================
// nodeLinks — generic linking between brainmap nodes and any entity type.
//
// SOURCE OF TRUTH: `node.linkedItems` (Array<{entityType, entityId}>).
// REVERSE LOOKUP: derived from forward scan, cached per project on first read,
//                 invalidated on any mutation.
//
// This module is the ONLY allowed writer to `node.linkedItems`. Any other
// code path that mutates the array directly will desync the reverse cache
// and break chip-rendering performance on entity views.
// ============================================================================

const NODE_LINK_ENTITY_TYPES = ['todo', 'note', 'reminder', 'commitment', 'delegation', 'flow'];
// Map entity-type → project collection name. Single source of truth.
const NODE_LINK_COLLECTION = {
  todo: 'todos', note: 'notes', reminder: 'reminders',
  commitment: 'commitments', delegation: 'delegations', flow: 'flows'
};
// Display metadata for the spark-map detail panel. Order = picker order.
// Icons match the v2 plan; flow uses the universal cycle/branch glyph.
const NODE_LINK_TYPE_META = [
  { type: 'todo',       icon: '✓',  label: 'Todo' },
  { type: 'note',       icon: '◆',  label: 'Note' },
  { type: 'reminder',   icon: '🔔', label: 'Reminder' },
  { type: 'commitment', icon: '🤝', label: 'Commitment' },
  { type: 'delegation', icon: '→',  label: 'Delegation' },
  { type: 'flow',       icon: '🔀', label: 'Flow' }
];
const _nodeLinkTypeIcon  = Object.fromEntries(NODE_LINK_TYPE_META.map(m => [m.type, m.icon]));
const _nodeLinkTypeLabel = Object.fromEntries(NODE_LINK_TYPE_META.map(m => [m.type, m.label]));

// Reverse-index cache: projectKey → Map<'entityType:entityId', Set<nodeId>>.
// Module-level, in-memory only, never persisted. Lazily built on first read.
//
// Invalidation is project-scoped (coarse): mutating any single link clears the
// whole project's cache, forcing a full rebuild on the next read. Targeted
// invalidation by `entityType:entityId` is a future optimization, only worth
// doing if profiling shows chip-render-after-mutation is a hot path. Skip
// for v1.
//
// Cache lifecycle: one entry per project visited per session. Never evicted.
// Even with 50+ projects in one session the memory cost is trivial (a few KB
// per project's index). No size limit; documented behavior.
const _linkIndexByProject = new Map();

function _invalidateLinkIndex(projectKey) {
  if (projectKey) _linkIndexByProject.delete(projectKey);
}

function _buildReverseIndexForProject(projectKey) {
  if (_linkIndexByProject.has(projectKey)) return _linkIndexByProject.get(projectKey);
  const index = new Map();
  const proj = state.data && state.data.projects && state.data.projects[projectKey];
  if (proj && proj.brainmap && proj.brainmap.nodes) {
    for (const node of Object.values(proj.brainmap.nodes)) {
      for (const link of (node.linkedItems || [])) {
        const key = link.entityType + ':' + link.entityId;
        if (!index.has(key)) index.set(key, new Set());
        index.get(key).add(node.id);
      }
    }
  }
  _linkIndexByProject.set(projectKey, index);
  return index;
}

// Resolve an entity from the active project by type + id. Returns the entity
// object or null. Used by validation + getLinkedItems.
function _findEntityInProject(proj, entityType, entityId) {
  if (!proj) return null;
  const collection = NODE_LINK_COLLECTION[entityType];
  if (!collection) return null;
  const list = proj[collection];
  if (!Array.isArray(list)) return null;
  return list.find(e => e && e.id === entityId) || null;
}

// Detect archive/closed state. Phase 1 covers the explicit `archived` field
// on todos/notes (the only types that have one). Other types' "closed-ish"
// states (reminder fired/doneAt, commitment fulfilled, delegation done) are
// presentation-layer concerns left to Phase 2/3 styles.
function _isEntityArchived(entityType, entity) {
  if (!entity) return false;
  if (entityType === 'todo' || entityType === 'note') return !!entity.archived;
  return false;
}

// Returns true on successful new link; false if the input is invalid or the
// link already exists. Mutates node.linkedItems by APPENDING (never inserts).
// Array order is meaningful: oldest at index 0, newest at the end. Phase 2
// reads the tail for "most recent N".
function addNodeLink(nodeId, entityType, entityId) {
  if (typeof nodeId !== 'string' || typeof entityId !== 'string') return false;
  if (!NODE_LINK_ENTITY_TYPES.includes(entityType)) return false;
  const proj = state.data && state.data.projects && state.data.projects[state.project];
  if (!proj || !proj.brainmap || !proj.brainmap.nodes) return false;
  const node = proj.brainmap.nodes[nodeId];
  if (!node) return false;
  // Cross-project linking is rejected at the helper layer (defense in depth).
  // The active project's brainmap can only link to entities in the same
  // project. The data model already enforces this — entities live under
  // `state.data.projects[K].(todos|notes|...)`. Verify the entity exists
  // in the same project.
  if (!_findEntityInProject(proj, entityType, entityId)) return false;
  if (!Array.isArray(node.linkedItems)) node.linkedItems = [];
  // Idempotent: if a link with the same {entityType, entityId} is already
  // present, return false without mutating.
  if (node.linkedItems.some(l => l.entityType === entityType && l.entityId === entityId)) {
    return false;
  }
  node.linkedItems.push({ entityType, entityId });
  _invalidateLinkIndex(state.project);
  saveData();
  return true;
}

// Returns true if a link was removed; false if no matching link existed.
function removeNodeLink(nodeId, entityType, entityId) {
  if (typeof nodeId !== 'string' || typeof entityId !== 'string') return false;
  if (!NODE_LINK_ENTITY_TYPES.includes(entityType)) return false;
  const proj = state.data && state.data.projects && state.data.projects[state.project];
  if (!proj || !proj.brainmap || !proj.brainmap.nodes) return false;
  const node = proj.brainmap.nodes[nodeId];
  if (!node || !Array.isArray(node.linkedItems)) return false;
  const before = node.linkedItems.length;
  node.linkedItems = node.linkedItems.filter(l => !(l.entityType === entityType && l.entityId === entityId));
  if (node.linkedItems.length === before) return false;
  _invalidateLinkIndex(state.project);
  saveData();
  return true;
}

function nodeLinkExists(nodeId, entityType, entityId) {
  const proj = state.data && state.data.projects && state.data.projects[state.project];
  if (!proj || !proj.brainmap || !proj.brainmap.nodes) return false;
  const node = proj.brainmap.nodes[nodeId];
  if (!node || !Array.isArray(node.linkedItems)) return false;
  return node.linkedItems.some(l => l.entityType === entityType && l.entityId === entityId);
}

function nodeLinkCount(nodeId) {
  const proj = state.data && state.data.projects && state.data.projects[state.project];
  if (!proj || !proj.brainmap || !proj.brainmap.nodes) return 0;
  const node = proj.brainmap.nodes[nodeId];
  if (!node || !Array.isArray(node.linkedItems)) return 0;
  return node.linkedItems.length;
}

// Resolve every link on a node, tagging orphans (entity deleted) and archived
// entities. Order matches node.linkedItems (oldest first) — Phase 2 callers
// slice the tail for "most recent N".
function getLinkedItems(nodeId) {
  const proj = state.data && state.data.projects && state.data.projects[state.project];
  if (!proj || !proj.brainmap || !proj.brainmap.nodes) return [];
  const node = proj.brainmap.nodes[nodeId];
  if (!node || !Array.isArray(node.linkedItems)) return [];
  return node.linkedItems.map(link => {
    const entity = _findEntityInProject(proj, link.entityType, link.entityId);
    return {
      entityType: link.entityType,
      entityId: link.entityId,
      entity: entity,
      isOrphan: !entity,
      isArchived: _isEntityArchived(link.entityType, entity)
    };
  });
}

// Returns array of node objects in `projectKey`'s brainmap that link to the
// given entity. Defaults to the active project if `projectKey` is omitted.
// Uses the per-project reverse-index cache (built lazily on first call).
function getLinkedNodes(entityType, entityId, projectKey) {
  const pk = projectKey || state.project;
  const proj = state.data && state.data.projects && state.data.projects[pk];
  if (!proj || !proj.brainmap || !proj.brainmap.nodes) return [];
  const index = _buildReverseIndexForProject(pk);
  const nodeIds = index.get(entityType + ':' + entityId);
  if (!nodeIds) return [];
  const out = [];
  for (const id of nodeIds) {
    const node = proj.brainmap.nodes[id];
    if (node) out.push(node);
  }
  return out;
}

// Walk a project's brainmap and remove every link to the deleted entity.
// Called from each entity's delete handler — eager cleanup keeps data tidy
// instead of relying on orphan rendering as a safety net (it's still there
// for any edge case that slips through).
function cleanupNodeLinksOnEntityDelete(projectKey, entityType, entityId) {
  if (!NODE_LINK_ENTITY_TYPES.includes(entityType)) return 0;
  const proj = state.data && state.data.projects && state.data.projects[projectKey];
  if (!proj || !proj.brainmap || !proj.brainmap.nodes) return 0;
  let removed = 0;
  for (const node of Object.values(proj.brainmap.nodes)) {
    if (!Array.isArray(node.linkedItems) || node.linkedItems.length === 0) continue;
    const before = node.linkedItems.length;
    node.linkedItems = node.linkedItems.filter(l => !(l.entityType === entityType && l.entityId === entityId));
    removed += before - node.linkedItems.length;
  }
  if (removed > 0) _invalidateLinkIndex(projectKey);
  // Note: caller is already in the middle of an entity-delete + saveData()
  // flow, so we don't call saveData() here — the caller's saveData() will
  // persist the cleanup along with the deletion.
  return removed;
}

// Debug surface: pokeable from devtools console before Phase 2's UI lands.
// Documented as a private module surface (underscore-prefixed). Stays in the
// codebase indefinitely — costs nothing, helps catch issues fast.
if (typeof window !== 'undefined') {
  window.__nodeLinks = {
    add: addNodeLink,
    remove: removeNodeLink,
    exists: nodeLinkExists,
    count: nodeLinkCount,
    items: getLinkedItems,
    nodes: getLinkedNodes,
    cleanup: cleanupNodeLinksOnEntityDelete,
    _invalidate: _invalidateLinkIndex,
    _buildIndex: _buildReverseIndexForProject,
    _index: _linkIndexByProject
  };
}
// ============================================================================

function bmReorderSibling(delta) {
  const bm = getBrainmap();
  const node = bm.nodes[state.bm.selectedId];
  if (!node || !node.parentId) return;
  const sibs = bmGetChildren(bm, node.parentId);
  const idx = sibs.findIndex(n => n.id === node.id);
  const next = idx + delta;
  if (next < 0 || next >= sibs.length) return;
  const other = sibs[next];
  const t = node.order; node.order = other.order; other.order = t;
  drawBrainmap();
  saveBrainmap();
}

function bmNavigate(dir) {
  const bm = getBrainmap();
  const layout = state.bm.layout;
  if (!layout) return;
  const cur = state.bm.selectedId;
  const node = bm.nodes[cur];
  if (!node) return;
  const ln = layout.nodes[cur];
  if (!ln) return;

  const intoChildren = () => {
    if (node.collapsed) return false;
    const kids = bmGetChildren(bm, cur);
    if (!kids.length) return false;
    const mid = Math.floor(kids.length / 2);
    state.bm.selectedId = kids[mid].id;
    return true;
  };
  const toParent = () => {
    if (!node.parentId) return false;
    state.bm.selectedId = node.parentId;
    return true;
  };

  if (dir === 'left') {
    if (cur === bm.rootId) {
      const kids = bmGetChildren(bm, bm.rootId).filter(k => k.side === 'left');
      if (kids.length) state.bm.selectedId = kids[Math.floor(kids.length / 2)].id;
    } else if (ln.side === 'right') {
      toParent();
    } else {
      intoChildren();
    }
  } else if (dir === 'right') {
    if (cur === bm.rootId) {
      const kids = bmGetChildren(bm, bm.rootId).filter(k => k.side !== 'left');
      if (kids.length) state.bm.selectedId = kids[Math.floor(kids.length / 2)].id;
    } else if (ln.side === 'left') {
      toParent();
    } else {
      intoChildren();
    }
  }
  drawBrainmap();
}

function saveBrainmap() {
  const bm = getBrainmap();
  const groups = {};
  for (const n of Object.values(bm.nodes)) {
    const p = n.parentId || '__root__';
    (groups[p] ||= []).push(n);
  }
  for (const p in groups) {
    groups[p].sort((a, b) => (a.order || 0) - (b.order || 0));
    groups[p].forEach((n, i) => { n.order = i; });
  }
  saveData();
}

function teardownBrainmap() {
  hideBmContextMenu();
  state.bm.editingId = null;
  state.bm.layout = null;
  state.bm.selectedId = null;
  state.bm.panX = 0; state.bm.panY = 0; state.bm.zoom = 1;
  state.bm.detailExpandedNodeId = null;
  // lastLinkedTypeByNode intentionally NOT cleared — it survives view-switches
  // within the same session per the v2 plan ("reset on app reload").
  document.removeEventListener('click', bmTypePickerOutsideHandler, true);
  document.removeEventListener('click', bmFlowPickerOutsideHandler, true);
  const layer = document.getElementById('bm-edit-layer');
  if (layer) layer.innerHTML = '';
  if (state.bm._mouseMoveHandler) window.removeEventListener('mousemove', state.bm._mouseMoveHandler);
  if (state.bm._mouseUpHandler) window.removeEventListener('mouseup', state.bm._mouseUpHandler);
  state.bm._mouseMoveHandler = null;
  state.bm._mouseUpHandler = null;
}

// ============================================================================
// SPARK MAP — DETAIL PANEL (PHASE 2)
// Per-node panel showing linked items + an inline-add input. The ONLY mutator
// for node.linkedItems remains addNodeLink/removeNodeLink in the nodeLinks
// module — this code orchestrates UI + entity creation, then calls the
// chokepoint helpers.
// ============================================================================

// Per-node memory of last-used link type. Defaults to 'todo' for nodes
// never linked from before. Map is on state.bm (session-only).
function bmGetCurrentLinkType(nodeId) {
  const t = state.bm.lastLinkedTypeByNode.get(nodeId);
  return (t && NODE_LINK_ENTITY_TYPES.includes(t)) ? t : 'todo';
}
function bmSetCurrentLinkType(nodeId, type) {
  if (NODE_LINK_ENTITY_TYPES.includes(type)) {
    state.bm.lastLinkedTypeByNode.set(nodeId, type);
  }
}

function bmEntityTitle(entityType, entity) {
  if (!entity) return null;
  if (entityType === 'todo' || entityType === 'note' || entityType === 'reminder') return entity.title;
  if (entityType === 'commitment') return entity.description;
  if (entityType === 'delegation') return entity.task;
  if (entityType === 'flow')       return entity.name;
  return null;
}

// Done-state helpers. Notes and flows have no "done"; the others each store
// the state in a different field, mirroring the canonical native-view toggles
// (toggleTodoDone / updateCommitmentStatus / updateDelegationStatus). Keeping
// these inline rather than reusing the native toggles because those wrap UI
// concerns we don't want here (toasts, recurrence spawning, navigation).
function bmEntityHasDoneState(entityType) {
  return entityType === 'todo' || entityType === 'reminder'
      || entityType === 'commitment' || entityType === 'delegation';
}
function bmEntityIsDone(entityType, entity) {
  if (!entity) return false;
  if (entityType === 'todo')       return !!entity.done;
  if (entityType === 'reminder')   return !!entity.doneAt;
  if (entityType === 'commitment') return entity.status === 'fulfilled';
  if (entityType === 'delegation') return entity.status === 'done';
  return false;
}
function bmToggleEntityDone(entityType, entity) {
  if (!entity) return;
  const now = new Date().toISOString();
  if (entityType === 'todo') {
    const becoming = !entity.done;
    entity.done = becoming;
    entity.completedAt = becoming ? now : null;
  } else if (entityType === 'reminder') {
    entity.doneAt = entity.doneAt ? null : now;
  } else if (entityType === 'commitment') {
    if (entity.status === 'fulfilled') {
      entity.status = 'open';
      entity.fulfilled_at = null;
    } else {
      entity.status = 'fulfilled';
      entity.fulfilled_at = now;
    }
  } else if (entityType === 'delegation') {
    entity.status = entity.status === 'done' ? 'waiting' : 'done';
    entity.last_update = now;
  }
  saveData();
}

function bmRenderDetailPanel() {
  const panel = document.getElementById('bm-detail-panel');
  if (!panel) return;
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  const node = id && bm.nodes && bm.nodes[id];
  if (!node) { panel.innerHTML = ''; return; }

  // Coarse reset of the "Show all" toggle when selection moves to a
  // different node. Keeps the toggle scoped to the node it was opened on.
  if (state.bm.detailExpandedNodeId && state.bm.detailExpandedNodeId !== id) {
    state.bm.detailExpandedNodeId = null;
  }

  const itemsAll   = getLinkedItems(id);
  const totalAll   = itemsAll.length;
  const archivedN  = itemsAll.reduce((n, it) => n + (it.isArchived ? 1 : 0), 0);
  const doneN      = itemsAll.reduce((n, it) => n + (
    !it.isOrphan && bmEntityHasDoneState(it.entityType) && bmEntityIsDone(it.entityType, it.entity) ? 1 : 0
  ), 0);
  const hideArch   = state.bm.detailHideArchived;
  const hideDone   = state.bm.detailHideDone;
  // Filtered set: rows the user actually sees in the list. Counts and
  // overflow logic key off this filtered set so numbers stay consistent
  // with what's rendered. The `archivedN` / `doneN` tallies above keep
  // the "(N hidden)" hint honest even when filtering is on.
  const items = itemsAll.filter(it => {
    if (hideArch && it.isArchived) return false;
    if (hideDone && !it.isOrphan && bmEntityHasDoneState(it.entityType) && bmEntityIsDone(it.entityType, it.entity)) return false;
    return true;
  });
  const total = items.length;
  const expand    = state.bm.detailExpandedNodeId === id;
  // Array order is oldest-first; tail = newest. Display order is newest-first
  // (so we reverse a copy). When >10 items and not expanded, show only the
  // 8 newest per the v2 plan.
  const visible   = ((total > 10 && !expand) ? items.slice(-8) : items.slice()).reverse();

  // Per-type breakdown chips for the section header. Computed over the
  // filtered set so the chips reflect what's visible.
  const breakdown = Object.create(null);
  for (const it of items) breakdown[it.entityType] = (breakdown[it.entityType] || 0) + 1;
  const breakdownHTML = NODE_LINK_TYPE_META
    .filter(m => breakdown[m.type])
    .map(m => `<span class="bm-dp-bd-chip" title="${m.label}">${m.icon} ${breakdown[m.type]}</span>`)
    .join('');

  // Show the hide-archived/hide-done toggles whenever there's at least one
  // matching item OR the toggle is currently on (so the user always has a
  // way to turn filtering back off if they hid the last matching row).
  const showHideArchived = archivedN > 0 || hideArch;
  const showHideDone     = doneN     > 0 || hideDone;
  const hiddenHints = [];
  if (hideArch && archivedN > 0) hiddenHints.push(`${archivedN} archived hidden`);
  if (hideDone && doneN     > 0) hiddenHints.push(`${doneN} done hidden`);
  const hiddenHintHTML = hiddenHints.length
    ? ` <span class="bm-dp-archived-hint">(${hiddenHints.join(', ')})</span>`
    : '';

  const currentType = bmGetCurrentLinkType(id);

  panel.innerHTML = `
    <header class="bm-dp-head">
      <div class="bm-dp-node-label">${escapeHTML(node.label || '(empty)')}</div>
      <div class="bm-dp-node-meta">${totalAll === 0 ? 'No links yet' : `${total} linked${hiddenHintHTML}`}</div>
    </header>
    <section class="bm-dp-linked">
      ${totalAll > 0 ? `
        <div class="bm-dp-section-title">
          ${total} linked
          <span class="bm-dp-breakdown">${breakdownHTML}</span>
          <span class="bm-dp-section-spacer"></span>
          ${total > 10 ? `<span class="bm-dp-section-status">Showing ${expand ? total : 8} of ${total}</span>` : ''}
        </div>
        ${(showHideArchived || showHideDone) ? `
          <div class="bm-dp-filter-row">
            ${showHideArchived ? `
              <label class="bm-dp-archive-toggle">
                <input type="checkbox" data-filter="archived" ${hideArch ? 'checked' : ''}>
                <span>Hide archived${archivedN > 0 ? ` (${archivedN})` : ''}</span>
              </label>` : ''}
            ${showHideDone ? `
              <label class="bm-dp-archive-toggle">
                <input type="checkbox" data-filter="done" ${hideDone ? 'checked' : ''}>
                <span>Hide done${doneN > 0 ? ` (${doneN})` : ''}</span>
              </label>` : ''}
          </div>
        ` : ''}
        ${total > 0 ? `
          <ul class="bm-dp-list${expand ? ' bm-dp-list-expanded' : ''}">
            ${visible.map(it => bmLinkRowHTML(it)).join('')}
          </ul>
          ${total > 10 ? `<button class="bm-dp-show-toggle" type="button" data-action="${expand ? 'collapse' : 'expand'}">${expand ? 'Show fewer' : `Show all (${total})`}</button>` : ''}
        ` : `<div class="bm-dp-empty-hint">All ${totalAll} linked items are archived. Toggle "Hide archived" to see them.</div>`}
      ` : `<div class="bm-dp-empty-hint">Use the input below to create &amp; link an item.</div>`}
    </section>
    <section class="bm-dp-add">
      <div class="bm-dp-popover-host" id="bm-dp-popover-host"></div>
      ${bmAddRowHTML(id, currentType)}
    </section>
  `;

  bmWireDetailPanel(panel, id);
}

function bmLinkRowHTML(it) {
  const icon     = _nodeLinkTypeIcon[it.entityType] || '·';
  const orphan   = it.isOrphan;
  const archived = it.isArchived;
  const hasDone  = !orphan && bmEntityHasDoneState(it.entityType);
  const isDone   = hasDone && bmEntityIsDone(it.entityType, it.entity);
  const cls      = ['bm-dp-row'];
  if (orphan)   cls.push('bm-dp-row-orphan');
  if (archived) cls.push('bm-dp-row-archived');
  if (isDone)   cls.push('bm-dp-row-done');
  const title = orphan
    ? '(deleted)'
    : (bmEntityTitle(it.entityType, it.entity) || '(untitled)');
  const meta = orphan ? 'deleted' : (archived ? 'archived' : '');
  // Done checkbox slot: rendered for entity types that have a done concept
  // (todo/reminder/commitment/delegation). Notes and flows get a width-
  // matching spacer so the icon + title columns line up across the list.
  const checkSlot = hasDone
    ? `<input type="checkbox" class="bm-dp-row-check" ${isDone ? 'checked' : ''} data-action="toggle-done" aria-label="Mark done">`
    : `<span class="bm-dp-row-check-spacer" aria-hidden="true"></span>`;
  return `
    <li class="${cls.join(' ')}" data-link-type="${it.entityType}" data-link-id="${escapeHTML(it.entityId)}">
      ${checkSlot}
      <span class="bm-dp-row-icon">${icon}</span>
      <span class="bm-dp-row-title">${escapeHTML(title)}</span>
      ${meta ? `<span class="bm-dp-row-meta">${meta}</span>` : ''}
      <button class="bm-dp-row-unlink" type="button" data-action="unlink" title="Unlink" aria-label="Unlink">✕</button>
    </li>
  `;
}

function bmAddRowHTML(nodeId, type) {
  const icon  = _nodeLinkTypeIcon[type]  || '✓';
  const label = _nodeLinkTypeLabel[type] || 'Todo';
  const typeBtn = `
    <button class="bm-dp-type-btn" type="button" id="bm-dp-type-btn"
            data-current-type="${type}" title="Pick a different type" aria-label="Pick link type">
      <span class="bm-dp-type-ic">${icon}</span>
    </button>
  `;
  // Secondary action shown below each non-flow type's create form. Flow has
  // its own dedicated "Link existing" button up top because its create path
  // is also a button (not a text input), so the layout already accommodates
  // the choice.
  const linkExistingBtn = type === 'flow' ? '' : `
    <button class="bm-dp-link-existing" type="button" data-link-existing-type="${type}">
      Or link an existing ${label.toLowerCase()} →
    </button>
  `;

  // Title input: every non-flow type now wraps in the slash-ghost shell.
  // Slash sync is opt-in per type (driven by the install call in
  // bmWireDetailPanel), so the structural cost here is one extra wrapper
  // and a hidden chips host even for types that won't use them.
  const titleWrap = (placeholder) => `
    <div class="bm-dp-input-wrap">
      <div class="bm-dp-input-ghost" id="bm-dp-input-ghost" aria-hidden="true"></div>
      <input type="text" class="bm-dp-add-input" id="bm-dp-add-input"
             placeholder="${placeholder}" maxlength="200" autocomplete="off" spellcheck="false">
    </div>
  `;
  const chipsHost = `<div class="todo-slash-chips bm-dp-slash-chips" id="bm-dp-slash-chips" hidden></div>`;

  if (type === 'todo') {
    return `
      <div class="bm-dp-add-row">
        ${typeBtn}
        ${titleWrap('Add a todo… try /tomorrow /high /sp:name')}
      </div>
      ${chipsHost}
      <div class="bm-dp-rich-form">
        <div class="bm-dp-rich-field">
          <label>Priority</label>
          <select class="bm-dp-rich-input" id="bm-dp-todo-pri">
            <option value="high">🔴 High</option>
            <option value="medium" selected>🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>
        <div class="bm-dp-rich-field bm-dp-rich-field-grow">
          <label>Due (optional)</label>
          <input type="date" class="bm-dp-rich-input" id="bm-dp-todo-due">
        </div>
        <button class="bm-dp-add-submit bm-dp-add-submit-grow" type="button" id="bm-dp-add-submit">Add</button>
      </div>
      ${linkExistingBtn}
    `;
  }

  if (type === 'note') {
    return `
      <div class="bm-dp-add-row">
        ${typeBtn}
        ${titleWrap('Add a note… try /high')}
      </div>
      ${chipsHost}
      <div class="bm-dp-rich-form">
        <div class="bm-dp-rich-field bm-dp-rich-field-grow">
          <label>Priority</label>
          <select class="bm-dp-rich-input" id="bm-dp-note-pri">
            <option value="high">🔴 High</option>
            <option value="medium" selected>🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>
        <button class="bm-dp-add-submit" type="button" id="bm-dp-add-submit">Add</button>
      </div>
      ${linkExistingBtn}
    `;
  }

  if (type === 'reminder') {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm   = String(today.getMonth() + 1).padStart(2, '0');
    const dd   = String(today.getDate()).padStart(2, '0');
    return `
      <div class="bm-dp-add-row">
        ${typeBtn}
        ${titleWrap('Reminder title… try /tomorrow')}
      </div>
      ${chipsHost}
      <div class="bm-dp-rich-form">
        <div class="bm-dp-rich-field">
          <label>Date</label>
          <input type="date" class="bm-dp-rich-input" id="bm-dp-rem-date" value="${yyyy}-${mm}-${dd}">
        </div>
        <div class="bm-dp-rich-field">
          <label>Time</label>
          <input type="time" class="bm-dp-rich-input" id="bm-dp-rem-time" value="09:00">
        </div>
        <button class="bm-dp-add-submit" type="button" id="bm-dp-add-submit">Add</button>
      </div>
      ${linkExistingBtn}
    `;
  }

  if (type === 'commitment') {
    return `
      <div class="bm-dp-add-row">
        ${typeBtn}
        ${titleWrap("What's the commitment? Try /tomorrow")}
      </div>
      ${chipsHost}
      <div class="bm-dp-rich-form">
        <button class="bm-dp-direction" type="button" data-direction="i_owe" id="bm-dp-com-dir"
                title="Click to flip">I owe</button>
        <input type="text" class="bm-dp-rich-input bm-dp-rich-input-grow" id="bm-dp-com-cp"
               placeholder="Counterparty" maxlength="100" autocomplete="off">
      </div>
      <div class="bm-dp-rich-form">
        <div class="bm-dp-rich-field">
          <label>Due (optional)</label>
          <input type="date" class="bm-dp-rich-input" id="bm-dp-com-due">
        </div>
        <button class="bm-dp-add-submit bm-dp-add-submit-grow" type="button" id="bm-dp-add-submit">Add</button>
      </div>
      ${linkExistingBtn}
    `;
  }

  if (type === 'delegation') {
    return `
      <div class="bm-dp-add-row">
        ${typeBtn}
        ${titleWrap('Task… try /tomorrow')}
      </div>
      ${chipsHost}
      <div class="bm-dp-rich-form">
        <input type="text" class="bm-dp-rich-input bm-dp-rich-input-grow" id="bm-dp-del-to"
               placeholder="Delegated to" maxlength="100" autocomplete="off">
      </div>
      <div class="bm-dp-rich-form">
        <div class="bm-dp-rich-field">
          <label>Due (optional)</label>
          <input type="date" class="bm-dp-rich-input" id="bm-dp-del-due">
        </div>
        <button class="bm-dp-add-submit bm-dp-add-submit-grow" type="button" id="bm-dp-add-submit">Add</button>
      </div>
      ${linkExistingBtn}
    `;
  }

  if (type === 'flow') {
    return `
      <div class="bm-dp-add-row bm-dp-add-row-flow">
        ${typeBtn}
        <button class="bm-dp-flow-action" type="button" data-flow-action="create">+ Create new flow</button>
        <button class="bm-dp-flow-action bm-dp-flow-action-secondary" type="button" data-flow-action="link">Link existing</button>
      </div>
    `;
  }

  return '';
}

function bmWireDetailPanel(panel, nodeId) {
  // Type-picker open
  const typeBtn = panel.querySelector('#bm-dp-type-btn');
  if (typeBtn) {
    typeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      bmOpenTypePicker(nodeId);
    });
  }

  // Linked-items rows: tap navigates, ✕ unlinks, checkbox toggles done.
  panel.querySelectorAll('.bm-dp-row').forEach(row => {
    const unlinkBtn = row.querySelector('[data-action="unlink"]');
    if (unlinkBtn) {
      unlinkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const t   = row.dataset.linkType;
        const eid = row.dataset.linkId;
        if (removeNodeLink(nodeId, t, eid)) {
          saveData();
          drawBrainmap();
        }
      });
    }
    const doneCheck = row.querySelector('[data-action="toggle-done"]');
    if (doneCheck) {
      // Stop click bubbling so it doesn't trigger row-navigation. The change
      // event then handles the actual state flip.
      doneCheck.addEventListener('click', (e) => e.stopPropagation());
      doneCheck.addEventListener('change', (e) => {
        e.stopPropagation();
        const t   = row.dataset.linkType;
        const eid = row.dataset.linkId;
        const proj = getProject();
        const entity = _findEntityInProject(proj, t, eid);
        if (entity) {
          bmToggleEntityDone(t, entity);
          drawBrainmap();
        }
      });
    }
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="unlink"]')) return;
      if (e.target.closest('[data-action="toggle-done"]')) return;
      if (row.classList.contains('bm-dp-row-orphan')) return;
      bmNavigateToEntity(row.dataset.linkType, row.dataset.linkId);
    });
  });

  // Hide-archived / hide-done filter toggles (session-only global state).
  panel.querySelectorAll('.bm-dp-archive-toggle input[data-filter]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const which = cb.dataset.filter;
      if (which === 'archived')  state.bm.detailHideArchived = e.target.checked;
      else if (which === 'done') state.bm.detailHideDone     = e.target.checked;
      bmRenderDetailPanel();
    });
  });

  // Show-all / show-fewer toggle. When expanding, we ALSO scroll the
  // linked-items section into view so the user sees the list visibly grow
  // (otherwise the just-revealed items sit below the fold and the click
  // looks like it did nothing).
  const showToggle = panel.querySelector('.bm-dp-show-toggle');
  if (showToggle) {
    showToggle.addEventListener('click', () => {
      const expanding = showToggle.dataset.action === 'expand';
      state.bm.detailExpandedNodeId = expanding ? nodeId : null;
      bmRenderDetailPanel();
      if (expanding) {
        const linked = panel.querySelector('.bm-dp-linked');
        if (linked) linked.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    });
  }

  // Title input: Enter submits, Escape clears.
  const titleInput = panel.querySelector('#bm-dp-add-input');
  if (titleInput) {
    titleInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter')  { e.preventDefault(); bmSubmitAdd(nodeId); }
      else if (e.key === 'Escape') { e.preventDefault(); titleInput.value = ''; }
    });
    // Slash-command ghost completion + live chips + real-time field sync.
    // Same engine for every non-flow type — the fields object below decides
    // which form controls each type's slash command actually drives. Types
    // not listed in the map skip slash entirely (e.g. flow uses dedicated
    // buttons, no text input).
    const ghost     = panel.querySelector('#bm-dp-input-ghost');
    const chipsHost = panel.querySelector('#bm-dp-slash-chips');
    const currentType = bmGetCurrentLinkType(nodeId);
    const slashFieldsByType = {
      todo: () => ({
        priority: panel.querySelector('#bm-dp-todo-pri'),
        due:      panel.querySelector('#bm-dp-todo-due')
      }),
      note: () => ({
        priority: panel.querySelector('#bm-dp-note-pri')
      }),
      reminder:   () => ({ due: panel.querySelector('#bm-dp-rem-date') }),
      commitment: () => ({ due: panel.querySelector('#bm-dp-com-due') }),
      delegation: () => ({ due: panel.querySelector('#bm-dp-del-due') })
    };
    if (slashFieldsByType[currentType]) {
      installTodoSlashCompletion(titleInput, ghost, chipsHost, slashFieldsByType[currentType]());
    }
  }

  // Rich-form inputs: Enter also submits
  panel.querySelectorAll('.bm-dp-rich-input').forEach(inp => {
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); bmSubmitAdd(nodeId); }
    });
  });

  // Add submit button (rich types)
  const submitBtn = panel.querySelector('#bm-dp-add-submit');
  if (submitBtn) submitBtn.addEventListener('click', () => bmSubmitAdd(nodeId));

  // Commitment direction toggle
  const dirBtn = panel.querySelector('#bm-dp-com-dir');
  if (dirBtn) {
    dirBtn.addEventListener('click', () => {
      const next = dirBtn.dataset.direction === 'i_owe' ? 'they_owe' : 'i_owe';
      dirBtn.dataset.direction = next;
      dirBtn.textContent = next === 'i_owe' ? 'I owe' : 'They owe';
    });
  }

  // Flow actions
  panel.querySelectorAll('.bm-dp-flow-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.dataset.flowAction === 'create') bmFlowCreateAndLink(nodeId);
      else if (btn.dataset.flowAction === 'link') bmFlowLinkExisting(nodeId);
    });
  });

  // "Or link an existing X →" — secondary action below each non-flow form.
  // Opens the same fuzzy picker pattern as flow's "Link existing" button.
  panel.querySelectorAll('.bm-dp-link-existing').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = btn.dataset.linkExistingType;
      if (t) bmLinkExistingForType(nodeId, t);
    });
  });
}

function bmOpenTypePicker(nodeId) {
  const host = document.getElementById('bm-dp-popover-host');
  if (!host) return;
  // Toggle: a second tap on the same type-btn closes it.
  if (host.firstChild && host.firstChild.classList.contains('bm-dp-type-popover')) {
    host.innerHTML = '';
    document.removeEventListener('click', bmTypePickerOutsideHandler, true);
    return;
  }
  const popover = document.createElement('div');
  popover.className = 'bm-dp-type-popover';
  popover.innerHTML = NODE_LINK_TYPE_META.map(m => `
    <button class="bm-dp-type-opt" type="button" data-type="${m.type}">
      <span class="bm-dp-type-opt-ic">${m.icon}</span>
      <span class="bm-dp-type-opt-lbl">${m.label}</span>
    </button>
  `).join('');
  popover.addEventListener('click', (e) => {
    e.stopPropagation();
    const opt = e.target.closest('.bm-dp-type-opt');
    if (!opt) return;
    bmSetCurrentLinkType(nodeId, opt.dataset.type);
    host.innerHTML = '';
    document.removeEventListener('click', bmTypePickerOutsideHandler, true);
    bmRenderDetailPanel();
    requestAnimationFrame(() => {
      const inp = document.getElementById('bm-dp-add-input');
      if (inp) inp.focus();
    });
  });
  host.appendChild(popover);
  // Capture-phase outside-click to close. setTimeout defers past the
  // current click event so we don't immediately self-close.
  setTimeout(() => document.addEventListener('click', bmTypePickerOutsideHandler, true), 0);
}

function bmTypePickerOutsideHandler(e) {
  const host = document.getElementById('bm-dp-popover-host');
  if (!host || !host.firstChild) {
    document.removeEventListener('click', bmTypePickerOutsideHandler, true);
    return;
  }
  if (e.target.closest('.bm-dp-type-popover')) return;
  if (e.target.closest('#bm-dp-type-btn'))     return;
  host.innerHTML = '';
  document.removeEventListener('click', bmTypePickerOutsideHandler, true);
}

function bmSubmitAdd(nodeId) {
  const type = bmGetCurrentLinkType(nodeId);
  if (type === 'flow') return;  // flow uses dedicated buttons, not this submit path

  const titleInput = document.getElementById('bm-dp-add-input');
  const rawTitle = titleInput ? titleInput.value.trim() : '';
  if (!rawTitle) {
    if (titleInput) titleInput.focus();
    showToast(`Please enter a ${_nodeLinkTypeLabel[type].toLowerCase()} title.`, 'error');
    return;
  }

  const proj = getProject();
  const node = proj.brainmap.nodes[nodeId];
  const subId = node ? (node.subprojectId || null) : null;
  let newId = null;
  // For non-slash-aware types, the title used downstream is rawTitle as-is.
  // The todo branch overrides this with the slash-parsed title.
  let title = rawTitle;

  if (type === 'todo') {
    // Match addTodo's behavior: slash commands override form fields. So a
    // user typing "Call Lukas /tom /high" gets dueDate=tomorrow, priority=high
    // even when the dropdowns say "Medium" / blank. Slash-parsed title falls
    // back to the raw input if no command stripped any text.
    const slash = parseTodoSlashCommands(rawTitle);
    title = slash.title || rawTitle;
    if (!title) {
      if (titleInput) titleInput.focus();
      showToast('Please enter a todo title.', 'error');
      return;
    }
    const priInp = document.getElementById('bm-dp-todo-pri');
    const dueInp = document.getElementById('bm-dp-todo-due');
    const priority   = slash.priority   || (priInp && priInp.value)   || 'medium';
    const startDate  = slash.startDate  || '';
    let   dueDate    = slash.dueDate    || (dueInp && dueInp.value)   || '';
    const subprojectId = slash.subprojectId || subId;
    const recurrence = slash.recurrence ? JSON.parse(JSON.stringify(slash.recurrence)) : null;
    if (recurrence && !dueDate) {
      const first = computeNextOccurrence(recurrence, new Date());
      if (first) dueDate = toDateString(first);
    }
    newId = generateId('todo');
    proj.todos = proj.todos || [];
    proj.todos.unshift({
      id: newId, title, done: false, priority,
      startDate, dueDate, subprojectId,
      created: new Date().toISOString(), attachments: [], steps: [], recurrence
    });
  } else if (type === 'note') {
    const priInp = document.getElementById('bm-dp-note-pri');
    const priority = (priInp && priInp.value) || 'medium';
    newId = generateId('note');
    const now = new Date().toISOString();
    proj.notes = proj.notes || [];
    proj.notes.unshift({
      id: newId, title, content: '', priority, tags: [],
      subprojectId: subId, linkedTodos: [], created: now, updated: now
    });
  } else if (type === 'reminder') {
    const dateInp = document.getElementById('bm-dp-rem-date');
    const timeInp = document.getElementById('bm-dp-rem-time');
    const date = dateInp ? dateInp.value : '';
    const time = timeInp ? timeInp.value : '';
    if (!date || !time) {
      (date ? timeInp : dateInp)?.focus();
      showToast('Please set a date and time.', 'error');
      return;
    }
    const datetime = new Date(`${date}T${time}`);
    if (isNaN(datetime.getTime())) {
      showToast('Invalid date/time.', 'error');
      return;
    }
    if (datetime < new Date()) {
      showToast('Please pick a future time.', 'error');
      return;
    }
    newId = generateId('rem');
    proj.reminders = proj.reminders || [];
    proj.reminders.push({ id: newId, title, note: '', datetime: datetime.toISOString(), fired: false });
  } else if (type === 'commitment') {
    const cpInp  = document.getElementById('bm-dp-com-cp');
    const dueInp = document.getElementById('bm-dp-com-due');
    const dirBtn = document.getElementById('bm-dp-com-dir');
    const cp  = cpInp ? cpInp.value.trim() : '';
    const due = dueInp ? (dueInp.value || null) : null;
    const dir = dirBtn ? dirBtn.dataset.direction : 'i_owe';
    if (!cp) {
      if (cpInp) cpInp.focus();
      showToast('Please enter a counterparty.', 'error');
      return;
    }
    const created = addCommitment({ direction: dir, counterparty: cp, description: title, due_date: due });
    if (!created) { showToast('Could not create commitment.', 'error'); return; }
    newId = created.id;
  } else if (type === 'delegation') {
    const toInp  = document.getElementById('bm-dp-del-to');
    const dueInp = document.getElementById('bm-dp-del-due');
    const to  = toInp  ? toInp.value.trim() : '';
    const due = dueInp ? (dueInp.value || null) : null;
    if (!to) {
      if (toInp) toInp.focus();
      showToast("Please enter who it's delegated to.", 'error');
      return;
    }
    const created = addDelegation({ task: title, delegated_to: to, due_date: due });
    if (!created) { showToast('Could not create delegation.', 'error'); return; }
    newId = created.id;
  }

  if (!newId) return;
  if (!addNodeLink(nodeId, type, newId)) {
    showToast('Created but could not link.', 'error');
    return;
  }
  saveData();
  drawBrainmap();
  // Re-focus the title input (panel was re-rendered, so this is the fresh
  // element). Matches the v2 plan's "clear input + keep focus" requirement.
  requestAnimationFrame(() => {
    const fresh = document.getElementById('bm-dp-add-input');
    if (fresh) fresh.focus();
  });
  showToast(`${_nodeLinkTypeLabel[type]} created and linked.`, 'success');
}

function bmFlowCreateAndLink(nodeId) {
  // openFlowNameModal accepts an optional onCreate callback so the link
  // is formed atomically with creation — no pending-state dance.
  openFlowNameModal(null, (flow) => {
    addNodeLink(nodeId, 'flow', flow.id);
    bmSetCurrentLinkType(nodeId, 'flow');
    saveData();
    state.flowEditing = flow.id;
    showView('flows');
  });
}

// Backwards-compatible thin wrapper kept so the flow-action button keeps
// working unchanged. Both the flow path and every non-flow type now share
// the bmLinkExistingForType / bmOpenEntityPicker pair below.
function bmFlowLinkExisting(nodeId) {
  bmLinkExistingForType(nodeId, 'flow');
}

// Open a fuzzy-search picker for any entity type. Filters out items already
// linked from this node + archived items (the latter typically aren't what
// the user wants to surface; a "show archived" toggle could be added later
// if real use shows it's needed).
function bmLinkExistingForType(nodeId, entityType) {
  const proj = getProject();
  const collection = NODE_LINK_COLLECTION[entityType];
  if (!collection) return;
  const items = (proj[collection] || []).filter(item =>
    item && item.id
    && !nodeLinkExists(nodeId, entityType, item.id)
    && !item.archived
  );
  if (items.length === 0) {
    const label = _nodeLinkTypeLabel[entityType].toLowerCase();
    showToast(`No ${label}s available to link, or all are already linked.`, 'info');
    return;
  }
  bmOpenEntityPicker(nodeId, entityType, items);
}

function bmOpenEntityPicker(nodeId, entityType, items) {
  const host = document.getElementById('bm-dp-popover-host');
  if (!host) return;
  host.innerHTML = '';
  const typeLabel = _nodeLinkTypeLabel[entityType].toLowerCase();
  const pop = document.createElement('div');
  pop.className = 'bm-dp-flow-picker';
  pop.dataset.pickerType = entityType;
  pop.innerHTML = `
    <input type="search" class="bm-dp-flow-search" placeholder="Search ${typeLabel}s…" autocomplete="off">
    <div class="bm-dp-flow-list">
      ${items.map(item => {
        const title = bmEntityTitle(entityType, item) || '(untitled)';
        return `<button class="bm-dp-flow-row" type="button" data-entity-id="${escapeHTML(item.id)}">${escapeHTML(title)}</button>`;
      }).join('')}
    </div>
  `;
  host.appendChild(pop);
  const search = pop.querySelector('.bm-dp-flow-search');
  const list   = pop.querySelector('.bm-dp-flow-list');
  search.focus();
  search.addEventListener('input', () => {
    const q = search.value.toLowerCase().trim();
    list.querySelectorAll('.bm-dp-flow-row').forEach(row => {
      row.hidden = q && !row.textContent.toLowerCase().includes(q);
    });
  });
  search.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      host.innerHTML = '';
      document.removeEventListener('click', bmFlowPickerOutsideHandler, true);
    }
  });
  pop.addEventListener('click', (e) => {
    e.stopPropagation();
    const row = e.target.closest('.bm-dp-flow-row');
    if (!row) return;
    const eid = row.dataset.entityId;
    if (addNodeLink(nodeId, entityType, eid)) {
      bmSetCurrentLinkType(nodeId, entityType);
      saveData();
      host.innerHTML = '';
      document.removeEventListener('click', bmFlowPickerOutsideHandler, true);
      drawBrainmap();
      showToast(`${_nodeLinkTypeLabel[entityType]} linked.`, 'success');
    }
  });
  setTimeout(() => document.addEventListener('click', bmFlowPickerOutsideHandler, true), 0);
}

function bmFlowPickerOutsideHandler(e) {
  const host = document.getElementById('bm-dp-popover-host');
  if (!host || !host.firstChild) {
    document.removeEventListener('click', bmFlowPickerOutsideHandler, true);
    return;
  }
  if (e.target.closest('.bm-dp-flow-picker'))    return;
  if (e.target.closest('.bm-dp-flow-action'))    return;
  if (e.target.closest('.bm-dp-link-existing'))  return;
  host.innerHTML = '';
  document.removeEventListener('click', bmFlowPickerOutsideHandler, true);
}

function bmNavigateToEntity(entityType, entityId) {
  // Save the brainmap before leaving (showView would teardown the brainmap
  // anyway — this just makes the order explicit). For note/flow the editor
  // opens to that entity directly. For commitment/delegation the existing
  // expandedCommitment/expandedDelegation state expands the matching card
  // in place. Todo and reminder only need a list-view scroll-and-highlight
  // since their renderers don't pinpoint anything.
  saveBrainmap();
  if      (entityType === 'todo')       { showView('todos');       bmHighlightTargetItem('todo', entityId); }
  else if (entityType === 'note')       { state.editingNote        = entityId; showView('notes'); }
  else if (entityType === 'reminder')   { showView('reminders');   bmHighlightTargetItem('reminder', entityId); }
  else if (entityType === 'commitment') { state.expandedCommitment = entityId; showView('commitments'); bmHighlightTargetItem('commitment', entityId); }
  else if (entityType === 'delegation') { state.expandedDelegation = entityId; showView('delegations'); bmHighlightTargetItem('delegation', entityId); }
  else if (entityType === 'flow')       { state.flowEditing        = entityId; showView('flows'); }
}

// Scrolls the target row/card into view and applies a brief pulse so the
// user can spot it in a long list. Selectors map to the data-* attributes
// each entity type's row/card already exposes (see todoItemHTML, etc.).
// Defers to requestAnimationFrame so the showView render has settled.
function bmHighlightTargetItem(entityType, entityId) {
  const selector = ({
    todo:       `.todo-card[data-todo-id="${cssEscape(entityId)}"]`,
    reminder:   `.reminder-item[data-reminder-id="${cssEscape(entityId)}"]`,
    commitment: `.com-card[data-com-id="${cssEscape(entityId)}"]`,
    delegation: `.del-card[data-del-id="${cssEscape(entityId)}"]`
  })[entityType];
  if (!selector) return;
  requestAnimationFrame(() => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('bm-target-highlight');
    setTimeout(() => el.classList.remove('bm-target-highlight'), 2000);
  });
}

// CSS.escape isn't always available in older WebViews; fall back to a
// minimal escape sufficient for our id format (prefix-timestamp-rand).
function cssEscape(s) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_\-]/g, m => '\\' + m);
}

// ============================================================================
// PHASE 3 — REVERSE-LINK CHIPS ON ENTITY VIEWS
// Each entity card/editor calls genericLinksChip(type, id) → returns a small
// pill listing the spark-map nodes linking to it (truncated to 2 + "+N more"
// popover). Tap a name → jump to spark map with that node selected.
//
// Performance: getLinkedNodes uses the Phase 1 reverse-index cache, so each
// call is an O(1) Set lookup. Rendering N chips on a list is N cache hits +
// 1 cache build (lazy, sub-ms on real data scale) — well under the 50ms
// target the v2 plan set for a 100-entity view.
// ============================================================================

// Number of node names rendered before collapsing to "+N more". Two keeps
// the chip compact even on busy cards; the popover handles the long tail.
const NODE_LINK_CHIP_INLINE_LIMIT = 2;

function genericLinksChip(entityType, entityId) {
  const nodes = getLinkedNodes(entityType, entityId);
  if (nodes.length === 0) return '';

  const visible  = nodes.slice(0, NODE_LINK_CHIP_INLINE_LIMIT);
  const overflow = nodes.length - visible.length;

  const namesHTML = visible.map((n, i) => {
    const isLast = (i === visible.length - 1) && overflow === 0;
    return `<button class="node-link-chip-name" type="button" data-node-id="${escapeHTML(n.id)}" title="Open in spark map">${escapeHTML(n.label || '(empty)')}</button>${isLast ? '' : '<span class="node-link-chip-sep">,</span>'}`;
  }).join('');

  const moreHTML = overflow > 0
    ? `<button class="node-link-chip-more" type="button" data-entity-type="${entityType}" data-entity-id="${escapeHTML(entityId)}">+${overflow} more</button>`
    : '';

  return `<span class="node-link-chip" title="Spark-map nodes linking to this ${entityType}"><span class="node-link-chip-icon" aria-hidden="true">↔</span><span class="node-link-chip-label">Linked to:</span>${namesHTML}${moreHTML}</span>`;
}

// Single document-level click delegate handles every chip across every view.
// Cheaper than wiring listeners on each chip, and survives view re-renders
// since the listener lives on document, not on disposable nodes.
function _nodeLinkChipClickHandler(e) {
  const nameBtn = e.target.closest('.node-link-chip-name');
  if (nameBtn) {
    e.stopPropagation();
    const nodeId = nameBtn.dataset.nodeId;
    if (!nodeId) return;
    _hideNodeLinksPopover();
    state.bm.selectedId = nodeId;
    showView('brainmap');
    return;
  }
  const popRow = e.target.closest('.node-link-chip-pop-row, .linked-node-row');
  if (popRow) {
    e.stopPropagation();
    const nodeId = popRow.dataset.nodeId;
    if (!nodeId) return;
    _hideNodeLinksPopover();
    state.bm.selectedId = nodeId;
    showView('brainmap');
    return;
  }
  const moreBtn = e.target.closest('.node-link-chip-more');
  if (moreBtn) {
    e.stopPropagation();
    _showNodeLinksPopover(moreBtn);
    return;
  }
}

function _showNodeLinksPopover(anchor) {
  _hideNodeLinksPopover();
  const entityType = anchor.dataset.entityType;
  const entityId   = anchor.dataset.entityId;
  const nodes = getLinkedNodes(entityType, entityId);
  if (nodes.length === 0) return;

  const pop = document.createElement('div');
  pop.className = 'node-link-chip-popover';
  pop.id = '_nodeLinkChipPopover';
  pop.innerHTML = nodes.map(n =>
    `<button class="node-link-chip-pop-row" type="button" data-node-id="${escapeHTML(n.id)}">${escapeHTML(n.label || '(empty)')}</button>`
  ).join('');
  document.body.appendChild(pop);

  // Position below the anchor; flip up if it would go off-screen.
  const rect = anchor.getBoundingClientRect();
  const popH = pop.offsetHeight;
  const wantTop = rect.bottom + 4;
  const top = (wantTop + popH > window.innerHeight) ? Math.max(8, rect.top - popH - 4) : wantTop;
  pop.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - pop.offsetWidth - 8))}px`;
  pop.style.top  = `${top}px`;

  setTimeout(() => document.addEventListener('click', _nodeLinkChipOutsideHandler, true), 0);
}

function _hideNodeLinksPopover() {
  const pop = document.getElementById('_nodeLinkChipPopover');
  if (pop) pop.remove();
  document.removeEventListener('click', _nodeLinkChipOutsideHandler, true);
}

function _nodeLinkChipOutsideHandler(e) {
  if (e.target.closest('#_nodeLinkChipPopover')) return;
  if (e.target.closest('.node-link-chip-more'))  return;
  _hideNodeLinksPopover();
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', _nodeLinkChipClickHandler);
}

// ===== BOOT =====
window.addEventListener('DOMContentLoaded', init);
