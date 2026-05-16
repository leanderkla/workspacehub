'use strict';

// ===== TAGS VIEW (workspace-wide, cross-type) =====
// Renderer for the dedicated Tags view in the sidebar plus the click-handler
// helpers (tagMatchRowHTML, navigateToTagMatch). Lives here rather than in
// src/02-helpers.js because it is view code, not a utility.
// Workspace Tags view: cloud of every tag at the top, list of matching
// entities (across types and projects) when a filter is active. Click a
// chip → set state.tagFilter and re-render. Click a match → navigate to
// the entity's native surface, switching project if necessary.
function renderTagsView() {
  const counts = getTagCounts();
  const active = state.tagFilter;
  const matches = active ? getEntitiesByTag(active) : [];

  const cloudHTML = counts.length === 0
    ? '<div class="empty-state" style="padding:40px 20px;text-align:center">No tags yet — add some to your todos, notes, commitments, etc.</div>'
    : counts.map(({ label, count }) => {
        const isActive = active && active.toLowerCase() === label.toLowerCase();
        return `<button class="tag-chip ${isActive ? 'tag-chip-active' : ''}" data-tag-pick="${escapeHTML(label)}" type="button">
          #${escapeHTML(label)}<span class="tag-chip-count">${count}</span>
        </button>`;
      }).join('');

  const matchesHTML = !active
    ? '<div class="tags-hint">Pick a tag above to see everything tagged with it.</div>'
    : matches.length === 0
      ? `<div class="empty-state" style="padding:40px 20px;text-align:center">Nothing tagged <strong>#${escapeHTML(active)}</strong>.</div>`
      : matches.map(m => tagMatchRowHTML(m)).join('');

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-tags">
      <div class="view-header">
        <div class="view-header-row">
          <div class="view-title">Tags${active ? ` <span class="tag-active-name">#${escapeHTML(active)}</span>` : ''}</div>
          ${active ? `<button class="btn btn-ghost btn-sm" id="tags-clear-filter">✕ Clear filter</button>` : ''}
        </div>
        <div class="view-subtitle" style="font-size:12px;color:var(--text-muted);margin-top:2px">
          ${counts.length} tag${counts.length === 1 ? '' : 's'} across the workspace${active ? ` · ${matches.length} match${matches.length === 1 ? '' : 'es'}` : ''}
        </div>
      </div>
      <div class="view-body-scrollable" style="padding:16px 24px 32px">
        <div class="tags-cloud">${cloudHTML}</div>
        <div class="tags-matches">${matchesHTML}</div>
      </div>
    </div>`;

  document.getElementById('tags-clear-filter')?.addEventListener('click', () => {
    state.tagFilter = null;
    renderApp();
  });
  document.querySelectorAll('[data-tag-pick]').forEach(btn =>
    btn.addEventListener('click', () => {
      const next = btn.dataset.tagPick;
      // No-op when the clicked chip is already the active filter — avoids
      // a redundant renderApp / DOM thrash that was causing a tiny
      // sidebar layout shift on repeat clicks.
      if (state.tagFilter === next) return;
      state.tagFilter = next;
      renderApp();
    }));
}

function tagMatchRowHTML(m) {
  const icon = ({ todo: '✓', note: '◆', reminder: '🔔', commitment: '🤝', delegation: '→', dump: '🧠' })[m.kind] || '·';
  const title = bmEntityTitle(m.kind, m.item) || (m.kind === 'dump' ? noteContentText(m.item.text || '').slice(0, 80) : '') || '(untitled)';
  return `<button class="tag-match-row" type="button" data-tag-match-kind="${m.kind}" data-tag-match-id="${escapeHTML(m.item.id)}" data-tag-match-project="${escapeHTML(m.project.key)}">
    <span class="tag-match-icon">${icon}</span>
    <span class="tag-match-title">${escapeHTML(title)}</span>
    <span class="tag-match-project" style="background:${m.project.color}22;color:${m.project.color};border-color:${m.project.color}55">${escapeHTML(m.project.name)}</span>
  </button>`;
}

function navigateToTagMatch(kind, id, projKey) {
  if (projKey && projKey !== state.project) switchProject(projKey);
  if      (kind === 'todo')       { showView('todos');       bmHighlightTargetItem('todo', id); }
  else if (kind === 'note')       { state.editingNote        = id; showView('notes'); }
  else if (kind === 'reminder')   { showView('reminders');   bmHighlightTargetItem('reminder', id); }
  else if (kind === 'commitment') { state.expandedCommitment = id; showView('commitments'); bmHighlightTargetItem('commitment', id); }
  else if (kind === 'delegation') { state.expandedDelegation = id; showView('delegations'); bmHighlightTargetItem('delegation', id); }
  else if (kind === 'dump')       { showView('dumpzone'); }
}

// Global click delegate for tag interactions. Entity-card tag chips
// (.tag-chip[data-entity-tag]) navigate to the Tags view with that
// filter applied. Tag-match rows (.tag-match-row) navigate to the
// matched entity's native surface. Lives at document level so it
// survives every re-render without per-view wiring.
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const chip = e.target.closest('.tag-chip[data-entity-tag]');
    if (chip) {
      e.stopPropagation();
      state.tagFilter = chip.dataset.entityTag;
      showView('tags');
      return;
    }
    const matchRow = e.target.closest('.tag-match-row');
    if (matchRow) {
      e.stopPropagation();
      navigateToTagMatch(matchRow.dataset.tagMatchKind, matchRow.dataset.tagMatchId, matchRow.dataset.tagMatchProject);
    }
  });
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
  applySidebarCollapsedFromStorage();
  applyZoomFromStorage();
  if (isDeveloperMode() && isAskForBackups()) startBackupPromptTimer();
  document.body.setAttribute('data-project', state.project);
  // Bootstrap user-saved glass variants — registers them in THEMES (so the
  // picker grid shows them) and emits the runtime <style> block (so the
  // colour overrides bind once a custom theme is selected). MUST run
  // before applyCurrentTheme so a project pinned to a custom theme finds
  // it on first paint.
  loadCustomGlassThemesIntoMain();
  applyCurrentTheme();
  // Overview is the only landing now. Pull / Today / Universe live in the
  // sidebar's Lab section and are reached on demand. Within-session
  // navigation persists via JS state; a full reload (Ctrl+R) returns here.
  try {
    if (state.project) {
      state.view = 'overview';
      // Seed the back/forward stack with the landing view so Alt+← can walk
      // here from later destinations without falling off the start.
      __viewHistory.push({ project: state.project, view: 'overview' });
      __viewHistoryIdx = 0;
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
      { keys: ['Ctrl', 'P'],          desc: 'Open palette (project / quick switcher)' },
      { keys: ['Ctrl', 'Shift', 'F'], desc: 'Open palette (full-text search alias)' },
      { keys: ['Ctrl', 'Shift', 'T'], desc: 'Quick capture todo' },
      { keys: ['Ctrl', 'Shift', 'N'], desc: 'New note' },
      { keys: ['Ctrl', ','],          desc: 'Open settings' },
      { keys: ['Ctrl', 'B'],          desc: 'Collapse / expand sidebar' },
      { keys: ['Ctrl', 'Shift', 'P'], desc: 'Toggle pinned mode' },
      { keys: ['Ctrl', 'Z'],          desc: 'Undo last change' },
      { keys: ['Ctrl', 'Y'],          desc: 'Redo' },
      { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo (alternative)' },
      { keys: ['Ctrl', 'R'],          desc: 'Refresh app' },
      { keys: ['Ctrl', '+'],          desc: 'Zoom in' },
      { keys: ['Ctrl', '-'],          desc: 'Zoom out' },
      { keys: ['Ctrl', '0'],          desc: 'Reset zoom' },
      { keys: ['F11'],                desc: 'Toggle fullscreen' },
      { keys: ['?'],                  desc: 'Open this cheatsheet' },
      { keys: ['Esc'],                desc: 'Close any modal / palette / menu · also dismisses lingering toasts' }
    ]
  },
  {
    group: 'Navigation',
    items: [
      { keys: ['Alt', '0'],           desc: 'Jump to Overview' },
      { keys: ['Alt', '1', '…', '9'], desc: 'Jump to the 1st…9th visible sidebar item' },
      { keys: ['Alt', '←'],           desc: 'Go back (in-session view history)' },
      { keys: ['Alt', '→'],           desc: 'Go forward' },
      { keys: ['Ctrl', 'Tab'],        desc: 'Cycle to next workspace view' },
      { keys: ['Ctrl', 'Shift', 'Tab'], desc: 'Cycle to previous workspace view' },
      { keys: ['g', 'o'],             desc: 'Go to Overview' },
      { keys: ['g', 'i'],             desc: 'Go to Dump Zone (inbox)' },
      { keys: ['g', 'd'],             desc: 'Go to Dashboard' },
      { keys: ['g', 'n'],             desc: 'Go to Notes' },
      { keys: ['g', 't'],             desc: 'Go to Todos' },
      { keys: ['g', 'c'],             desc: 'Go to Commitments' },
      { keys: ['g', 'g'],             desc: 'Go to Delegations' },
      { keys: ['g', 's'],             desc: 'Go to Spark Map' },
      { keys: ['g', 'r'],             desc: 'Go to Reminders' },
      { keys: ['g', 'f'],             desc: 'Go to Flows' },
      { keys: ['g', 'b'],             desc: 'Go to Subprojects' },
      { keys: ['g', 'h'],             desc: 'Go to Tags' }
    ]
  },
  {
    group: 'Lists (Notes, Todos, Commitments, Delegations, Reminders, Flows, Tags)',
    items: [
      { keys: ['↑', '↓'],            desc: 'Move row selection (also j / k)' },
      { keys: ['Home', 'End'],        desc: 'Jump to first / last row' },
      { keys: ['Enter'],              desc: 'Open the selected row' },
      { keys: ['/'],                  desc: 'Focus the view’s search box' },
      { keys: ['D'],                  desc: 'Mark selected row done (where supported)' },
      { keys: ['S'],                  desc: 'Snooze selected todo' },
      { keys: ['E'],                  desc: 'Edit selected row' },
      { keys: ['Del'],                desc: 'Delete / archive selected row' }
    ]
  },
  {
    group: 'Multi-select (Todos & Notes lists)',
    items: [
      { keys: ['Click ☑'],            desc: 'Toggle that one row in the bulk selection · sets the anchor' },
      { keys: ['Shift', 'Click ☑'],   desc: 'Select the range from the anchor to the clicked row (additive)' },
      { keys: ['Ctrl', 'Click ☑'],    desc: 'Toggle (alias for plain click — File-Explorer parity)' }
    ]
  },
  {
    group: 'Forms',
    items: [
      { keys: ['Ctrl', 'Enter'],      desc: 'Submit primary action in modals & multi-line forms' }
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
    // Mention chips inside note bodies (and now todo/reminder/commitment/
    // delegation cards via §3.1's render-time decoration, plus smart-link
    // mentions from §3.3). Routes to the entity's native surface and, for
    // list-view types where the entity is a row in a long list, scrolls
    // it into view + applies the brief highlight pulse from §3.1.
    const a = e.target.closest && e.target.closest('a.mention');
    if (a) {
      e.preventDefault();
      e.stopPropagation();
      const type = a.dataset.mentionType;
      const projKey = a.dataset.mentionProject;
      const refId = a.dataset.mentionRef;
      if (!type || !projKey || !refId) return;
      if (projKey !== state.project) switchProject(projKey);
      if      (type === 'todo')       { showView('todos');       bmHighlightTargetItem('todo', refId); }
      else if (type === 'note')       { state.editingNote        = refId; showView('notes'); }
      else if (type === 'flow')       { state.flowEditing        = refId; showView('flows'); }
      else if (type === 'subproject') { state.activeSubproject   = refId; showView('subprojects'); }
      else if (type === 'reminder')   { showView('reminders');   bmHighlightTargetItem('reminder', refId); }
      else if (type === 'commitment') { state.expandedCommitment = refId; showView('commitments'); bmHighlightTargetItem('commitment', refId); }
      else if (type === 'delegation') { state.expandedDelegation = refId; showView('delegations'); bmHighlightTargetItem('delegation', refId); }
      else if (type === 'project')    { showView('dashboard'); }
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

const PALETTE_DEFAULT_PLACEHOLDER = "Search or capture — e.g. 'call Lukas tomorrow @eh'";
function openPalette() {
  setupPalette();
  paletteState.open = true;
  paletteState.query = '';
  paletteState.activeIdx = 0;
  const host = document.getElementById('palette');
  const input = document.getElementById('palette-input');
  input.value = '';
  // Quick-capture flows mutate the placeholder; restore it so the next
  // ordinary Ctrl+K open shows the regular hint.
  input.placeholder = PALETTE_DEFAULT_PLACEHOLDER;
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
  // #tag mode: queries starting with `#` filter by tag rather than text.
  // The prefix after `#` is matched against each entity's tags via
  // startsWith — typing `#q` shows everything tagged q*, `#q4` narrows.
  if (q.startsWith('#')) return _searchByTag(q.slice(1));
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
  // Escalation chains — workspace-wide, not per-project. Activating a chain
  // result spawns it into the currently active project. Query "spawn"
  // matches because of the subtitle text; the chain name itself also
  // matches via standard substring search.
  const chainsList = (state.data && Array.isArray(state.data.escalationChains)) ? state.data.escalationChains : [];
  chainsList.forEach(chain => {
    const name = (chain.name || '').toLowerCase();
    const itemCount = (chain.items || []).length;
    const subtitle = `Spawn chain · ${itemCount} item${itemCount === 1 ? '' : 's'}`;
    if (name.includes(q) || subtitle.toLowerCase().includes(q)) {
      out.push({
        type: 'spawn-chain',
        icon: '↻',
        title: chain.name,
        subtitle,
        chainId: chain.id
      });
    }
  });
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

// Tag-mode palette search. Empty prefix lists every taggable entity that
// has any tag; non-empty prefix matches tags by startsWith. Exact matches
// rank above prefix-only matches; ties break alphabetically.
function _searchByTag(prefix) {
  const out = [];
  const types = [
    { coll: 'todos',       kind: 'todo',       icon: '✅', titleKey: 'title' },
    { coll: 'notes',       kind: 'note',       icon: '📝', titleKey: 'title' },
    { coll: 'commitments', kind: 'commitment', icon: '🤝', titleKey: 'description' },
    { coll: 'delegations', kind: 'delegation', icon: '📤', titleKey: 'task' },
    { coll: 'reminders',   kind: 'reminder',   icon: '🔔', titleKey: 'title' }
  ];
  for (const [key, proj] of Object.entries(state.data.projects || {})) {
    if (proj.archived) continue;
    const meta = { project: key, projectName: proj.name, projectColor: proj.color || '#16a34a', projectIcon: proj.iconRelPath || null };
    for (const { coll, kind, icon, titleKey } of types) {
      (proj[coll] || []).forEach(item => {
        if (item.archived) return;
        const tags = item.tags || [];
        if (!tags.length) return;
        const matched = prefix
          ? tags.find(t => String(t).toLowerCase().startsWith(prefix))
          : tags[0];
        if (!matched) return;
        const exactMatch = prefix && String(matched).toLowerCase() === prefix;
        out.push({
          ...meta,
          type: kind,
          icon,
          title: item[titleKey] || '(untitled)',
          id: item.id,
          subtitle: `Tag: #${matched}`,
          metaRight: '',
          _tagRank: exactMatch ? 0 : 1,
          _matchedTag: matched
        });
      });
    }
  }
  out.sort((a, b) => a._tagRank - b._tagRank || (a.title || '').localeCompare(b.title || ''));
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
  const out = { title: text, dueDate: null, startDate: null, priority: null, subprojectId: null, recurrence: null, kind: null, tokens: [] };
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
  // /milestone: type switch — the entry will be created as a Milestone, not a Todo.
  // Date comes from /due (or the form's due-date field); see addTodo branch.
  text = text.replace(/\/milestone\b/gi, () => {
    out.kind = 'milestone';
    out.tokens.push({ type: 'kind', label: 'milestone' });
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
  '/milestone',
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
  if (r.type === 'spawn-chain') {
    // Spawn into the active project; close palette; surface the result by
    // jumping to the Todos view so the user sees the new items.
    spawnChain(r.chainId);
    closePalette();
    if (state.view === 'todos') renderTodos(); else { showView('todos'); }
    return;
  }
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
    tags: [],
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
  window.addEventListener('keydown', globalKeyHandler);
}

// ===== GLOBAL KEYBOARD =====
// All app-wide shortcuts route through globalKeyHandler. View-scoped handlers
// (sticky, brainmap, palette) bind earlier with capture and stopPropagation,
// so the global handler only sees keys they didn't consume. The text-input
// guard mirrors what the original Ctrl+Z handler did — power-user keys must
// never steal characters from the user's typing.

function isTextInputTarget(tgt) {
  if (!tgt) return false;
  const tag = tgt.tagName;
  return tgt.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

let __gChordActive = false;
let __gChordTimer = null;
function armGChord() {
  __gChordActive = true;
  clearTimeout(__gChordTimer);
  __gChordTimer = setTimeout(() => { __gChordActive = false; }, 1500);
  // Subtle hint so the user knows we're listening for the second key.
  showToast('g — pick a destination (o overview · i inbox · d dashboard · n notes · t todos · c commitments · g delegations · s spark · r reminders · f flows · b subprojects · #/h tags)', 'info');
}
function disarmGChord() {
  __gChordActive = false;
  clearTimeout(__gChordTimer);
}

// Maps the second key of a `g X` chord to a view name. `g g` doubles up on
// delegations because `d` is already dashboard. `h` is a hash-friendlier
// stand-in for the Tags view since `#` requires Shift on most layouts.
const G_CHORD_MAP = {
  'o': 'overview',
  'i': 'dumpzone',
  'd': 'dashboard',
  'n': 'notes',
  't': 'todos',
  'c': 'commitments',
  'g': 'delegations',
  's': 'brainmap',
  'r': 'reminders',
  'f': 'flows',
  'b': 'subprojects',
  'h': 'tags'
};

function globalKeyHandler(e) {
  // Only sticky owns *all* plain keys — its bullseye keymap reuses single
  // letters (D / N / S / G) that would clash with our chord layer. Brainmap
  // and Molecular each consume the specific keys they care about (Tab /
  // Enter / arrows / etc.) via stopPropagation in their own handlers, so
  // unrelated plain keys like `g` or `/` can still fall through to here.
  const viewOwnsPlainKeys = state.stickyMode;

  const ctrl = e.ctrlKey || e.metaKey;
  const tgt = e.target;
  const inText = isTextInputTarget(tgt);

  // ---- F11 fullscreen (works regardless of focus) ----
  if (e.key === 'F11' && !ctrl && !e.altKey && !e.shiftKey) {
    e.preventDefault();
    if (window.api && typeof window.api.winToggleFullscreen === 'function') {
      try { window.api.winToggleFullscreen(); } catch (err) { showToast('Fullscreen failed: ' + err.message, 'error'); }
    } else {
      // The IPC handler ships in main.js + preload.js. Both are loaded once
      // at app start, so a hot-edit of those files needs a restart before
      // F11 can wire up. The user sees a clear toast instead of silent
      // nothing.
      showToast('F11 wiring needs an app restart (main process / preload changed).', 'info');
    }
    return;
  }

  // ---- Ctrl + ... ----
  if (ctrl && !e.altKey) {
    const k = (e.key || '').toLowerCase();

    if (k === 'r' && !e.shiftKey) { e.preventDefault(); refreshApp(); return; }
    if (k === 'k' && !e.shiftKey) {
      e.preventDefault();
      if (paletteState.open) closePalette(); else openPalette();
      return;
    }
    if (e.key === ',' && !e.shiftKey) { e.preventDefault(); openSettings(); return; }
    // Ctrl+B doubles as the browser's native "bold" inside contenteditable /
    // <input> / <textarea>; let it pass through there so the note editor's
    // formatting still works. Outside inputs it collapses the sidebar.
    if (k === 'b' && !e.shiftKey) {
      if (inText) return;
      e.preventDefault(); toggleSidebarCollapsed(); return;
    }
    if (k === 'p' && e.shiftKey)  { e.preventDefault(); toggleStickyMode(); return; }
    if (k === 'p' && !e.shiftKey) { e.preventDefault(); openPalette(); return; }
    if (k === 'f' && e.shiftKey)  { e.preventDefault(); openPalette(); return; }
    if (k === 't' && e.shiftKey)  { e.preventDefault(); quickCaptureTodo(); return; }
    if (k === 'n' && e.shiftKey)  { e.preventDefault(); quickCaptureNote(); return; }
    if (e.key === 'Tab')          { e.preventDefault(); cycleView(e.shiftKey ? -1 : 1); return; }
    // Ctrl+= / Ctrl++ zoom in. Ctrl+- zoom out. Ctrl+0 reset.
    if (k === '=' || k === '+')   { e.preventDefault(); adjustZoom(0.1); return; }
    if (k === '-')                { e.preventDefault(); adjustZoom(-0.1); return; }
    if (k === '0' && !e.shiftKey) { e.preventDefault(); resetZoom(); return; }
    // Ctrl+Enter — submit the focused form's primary button (commitments,
    // delegations, dump-zone, etc. all use multi-line inputs where a bare
    // Enter inserts a newline).
    if (e.key === 'Enter' && inText) {
      if (trySubmitPrimaryForTarget(tgt)) { e.preventDefault(); return; }
    }
    // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z (existing behaviour, kept verbatim).
    if (k === 'z' || k === 'y') {
      if (inText) return;
      e.preventDefault();
      if (k === 'y' || (k === 'z' && e.shiftKey)) redo(); else undo();
      return;
    }
  }

  // ---- Alt + ... ----
  if (e.altKey && !ctrl) {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); navigateBack(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); navigateForward(); return; }
    if (/^[0-9]$/.test(e.key))  { e.preventDefault(); jumpToNavIndex(parseInt(e.key, 10)); return; }
  }

  // ---- ? cheatsheet (kept) ----
  if (e.key === '?' && !ctrl && !e.altKey) {
    if (inText) return;
    if (paletteState.open) return;
    e.preventDefault();
    openShortcutsCheatsheet();
    return;
  }

  // ---- Plain-key shortcuts (only when not typing into an input) ----
  if (inText || ctrl || e.altKey || e.metaKey) return;
  // Brainmap / molecular reuse plain keys (arrows, Tab, Space, etc.) — bail
  // before touching them, but keep Ctrl+ / Alt+ shortcuts above this gate
  // so Alt+1..9 / Ctrl+B etc. still work to leave those views.
  if (viewOwnsPlainKeys) return;

  // g-chord — second key resolves to a view jump.
  if (__gChordActive) {
    const target = G_CHORD_MAP[(e.key || '').toLowerCase()];
    disarmGChord();
    if (target) { e.preventDefault(); showView(target); }
    return;
  }
  if (e.key === 'g') {
    e.preventDefault();
    armGChord();
    return;
  }

  // / focuses the current view's search input.
  if (e.key === '/') {
    const sb = document.querySelector('.view.active .search-input, .view.active input[type="search"]');
    if (sb) {
      e.preventDefault();
      sb.focus();
      try { sb.select(); } catch {}
      return;
    }
  }

  // Esc dismisses lingering toasts when nothing else is consuming Escape.
  if (e.key === 'Escape') {
    const overlay = document.getElementById('modal-overlay');
    const overlayOpen = overlay && !overlay.classList.contains('hidden');
    if (!overlayOpen && !paletteState.open) {
      const tc = document.getElementById('toast-container');
      if (tc && tc.children.length) {
        tc.querySelectorAll('.toast').forEach(t => t.remove());
        e.preventDefault();
        return;
      }
    }
  }

  // List keynav — last so explicit shortcuts win. Suppressed while the
  // palette is open since arrows there steer palette results, not the
  // (covered) underlying list.
  if (paletteState.open) return;
  if (handleKeynav(e)) return;
}

// ===== JUMPS / VIEW CYCLING =====
function jumpToNavIndex(digit) {
  // Alt+0 → Overview (cross-project landing). Alt+1..9 → that index in the
  // visible workspace nav. Lab items are excluded — they're explicitly tucked
  // away and not part of muscle-memory positions.
  if (digit === 0) { showView('overview'); return; }
  const items = (typeof getOrderedNavItems === 'function')
    ? getOrderedNavItems().filter(n => n.visible)
    : [];
  const item = items[digit - 1];
  if (item) showView(item.id);
}

function cycleView(delta) {
  const items = (typeof getOrderedNavItems === 'function')
    ? getOrderedNavItems().filter(n => n.visible)
    : [];
  if (!items.length) return;
  let idx = items.findIndex(n => n.id === state.view);
  if (idx < 0) idx = 0;
  const next = (idx + delta + items.length) % items.length;
  showView(items[next].id);
}

// ===== SIDEBAR COLLAPSE =====
function toggleSidebarCollapsed() {
  const collapsed = document.body.classList.toggle('sidebar-collapsed');
  try { localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0'); } catch {}
}
function applySidebarCollapsedFromStorage() {
  try {
    if (localStorage.getItem('sidebarCollapsed') === '1') {
      document.body.classList.add('sidebar-collapsed');
    }
  } catch {}
}

// ===== ZOOM =====
// Backed by Electron's webFrame so the whole viewport scales (otherwise
// document.body.style.zoom leaves a dark band below when zooming out).
// Levels mirror Chromium's convention: 0 = 100 %, ±1 ≈ ±20 %, capped at the
// usual ±5 to keep things sane.
const ZOOM_MIN = -5;
const ZOOM_MAX = 5;
function _zoomPercent(level) {
  return Math.round(Math.pow(1.2, level) * 100);
}
function adjustZoom(deltaSteps) {
  // Older preload bundles (before this build) won't have zoomSet — fall back
  // to the renderer-only path so the shortcut still does *something* until
  // the user restarts.
  if (!window.api || typeof window.api.zoomSet !== 'function') {
    const cur = parseFloat(document.body.style.zoom || '1') || 1;
    const next = Math.max(0.5, Math.min(2, Math.round((cur + deltaSteps) * 10) / 10));
    document.body.style.zoom = String(next);
    try { localStorage.setItem('appZoom', String(next)); } catch {}
    showToast(`Zoom: ${Math.round(next * 100)}%  (restart for proper zoom)`, 'info');
    return;
  }
  const dir = deltaSteps > 0 ? 1 : -1;
  const cur = window.api.zoomGet();
  const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cur + dir));
  window.api.zoomSet(next);
  try { localStorage.setItem('appZoomLevel', String(next)); } catch {}
  showToast(`Zoom: ${_zoomPercent(next)}%`, 'info');
}
function resetZoom() {
  if (window.api && typeof window.api.zoomSet === 'function') {
    window.api.zoomSet(0);
  }
  document.body.style.zoom = '';
  try {
    localStorage.removeItem('appZoom');
    localStorage.removeItem('appZoomLevel');
  } catch {}
  showToast('Zoom: 100%', 'info');
}
function applyZoomFromStorage() {
  try {
    const lvl = parseInt(localStorage.getItem('appZoomLevel'), 10);
    if (Number.isFinite(lvl) && window.api && typeof window.api.zoomSet === 'function') {
      window.api.zoomSet(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, lvl)));
      return;
    }
    // Legacy fallback — value persisted under the old document.body.style.zoom
    // scheme. Honour it once so users don't lose their setting on upgrade.
    const z = parseFloat(localStorage.getItem('appZoom'));
    if (Number.isFinite(z) && z >= 0.5 && z <= 2) document.body.style.zoom = String(z);
  } catch {}
}

