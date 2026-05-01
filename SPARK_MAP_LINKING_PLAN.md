# Spark Map ↔ Entity Generic Linking — Plan (v2)

## Context

The app's thesis is "everything connects." The data infrastructure that makes
the thesis real is a clean, generic linking system. This is load-bearing —
every future cross-cutting feature (graph view, smart suggestions, "what's
connected to X" queries) sits on top of this foundation. A messy v1 here pays
interest forever.

After auditing the user's proposed bidirectional design against the codebase,
this plan keeps `node.linkedItems` as the storage source of truth, drops the
proposed `entity.linkedNodeIds` reverse-storage field, and instead introduces
a **lazy in-memory reverse-index cache** for fast `getLinkedNodes` queries.
That preserves the "single source of truth" property while giving us O(1)
reverse lookups — best of both worlds.

The result: nodes in the per-project spark map can link to any of the six
entity types (todo, note, reminder, commitment, delegation, flow). Each node
shows a count badge and an expanded "Linked items" panel with rapid inline
add. Each entity, when viewed in its native list/editor, shows a chip listing
the nodes that link to it.

---

## Audit findings

**Confirmed:**
- `{ entityType, entityId }` is the right shape. IDs are *not* globally unique
  across types — `generateId()` (`app.js:284`) produces `prefix-<ts>-<rand>`,
  and the timestamp+random portion can collide across types. `entityType` is
  the required disambiguator.
- Brainmap is per-project (`state.data.projects[K].brainmap`). Cross-project
  links are impossible at the data layer; we don't have to enforce in the UI.
- Schema migrations have a clean pattern (`SCHEMA_MIGRATIONS` map at
  `app.js:~942`). Phase 1 bumped to v2.

**Pushed back on (during planning):**

1. **No reverse index in storage.** `entity.linkedNodeIds` rejected:
   bidirectional storage means every write touches two arrays, and any code
   path bypassing the helper drifts them apart silently. **`node.linkedItems`
   is the only stored field.** Reverse lookups go through a derived cache.
2. **Don't unify with `note.linkedTodos`.** `note.linkedTodos` is "this note
   is *about* these todos" (entity-content association). `node.linkedItems`
   is "this node corresponds to these things" (categorization). Different
   semantics. **Decision: leave `note.linkedTodos` completely untouched.**
3. **Three inline-create paths**, not one. Single-input "type+Enter" works
   for todo/note. Reminder/commitment/delegation get an inline expansion
   when their type is picked. Flow opens the flow editor with the link
   pre-staged at creation time.

**Lifecycle decisions:**

- Deleted entity → orphan cleanup runs on delete (Phase 1 hooks all 6 entity
  delete paths). Orphan rendering remains a safety net for edge cases.
- Archived entity → link stays, row renders struck-through + faded.
- Deleted node → its `linkedItems` array goes with it. Reverse-index cache
  invalidates for that project.
- Inline-created entity inherits the node's `subprojectId` as default.
- Link has no `linkType` field — pure association.

---

## Architecture

### Data model

Brainmap node has one field for links:

```js
node.linkedItems = []   // Array<{ entityType, entityId }>
```

Where `entityType ∈ 'todo'|'note'|'reminder'|'commitment'|'delegation'|'flow'`
and `entityId` is the entity's id within the same project.

### Reverse-index cache (derived state, not source of truth)

To avoid O(N²) cost when entity views render N rows that each query
"which nodes link me?", build a per-project reverse index lazily:

```js
// Module-scope, in-memory, not persisted.
const _linkIndexByProject = new Map();   // projectKey → reverseIndex
// reverseIndex shape: Map<'entityType:entityId', Set<nodeId>>
```

**Invariant**: every call to `addNodeLink` / `removeNodeLink` / orphan-cleanup
that mutates a node's linkedItems must call `_invalidateLinkIndex` for that
project. The helper module owns this — no external code touches it.

The cache is rebuilt on the next `getLinkedNodes` call. Cost of a rebuild:
sub-millisecond on real data scale.

**Note**: Current invalidation is project-scoped (coarse). Targeted
invalidation by `entityType:entityId` is a future optimization if
chip-render-after-mutation becomes a hot path.

### Helper module — the chokepoint (built in Phase 1)

```js
// Mutation API — these are the ONLY writers to node.linkedItems.
function addNodeLink(nodeId, entityType, entityId)         // idempotent
function removeNodeLink(nodeId, entityType, entityId)      // idempotent
function nodeLinkExists(nodeId, entityType, entityId)
function nodeLinkCount(nodeId)                              // for badge

// Query API — resolve refs, tag orphans + archived.
function getLinkedItems(nodeId)
//   → [{ entityType, entityId, entity, isOrphan, isArchived }]
function getLinkedNodes(entityType, entityId, projectKey?) // uses cache
//   → [node, ...]

// Cleanup — called from entity delete handlers.
function cleanupNodeLinksOnEntityDelete(projectKey, entityType, entityId)
```

`addNodeLink` validates that `nodeId` exists in the active project's brainmap
and that `entityId` exists in the same project. All bad inputs return `false`
(consistent: nothing throws).

`addNodeLink` appends to the end of the array — never inserts. This means
array order is meaningful for display: most recently added are at the end.

### Debug surface

`window.__nodeLinks` exposes the helper module for devtools poking. Stays
in the codebase indefinitely (private module surface; underscore-prefixed).

### Cache size

The project-keyed cache has no size limit and accumulates one entry per
project visited per session. For typical use (≤50 projects per session)
memory cost is trivial. Document; don't preemptively cap.

---

## Implementation in three phases

### Phase 1 — Data model + helpers + migration + debug surface + orphan cleanup ✓ COMMITTED

Phase 1 is complete and committed at `a80bcbb`. The helper module is at
`app.js:13245-13258`+ with all 7 helper functions plus the cache and
`window.__nodeLinks` debug surface.

### Phase 2 — Spark map UI: badges, panel, inline add  (~3.5-4.5 h)

Goal: Users can link/unlink/create from the spark map.

**Count badge on each node**: small numeric label rendered alongside the
existing collapse badge (`app.js:~12434`). Shows `nodeLinkCount(node.id)`
when > 0. Tap → expands the node panel to the linked-items section. Skip
rendering when count is 0 (no badge clutter on empty nodes).

**Linked-items panel** in the existing node detail view:
- Section header: "{count} linked: {breakdown by type}".
- Each row renders with a type icon (✓ todo, ◆ note, 🔔 reminder,
  🤝 commitment, → delegation, 🔀 flow), the entity title, and an
  unlink ✕. Tap row → navigate to entity editor.
- Orphan rows: greyed + italic + "(deleted)" — uses existing
  `mention-orphan` CSS class.
- Archived rows: struck-through + faded.
- **Overflow**: panel has `max-height: 320px; overflow-y: auto;` so it
  scrolls independently and doesn't push the rest of the node detail
  UI down. When the count exceeds **10 items**, the first 8 (most
  recently added — the last 8 entries in the array) render plus a
  "Show all (N)" link at the bottom that, when tapped, expands the
  panel to show all.

**Inline add input — type picker (NOT cycle)**:
- Type icon at left = current type. **Tap → opens a small popover**
  listing all 6 type icons with their labels. Pick one to select.
- **Per-node memory of last-used type**: a session-only Map kept in
  a `bmState.lastLinkedTypeByNode` field (in-memory; not persisted to
  `state.data`). Reset on app reload.
- **Default type is 'todo'** for nodes never linked from before.
- Long-press / right-click on the type icon also opens the picker.

**Inline create paths — three forms**:
- **Simple types (todo, note)**: single title text input.
  `Enter` → `addNodeLink` + create entity (inherits node's
  `subprojectId`) + clear input + keep focus.
- **Rich types (reminder, commitment, delegation)**: switching type
  expands the input area into a small inline form *below* the title:
  - Reminder: title + datetime picker
  - Commitment: title (= description) + direction toggle
    (i_owe/they_owe) + counterparty input
  - Delegation: title (= task) + delegated_to input
  `Enter` (or "Add" button) → create entity + link + clear + collapse
  back to title-only state.
- **Flow type**: the popover for "flow" offers TWO options as a small
  submenu inside the picker:
  - **+ Create new flow** → opens the existing new-flow modal. On
    submit, the modal's save callback wraps the existing flow-creation
    code with: `addNodeLink(currentNodeId, 'flow', newFlowId)` →
    `state.flowEditing = newFlowId; showView('flows')`. Atomic at
    creation time. **No pending-state dance** — the link is made the
    moment the flow exists.
  - **Link existing flow** → fuzzy-search picker over the project's
    existing flows. Tap → `addNodeLink` + return focus to the spark
    map node panel.

All tap targets ≥ 44 px; type-icon picker uses pointer events with
tap-vs-long-press detection (reuse the molecular view's pattern).
Touch behavior: pointer events, no hover-only affordances.

**Commit checkpoint** before Phase 3.

### Phase 3 — Reverse-link chips on entity views  (~1.5 h)

Goal: Users navigating entity views can see which nodes link to them and
jump to the spark map focused on that node. Memoization is in place from
Phase 1, so this is a thin presentation layer.

Tasks:
- Add a small `genericLinksChip(entityType, entityId)` helper that calls
  `getLinkedNodes(entityType, entityId)` (which uses the cache from
  Phase 1) and renders a chip:
  `<span class="node-link-chip">↔ Linked to: <node-name>, <node-name></span>`
  (truncate to 2 names + "+N more" if many; tap "+N more" expands a
  popover listing all).
- Insert the chip into:
  - Todo card (`todoItemHTML`, `app.js:~7943`)
  - Note editor — new `<details>` panel below the existing
    `linked-todos-panel` (`app.js:~7035-7057`).
  - Reminder item — compact inline badge or new metadata row.
  - Commitment card — new line in `com-card-meta`.
  - Delegation card — fits in the existing `del-chips` div alongside
    `del-commitment-link`.
  - Flow editor — new metadata row at the top.
- Tap a chip → `switchProject` if needed + `state.bm.selectedId = nodeId`
  + `showView('brainmap')` so the spark map opens with that node
  highlighted.
- Hide the chip entirely when there are zero linked nodes.

**Performance target**: chip rendering on a 100-entity view should
complete in <50ms total (including the cache build on first render).
Profile and report the actual number during verification. If over 50ms,
flag for follow-up before commit.

**Commit checkpoint** before any further work.

---

## Open interpretive decisions (committed)

1. **No reverse-storage index.** `node.linkedItems` is the only stored
   field. Reverse lookups go through a derived in-memory cache.
2. **`note.linkedTodos` untouched.** Separate concept, no migration.
3. **Three inline paths.** Todo/note simple; reminder/commitment/delegation
   inline expand; flow opens its full editor with the link pre-staged
   atomically at creation.
4. **Inherit `subprojectId`.** Inline-created entities inherit the node's
   subproject as default; user can change after.
5. **Eager orphan cleanup on delete + lazy orphan rendering as safety net.**
6. **Count badge skipped at zero** — no clutter on empty nodes.
7. **Phase 3 chip placement** — proposed slots above; user can redirect
   any one during Phase 3 verification.
8. **Type picker popover, never cycle.** Per-node memory of last-used
   type held in-memory only (not persisted).
9. **Linked-items panel max-height 320px scroll, "Show all" link at >10
   items.** Default shows the 8 most recently added.
10. **`window.__nodeLinks` debug handle stays in the codebase indefinitely.**

---

## Verification (Phase 2)

- Open spark map. Each node with links shows a count badge.
- Tap a node, see the linked-items section. Counts and breakdown match
  the data.
- Inline add — todo: type title, Enter, todo created and linked. Input
  cleared, focus retained. Created todo appears in the project's todos
  view with the node's subprojectId pre-set.
- Inline add — switch type via picker tap to "reminder": inline form
  expands to show datetime picker. Create reminder, verify it appears
  in the linked-items section AND in the project's reminders view.
- Same for commitment, delegation.
- Switch type to flow → picker shows submenu: "+ Create new flow" /
  "Link existing flow."
  - "+ Create new flow": modal opens, name the flow, submit. Verify the
    spark map's linked-items section shows the new flow AND the flow
    editor opens with the new flow active.
  - "Link existing flow": picker shows project's flows. Tap one →
    linked, focus returns to spark map node panel.
- Type picker remembers last-used type per node: link a todo from node
  A, then a reminder from node B, then re-open node A — type defaults
  to todo. Re-open node B — type defaults to reminder.
- Touch: one-finger tap drills into a node-detail; tap on type icon
  opens picker; pinch on canvas zooms.
- Linked-items overflow: link 15 items to a node. Panel shows 8 + "Show
  all (15)". Tap "Show all" → expands to show all 15. Panel
  independently scrolls.
- Delete a linked entity from its native view; the link automatically
  disappears from the spark map's linked-items panel (eager cleanup).
- Archive an entity; the link row renders struck-through.
