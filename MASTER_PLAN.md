# WorkspaceHub Master Plan — May 2026 → v1.0

## Context

WorkspaceHub is a one-developer local-first Electron workspace tool. The current state:

- `app.js` is 16,835 lines (single file, ES5-style, raw `<script>` in renderer). The author is overwhelmed by it; tests are slow because they vm-load the whole thing.
- The most recent strategic audit (`GAP_AUDIT.md`) was written before four major features shipped (Tags system, @-mentions everywhere, smart link suggestions, spark-map linking phases 1-3 + polish). All four are now verified DONE in code and commits.
- The target is a shippable v1.0 within 6-12 months, distributed to others (so ship-blockers like genericizing the Energy Hero seed, building an installer, and onboarding all have to land).

**Decisions locked during planning:**
1. **Freeze current `styles.css` as the v1.0 visual identity.** No theme cut milestone.
2. **Move the 30+ unshipped theme drafts to a `themes-explored/` archival folder** so they stop polluting the active workspace. The frozen `styles.css` IS the v1.0 visual identity; drafts are reference material, not in-flight work. Done in Phase 0 alongside seed cleanup.
3. **Markdown export is speculative; defer past v1.0.** JSON-only export+import in M3.
4. **§1.1 (genericize seed) goes BEFORE modularization** — it's mostly `main.js`/`package.json` work and doesn't conflict with the app.js split.

**Velocity assumption:**
The author works two demanding day jobs alongside this. All effort estimates assume 30-50% lower velocity than a focused-side-project pace. Calendar dates compound that: a "1-day" task is 1-3 elapsed days, a "1-week" task is 1.5-2 weeks elapsed. Plan v1.0 to land **late November / December 2026** if work starts mid-May 2026.

**Scope explicitly out:**
- `styles.css` (8,940 lines) is at the edge of overwhelming and is **a known future concern**. Not in scope for this plan. Will be revisited if and when CSS work becomes painful — likely a separate themed plan after v1.0 ships.

---

## What's already DONE (verified against current commits)

These four features from `GAP_AUDIT.md` are shipped and verified — they should be removed from any remaining work list:

| Audit ref | Feature | Shipping commits |
|---|---|---|
| §3.1 | @-mentions everywhere (notes, todos, reminders, commitments, delegations, dumps, flow node notes) with backlink + status tracking | `8aa96a0`, `a15474c` |
| §3.2 | Full Tags system — schema v3, chips on every entity, editors, palette `#tag` filter, workspace-wide Tags view | 5-stage rollout `e2a4ede`→`245de2f`, polish `568e6d0` |
| §3.3 | Smart link suggestions while typing — workspace-wide entity+tag index, Tab-to-insert, anchored popover | `832cbb6` |
| Spark-map linking | Phases 1-3 (data model + helpers, detail panel, reverse-link chips) + 8 polish commits | `a80bcbb`, `e231713`, `22f5104` plus `8b09dc1`, `b5db48e`, `0a61ffb`, `973103b`, `e6dbad6`, `ba82e01`, `5c324f0`, `1e3fadf`, `bc5246a` |

**Audit items whose framing has changed since:**
- §4.1 "Phone read-only via cloud folder" was reframed by the audit itself as Markdown export (§4.2b). User has now confirmed: defer past v1.0. Ship JSON-only in M3.
- §4.3d "Saved/smart filters" — Tags + palette `#tag` filter cover most of this surface today. Defer past v1.0.
- §5.6 "Workspace-wide vs per-project setting separation" — Tags + spark-map cross-project linking de-fang this. Drop from roadmap.
- FUTURE §2.4 "Daily review with graph prompt" — depended on tags shipping; now buildable but not in v1.0 cut.

**Audit items whose line citations are stale (file has grown ~2,300 lines since audit was written):**
- Bulk-bar references at `app.js:9444-9523` and `app.js:8194-8260` no longer match. Notes bulk is now ~`8299-8328`. Re-verify line ranges before scoping.

---

## The Plan, in three phases

### Phase 0 — Pre-modularization cleanup (1-3 days)

**Why first:** Privacy/branding leak (seed) and workspace clutter (theme drafts) both block clean modularization. Both live outside `app.js` so they don't conflict with M0.

#### Task A — §1.1 seed cleanup

The current `main.js:100-181` returns `activeProject: 'energy-hero'` and seeds two named projects. `data/energy-hero-brainmap.json` is loaded unconditionally. `package.json:4` description still names both. Until this is fixed, no other distribution work is meaningful.

**Changes:**
- `main.js:100-181` — extract `getDefaultData()` so it returns a **single neutral project** ("My Workspace") in distribution builds. Personal builds keep the two-project seed via `process.env.WORKSPACEHUB_PERSONAL === '1'`.
- `main.js:134` — gate `loadEnergyHeroBrainmap()` behind the same env flag.
- `app.js:1298` (Rückbucher checkbox) — gate the visible UI behind `WORKSPACEHUB_PERSONAL`. Do **not** generalize the workflow into "Custom escalation chain" yet (cut for v1.0).
- `package.json:4` — change description to neutral text (e.g., "Personal workspace manager — local-first").
- `package.json:6-9` — add a personal launch script: `"start:personal": "set WORKSPACEHUB_PERSONAL=1 && electron ."`. The plain `start` script becomes the distribution-mode default.

#### Task B — Theme drafts archival

Move all `.html` files from `drafts/` and `previews/` into a new `themes-explored/` folder at repo root. Move the `CYBERPUNK_THEME_*.md` and `THEME_DRAFTS_*.md` files at repo root into the same folder. Single intent: the workspace stops looking like a theme R&D project, the drafts remain accessible for future reference.