// ===== QUICK CAPTURE =====
// Both reuse the palette so all routing/parse rules stay in one place. The
// only difference is the seed text: `+ ` flips the palette into capture mode
// (parseQuickCapture treats the `+` prefix as "definitely capture") and the
// note variant deep-links to the new-note editor instead.
function quickCaptureTodo() {
  openPalette();
  setTimeout(() => {
    const input = document.getElementById('palette-input');
    if (!input) return;
    input.value = '';
    paletteState.query = '';
    input.focus();
    // Force capture-mode framing in the placeholder so the user knows what
    // Enter will do without typing anything yet.
    input.placeholder = 'New todo — e.g. "call Lukas tomorrow @eh"';
  }, 0);
}
function quickCaptureNote() {
  state.editingNote = 'new';
  showView('notes');
}

// ===== Ctrl+Enter SUBMIT =====
// Best-effort: walk up to a bounding container and click its primary button.
// Honours an explicit [data-primary-submit] override before falling back to
// the first .btn-primary or [type=submit] in scope.
function trySubmitPrimaryForTarget(tgt) {
  const scope = tgt.closest('.modal, form, .palette-box, .com-card, .del-card, .reminder-form, .flow-edit-card, .dump-input-wrap, .notes-editor-panel');
  if (!scope) return false;
  const btn = scope.querySelector('[data-primary-submit], .btn-primary, button[type="submit"]');
  if (btn && !btn.disabled) { btn.click(); return true; }
  return false;
}

// ===== LIST KEYNAV =====
// Generic selection layer for views with row-style lists. View renderers
// don't need to know about it — we just look up the rows by class. The
// selected row gets a CSS hook (.keynav-selected) and we synthesize clicks
// for activation, so each view's existing click handlers do the real work.

// Class patterns used by the renderers, in priority order. The first match
// wins for a given view.
const KEYNAV_VIEWS = {
  notes:       { selector: '.note-list-item',  idAttr: 'data-id',          kind: 'note' },
  todos:       { selector: '.todo-card',       idAttr: 'data-todo-id',     kind: 'todo' },
  commitments: { selector: '.com-card',        idAttr: 'data-com-id',      kind: 'commitment' },
  delegations: { selector: '.del-card',        idAttr: 'data-del-id',      kind: 'delegation' },
  reminders:   { selector: '.reminder-item',   idAttr: 'data-reminder-id', kind: 'reminder' },
  flows:       { selector: '.flow-card',       idAttr: 'data-flow-id',     kind: 'flow' },
  tags:        { selector: '.tag-match-row',   idAttr: 'data-tag-match-id', kind: 'tag-match' }
};

let keynavIdx = -1;
function resetKeynavSelection() {
  keynavIdx = -1;
  document.querySelectorAll('.keynav-selected').forEach(el => el.classList.remove('keynav-selected'));
}

function getKeynavRows() {
  const cfg = KEYNAV_VIEWS[state.view];
  if (!cfg) return { cfg: null, rows: [] };
  // Scope to the active view so we don't accidentally hit duplicate row
  // classes rendered elsewhere on the page.
  const root = document.querySelector('.view.active') || document;
  const rows = Array.from(root.querySelectorAll(cfg.selector));
  return { cfg, rows };
}

function paintKeynavSelection(rows) {
  rows.forEach((r, i) => r.classList.toggle('keynav-selected', i === keynavIdx));
  const sel = rows[keynavIdx];
  if (sel && typeof sel.scrollIntoView === 'function') {
    sel.scrollIntoView({ block: 'nearest', behavior: 'instant' in window ? 'instant' : 'auto' });
  }
}

function moveKeynav(delta) {
  const { rows } = getKeynavRows();
  if (!rows.length) return false;
  if (keynavIdx < 0) keynavIdx = delta > 0 ? 0 : rows.length - 1;
  else keynavIdx = Math.max(0, Math.min(rows.length - 1, keynavIdx + delta));
  paintKeynavSelection(rows);
  return true;
}

function setKeynavEdge(end) {
  const { rows } = getKeynavRows();
  if (!rows.length) return false;
  keynavIdx = end === 'first' ? 0 : rows.length - 1;
  paintKeynavSelection(rows);
  return true;
}

// Try to fire an item-level action by hunting for a button with a known
// data-attr inside the selected row. Returns true if an action fired.
function fireRowAction(row, kind, action) {
  // For todos we try the existing action buttons first ("✓ Done", snooze).
  // Falls back to clicking the row itself for activation.
  const SELECTORS = {
    todo: {
      done:   '[data-action="toggle-done"], .todo-checkbox, [data-today-action="done"]',
      snooze: '[data-today-action="snooze"], [data-action="snooze-1"]',
      edit:   '.todo-title, .todo-edit-btn',
      del:    '[data-action="archive"], [data-action="delete"], .todo-delete-btn'
    },
    commitment: {
      done: '[data-com-action="close"], .com-mark-done',
      del:  '[data-com-action="delete"]',
      edit: '.com-title, .com-edit-btn'
    },
    delegation: {
      done: '[data-del-action="done"]',
      del:  '[data-del-action="delete"]',
      edit: '.del-title'
    },
    reminder: {
      done: '[data-reminder-action="done"]',
      del:  '[data-reminder-action="delete"]'
    }
  };
  const map = SELECTORS[kind] || {};
  const sel = map[action];
  if (sel) {
    const btn = row.querySelector(sel);
    if (btn) { btn.click(); return true; }
  }
  return false;
}

function activateKeynavRow(row, kind) {
  // Notes need a click on the row itself (the renderer wires that to "open
  // editor"). Todos toggle expansion on row-click which is also the desired
  // Enter behaviour. Tag-match rows similarly. So a synthetic click is the
  // safest universal activator.
  row.click();
}

