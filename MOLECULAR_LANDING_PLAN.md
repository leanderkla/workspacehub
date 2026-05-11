# Molecular Landing — Decluttering Plan

> **Self-contained spec.** Hand this to a fresh Claude session. They have full
> codebase access but no conversation context — this doc explains the problem,
> the options I considered, and the path I'd take.

## Context

WorkspaceHub is a vanilla-JS Electron desktop app — a personal hub for one
user's work. Multi-project (My Workspace, My Side Project, WorkspaceHub, Erasmus
Buch, Memory Pix). Built around the thesis: **"a hub for one person's work,
where everything connects."** The user is at the centre; everything radiates
from them.

The **Molecular Landing** is the centerpiece view — a 3D force-directed
knowledge graph rendered with Three.js. Currently lives in [app.js](app.js)
between the `// ===== MOLECULAR LANDING (3D) =====` marker (≈ line 4357) and
the `function renderToday()` that follows it. Reachable via Settings →
Workspace → Landing view → ⚛ Molecular, then click the ⚛ icon in the sidebar.

What it currently shows:

```
[You] ── [Project] ── [Subproject] ── [todo / note / reminder]
                    ╰── [No subproject] ── (loose items in the same project)
```

- **You** at origin. Bright sphere, accent color, soft halo.
- **Projects** distributed on a Fibonacci sphere at radius ~460. Project-color spheres, larger halo.
- **Subprojects** are cubes (containers), color = subproject's own color or project's.
- **"No subproject"** bucket is a muted grey cube — items without an explicit subproject.
- **Items** by type: todo = sphere · note = octahedron · reminder = tetrahedron.
- **Edges**: primary (project→sub→item, project-colored) and secondary (@-mention bonds, dashed grey).
- **Recency weight** (`molTouchWeight`, `molReminderWeight`) drives rest length and label visibility — recent items pull inward and label up; old items drift outward and label down.
- **Zoom-aware labels**: project + subproject + loose labels always visible; item labels fade by camera distance and item weight.
- **Force layout**: pure-JS n² Fruchterman-Reingold-ish, 500 iterations, runs once at render time.
- **Interactions**: OrbitControls (drag-rotate, scroll-zoom), raycaster hover (highlights neighbors, dims rest), click to navigate to the item's editor view.
- **Idle auto-rotate** at 0.35 speed.

## The problem

> "wonderful! Its still super crammed, we need a user not to feel lost."

