'use strict';

// ===== src/11-projects-init.js =====
// Wave-4 extraction (M0): the bootstrap-adjacent helpers — developer-mode
// toggles, the backup-prompt timer machinery, the escalation chain
// spawner (`spawnChain`), sidebar / gantt / list-panel resizers, project
// CRUD (createProject, slug, migrateProjectColors, applyProjectAccent
// + the rename / delete / new-project modals + project context menu).
//
// CRITICAL: init() itself STAYS in residual app.js. Only the helpers it
// calls move here. The init() orchestrator's exact call order is the
// highest-risk single piece of the modularization (per master plan risk
// register), so we leave it untouched.
//
// var conversion (5 top-level declarations):
// - BACKUP_PROMPT_INTERVAL_MS, BACKUP_PROMPT_MIN_GAP_MS — interval/floor
//   constants for the backup-prompt timer
// - backupPromptTimerHandle, lastBackupPromptShownAt — let → var,
//   cross-call timer state
// - SIDEBAR_COMPACT_THRESHOLD — width threshold for sidebar compact mode
//
// Cross-module call sites (verified):
// - migrateProjectColors and migrateAttachments are called from init() at
//   the very top. Function declarations stay global → resolve identically.
// - applyProjectAccent / applySidebarWidth / setupSidebarResizer /
//   applyGanttLabelWidth / setupGanttLabelResizers / ensureListPanelResizer
//   are wired from init() and from view renderers throughout residual.
// - The four localStorage getter/setter pairs (isDeveloperMode etc.)
//   are pulled in from settings UI in src/09-themes.js. Function decls
//   stay global; the calls work either direction.
// ===== DEVELOPER / BACKUP PROMPT =====
var BACKUP_PROMPT_INTERVAL_MS = 15 * 60 * 1000;
var BACKUP_PROMPT_MIN_GAP_MS = 14 * 60 * 1000; // hard floor under the interval
var backupPromptTimerHandle = null;
var lastBackupPromptShownAt = 0;

function isDeveloperMode() { return localStorage.getItem('developerMode') === 'true'; }
function isAskForBackups() { return localStorage.getItem('askForBackups') === 'true'; }

function isRecurringBoxCollapsed() { return localStorage.getItem('recurringBoxCollapsed') === 'true'; }
function setRecurringBoxCollapsed(on) { localStorage.setItem('recurringBoxCollapsed', on ? 'true' : 'false'); }

// Per-chain collapsed state for escalation-chain follow-up boxes. Keyed
// by chainId so each chain's box collapses/expands independently. Same
// pattern as isRecurringBoxCollapsed but parameterized.
function isEscalationBoxCollapsed(chainId) {
  return localStorage.getItem(`escalationBoxCollapsed:${chainId}`) === 'true';
}
function setEscalationBoxCollapsed(chainId, on) {
  localStorage.setItem(`escalationBoxCollapsed:${chainId}`, on ? 'true' : 'false');
}

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

// Applies an Offset object to an anchor Date for escalation-chain item due
// dates. Returns a NEW Date; never mutates the anchor. Offset shape:
//   { days?: number, workdays?: number, plusWorkdays?: number }
// Exactly one of `days` (calendar) or `workdays` (skip Sat/Sun) is the
// primary magnitude — both > 0 throws (XOR enforced). `plusWorkdays` is an
// optional non-negative tail of additional working days added AFTER the
// primary, used for compound offsets like the legacy "+14 calendar days
// then +3 workdays". Negatives are clamped to 0 (so a corrupted offset
// degrades to the anchor rather than producing a past date). NaN inputs
// throw — corrupted data should surface, not silently return today.
function applyOffset(anchorDate, offset) {
  if (!(anchorDate instanceof Date) || isNaN(anchorDate)) {
    throw new Error('applyOffset: anchor is not a valid Date');
  }
  if (!offset || typeof offset !== 'object') {
    throw new Error('applyOffset: offset is missing or not an object');
  }
  const rawDays = offset.days;
  const rawWorkdays = offset.workdays;
  const rawTail = offset.plusWorkdays;
  // Reject NaN explicitly so a typo like { days: parseInt('x') } surfaces
  // instead of silently degrading to 0.
  if (rawDays !== undefined && Number.isNaN(Number(rawDays))) {
    throw new Error('applyOffset: offset.days is NaN');
  }
  if (rawWorkdays !== undefined && Number.isNaN(Number(rawWorkdays))) {
    throw new Error('applyOffset: offset.workdays is NaN');
  }
  if (rawTail !== undefined && Number.isNaN(Number(rawTail))) {
    throw new Error('applyOffset: offset.plusWorkdays is NaN');
  }
  const primaryDays     = Math.max(0, Number(rawDays)     || 0);
  const primaryWorkdays = Math.max(0, Number(rawWorkdays) || 0);
  const tail            = Math.max(0, Number(rawTail)     || 0);

  if (primaryDays > 0 && primaryWorkdays > 0) {
    throw new Error('applyOffset: cannot mix offset.days and offset.workdays (XOR violated)');
  }

  let d = new Date(anchorDate);
  if (primaryDays > 0) {
    d.setDate(d.getDate() + primaryDays);
  } else if (primaryWorkdays > 0) {
    d = addWorkdays(d, primaryWorkdays);
  }
  if (tail > 0) {
    d = addWorkdays(d, tail);
  }
  return d;
}