**Why archival, not deletion:** the drafts are research artifacts; deletion is irreversible and the storage cost is trivial.

#### Verification

1. `npm start` → app launches with one project named "My Workspace", no Rückbucher checkbox visible, no Energy Hero strings.
2. `npm run start:personal` → both Energy Hero and AI5innovation visible, Rückbucher restored, brainmap loaded.
3. Repo root no longer has draft `.html` or theme-draft `.md` files; `themes-explored/` exists and contains them.
4. `grep -ri "energy hero\|ai5innovation\|rückbucher" .` of the eventual built artifact (after M1 lands) shows zero matches outside `themes-explored/`.

**Effort:** 1-3 days. No tests will break (none of the seed code is covered).

---

### Phase 1 — M0: Modularization (4-6 weeks elapsed, ~30-45 hours actual work)

**Approach:** concatenated `<script>` tags + numeric-prefix filenames in `src/`. No build step. No ES modules. No bundler.

**Why this build pipeline (not ES modules, not esbuild bundling):**
- 200+ `saveData()` call sites and ~594 references to `state` already work as implicit globals. Switching to explicit `import`/`export` would mean rewriting hundreds of cross-references for zero feature payoff.
- HTML inline `onclick="someFunc(...)"` patterns in template strings would force `window.foo = foo` re-exports under ES modules — hybrid worst-of-both-worlds.
- esbuild bundling adds a watch step to the inner dev loop with no measurable benefit for one developer at this LoC.
- Concat + globals lets each extraction be "cut bytes from app.js, paste into `src/NN-name.js`, smoke-test, commit." Atomic by default.
- The **one mechanical rule:** any top-level `const`/`let` shared across files becomes `var` (so it lands on `globalThis`). Function declarations are already global at script top-level — those stay as-is. ~30 lines of edits total, applied per extraction.

#### Module list — 12 modules across 4 waves

**Numbering convention:** numeric prefix matches **extraction order** (Wave 1 = 01-05, Wave 2 = 06-08, Wave 3 = 09-10, Wave 4 = 11-12). This also matches load order in `index.html`. Earlier numbers depend on nothing; later numbers depend on earlier ones.

| # | Filename | Lines | Source range in current app.js | Wave | Tangle |
|---|---|---|---|---|---|
| 01 | `src/01-types-state.js` | ~320 | 3-322 (TYPE DEFS + STATE) | 1 | LOW |
| 02 | `src/02-helpers.js` | ~275 | 324-485 (HELPERS, sans `renderTagsView`) + line 597 `getProject` | 1 | LOW |
| 03 | `src/03-undo-save.js` | ~160 | 599-757 (UNDO/REDO + saveData) | 1 | MED |
| 04 | `src/04-recurrence.js` | ~956 | 10238-11193 (RECURRENCE) | 1 | LOW |
| 05 | `src/05-node-links.js` | ~225 | 15552-15776 (nodeLinks + window.__nodeLinks) | 1 | MED |
| 06 | `src/06-flows.js` | ~890 | 13722-14611 | 2 | LOW |
| 07 | `src/07-spark-map.js` | ~940 + folded brainmap nav (~1,058) | 14612-15551 + 15777-16835 | 2 | MED |
| 08 | `src/08-molecular.js` | ~1,645 | 6005-7649 (MOLECULAR Three.js) | 2 | MED |
| 09 | `src/09-themes.js` | ~945 | 757-1704 (THEMES + custom glass + glass settings UI) | 3 | MED |
| 10 | `src/10-schema-attachments.js` | ~770 | 1705-2272 (schema migrations + attachments) | 3 | MED |
| 11 | `src/11-projects-init.js` | ~645 | 2273-2916 (developer/backup prompt + projects + create/delete) | 4 | HIGH |
| 12 | `src/12-dump-zone.js` | ~1,135 | 11974-13106 (DUMP ZONE + reminders interleave) | 4 | MED |

**Note on line ranges:** these reference the app.js state at the time of plan-writing (HEAD before pre-modularization WIP commits 58c4a88 + 79c010a). The recent feature WIP added ~1,635 lines to app.js, so before each Wave's extractions, re-locate the section banners by grep — exact line numbers will have shifted.

**What stays in residual `app.js`** (~7,400 lines after Wave 4):
- `init()` orchestrator (do **not** move — leave as bootstrap glue)
- `renderApp` / `renderContent` / `renderSidebar` dispatch
- KEYBOARD CHEATSHEET, COMMAND PALETTE, STICKY MODE, GLOBAL KEYBOARD, JUMPS, ZOOM, QUICK CAPTURE, LIST KEYNAV
- Sidebar, archive/delete, dashboard, today, pull, overview
- Notes + bulk + mentions + smart-link
- Todos + bulk + subprojects + gantt
- Reminders, commitments, delegations, shared contexts
- `renderTagsView` and tag-match navigation (lives logically with view dispatch)

This residual is intentional — the dispatch and view glue stays in one file because pulling it apart buys nothing for a single developer.

#### Wave-by-wave execution

##### Wave 1 — "Pure leaves" (5 modules, ~1,940 lines extracted; 8-12 hours)

**Modules:** 01-types-state, 02-helpers, 03-undo-save, 04-recurrence, 05-node-links.

