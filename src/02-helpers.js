'use strict';

// ===== src/02-helpers.js =====
// Wave-1 extraction (M0): pure utility helpers — id/escape/date/priority
// formatters, the workspace-wide tag toolkit, and the getProject() shortcut.
// All function declarations are already global at script top-level. The one
// top-level const (_TAG_TARGET_COLLECTIONS) is converted to var — it is read
// only by setEntityTags inside this same file today, but the var keeps the
// declaration consistent with the cross-file visibility rule, and lets a
// future caller in another module reference it without surprises.
//
// renderTagsView, tagMatchRowHTML, and navigateToTagMatch stay in residual
// app.js because they are view code, not utilities.
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

// Workspace-wide pool of unique tags (lowercased for de-dup; stored case
// is whatever the user first typed). Skips archived projects. Used for
// autocomplete suggestions, the Tags view, and the palette filter.
function getAllWorkspaceTags() {
  const seen = new Map();  // lowercased → original-case
  for (const proj of Object.values(state.data.projects || {})) {
    if (proj.archived) continue;
    const collect = (arr) => (arr || []).forEach(item => {
      (item.tags || []).forEach(t => {
        const key = String(t).toLowerCase();
        if (!seen.has(key)) seen.set(key, String(t));
      });
    });
    collect(proj.todos);
    collect(proj.notes);
    collect(proj.commitments);
    collect(proj.delegations);
    collect(proj.reminders);
    collect(proj.dumps);
  }
  return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
}

// Parse a comma-separated string of tags into an array. Trims, drops
// empties, dedups case-insensitively while keeping the original casing
// of the first occurrence.
function parseTagsString(str) {
  const out = [];
  const seen = new Set();
  for (const raw of String(str || '').split(',')) {
    const t = raw.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

// Find an entity by type + id in the active project, replace its tags
// with the parsed array, save. Returns true on change.
var _TAG_TARGET_COLLECTIONS = {
  todo: 'todos', note: 'notes', reminder: 'reminders',
  commitment: 'commitments', delegation: 'delegations', dump: 'dumps'
};
function setEntityTags(entityType, entityId, tagsArr) {
  const proj = getProject();
  const coll = _TAG_TARGET_COLLECTIONS[entityType];
  if (!coll) return false;
  const item = (proj[coll] || []).find(x => x.id === entityId);
  if (!item) return false;
  const next = Array.isArray(tagsArr) ? tagsArr : parseTagsString(tagsArr);
  const prev = item.tags || [];
  if (prev.length === next.length && prev.every((v, i) => v === next[i])) return false;
  item.tags = next;
  if (entityType === 'note') item.updated = new Date().toISOString();
  saveData();
  return true;
}

// Workspace-wide tag → count map, sorted by count desc then alphabetical.
// Used by the Tags view's cloud header. Original casing is preserved from
// the first occurrence (matching getAllWorkspaceTags' policy).
function getTagCounts() {
  const counts = new Map();
  for (const proj of Object.values(state.data.projects || {})) {
    if (proj.archived) continue;
    const collect = (arr) => (arr || []).forEach(item => (item.tags || []).forEach(t => {
      const key = String(t).toLowerCase();
      const cur = counts.get(key) || { count: 0, label: String(t) };
      cur.count += 1;
      counts.set(key, cur);
    }));
    collect(proj.todos);
    collect(proj.notes);
    collect(proj.commitments);
    collect(proj.delegations);
    collect(proj.reminders);
    collect(proj.dumps);
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

// Returns a flat list of every taggable entity (across types and projects)
// matching `tag` case-insensitively. Each row carries enough metadata for
// the Tags view to navigate to its native surface.
function getEntitiesByTag(tag) {
  const lc = String(tag || '').toLowerCase();
  if (!lc) return [];
  const out = [];
  const types = [
    { coll: 'todos',       kind: 'todo' },
    { coll: 'notes',       kind: 'note' },
    { coll: 'commitments', kind: 'commitment' },
    { coll: 'delegations', kind: 'delegation' },
    { coll: 'reminders',   kind: 'reminder' },
    { coll: 'dumps',       kind: 'dump' }
  ];
  for (const [pkey, proj] of Object.entries(state.data.projects || {})) {
    if (proj.archived) continue;
    const projInfo = { key: pkey, name: proj.name, color: proj.color || '#16a34a' };
    for (const { coll, kind } of types) {
      (proj[coll] || []).forEach(item => {
        if ((item.tags || []).some(t => String(t).toLowerCase() === lc)) {
          out.push({ kind, item, project: projInfo });
        }
      });
    }
  }
  return out;
}

// Renders the `#tagN` chips for any entity that has tags. Reuses the
// existing `.tag-chip` class used in the notes list. Empty arrays return
// '' so callers can drop the call inline without a guard. The
// data-entity-tag attribute is the click hook for the workspace Tags
// view (stage 4) and palette filter (stage 5).
function entityTagsHTML(tags) {
  if (!Array.isArray(tags) || tags.length === 0) return '';
  return tags.map(t =>
    `<button class="tag-chip" data-entity-tag="${escapeHTML(t)}" type="button" title="Filter by #${escapeHTML(t)}">#${escapeHTML(t)}</button>`
  ).join('');
}

// Compact colored-dot variant of the priority pill. The native <select>
// stays so the dropdown picker is free; styling collapses it to a circle
// with the priority color. Tooltip surfaces the current priority text
// since it's no longer visible in the chip itself.
function priorityBadgeEditable(todoId, p) {
  const cur = ['high','medium','low'].includes(p) ? p : 'low';
  const cls = { high:'badge-high', medium:'badge-medium', low:'badge-low' }[cur];
  const lbl = { high: 'High', medium: 'Medium', low: 'Low' }[cur];
  return `<select class="todo-priority-dot ${cls} todo-priority-select" data-id="${todoId}" title="Priority: ${lbl} — click to change" aria-label="Priority: ${lbl}">
    <option value="high" ${cur==='high'?'selected':''}>🔴 High</option>
    <option value="medium" ${cur==='medium'?'selected':''}>🟡 Medium</option>
    <option value="low" ${cur==='low'?'selected':''}>🟢 Low</option>
  </select>`;
}

function getProject() { return state.data.projects[state.project]; }