function handleKeynav(e) {
  const cfg = KEYNAV_VIEWS[state.view];
  if (!cfg) return false;
  const k = e.key;

  if (k === 'ArrowDown' || k === 'j') { if (moveKeynav(1))  { e.preventDefault(); return true; } }
  if (k === 'ArrowUp'   || k === 'k') { if (moveKeynav(-1)) { e.preventDefault(); return true; } }
  if (k === 'Home')                   { if (setKeynavEdge('first')) { e.preventDefault(); return true; } }
  if (k === 'End')                    { if (setKeynavEdge('last'))  { e.preventDefault(); return true; } }

  // Item-level actions need a current selection.
  const { rows } = getKeynavRows();
  const row = rows[keynavIdx];
  if (!row) return false;

  if (k === 'Enter')                  { e.preventDefault(); activateKeynavRow(row, cfg.kind); return true; }
  if (k === 'd' || k === 'D')         { if (fireRowAction(row, cfg.kind, 'done'))   { e.preventDefault(); return true; } }
  if (k === 's' || k === 'S')         { if (fireRowAction(row, cfg.kind, 'snooze')) { e.preventDefault(); return true; } }
  if (k === 'e' || k === 'E')         { if (fireRowAction(row, cfg.kind, 'edit'))   { e.preventDefault(); return true; } }
  if (k === 'Delete' || k === 'Backspace') {
    if (fireRowAction(row, cfg.kind, 'del')) { e.preventDefault(); return true; }
  }
  return false;
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
function renderApp() { renderSidebar(); renderContent(); ensureWorkspaceTagsDatalist(); }

// Singleton datalist mounted on body that backs every input with
// list="all-workspace-tags". Rebuilt on every renderApp so it reflects
// the current pool. Browsers only autocomplete the FIRST comma-separated
// token in a multi-tag input — acceptable for v1, full per-tag completion
// would need a custom popover (the slash/mention pattern).
function ensureWorkspaceTagsDatalist() {
  let dl = document.getElementById('all-workspace-tags');
  if (!dl) {
    dl = document.createElement('datalist');
    dl.id = 'all-workspace-tags';
    document.body.appendChild(dl);
  }
  const tags = getAllWorkspaceTags();
  dl.innerHTML = tags.map(t => `<option value="${escapeHTML(t)}"></option>`).join('');
}

function switchProject(key) {
  if (!state.data.projects[key]) return;
  if (key === state.project) return;
  if (state.view === 'brainmap') { saveBrainmap(); teardownBrainmap(); }
  if (state.view === 'molecular') { teardownMolecular(); }
  state.editingNote = null;
  state.noteSearch = '';
  state.activeSubproject = null;
  state.editingSubproject = null;
  // Bulk selections are project-scoped — drop them so the next project
  // doesn't inherit phantom IDs that no longer resolve.
  state.selectedTodos.clear();
  state.selectedNotes.clear();
  state.bulkAnchors = { todos: null, notes: null };
  state.project = key;
  document.body.setAttribute('data-project', key);
  applyCurrentTheme();
  renderApp();
  saveData();
}

// Lightweight in-session navigation history for Alt+←/→. Each entry is a
// { project, view } snapshot. We capture before mutating state.view so the
// stack reflects the *visited* sequence. Internal back/forward calls flip
// __viewHistorySkip to avoid re-pushing themselves.
const __viewHistory = [];
let __viewHistoryIdx = -1;
let __viewHistorySkip = false;
const VIEW_HISTORY_MAX = 50;

function showView(name) {
  if (state.view === 'brainmap' && name !== 'brainmap') { saveBrainmap(); teardownBrainmap(); }
  if (state.view === 'molecular' && name !== 'molecular') { teardownMolecular(); }
  if (state.view !== name) delete __scrollMemory[`${state.project}::${name}`];
  if (!__viewHistorySkip) {
    // Drop any forward entries when a fresh navigation happens — same model
    // browsers use. Avoid stacking duplicates of the same view back-to-back.
    if (__viewHistoryIdx < __viewHistory.length - 1) {
      __viewHistory.length = __viewHistoryIdx + 1;
    }
    const last = __viewHistory[__viewHistory.length - 1];
    if (!last || last.project !== state.project || last.view !== name) {
      __viewHistory.push({ project: state.project, view: name });
      if (__viewHistory.length > VIEW_HISTORY_MAX) __viewHistory.shift();
      __viewHistoryIdx = __viewHistory.length - 1;
    }
  }
  state.view = name;
  resetKeynavSelection();
  renderContent();
  renderSidebar();
}

function navigateBack() {
  if (__viewHistoryIdx <= 0) return false;
  __viewHistoryIdx--;
  const entry = __viewHistory[__viewHistoryIdx];
  __viewHistorySkip = true;
  try {
    if (entry.project !== state.project) switchProject(entry.project);
    if (state.view !== entry.view) showView(entry.view);
  } finally { __viewHistorySkip = false; }
  return true;
}

function navigateForward() {
  if (__viewHistoryIdx >= __viewHistory.length - 1) return false;
  __viewHistoryIdx++;
  const entry = __viewHistory[__viewHistoryIdx];
  __viewHistorySkip = true;
  try {
    if (entry.project !== state.project) switchProject(entry.project);
    if (state.view !== entry.view) showView(entry.view);
  } finally { __viewHistorySkip = false; }
  return true;
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
    flows:     renderFlows,
    tags:      renderTagsView
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
  { id: 'reminders',    icon: '🔔', label: 'Reminders' },
  { id: 'tags',         icon: '#',  label: 'Tags' }
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
          ${(proj.todos.some(t => t.startDate || t.dueDate) || (Array.isArray(proj.milestones) && proj.milestones.length)) ? `
          <div class="dash-section" style="grid-column:1/-1">
            <div class="dash-section-header">
              <span class="dash-section-title">Todos Timeline${state.dashGanttExtendDays ? ` <span style="font-weight:400;color:var(--text-muted);font-size:11px">(+${state.dashGanttExtendDays} days)</span>` : ''}</span>
              <div style="display:flex;gap:6px;align-items:center">
                <button class="btn btn-ghost btn-sm" id="btn-dash-add-milestone" title="Add a project-level milestone">◆ + Milestone</button>
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
  document.getElementById('btn-dash-add-milestone')?.addEventListener('click', () =>
    showMilestoneModal(null, { subprojectId: null }));
  bindAllGanttMilestones(document);
  requestAnimationFrame(scrollGanttToFocus);
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

// ===== OVERVIEW (ALL PROJECTS) =====
// "What needs you now" inbox: groups buildTodayBuckets() output by project
// and renders one segmented panel above the project grid. Tabs reuse the
// Today view's data-today-action wiring so done/+1d behave identically.

function overviewInboxGroupByProject(items) {
  // items each have { projectKey, projectName, projectColor, ... }
  const m = new Map();
  for (const it of items) {
    let g = m.get(it.projectKey);
    if (!g) {
      g = { projectKey: it.projectKey, projectName: it.projectName, projectColor: it.projectColor || '#16a34a', items: [] };
      m.set(it.projectKey, g);
    }
    g.items.push(it);
  }
  return [...m.values()];
}

function overviewInboxTodoRowHTML(item, kind) {
  const t = item.todo;
  const dueLabel = kind === 'overdue'
    ? `⚠ ${daysOverdueLabel(t.dueDate)}`
    : kind === 'today' ? 'today' : formatDate(t.dueDate);
  const metaCls = kind === 'overdue' ? 'overdue' : '';
  const prio = t.priority === 'high'
    ? '<span class="overview-inbox-prio">High</span>'
    : '';
  return `<div class="overview-inbox-row" data-today-jump-todo="${t.id}" data-today-jump-project="${item.projectKey}">
    <button class="overview-inbox-check" data-today-action="done" data-todo-id="${t.id}" data-project-key="${item.projectKey}" title="Mark done"></button>
    <span class="overview-inbox-title">${escapeHTML(t.title)}</span>
    ${prio}
    <span class="overview-inbox-meta ${metaCls}">${dueLabel}</span>
    <button class="overview-inbox-push btn btn-ghost btn-sm" data-today-action="snooze" data-todo-id="${t.id}" data-project-key="${item.projectKey}" title="Push due date by 1 day">+1d</button>
  </div>`;
}

function overviewInboxWaitingRowHTML(item) {
  if (item.commitment) {
    const c = item.commitment;
    const arrow = c.direction === 'they_owe' ? '←' : '→';
    const ageLabel = c.due_date ? (isOverdue(c.due_date) ? `⚠ ${daysOverdueLabel(c.due_date)}` : formatDate(c.due_date)) : '';
    return `<div class="overview-inbox-row overview-inbox-row--waiting" data-today-jump-commitment="${c.id}" data-today-jump-project="${item.projectKey}">
      <span class="overview-inbox-prefix">${arrow} ${escapeHTML(c.counterparty)}:</span>
      <span class="overview-inbox-title">${escapeHTML(c.description)}</span>
      <span class="overview-inbox-meta overdue">${ageLabel}</span>
    </div>`;
  }
  if (item.delegation) {
    const d = item.delegation;
    const ageLabel = d.due_date ? (isOverdue(d.due_date) ? `⚠ ${daysOverdueLabel(d.due_date)}` : formatDate(d.due_date)) : '';
    return `<div class="overview-inbox-row overview-inbox-row--waiting" data-today-jump-delegation="${d.id}" data-today-jump-project="${item.projectKey}">
      <span class="overview-inbox-prefix">→ ${escapeHTML(d.delegated_to)}:</span>
      <span class="overview-inbox-title">${escapeHTML(d.task)}</span>
      <span class="overview-inbox-meta overdue">${ageLabel}</span>
    </div>`;
  }
  return '';
}

function overviewInboxGroupHTML(group, renderRow) {
  return `<div class="overview-inbox-group">
    <div class="overview-inbox-group-head">
      <span class="overview-inbox-group-dot" style="background:${group.projectColor}"></span>
      <span class="overview-inbox-group-name">${escapeHTML(group.projectName)}</span>
      <span class="overview-inbox-group-count">· ${group.items.length}</span>
    </div>
    ${group.items.map(renderRow).join('')}
  </div>`;
}

function renderOverview() {
  const projects = state.data.projects;
  // Overview is the cross-project dashboard — archived projects are intentionally excluded.
  // The user can restore them from the sidebar to bring them back in.
  const entries = Object.entries(projects).filter(([, proj]) => !proj.archived);
  const archivedCount = Object.values(projects).filter(p => p.archived).length;

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

  const allReminders = entries.flatMap(([key, proj]) =>
    (proj.reminders || []).filter(r => !r.fired && r.datetime).map(r => ({ ...r, projectKey: key, projectName: proj.name, projectColor: proj.color }))
  ).sort((a,b) => new Date(a.datetime) - new Date(b.datetime)).slice(0, 6);

  // ── "What needs you now" inbox data ──
  // Reuse the Today view's bucket builder so semantics stay aligned across both
  // surfaces (overdue / today / due 1–7d / overdue commitments+delegations).
  // No 6-cap: the inbox shows full lists, grouped by project.
  const inboxBuckets = buildTodayBuckets();
  const inboxCounts = {
    overdue: inboxBuckets.overdueTodos.length,
    today:   inboxBuckets.todayTodos.length,
    week:    inboxBuckets.upcomingTodos.length,
    waiting: inboxBuckets.overdueCommitments.length + inboxBuckets.overdueDelegations.length
  };
  // Default tab = highest-priority non-empty tab. If user has clicked one, honour
  // it as long as the bucket isn't empty; if it became empty (e.g. they cleared
  // overdue), fall through to the next non-empty bucket.
  const tabPriority = ['overdue', 'today', 'week', 'waiting'];
  let inboxTab = state.overviewInboxTab;
  if (!inboxTab || !inboxCounts[inboxTab]) {
    inboxTab = tabPriority.find(k => inboxCounts[k] > 0) || 'overdue';
  }

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

        ${(() => {
          // ── "What needs you now" inbox ───────────────────────────────────
          // The dominant block above the project grid: one segmented panel
          // covering the four buckets that actually need action right now.
          // No 6-cap; rows are grouped by project. Default tab = highest-
          // priority non-empty bucket, sticky via state.overviewInboxTab.
          const totalUrgent = inboxCounts.overdue + inboxCounts.today + inboxCounts.week + inboxCounts.waiting;
          const allClear = totalUrgent === 0;
          const tabs = [
            { key: 'overdue', label: '⚠ Overdue', alert: true },
            { key: 'today',   label: 'Today',     alert: false },
            { key: 'week',    label: 'Due this week', alert: false },
            { key: 'waiting', label: 'Waiting on',    alert: inboxCounts.waiting > 0 }
          ];
          // Meta line under the title summarises the active tab.
          let metaLine = '';
          if (inboxTab === 'overdue' && inboxCounts.overdue > 0) {
            const oldest = inboxBuckets.overdueTodos[0]?.todo?.dueDate;
            metaLine = `${inboxCounts.overdue} overdue${oldest ? ` · oldest ${daysOverdueLabel(oldest)}` : ''}`;
          } else if (inboxTab === 'today') {
            metaLine = inboxCounts.today === 0 ? 'Nothing due today' : `${inboxCounts.today} due today`;
          } else if (inboxTab === 'week') {
            metaLine = inboxCounts.week === 0 ? 'Nothing due in the next 7 days' : `${inboxCounts.week} due in the next 7 days`;
          } else if (inboxTab === 'waiting') {
            metaLine = inboxCounts.waiting === 0 ? 'No-one overdue' : `${inboxCounts.waiting} commitment${inboxCounts.waiting===1?'':'s'} / delegation${inboxCounts.waiting===1?'':'s'} overdue`;
          }

          // Active pane content.
          let paneHTML = '';
          if (inboxTab === 'overdue') {
            paneHTML = inboxCounts.overdue
              ? overviewInboxGroupByProject(inboxBuckets.overdueTodos)
                  .map(g => overviewInboxGroupHTML(g, it => overviewInboxTodoRowHTML(it, 'overdue'))).join('')
              : `<div class="overview-inbox-empty">🎉 Nothing overdue. You're on top of things.</div>`;
          } else if (inboxTab === 'today') {
            paneHTML = inboxCounts.today
              ? overviewInboxGroupByProject(inboxBuckets.todayTodos)
                  .map(g => overviewInboxGroupHTML(g, it => overviewInboxTodoRowHTML(it, 'today'))).join('')
              : `<div class="overview-inbox-empty">Nothing scheduled for today.</div>`;
          } else if (inboxTab === 'week') {
            paneHTML = inboxCounts.week
              ? overviewInboxGroupByProject(inboxBuckets.upcomingTodos)
                  .map(g => overviewInboxGroupHTML(g, it => overviewInboxTodoRowHTML(it, 'upcoming'))).join('')
              : `<div class="overview-inbox-empty">Nothing due in the next 7 days.</div>`;
          } else if (inboxTab === 'waiting') {
            const waiting = [...inboxBuckets.overdueCommitments, ...inboxBuckets.overdueDelegations];
            paneHTML = waiting.length
              ? overviewInboxGroupByProject(waiting)
                  .map(g => overviewInboxGroupHTML(g, overviewInboxWaitingRowHTML)).join('')
              : `<div class="overview-inbox-empty">No-one's owing you anything overdue.</div>`;
          }

          return `<div class="overview-inbox ${allClear ? 'overview-inbox--clear' : ''} ${inboxCounts.overdue > 0 ? 'overview-inbox--alert' : ''}">
            <div class="overview-inbox-head">
              <span class="overview-inbox-title-main">What needs you now</span>
              <span class="overview-inbox-meta-line">${escapeHTML(metaLine)}</span>
              <div style="flex:1"></div>
              <button class="btn btn-ghost btn-sm" id="btn-overview-open-today" title="Open the focused Today view">Open Today view</button>
            </div>
            <div class="overview-inbox-tabs" role="tablist">
              ${tabs.map(tab => {
                const count = inboxCounts[tab.key];
                const active = tab.key === inboxTab;
                const hasCount = count > 0;
                return `<button class="overview-inbox-tab ${active ? 'active' : ''} ${tab.alert && hasCount ? 'danger' : ''}" data-overview-inbox-tab="${tab.key}" role="tab" aria-selected="${active}">
                  <span class="overview-inbox-tab-label">${tab.label}</span>
                  <span class="overview-inbox-tab-num">${count}</span>
                </button>`;
              }).join('')}
            </div>
            <div class="overview-inbox-body">${paneHTML}</div>
          </div>`;
        })()}

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
          ${(() => {
            // Quietly slipping — counterweight to the urgency inbox above. The
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
  // .overview-list-item is now only used for Upcoming reminders. The old check
  // button (data-overview-todo-check) was removed when the inbox replaced the
  // overdue cards, so no inner-button guard is needed here.
  document.querySelectorAll('.overview-list-item[data-jump-project]').forEach(el =>
    el.addEventListener('click', () => {
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
  // ── "What needs you now" inbox handlers ──
  // Tab switch — sticky via state so it survives re-renders triggered by
  // done/+1d actions inside the inbox.
  document.querySelectorAll('[data-overview-inbox-tab]').forEach(btn =>
    btn.addEventListener('click', () => {
      state.overviewInboxTab = btn.dataset.overviewInboxTab;
      renderOverview();
    }));
  // Done / +1d (snooze) — reuse the Today view's action handler so behaviour
  // (recurrence spawn, project switch, toast, re-render) stays identical.
  document.querySelectorAll('#view-overview [data-today-action]').forEach(btn =>
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleTodayAction(btn.dataset.todayAction, btn.dataset.projectKey, btn.dataset.todoId);
    }));
  // Row click → jump to the relevant project's view.
  document.querySelectorAll('#view-overview [data-today-jump-todo]').forEach(el =>
    el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const projKey = el.dataset.todayJumpProject;
      if (projKey && projKey !== state.project) switchProject(projKey);
      showView('todos');
    }));
  document.querySelectorAll('#view-overview [data-today-jump-commitment]').forEach(el =>
    el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const projKey = el.dataset.todayJumpProject;
      if (projKey && projKey !== state.project) switchProject(projKey);
      showView('commitments');
    }));
  document.querySelectorAll('#view-overview [data-today-jump-delegation]').forEach(el =>
    el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const projKey = el.dataset.todayJumpProject;
      if (projKey && projKey !== state.project) switchProject(projKey);
      showView('delegations');
    }));
  document.getElementById('btn-overview-open-today')?.addEventListener('click', () => showView('today'));
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
          ${notesBulkBarHTML(filtered)}
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
  // Body class lets CSS keep the bulk-select circles visible even when the
  // user moves the cursor away from a row — same trick as todos-has-selection.
  document.body.classList.toggle('notes-has-selection', state.selectedNotes && state.selectedNotes.size > 0);

  // Bulk-select checkbox: stop propagation so clicking the ☑ doesn't also
  // open the note in the editor pane. Plain click toggles, Shift+Click
  // extends from the anchor (Windows Explorer style). The mousedown
  // preventDefault suppresses the browser's native shift+click text-range
  // extension — without it the cards between the anchor and the click
  // target briefly flash as text selection before the re-render clears
  // them. Conditional on shiftKey so normal copy-paste selection in card
  // titles still works.
  document.querySelectorAll('.note-bulk-select').forEach(el => {
    el.addEventListener('mousedown', (e) => { if (e.shiftKey) e.preventDefault(); });
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      bulkSelectHandler({
        kind: 'notes',
        id: el.dataset.bulkId,
        event: e,
        scopeSelector: '.notes-list-items',
        rowSelector: '.note-bulk-select',
        idAttr: 'data-bulk-id'
      });
      renderNotes();
    });
  });
  document.querySelectorAll('.note-list-item').forEach(el =>
    el.addEventListener('click', (e) => {
      // Don't open the editor when the click landed on the select checkbox
      // (already handled above) or any other interactive child.
      if (e.target.closest('.note-bulk-select')) return;
      state.editingNote = el.dataset.id;
      renderNotes();
    }));
  document.querySelectorAll('[data-notes-bulk]').forEach(btn =>
    btn.addEventListener('click', () => handleNotesBulk(btn.dataset.notesBulk)));
  setupNoteEditorEvents();
}