// Spawns an escalation chain in the active project. Walks chain.items,
// computes each item's dueDate via applyOffset (anchored to today),
// creates kind:'escalation' todos with the chainId reference, and
// persists. v0.1 defaults: anchor=today, project=active, titles=verbatim.
// Cross-project spawn, anchor picker, and title placeholders are deferred
// to post-v0.1 (see ESCALATION_CHAINS_PLAN.md non-goals).
function spawnChain(chainId) {
  const chains = (state.data && state.data.escalationChains) || [];
  const chain = chains.find(c => c.id === chainId);
  if (!chain) { showToast('Chain not found.', 'error'); return; }
  const proj = getProject();
  if (!proj) { showToast('No active project.', 'error'); return; }
  if (!Array.isArray(proj.todos)) proj.todos = [];

  const items = Array.isArray(chain.items) ? chain.items : [];
  if (items.length === 0) {
    showToast(`"${chain.name}" has no items to spawn.`, 'info');
    return;
  }

  const anchor = new Date();
  const createdBase = Date.now();
  // Insert in REVERSE order so the first item ends up at the top of the
  // todo list (matches the visual order users expect: step 1 first).
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    const due = applyOffset(anchor, item.offset || {});
    proj.todos.unshift({
      id: generateId('todo'),
      title: item.title,
      done: false,
      priority: 'medium',
      startDate: '',
      dueDate: toDateString(due),
      subprojectId: null,
      tags: [],
      created: new Date(createdBase + i).toISOString(),
      completedAt: null,
      attachments: [],
      steps: [],
      recurrence: null,
      archived: false,
      kind: 'escalation',
      chainId: chain.id
    });
  }
  saveData();
  showToast(`${items.length} item${items.length === 1 ? '' : 's'} spawned from "${chain.name}".`, 'success');
}

// ----- Escalation chain CRUD -----
// All mutations call saveData() so changes persist immediately. Caller
// (Settings UI) is responsible for re-rendering on structural changes
// (add/remove/reorder); plain text/number edits don't need a re-render
// because the DOM input value is already user-updated and the data layer
// just follows along — re-rendering would steal focus mid-typing.

function createChain() {
  if (!state.data) return null;
  if (!Array.isArray(state.data.escalationChains)) state.data.escalationChains = [];
  const newChain = {
    id: generateId('chain'),
    name: 'New chain',
    items: [{ title: 'Step 1', offset: { days: 7 } }]
  };
  state.data.escalationChains.push(newChain);
  saveData();
  return newChain.id;
}

function deleteChain(chainId) {
  if (!state.data || !Array.isArray(state.data.escalationChains)) return;
  state.data.escalationChains = state.data.escalationChains.filter(c => c.id !== chainId);
  saveData();
}

function renameChain(chainId, newName) {
  const chain = (state.data && state.data.escalationChains || []).find(c => c.id === chainId);
  if (!chain) return;
  // Allow empty intermediate values during typing; canonicalize on blur.
  chain.name = String(newName == null ? '' : newName);
  saveData();
}

