'use strict';

// ===== src/01-types-state.js =====
// Wave-1 extraction (M0 of the master plan): TYPE DEFINITIONS, STATE singleton,
// and the project color tables. Top-level "const" declarations referenced from
// other modules (state, SUBPROJECT_COLORS, PROJECT_COLORS, LEGACY_PROJECT_COLORS)
// are converted to "var" so they land on globalThis when the script tag loads
// and resolve identically from every other src/ module and from app.js.
//
// Function declarations (getAllProjectColorOptions) are already global at script
// top-level and need no conversion.

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
 * @property {'escalation'|string} [kind]  Generic categorization. 'escalation' = spawned from an escalation chain.
 * @property {string} [chainId]            Set when kind === 'escalation'; foreign key into data.escalationChains.
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
 * @typedef {Object} Milestone
 * A fixed-date marker on the Gantt timeline. Separate from todos by design:
 * milestones are points in time, not actionable items. Rendered as a vertical
 * line + side label across the Gantt body. Created via the `+ Milestone`
 * toolbar button, right-clicking the Gantt, or typing `/milestone` in the
 * new-todo input (which converts the entry into a Milestone using `/due` for
 * the date).
 * @property {string} id
 * @property {string} title
 * @property {string} date              YYYY-MM-DD
 * @property {string|null} subprojectId null = project-level (shows on every subproject's Gantt + the overview)
 * @property {string} color             Hex; defaults to a milestone palette color
 * @property {string} [note]            Optional one-liner
 * @property {string} created           ISO timestamp
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
 * @property {Milestone[]} milestones
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
 * @typedef {Object} Offset
 * Time offset for an escalation chain item, applied to a spawn anchor date.
 * Exactly one of `days` or `workdays` is the primary magnitude (XOR — both
 * set is invalid; both zero is treated as no-offset). `plusWorkdays` is an
 * optional non-negative tail of additional working days added AFTER the
 * primary, used to express patterns like "+14 calendar days then +3 working
 * days". Negatives are clamped to 0 by applyOffset.
 * @property {number} [days]           Calendar-day primary offset.
 * @property {number} [workdays]       Working-day primary offset (skips Sat/Sun).
 * @property {number} [plusWorkdays]   Additional workdays appended after the primary.
 */

/**
 * @typedef {Object} EscalationChainItem
 * @property {string} title            Verbatim title for the spawned todo.
 * @property {Offset} offset           Anchor-relative due date.
 */

/**
 * @typedef {Object} EscalationChain
 * @property {string} id               Stable id (generateId('chain') for user-created;
 *   'chain-rueckbucher-legacy' for the one-shot v2 migration synthesis;
 *   'chain-example-3-step' for the fresh-install seed).
 * @property {string} name             User-editable display name.
 * @property {EscalationChainItem[]} items
 */

/**
 * @typedef {Object} WorkspaceData
 * @property {number} schemaVersion         Bumped on each one-shot migration. v2 = escalation chains.
 * @property {string} [activeProject]
 * @property {Object<string, Project>} projects
 * @property {PinnedItem[]} pinned
 * @property {EscalationChain[]} escalationChains   Workspace-wide chain definitions.
 */

// ===== STATE =====
var state = {
  data: null,
  project: 'energy-hero',
  view: 'dashboard',
  editingNote: null,       // null | 'new' | noteId
  noteSearch: '',
  todayFilter: new Set(),  // {} or Set of 'overdue'|'today'|'reminders'|'waiting'|'upcoming'
  selectedTodos: new Set(),  // ids of bulk-selected todos in current project
  selectedNotes: new Set(),  // ids of bulk-selected notes in current project
  // Anchor row per list kind, used for Shift+Click range select like Windows
  // Explorer. Null until the user clicks a row plain or with Ctrl. Cleared
  // alongside the matching selection set on project switch / view leave.
  bulkAnchors: { todos: null, notes: null },
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
  // Overview "What needs you now" inbox: one of 'overdue'|'today'|'week'|'waiting'.
  // null → render-time picks the highest-priority non-empty tab.
  overviewInboxTab: null,
  pendingTodoRecurrence: null,
  pendingReminderRecurrence: null,
  pendingDumpSubprojectId: null,
  stickyMode: false,
  activeSubproject: null,  // null | subprojectId
  editingSubproject: null, // null | 'new' | subprojectId
  subprojectTagFilter: new Set(),
  subprojectSortBy: 'default',
  expandedSpNotes: new Set(), // note IDs whose body is expanded in the Subproject view
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
  },
  // Currently-selected tag in the workspace Tags view (§3.2 stage 4).
  // Null = show the tag cloud only; set = show items tagged with this label.
  // Session-only (resets on reload).
  tagFilter: null
};

var SUBPROJECT_COLORS = [
  '#3b82f6','#0ea5e9','#06b6d4','#14b8a6','#10b981','#16a34a','#84cc16','#eab308',
  '#f59e0b','#f97316','#f75f1c','#dc2626','#f43f5e','#ec4899','#a855f7','#8b5cf6',
  '#7c3aed','#6366f1','#64748b','#404a4f'
];
var PROJECT_COLORS = ['#16a34a','#7c3aed','#3b82f6','#f59e0b','#ec4899','#14b8a6','#f97316','#dc2626'];
// Legacy color overrides for project keys imported from older data dumps.
// Empty by default; the `LEGACY_PROJECT_COLORS[key] || fallback` pattern
// in projects-init.js still resolves cleanly to the fallback when no
// override exists.
var LEGACY_PROJECT_COLORS = {};

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