// ===== NOTES BULK ACTIONS =====
function notesBulkBarHTML(visibleNotes) {
  if (!(state.selectedNotes instanceof Set)) state.selectedNotes = new Set();
  // Drop ids that are no longer in the visible set (filter / archive toggle
  // could have hidden them) — we only ever want a "selected" count that
  // matches what the user can actually see.
  const visibleIds = new Set((visibleNotes || []).map(n => n.id));
  for (const id of state.selectedNotes) {
    if (!visibleIds.has(id)) state.selectedNotes.delete(id);
  }
  const n = state.selectedNotes.size;
  if (n === 0) return '';
  const allSelected = n === visibleNotes.length;
  const archiving = !state.noteShowArchived;
  return `<div class="bulk-bar bulk-bar-notes">
    <div class="bulk-bar-count">${n} selected</div>
    <div class="bulk-bar-actions">
      <button class="btn btn-secondary btn-sm" data-notes-bulk="archive">📦 ${archiving ? 'Archive' : 'Restore'}</button>
      <button class="btn btn-secondary btn-sm" data-notes-bulk="delete" style="color:#dc2626">✕ Delete</button>
      <button class="btn btn-ghost btn-sm" data-notes-bulk="select-all">${allSelected ? 'Deselect all' : 'Select all'}</button>
      <button class="btn btn-ghost btn-sm" data-notes-bulk="clear">Clear</button>
    </div>
  </div>`;
}

function _bulkSelectedNoteObjects() {
  const proj = getProject();
  if (!proj) return [];
  return (proj.notes || []).filter(n => state.selectedNotes.has(n.id));
}

