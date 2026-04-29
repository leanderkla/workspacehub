# WorkspaceHub — Future Changes

Parked items that we agreed to revisit later. Order is rough priority.

## North star — the molecular landing

The app's thesis is **"a hub for one person's work, where everything
connects."** It's a mirror, not a CRM. The user is at the center.

The centerpiece is the **3D-feeling molecular landing page** — a force-
directed graph centered on `[you]`, with everything you work on radiating
outward like atoms with bonds. Distance from center = recency × relevance.
Things drift outward as they go cold; recent activity pulls them in.

Every other feature in this section should be evaluated against:
*does this make the molecule denser, more legible, or more alive?*

### The molecular landing  *(centerpiece — build first)*

**The five primary axes** branching from `[you]`:
1. **PROJECTS** — territory bonds (one per non-archived project, project-colored).
2. **NOW** — today + overdue + reminders firing today. Shortest, hottest bonds.
3. **RECENT** — items touched in last 7 days. Warm cluster.
4. **PINNED** — manually-curated bookmarks. Always near center.
5. **DRIFTING** — items untouched 30+ days. Far orbit, dim. Visual decay.

**Two layers of bonds:**
- *Primary* (thick, project-colored): `[you]` → project → subproject → item.
- *Secondary* (thin, neutral): cross-refs — @-mentions, linked todos, same-tag.

**The physics:**
- Force-directed simulation, `[you]` fixed at origin.
- Items repel each other (n-body); bonded items attract; primary parent pulls.
- **Time-decay weight**: every item has weight = recency × activity. Heavy = pulled
  inward. Light = drifts outward. The molecule reshapes daily.

**Build stages**

*Stage 1 — 2D molecular landing (1–2 weeks)*
- New view `molecular`, gated by setting `state.landingStyle: 'today' | 'molecular'`.
- Reuse Spark Map's SVG renderer + add a force-simulation step.
- Single workspace graph centered on `[you]`.
- Click a node → camera pans, that node becomes the new focus.
- Hover → highlight 1-hop neighborhood, dim the rest.
- Pan + zoom (mouse drag + wheel).
- Ships alongside Today, opt-in via Workspace settings.

*Stage 2 — 3D illusion (1 week)*
- Add z-axis to the layout.
- Mouse drag rotates camera via `transform: rotate3d(...)`.
- Z-based scale + brightness so distant nodes recede.
- Subtle idle auto-rotate so the graph looks like it's breathing.