**Why this order:**
- These have the lowest tangle. State is a singleton; helpers are pure; recurrence is mostly date math; node-links has its own cache and a documented `window.__nodeLinks` interface.
- Extracting state first is required — every later module references it.
- Recurrence already has test coverage (`tests/pure.test.js`), so it's the cleanest test-runtime improvement target after Wave 1.

**Concrete first-wave extraction script:**

`src/01-types-state.js`:
- All `@property`-style JSDoc TYPE DEFINITIONS
- The `state` object literal
- Global constants like `THEMES`, color tables, `KEY_SHORTCUTS`, `SLASH_COMMANDS`
- Convert top-level `const state = {...}` → `var state = {...}`. Same for `THEMES`, color tables.

`src/02-helpers.js`:
- `generateId`, `escapeHTML`, `formatDate`, `formatDateTime`, `isOverdue`, `priorityBadge`, `priorityBadgeEditable`
- `getAllWorkspaceTags`, `parseTagsString`, `_TAG_TARGET_COLLECTIONS`
- `setEntityTags`, `getTagCounts`, `getEntitiesByTag`, `entityTagsHTML`
- `getProject` — single-line, hot symbol; must stay globally visible

`src/03-undo-save.js`:
- `UNDO_MAX`, `undoStack`, `redoStack`, `undoSuspended` (convert to `var`)
- `pushUndoSnapshot`, `_writeDataToDisk`, `saveData` (the central function called 200+ times)
- `captureInitialUndoSnapshot`, `_restoreSnapshotIntoState`, `undo`, `redo`
- `showToast`, `showModal`
- Linkage helpers: `getNotesLinkedToTodo`, `getSubprojectTodos`, `getSubprojectNotes`, `getSubprojectDumps`, `getSubprojectSparkNodes`, `bmAncestorPath`

`src/04-recurrence.js`:
- Whole RECURRENCE section, intact
- `WEEKDAY_LABELS_SHORT`, `NTH_LABELS` (convert to `var`)
- `toDateString`, `nthWeekdayOfMonth`, `computeNextOccurrence`, recurrence UI builders, `spawnNextRecurringReminder`

`src/05-node-links.js`:
- `NODE_LINK_ENTITY_TYPES`, `NODE_LINK_COLLECTION`, `NODE_LINK_TYPE_META`
- `_nodeLinkTypeIcon`, `_nodeLinkTypeLabel`, `_linkIndexByProject`, `_invalidateLinkIndex`, `_buildReverseIndexForProject`
- Public API: `addNodeLink`, `removeNodeLink`, `nodeLinkExists`, `nodeLinkCount`, `getLinkedItems`, `getLinkedNodes`, `cleanupNodeLinksOnEntityDelete`
- The `if (typeof window !== 'undefined') { window.__nodeLinks = {...} }` registration block
- The remaining ~1,058 lines (brainmap nav + chip popovers) **stay in residual in Wave 1**, fold into `07-spark-map.js` in Wave 2

**`index.html` changes** (replace the existing app.js script line):
```html
<script src="vendor/three.bundle.js"></script>
<script src="src/01-types-state.js"></script>
<script src="src/02-helpers.js"></script>
<script src="src/03-undo-save.js"></script>
<script src="src/04-recurrence.js"></script>
<script src="src/05-node-links.js"></script>
<script src="app.js"></script>
```

**`tests/run.js` changes** (replace the single-file read):
```js
const projRoot = path.resolve(__dirname, '..');
function loadAllSrc() {
  const srcDir = path.join(projRoot, 'src');
  const out = [];
  if (fs.existsSync(srcDir)) {
    fs.readdirSync(srcDir)
      .filter(f => f.endsWith('.js'))
      .sort()
      .forEach(f => out.push(fs.readFileSync(path.join(srcDir, f), 'utf8')));
  }
  out.push(fs.readFileSync(path.join(projRoot, 'app.js'), 'utf8'));
  return out.join('\n;\n');
}
const appSrc = loadAllSrc();
```

**Commit sequence — one per module, NOT a big bang:**
1. `chore(modularize): wire src/ load path and update test harness` (no app changes)
2. `refactor: extract types + state to src/01-types-state.js`
3. `refactor: extract helpers to src/02-helpers.js`
4. `refactor: extract undo/save to src/03-undo-save.js`
5. `refactor: extract recurrence to src/04-recurrence.js`
6. `refactor: extract node-links to src/05-node-links.js`

**After each commit, smoke-test:**
- App launches, devtools console shows no errors
- `npm test` exits 0
- Type 5 chars in a Todo title → smart-link suggestion popover (proves `_invalidateSmartLinkIndex` typeof-guard still resolves)

**After Wave 1 closes, full-pass smoke checklist:**
- Click every sidebar item: Dashboard, Dump, Notes, Todos, Commitments, Delegations, Flows, Subprojects, Spark Map, Reminders, Tags, Pull, Today, Universe, Overview (~90 sec)
- Open Settings, switch each of the 5 tabs
- Spark Map: drag a node, press `?` for cheatsheet
- Ctrl+Z twice, Ctrl+Shift+Z twice
- Palette (Ctrl+K), type "remind me tomorrow", capture; verify reminder created
- Switch project, switch back; verify theme reapplies
- Devtools: `window.__nodeLinks` defined, `window.__smartLink` defined
- Quit and relaunch — active project preserved
- `git tag pre-wave-2` once Wave 1 is stable

##### 🛑 Post-Wave-1 stress-test gate (the "is this actually working?" checkpoint)

**This is mandatory before starting Wave 2.** The whole point of modularization is to reduce the cognitive load when working with the codebase. After Wave 1, **stress-test that assumption**:

- Pick a non-trivial change in one of the new modules — e.g., add a new recurrence rule (monthly-by-week-of-month) in `src/04-recurrence.js`, or add a node-link cleanup edge case in `src/05-node-links.js`.
- Ask Claude Code to make the change end-to-end, including tests.
- Honestly assess: did Claude need to read the rest of `app.js` to understand context? Was the file size complaint reduced? Did the work feel meaningfully easier than the same change pre-modularization?

**Decision points:**
- **Reduced overwhelm noticeably →** continue with Wave 2 as planned.
- **Some improvement but smaller than expected →** continue with Wave 2 but consider whether the proposed boundaries actually carve along the right seams. Maybe Wave 2 should include a smaller scope.
- **No noticeable improvement →** stop modularization. The split is wrong, or the overwhelm is rooted somewhere else (perhaps `styles.css`, perhaps the implicit-global state model itself). Reassess before sinking more time.

This gate prevents pouring 25+ hours into a modularization that turns out not to help.

##### Wave 2 — "Big self-contained UIs" (3 modules, ~3,475 lines extracted; 8-12 hours)

**Modules:** 06-flows, 07-spark-map (folding in the residual brainmap nav from Wave 1), 08-molecular.

**Why this order:**
- Each is independently smoke-testable (open view, interact, close).
- Wave 1 has already de-risked the build pipeline; this is bulk extraction.
- Each module owns its own teardown (`teardownBrainmap`, `teardownMolecular`, `saveBrainmap`). The dispatchers in `switchProject`/`showView` reference them by bare name; global scope keeps the lookups working.

**Critical pre-extraction check:** grep for `const renderBrainmap = `, `const renderMolecular = `, `const renderFlows = ` (and their teardown variants). If any are arrow consts, convert to `function` declarations during the move.

**Smoke after Wave 2:**
- Spark Map: drag a node, link an entity, archive a project (link cleanup runs?)
- Molecular: switch in, then to Dashboard, then back. Eyeball CPU usage stays flat after teardown.
- Flows: open one, run it, advance steps, verify save.
- `git tag pre-wave-3`

##### Wave 3 — "Settings & schema" (2 modules, ~1,715 lines; 6-9 hours)

**Modules:** 09-themes, 10-schema-attachments.

**Why this order:**
- Both are referenced from `init()` and from `switchProject` (theme reapply). Doing them after Waves 1-2 means the test harness and smoke patterns are mature.
- Settings UI sprawls across multiple tabs; smoke-testing each tab is tedious — defer until the build is stable.

**Smoke after Wave 3:**
- Open Settings, click each of the 5 tabs (Appearance, Workspace, Contexts, Workflows, Developer) — ~90 sec
- Switch theme, switch project, verify per-project persistence
- Pick attachments on a todo, verify they save and open
- `git tag pre-wave-4`

##### Wave 4 — "Risky residuals" (2 modules, ~1,780 lines; 8-12 hours)

**Modules:** 11-projects-init (helpers only — leave `init()` itself in residual), 12-dump-zone.

**Why last:**
- Bootstrap path. If this breaks, the app doesn't start. Doing it last means previous 9 modules are stable; failure is localized.
- Dump zone references recurrence (Wave 1) and shares mention/smart-link wiring with residual; doing last means dependencies are already in known-good modules.

**Critical:** **do NOT move `init()` itself.** Leave it in residual. Only move the supporting machinery. The risk of subtly altering init's `await window.api.checkRemindersNow()` ordering is the highest single failure mode in the whole modularization.

**Smoke after Wave 4:**
- App launches; active project preserved
- Create new project, rename, delete, undo delete
- Dump a string, route to todo / note / reminder
- Voice-record a dump
- Schema migration runs cleanly on a fresh data dir copy
- `git tag v0.8-modularized`

#### "Stopping early" framing — and why the default is to finish

The pain relief of modularization is **non-linear** and back-loaded. After Wave 1, the residual file is still ~14,675 lines. After Wave 2, ~11,200. After Wave 3, ~9,485. After Wave 4, ~7,700 — the only point at which the file is comfortably below the "this overwhelms me" threshold.

Stopping after Wave 2 is **acceptable only if a higher-priority external feature surfaces** (e.g., a shipping deadline gets pulled in). The default expectation is to finish all 4 waves before pivoting to M1.

The post-Wave-1 stress-test gate (above) is a separate concern: it asks whether modularization is delivering value at all. If the gate says "no value," stop entirely. If the gate says "yes value," finish all 4 waves.

#### State + saveData strategy (locked)

- **`state` is a true singleton in `01-types-state.js`.** Every module references `state` directly via global scope. No injection, no get/set API, no event bus.
- **`saveData()` lives in `03-undo-save.js`.** Every module calls the global `saveData()` directly. The 200+ existing call sites stay literal.
- **The only mechanical rule:** top-level `const`/`let` shared across files becomes `var`. Function declarations stay as-is.

#### Cross-cutting hazards and how each is handled

| Hazard | Handling |
|---|---|
| `window.__nodeLinks` debug surface | Moves cleanly with `05-node-links.js`. Concat + globals = one realm; registers identically. Verify in devtools after Wave 1. |
| `localStorage` scatter (61 call sites) | Don't centralize. Each module takes its keys with it. Keys are already namespaced by feature. |
| `renderApp`/`renderContent` dispatch | Zero change. The `views` object is built each call; function declarations from extracted modules are global; lookup works. **Pre-flight check:** confirm every `renderXxx` is `function renderXxx(...)`, not `const renderXxx = ...`. |
| Theme hooks (`applyCurrentTheme` from showView/switchProject) | Function declaration → global → resolves identically. Smoke after Wave 3. |
| View teardown callbacks | Each Wave-2 extraction moves BOTH `renderXxx` and `teardownXxx` together. |
| Reminder polling (`window.api.checkRemindersNow` → `spawnNextRecurringReminder` in recurrence) | Function declaration → global → resolves identically. Pre-flight check. |
| `init()` orchestrator | **Stays in residual `app.js` permanently.** Only its helpers move. |