function handleNotesBulk(action) {
  const proj = getProject();
  if (!proj) return;
  const notes = _bulkSelectedNoteObjects();
  if (action === 'clear') {
    state.selectedNotes.clear();
    state.bulkAnchors.notes = null;
    renderNotes();
    return;
  }
  if (action === 'select-all') {
    // Toggle: select all visible if not already, otherwise clear.
    const visible = document.querySelectorAll('.note-bulk-select');
    const ids = Array.from(visible).map(el => el.dataset.bulkId);
    const allOn = ids.length > 0 && ids.every(id => state.selectedNotes.has(id));
    if (allOn) state.selectedNotes.clear();
    else ids.forEach(id => state.selectedNotes.add(id));
    renderNotes();
    return;
  }
  if (!notes.length) return;
  if (action === 'archive') {
    // Mirror the "showArchived → restore, else archive" semantics from todos.
    const restoring = state.noteShowArchived;
    notes.forEach(n => { n.archived = !restoring; n.updated = Date.now(); });
    saveData();
    state.selectedNotes.clear();
    state.bulkAnchors.notes = null;
    showToast(`${notes.length} note${notes.length === 1 ? '' : 's'} ${restoring ? 'restored' : 'archived'}.`, 'info');
    renderNotes();
    return;
  }
  if (action === 'delete') {
    showConfirmModal({
      title: `Delete ${notes.length} note${notes.length === 1 ? '' : 's'}?`,
      body: 'This cannot be undone from the menu, but you can <strong>Ctrl+Z</strong> to restore. Tip: archive (📦) instead if you might want them back later.',
      confirmLabel: `Delete ${notes.length}`,
      onConfirm: () => {
        const ids = new Set(notes.map(n => n.id));
        proj.notes = (proj.notes || []).filter(n => !ids.has(n.id));
        ids.forEach(id => cleanupNodeLinksOnEntityDelete(state.project, 'note', id));
        if (state.editingNote && ids.has(state.editingNote)) state.editingNote = null;
        state.selectedNotes.clear();
        state.bulkAnchors.notes = null;
        saveData();
        showToast(`${notes.length} note${notes.length === 1 ? '' : 's'} deleted.`, 'info');
        renderNotes();
      }
    });
  }
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
  // Treat as already-HTML if there are tags OR entities. A contenteditable's
  // innerHTML returns ">" as "&gt;" even when the user just typed "->" (no
  // tags), so entity-only strings are still HTML — escaping them again would
  // double-encode "-&gt;" into "-&amp;gt;" and render literally as "-&gt;".
  if (/<[a-z!\/][\s\S]*?>/i.test(content)) return content;
  if (/&(?:[a-z]+|#\d+|#x[0-9a-f]+);/i.test(content)) return content;
  return escapeHTML(content).replace(/\n/g, '<br>');
}

// Strips inline styles/classes/scripts from pasted HTML so the editor stays in
// our visual language. Used by every contenteditable (notes, dump zone, flow steps).
// Also embeds pasted image files (Snipping Tool, copy-as-image, file copies)
// inline as base64 data URLs so screenshots land in the note without a detour
// through the attachments panel.
function installRichEditorPaste(el) {
  if (!el || el.dataset.pasteHooked === '1') return;
  el.dataset.pasteHooked = '1';
  el.addEventListener('paste', (e) => {
    const cd = e.clipboardData;
    if (!cd) return;
    const imageFiles = collectClipboardImages(cd);
    if (imageFiles.length) {
      e.preventDefault();
      insertImagesIntoEditor(el, imageFiles);
      return;
    }
    const html = cd.getData('text/html');
    const text = cd.getData('text/plain') || '';
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

// Pulls image files out of a ClipboardData. Snipping Tool / Win+Shift+S put a
// bitmap in items[] with kind:'file'; copied image files from Explorer land in
// files[]. Either path produces real File objects we can read as data URLs.
function collectClipboardImages(cd) {
  const out = [];
  if (cd.items && cd.items.length) {
    for (const item of cd.items) {
      if (item.kind === 'file' && item.type && item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) out.push(f);
      }
    }
  }
  if (!out.length && cd.files && cd.files.length) {
    for (const f of cd.files) {
      if (f.type && f.type.startsWith('image/')) out.push(f);
    }
  }
  return out;
}

function insertImagesIntoEditor(el, files) {
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      el.focus();
      const safe = dataUrl.replace(/"/g, '&quot;');
      try { document.execCommand('insertHTML', false, `<img src="${safe}" class="rich-paste-img" alt="">`); } catch {}
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    reader.readAsDataURL(file);
  }
}

function noteListItemHTML(n) {
  const active = state.editingNote === n.id ? 'active' : '';
  const preview = noteContentText(n.content).split('\n')[0].slice(0, 60);
  const sp = (getProject().subprojects || []).find(s => s.id === n.subprojectId);
  const isSelected = state.selectedNotes && state.selectedNotes.has(n.id);
  return `<div class="note-list-item ${active} ${n.archived?'archived':''} ${isSelected?'bulk-selected':''}" data-id="${n.id}">
    <span class="note-bulk-select ${isSelected?'on':''}" data-bulk-id="${n.id}" title="Select for bulk actions · Shift+Click for range">${isSelected?'✓':''}</span>
    <div class="note-item-header">
      <span class="note-item-title">${escapeHTML(n.title)}</span>
      ${pinToggleButtonHTML('note', state.project, n.id, 'pin-toggle-inline')}
      <span class="note-item-date">${formatDate(n.updated)}</span>
    </div>
    <div class="note-item-preview">${escapeHTML(preview) || 'No content'}</div>
    <div class="note-item-tags">
      ${priorityBadge(n.priority)}
      ${sp ? `<span class="todo-sp-chip" style="background:${sp.color}22;color:${sp.color};border:1px solid ${sp.color}44">${escapeHTML(sp.name)}</span>` : ''}
      ${entityTagsHTML(n.tags)}
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

// Smart-link state — disjoint from mentionState. Only one popover is open
// at a time; if the mention popover is open we suppress smart-link.
// `_debug` is for the window.__smartLink surface — counters + last refresh
// outcome so we can diagnose silent install/refresh failures from devtools
// without needing to keep focus on the surface.
const smartLinkState = {
  open: false, suggestion: null, hostEl: null,
  _debug: { installs: 0, refreshes: 0, lastRefresh: null }
};
const _smartLinkInstalledFor = new WeakSet();

// Reads the current text and caret offset from an input/textarea OR a
// contenteditable's text node. Returns null if the element isn't ready
// (no caret, range across a selection, caret in a mention link, etc).
function _smartLinkReadSurface(el) {
  if (!el) return null;
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    if (start == null || start !== end) return null;
    return { text: el.value || '', caretPos: start, isInput: true, input: el };
  }
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return null;
  const node = range.startContainer;
  if (node.nodeType !== 3) return null;
  // Don't trigger inside an existing mention link
  let p = node.parentElement;
  while (p && p !== document.body) {
    if (p.tagName === 'A' && p.classList.contains('mention')) return null;
    p = p.parentElement;
  }
  // Confirm the text node lives inside the surface we're driving — skip
  // when the caret has moved out (e.g. into a sibling editor).
  if (!el.contains(node)) return null;
  return { text: node.textContent || '', caretPos: range.startOffset, isInput: false, node };
}

function _smartLinkPositionPopover(menu, anchor) {
  let rect;
  if (anchor.isInput) {
    rect = anchor.input.getBoundingClientRect();
  } else {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    rect = sel.getRangeAt(0).getBoundingClientRect();
  }
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

function _smartLinkRender(suggestion, anchor) {
  let menu = document.getElementById('smart-link-popover');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'smart-link-popover';
    menu.className = 'smart-link-popover';
    document.body.appendChild(menu);
  }
  const ent = suggestion.entity;
  const proj = ent ? state.data.projects?.[ent.projectKey] : null;
  // Resolve done-state at render time (rather than baking it into the
  // smart-link index) so suggestions reflect the current state — if the user
  // marks a todo done after the index was built, the next render shows it.
  let isDone = false;
  if (ent && proj) {
    if (ent.type === 'todo') {
      const t = (proj.todos || []).find(x => x.id === ent.refId);
      isDone = !!(t && t.done);
    } else if (ent.type === 'reminder') {
      const r = (proj.reminders || []).find(x => x.id === ent.refId);
      isDone = !!(r && (r.doneAt || r.fired));
    }
  }
  let icon = suggestion.kind === 'tag' ? '#' : '↗';
  if (isDone && ent && ent.type === 'todo')     icon = '☑';
  if (isDone && ent && ent.type === 'reminder') icon = '🔕';
  const projName = proj ? (proj.name || '') : '';
  const projColor = proj ? (proj.color || '#16a34a') : 'var(--accent)';
  let subtitle = suggestion.kind === 'tag' ? 'Tag' : (projName || 'Workspace');
  if (isDone) subtitle = `${subtitle} · Done`;
  const doneCls = isDone ? ' smart-link-row-is-done' : '';
  menu.innerHTML = `
    <div class="smart-link-row${doneCls}">
      <span class="smart-link-icon">${icon}</span>
      <div class="smart-link-main">
        <div class="smart-link-title">${escapeHTML(suggestion.full)}</div>
        <div class="smart-link-sub">${suggestion.kind === 'tag' ? '' : `<span class="smart-link-dot" style="background:${projColor}"></span>`}<span>${escapeHTML(subtitle)}</span></div>
      </div>
      <span class="smart-link-tab" title="Press Tab to accept">⇥ Tab</span>
    </div>
  `;
  _smartLinkPositionPopover(menu, anchor);
}

function _smartLinkClose() {
  smartLinkState.open = false;
  smartLinkState.suggestion = null;
  smartLinkState.hostEl = null;
  const menu = document.getElementById('smart-link-popover');
  if (menu) menu.remove();
}

// Replace the typed phrase with the suggested mention/tag at the recorded
// offsets. Mirrors insertMentionFromCompleter for the contenteditable path
// and falls back to plain `@Label` text in inputs (mention markup can't
// live inside a value).
function _smartLinkAccept(el) {
  const sug = smartLinkState.suggestion;
  if (!sug) return false;
  const isInput = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
  const insertText = sug.kind === 'tag' ? `#${sug.full} ` : `@${sug.full} `;

  if (isInput) {
    const before = el.value.slice(0, sug.startOffset);
    const after  = el.value.slice(sug.endOffset);
    el.value = before + insertText + after;
    const newPos = before.length + insertText.length;
    el.setSelectionRange(newPos, newPos);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    _smartLinkClose();
    return true;
  }

  // Contenteditable path — re-read the current selection so we land on
  // the same text node we measured (the suggestion was computed on this
  // node's textContent, so the offsets line up).
  const surface = _smartLinkReadSurface(el);
  if (!surface || surface.isInput) { _smartLinkClose(); return false; }
  const range = document.createRange();
  try {
    range.setStart(surface.node, sug.startOffset);
    range.setEnd(surface.node, sug.endOffset);
  } catch { _smartLinkClose(); return false; }
  range.deleteContents();
  if (sug.kind === 'tag') {
    range.insertNode(document.createTextNode(insertText));
  } else {
    const a = document.createElement('a');
    a.className = 'mention';
    a.setAttribute('href', '#');
    a.setAttribute('data-mention-type',    sug.entity.type);
    a.setAttribute('data-mention-project', sug.entity.projectKey);
    a.setAttribute('data-mention-ref',     sug.entity.refId);
    a.textContent = '@' + sug.full;
    range.insertNode(a);
    const space = document.createTextNode(' ');
    if (a.parentNode) a.parentNode.insertBefore(space, a.nextSibling);
    const newRange = document.createRange();
    newRange.setStartAfter(space);
    newRange.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(newRange);
  }
  // Trigger input event on the surface so dirty-tracking / autosave fire.
  let host = el;
  while (host && !host.isContentEditable) host = host.parentElement;
  if (host) host.dispatchEvent(new Event('input', { bubbles: true }));
  _smartLinkClose();
  return true;
}

function installSmartLinkCompleter(el) {
  if (!el || _smartLinkInstalledFor.has(el)) return;
  _smartLinkInstalledFor.add(el);
  smartLinkState._debug.installs++;

  const refresh = () => {
    smartLinkState._debug.refreshes++;
    const log = {
      ts: Date.now(), elTag: el.tagName, elClass: el.className || '',
      surfaceText: null, surfaceCaret: null, sug: null, bail: null
    };
    smartLinkState._debug.lastRefresh = log;
    if (mentionState.open) { _smartLinkClose(); log.bail = 'mention-open'; return; }
    const surface = _smartLinkReadSurface(el);
    if (surface) { log.surfaceText = (surface.text || '').slice(0, 60); log.surfaceCaret = surface.caretPos; }
    if (!surface) { _smartLinkClose(); log.bail = 'no-surface'; return; }
    // Pass the host element's entity (if it's a todo/commitment/etc. card)
    // so the suggester rejects "you've just clicked into your own title"
    // matches — refresh fires on focus AND click, not only typing.
    const self = _resolveSelfEntityForElement(el);
    const sug = suggestSmartLink(surface.text, surface.caretPos, self);
    log.sug = sug ? { full: sug.full, kind: sug.kind } : null;
    if (!sug) { _smartLinkClose(); log.bail = 'no-suggestion'; return; }
    smartLinkState.open = true;
    smartLinkState.suggestion = sug;
    smartLinkState.hostEl = el;
    _smartLinkRender(sug, surface);
  };

  el.addEventListener('input', refresh);
  el.addEventListener('focus', refresh);
  el.addEventListener('click', refresh);
  el.addEventListener('keyup', (e) => {
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) refresh();
  });
  el.addEventListener('blur', () => {
    setTimeout(() => {
      if (smartLinkState.hostEl === el) _smartLinkClose();
    }, 150);
  });
  el.addEventListener('keydown', (e) => {
    if (!smartLinkState.open || smartLinkState.hostEl !== el) return;
    // Tab and Enter both accept — matches the mention completer's behaviour
    // so users don't have to remember which surface they're in.
    if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') {
      e.preventDefault();
      e.stopImmediatePropagation();
      _smartLinkAccept(el);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopImmediatePropagation();
      _smartLinkClose();
    }
  }, true);  // capture so we beat per-surface handlers
}

// Workspace-wide label → entity index for plain-text mention decoration.
// Built fresh per call (sub-ms even at 1000+ entities). The keys are
// lowercased labels; sortedKeys sorts by length descending so a greedy
// match prefers "Q4 Strategy" over "Q4" when the user writes the longer
// form.
function _buildMentionLabelIndex() {
  const map = Object.create(null);
  for (const [pkey, proj] of Object.entries(state.data.projects || {})) {
    if (proj.archived) continue;
    if (proj.name) map[proj.name.toLowerCase()] = { type: 'project', projectKey: pkey, refId: pkey };
    (proj.todos || []).forEach(t => { if (!t.archived && t.title) map[t.title.toLowerCase()] = { type: 'todo', projectKey: pkey, refId: t.id }; });
    (proj.notes || []).forEach(n => { if (!n.archived && n.title) map[n.title.toLowerCase()] = { type: 'note', projectKey: pkey, refId: n.id }; });
    (proj.flows || []).forEach(f => { if (f.name) map[f.name.toLowerCase()] = { type: 'flow', projectKey: pkey, refId: f.id }; });
    (proj.subprojects || []).forEach(s => { if (s.name) map[s.name.toLowerCase()] = { type: 'subproject', projectKey: pkey, refId: s.id }; });
    (proj.reminders || []).forEach(r => { if (r.title) map[r.title.toLowerCase()] = { type: 'reminder', projectKey: pkey, refId: r.id }; });
  }
  const sortedKeys = Object.keys(map).sort((a, b) => b.length - a.length);
  return { map, sortedKeys };
}

// Render-time decoration: takes a saved plain-text string, returns HTML
// with `@Label` patterns wrapped in <a class="mention"> when `Label`
// matches a known workspace entity. Walks the string and at every `@`
// that's preceded by a word boundary tries the longest match first.
// Unknown @-tokens pass through as escaped plain text. The returned HTML
// is safe to inject as innerHTML — every literal text segment is escaped.
function decoratePlainTextMentions(str) {
  if (!str) return '';
  const { map, sortedKeys } = _buildMentionLabelIndex();
  if (!sortedKeys.length) return escapeHTML(str);
  let out = '';
  let i = 0;
  while (i < str.length) {
    if (str[i] === '@' && (i === 0 || /\s/.test(str[i - 1]))) {
      const after = str.slice(i + 1);
      const lowerAfter = after.toLowerCase();
      let matched = null;
      for (const label of sortedKeys) {
        if (lowerAfter.startsWith(label)) {
          const next = after[label.length];
          if (next === undefined || /[\s.,!?;:)]/.test(next)) {
            matched = { label: after.slice(0, label.length), entity: map[label] };
            break;
          }
        }
      }
      if (matched) {
        const e = matched.entity;
        out += `<a class="mention" href="#" data-mention-type="${e.type}" data-mention-project="${escapeHTML(e.projectKey)}" data-mention-ref="${escapeHTML(e.refId)}">@${escapeHTML(matched.label)}</a>`;
        i += 1 + matched.label.length;
        continue;
      }
    }
    const ch = str[i];
    if      (ch === '<') out += '&lt;';
    else if (ch === '>') out += '&gt;';
    else if (ch === '&') out += '&amp;';
    else if (ch === '"') out += '&quot;';
    else if (ch === "'") out += '&#39;';
    else out += ch;
    i++;
  }
  return out;
}

// ===== SMART LINK SUGGESTIONS (§3.3) =====
// As the user types in any free-text surface, suggest a workspace entity
// (or tag) whose name starts with the current "phrase". Tab inserts as a
// mention (or `#tag` text). Conservative thresholds — false positives kill
// trust faster than missing suggestions disappoint.

const SMART_LINK_MIN_CHARS = 4;
let _smartLinkIndexCache = null;
let _smartLinkIndexDirty  = true;
function _invalidateSmartLinkIndex() { _smartLinkIndexDirty = true; }

// Workspace-wide list of `{ title, titleLC, kind, entity }` rows. Includes
// every taggable / linkable entity title plus every distinct tag (synthesized
// as kind:'tag' with the same shape so the suggester treats them uniformly).
// Sorted by titleLC length desc so longer titles win ties (e.g. "Q4 Strategy"
// beats "Q4" when the user typed enough chars to match both).
function _buildSmartLinkIndex() {
  if (!_smartLinkIndexDirty && _smartLinkIndexCache) return _smartLinkIndexCache;
  const out = [];
  const seenTags = new Set();
  for (const [pkey, proj] of Object.entries(state.data.projects || {})) {
    if (proj.archived) continue;
    if (proj.name) out.push({ title: proj.name, titleLC: proj.name.toLowerCase(), kind: 'entity', entity: { type: 'project', projectKey: pkey, refId: pkey } });
    const pushEntity = (arr, type, titleField) => (arr || []).forEach(item => {
      if (item.archived) return;
      const title = (item[titleField] || '').trim();
      if (!title) return;
      out.push({ title, titleLC: title.toLowerCase(), kind: 'entity', entity: { type, projectKey: pkey, refId: item.id } });
    });
    pushEntity(proj.todos,       'todo',       'title');
    pushEntity(proj.notes,       'note',       'title');
    pushEntity(proj.flows,       'flow',       'name');
    pushEntity(proj.subprojects, 'subproject', 'name');
    pushEntity(proj.reminders,   'reminder',   'title');
    pushEntity(proj.commitments, 'commitment', 'description');
    pushEntity(proj.delegations, 'delegation', 'task');
    const collectTags = (arr) => (arr || []).forEach(item => {
      (item.tags || []).forEach(t => {
        const lc = String(t).toLowerCase();
        if (seenTags.has(lc)) return;
        seenTags.add(lc);
        out.push({ title: String(t), titleLC: lc, kind: 'tag', entity: null });
      });
    });
    collectTags(proj.todos);
    collectTags(proj.notes);
    collectTags(proj.commitments);
    collectTags(proj.delegations);
    collectTags(proj.reminders);
    collectTags(proj.dumps);
  }
  out.sort((a, b) => b.titleLC.length - a.titleLC.length);
  _smartLinkIndexCache = out;
  _smartLinkIndexDirty = false;
  return out;
}

// Picks the current "phrase" from `text` ending at `caretPos`, looks up the
// smart-link index for a strict prefix match. Returns null when the user
// typed too little, the phrase is right after a `/` or `@` (other completers
// own those), or no match. Also rejects self-suggestions when the editing
// surface is itself the entity (currentEntityRef).
function suggestSmartLink(text, caretPos, currentEntityRef) {
  if (caretPos < SMART_LINK_MIN_CHARS) return null;
  let start = caretPos;
  while (start > 0) {
    const ch = text[start - 1];
    if (/[.,;:!?\n]/.test(ch)) break;
    if (ch === '/' || ch === '@') return null;
    start--;
  }
  while (start < caretPos && /\s/.test(text[start])) start++;
  const phrase = text.slice(start, caretPos);
  if (phrase.length < SMART_LINK_MIN_CHARS) return null;
  const lc = phrase.toLowerCase();
  const idx = _buildSmartLinkIndex();
  const match = idx.find(e => e.titleLC.startsWith(lc) && e.titleLC.length > lc.length);
  if (!match) return null;
  if (currentEntityRef && match.entity
      && match.entity.type === currentEntityRef.type
      && match.entity.refId === currentEntityRef.refId) return null;
  return {
    typed: phrase,
    suggestion: match.title.slice(phrase.length),
    full: match.title,
    kind: match.kind,
    entity: match.entity,
    startOffset: start,
    endOffset: caretPos
  };
}

// Walk up from `el` looking for the closest container that identifies the
// entity the caret is editing. Returns { type, projectKey, refId } or null.
// Used by both the @-mention completer (to skip "you can't mention yourself"
// rows) and the smart-link suggester (to skip "this todo already exists" hits
// when you've just clicked into the todo whose title is the matched phrase).
//
// Falls back to state.editingNote when the caret is inside #notes-editor-panel
// — the note editor doesn't tag its container with a data-id.
function _resolveSelfEntityForElement(el) {
  if (!el) return null;
  const projKey = state.project;
  for (let cur = el; cur && cur !== document.body; cur = cur.parentElement) {
    const ds = cur.dataset;
    if (!ds) continue;
    if (ds.todoId)     return { type: 'todo',       projectKey: projKey, refId: ds.todoId };
    if (ds.comId)      return { type: 'commitment', projectKey: projKey, refId: ds.comId };
    if (ds.delId)      return { type: 'delegation', projectKey: projKey, refId: ds.delId };
    if (ds.reminderId) return { type: 'reminder',   projectKey: projKey, refId: ds.reminderId };
    if (ds.flowId)     return { type: 'flow',       projectKey: projKey, refId: ds.flowId };
  }
  if (state.editingNote && state.editingNote !== 'new') {
    for (let cur = el; cur && cur !== document.body; cur = cur.parentElement) {
      if (cur.id === 'notes-editor-panel' || (cur.classList && cur.classList.contains('notes-editor-panel'))) {
        return { type: 'note', projectKey: projKey, refId: state.editingNote };
      }
    }
  }
  return null;
}

function _mentionAnchorSelfEntity(anchor) {
  if (!anchor) return null;
  const el = anchor.isInput ? anchor.input
           : (anchor.node && anchor.node.nodeType === 3 ? anchor.node.parentElement : anchor.node);
  return _resolveSelfEntityForElement(el);
}

function buildMentionResults(query, selfEntity) {
  const q = (query || '').toLowerCase();
  const out = [];
  const seenLimit = 25;
  // selfEntity is { type, projectKey, refId } when the caret sits inside an
  // existing entity — that one row is omitted so the user doesn't get
  // offered themselves as a mention target.
  const isSelf = (type, pkey, refId) =>
    !!selfEntity
    && selfEntity.type === type
    && selfEntity.projectKey === pkey
    && selfEntity.refId === refId;
  for (const [pkey, proj] of Object.entries(state.data.projects || {})) {
    if (out.length >= seenLimit) break;
    if (proj.archived) continue;
    if ((proj.name || '').toLowerCase().includes(q) && !isSelf('project', pkey, pkey)) {
      out.push({ type: 'project', projectKey: pkey, refId: pkey, label: proj.name, projectName: proj.name, projectColor: proj.color || '#16a34a' });
    }
    (proj.todos || []).forEach(t => {
      if (t.archived) return;
      if (isSelf('todo', pkey, t.id)) return;
      if ((t.title || '').toLowerCase().includes(q)) {
        out.push({ type: 'todo', projectKey: pkey, refId: t.id, label: t.title, projectName: proj.name, projectColor: proj.color || '#16a34a', done: !!t.done });
      }
    });
    (proj.notes || []).forEach(n => {
      if (n.archived) return;
      if (isSelf('note', pkey, n.id)) return;
      const title = (n.title || '').trim();
      if (title.toLowerCase().includes(q)) {
        out.push({ type: 'note', projectKey: pkey, refId: n.id, label: title || '(untitled)', projectName: proj.name, projectColor: proj.color || '#16a34a' });
      }
    });
    (proj.flows || []).forEach(f => {
      if (isSelf('flow', pkey, f.id)) return;
      if ((f.name || '').toLowerCase().includes(q)) {
        out.push({ type: 'flow', projectKey: pkey, refId: f.id, label: f.name, projectName: proj.name, projectColor: proj.color || '#16a34a' });
      }
    });
    (proj.subprojects || []).forEach(s => {
      if (isSelf('subproject', pkey, s.id)) return;
      if ((s.name || '').toLowerCase().includes(q)) {
        out.push({ type: 'subproject', projectKey: pkey, refId: s.id, label: s.name, projectName: proj.name, projectColor: proj.color || '#16a34a' });
      }
    });
    (proj.reminders || []).forEach(r => {
      if (isSelf('reminder', pkey, r.id)) return;
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

// Plain-input variant of findCaretMention. Inputs/textareas don't have a
// Range/Selection API the same way contenteditable does — caret position
// is selectionStart/selectionEnd indices into `value`. Result shape mirrors
// findCaretMention so the rest of the completer pipeline doesn't have to
// know which surface it came from.
function findCaretMentionInInput(input) {
  if (!input) return null;
  const value = input.value || '';
  const start = input.selectionStart;
  const end   = input.selectionEnd;
  if (start == null || start !== end) return null;
  let i = start - 1;
  while (i >= 0 && /\S/.test(value[i])) i--;
  const word = value.slice(i + 1, start);
  if (!word.startsWith('@')) return null;
  const afterAt = word.slice(1);
  if (afterAt.length > 40) return null;
  return { input, startOffset: i + 1, endOffset: start, query: afterAt, isInput: true };
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
  // Skip the entity the caret is in — no value in offering yourself as a mention.
  mentionState.results = buildMentionResults(anchor.query, _mentionAnchorSelfEntity(anchor));
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
    // Swap the icon when done so the row is visually distinct at-a-glance
    // — the strikethrough/dimmed label below alone is too easy to miss when
    // scanning a long list of candidates. ☑/🔕 echo the open ✓/🔔.
    let icon = pinIconFor(r.type);
    if (r.done && r.type === 'todo')     icon = '☑';
    if (r.done && r.type === 'reminder') icon = '🔕';
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
  // Anchor: caret rect for contenteditable, input bounding rect for plain
  // inputs/textareas (no public API to get the caret pixel position in an
  // input without dom-trickery). Positioning at the input's bottom-left is
  // good enough — the caret is always somewhere inside that rect.
  let rect;
  if (mentionState.anchor && mentionState.anchor.isInput) {
    const r = mentionState.anchor.input.getBoundingClientRect();
    rect = { left: r.left, top: r.top, bottom: r.bottom };
  } else {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    rect = sel.getRangeAt(0).getBoundingClientRect();
  }
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

  // Plain-input path: replace the @… token with `@Label ` text. We can't
  // wrap in <a class="mention"> because the input's value is plain text;
  // backlinks from these surfaces are not generated yet (would need a
  // text-parsing pass at save time, future work). The completer here is
  // primarily a capture-assist — saving the user from typing the full name.
  if (anchor.isInput) {
    const input = anchor.input;
    const before = input.value.slice(0, anchor.startOffset);
    const after  = input.value.slice(anchor.endOffset);
    const insert = '@' + item.label + ' ';
    input.value = before + insert + after;
    const newPos = before.length + insert.length;
    input.setSelectionRange(newPos, newPos);
    closeMentionCompleter();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }

  // Contenteditable path: insert a real <a class="mention"> so backlinks
  // and decoration work as before.
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
  // Trigger input event on the host element so dirty-tracking / autosave
  // fire. Walk up from the inserted node to find a contenteditable host.
  let host = a.parentElement;
  while (host && !host.isContentEditable) host = host.parentElement;
  if (host) host.dispatchEvent(new Event('input', { bubbles: true }));
}

// Tracks which DOM nodes already have the completer wired so we don't stack
// duplicate listeners on re-focus. WeakSet so orphaned (re-rendered) nodes
// get GC'd cleanly.
const _mentionInstalledFor = new WeakSet();

// Generic mention-completer installer. Works for contenteditable elements
// AND <input>/<textarea>. Keydown is captured so Enter/Tab (when the popover
// is open) intercepts before per-surface handlers like #todo-input's addTodo.
function installMentionCompleter(el) {
  if (!el || _mentionInstalledFor.has(el)) return;
  _mentionInstalledFor.add(el);
  const isInput = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';

  const onInput = () => {
    const anchor = isInput ? findCaretMentionInInput(el) : findCaretMention();
    if (anchor) openMentionCompleter(anchor);
    else closeMentionCompleter();
  };
  el.addEventListener('input', onInput);
  // For inputs: caret can move via arrow keys / clicks without an input
  // event. Refresh on those to keep the popover in sync with the caret.
  if (isInput) {
    el.addEventListener('keyup', (e) => {
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) onInput();
    });
    el.addEventListener('click', onInput);
  }

  el.addEventListener('keydown', (e) => {
    if (!mentionState.open) return;
    // Only act when the caret is in THIS element's anchor — otherwise
    // the popover belongs to a different field.
    const a = mentionState.anchor;
    const anchorEl = a && (a.isInput ? a.input : (a.node && a.node.parentElement));
    if (anchorEl && anchorEl !== el && !el.contains(anchorEl)) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault(); e.stopImmediatePropagation();
      mentionState.activeIdx = Math.min(mentionState.results.length - 1, mentionState.activeIdx + 1);
      renderMentionMenu();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); e.stopImmediatePropagation();
      mentionState.activeIdx = Math.max(0, mentionState.activeIdx - 1);
      renderMentionMenu();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (mentionState.results.length) {
        e.preventDefault();
        e.stopImmediatePropagation();
        insertMentionFromCompleter();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopImmediatePropagation();
      closeMentionCompleter();
    }
  }, true);  // capture phase — runs before per-surface bubble handlers

  el.addEventListener('blur', () => {
    // Slight delay so the popover's mousedown/click handlers fire first.
    // Guard: only close if the popover still belongs to THIS element. The
    // user might have tabbed to another mention-enabled field, which would
    // already have re-opened the popover with its own anchor — closing
    // unconditionally would clobber that.
    setTimeout(() => {
      const a = mentionState.anchor;
      const anchorEl = a && (a.isInput ? a.input : (a.node && a.node.parentElement));
      if (!anchorEl || anchorEl === el || el.contains(anchorEl)) {
        closeMentionCompleter();
      }
    }, 150);
  });
}

// Surfaces that should auto-install the completer on focus. The focusin
// delegate fires on the first focus of any new DOM node matching one of
// these selectors, so re-renders (which create fresh nodes) don't need
// any per-render wiring code. Add to the list to enable a new surface.
const _mentionTargetSelectors = [
  '#note-content',                                         // existing
  '.todo-title',                                           // todo card title (contenteditable)
  '.todo-step-title',                                      // todo step (contenteditable)
  '#dump-input',                                           // dump zone capture (contenteditable)
  '.dump-text-edit',                                       // dump card inline editor (contenteditable)
  '.flow-node-text',                                       // flow node text (contenteditable)
  '#todo-input',                                           // todo add form input
  '#rem-title', '#rem-note',                               // reminder add form
  '#com-counterparty', '#com-description', '#com-notes',   // commitment add form
  '.com-edit-field[data-com-field="counterparty"]',        // commitment expanded
  '.com-edit-field[data-com-field="description"]',
  '.com-edit-field[data-com-field="notes"]',
  '#del-add-task', '#del-add-person',                      // delegation add form
  '.del-edit-task',                                        // delegation expanded
  '.del-edit-field[data-del-field="task"]',
  '.del-edit-field[data-del-field="delegated_to"]',
  '.del-edit-field[data-del-field="notes"]'
].join(', ');

if (typeof document !== 'undefined') {
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (t && t.matches && t.matches(_mentionTargetSelectors)) {
      installMentionCompleter(t);
      installSmartLinkCompleter(t);
    }
  });
}

// Devtools debug surface for §3.3. Same pattern as window.__nodeLinks —
// always present, lets the user (and future sessions) poke the smart-link
// engine without restoring source.
if (typeof window !== 'undefined') {
  window.__smartLink = {
    state: smartLinkState,
    buildIndex: _buildSmartLinkIndex,
    invalidate: _invalidateSmartLinkIndex,
    suggest: suggestSmartLink,
    // Convenience: simulate a suggestion from a focused element. Returns
    // the suggestion object or null. Doesn't render the popover.
    test(text, caret) { return suggestSmartLink(text, caret == null ? text.length : caret); }
  };
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
  // Mention completer is now auto-installed via the focusin delegate
  // (see installMentionCompleter / _mentionTargetSelectors). The note
  // editor's #note-content is one of the targets, so it picks up the
  // wiring on first focus without any per-render code here.
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

// ===== SHARED MULTI-SELECT (todos / notes lists) =====
// Click semantics mirror Windows Explorer's "shift extends a range":
//   - Plain click           → toggle that one, set anchor
//   - Shift + click         → fill the range from the anchor (additive — keeps
//                             whatever was already selected outside the range)
//   - Ctrl  + click         → toggle that one, set anchor (alias for plain so
//                             muscle memory from File Explorer still works)
//   - Ctrl  + Shift + click → same as Shift+Click (additive range)
// The visible/ordered list is read straight from the DOM at click time, so
// the helper doesn't need to know about each view's filter/sort plumbing.
function bulkSelectHandler(opts) {
  const { kind, id, event, scopeSelector, rowSelector, idAttr } = opts;
  const set = state[kind === 'todos' ? 'selectedTodos' : 'selectedNotes'];
  if (!(set instanceof Set)) return;
  const scope = scopeSelector ? document.querySelector(scopeSelector) : document;
  if (!scope) return;
  const rows = Array.from(scope.querySelectorAll(rowSelector));
  const ids = rows.map(r => r.getAttribute(idAttr));
  const clickedIdx = ids.indexOf(id);
  if (clickedIdx < 0) return;

  const anchorId = state.bulkAnchors[kind];
  const anchorIdx = anchorId ? ids.indexOf(anchorId) : -1;

  if (event && event.shiftKey && anchorIdx >= 0) {
    const [lo, hi] = anchorIdx <= clickedIdx ? [anchorIdx, clickedIdx] : [clickedIdx, anchorIdx];
    for (let i = lo; i <= hi; i++) set.add(ids[i]);
    // Anchor stays put — successive Shift+Clicks pivot off the same point,
    // matching File Explorer's behaviour.
  } else {
    if (set.has(id)) set.delete(id); else set.add(id);
    state.bulkAnchors[kind] = id;
  }
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
  const isFutureRecurring   = (t) => !!t.recurrence && !t.done && !!t.dueDate && t.dueDate > todayStr;
  const isFutureEscalation  = (t) => t.kind === 'escalation' && !!t.chainId && !t.done && !!t.dueDate && t.dueDate > todayStr;
  const futureRecurring = sortTodosByStatus(filteredRaw.filter(isFutureRecurring), { sortBy: state.todoSortBy, spOrder: spOrderMap });
  // Group future-dated escalation todos by their owning chain. Chains with
  // zero matching todos don't render a box. Orphan escalation todos
  // (chainId points to a deleted chain) fall through to the main list
  // below — they remain valid todos, just ungrouped, until the user fixes
  // them via Settings or deletes them.
  const chains = Array.isArray(state.data.escalationChains) ? state.data.escalationChains : [];
  const chainsById = Object.fromEntries(chains.map(c => [c.id, c]));
  const futureEscalationByChain = chains.map(chain => ({
    chain,
    items: sortTodosByStatus(
      filteredRaw.filter(t => !isFutureRecurring(t) && isFutureEscalation(t) && t.chainId === chain.id),
      { sortBy: state.todoSortBy, spOrder: spOrderMap }
    )
  })).filter(g => g.items.length > 0);
  const filtered = sortTodosByStatus(filteredRaw.filter(t => {
    if (isFutureRecurring(t)) return false;
    if (isFutureEscalation(t) && chainsById[t.chainId]) return false;  // grouped above
    return true;
  }), { sortBy: state.todoSortBy, spOrder: spOrderMap });
  // Union of every todo that's actually rendered in this view — main list
  // plus the recurring box plus every escalation chain box. Used as the
  // "visible set" for the bulk-action bar's stale-id cleanup: passing only
  // `filtered` would drop any box-item IDs from state.selectedTodos on
  // every re-render, making bulk-select inside collapsible boxes feel
  // silently dead. Collapsed-box items are included intentionally so the
  // user can select items, collapse the box for clarity, and still run
  // bulk actions on the full selection.
  const allVisibleTodos = [
    ...futureRecurring,
    ...futureEscalationByChain.flatMap(g => g.items),
    ...filtered
  ];
  const recurringCollapsed = isRecurringBoxCollapsed();

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-todos">
      <div class="view-header">
        <div class="view-header-row"><div class="view-title">Todos</div></div>
      </div>
      ${bulkActionBarHTML(allVisibleTodos)}
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
            <input type="text" class="form-input entity-tags-input" id="todo-tags" placeholder="Tags (comma)" list="all-workspace-tags" style="flex:1;min-width:140px">
            <button class="btn btn-ghost btn-sm todo-add-recur ${state.pendingTodoRecurrence?'active':''}" id="btn-add-todo-recur" title="${state.pendingTodoRecurrence ? describeRecurrence(state.pendingTodoRecurrence) : 'Set recurrence'}">
              🔁 ${state.pendingTodoRecurrence ? escapeHTML(describeRecurrence(state.pendingTodoRecurrence)) : 'Repeat'}
            </button>
            ${chains.length > 0 ? `
              <div class="dropdown" id="spawn-chain-dropdown">
                <button class="btn btn-secondary btn-sm" id="btn-spawn-chain" type="button" title="Spawn an escalation chain in this project">↻ Spawn chain ▾</button>
                <div class="dropdown-menu" id="spawn-chain-dropdown-menu" hidden>
                  ${chains.map(c => {
                    const itemCount = (c.items || []).length;
                    return `<button class="dropdown-item" type="button" data-spawn-chain-id="${escapeHTML(c.id)}">
                      <span class="dropdown-item-label">${escapeHTML(c.name)}</span>
                      <span class="dropdown-item-meta">${itemCount} item${itemCount === 1 ? '' : 's'}</span>
                    </button>`;
                  }).join('')}
                  <hr>
                  <button class="dropdown-item dropdown-item-secondary" type="button" id="dropdown-manage-chains">Manage chains in Settings…</button>
                </div>
              </div>` : ''}
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
          ${futureEscalationByChain.map(g => {
            const collapsed = isEscalationBoxCollapsed(g.chain.id);
            return `<div class="todo-recurring-box todo-escalation-box ${collapsed ? 'collapsed' : ''}" data-chain-id="${escapeHTML(g.chain.id)}">
              <div class="todo-recurring-box-header">
                <button class="todo-box-toggle" data-toggle-escalation-chain="${escapeHTML(g.chain.id)}" title="${collapsed ? 'Expand' : 'Collapse'}">${collapsed ? '▸' : '▾'}</button>
                <span class="todo-recurring-box-title">↻ ${escapeHTML(g.chain.name)} — follow-ups</span>
                <span class="todo-recurring-box-count">${g.items.length}</span>
                <span class="todo-recurring-box-hint">Moves to the main list once due date is reached</span>
              </div>
              ${collapsed ? '' : `<div class="todo-list todo-recurring-list">
                ${g.items.map(t => todoItemHTML(t)).join('')}
              </div>`}
            </div>`;
          }).join('')}
          <div class="todo-list" id="todo-list">
            ${filtered.length
              ? filtered.map(t => todoItemHTML(t)).join('')
              : `<div class="empty-state" style="padding:20px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border)">
                  ${f==='done' ? 'Nothing done yet — keep going!' : ((futureRecurring.length || futureEscalationByChain.length) ? 'Nothing due yet — upcoming follow-ups are above.' : 'No todos here. Add one above.')}</div>`}
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

  // Spawn-chain dropdown: button toggles the menu; menu items spawn the
  // chain into the active project. Click-outside closes via a captured
  // document handler (mirrors the _todoOverflowOutsideHandler pattern).
  const spawnChainBtn  = document.getElementById('btn-spawn-chain');
  const spawnChainMenu = document.getElementById('spawn-chain-dropdown-menu');
  if (spawnChainBtn && spawnChainMenu) {
    spawnChainBtn.addEventListener('click', () => {
      const willOpen = spawnChainMenu.hidden;
      spawnChainMenu.hidden = !willOpen;
      if (willOpen) {
        // Defer attachment so the click that opened it doesn't immediately
        // close it via the outside-click handler.
        setTimeout(() => document.addEventListener('click', _spawnChainOutsideHandler, true), 0);
      } else {
        document.removeEventListener('click', _spawnChainOutsideHandler, true);
      }
    });
  }
  document.querySelectorAll('[data-spawn-chain-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const chainId = btn.dataset.spawnChainId;
      _closeSpawnChainMenu();
      spawnChain(chainId);
      renderTodos();
    });
  });
  document.getElementById('dropdown-manage-chains')?.addEventListener('click', () => {
    _closeSpawnChainMenu();
    state.settingsTab = 'workflows';
    localStorage.setItem('settingsLastTab', 'workflows');
    openSettings();
  });

  // Per-chain collapsible-box toggle. Each chain box has a unique
  // data-toggle-escalation-chain attribute carrying the chainId.
  document.querySelectorAll('[data-toggle-escalation-chain]').forEach(btn => {
    btn.addEventListener('click', () => {
      const chainId = btn.dataset.toggleEscalationChain;
      setEscalationBoxCollapsed(chainId, !isEscalationBoxCollapsed(chainId));
      renderTodos();
    });
  });

  document.getElementById('btn-toggle-recurring-box')?.addEventListener('click', () => {
    setRecurringBoxCollapsed(!isRecurringBoxCollapsed());
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
  // Bulk-select on each row — plain click toggles, Shift+Click extends from
  // the last anchor (Windows Explorer style). Ctrl is treated as plain so
  // users coming from File Explorer's Ctrl+Click still get a toggle. The
  // mousedown preventDefault matches the .note-bulk-select wiring: it
  // suppresses the browser's native shift+click text-range extension so
  // rows between anchor and target don't briefly flash as text selection
  // before the re-render. Conditional on shiftKey so normal copy-paste
  // selection in todo titles still works.
  scope.querySelectorAll('.todo-bulk-select').forEach(el => {
    el.addEventListener('mousedown', (e) => { if (e.shiftKey) e.preventDefault(); });
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      bulkSelectHandler({
        kind: 'todos',
        id: el.dataset.bulkId,
        event: e,
        scopeSelector: scopeSelector,
        rowSelector: '.todo-bulk-select',
        idAttr: 'data-bulk-id'
      });
      renderTodos();
    });
  });
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
  scope.querySelectorAll('.todo-overflow').forEach(b =>
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      openTodoOverflowMenu(b, b.dataset.id, onRefresh, toggleFrom);
    }));
  scope.querySelectorAll('.todo-tags-edit').forEach(inp => {
    inp.addEventListener('click', e => e.stopPropagation());
    const commit = () => {
      if (setEntityTags('todo', inp.dataset.id, parseTagsString(inp.value))) onRefresh();
    };
    inp.addEventListener('change', commit);
    inp.addEventListener('blur', commit);
  });
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