function reorderChain(fromIdx, toIdx) {
  const chains = state.data && state.data.escalationChains;
  if (!Array.isArray(chains)) return;
  if (fromIdx < 0 || fromIdx >= chains.length || toIdx < 0 || toIdx >= chains.length) return;
  const [moved] = chains.splice(fromIdx, 1);
  chains.splice(toIdx, 0, moved);
  saveData();
}

function addChainItem(chainId) {
  const chain = (state.data && state.data.escalationChains || []).find(c => c.id === chainId);
  if (!chain) return;
  if (!Array.isArray(chain.items)) chain.items = [];
  chain.items.push({ title: `Step ${chain.items.length + 1}`, offset: { days: 7 } });
  saveData();
}

function removeChainItem(chainId, itemIndex) {
  const chain = (state.data && state.data.escalationChains || []).find(c => c.id === chainId);
  if (!chain || !Array.isArray(chain.items)) return;
  if (itemIndex < 0 || itemIndex >= chain.items.length) return;
  chain.items.splice(itemIndex, 1);
  saveData();
}

function reorderChainItem(chainId, fromIdx, toIdx) {
  const chain = (state.data && state.data.escalationChains || []).find(c => c.id === chainId);
  if (!chain || !Array.isArray(chain.items)) return;
  if (fromIdx < 0 || fromIdx >= chain.items.length || toIdx < 0 || toIdx >= chain.items.length) return;
  const [moved] = chain.items.splice(fromIdx, 1);
  chain.items.splice(toIdx, 0, moved);
  saveData();
}

// Granular setter for chain-item fields. Field is one of:
//   'title'         → string
//   'primaryUnit'   → 'days' | 'workdays' (preserves magnitude)
//   'primaryValue'  → number (clamped >= 0; preserves unit)
//   'plusEnabled'   → boolean (adds/removes offset.plusWorkdays;
//                     defaults to 1 when enabled with no prior value)
//   'plusValue'     → number (clamped >= 0; deletes plusWorkdays at 0)
function setChainItemField(chainId, itemIndex, field, value) {
  const chain = (state.data && state.data.escalationChains || []).find(c => c.id === chainId);
  if (!chain || !Array.isArray(chain.items) || !chain.items[itemIndex]) return;
  const item = chain.items[itemIndex];
  if (!item.offset || typeof item.offset !== 'object') item.offset = {};
  switch (field) {
    case 'title':
      item.title = String(value == null ? '' : value);
      break;
    case 'primaryUnit': {
      // Preserve current magnitude across the unit switch.
      const cur = (typeof item.offset.workdays === 'number') ? item.offset.workdays
                : (typeof item.offset.days     === 'number') ? item.offset.days
                : 0;
      delete item.offset.days;
      delete item.offset.workdays;
      if (value === 'workdays') item.offset.workdays = cur;
      else item.offset.days = cur;
      break;
    }
    case 'primaryValue': {
      const v = Math.max(0, Number(value) || 0);
      const isWorkdays = (typeof item.offset.workdays === 'number');
      delete item.offset.days;
      delete item.offset.workdays;
      if (isWorkdays) item.offset.workdays = v;
      else item.offset.days = v;
      break;
    }
    case 'plusEnabled':
      if (value) {
        if (typeof item.offset.plusWorkdays !== 'number' || item.offset.plusWorkdays <= 0) {
          item.offset.plusWorkdays = 1;
        }
      } else {
        delete item.offset.plusWorkdays;
      }
      break;
    case 'plusValue': {
      const v = Math.max(0, Number(value) || 0);
      if (v > 0) item.offset.plusWorkdays = v;
      else delete item.offset.plusWorkdays;
      break;
    }
  }
  saveData();
}

// How many todos across the workspace point at this chainId? Used by the
// Settings delete-chain confirmation so the user knows whether deleting
// will leave orphan todos in the main list.
function countTodosUsingChain(chainId) {
  if (!state.data || !state.data.projects) return 0;
  let n = 0;
  for (const proj of Object.values(state.data.projects)) {
    if (!Array.isArray(proj.todos)) continue;
    for (const t of proj.todos) {
      if (t && t.chainId === chainId) n++;
    }
  }
  return n;
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

var SIDEBAR_COMPACT_THRESHOLD = 110;
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