#### Test runtime improvement strategy

**Today's measured baseline:** `npm test` takes **~1,033 ms** wall-clock (90 tests passing). Load dominates execution; tests themselves are sub-millisecond.

**Level 1 (HIGHEST ROI, ~2-3 hours, do at end of Wave 1):** restructure `tests/run.js` so test files declare their dependencies:
```js
module.exports = function(describe, helpers, { loadModules }) {
  loadModules(['01-types-state', '02-helpers', '04-recurrence']);
  // ...
};
```
Pure recurrence tests load ~1,500 lines instead of 16,835.

**Verification target:** `npm test` runs noticeably faster than the ~1s baseline — **target ~300 ms or better** (3-4× improvement). If post-Level-1 runtime stays above ~700 ms, the optimization isn't pulling its weight; reassess.

#### Rollback plan

- **Per commit:** every module extraction is one commit. `git revert <sha>` reproduces working state.
- **Per wave:** `git tag pre-wave-N` after each successful wave.
- **Build is trivial:** no compiled artifact. `git checkout <sha>` and `npm start` always works.
- **Catastrophic rollback:** `git revert <first-modularize-sha>..<last-modularize-sha>` brings back the monolith. ~5 minutes.

---

### Phase 2 — M1 through v1.0 (5 distinct milestones; ~5-7 calendar months after M0)

#### M1 — Distribution v0.9 (5-6 weeks elapsed)

**Theme:** Make the app installable on a clean Windows machine.

**Items:**
- §1.2 electron-builder + NSIS + electron-updater (GitHub Releases as the free update channel — unsigned for v1, accept SmartScreen warning). **Budget 3-4 weeks elapsed for this alone.** First-time NSIS + auto-updater setup has a long debug tail.
- §4.1a Tray icon (reuse `icons/workspacehub.ico`)
- §4.1b Global hotkey Ctrl+Shift+Space → routes to existing palette parser → lands in Dump Zone

**Why these together:** §4.1a/b live in `main.js` alongside the BrowserWindow plumbing you'll already be touching for §1.2. M1 produces a v0.9 you can self-install on a fresh VM.

**Skip in M1:** §4.1c JumpList (defer past v1.0).

**Exit criteria:**
- `.exe` installer in GitHub Releases that installs WorkspaceHub on a Win11 VM with no Energy Hero data visible
- Auto-update loop: bump version, tag a release, installed v0.9.0 picks up v0.9.1 within minutes
- Tray icon shows on launch with right-click Open / Quit
- Ctrl+Shift+Space anywhere in Windows opens a tiny capture popup that routes through the palette parser

#### M2 — The "When" view (5-6 weeks elapsed)

**Theme:** Close the audit's biggest UX gap.

**Items:**
- §2.1 Week view (one column per day, todos+reminders+commitments stacked, populated from existing `dueDate`/`startDate`/`datetime` fields)
- §2.2 Focus session log persistence (~50 LOC; persist `{taskId, projectKey, startedAt, endedAt, durationMs}` to `proj.focusSessions[]`)

**Why pair them:** the value of §2.2 isn't insights yet — it's seeing "I focused 3h this Tuesday" rendered in the Week view's day footer.

**Skip in M2:** Month grid (defer past v1.0).

**Exit criteria:**
- Week view reachable from sidebar, 7 columns of cross-entity items
- Recurring expansion correctly shows next 7 instances
- A todo started in sticky/Pomodoro persists to `proj.focusSessions[]` and shows in the Week view's day footer
- Persistence handles the "interrupted session" case (app crashed mid-Pomodoro)

#### M3 — Insights & data portability (4-5 weeks elapsed)

**Theme:** Make work feel like progress, make leaving feel safe.

**Items:**
- §2.3 Insights tab — GitHub-style 365-day heatmap from existing `completedAt`/`doneAt`/`archivedAt` + `focusSessions[]` durations; current-streak counter; per-project completion sparkline. **Budget 7-10 days for this; the audit's 4-6 underestimates the polish on heatmap rendering, streak edge cases (timezone, midnight rollover), and per-project sparkline reuse across views.**
- §4.2a JSON export
- §4.2c JSON import

**Skipped (per user decision):** §4.2b Markdown export. Defer past v1.0 (no current phone-reading workflow).

**Exit criteria:**
- Insights tab renders heatmap, streak counter, sparkline
- Export workspace as JSON → file → import on fresh install → identical workspace
- JSON import goes through `migrateData` so future schema bumps stay safe

**Bonus regression value:** JSON export+import is a great cross-modularization regression test — export pre-modularization data, import post-modularization, diff. Use it.

#### M4 — Bulk parity & polish (2 weeks elapsed)

**Theme:** Close the remaining bulk-action gaps for power-user workflows.

**Items:**
- §4.3a Bulk parity for **notes only** (priority + subproject + tags). Skip commitments/delegations/reminders/dumps/flow-nodes — they've been fine without bulk bars for the app's whole history; ship when users complain.
- §4.3b Bulk add/remove tags across selection (reuses existing `bulkSelectHandler`)