// Floating overflow menu for the todo row's secondary actions. The actual
// click handlers (todo-attachments, todo-recurrence, todo-to-note,
// todo-archive, todo-delete) are reused from bindTodoRowEvents — we just
// build a menu DOM with the same class names + data-id, then call the
// binding helper with the menu as scope. The menu also closes itself on
// any click inside (so users get a clean dismiss after picking an action).
function openTodoOverflowMenu(anchor, todoId, onRefresh, toggleFrom) {
  closeTodoOverflowMenu();
  const proj = getProject();
  const t = (proj.todos || []).find(x => x.id === todoId);
  if (!t) return;
  const attCount = (t.attachments || []).length;
  const recurLabel = t.recurrence ? `Recurrence — ${escapeHTML(describeRecurrence(t.recurrence))}` : 'Set recurrence';
  const menu = document.createElement('div');
  menu.id = 'todo-overflow-menu';
  menu.className = 'todo-overflow-menu';
  menu.innerHTML = `
    <button class="todo-overflow-item todo-attachments" data-id="${todoId}">
      <span class="todo-overflow-ic">📎</span>
      <span>Attachments${attCount ? ` (${attCount})` : ''}</span>
    </button>
    <button class="todo-overflow-item todo-recurrence ${t.recurrence?'active':''}" data-id="${todoId}">
      <span class="todo-overflow-ic">🔁</span>
      <span>${recurLabel}</span>
    </button>
    <button class="todo-overflow-item todo-to-note" data-id="${todoId}">
      <span class="todo-overflow-ic">→</span>
      <span>Convert to note</span>
    </button>
    <button class="todo-overflow-item todo-archive" data-id="${todoId}">
      <span class="todo-overflow-ic">${t.archived ? '↺' : '📦'}</span>
      <span>${t.archived ? 'Restore from archive' : 'Archive'}</span>
    </button>
    <button class="todo-overflow-item todo-delete todo-overflow-danger" data-id="${todoId}">
      <span class="todo-overflow-ic">✕</span>
      <span>Delete</span>
    </button>
  `;
  document.body.appendChild(menu);

  // Position. Default below-right; flip up if it would overflow the viewport.
  const rect = anchor.getBoundingClientRect();
  let top  = rect.bottom + 4;
  let left = rect.right - menu.offsetWidth;
  if (top + menu.offsetHeight > window.innerHeight) top  = Math.max(8, rect.top - menu.offsetHeight - 4);
  if (left < 8) left = 8;
  if (left + menu.offsetWidth > window.innerWidth - 8) left = window.innerWidth - menu.offsetWidth - 8;
  menu.style.top  = `${top}px`;
  menu.style.left = `${left}px`;

  // Reuse the existing handler wiring for these classes by binding against
  // the menu as scope. onRefresh re-renders the underlying view; we close
  // the menu first so it doesn't linger as orphaned DOM.
  bindTodoRowEvents('#todo-overflow-menu', () => {
    closeTodoOverflowMenu();
    if (typeof onRefresh === 'function') onRefresh();
  }, toggleFrom);

  // Belt-and-suspenders: any click inside the menu also closes it (covers
  // actions like attachments that open a modal but don't trigger onRefresh).
  menu.addEventListener('click', (e) => {
    if (e.target.closest('.todo-overflow-item')) closeTodoOverflowMenu();
  });

  setTimeout(() => document.addEventListener('click', _todoOverflowOutsideHandler, true), 0);
}

function closeTodoOverflowMenu() {
  const m = document.getElementById('todo-overflow-menu');
  if (m) m.remove();
  document.removeEventListener('click', _todoOverflowOutsideHandler, true);
}

function _todoOverflowOutsideHandler(e) {
  if (e.target.closest('#todo-overflow-menu')) return;
  if (e.target.closest('.todo-overflow'))      return;
  closeTodoOverflowMenu();
}