*Stage 3 — Real WebGL (optional, only if Stage 2 isn't enough)*
- Three.js port — particle trails, depth-of-field, post-processing.
- This is the cinematic / brand-image version.

**Why no Three.js for stage 1+2**: pure SVG with CSS 3D transforms covers
95% of the magic and doesn't add a dependency. Hundreds of nodes is fine
for SVG; we're not rendering a million-particle scene.

**Replaces or supplements Today?** Build alongside (settings-gated) at first.
If it lands the way we hope, Today becomes a slice through the graph (the
"NOW" axis collapsed to a list) — eventually redundant.

### Supporting features (build after Stage 1 lands)

These all make the molecule denser, smarter, or prettier. Order is rough.

#### @-mentions everywhere, not just notes

The completer (`openMentionCompleter`, `findCaretMention`,
`buildMentionResults`) only fires inside `note-content`. Surface it in:
- Todo titles (editable spans + add-form input)
- Reminder notes
- Commitment / delegation description fields
- Dump zone capture box (already contenteditable)
- Flow node text (already contenteditable)

Factor `setupNoteEditorEvents` mention wiring into `installMentionCompleter(el)`
and call everywhere that accepts free text. Decoration is free.

**Why for the molecule**: more @-mentions = more secondary bonds = denser graph.

#### Tags as a workspace-wide layer

Tags exist on notes only. Extend to todos, commitments, dumps, reminders.
Then "show everything tagged #q4" is a workspace neighborhood — one tightly
clustered region of the molecule.

Stages: schema additions → tag chips → workspace tag pool → `Tags` view
(optional sidebar entry) → palette filter (`#q4`).

**Why for the molecule**: tags are a weak-but-cheap connection layer. Items
with shared tags get pulled together by the force simulation.

#### Smart link suggestions while typing

When the user types "the proposal" anywhere, ghost-text whispers
`↗ Q4 Proposal · Energy Hero`. Tab inserts as a `<a class="mention">`.

Reuse the existing slash-command ghost-text engine (`suggestSlashCompletion`
+ overlay div + Tab handler) — same UX, different content source.

**Why for the molecule**: lowers the friction for adding bonds. Every
accepted suggestion is a new edge in the graph.

#### Topics — link-only nodes

Lightweight new type: a "Topic" has a name, a color, no due date, no
checkbox. Pure node. Other items link to it.

> "Q4 Strategy" as a topic → 8 items mention it → opening Topic shows the 8.

Roam calls these `[[brackets]]`. We pick our own term ("Topic," "Anchor,"
"Hub" — match brand).

**Why for the molecule**: topics become high-degree nodes that visibly
cluster their neighborhood — the "constellations" of the graph.

#### Daily review with a graph prompt

End-of-day modal (e.g. 18:00):
> "You touched 5 todos, 2 notes, 1 commitment today. They cluster around
> 2 themes. Anything to capture about how they connect?"

A textarea + auto-suggested topic chips. Saves as a `review` note tagged
with date, linked to everything touched.

**Why for the molecule**: forces implicit connections to become explicit
edges. Becomes the engagement loop — the reason to return tomorrow.

### People as entities  *(deferred — not the personal-hub priority)*

A people directory was considered but doesn't fit the "personal mirror"
thesis. The user explicitly said: *"the app should still be the hub for
one's own work, regardless what other people are involved."*

If revived later: `state.data.people: Person[]`, migrate
`commitment.counterparty` / `delegation.delegated_to` strings into
references. Person cards aggregate everything mentioning them.

For now: leave people as strings, focus the graph on the user's own
projects/items/topics.

### @-mentions everywhere, not just notes

The mention completer (`openMentionCompleter`, `findCaretMention`,
`buildMentionResults`) only fires inside `note-content` contenteditable.
Surface it in:
- Todo titles (the editable contenteditable spans + add-form input)
- Reminder notes
- Commitment / delegation description fields
- Dump zone capture box (now contenteditable, easy)
- Flow node text (now contenteditable, easy)

**Implementation note**: `setupNoteEditorEvents` has the working pattern.
Factor out into `installMentionCompleter(el)` and call it everywhere that
accepts free text. Decoration (`decorateMentions`) already works on any
root, so display is free.

### Tags as a workspace-wide connection layer

Tags exist on notes only. Extend to todos, commitments, dumps, reminders.
Then the killer query: **"Show everything tagged #q4"** as a workspace
neighborhood view, not a per-type filter.

**Stages**
1. Add `tags: string[]` to todo, commitment, dump, reminder schemas (no
   migration needed — undefined → empty).
2. Tag chips on each item card; tag input in each editor.
3. Tag autocomplete pulls from a workspace-wide tag pool.
4. New view: `Tags` (sidebar, optional). Click a tag → see all items across
   all types and projects with that tag.
5. Workspace search filters by tag (`#q4` in palette).

### Workspace-wide graph view

Spark Map is per-project. Build a `Workspace > Connections` view that
visualises the entire graph: every project's items as nodes, @-mentions
and linked-todos as edges, project-color clustering.

This is the *picture of the thesis* — even if read-only at first, it
becomes the brand image of the app.

Reuse the SVG layout engine from Spark Map. Edges = mentions + linked-todos.
Hover a node → highlight its 1-hop neighborhood, dim the rest.

### Smart link suggestions while typing

When the user types "the proposal" anywhere, the app whispers:
`↗ Q4 Proposal · Energy Hero` as a ghost-text suggestion. Tab inserts it
as a `[[link]]` (or the existing `<a class="mention">`).

This is the magic moment from Roam / Obsidian. The infrastructure is
already there — the slash-command ghost-text engine
(`suggestSlashCompletion`) is the same UX pattern with a different content
source. Reuse the overlay div + Tab handler.

**Heuristic**: when the user has typed 3+ characters of a word and there's
a fuzzy match against an existing item title, offer the completion.

### Topics — items that exist mainly to be linked-to

A new lightweight type. A "Topic" has a name, a color, no due date, no
checkbox. It's a node whose only purpose is for other things to link to it.

> "Q4 Strategy" as a topic → 8 items mention it → opening the Topic shows
> all 8 plus the topic's own optional description.

Roam calls these `[[brackets]]`. Notion calls them pages. Obsidian calls
them notes. We'd want our own name — "Topic," "Anchor," "Hub," something
that fits the brand.

**Data**: `Project.topics: Topic[]` or workspace-wide. Probably workspace-wide
to match the "everything connects" thesis (a topic might span projects).

### Connected landing page — "The Pulse"

Replace the current Today list-first layout with a connection-first
landing. Three stacked layers:

**1. The Pulse strip (hero)**
3–5 "live threads" — clusters of recently-touched items that link to each
other. Each card is a horizontal summary:
> 🔥 Energy Hero — Q4 push · last touched 2h ago
> 3 open todos · 2 notes · 1 commitment to Lukas · next: call tomorrow 14:00
> [chip: ✅ Schick Angebot] [chip: 📝 Q4 Strategy] [chip: 🤝 Lukas owes diagram]

A thread = compute by: take 5 most recently-touched items, walk @-mentions
one hop out, group by connected component.

**2. Graph mini-map**
~300px tall. Nodes = items touched in last 7 days. Edges = mentions + linked
todos. Today's overdue glow. Hover a node → highlight neighbors, dim rest.

**3. Today's triage (existing)**
Keep current Today buckets, but each row shows outbound link chips inline
instead of buried in a sub-panel.

**Activation**: gate behind a setting (`landingStyle: 'today' | 'pulse'`)
so today's view stays the default until Pulse is solid.

### Bidirectional connections inline

When viewing a commitment to "Lukas," show *every* other thing involving
Lukas right on the card — not in a sub-panel. The connections are the
value; surface them.

Same pattern for: viewing a note shows what links to it (already partly
done via `backlinksPanelHTML`); viewing a todo shows linked notes (already
done) + mentioned people + same-tag siblings; viewing a person shows their
full dossier.

### Daily review with a graph prompt

End-of-day modal (configurable time, e.g. 18:00):
> "You touched 5 todos, 2 notes, and 1 commitment today. They cluster
> around 2 themes. Anything to capture about how they connect?"

Forces the user to make implicit connections explicit. Fills the graph
with edges that pure auto-detection misses. Becomes the engagement loop —
the reason to come back tomorrow.

UX: a single textarea + auto-suggested topic chips ("Q4 push," "Lukas").
Saves as a special "review" note tagged with today's date and linked to
everything touched.

---

## Big features

### Phone read-only view
Goal: see today's items + overdue from any phone, even if just one-way.

Cheapest path: nightly export from the Electron app to a Markdown or HTML file
in a synced folder (OneDrive / Dropbox / iCloud). Phone reads from the cloud
folder. No server, no auth, no real sync logic.

Stages:
1. One-shot "Export today" command writes `today.md` to a configured path.
2. Auto-export on data change (debounced) so the file is always fresh.
3. Pretty HTML version with project-color accents.

Out of scope (for now): two-way sync, mobile-native app, offline writes.

### Cross-device sync
Real two-way sync. Big project. Skip until phone read-only proves the use case.

### AI features
Tempting but premature. Wait until backlinks (#5) ship and the link graph is
populated — that's the substrate an LLM needs to be useful here.

### Modularize app.js

`app.js` is 11,408 lines in one file. Not a problem yet, but worth splitting
before it actively hurts. Plan picked but not executed.

**Why bother**
- Faster to find code (open `flows.js`, not scroll past 9k lines).
- Less IDE lag on the big file.
- Foundation for any future build step / TypeScript / module tests.
- Lower merge-conflict risk if anyone else ever touches the codebase.

**Two paths — pick one**

**Path A — 80/20 split** (~1.5–2 hours)
Extract only the 4 biggest, most self-contained sections:
- `src/recurrence.js`  (~840 lines)
- `src/dump-zone.js`   (~1,100)
- `src/flows.js`       (~860)
- `src/spark-map.js`   (~950)

Brings `app.js` from 11,408 → ~7,650. Keeps the rest stable. Good if you want
the readability win without the full risk.

**Path B — Full 12-file split** (~3.5–4.5 hours, expected; up to 6 if rework)

```
src/
├── 01-foundation.js     (~380)   types + state + helpers + undo/redo
├── 02-schema.js         (~540)   migrations + load/save
├── 03-projects.js       (~610)   projects + pinned + archive + confirm modal
├── 04-themes.js         (~530)   THEMES + applyTheme + settings tabs
├── 05-shell.js          (~1,000) cheatsheet + palette + sticky v3 + slash commands
├── 06-render.js         (~190)   renderApp + renderSidebar + render-content router
├── 07-mentions.js       (~340)   @-mentions completer + backlinks
├── 08-views-landing.js  (~960)   today + dashboard + overview
├── 09-views-notes.js    (~350)   notes editor + RTF paste sanitiser
├── 10-views-todos.js    (~1,440) todos + bulk + recurrence
├── 11-views-tracking.js (~2,330) subprojects + reminders + dump + commitments
│                                 + delegations + gantt + contexts
├── 12-views-make.js     (~1,810) flows + spark map
└── 13-boot.js           (~30)    entry point
```

**Approach (multi-script, no build step, no ES modules)**
- Multiple `<script src="src/NN-x.js">` tags in `index.html` in numeric order.
- All globals stay shared — no `import` / `export` rewrites needed.
- `tests/run.js` updated to glob `src/*.js` alphabetically and concatenate
  before running in the vm.

**Why not ES modules?** Would force `import { state } from './state.js'`
on every cross-file reference (~hundreds of edits) and require rewriting the
test harness. Higher risk, more time, no immediate payoff. Defer.

**Execution order**
1. Update `tests/run.js` to read from `src/*.js` (with fallback to `app.js`
   so tests still pass mid-refactor).
2. Move file 01 (foundation) → run tests → smoke-test → commit.
3. Repeat for 02–13, one commit each.
4. Update `index.html` script tags, delete `app.js`, run tests, smoke-test.

**Risks**
- `const`-arrow declarations don't hoist — file load order has to be right.
  Mitigation: numeric prefix in filenames forces order.
- Tests cover ~20% of the codebase (pure functions). UI regressions only
  surface on manual smoke test — budget time to click through every view.
- Large excisions of 1,000+ line sections need a Node one-liner in Bash
  (`Edit` tool can't comfortably match 1,000-line `old_string`).

**Where to find the original analysis**
This was discussed in detail in the session ending around 2026-04-28 — the
roadmap conversation that shipped today/undo/bulk/recurring/backlinks/etc.

## Project templates

When creating a new project, offer presets that pre-populate subprojects,
flows, and a skeleton dashboard. Stored as `state.data.projectTemplates[]`
or as static JSON files in `templates/`.

Suggested initial templates:
- **Sales Pipeline** — subprojects: Discovery / Outreach / Negotiation / Closed.
  Default flow: Cold-call discovery script with 5 standard branches.
  Default todo: "Add lead source list".
- **Research Project** — subprojects: Literature / Methods / Results / Writing.
  Default flow: Weekly review prompt.
- **Personal Goal** — subprojects: Habits / Milestones. Recurring todo for
  weekly check-in.
- **Client / Account** — subprojects: Onboarding / Active work / Invoicing.
  Default commitment placeholder.

UX: in the New Project modal, add a "Start from template" segment with
"Blank · Sales · Research · Personal · Client". Blank = current behavior.

## Smaller items parked

- Auto-merge similar items in palette ("you already have a similar todo, merge?")
- Cloud-folder backup auto-rotation
- Audit trail per item ("edited 3h ago", "marked done by you 2d ago")
- Smart inbox for unsorted captures with daily triage prompt
- Workspace-wide vs per-project setting separation

## Done (moved out of this file)
_(nothing yet)_