Even with 460-unit project ring, 24000 repulsion, generous rest lengths, and
zoom-faded item labels — **showing 100+ nodes simultaneously is inherently
overwhelming**, no matter how much spacing you give them. The fix has to be
structural (reduce what's visible at any moment), not just dimensional.

Real-world data scale (rough):
- 5 active projects × ~5 subprojects × ~10 items each ≈ **250 nodes** in the worst case
- Plus 5–10 secondary mention edges per note
- Plus the "loose" bucket per project

## Four approaches I considered

### A — Drill-down focus (recommended)

Default view shows **only You + Projects** (5–7 nodes, breathable). Click a
project → camera flies in, its subprojects expand, the other projects shrink
and fade to ghosts in the background. Click a subproject → its items fan out.
Click an item → preview panel slides in. Always-visible breadcrumb at top:
`You › My Workspace › Q4 Push`.

**Pros:** Bounded depth (4 levels max). Camera-inside-cluster always. Apple-Maps-style mental model. Solves cramping naturally because each level shows ~5–20 nodes.
**Cons:** More state to manage (current focus path, transition animations). Loses the "see everything at once" feel — but that's exactly what the user said is too much.

### B — Solar system / orbital

Replace force-directed mush with predictable rings. Items orbit subprojects on
a flat disc; subprojects orbit projects; projects orbit you. Each layer is a
Bohr-style ring you can rotate around.

**Pros:** Visually clean, predictable hierarchy.
**Cons:** Loses "things that connect cluster together" emergent feel. Becomes a structure diagram, not a knowledge graph. Doesn't honor the molecule metaphor the user explicitly invoked.

### C — Cluster collapse / count chips

Subprojects show as single labeled cubes — `Q4 Push (12)`. Click → fans out
into 12 item dots. Click again → collapses back. Default state: just projects
+ collapsed subprojects (~20 visible nodes max).

**Pros:** ~20 visible nodes always. Cheap to build.
**Cons:** No instant "what's actually pulling on me" feel. The hot vs. cold weighting that justifies the molecule metaphor becomes invisible by default.

### D — Side preview panel + spotlight search

Keep the universe but always show: **search box** top-right (type → matching
nodes glow, rest dim) and a **right side panel** that opens on node click
showing details + related links + "Open" button. Don't navigate away from the
universe.

**Pros:** Explore by browsing, not by navigating. Stays in the universe.
**Cons:** Doesn't reduce the visible-node count by itself.

## Recommendation: A + D

Build A first. Layer D on top. They compound.

**A is the structural answer to "lost."** 5 projects orbiting you is always
the home state. Click to drill in, breadcrumb to drill out. The user can't
get lost because depth is bounded and one-click-out is always available.

**D layered on top means clicking an item never feels like a context-switch**
— it's a peek with a button to commit if they want. Search becomes a way to
jump anywhere without manual drilling.

Specifically rejecting B (loses the molecule metaphor) and C (too static; no
recency-driven emergent shape).

## Implementation plan — A (drill-down focus)

### Data / state additions

```js
state.molecular = {
  focusPath: ['__you'],   // ['__you'] | ['__you', 'p:eh'] | ['__you', 'p:eh', 'sp:q4-push']
  // future: 'item' level adds the 4th segment
};
```

The path is a stack. UI breadcrumb renders left-to-right; clicking a segment
truncates the array to that index.

### What to render at each focus level

| Focus level                      | Visible (bright)                                        | Visible (dim/ghost)                  |
|----------------------------------|---------------------------------------------------------|--------------------------------------|
| `[__you]`                        | You + all projects                                       | (nothing else)                       |
| `[__you, p:foo]`                 | You + project foo + foo's subprojects + foo's loose      | other projects (small, far, faded)   |
| `[__you, p:foo, sp:bar]`         | subproject bar + its items                               | project foo, sibling subprojects     |

Implementation: `buildMolecularGraph` keeps building the *full* graph the way
it does now. Then a new `applyFocusFilter(graph, focusPath)` walks the focus
path and tags each node with one of `bright`, `dim`, `hidden`. The renderer
respects those tags:
- `bright`: full opacity, full size, label visible per existing rules
- `dim`: 0.15 opacity, no label, no halo, no hover hit
- `hidden`: not added to scene at all

### Camera fly-to

When focus changes, animate the camera target from old → new over ~600ms.
Already have OrbitControls with `target` we can lerp:

```js
function flyCameraTo(targetPos, distance, ms = 600) {
  const startTarget = controls.target.clone();
  const startCam = camera.position.clone();
  const endTarget = targetPos.clone();
  const dir = startCam.clone().sub(startTarget).normalize();
  const endCam = endTarget.clone().add(dir.multiplyScalar(distance));
  const t0 = performance.now();
  const tick = () => {
    const t = Math.min(1, (performance.now() - t0) / ms);
    const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;  // easeInOutQuad
    controls.target.lerpVectors(startTarget, endTarget, e);
    camera.position.lerpVectors(startCam, endCam, e);
    controls.update();
    if (t < 1) requestAnimationFrame(tick);
  };
  tick();
}
```

Per-level distances (rough): root = 1200, project = 600, subproject = 300.

### Breadcrumb UI

Add to the existing `.mol-toolbar` markup in `renderMolecular`. Just left of
the legend:

```html
<div class="mol-breadcrumb">
  <button data-mol-focus="__you">⌂ You</button>
  <span class="mol-bc-sep">›</span>
  <button data-mol-focus="p:eh">My Workspace</button>
  <span class="mol-bc-sep">›</span>
  <span class="mol-bc-current">Q4 Push</span>
</div>
```

Wire clicks: pop the path back to that level + re-render scene + fly camera.

### Click-to-drill behavior

Currently clicking a node calls `switchProject` / `showView`. Change to:

- Project node clicked at root focus → push to focus path, fly camera, fade siblings
- Subproject node clicked at project focus → push to focus path, fly camera, hide other subprojects
- Item node clicked at subproject focus → open preview panel (D, see below)
- Click on empty space → pop focus one level (alternative: only the breadcrumb pops)

Existing navigation paths (`showView('todos')` etc.) move to "Open in editor"
buttons inside the preview panel.

### Effort estimate
- Focus state + filter pass: ~30 min
- Camera fly-to: ~20 min
- Breadcrumb UI + wiring: ~25 min
- Click-to-drill rewire: ~15 min
- CSS polish + ghost-mode tuning: ~20 min
- Total: **~2 hours**

## Implementation plan — D (preview panel + search)

### Right side panel

Slide-in from the right when an item is clicked at the subproject focus level.
Width 360px, animated `transform: translateX()`. Contents:

```
┌────────────────────────────────────────────┐
│ ◆ Q4 Strategy                              │
│ Note · My Workspace · Q4 Push subproject    │
│ Updated 2 hours ago                        │
├────────────────────────────────────────────┤
│ Tags: #q4 #campaign                         │
│ Mentioned in 3 notes →                      │
│ Linked to 2 todos →                         │
├────────────────────────────────────────────┤
│ [first 200 chars of content as preview]     │
├────────────────────────────────────────────┤
│ [ Open in Notes ]    [ × Close ]           │
└────────────────────────────────────────────┘
```

Reuse existing `getBacklinksTo(type, projectKey, refId)` for "mentioned in"
and the note's `linkedTodos` for "linked to". The "Open in Notes" button is
the existing navigation that's currently fired on click.

### Spotlight search

Top-right of `.mol-toolbar`. Input box, type to filter. As the user types:
- Build lowercase needle from input
- Match against every node's label
- Matching nodes get `bright` tag, non-matching get `dim`
- Empty input restores normal focus filter

Debounce 100ms so it doesn't refresh per keystroke.

Bonus: pressing Enter on a single match triggers a fly-to that node and
opens the preview panel.

### Effort estimate
- Side panel HTML + CSS + slide animation: ~30 min
- Wire click-to-open + close button: ~10 min
- Pull preview content (reuse `getBacklinksTo`, `noteContentText`): ~15 min
- Spotlight search input + filter pass: ~25 min
- Total: **~1.5 hours**

## Code touchpoints

Functions / blocks the implementation will touch:

- `state` object — add `state.molecular.focusPath`
- `buildMolecularGraph()` — keep building full graph; new `applyFocusFilter()` post-processes
- `setupMolecularThree()` — render uses focus filter for opacity / visibility / sizes
- `renderMolecular()` HTML scaffold — add `.mol-breadcrumb`, `.mol-search`, `.mol-preview-panel`
- Click handler — replace direct `showView` calls with focus-level-aware navigation
- New helpers:
  - `applyFocusFilter(nodes, edges, focusPath) → tagged nodes/edges`
  - `flyCameraTo(targetPos, distance, ms)`
  - `openMolPreviewPanel(node)` / `closeMolPreviewPanel()`
  - `runMolSpotlight(query)`
- CSS additions for breadcrumb, search input, preview panel

Existing helpers to reuse:
- `getBacklinksTo()` — for preview panel "mentioned in"
- `noteContentText()` — for preview text
- `switchProject()` / `showView()` / state mutations — for "Open in editor" buttons
- `escapeHTML()` — for safe label rendering

## Open questions / decisions

1. **Should focus persist across sessions?** I'd save `state.molecular.focusPath` to localStorage so reopening the app returns to the last cluster. Counterargument: feels stale; user may want a fresh "home" view each time. **Default: don't persist for v1**, easy to add later.

2. **What about secondary edges (@-mentions) when focused?** When focused on a subproject, do we still draw mention edges to other clusters? **Proposed: yes, but render them dimmer than primary edges and route them to the cluster boundary, not to the dimmed-out target node.** Visual hint that "this subproject talks to other places" without cluttering.

3. **Empty-space click** — pops focus, or does nothing? Power users will love it; new users might trigger it accidentally. **Proposed: only the breadcrumb pops focus**. Empty-space click is a no-op (matches Apple Maps behavior).

4. **Does idle auto-rotate stay on at deeper focus levels?** It might feel weird inside a subproject cluster. **Proposed: disable auto-rotate at subproject level**, keep it at root + project level.

5. **How does the "no subproject" loose bucket interact with focus?** Click loose at project level → focus goes to it like any subproject? Yes, treat it identically.

6. **Mobile / small windows?** The current 3D landing isn't mobile-targeted but should at minimum not break. Side panel becomes full-width drawer on narrow viewports. Defer to v2.

## What "done" looks like

After A + D ship, the user opens the molecular view and sees:
- 5 glowing project spheres orbiting their bright self-node — *clean, breathable, no labels overlapping*
- Hovers a project → sees its subprojects appear as dim previews near it
- Clicks a project → camera flies in over ~600ms; that project becomes the new center; the four other projects shrink to small ghosts at the edges of the view
- Sees subprojects + loose bucket as cubes around the project; reads each label clearly
- Clicks a subproject → camera flies closer; items fan out; sibling subprojects fade
- Clicks an item → side panel slides in from right with title, type, project, links, preview text, "Open" button
- Hits the breadcrumb's `⌂ You` → camera flies all the way out; back to the 5-projects home view in under a second
- Types in the search box → matching nodes glow, others dim; pressing Enter on a single match flies camera + opens panel

Cramping is gone because the camera is always inside one cluster. Lostness
is gone because the breadcrumb always shows you where you are and one click
takes you out.

## Files modified at the end

- `app.js` — molecular section + state additions
- `styles.css` — breadcrumb, search, preview panel, ghost-node styles
- (No new files needed — all CSS + JS goes inline with existing patterns)

## Things explicitly NOT in scope for this iteration

- Multi-select on the canvas
- Drag-to-rearrange nodes
- Saving custom layouts
- Per-tag filtering (defer until tags are workspace-wide; see `FUTURE_CHANGES.md`)
- 3D People entities (deferred per same doc)
- Topic/Anchor nodes (deferred per same doc)