// Spawn-chain dropdown: click-outside-to-close + close helper. Mirrors the
// _todoOverflowOutsideHandler pattern. Attached/detached by the renderTodos
// click handler so listeners don't accumulate across re-renders.
function _spawnChainOutsideHandler(e) {
  if (e.target.closest('#spawn-chain-dropdown')) return;   // click inside dropdown — keep open
  _closeSpawnChainMenu();
}
function _closeSpawnChainMenu() {
  const menu = document.getElementById('spawn-chain-dropdown-menu');
  if (menu && !menu.hidden) menu.hidden = true;
  document.removeEventListener('click', _spawnChainOutsideHandler, true);
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
      <span class="todo-title" contenteditable="true" spellcheck="false" data-id="${t.id}" title="Click to edit">${decoratePlainTextMentions(t.title)}</span>
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
      ${pinToggleButtonHTML('todo', state.project, t.id, 'btn btn-ghost btn-icon')}
      <button class="btn btn-ghost btn-icon todo-overflow" data-id="${t.id}" title="More actions" aria-label="More actions">⋯</button>
    </div>
    ${(t.tags && t.tags.length) ? `<div class="entity-tags-row">${entityTagsHTML(t.tags)}</div>` : ''}
    ${expanded ? `<div class="entity-tags-edit-row">
      <label class="entity-tags-edit-label">Tags</label>
      <input type="text" class="form-input entity-tags-input todo-tags-edit" data-id="${t.id}" placeholder="comma-separated" list="all-workspace-tags" value="${escapeHTML((t.tags||[]).join(', '))}">
    </div>` : ''}
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
        <span class="todo-step-title" contenteditable="true" spellcheck="false" data-todo-id="${t.id}" data-step-id="${s.id}">${decoratePlainTextMentions(s.title)}</span>
        <button class="todo-step-delete" data-todo-id="${t.id}" data-step-id="${s.id}" title="Remove">✕</button>
      </div>`).join('')}
    <div class="todo-step-add">
      <span class="todo-step-add-icon">+</span>
      <input type="text" class="todo-step-input" data-todo-id="${t.id}" placeholder="Add step…">
    </div>
  </div>`;
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
  const spDumpsPending = spDumps.filter(d => !d.processed);
  const spDumpsProcessed = spDumps.filter(d => d.processed).sort((a,b) => new Date(b.processedAt || 0) - new Date(a.processedAt || 0));
  const openCount = spTodos.filter(t=>!t.done).length;

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

    <div class="sp-section-title" style="display:flex;align-items:center;gap:8px">
      <span>Timeline</span>
      <button class="btn btn-ghost btn-sm" id="btn-sp-add-milestone" title="Add a milestone to this subproject">◆ + Milestone</button>
    </div>
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
        const hasContent = !!noteContentText(n.content);
        const expanded = state.expandedSpNotes && state.expandedSpNotes.has(n.id);
        return `<div class="sp-note-card">
          <div class="sp-note-header">
            <button class="sp-note-expand ${hasContent?'':'disabled'} ${expanded?'expanded':''}" data-sp-note-toggle="${n.id}" title="${hasContent ? (expanded?'Collapse':'Expand') : 'No content'}" ${hasContent?'':'disabled'}>${expanded?'▾':'▸'}</button>
            ${priorityBadge(n.priority)}
            <span class="sp-note-title" data-id="${n.id}">${escapeHTML(n.title)}</span>
            <span style="font-size:11px;color:var(--text-muted)">${formatDate(n.updated)}</span>
            <button class="btn btn-ghost btn-icon sp-unlink-note" data-id="${n.id}" title="Unlink">✕</button>
          </div>
          ${expanded && hasContent ? `<div class="sp-note-body">${noteContentInitialHTML(n.content)}</div>` : ''}
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
      <span style="font-weight:400;color:var(--text-muted)">${spDumps.length}${spDumps.length ? ` · ${spDumpsPending.length} pending` : ''}</span>
    </div>
    ${dumpCaptureHTML({ fixedSubprojectId: spId })}
    <div class="dump-section-title" style="margin-top:14px">To process <span class="dump-section-count">${spDumpsPending.length}</span></div>
    ${spDumpsPending.length
      ? `<div class="dump-list">${spDumpsPending.map(d => dumpCardHTML(d, false)).join('')}</div>`
      : `<div class="empty-state" style="padding:14px;background:var(--card-bg);border-radius:var(--radius);border:1px solid var(--border)">No pending dumps for this subproject. Capture one above.</div>`}
    ${spDumpsProcessed.length ? `
      <details class="dump-processed-wrap" ${spDumpsPending.length === 0 ? 'open' : ''}>
        <summary class="dump-section-title dump-processed-summary">Processed <span class="dump-section-count">${spDumpsProcessed.length}</span></summary>
        <div class="dump-list">${spDumpsProcessed.map(d => dumpCardHTML(d, true)).join('')}</div>
      </details>` : ''}

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

  // Toggle inline note body (DOM-only, no re-render → preserves scroll)
  document.querySelectorAll('[data-sp-note-toggle]').forEach(btn =>
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-sp-note-toggle');
      if (!state.expandedSpNotes) state.expandedSpNotes = new Set();
      const card = btn.closest('.sp-note-card');
      const note = getProject().notes.find(n => n.id === id);
      if (!note || !card) return;
      const existing = card.querySelector('.sp-note-body');
      if (existing) {
        existing.remove();
        state.expandedSpNotes.delete(id);
        btn.classList.remove('expanded');
        btn.textContent = '▸';
        btn.title = 'Expand';
      } else {
        const body = document.createElement('div');
        body.className = 'sp-note-body';
        body.innerHTML = noteContentInitialHTML(note.content);
        const header = card.querySelector('.sp-note-header');
        header.insertAdjacentElement('afterend', body);
        state.expandedSpNotes.add(id);
        btn.classList.add('expanded');
        btn.textContent = '▾';
        btn.title = 'Collapse';
      }
    }));

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

  // Dump capture + cards — same affordances as the Dump Zone tab. The capture
  // panel is locked to the active subproject so newly created dumps land here
  // without an extra dropdown step.
  if (state.activeSubproject) {
    bindDumpCaptureControls({ fixedSubprojectId: state.activeSubproject });
    bindDumpCardControls();
  }

  // Attachments panel
  bindAttachmentPanel(document.getElementById('sp-right-panel'), renderSubprojects);

  // Milestone affordances: toolbar button + right-click + click-to-edit on markers
  document.getElementById('btn-sp-add-milestone')?.addEventListener('click', () =>
    showMilestoneModal(null, { subprojectId: state.activeSubproject }));
  bindAllGanttMilestones(document);

  // Scroll gantt to its focus day (today, or oldest overdue open todo).
  requestAnimationFrame(scrollGanttToFocus);
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
    startDate, dueDate, subprojectId: state.activeSubproject, tags: [],
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

// ===== MILESTONES =====
// Per-project list of fixed-date markers rendered on the Gantt. Decoupled
// from todos by design — milestones are points in time, not actionable items.
// Entry points: toolbar `+ Milestone` button, right-click on Gantt timeline,
// `/milestone` slash command in the new-todo input (uses /due as the date).

var MILESTONE_COLORS = ['#a855f7', '#06b6d4', '#f59e0b', '#ec4899', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6'];

function ensureMilestonesArray(proj) {
  if (!proj) return null;
  if (!Array.isArray(proj.milestones)) proj.milestones = [];
  return proj.milestones;
}

function getProjectMilestones() {
  const proj = getProject();
  return ensureMilestonesArray(proj) || [];
}

// Milestones visible in a given scope:
// - Subproject view (spId set): project-level milestones (subprojectId == null)
//   PLUS milestones attached to this subproject.
// - Overview / dashboard (spId == null): every milestone in the project,
//   project-level and subproject-attached.
function getMilestonesForScope(spId) {
  const all = getProjectMilestones();
  if (!spId) return all;
  return all.filter(m => !m.subprojectId || m.subprojectId === spId);
}

function addMilestone({ title, date, subprojectId = null, color = null, note = '' }) {
  const t = (title || '').trim();
  const d = (date || '').trim();
  if (!t || !d) return null;
  const proj = getProject();
  const list = ensureMilestonesArray(proj);
  const m = {
    id: generateId('ms'),
    title: t,
    date: d,
    subprojectId: subprojectId || null,
    color: color || MILESTONE_COLORS[list.length % MILESTONE_COLORS.length],
    note: note || '',
    created: new Date().toISOString()
  };
  list.push(m);
  saveData();
  rerenderAfterMilestoneChange();
  showToast(`Milestone "${t}" set for ${formatDate(d)}`, 'success');
  return m;
}

function updateMilestone(id, patch) {
  const list = ensureMilestonesArray(getProject());
  if (!list) return false;
  const m = list.find(x => x.id === id);
  if (!m) return false;
  if (typeof patch.title === 'string') m.title = patch.title.trim();
  if (typeof patch.date === 'string' && patch.date) m.date = patch.date;
  if ('subprojectId' in patch) m.subprojectId = patch.subprojectId || null;
  if (typeof patch.color === 'string') m.color = patch.color;
  if (typeof patch.note === 'string') m.note = patch.note;
  saveData();
  rerenderAfterMilestoneChange();
  return true;
}

function deleteMilestone(id) {
  const list = ensureMilestonesArray(getProject());
  if (!list) return false;
  const i = list.findIndex(x => x.id === id);
  if (i === -1) return false;
  const [removed] = list.splice(i, 1);
  saveData();
  rerenderAfterMilestoneChange();
  showToast(`Milestone "${removed.title}" deleted`, 'info');
  return true;
}

// Re-render whichever view the user is on. The Gantt appears in: dashboard,
// subprojects (active sp view), and overview. Each has its own render fn;
// fall back to the global render() if none match.
function rerenderAfterMilestoneChange() {
  if (state.view === 'dashboard' && typeof renderDashboard === 'function') return renderDashboard();
  if (state.view === 'subprojects' && state.activeSubproject && typeof renderSubprojects === 'function') return renderSubprojects();
  if (state.view === 'overview' && typeof renderOverview === 'function') return renderOverview();
  if (typeof render === 'function') render();
}

// Modal for create + edit. `existing` is null for create, milestone object for edit.
// `defaults` lets the caller pre-fill (e.g. date from a right-clicked Gantt cell).
function showMilestoneModal(existing, defaults) {
  const proj = getProject();
  const sps = proj.subprojects || [];
  const isEdit = !!existing;
  const m = existing || {};
  const initial = {
    title: m.title || '',
    date: m.date || (defaults && defaults.date) || toDateString(new Date()),
    subprojectId: m.subprojectId || (defaults && defaults.subprojectId) || '',
    color: m.color || (defaults && defaults.color) || MILESTONE_COLORS[0],
    note: m.note || ''
  };

  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = `
    <div class="modal milestone-modal">
      <h3>${isEdit ? 'Edit milestone' : 'New milestone'}</h3>
      <div class="form-group">
        <label class="form-label" for="ms-title">Title</label>
        <input type="text" class="form-input" id="ms-title" value="${escapeHTML(initial.title)}" placeholder="e.g. Launch v1">
      </div>
      <div class="form-group ms-row-2">
        <div style="flex:1">
          <label class="form-label" for="ms-date">Date</label>
          <input type="date" class="form-input" id="ms-date" value="${escapeHTML(initial.date)}">
        </div>
        <div style="flex:1">
          <label class="form-label" for="ms-color">Color</label>
          <div class="ms-color-row">
            <input type="color" class="form-input ms-color-input" id="ms-color" value="${escapeHTML(initial.color)}">
            <div class="ms-color-swatches">
              ${MILESTONE_COLORS.map(c => `<button type="button" class="ms-color-swatch" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="ms-sp">Subproject (optional — leave blank for project-level)</label>
        <select class="form-select" id="ms-sp">
          <option value="">— Project-level —</option>
          ${sps.map(sp => `<option value="${sp.id}" ${initial.subprojectId === sp.id ? 'selected' : ''}>${escapeHTML(sp.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="ms-note">Note (optional)</label>
        <input type="text" class="form-input" id="ms-note" value="${escapeHTML(initial.note)}" placeholder="One-line context…">
      </div>
      <div class="modal-buttons">
        ${isEdit ? `<button class="btn btn-danger" id="ms-delete" style="margin-right:auto">Delete</button>` : ''}
        <button class="btn btn-secondary" id="ms-cancel">Cancel</button>
        <button class="btn btn-primary" id="ms-save">${isEdit ? 'Save' : 'Add'}</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');

  const titleEl = document.getElementById('ms-title');
  const dateEl  = document.getElementById('ms-date');
  const spEl    = document.getElementById('ms-sp');
  const colorEl = document.getElementById('ms-color');
  const noteEl  = document.getElementById('ms-note');
  titleEl.focus();
  titleEl.select();

  overlay.querySelectorAll('.ms-color-swatch').forEach(btn => {
    btn.addEventListener('click', () => { colorEl.value = btn.dataset.color; });
  });

  const close = () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    overlay.onclick = null;
  };
  const commit = () => {
    const title = titleEl.value.trim();
    const date  = dateEl.value;
    if (!title) { showToast('Milestone needs a title.', 'error'); titleEl.focus(); return; }
    if (!date)  { showToast('Milestone needs a date.', 'error'); dateEl.focus(); return; }
    const patch = {
      title, date,
      subprojectId: spEl.value || null,
      color: colorEl.value,
      note: noteEl.value.trim()
    };
    if (isEdit) updateMilestone(existing.id, patch);
    else addMilestone(patch);
    close();
  };

  document.getElementById('ms-save').onclick = commit;
  document.getElementById('ms-cancel').onclick = close;
  if (isEdit) {
    document.getElementById('ms-delete').onclick = () => {
      close();
      showConfirmModal({
        title: 'Delete milestone',
        body: `Delete milestone "${escapeHTML(existing.title)}"? This cannot be undone via the milestone modal (use ⌘Z if needed).`,
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: () => deleteMilestone(existing.id)
      });
    };
  }
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  // Enter in title/date/note submits; date input swallows Enter on some browsers, but title is the focused default.
  [titleEl, noteEl].forEach(el => el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  }));
}

// Right-click menu on a Gantt container. Mirrors the brainmap context-menu
// pattern in src/07-spark-map.js: a DOM div appended to body, dismissed by
// outside-click / Escape / blur. When the click lands on an existing milestone
// glyph (data-milestone-id), shows Edit/Delete; otherwise shows "Add milestone
// here" with date prefilled from the clicked column.
function hideGanttContextMenu() {
  const m = document.getElementById('gantt-context-menu');
  if (m) m.remove();
  document.removeEventListener('mousedown', ganttContextMenuOutsideHandler, true);
  document.removeEventListener('keydown', ganttContextMenuKeyHandler, true);
  window.removeEventListener('blur', hideGanttContextMenu);
}
function ganttContextMenuOutsideHandler(e) {
  const m = document.getElementById('gantt-context-menu');
  if (m && !m.contains(e.target)) hideGanttContextMenu();
}
function ganttContextMenuKeyHandler(e) {
  if (e.key === 'Escape') { e.preventDefault(); hideGanttContextMenu(); }
}

function showGanttContextMenu(clientX, clientY, payload) {
  hideGanttContextMenu();
  const onExisting = !!(payload && payload.milestoneId);
  const menu = document.createElement('div');
  menu.id = 'gantt-context-menu';
  menu.className = 'bm-context-menu';
  menu.innerHTML = onExisting
    ? `
      <button class="bm-ctx-item" data-action="edit">
        <span class="bm-ctx-icon">✎</span><span>Edit milestone</span>
      </button>
      <div class="bm-ctx-divider"></div>
      <button class="bm-ctx-item bm-ctx-danger" data-action="delete">
        <span class="bm-ctx-icon">✕</span><span>Delete milestone</span>
      </button>`
    : `
      <button class="bm-ctx-item" data-action="add">
        <span class="bm-ctx-icon">◆</span><span>Add milestone here${payload && payload.date ? ` (${formatDate(payload.date)})` : ''}</span>
      </button>`;
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  const x = Math.min(clientX, window.innerWidth - rect.width - 8);
  const y = Math.min(clientY, window.innerHeight - rect.height - 8);
  menu.style.left = `${Math.max(4, x)}px`;
  menu.style.top  = `${Math.max(4, y)}px`;

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('.bm-ctx-item');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.action;
    hideGanttContextMenu();
    if (action === 'add') {
      showMilestoneModal(null, { date: payload && payload.date, subprojectId: payload && payload.subprojectId });
    } else if (action === 'edit') {
      const ms = getProjectMilestones().find(x => x.id === payload.milestoneId);
      if (ms) showMilestoneModal(ms);
    } else if (action === 'delete') {
      const ms = getProjectMilestones().find(x => x.id === payload.milestoneId);
      if (!ms) return;
      showConfirmModal({
        title: 'Delete milestone',
        body: `Delete milestone "${escapeHTML(ms.title)}"?`,
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: () => deleteMilestone(ms.id)
      });
    }
  });

  setTimeout(() => {
    document.addEventListener('mousedown', ganttContextMenuOutsideHandler, true);
    document.addEventListener('keydown', ganttContextMenuKeyHandler, true);
    window.addEventListener('blur', hideGanttContextMenu);
  }, 0);
}

// Renders a Variant-D milestone marker (thin vertical line + side label).
// `labelWidth` is the fallback for the CSS var --gantt-label-w (the user can
// drag-resize the label column, so the rendered position must use the live
// CSS var to stay aligned with the day grid — same trick the today-line uses).
// `pinSide` ('right'|'left') flips the label so it doesn't run off the right edge.
function milestoneMarkerHTML(ms, labelWidth, colW, idx, pinSide) {
  const offset = idx * colW + colW / 2;
  const leftCss = `calc(var(--gantt-label-w, ${labelWidth}px) + ${offset}px)`;
  const sideClass = pinSide === 'left' ? 'gantt-ms-label-left' : '';
  const tooltip = `${ms.title} — ${formatDate(ms.date)}${ms.note ? ' · ' + ms.note : ''}`;
  return `
    <div class="gantt-ms-vline" data-milestone-id="${ms.id}" style="left:${leftCss};background:${ms.color}" title="${escapeHTML(tooltip)}"></div>
    <div class="gantt-ms-side-label ${sideClass}" data-milestone-id="${ms.id}" style="left:${leftCss};color:${ms.color};border-color:${ms.color}" title="${escapeHTML(tooltip)}">
      <span class="gantt-ms-diamond" style="background:${ms.color}"></span>${escapeHTML(ms.title)}
    </div>`;
}

// Wires the right-click context menu on the Gantt container and the click
// handler on existing milestone markers. Reads layout + scope from the
// container's dataset so a single helper covers dashboard, subproject view,
// and any future Gantt instance. Re-callable safely — listeners are
// attached idempotently using a dataset flag.
function bindGanttMilestones(containerEl) {
  if (!containerEl) return;
  const COL_W = parseInt(containerEl.dataset.ganttColW, 10) || 28;
  const LABEL_W = parseInt(containerEl.dataset.ganttLabelW, 10) || 180;
  const W_START = containerEl.dataset.ganttWStart;
  const totalDays = parseInt(containerEl.dataset.ganttTotalDays, 10) || 0;
  const scopedSpId = containerEl.dataset.ganttSpId || null;

  if (containerEl.dataset.msBound === '1') return;
  containerEl.dataset.msBound = '1';

  containerEl.addEventListener('contextmenu', (e) => {
    const inner = containerEl.querySelector('.gantt-inner');
    if (!inner) return;
    const target = e.target.closest('[data-milestone-id]');
    if (target) {
      e.preventDefault();
      showGanttContextMenu(e.clientX, e.clientY, { milestoneId: target.dataset.milestoneId });
      return;
    }
    const innerRect = inner.getBoundingClientRect();
    const x = e.clientX - innerRect.left + (containerEl.scrollLeft || 0);
    if (x < LABEL_W) return; // label column — let native menu through
    const dayIdx = Math.floor((x - LABEL_W) / COL_W);
    if (dayIdx < 0 || dayIdx >= totalDays) return;
    if (!W_START) return;
    const start = new Date(W_START); start.setHours(0,0,0,0);
    start.setDate(start.getDate() + dayIdx);
    e.preventDefault();
    showGanttContextMenu(e.clientX, e.clientY, { date: toDateString(start), subprojectId: scopedSpId || null });
  });

  // Click on an existing milestone glyph opens edit.
  containerEl.addEventListener('click', (e) => {
    const target = e.target.closest('[data-milestone-id]');
    if (!target) return;
    e.stopPropagation();
    const ms = getProjectMilestones().find(x => x.id === target.dataset.milestoneId);
    if (ms) showMilestoneModal(ms);
  });
}

// Binds milestone interactivity on every Gantt container under `root`.
// Containers tagged with data-ms-gantt opt in; those without (e.g. the
// cross-project overview gantts) stay read-only. Also wires the overview-bar
// "Next milestone" pill (rendered as a sibling above the container).
function bindAllGanttMilestones(root) {
  root = root || document;
  root.querySelectorAll('[data-ms-gantt="1"]').forEach(el => bindGanttMilestones(el));
  root.querySelectorAll('.gantt-ov-bar [data-ov-milestone-id]').forEach(el => {
    if (el.dataset.ovBound === '1') return;
    el.dataset.ovBound = '1';
    el.addEventListener('click', () => {
      const ms = getProjectMilestones().find(x => x.id === el.dataset.ovMilestoneId);
      if (ms) showMilestoneModal(ms);
    });
  });
}

