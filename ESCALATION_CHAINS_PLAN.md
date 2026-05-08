# Custom Escalation Chains — Implementation Plan (v0.1.0)

## Status

Design locked from the 6-decision Q&A on **2026-05-08**. This document drives commit #2 of the public-ready cleanup arc. Awaiting user approval before any implementation begins.

Linked work:
- Cleanup commit #1 (cruft) — already landed (`9b0cff1`)
- Cleanup commit #3 (personal seed + IS_PERSONAL_BUILD removal) — already landed (`47f5dcf`); leaves the Rückbucher block as dead code referencing `window.api.isPersonalBuild` (now `undefined`)
- **This commit (#2) — generalize Rückbucher into Custom Escalation Chains; migrate `kind:'rueckbucher'` todos**
- Cleanup commit #4 (planning doc cleanup) — depends on #2 since the docs reference both old and new feature names

## Errata — v4 not v2 (corrected after Phase A discovery)

Original design targeted `schemaVersion: 2` as a new field this commit would introduce, with the migration living in a parallel system inside `main.js`. **That was wrong.** An existing schema-versioning system at [src/10-schema-attachments.js](src/10-schema-attachments.js) already runs in the renderer, currently at `CURRENT_SCHEMA_VERSION = 3` (set by `e2a4ede 3.2 stage 1: schema v3 — tags array on every taggable entity`). Live workspaces are already at v3.

Correction folded into this document:
- Migration target is **v4**, not v2
- Migration code lives in `SCHEMA_MIGRATIONS[4]` inside [src/10-schema-attachments.js](src/10-schema-attachments.js), not as a parallel `migrateToV2` function in `main.js`
- `CURRENT_SCHEMA_VERSION` bumps from 3 → 4
- Pre-migration backup stays in `main.js` (only main has direct disk access), gated on `raw.schemaVersion < 4`
- Legacy chain synthesis becomes **conditional** on the existence of `kind:'rueckbucher'` todos — fresh installs no longer get the German chain forced into their data; they get only the generic example chain via `getDefaultData()`
- `getDefaultData()` does NOT set `schemaVersion`. The existing `runSchemaMigrations` walks fresh data through v1-v4 on first launch (each migration is idempotent), and that pattern is preserved
- All other locked decisions (persistence shape, Settings UI, spawn UX, offset model, reachability) are unchanged

The conditional chain synthesis is a real improvement on the original plan: under the original, every fresh distribution install would have ended up with a `Rückbucher (legacy)` chain visible in Settings, which contradicts the public-source cleanup goal. The conditional approach keeps the legacy chain bound to legacy data only.

## Goals

1. Generalize the legacy Rückbucher follow-up workflow into a configurable, public-source feature
2. Preserve user's existing `kind: 'rueckbucher'` todos via one-shot data migration with **zero data loss**
3. Remove all "Rückbucher" / German strings from active feature code; isolate to the migration block only (which runs once per workspace and is clearly marked as historical)
4. Ship a usable v0.1.0 feature that demonstrates itself on first launch (generic example chain)

## Non-goals (explicit, deferred to post-v0.1)

- Cross-project chain spawning (v0.1 spawns into active project only)
- Title placeholders / `{client}`-style variables in chain item templates
- Negative offsets / back-spawning (e.g. spawn one item already overdue)
- Time-of-day per item (chains are date-only, matching current todo model)
- Per-project chain libraries (chains are workspace-wide)
- Automatic chain backup rotation (backups accumulate; user manages disk)
- Public chain templates / sharing
- Pre-spawn anchor picker (anchor is always today)
- Bulk operations on chain items ("complete entire chain", "skip remaining")

## Locked design decisions (recap)

| # | Topic | Decision |
|---|---|---|
| 1 | Persistence shape | Workspace-wide top-level `data.escalationChains[]` + foreign-key `chainId` on todos |
| 2 | Settings UI | Section in existing **Workflows** tab + structured offset form (number + days/workdays dropdown + optional `+ N workdays after` toggle); tab name unchanged |
| 3 | Spawn UX | Dropdown button on todo list header + palette command; v0.1 defaults: anchor=today, project=active, titles=verbatim |
| 4 | Offset model | `{ days \| workdays, plusWorkdays? }` XOR primary; no negatives, time-of-day, or maximum |
| 5 | Migration | New entry `SCHEMA_MIGRATIONS[4]` in `src/10-schema-attachments.js`; `CURRENT_SCHEMA_VERSION` bumps 3 → 4; pre-backup in `main.js` gated on `raw.schemaVersion < 4`; abort-if-backup-fails; `loadData` returns unmigrated raw on backup failure or migration throw; existing `runSchemaMigrations` handles idempotence (won't re-run when version is current); defensive null/array checks; **conditional chain synthesis** — legacy chain only synthesized when `kind:'rueckbucher'` todos exist |
| 6 | Reachability | Generic English `Example: 3-step follow-up` chain in `getDefaultData()`; legacy `Rückbucher (legacy)` chain synthesized only when v4 migration detects `kind:'rueckbucher'` todos in the workspace (upgrade users only); migration code in `SCHEMA_MIGRATIONS[4]` carries a justifying comment explaining why German strings are preserved verbatim |

## Data shapes (concrete)

### Top-level workspace data after v4

`schemaVersion` is bumped to `4` by `runSchemaMigrations` after `SCHEMA_MIGRATIONS[4]` succeeds. `getDefaultData()` does not set `schemaVersion` — fresh installs walk through migrations 1→2→3→4 on first launch (each is idempotent; data ends at v4).

```jsonc
{
  "schemaVersion": 4,
  "activeProject": "workspace",
  "projects": { /* ... unchanged ... */ },
  "escalationChains": [
    {
      "id": "chain-...",
      "name": "<user-defined>",
      "items": [
        { "title": "<user-defined>", "offset": { "days": 7 } },
        { "title": "<user-defined>", "offset": { "workdays": 5 } },
        { "title": "<user-defined>", "offset": { "days": 14, "plusWorkdays": 3 } }
      ]
    }
  ]
}
```

### Synthesized legacy chain (upgrade path only)

```jsonc
{
  "id": "chain-rueckbucher-legacy",
  "name": "Rückbucher (legacy)",
  "items": [
    { "title": "Rückbucher 2nd reminder",     "offset": { "days": 7 } },
    { "title": "Rückbucher last reminder",    "offset": { "days": 14 } },
    { "title": "Rückbucher inaktiv stellen",  "offset": { "days": 14, "plusWorkdays": 3 } }
  ]
}
```

### Generic example chain (`getDefaultData` for fresh installs)

```jsonc
{
  "id": "chain-example-3-step",
  "name": "Example: 3-step follow-up",
  "items": [
    { "title": "Day 7 check-in",   "offset": { "days": 7 } },
    { "title": "Day 14 follow-up", "offset": { "days": 14 } },
    { "title": "Final reminder",   "offset": { "days": 14, "plusWorkdays": 3 } }
  ]
}
```

### Spawned todo (post-spawn, post-migration shape)

```jsonc
{
  "id": "todo-...",
  "title": "<copied verbatim from chain item>",
  "done": false,
  "priority": "medium",
  "startDate": "",
  "dueDate": "2026-05-15",
  "subprojectId": null,
  "tags": [],
  "created": "2026-05-08T...",
  "completedAt": null,
  "attachments": [],
  "steps": [],
  "recurrence": null,
  "archived": false,
  "kind": "escalation",
  "chainId": "chain-..."
}
```

### Offset XOR contract (validation)

- Exactly one of `offset.days` (calendar days) or `offset.workdays` (skip Sat/Sun) must be a non-negative integer
- `offset.plusWorkdays` is optional, non-negative integer
- Settings UI form makes invalid combinations unrepresentable; data layer additionally clamps negatives to 0 and refuses NaN at save time

## Migration algorithm (exact)

The migration sits inside the existing `runSchemaMigrations` pipeline as a new entry `SCHEMA_MIGRATIONS[4]` in `src/10-schema-attachments.js`. Pre-migration backup happens in `main.js` before the data is sent to the renderer.

### Order of operations in `loadData()` (main.js)

```
1. If workspace-data.json missing → return getDefaultData() (no schemaVersion field;
   renderer's runSchemaMigrations walks fresh data through 1→2→3→4 on first init)
2. Read file → JSON.parse. On error: log, return getDefaultData()
3. If raw.schemaVersion < 4 (or missing): try backupBeforeV4Migration()
     → if backup throws: log, return raw UNTOUCHED (skip migration entirely; user
       fixes backup target, relaunches; nothing lost)
4. Run main.js migrateData(raw) — existing per-load defaults only (unchanged)
5. If JSON.stringify(migrated) !== rawText: persist to disk
6. Return migrated to renderer
```

The renderer's `init()` then calls `migrateAttachments()` → `runSchemaMigrations()`, which runs `SCHEMA_MIGRATIONS[4]` if `data.schemaVersion < 4` and bumps `data.schemaVersion = 4`. The mutated data is persisted via the next `saveData()` call.

### `SCHEMA_MIGRATIONS[4]` body (in `src/10-schema-attachments.js`)

```js
// v4: generalize the legacy Rückbucher follow-up workflow into the public
// Custom Escalation Chains feature. CONDITIONAL synthesis: the German legacy
// chain is only inserted when this workspace actually has kind:'rueckbucher'
// todos. Fresh installs and users who never used Rückbucher get nothing
// here (their generic example chain comes from getDefaultData). Strings
// preserved verbatim from the pre-v0.1 private German workflow so existing
// user todos stay display-consistent. Public feature code contains no such
// strings — THIS BLOCK IS THE ONLY PLACE "Rückbucher" appears in
// post-cleanup source.
4: (data) => {
  if (!Array.isArray(data.escalationChains)) data.escalationChains = [];

  // Detect the user came from the legacy Rückbucher workflow. Single pass;
  // bail on first hit.
  let hasLegacyTodos = false;
  for (const proj of Object.values(data.projects || {})) {
    if (!Array.isArray(proj.todos)) continue;
    if (proj.todos.some(t => t && t.kind === 'rueckbucher')) {
      hasLegacyTodos = true;
      break;
    }
  }

  if (hasLegacyTodos &&
      !data.escalationChains.find(c => c.id === 'chain-rueckbucher-legacy')) {
    data.escalationChains.push({
      id: 'chain-rueckbucher-legacy',
      name: 'Rückbucher (legacy)',
      items: [
        { title: 'Rückbucher 2nd reminder',    offset: { days: 7 } },
        { title: 'Rückbucher last reminder',   offset: { days: 14 } },
        { title: 'Rückbucher inaktiv stellen', offset: { days: 14, plusWorkdays: 3 } }
      ]
    });
  }

  for (const proj of Object.values(data.projects || {})) {
    if (!Array.isArray(proj.todos)) continue;
    for (const todo of proj.todos) {
      if (!todo || typeof todo !== 'object') continue;
      if (todo.kind === 'rueckbucher') {
        todo.kind = 'escalation';
        todo.chainId = 'chain-rueckbucher-legacy';
      }
    }
  }
  return data;
}
```

### `backupBeforeV4Migration()` body (in `main.js`)

```js
function backupBeforeV4Migration() {
  const backupsDir = path.join(app.getPath('userData'), 'backups');
  try { fs.mkdirSync(backupsDir, { recursive: true }); } catch {}
  // ISO timestamp with millisecond precision; colons + dots stripped for
  // Windows path safety. Collisions essentially impossible at ms resolution.
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `workspace-data.pre-migration-v4.${ts}.json`);
  fs.copyFileSync(dataPath, backupPath);  // throws on failure → caller aborts migration
  console.log('Pre-migration backup written to', backupPath);
  return backupPath;
}
```

### Idempotence — guaranteed by three independent layers

Even if `data.schemaVersion` is corrupted/manually deleted between loads:

1. **`runSchemaMigrations` version gate** — primary; the existing `for (let v = from + 1; v <= CURRENT_SCHEMA_VERSION; v++)` loop runs only the migrations actually needed
2. **Chain dedup + `hasLegacyTodos` gate** — `find(c => c.id === 'chain-rueckbucher-legacy')` prevents duplicate insert; the `hasLegacyTodos` precondition prevents fresh installs from ever inserting
3. **Todo kind check** — once `todo.kind === 'escalation'`, the `=== 'rueckbucher'` branch never re-fires; `chainId` set once, idempotent on re-set

## Helper function

```js
// Applies an offset object to an anchor date. Returns a new Date; does
// not mutate the anchor. The XOR primary (days vs workdays) plus the
// optional plusWorkdays tail covers all v0.1 use cases including the
// legacy "+14d + 3wd" compound. Negatives are clamped to 0; NaN inputs
// throw early so corrupt data surfaces at spawn time, not silently.
function applyOffset(anchorDate, offset) {
  if (!(anchorDate instanceof Date) || isNaN(anchorDate)) {
    throw new Error('applyOffset: anchor is not a valid Date');
  }
  if (!offset || typeof offset !== 'object') {
    throw new Error('applyOffset: offset is missing or not an object');
  }
  const d = new Date(anchorDate);
  const primaryDays = Math.max(0, Number(offset.days) || 0);
  const primaryWorkdays = Math.max(0, Number(offset.workdays) || 0);
  const tail = Math.max(0, Number(offset.plusWorkdays) || 0);

  if (primaryDays > 0 && primaryWorkdays > 0) {
    throw new Error('applyOffset: cannot mix offset.days and offset.workdays (XOR violated)');
  }
  if (primaryDays === 0 && primaryWorkdays === 0 && tail === 0) {
    return d;  // empty offset → anchor unchanged
  }

  if (primaryDays > 0) {
    d.setDate(d.getDate() + primaryDays);
  } else if (primaryWorkdays > 0) {
    return tail > 0
      ? addWorkdays(addWorkdays(d, primaryWorkdays), tail)
      : addWorkdays(d, primaryWorkdays);
  }
  return tail > 0 ? addWorkdays(d, tail) : d;
}
```

Lives next to `addWorkdays` in [src/11-projects-init.js](src/11-projects-init.js) — both are date-math helpers; if the codebase ever grows a dedicated `src/date-math.js` module, both move together.

## Settings UI shape (Workflows tab)

```
┌─ Settings → Workflows ────────────────────────────────────────────────┐
│                                                                       │
│  Escalation chains                                  [+ New chain]    │
│  Define follow-up workflows that spawn a series of timed todos.       │
│                                                                       │
│  ┌─ ⠿  Rückbucher (legacy)                              [▾] [🗑] ─┐  │
│  │  Name: [Rückbucher (legacy)__________________________]          │  │
│  │                                                                  │  │
│  │  Items:                                                          │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │ ⠿  Rückbucher 2nd reminder                          [🗑]  │  │  │
│  │  │     in [7  ] [days ▾] (□ + [_] workdays after)           │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │ ⠿  Rückbucher last reminder                         [🗑]  │  │  │
│  │  │     in [14 ] [days ▾] (□ + [_] workdays after)           │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │ ⠿  Rückbucher inaktiv stellen                       [🗑]  │  │  │
│  │  │     in [14 ] [days ▾] (☑ + [3] workdays after)           │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │  [+ Add item]                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌─ ⠿  Example: 3-step follow-up                          [▾] [🗑] ┐  │
│  │  ...                                                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

- `⠿` = drag handle (chains and items both reorderable via drag)
- `[▾]` = collapse/expand chain card (state stored in `localStorage`, like the existing recurring/rueckbucher box collapsed state)
- `[🗑]` = delete (with confirmation dialog if the chain has spawned todos referencing it)
- Inline name editing (no separate "edit" mode)
- Item form: title text input + offset magnitude (`<input type="number" min="0">`) + unit dropdown (`days` / `workdays`) + checkbox `+ N workdays after` that reveals a secondary `<input type="number">`

Implementation home: [src/09-themes.js](src/09-themes.js) (which currently houses the Workflows tab — the existing Rückbucher toggle markup gets removed, the chains list gets added in its place).

## Spawn UX

### Primary surface: dropdown button on todo list header

Replaces the slot the old Rückbucher button occupied. Markup:

```html
<div class="dropdown" id="spawn-chain-dropdown">
  <button class="btn btn-secondary btn-sm" id="btn-spawn-chain">↻ Spawn chain ▾</button>
  <div class="dropdown-menu">
    <!-- one entry per chain in data.escalationChains -->
    <button class="dropdown-item" data-chain-id="chain-rueckbucher-legacy">
      Rückbucher (legacy)
      <span class="dropdown-item-meta">3 items · +7d / +14d / +14d+3wd</span>
    </button>
    <button class="dropdown-item" data-chain-id="chain-example-3-step">...</button>
    <hr>
    <button class="dropdown-item dropdown-item-secondary" data-action="manage">
      Manage chains in Settings…
    </button>
  </div>
</div>
```

- Button hidden via `${data.escalationChains.length === 0 ? 'hidden' : ''}` if there are zero chains (rare but possible if user deletes them all)
- Click outside dropdown → closes (existing dropdown infrastructure in app.js handles this)
- Picking a chain → calls `spawnChain(chainId)` → 3-N todos appear in active project, anchored to today

### Secondary surface: palette command

```js
// In setupPalette() registration:
{
  cmd: 'spawn chain',
  args: '<chain name>',
  description: 'Spawn an escalation chain in the current project',
  handler: (args) => {
    const name = (args || '').trim().toLowerCase();
    const chain = data.escalationChains.find(c => c.name.toLowerCase() === name);
    if (!chain) { showToast(`No chain named "${args}"`, 'error'); return; }
    spawnChain(chain.id);
  }
}
```

### `spawnChain(chainId)` body (lives in [src/11-projects-init.js](src/11-projects-init.js), replaces `spawnRueckbucherFollowups`)

```js
function spawnChain(chainId) {
  const chain = (state.data.escalationChains || []).find(c => c.id === chainId);
  if (!chain) { showToast('Chain not found.', 'error'); return; }
  const proj = getProject();
  if (!proj) { showToast('No active project.', 'error'); return; }
  if (!Array.isArray(proj.todos)) proj.todos = [];

  const anchor = new Date();
  const createdBase = Date.now();

  pushUndoSnapshot();  // single undo restores entire spawn batch
  const undoSuspendedPrev = undoSuspended;
  undoSuspended = true;
  try {
    chain.items.forEach((item, i) => {
      const due = applyOffset(anchor, item.offset);
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
    });
  } finally {
    undoSuspended = undoSuspendedPrev;
  }

  saveData();
  showToast(`${chain.items.length} items spawned from "${chain.name}".`, 'success');
}
```

### Existing collapsible "follow-ups" box generalizes to per-chain

The existing `todo-rueckbucher-box` collapsible region in [app.js:5417-5430](app.js#L5417-L5430) becomes one card per chain that has future-dated items in the active project. Per-chain collapsed state stored in `localStorage` keyed by `escalationBoxCollapsed:<chainId>`.

## Files touched & estimated impact

| File | Change | LOC delta |
|---|---|---|
| [main.js](main.js) | `backupBeforeV4Migration`, hardened `loadData` (gated on `< 4`), generic example chain in `getDefaultData` | **+50 / -5** |
| [preload.js](preload.js) | None | 0 |
| [package.json](package.json) | None | 0 |
| [src/01-types-state.js](src/01-types-state.js) | JSDoc typedefs `EscalationChain`, `EscalationChainItem`, `Offset`; add `escalationChains` to `WorkspaceData` typedef; widen `Todo.kind` and add `chainId` | **+30** |
| [src/02-helpers.js](src/02-helpers.js) | None (decided to keep `applyOffset` next to `addWorkdays`) | 0 |
| [src/09-themes.js](src/09-themes.js) | Remove Rückbucher Settings entry (~25 lines); add chains list editor (~200 lines: card render, item editor, drag-reorder, CRUD handlers) | **+200 / -25** |
| [src/10-schema-attachments.js](src/10-schema-attachments.js) | Bump `CURRENT_SCHEMA_VERSION` 3 → 4; add `SCHEMA_MIGRATIONS[4]` with conditional chain synthesis + todo re-tag | **+50** |
| [src/11-projects-init.js](src/11-projects-init.js) | Remove `isRueckbucherButtonEnabled`, `setRueckbucherButtonEnabled`, `isRueckbucherBoxCollapsed`, `setRueckbucherBoxCollapsed`, `spawnRueckbucherFollowups`. `addWorkdays` STAYS (used by `applyOffset`). Add `applyOffset`, `spawnChain`, escalation-box collapsed helpers | **+70 / -55** |
| [app.js](app.js) | Remove ~150 lines of Rückbucher-specific render block (lines 5320-5470) including `showRueckbucherBtn` gate; add `spawn chain` dropdown button + menu render; add per-chain collapsible boxes for future-dated items; add palette `spawn chain` command | **+170 / -150** |
| [styles.css](styles.css) | Remove `.todo-rueckbucher-box` rule (1 line); add `.todo-escalation-box`, `.escalation-chain-card`, `.escalation-item-row` styles | **+45 / -2** |
| [tests/pure.test.js](tests/pure.test.js) | Tests for `applyOffset` (8-10 cases), `SCHEMA_MIGRATIONS[4]` (5-7 cases including conditional-synthesis behavior) | **+150** |

**Net:** roughly **+765 / -237 = +528 LOC** across 7 files (added `src/10-schema-attachments.js`; reduced `main.js`).

## Implementation phases

### Phase A — Data foundation (60-90 min, retargeted to v4)
1. Add `escalationChains: [<example chain>]` to `getDefaultData()` in main.js. Do NOT set `schemaVersion` (let `runSchemaMigrations` walk fresh data through 1→4)
2. Add `backupBeforeV4Migration` function in main.js
3. Harden `loadData` with new error handling: try/catch around read + parse, gate backup on `raw.schemaVersion < 4`, return `raw` on backup failure
4. Bump `CURRENT_SCHEMA_VERSION` from 3 to 4 in src/10-schema-attachments.js
5. Add `SCHEMA_MIGRATIONS[4]` with conditional legacy-chain synthesis + todo re-tag (per the algorithm above)
6. Add JSDoc types to src/01-types-state.js for `EscalationChain`, `EscalationChainItem`, `Offset`; extend `WorkspaceData`; widen `Todo.kind` and add `chainId`
8. **Smoke test** — `npm start`, then verify the four points below in order. **Do not greenlight Phase B until all four pass.** A backup that merely exists but isn't restorable defeats the purpose.

   **Backup verification (mandatory):**

   a. **Path exists.** PowerShell:
      ```powershell
      Get-ChildItem "$env:APPDATA\workspacehub\backups\workspace-data.pre-migration-v4.*.json" | Select-Object Name, Length, LastWriteTime
      ```
      → at least one file listed, with `Length` > 0 and `LastWriteTime` matching the launch.

   b. **File is readable AND parses as valid JSON.** PowerShell:
      ```powershell
      $bk = Get-ChildItem "$env:APPDATA\workspacehub\backups\workspace-data.pre-migration-v4.*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
      $parsed = Get-Content $bk.FullName -Raw | ConvertFrom-Json
      $parsed.GetType().Name  # → PSCustomObject (no parse error)
      ```

   c. **Contains your projects (proof the backup is restorable).** PowerShell:
      ```powershell
      $parsed.projects | Get-Member -MemberType NoteProperty | Select-Object Name
      ```
      → returns project keys including your active one. If the user's data has e.g. `energy-hero` and `ai5innovation`, both keys must be listed.

   d. **Backup byte-equals pre-migration source** (defense against partial-write races):
      ```powershell
      $live = "$env:APPDATA\workspacehub\workspace-data.json"
      (Get-FileHash $bk.FullName).Hash -eq (Get-FileHash $live).Hash
      ```
      → expected `False` (live file has been mutated by migration; backup preserves pre-migration state). If `True`, migration didn't run — diagnose before continuing.

   **Migration verification:**

   - Existing `kind:'rueckbucher'` todos in your data: confirm their kind is now `'escalation'` and they carry `chainId: 'chain-rueckbucher-legacy'`. All other fields (title, dueDate, priority, tags, attachments, etc.) preserved exactly.
   - DevTools console: `state.data.schemaVersion` returns `4`; `state.data.escalationChains` is an array; the array contains an object with `id === 'chain-rueckbucher-legacy'` and the three German item titles.

9. Stop and report. Await user verification before Phase B.

### Phase B — Helper + tests (60-90 min)
1. Add `applyOffset(anchor, offset)` in src/11-projects-init.js next to `addWorkdays`
2. Add tests in tests/pure.test.js:
   - `applyOffset` calendar-only: `{days: 7}`, `{days: 0}`, `{days: 30}`
   - `applyOffset` workday-only: `{workdays: 5}` (skips weekend), edge cases at week boundaries
   - `applyOffset` compound: `{days: 14, plusWorkdays: 3}`, where the +3wd lands depending on day-of-week of `anchor + 14d`
   - `applyOffset` empty offset: returns anchor copy unchanged
   - `applyOffset` XOR violation: `{days: 5, workdays: 3}` throws
   - `applyOffset` negative inputs clamp to 0
   - `SCHEMA_MIGRATIONS[4]` idempotence: running twice produces same data
   - `SCHEMA_MIGRATIONS[4]` does NOT synthesize chain when there are no rueckbucher todos (fresh-install behavior)
   - `SCHEMA_MIGRATIONS[4]` synthesizes chain when rueckbucher todos exist (upgrade-path behavior)
   - `SCHEMA_MIGRATIONS[4]` re-tags todos correctly
   - `SCHEMA_MIGRATIONS[4]` defensive: malformed `proj.todos` doesn't throw
3. `npm test` → all pass (90 baseline + ~12 new = ~102)

### Phase C — Remove Rückbucher dead code (30-45 min)
1. Remove Rückbucher render block in app.js:5320-5470 (replaced in Phase D, but delete first for clean diff)
2. Remove Rückbucher Settings entry in src/09-themes.js:565-578, 932-933 (replaced in Phase E)
3. Remove `isRueckbucherButtonEnabled`, `setRueckbucherButtonEnabled`, `isRueckbucherBoxCollapsed`, `setRueckbucherBoxCollapsed`, `spawnRueckbucherFollowups` in src/11-projects-init.js
4. Remove `.todo-rueckbucher-box` CSS rule in styles.css:3116
5. **At this point app launches but the todo list shows no spawn button and Workflows tab shows no content. Fine — Phases D+E build them back.**
6. `npm test` should still pass (deleted code had no tests).

### Phase D — Build chain rendering + spawn (90-120 min)
1. Add `escalationBoxesHTML(proj, chains)` function in app.js — generates one collapsible box per chain that has future-dated items in the project
2. Add `escalationSpawnDropdownHTML(chains)` — dropdown button + menu markup
3. Wire dropdown click handlers (open/close, click-outside-close, item-click-spawn)
4. Add `spawnChain(chainId)` in src/11-projects-init.js (body shown above; replaces removed `spawnRueckbucherFollowups`)
5. Add palette command registration in app.js's `setupPalette()`
6. Add per-chain collapsed-state helpers (`isEscalationBoxCollapsed`, `setEscalationBoxCollapsed`) in src/11-projects-init.js, keyed by chainId
7. Add `.todo-escalation-box`, dropdown, item-row CSS in styles.css
8. **Smoke test**: spawn the example chain (and your migrated Rückbucher chain), verify 3 todos appear with correct dueDates, verify collapsible box groups them, verify undo-after-spawn restores cleanly.

### Phase E — Settings UI (120-180 min)
1. Add `renderEscalationChainsSection()` in src/09-themes.js — rendered as the main content of the Workflows tab
2. Each chain card: name input, items list, drag-handles, [+ Add item], [Delete chain]
3. Each item row: title input, offset magnitude input, unit dropdown, plus-toggle + secondary input
4. Drag-and-drop reorder: chains within tab AND items within chain (use existing drag patterns from sidebar/subprojects if present, otherwise vanilla HTML5 DnD)
5. CRUD handlers: `createChain()`, `renameChain(id, name)`, `deleteChain(id)` (with confirmation if `proj.todos.some(t => t.chainId === id)`), `addChainItem(chainId)`, `editChainItem(chainId, itemIndex, patch)`, `removeChainItem(chainId, itemIndex)`, `reorderChain(...)`, `reorderChainItem(...)`
6. All mutations call `saveData()` immediately
7. **Smoke test**: edit chain name (verify persists across restart), reorder items (verify saved), delete chain (confirm dialog appears if todos reference it), create new chain from scratch (verify spawn works on it).

### Phase F — Final integration test (30-45 min)
1. End-to-end flow: define new chain in Settings → spawn from todo list → verify todos appear → complete one → reopen Settings → delete chain → verify confirmation dialog
2. Migration replay: restore your `workspace-data.pre-migration-v4.<ts>.json` backup, relaunch app, verify migration runs and produces identical result (idempotence stress test)
3. `npm test` final → all pass
4. Verify no `Rückbucher` / `rueckbucher` strings in source outside the migration block (single grep should return only the migration's chain template):

```bash
grep -rn "rückbucher\|rueckbucher" --include="*.js" --include="*.css" --include="*.html" .
# Expected: only src/10-schema-attachments.js's SCHEMA_MIGRATIONS[4] chain template
```

### Phase G — Manual smoke pass (user-driven, 15 min)
**Prerequisites: user has run the PowerShell paranoia backup before this commit lands.**

1. Quit any running electron instance
2. `npm start` → app launches
3. Verify migration backup exists at `%APPDATA%/workspacehub/backups/workspace-data.pre-migration-v4.<ts>.json`
4. Verify your existing Energy Hero project's previously-`kind:'rueckbucher'` todos are still listed in their original order with their original titles
5. Open one of those todos in the editor → verify all fields (priority, dueDate, subprojectId, tags, attachments) are preserved exactly as before
6. Settings → Workflows → verify "Rückbucher (legacy)" chain shows with 3 items with correct offsets
7. Spawn the chain via dropdown button → verify 3 new todos appear in active project with `dueDate` = today+7, today+14, today+14+3wd
8. Spawn via palette command (`Ctrl+K → "spawn chain rückbucher"`) → verify same result
9. Edit chain name in Settings → restart app → verify rename persisted
10. Delete chain → confirmation dialog appears citing N todos still reference it → cancel → chain restored
11. Create a brand-new chain "Test 2-step", add 2 items, save, spawn → verify works
12. Undo (Ctrl+Z) after a spawn → verify all spawned items vanish atomically

If any of these fail, report which step + what you saw. Otherwise greenlight commit.

## Test strategy

- Baseline before commit #2: 90 tests passing
- After Phase B: ~102 tests passing
- All new tests live in `tests/pure.test.js` (no DOM, no Electron — pure JS unit tests)
- Migration tests use synthetic `data` objects to verify idempotence + edge cases without touching real workspace data
- `applyOffset` tests use fixed reference dates (e.g., `2026-05-08`) so day-of-week behavior is deterministic across runs

## Risks

| # | Risk | Probability | Severity | Mitigation |
|---|---|---|---|---|
| R1 | Migration failure on user data corrupts state | LOW | CRITICAL | Pre-migration backup with abort-if-fail; loadData returns unmigrated original on throw; user has manual paranoia backup; three-level idempotence allows safe retry |
| R2 | Spawn button visual regression vs. legacy Rückbucher button | MED | LOW | Smoke test in Phase D verifies pixel-equivalent placement |
| R3 | Drag-reorder breaks under specific events (drop on self, drop outside list) | MED | MED | Reuse existing drag patterns where possible; specific tests for self-drop / out-of-bounds; defensive sortedIndex math |
| R4 | Settings tab DOM grows large enough to lag on render with 10+ chains | LOW | LOW | Virtual scroll deferred to post-v0.1; unlikely the user will define 10+ chains in v0.1 |
| R5 | Existing `kind:'rueckbucher'` todos in WorkspaceHub-Backups (separate folder) get stale and confusing | LOW | LOW | Backups are point-in-time snapshots; future restore would re-migrate them via the same one-shot logic |
| R6 | Palette command parsing collides with existing palette infrastructure | LOW | LOW | Use existing palette command shape; lower-case match; show toast on no-match |
| R7 | German strings in migration code grep-discoverable on public repo | CERTAIN | LOW | Justifying comment in source explains it's one-shot historical migration; user accepted this trade-off in design decision 6 |
| R8 | Schema bump conflicts with future M2/M3 schema changes | LOW | LOW | M2 will bump to schemaVersion 3; M3 to 4; etc. Each migration block is independent |

## Rollback plan

- Single commit, single revert: `git revert <sha>` restores pre-feature state
- User's data: pre-migration backup exists at `%APPDATA%/workspacehub/backups/workspace-data.pre-migration-v4.<ts>.json`. To restore: copy back over `workspace-data.json`, relaunch app pre-revert. After revert, the legacy Rückbucher code is gone but the data still has the v3 shape — perfectly readable (the `kind:'rueckbucher'` rendering code is gone but todos render as plain todos via the default path).
- If revert is needed AFTER user has been using the new feature for a while: any escalation chains created after migration become orphan data that the (reverted) old code doesn't understand. New `kind:'escalation'` todos render as plain todos. No data loss; feature data just isn't actionable.

## Estimated implementation time

| Phase | Hours (actual work) |
|---|---|
| A — Data foundation | 1.0-1.5 |
| B — Helper + tests | 1.0-1.5 |
| C — Remove dead code | 0.5-0.75 |
| D — Chain rendering + spawn | 1.5-2 |
| E — Settings UI | 2-3 |
| F — Final integration test | 0.5-0.75 |
| G — Manual smoke (user) | 0.25 |
| **Total** | **~7-10 hours actual work** |

At user's stated velocity (~30-50% lower than focused-side-project pace), this is **2-3 elapsed days**.

## Commit structure (locked)

Commit #2 splits into two commits:

- **2a** `docs: add Custom Escalation Chains implementation plan` — commits this `ESCALATION_CHAINS_PLAN.md` alone, no code changes. Lands first to mark the design as the canonical reference before any implementation.
- **2b** `feat: Custom Escalation Chains + migrate kind:'rueckbucher'` — single commit covering Phases A through F. Phase G is the user-driven manual smoke pass that gates the commit.

## Approval status

**Approved by user on 2026-05-08** with three amendments folded into the document:

1. Commit structure locked as 2a + 2b (above).
2. Phase A step 8 expanded with four explicit backup-verification points (path exists / parses as JSON / contains projects / byte-differs from live).
3. **v4 correction (2026-05-08, mid-Phase-A):** discovered existing `runSchemaMigrations` system at `CURRENT_SCHEMA_VERSION = 3` in `src/10-schema-attachments.js`. Migration target moved from v2 (parallel system in `main.js`) to v4 (new entry in existing `SCHEMA_MIGRATIONS` dict). Legacy chain synthesis became conditional on `kind:'rueckbucher'` todos existing in data — fresh installs no longer get the German chain. Plan-doc correction lands as its own commit before code work resumes.

Standard checkpoint discipline during implementation:
- After Phase A: stop, await user verification of migration + backup
- After Phase F: stop, await user manual smoke (Phase G)
- After Phase G clean: commit 2b and report
