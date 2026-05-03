# WorkspaceHub — Future Changes

A backlog. Numbered for easy reference (`do #3.2`). Order within each
section is rough priority but fungible.

---

## 1. Done

Shipped work that used to live here. Listed for memory; the canonical record
is git log.

- **1.1 Spark Map ↔ Entity linking — Phases 1-3 + polish.** Generic node↔entity
  links with chokepoint helpers, per-node detail panel with inline create
  + link-existing for all 6 entity types, reverse-link chips on every
  entity view, slash-command UX in every rich form, hide-archived /
  hide-done filters, inline mark-done, pinpoint navigation. See
  `SPARK_MAP_LINKING_PLAN.md` for the canonical design.

- **1.2 Pull view (Phase B).** Daily landing surface — a leaner take on the
  three-layer "Pulse" landing originally proposed. Currently parked in the
  Lab section (see §2.2).

- **1.3 Molecular drill-down focus (Phase A).** Stage 0 of the molecular
  build plan. Now parked (see §2.1).

- **1.4 @-mentions everywhere, not just notes** (`8aa96a0`).
  Completer fires in every free-text surface (todo titles + add input,
  reminder title/note, commitment counterparty/description/notes,
  delegation task/delegated_to/notes, dump zone, flow node text). Saved
  `@Label` patterns render with the same orange chip styling and
  click-through navigation everywhere (not just in note content).