// Renders the one-line overview pills sitting at the top of a Gantt chart.
// Counts are computed against todos in scope (already filtered to !done by the
// caller's `scopedOpenDated` — open + has a date). Picks the next milestone
// (date >= today) for the highlighted "Next" pill. Returns '' if everything
// is zero (nothing to summarize).
function ganttOverviewLineHTML(scopedOpenDated, scopedMilestones, wStart, wEnd) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = toDateString(today);
  let overdue = 0, todayCount = 0, upcoming = 0;
  for (const t of scopedOpenDated) {
    const ds = t.dueDate || t.startDate;
    if (!ds) continue;
    const d = new Date(ds); d.setHours(0, 0, 0, 0);
    if (d < today) overdue++;
    else if (ds === todayStr) todayCount++;
    else upcoming++;
  }
  // Pick the next milestone: earliest with date >= today. If a milestone is
  // exactly today, prefer it over future ones.
  let nextMs = null;
  for (const m of scopedMilestones) {
    if (!m || !m.date) continue;
    if (m.date < todayStr) continue;
    if (!nextMs || m.date < nextMs.date) nextMs = m;
  }
  const nextLabel = nextMs ? milestoneRelativeLabel(nextMs.date, today) : null;

  // Date range — short format like "16 May → 1 Sep".
  const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const range = (wStart && wEnd) ? `${fmt(wStart)} → ${fmt(wEnd)}` : '';

  const parts = [];
  if (overdue)     parts.push(`<span class="gantt-ov-pill gantt-ov-overdue" title="${overdue} open todo${overdue===1?'':'s'} past their due date">⚠ ${overdue} overdue</span>`);
  if (todayCount)  parts.push(`<span class="gantt-ov-pill gantt-ov-today" title="${todayCount} open todo${todayCount===1?'':'s'} due today">◷ ${todayCount} today</span>`);
  if (upcoming)    parts.push(`<span class="gantt-ov-pill gantt-ov-open" title="${upcoming} open todo${upcoming===1?'':'s'} in the future">${upcoming} upcoming</span>`);
  if (nextMs) {
    if (parts.length) parts.push('<span class="gantt-ov-sep">·</span>');
    parts.push(`<span class="gantt-ov-pill gantt-ov-milestone" data-ov-milestone-id="${nextMs.id}" title="${escapeHTML(nextMs.title)} — ${formatDate(nextMs.date)} · click to edit">
      <span class="gantt-ov-diamond" style="background:${nextMs.color}"></span>
      Next: ${escapeHTML(nextMs.title)} · ${escapeHTML(nextLabel)}
    </span>`);
  }
  if (!parts.length && !range) return '';
  // If we have nothing but a range, still render so the bar is consistent.
  if (!parts.length) parts.push('<span class="gantt-ov-empty">All clear — nothing due, nothing overdue.</span>');

  return `<div class="gantt-ov-bar">
    ${parts.join('')}
    ${range ? `<span class="gantt-ov-range">${range}</span>` : ''}
  </div>`;
}

// "today" | "tomorrow" | "in 5d" | "Xd ago" — short relative label for a YYYY-MM-DD
// date measured from `today` (a local-midnight Date).
function milestoneRelativeLabel(dateStr, today) {
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  const days = Math.round((d - today) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 0) return `in ${days}d`;
  return `${-days}d ago`;
}

// ===== GANTT =====
function ganttHTML(spId) {
  const todos = getSubprojectTodos(spId).filter(t => t.startDate || t.dueDate);
  const milestones = getMilestonesForScope(spId);
  if (!todos.length && !milestones.length) {
    return `<div class="gantt-empty" style="background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius)">
      Add <strong>start</strong> and <strong>due dates</strong> to todos to see them on the timeline, or add a milestone via the <strong>◆ + Milestone</strong> button.
    </div>`;
  }

  const DAY_MS = 86400000;
  const COL_W  = 28;
  const LABEL_W = 180;

  // Window expands to fit both todo dates and milestone dates so milestones
  // outside the todo range still land on the visible timeline.
  const todoDates = todos.flatMap(t => [t.startDate, t.dueDate].filter(Boolean));
  const msDates = milestones.map(m => m.date).filter(Boolean);
  const allDates = [...todoDates, ...msDates].map(s => {
    const d = new Date(s); d.setHours(0,0,0,0); return d;
  });
  // Fallback when there are only milestones: anchor the window around today.
  if (!allDates.length) {
    const t0 = new Date(); t0.setHours(0,0,0,0);
    allDates.push(t0);
  }
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

  // Pre-compute milestone indices + label-side flip (flip to left when too
  // close to the right edge, so the floating label doesn't run off-screen).
  const FLIP_THRESHOLD_DAYS = 8;
  const milestoneMarkers = milestones
    .map(m => {
      const d = new Date(m.date); d.setHours(0,0,0,0);
      const idx = Math.round((d - wStart) / DAY_MS);
      if (idx < 0 || idx >= totalDays) return null;
      const pinSide = (totalDays - idx) <= FLIP_THRESHOLD_DAYS ? 'left' : 'right';
      return { m, idx, pinSide };
    })
    .filter(Boolean);

  const scopedOpenDated = todos.filter(t => !t.done);
  const overviewBar = ganttOverviewLineHTML(scopedOpenDated, milestones, wStart, wEnd);

  return `${overviewBar}<div class="gantt-container ${overviewBar ? 'gantt-has-overview' : ''}" id="gantt-container" data-ms-gantt="1"
        data-gantt-col-w="${COL_W}" data-gantt-label-w="${LABEL_W}"
        data-gantt-total-days="${totalDays}" data-gantt-w-start="${toDateString(wStart)}"
        data-gantt-sp-id="${escapeHTML(spId || '')}">
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
        ${milestoneMarkers.map(({m, idx, pinSide}) => milestoneMarkerHTML(m, LABEL_W, COL_W, idx, pinSide)).join('')}
        ${sorted.map(t => {
          const tS = new Date(t.startDate || t.dueDate); tS.setHours(0,0,0,0);
          const tE = new Date(t.dueDate || t.startDate); tE.setHours(0,0,0,0);
          const si = Math.max(0, Math.round((tS - wStart) / DAY_MS));
          const ei = Math.min(totalDays - 1, Math.round((tE - wStart) / DAY_MS));
          const barLeft  = si * COL_W;
          const barWidth = Math.max(COL_W - 2, (ei - si + 1) * COL_W - 2);
          const linked = getNotesLinkedToTodo(t.id);
          return `<div class="gantt-row" data-todo-id="${t.id}">
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
  const milestones = Array.isArray(proj.milestones) ? proj.milestones : [];
  if (!todos.length && !milestones.length) {
    return `<div class="gantt-empty" style="background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius)">
      Add <strong>start</strong> and <strong>due dates</strong> to todos to see them on the timeline, or add a milestone via the <strong>◆ + Milestone</strong> button.
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
    const todoDates = todos.flatMap(t => [t.startDate, t.dueDate].filter(Boolean));
    const msDates = milestones.map(m => m.date).filter(Boolean);
    const allDates = [...todoDates, ...msDates].map(s => {
      const d = new Date(s); d.setHours(0,0,0,0); return d;
    });
    if (!allDates.length) {
      const t0 = new Date(); t0.setHours(0,0,0,0);
      allDates.push(t0);
    }
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

  // Milestones rendered on the overview Gantt: all of the project's milestones
  // (project-level + subproject-attached). Same flip logic as ganttHTML.
  const FLIP_THRESHOLD_DAYS = 8;
  const milestoneMarkers = milestones
    .map(m => {
      const d = new Date(m.date); d.setHours(0,0,0,0);
      const idx = Math.round((d - wStart) / DAY_MS);
      if (idx < 0 || idx >= totalDays) return null;
      const pinSide = (totalDays - idx) <= FLIP_THRESHOLD_DAYS ? 'left' : 'right';
      return { m, idx, pinSide };
    })
    .filter(Boolean);

  // Overview line — `todos` is already !done and dated (see filter at top).
  const overviewBar = ganttOverviewLineHTML(todos, milestones, wStart, wEnd);
  if (overviewBar) containerClasses.push('gantt-has-overview');

  return `${overviewBar}<div class="${containerClasses.join(' ')}" data-ms-gantt="1"
        data-gantt-col-w="${COL_W}" data-gantt-label-w="${LABEL_W}"
        data-gantt-total-days="${totalDays}" data-gantt-w-start="${toDateString(wStart)}"
        data-gantt-proj-key="${escapeHTML(projectKey || '')}">
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
        ${milestoneMarkers.map(({m, idx, pinSide}) => milestoneMarkerHTML(m, LABEL_W, COL_W, idx, pinSide)).join('')}
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

// Auto-scroll every Gantt container to its "focus" day. Rule:
//   - If any open (not done) todo in the container's scope has a date in the
//     past, focus the OLDEST such todo (so overdue work is in view first).
//   - Otherwise focus today.
// Scope comes from the container's dataset: a subproject-specific Gantt
// filters to that subproject; a dashboard Gantt uses the whole active project.
// Overview Gantts (different project from state.project) are skipped — they
// belong to a non-active project and we don't have the user's context to
// decide their focus.
function scrollGanttToFocus() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const proj = (state && state.data) ? getProject() : null;
  document.querySelectorAll('[data-ms-gantt="1"]').forEach(container => {
    const wStartStr = container.dataset.ganttWStart;
    if (!wStartStr) return;
    const projKey = container.dataset.ganttProjKey;
    if (projKey && projKey !== state.project) return;

    const spId = container.dataset.ganttSpId || null;
    let focus = today;
    let focusTodoId = null;
    if (proj && Array.isArray(proj.todos)) {
      const scoped = spId ? proj.todos.filter(t => t.subprojectId === spId) : proj.todos;
      let earliest = null;
      let earliestTodo = null;
      for (const t of scoped) {
        if (t.done) continue;
        const ds = t.startDate || t.dueDate;
        if (!ds) continue;
        const d = new Date(ds); d.setHours(0, 0, 0, 0);
        if (d < today && (!earliest || d < earliest)) { earliest = d; earliestTodo = t; }
      }
      if (earliest) { focus = earliest; focusTodoId = earliestTodo.id; }
    }

    const wStart = new Date(wStartStr); wStart.setHours(0, 0, 0, 0);
    const COL_W = parseInt(container.dataset.ganttColW, 10) || 28;
    const totalDays = parseInt(container.dataset.ganttTotalDays, 10) || 0;
    let idx = Math.round((focus - wStart) / 86400000);
    if (idx < 0) idx = 0;
    else if (idx >= totalDays) idx = Math.max(0, totalDays - 1);

    // Use the live label width (the column is user-resizable via the drag handle).
    const labelEl = container.querySelector('.gantt-header-labels');
    const fallback = parseInt(container.dataset.ganttLabelW, 10) || 180;
    const actualLabelW = labelEl ? labelEl.getBoundingClientRect().width : fallback;
    const targetLeft = actualLabelW + idx * COL_W + COL_W / 2;
    container.scrollLeft = Math.max(0, targetLeft - container.clientWidth / 2);

    // Vertical scroll: if the focus is an overdue todo, center its row in view.
    if (focusTodoId) {
      const row = container.querySelector(`[data-todo-id="${focusTodoId}"]`);
      if (row) {
        const rowRect = row.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const offsetTop = rowRect.top - containerRect.top + container.scrollTop;
        container.scrollTop = Math.max(0, offsetTop - container.clientHeight / 2 + rowRect.height / 2);
      }
    }
  });
}

// ===== REMINDERS =====
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
    tags: [],
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
  const keys = ['task','delegated_to','delegated_on','due_date','context','notes','commitment_id','tags'];
  let changed = false;
  keys.forEach(k => {
    if (patch[k] === undefined) return;
    let next = patch[k];
    if (k === 'tags') {
      next = Array.isArray(next) ? next : parseTagsString(next);
      const prev = d.tags || [];
      if (prev.length === next.length && prev.every((v, i) => v === next[i])) return;
      d.tags = next; changed = true; return;
    }
    if (next !== d[k]) { d[k] = next; changed = true; }
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
      <div class="del-edit-row">
        <label class="del-edit-label">Tags</label>
        <input type="text" class="form-input del-edit-field entity-tags-input" data-del-field="tags" placeholder="comma-separated" list="all-workspace-tags" value="${escapeHTML((d.tags || []).join(', '))}">
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
      <span class="del-task">${decoratePlainTextMentions(d.task)}</span>
      ${stale ? `<span class="del-badge del-badge-stale" title="Last update ${daysSinceUpdate}d ago">⏰ Nudge due</span>` : ''}
      ${overdue ? `<span class="del-badge del-badge-overdue">⚠ Overdue</span>` : ''}
    </div>
    <div class="del-card-meta">
      <span class="del-person">👤 ${decoratePlainTextMentions(d.delegated_to)}</span>
      ${d.due_date ? `<span class="del-due ${overdue?'overdue':''}">📅 ${formatDate(d.due_date)}</span>` : ''}
      <span class="del-last-update ${stale?'stale':''}">↻ ${daysSinceUpdate!=null ? `${daysSinceUpdate}d ago` : 'never'}</span>
    </div>
    ${(() => {
      const linksChip = genericLinksChip('delegation', d.id);
      const tagsHTML = entityTagsHTML(d.tags);
      if (!d.context && !linkedCommitment && !linksChip && !tagsHTML) return '';
      return `<div class="del-chips">
        ${d.context ? `<span class="del-context">${escapeHTML(d.context)}</span>` : ''}
        ${linkedCommitment ? `<span class="del-commitment-link" title="Linked commitment">↔ ${escapeHTML(linkedCommitment.counterparty)}</span>` : ''}
        ${linksChip}
        ${tagsHTML}
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
                    <input type="text" class="form-input entity-tags-input" id="del-add-tags" placeholder="Tags (comma)" list="all-workspace-tags">
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
    const tags = parseTagsString(document.getElementById('del-add-tags')?.value || '');
    if (!task.trim() || !person.trim()) {
      showToast('Task and person are required.', 'error');
      return;
    }
    const d = addDelegation({ task, delegated_to: person, due_date: due, context: ctx });
    if (d && tags.length) { d.tags = tags; saveData(); }
    showToast('Delegation added.', 'success');
    renderDelegations();
  };
  document.getElementById('btn-del-add')?.addEventListener('click', submitAdd);
  ['del-add-task','del-add-person','del-add-context','del-add-tags'].forEach(id =>
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
    tags: [],
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
  const keys = ['direction','counterparty','description','due_date','context','notes','tags'];
  let changed = false;
  for (const k of keys) {
    if (patch[k] === undefined) continue;
    let next = patch[k];
    if (k === 'tags') {
      next = Array.isArray(next) ? next : parseTagsString(next);
      const prev = c.tags || [];
      if (prev.length === next.length && prev.every((v, i) => v === next[i])) continue;
      c.tags = next; changed = true; continue;
    }
    if (next !== c[k]) { c[k] = next; changed = true; }
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
      <div class="com-edit-row">
        <label class="com-edit-label">Tags</label>
        <input type="text" class="form-input com-edit-field entity-tags-input" data-com-field="tags" placeholder="comma-separated" list="all-workspace-tags" value="${escapeHTML((c.tags || []).join(', '))}">
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
      <span class="com-counterparty">${decoratePlainTextMentions(c.counterparty)}</span>
      ${overdue ? `<span class="com-badge com-badge-overdue">⚠ Overdue</span>` : ''}
      ${c.status === 'fulfilled' ? `<span class="com-badge com-badge-done">✓ Fulfilled</span>` : ''}
      ${c.status === 'cancelled' ? `<span class="com-badge com-badge-cancelled">✕ Cancelled</span>` : ''}
    </div>
    <div class="com-description">${decoratePlainTextMentions(c.description)}</div>
    <div class="com-meta">
      <span class="com-due ${overdue ? 'overdue' : ''}">📅 ${dueDisplay}</span>
      ${c.context ? `<span class="com-context">${escapeHTML(c.context)}</span>` : ''}
      ${genericLinksChip('commitment', c.id)}
      ${entityTagsHTML(c.tags)}
    </div>
    ${c.notes ? `<div class="com-notes">${decoratePlainTextMentions(c.notes)}</div>` : ''}
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
            <input type="text" class="form-input entity-tags-input" id="com-tags" placeholder="Tags (comma)" list="all-workspace-tags" style="flex:1;min-width:140px">
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
    const tags = parseTagsString(document.getElementById('com-tags')?.value || '');
    if (!counterparty.trim() || !description.trim()) {
      showToast('Counterparty and description are required.', 'error');
      return;
    }
    const c = addCommitment({ direction: selectedDirection, counterparty, description, due_date, context, notes });
    if (c && tags.length) { c.tags = tags; saveData(); }
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
            <div class="form-group"><label class="form-label">Tags</label>
              <input type="text" class="form-input entity-tags-input" id="rem-tags" placeholder="comma-separated" list="all-workspace-tags"></div>
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
      <div class="reminder-title">${decoratePlainTextMentions(r.title)}${r.recurrence ? ` <span class="reminder-recur-chip" data-rem-recur="${r.id}" title="${escapeHTML(describeRecurrence(r.recurrence))} · click to edit">🔁 ${escapeHTML(describeRecurrence(r.recurrence))}</span>` : ''}</div>
      <div class="reminder-time">${formatDateTime(r.datetime)}${linksChip ? ` ${linksChip}` : ''}</div>
      ${r.note ? `<div class="reminder-note">${decoratePlainTextMentions(r.note)}</div>` : ''}
      ${(r.tags && r.tags.length) ? `<div class="entity-tags-row">${entityTagsHTML(r.tags)}</div>` : ''}
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
  const tags = parseTagsString(document.getElementById('rem-tags')?.value || '');
  const reminder = { id: generateId('rem'), title, note, datetime, fired: false, tags };
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

// ===== BOOT =====
window.addEventListener('DOMContentLoaded', init);