**Skip in M4:**
- Code signing ($200/yr OV cert; revisit if you ever charge or hit ≥50 downloads)
- Generalized Rückbucher → Custom escalation chain (gated by env in distribution; ship as v1.1 if real demand)

**Exit criteria:**
- Notes have done/priority/subproject/tags/archive/delete bulk actions
- Tags can be bulk-added/removed across any list with a bulk bar

#### M5 — Onboarding & ship (2 weeks elapsed)

**Theme:** Make a clean install genuinely usable on first run.

**Items:**
- §1.3 Onboarding: 3-screen first-run wizard (pick template / confirm / done) with §5.1 templates as static JSON files in `templates/`. Templates: Blank, Personal, Work.
- README rewrite with install instructions and "your data lives at `%APPDATA%/workspacehub`"
- Final smoke pass on a fresh Win11 VM
- Tag `v1.0.0` and publish to GitHub Releases

**Why M5 is its own milestone:** onboarding deserves dedicated focus, not a bolt-on to bulk parity work. Template design (what does "Personal" actually contain? what about "Work"?) is the kind of decision that benefits from sitting in its own week without other context-switching.

**Exit criteria:**
- v1.0.0 tag pushed to GitHub Releases with installer
- Clean install opens 3-screen first-run picker; "Blank" gives empty workspace; "Personal"/"Work" populate skeleton data
- README has install + data location + first-run experience screenshot/note

---

## V1.0 ship cut

**V1.0 ships at the end of M5.** Target: **late November / December 2026** if work starts mid-May 2026.

| In v1.0 | Out (post-v1.0) |
|---|---|
| Phase 0 §1.1 generic seed + theme draft archival | §3.1 ICS export (gated on Week-view experience) |
| M0 modularized code (Path A, residual ~7,700 lines) | §3.2 ICS subscribe (v1.2 minimum) |
| M1 installer + auto-update + tray + global hotkey | §4.1c JumpList |
| M2 Week view + focus persistence | §4.2b Markdown export (no current phone workflow) |
| M3 Insights + JSON export/import | §4.3a-rest bulk bars (commitments/delegations/reminders/dumps) |
| M4 Notes bulk parity + bulk tags | §4.3c Bulk move-project |
| M5 3-screen onboarding + templates + README | §4.3d Saved/smart filters (Tags + palette `#tag` already cover) |
| | Month grid view |
| | §5.4 Audit trail (only if insights demand it) |
| | Generalized Rückbucher escalation chain |
| | Code signing |
| | AI features (correctly deferred) |
| | Path B 12-file modularization (Path A is enough) |
| | `styles.css` modularization (separate plan, post-v1.0) |

**Defensibility of this cut:** A stranger downloading v1.0 gets — installer, neutral default, week view, motivation feedback (insights), data portability (JSON), and a way to leave. That's a defensible shippable product.

---

## Dependency graph (text DAG)

