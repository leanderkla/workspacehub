'use strict';

// ===== src/05-node-links.js =====
// Wave-1 extraction (M0): the nodeLinks module — generic linking between
// brainmap nodes and any entity (todo / note / reminder / commitment /
// delegation / flow). This module is the ONLY allowed writer to
// node.linkedItems; direct mutations elsewhere desync the reverse-index
// cache. The cache lives module-level (_linkIndexByProject) and is
// invalidated project-scoped on every mutation.
//
// var conversion (6 top-level consts): NODE_LINK_ENTITY_TYPES,
// NODE_LINK_COLLECTION, NODE_LINK_TYPE_META, _nodeLinkTypeIcon,
// _nodeLinkTypeLabel, _linkIndexByProject. The Map reference stays stable
// (mutated, never reassigned), so the window.__nodeLinks._index handle
// captured at registration time remains valid for the whole session.
//
// The window.__nodeLinks devtools surface registration block moves with
// the module. Concat-and-globals = single realm, so the registration
// runs at the same time it does today (script load time, before app.js).
//
// Brainmap navigation code (bmReorderSibling and onwards) stays in
// residual app.js until Wave 2 folds it into src/07-spark-map.js.
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

var NODE_LINK_ENTITY_TYPES = ['todo', 'note', 'reminder', 'commitment', 'delegation', 'flow'];
// Map entity-type → project collection name. Single source of truth.
var NODE_LINK_COLLECTION = {
  todo: 'todos', note: 'notes', reminder: 'reminders',
  commitment: 'commitments', delegation: 'delegations', flow: 'flows'
};
// Display metadata for the spark-map detail panel. Order = picker order.
// Icons match the v2 plan; flow uses the universal cycle/branch glyph.
var NODE_LINK_TYPE_META = [
  { type: 'todo',       icon: '✓',  label: 'Todo' },
  { type: 'note',       icon: '◆',  label: 'Note' },
  { type: 'reminder',   icon: '🔔', label: 'Reminder' },
  { type: 'commitment', icon: '🤝', label: 'Commitment' },
  { type: 'delegation', icon: '→',  label: 'Delegation' },
  { type: 'flow',       icon: '🔀', label: 'Flow' }
];
var _nodeLinkTypeIcon  = Object.fromEntries(NODE_LINK_TYPE_META.map(m => [m.type, m.icon]));
var _nodeLinkTypeLabel = Object.fromEntries(NODE_LINK_TYPE_META.map(m => [m.type, m.label]));

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
var _linkIndexByProject = new Map();

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

