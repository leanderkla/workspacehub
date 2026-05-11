# WorkspaceHub — what's missing? (advisory)

## Context

You asked: *"is my app missing something?"* — with the constraint that this version stays local-first, no paid integrations, free integrations OK if truly free at distribution scale.

This isn't an implementation plan — it's a curated answer to that question, pulled from a full read of the codebase plus an independent gap audit. The ordering is opinionated: I'm sorting by "what would a paying user notice first" and "what would block you from selling."

## TL;DR

WorkspaceHub is genuinely feature-deep — Tags, @-mentions everywhere, Spark Map, Pull/Today, Sticky+Pomodoro, Commitments, Delegations, Gantt, Molecular 3D. It's far ahead of most "v1" task apps. Your existing roadmap ([FUTURE_CHANGES.md](FUTURE_CHANGES.md)) is healthy.

The actual gaps split into three buckets:

1. **Ship-blockers** — things that prevent you from selling/distributing tomorrow. Two are non-obvious and severe.
2. **"Stay on top of when" gaps** — the calendar-shaped hole.
3. **Free-and-distributable extensions** — the small set of online integrations that genuinely cost $0 forever.

Things on your roadmap are out of scope here unless I'd reprioritize them — flagged at the end.

---

## Bucket 1 — Ship-blockers (must-fix before distribution)

### 1.1 The seed data is your real business — not generic
**Severity: critical. Privacy + branding leak.**