- **1.5 Tags as a workspace-wide layer** (5 commits, `e2a4ede` → `a460e3b`).
  - Schema v3: `tags: []` on todo/note/commitment/delegation/reminder/dump.
  - `#tag` chips render on every entity card.
  - Tag inputs on every add form + commitment/delegation expanded edit
    + todo expanded edit. Native `<datalist>` autocomplete from the
    workspace tag pool (single-tag-aware; per-tag completion in a long
    comma list would need a custom popover).
  - New `Tags` view: cloud header with counts + filtered cross-type /
    cross-project listing. Tap any chip in the app → jump to Tags view
    with that filter. Tap a result row → navigate to the entity with
    pinpoint scroll-and-pulse highlight (reusing §3.1's helper).
  - Palette filter: queries starting with `#` go into tag-mode
    (`#q4` shows everything tagged q4*).

---

## 2. Paused / low priority

Once framed as the North Star; moved to the Lab section after real-use
feedback. Documented in case you want to revisit. Neither is on a path to
graduation right now.

- **2.1 Molecular landing as North Star.**
  Stage 1 (2D force simulation), Stage 2 (3D illusion via `transform: rotate3d`),
  Stage 3 (Three.js cinematic). Today reachable via Lab → Universe.

- **2.2 "The Pulse" three-layer landing.**
  Live-threads strip, graph mini-map, today's triage stacked vertically.
  Pull view ships a leaner v0 of the same idea; the full three-layer vision
  is parked.

- **2.3 Workspace-wide graph view.**
  Spark Map is per-project. A `Workspace > Connections` view that visualizes
  the full graph (every project's items as nodes, mentions/links as edges,
  project-color clustering) would be the brand image of the app. Big build
  — force simulation, visual hierarchy, click-through navigation. Read-only
  at first. Worth doing only after the connection infrastructure under §3
  is in place; until then there isn't enough to graph.

- **2.4 Daily review with a graph prompt.**
  End-of-day modal: *"You touched 5 todos, 2 notes, 1 commitment today.
  They cluster around 2 themes. Anything to capture about how they connect?"*
  Single textarea + auto-suggested topic chips, saves a `review` note
  linked to everything touched. Forces implicit connections to become
  explicit edges; potential engagement-loop driver. Depends on §3.2 (tags)
  being workspace-aware to detect "themes."

**Decoupling note**: items previously framed as "make the molecule denser"
still earn their keep on their own merits. They live under §3 with the
molecular framing removed.

---

## 3. Open — connection infrastructure

The "everything connects" thesis now lives in Spark Map (per-project) +
reverse-link chips on entity views. These items extend that connection
layer further across the workspace.

- **3.1 @-mentions everywhere** — *shipped, see §1.4.*

- **3.2 Tags as a workspace-wide layer** — *shipped, see §1.5.*

- **3.3 Smart link suggestions while typing.**
  When the user types "the proposal" anywhere, ghost-text whispers
  `↗ Q4 Proposal · Energy Hero`. Tab inserts as `<a class="mention">`.
  Reuse the slash-command ghost-text engine (`suggestSlashCompletion`
  + overlay div + Tab handler) — same UX, different content source.

  Heuristic: 3+ characters typed AND a fuzzy match against an existing
  item title or tag. Match index: every entity title + every tag. Lazy
  build, invalidate on entity create/delete (Phase 1 reverse-index pattern).
  False positives kill trust — set the threshold conservatively.

---

## 4. Open — big features

- **4.1 Phone read-only view.**
  See today's items + overdue from any phone, even one-way.

  Cheapest path: nightly export from the Electron app to a Markdown or
  HTML file in a synced folder (OneDrive / Dropbox / iCloud). Phone reads
  from the cloud folder. No server, no auth, no real sync logic.

  Stages:
  1. One-shot "Export today" command writes `today.md` to a configured path.
  2. Auto-export on data change (debounced) so the file is always fresh.
  3. Pretty HTML version with project-color accents.

  Out of scope (for now): two-way sync, mobile-native app, offline writes.

- **4.2 Cross-device sync.**
  Real two-way sync. Big project. Skip until 4.1 proves the use case.

- **4.3 AI features.**
  Tempting but premature. Wait until 3.1 + 3.2 + 3.5 ship and the link graph
  is populated — that's the substrate an LLM needs to be useful here.

- **4.4 Modularize app.js.**
  `app.js` is now ~14,500 lines (up from 11,408 when this was first
  written). Not a problem yet, but the file has grown another ~3k since
  the plan was last revised — Path A is more attractive now because the
  payoff scales with file size.

  **Why bother**
  - Faster to find code (open `flows.js`, not scroll past 9k lines).
  - Less IDE lag on the big file.
  - Foundation for any future build step / TypeScript / module tests.
  - Lower merge-conflict risk.

  **Path A — 80/20 split** (~1.5–2 hours)
  Extract only the 4 biggest, most self-contained sections:
  - `src/recurrence.js`  (~840 lines)
  - `src/dump-zone.js`   (~1,100)
  - `src/flows.js`       (~860)
  - `src/spark-map.js`   (~950, plus the Phase 2-3 additions)

  Brings `app.js` from ~14,500 → ~10,500. Keeps the rest stable.

  **Path B — Full 12-file split** (~3.5–6 hours)
  See git history for the detailed file map. Path B is now bigger than
  originally estimated because of the spark-map workstream's added code.

  **Approach (multi-script, no build step, no ES modules)**
  - Multiple `<script src="src/NN-x.js">` tags in `index.html` numeric order.
  - All globals stay shared — no `import` / `export` rewrites needed.
  - `tests/run.js` updated to glob `src/*.js` alphabetically and concat
    before running in the vm.

  **Risks**
  - `const`-arrow declarations don't hoist — file load order matters.
    Mitigation: numeric prefix in filenames forces order.
  - Tests cover ~20% of the codebase (pure functions). UI regressions
    only surface on manual smoke test — budget time to click through
    every view.
  - Large excisions of 1,000+ line sections need a Node one-liner; the
    `Edit` tool can't comfortably match 1,000-line `old_string`.

---

## 5. Smaller items parked

- **5.1 Project templates.** Presets that pre-populate subprojects, flows,
  and a skeleton dashboard. Stored as `state.data.projectTemplates[]` or
  static JSON in `templates/`. Initial set: Sales Pipeline / Research /
  Personal Goal / Client Account / Blank.
- **5.2 Auto-merge similar items in palette** — "you already have a similar
  todo, merge?"
- **5.3 Cloud-folder backup auto-rotation.**
- **5.4 Audit trail per item** — "edited 3h ago", "marked done by you 2d ago".
- **5.5 Smart inbox for unsorted captures** with daily triage prompt.
- **5.6 Workspace-wide vs per-project setting separation.**

---

## 6. Deferred — not the personal-hub priority

- **6.1 People as entities.**
  A people directory was considered but doesn't fit the "personal mirror"
  thesis. The user explicitly said: *"the app should still be the hub for
  one's own work, regardless what other people are involved."*

  If revived: `state.data.people: Person[]`, migrate `commitment.counterparty`
  / `delegation.delegated_to` strings into references. Person cards aggregate
  everything mentioning them.

  For now: leave people as strings, focus the graph on the user's own
  projects/items/topics.