**Hard prerequisites (must precede):**
- Phase 0 §1.1 → M1 §1.2 (no point shipping installer with branded seed)
- Phase 0 §1.1 → M5 §1.3 (can't onboard if seed is hardcoded)
- M5 §1.3 onboarding ≡ §5.1 templates (same feature)
- M2 §2.2 focus persistence → M3 §2.3 insights (insights renders focus totals; no data without 2.2)
- M2 §2.1 Week view → post-v1.0 §3.1 ICS export
- M2 §2.1 Week view → post-v1.0 §3.2 ICS subscribe
- M0 modularization → all M1-M5 work (faster, less merge pain)

**Soft pairs (cheaper together):**
- M1 §4.1a tray ↔ §4.1b hotkey ↔ §1.2 installer (all main.js)
- M2 §2.1 ↔ §2.2 (focus totals render in Week view)
- M3 §4.2a ↔ §4.2c (JSON export ↔ import; mirror operations)
- M4 §4.3a ↔ §4.3b (notes bulk bar enables bulk tags)

**Independent:**
- §4.1c JumpList — defer
- §4.3d saved filters — Tags + palette already cover; defer
- §5.4 audit trail — defer; useful only if insights demands it

---

## Push-back / recommendations

**Promote out of audit's bucketing:**
- **§4.1b global hotkey to M1.** Audit lists under "Bucket 4 extras." For a personal-use dev who is also the primary user, this is the highest daily-use lift.
- **§2.2 focus persistence pairs with §2.1 (M2), not §2.3 (M3).** Better pairing: render focus totals in the Week view's day footer.

**Defer (audit is too aggressive):**
- **Drop §4.1c JumpList from v1.0.** No daily user demand; defer past v1.0.
- **Drop month grid from M2.** Validate Week view first.
- **Drop Path B modularization permanently.** Path A residual ~7,700 lines is enough.
- **Defer §4.3 bulk parity for commitments/delegations/reminders/dumps/flow-nodes.** Notes-only is the real audit item; the rest can wait for actual complaints.

**Strict-modularization-first override (per user decision):** Phase 0 cleanup goes BEFORE M0. Justified because §1.1 lives in `main.js`, not `app.js`. The "modularization first" principle is preserved for everything that touches `app.js`.

**Underbudgeted in audit:**
- §1.2 installer "1-2 days" → 3-4 weeks elapsed in this plan.
- §2.1 Week view "few hundred lines" → ~5-6 weeks elapsed.
- §2.3 insights "4-6 days" → 7-10 days elapsed.

**Overkill for one user:**
- Code signing — skipped for v1.0.
- Markdown export — user-confirmed skip.
- Saved/smart filters (§4.3d) — Tags + palette `#tag` already cover.

**Smallest defensible v1.0** (if circumstances force compression to ~5 months): cut M3 to JSON export+import only, cut M4 entirely. Loses insights and bulk tags but ships.

---

## Sizing estimates (S/M/L/XL, with velocity adjustment for two-day-jobs author)

| Item | Audit/optimistic | This plan |
|---|---|---|
| Phase 0 §1.1 + theme archival | 1 day | **1-3 days** |
| M0 modularization Path A (Waves 1-4) | 4-6 days | **30-45 hours actual / 4-6 weeks elapsed** |
| §1.2 installer + auto-update | 1-2 days | **15-20 days actual / 3-4 weeks elapsed** |
| §4.1a tray icon | 1 day | 1-2 days |
| §4.1b global hotkey + capture popup | 2-3 days | 3-5 days |
| §2.1 Week view | "few hundred lines" | **15-20 days actual / 4-5 weeks elapsed** |
| §2.2 focus session persistence | 1 day | 1-2 days |
| §2.3 insights / streaks / heatmap | 4-6 days | **7-10 days actual** |
| §4.2a JSON export | 1 day | 1-2 days |
| §4.2c JSON import | 2-3 days | 3-4 days |
| §4.3a notes bulk parity | 1 day | 1-2 days |
| §4.3b bulk add/remove tags | 1 day | 1-2 days |
| §1.3 + §5.1 onboarding + templates | 3-5 days | **5-7 days, gets its own milestone (M5)** |

**Calendar totals (with velocity buffer):**
- Phase 0: 1 week
- M0: 4-6 weeks
- M1: 5-6 weeks
- M2: 5-6 weeks
- M3: 4-5 weeks
- M4: 2 weeks
- M5: 2 weeks
- **Total: 23-28 weeks ≈ 5.5-7 calendar months elapsed.** Comfortably inside 6-12 month window.

---

## Final recommended sequence (calendar dates with velocity buffer)

Assuming work starts mid-May 2026:

| Phase | Date range | Deliverable |
|---|---|---|
| Phase 0 — §1.1 seed + theme drafts archive | 15 May → 22 May | Distribution build neutral; workspace clutter gone |
| M0 Wave 1 — pure leaves | 22 May → 5 June | 5 modules, app.js residual reduced |
| **🛑 Stress-test gate** | early June | Decide: continue, narrow scope, or stop entirely |
| M0 Wave 2 — big UIs | 5 June → 19 June | 3 more modules |
| M0 Wave 3 — settings/schema | 19 June → 30 June | 2 more modules |
| M0 Wave 4 — risky residuals | 30 June → 14 July | 2 more modules; app.js residual ~7,700 lines |
| M1 — distribution v0.9 | 14 July → 25 August | Installer + auto-update + tray + hotkey |
| M2 — Week view + focus persist | 25 August → 5 October | The "when" view |
| M3 — insights + JSON export/import | 5 October → 8 November | Heatmap + portability |
| M4 — bulk parity & polish | 8 November → 22 November | Notes bulk + bulk tags |
| M5 — onboarding & ship | 22 November → 6 December | First-run wizard + templates + ship |
| **v1.0 ship** | **early-to-mid December 2026** | GitHub Release with installer |

**Optional post-v1.0 (Jan-March 2027):** §3.1 ICS export, §4.3-rest bulk bars (only if demanded), Month grid, §5.4 audit trail, §4.2b Markdown export (if phone workflow emerges), `styles.css` modularization (separate plan).

---

## Risks (ranked by probability × severity)

| # | Risk | P | S | Mitigation |
|---|---|---|---|---|
| 1 | A `const`/`let` not converted to `var` breaks cross-file reference | HIGH | MED | Smoke-test EVERY commit (don't batch). Devtools console error appears immediately. |
| 2 | Inline `onclick="..."` in template strings depends on global scope; would break under future ES module migration | HIGH | LOW | Document the global-scope contract in commit 1's message. ES module migration is a separate decision. |
| 3 | Wave 4 init refactor breaks app launch | LOW | CRITICAL | **Don't move `init()` itself.** Leave in residual. |
| 4 | View teardown function gets accidentally separated from its renderer | LOW | MED | Each Wave-2 extraction takes BOTH `renderXxx` and `teardownXxx` together. |
| 5 | `init()` schema migration runs in wrong order on first launch after upgrade, corrupting user data | LOW | CRITICAL | Manual data-dir backup before launching post-Wave-3 build. Auto-backup helps. |
| 6 | Burnout halfway, abandon mid-modularization | MED | LOW | Each wave is an independent shipping milestone. Stress-test gate after Wave 1 catches "wrong split" early. |
| 7 | §1.2 installer takes 2× even the buffered estimate | MED | MED | This plan budgets 3-4 weeks elapsed. If it runs to 6+ weeks, drop §4.1b global hotkey from M1 to v1.1. |
| 8 | Personal-use friction discovered during build | MED | LOW | Each is a small fix when hit; budget 0.5 day slack per milestone. |
| 9 | SmartScreen warning makes v1.0 feel unprofessional to non-technical users | HIGH | LOW | README + Release notes explain the "Click 'More info' → 'Run anyway'" workaround. |
| 10 | Theme drift — old drafts pull attention | LOW | LOW | **Mitigated by Phase 0 archival to `themes-explored/`.** Drafts out of sight. |
| 11 | Audit's line citations are stale (file grew 2,300 lines since written; recent WIP added another 1,635) | CERTAIN | LOW | Re-verify line ranges before scoping each item. |
| 12 | New gaps not in audit hit during dogfooding | HIGH | LOW | Plan-mode discipline: log to backlog, don't expand current milestone. |
| **13** | **Modularization doesn't actually fix the overwhelm.** Dependencies between modules force Claude Code to still read multiple files at once. The cognitive-load argument for the whole exercise turns out wrong. | MED | HIGH | **Stress-test gate after Wave 1.** Pick a non-trivial change in a new module; ask Claude Code to make it; honestly assess whether overwhelm is reduced. If yes, continue. If marginal, consider re-cutting boundaries before Wave 2. If no, stop entirely — overwhelm may be rooted in `styles.css` or in implicit-global state, not file size. |
| 14 | Two day-jobs leave less time than the "30-50% buffer" anticipates; v1.0 slips past December | MED | LOW | The 6-12 month window has 6 months of slack already. Slipping to Feb 2027 is still inside the window. Don't compress milestones to save time — compress the post-v1.0 backlog instead. |

---

## Critical files

| File | Role | Touchpoints |
|---|---|---|
| `c:\Users\hallo\Desktop\WorkspaceHub\main.js` | Electron main process (~570 lines after recent WIP) | Phase 0 §1.1 seed + M1 installer/tray/hotkey/IPC for export |
| `c:\Users\hallo\Desktop\WorkspaceHub\app.js` | Renderer monolith (~18,470 lines after recent WIP) | All M0 module extractions; M2 Week view; M3 Insights; M4 bulk parity |
| `c:\Users\hallo\Desktop\WorkspaceHub\package.json` | Project metadata | Phase 0 §1.1 description; M1 electron-builder config + scripts; version bumps |
| `c:\Users\hallo\Desktop\WorkspaceHub\index.html` | Bootstrap (68 lines) | M0: insert numeric-prefix `<script src="src/NN-x.js">` tags |
| `c:\Users\hallo\Desktop\WorkspaceHub\preload.js` | IPC bridge (~36 lines after recent WIP) | M3: extend with export/import APIs if needed |
| `c:\Users\hallo\Desktop\WorkspaceHub\tests\run.js` | Test harness (146 lines) | M0 Wave 1: glob `src/*.js` + concat; Level-1 `loadModules()` improvement |
| `c:\Users\hallo\Desktop\WorkspaceHub\styles.css` | Visual layer (~10,175 lines after recent WIP) | **Frozen for v1.0; small targeted edits as features ship. Wholesale modularization is a known future concern — separate post-v1.0 plan if/when CSS work becomes painful.** |
| `c:\Users\hallo\Desktop\WorkspaceHub\data\energy-hero-brainmap.json` | Personal seed data | Phase 0 §1.1: gate behind `WORKSPACEHUB_PERSONAL` env var |
| `c:\Users\hallo\Desktop\WorkspaceHub\themes-explored/` (NEW) | Archived theme drafts + theme-draft markdown files | Phase 0 Task B: created and populated |

---

## Verification (end-to-end)

Each phase has its own exit criteria above. The cumulative v1.0 verification:

1. **Fresh-VM smoke test:** Spin a clean Win11 VM. Download v1.0.0 installer from GitHub Releases. Install. Launch.
   - First-run wizard appears, shows 3 templates.
   - Pick "Blank" — empty workspace.
   - No "Energy Hero" or "AI5innovation" strings anywhere.
   - No Rückbucher checkbox.
2. **Capture loop:** Press Ctrl+Shift+Space anywhere in Windows. Quick capture popup appears. Type "remind me tomorrow at 3pm Lunch with Alex". Verify reminder created with correct date.
3. **The "when":** Open Week view. Drag a todo from Today onto Thursday. Persisted. Reopen → still Thursday.
4. **Focus + insights:** Start a Pomodoro on a todo, end it. Open Insights tab. Today shows the focus minutes, heatmap has a square, streak counter says 1.
5. **Data portability:** Export workspace as JSON. Open the file — it's readable. Wipe data dir. Launch app — fresh install, first-run wizard. Import the JSON. All projects/todos/notes/tags/links restored.
6. **Update loop:** While v1.0.0 is installed on the VM, push a v1.0.1 tag. Within ~5 min the installed app picks up the update and restarts cleanly.
7. **Modularization sanity:** Verify `app.js` is < 8,000 lines. Verify `src/` contains 12 files in numeric order. Verify `npm test` runs noticeably faster than the ~1s baseline (target ~300 ms or better with Level-1 `loadModules` optimization in effect).

---

## Closing notes

- **The audit was solid.** Most disagreements are about prioritization, not correctness. The biggest changes: promote §4.1b hotkey, defer §4.1c JumpList, defer most bulk bars, defer Markdown export.
- **The single largest risk to the timeline is §1.2 installer.** First-time `electron-builder` always takes longer than expected. Buffered to 3-4 weeks elapsed in this plan.
- **The plan stops after Path A modularization deliberately.** Path B is busywork for collaborators that don't exist.
- **The post-Wave-1 stress-test gate is non-negotiable.** Modularization is overhead; it has to pay for itself in reduced cognitive load. If it doesn't, stop.
- **`styles.css` is out of scope.** ~10,175 lines (after recent WIP) is at the edge of overwhelming and will be revisited in a separate post-v1.0 plan if and when CSS work becomes painful.
- **Theme is frozen** and **drafts are archived** to `themes-explored/`. The frozen `styles.css` IS the v1.0 visual identity.

This document is the canonical source of truth for the next 6-12 months of WorkspaceHub work.