- [main.js:100-181](main.js#L100) `getDefaultData()` returns `activeProject: 'energy-hero'` with two pre-named projects: **"Energy Hero"** and **"AI5innovation"**. Anyone who installs the app and opens it sees your two real businesses as their starter projects.
- [main.js:134](main.js#L134) loads [data/energy-hero-brainmap.json](data/energy-hero-brainmap.json) into the seed brainmap. Your actual strategy nodes ship with the binary.
- [package.json:4](package.json#L4) `"description": "Personal workspace manager for Energy Hero & AI5innovation"` — this is the description users see in installers and process lists.
- [app.js:1298](app.js#L1298) the Settings UI has a literal *"Energy Hero — ↻ Rückbucher button"* checkbox baked into global Workflow shortcuts. Visible only when Energy Hero is active, but it's still a vendor-specific item in a public Settings tab.

**Fix shape (small):**
- Replace `getDefaultData()` with either (a) an empty workspace + first-run "Create your project" wizard, or (b) a generic "My Workspace" / "Personal" pair with neutral example notes/todos.
- Gate the Energy Hero seed + brainmap behind a build flag (`process.env.WORKSPACEHUB_PERSONAL=1`) so your own install is unaffected, but distribution builds get the generic seed.
- Generalize the Rückbucher feature to "Custom escalation chain" with user-defined offsets, OR strip it from public builds with the same flag. → ✅ Shipped in `d7b631a` as Custom Escalation Chains; legacy `kind:'rueckbucher'` data auto-migrates via schema v4.
- Update package.json description to something neutral.

### 1.2 No installer, no auto-update
**Severity: high. You can't sell a folder.**

- [package.json](package.json) has only `start`, `test`, `build:three` — no `electron-builder`, no `electron-updater`, no NSIS/dmg pipeline.
- "Distribution" today means zipping the folder. Updates mean re-zipping.

**Fix shape (medium):**
- Add `electron-builder` dev dependency, NSIS target for Windows (your current platform), GitHub Releases as the free update feed, `electron-updater` in `main.js`. All free.
- Code-signing is the one cost (~$200/yr for a Windows EV cert, less for OV). First release without signing works at the cost of a SmartScreen warning — accept that for v1.
- Once shipped: version reporting, taskbar pin survives updates, automatic delta downloads.

### 1.3 No first-run / onboarding
- Today: install → silently load Energy Hero seed → no welcome, no tour. For a paid product, the first 60 seconds is the make-or-break demo.
- Pairs naturally with **§5.1 (Project templates)** which is already on your roadmap. Once you fix 1.1, you need *something* to populate a fresh install — templates are exactly that. Promote §5.1.

---

## Bucket 2 — "Stay on top of when" (the biggest UX gap)

### 2.1 No week / month calendar view
You have **Today** (single-day pull surface) and **Gantt** (per-subproject + cross-project timeline). What you're missing is the in-between: *"What does Wednesday next week look like?"*

- All the data is already there: `todo.startDate` + `todo.dueDate`, `reminder.datetime`, `commitment.due_date`, recurring expansion. None of the existing views render it as a 7-column grid.
- A simple week-agenda view (one column per day, items stacked) plus optional month grid is a few hundred lines at most.
- This view is also where 2.2 and 2.3 below naturally land.

**Why this matters specifically for "stay on top":** the Pull view answers "what's now"; Gantt answers "what's the long arc." Neither answers "did I commit to too much this Thursday." That blind spot is the #1 reason things slip.

### 2.2 No focus-session log → no focus totals
- [app.js](app.js) `state.focusSession` is in-memory only; sessions vanish on close.
- Persisting `{taskId, projectKey, startedAt, endedAt, durationMs}` to `proj.focusSessions[]` on session end is ~50 lines and unlocks "12.4 h focused this week" — turns Pomodoro from gimmick into retention loop.

### 2.3 No insights / streaks / completion heatmap
- Every `completedAt`, `doneAt`, `archivedAt` is already stamped on todos, reminders, commitments. The data exists — no view consumes it.
- A GitHub-style completion heatmap, a current-streak counter, per-project completion-rate sparkline would land in a single Insights tab. Schema-free build.
- Strongest motivation hook the app currently lacks. For "staying on top," seeing the streak on yesterday's done items is more motivating than seeing today's empty list.

---

## Bucket 3 — Free online integrations that actually scale

The only integration that's genuinely free at distribution scale, with no per-user cost ever, is **iCalendar (`.ics`)**. Email/cloud-storage APIs all eventually meter you. ICS is just files.

### 3.1 ICS export (one-way, file-based)
- On save, write `WorkspaceHub-Calendar.ics` to a user-chosen path — typically their OneDrive/Dropbox/iCloud folder.
- Outlook, Google Calendar, Apple Calendar can all subscribe to a file URL. Updates flow one-way to the calendar of their choice.
- Piggy-backs on your **§4.1 (phone read-only via synced cloud folder)** thesis. Same delivery mechanism, different format.
- "Add this todo to calendar" button: writes a single VEVENT, OS opens it in default calendar app. Works everywhere.

### 3.2 ICS subscribe (read-only inbound)
- Bigger build: parse a remote/local `.ics`, render external events alongside todos in the week view from 2.1.
- Lets you see your work calendar's meetings inside WorkspaceHub without an API key. Genuinely free.
- Defer until 2.1 ships — no point importing events with nowhere to render them.

### 3.3 Things that aren't actually free at scale
For honesty: skip Google Calendar API (OAuth + per-user app review), skip Gmail/Outlook integration (token storage + Microsoft/Google account-app costs at volume), skip any LLM features (per-user inference cost — already deferred in §4.3). The "free" version of each of these has terms that forbid commercial redistribution or rate-limit you the moment you grow. ICS is the only path.

---

## Bucket 4 — Distribution-readiness extras (smaller)

### 4.1 System tray + global capture hotkey
- No `Tray` import in [main.js](main.js); no `globalShortcut` registered. The app vanishes when minimized.
- **Tray icon** with "Open / Quick capture / Pause reminders / Quit" — 80 lines, reuses [icons/workspacehub.ico](icons/workspacehub.ico).
- **Global hotkey** (default Ctrl+Shift+Space) opens a tiny capture popup → IPC → existing palette parser → Dump Zone. Highest-leverage capture-friction reducer in the app.
- **Windows JumpList**: right-click taskbar → "Quick capture / Open Today / New todo". `app.setUserTasks()`, ~30 lines.

### 4.2 JSON / Markdown export + JSON import
- Today: 15-min ZIP backup is a black box. No way to export one project as Markdown for archival, no way to move data between machines without restoring a full backup.
- **Markdown export** (notes → `.md` with frontmatter; todos → checklist `.md`; attachments referenced relatively) doubles as the cheapest possible "phone read-only view" — Obsidian, iA Writer, every plain-text mobile reader renders it. You ship §4.1 of your roadmap as a side-effect.
- **JSON import** so users can leave/return without ZIP-restore dance. Required for "your data is yours" defensibility.

### 4.3 Bulk parity + saved/smart filters
- [app.js:9444-9523](app.js#L9444) the todo bulk bar is excellent (done / priority / subproject / set-due / +1d / archive / delete / select-all). [app.js:8194-8260](app.js#L8194) notes bulk has only archive + delete + select-all. Commitments / delegations / reminders / dumps / flow nodes have **no bulk bar at all**.
- Two specific extensions: **bulk tag** (add/remove tag across selection) and **bulk move-project** (reassign 20 mis-filed dumps in one action). Both reuse your existing `bulkSelectHandler`.
- **Saved filters in sidebar**: the palette already does cross-project search and `#tag` filter. Add "save this query" → sidebar entry. Killer use case: *"Notes I haven't touched in 30 days"* — the "what slipped" surface you currently lack.

---

## What I would NOT add (or would defer)

- **AI features (§4.3)** — your deferral is correct. Per-user inference cost contradicts the constraint. Revisit when local LLMs (llama.cpp, Ollama) are good enough on consumer hardware to be optional, not required.
- **Cross-device sync (§4.2)** — also correctly deferred. Once §4.1 (HTML phone view) and 3.1 (ICS export) ship, you may find sync isn't needed for the use case at all.
- **People as entities (§6.1)** — your call to defer is right; commitments/delegations counterparties as strings is enough until proven otherwise.
- **Encryption / vault** — niche; can wait until a user actually asks. No regulated data on the roadmap.
- **Real-time collaboration / multi-user** — out of constraint (would require server).

---

## Roadmap re-prioritization I'd suggest

| Item | Current | Suggested | Why |
|---|---|---|---|
| §5.1 Project templates | Parked | **Promote — bundle with 1.1 fix** | You need a non-EH default. Templates are that default. |
| §5.4 Audit trail | Parked | **Promote — small** | `completedAt`/`updated` already exist; a tiny `events: []` ring buffer unlocks "what changed today" digests at low cost. Pairs with insights (2.3). |
| §4.4 Modularize app.js | Open | Keep, extract `recurrence.js` first | Most self-contained, has the best test surface. Don't do a big-bang split. |
| §4.1 Phone read-only | Open | **Reframe as Markdown export (4.2 above)** | Same outcome, less custom work, more compatible with existing tools. |
| §4.3 AI features | Deferred | **Keep deferred** | Correct — also: incompatible with constraint until local LLMs mature. |

---

## Suggested v1.0 ship cut

If you said "ship it for sale by end of month," the minimal gate is:

1. **1.1** Generic seed + first-run wizard (1–2 days)
2. **1.2** electron-builder + NSIS + GitHub Releases auto-update, unsigned (1–2 days)
3. **4.2** JSON export + import (1 day) — satisfies "your data is yours"
4. **One** of **2.1** (week view) or **2.3** (insights/streaks) as the headline v1.0 feature (3–5 days)

Everything in Bucket 3 and the rest of Bucket 4 lands in v1.1+ without blocking distribution.

---

## Critical files referenced

- [main.js:100-181](main.js#L100) — `getDefaultData()` — must be genericized
- [main.js:134](main.js#L134) — `loadEnergyHeroBrainmap()` — must be gated
- [data/energy-hero-brainmap.json](data/energy-hero-brainmap.json) — must not ship in distribution build
- [package.json](package.json) — needs `electron-builder` + `electron-updater` + neutral description
- [app.js:1291-1303](app.js#L1291) — Energy Hero Rückbucher Settings entry — must be gated or generalized
- [app.js:9444-9523](app.js#L9444) — todo bulk bar (model for extending other entities)
- [app.js:8194-8260](app.js#L8194) — notes bulk bar (currently minimal)
- [FUTURE_CHANGES.md](FUTURE_CHANGES.md) — your existing roadmap; reorder per table above

## Verification

This is an advisory document, not an implementation. To act on it: pick which bucket(s) you want to address first, then we plan implementation per gap.
