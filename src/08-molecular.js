'use strict';

// ===== src/08-molecular.js =====
// Wave-2 extraction (M0): the Molecular landing — Three.js-rendered 3D
// graph with project + subproject + entity nodes orbiting a central
// 'You' anchor. Three sub-banners folded together: MOLECULAR LANDING,
// MOLECULAR FOCUS PERSISTENCE (focusPath localStorage round-trip), and
// MOLECULAR FOCUS FILTER (filtering items by current focus depth).
//
// var conversion (4 top-level declarations):
// - MOL_TIME_DECAY_DAYS, MOL_PROJECT_ITEM_LIMIT — sizing constants
// - molState — module-internal scene state (camera, mesh refs, etc.)
// - MOL_FOCUS_STORAGE_KEY — localStorage key string
//
// Critical cross-module call sites:
// - renderMolecular / teardownMolecular are dispatched from residual
//   app.js's switchProject and showView. Function declarations are global
//   at script-tag top-level → calls resolve identically post-extraction.
// - The module reads window.THREE and window.THREE_OrbitControls at call
//   time (already gated by typeof checks); no extraction-order coupling
//   to vendor/three.bundle.js beyond the existing index.html script order.
// ===== MOLECULAR LANDING (3D) =====
// A 3D force-directed knowledge graph of the user's workspace, centered on `[you]`.
// Built with Three.js — drag to rotate the universe, scroll to zoom, click any
// node to open it. Idle auto-rotation makes the graph feel alive.
//
// Architecture:
//   buildMolecularGraph() → { nodes, edges } purely from state.data (no 3D yet)
//   molSimulate3D()       → assigns x/y/z positions via force layout,
//                            seeded with project nodes on a Fibonacci sphere
//   renderMolecular()     → Three.js scene + OrbitControls + raycaster
//   teardownMolecular()   → dispose geometries/materials, cancel RAF, remove listeners

var MOL_TIME_DECAY_DAYS = 30;     // anything older than this drifts to the rim
var MOL_PROJECT_ITEM_LIMIT = 200; // safety cap so a runaway project can't tank the layout
// Label visibility is zoom-driven now (handled in the animation loop), not capped:
// when zoomed in, all labels show; when zoomed out, only the most recent ones do.

var molState = {
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  raycaster: null,
  mouse: null,
  nodeMeshes: [],          // [{ id, mesh, halo, label3D, type, projectKey, refId, label, weight }]
  edgeLines: [],           // [{ source, target, line, kind, baseColor, baseOpacity }]
  hoveredId: null,
  rafHandle: null,
  resizeHandler: null,
  pointerDownHandler: null,
  pointerMoveHandler: null,
  pointerUpHandler: null,
  pointerCancelHandler: null,
  pointerLeaveHandler: null,
  contextMenuHandler: null,
  loaderRetry: null,
  // Per-frame focus state used by the renderer + animation loop
  focusTags: null,         // Map<id, 'bright' | 'dim' | 'hidden'> from applyFocusFilter
  // Tap-vs-drag detection
  pointer: null,           // { id, x0, y0, t0, moved, type } during an active gesture
  // Auto-rotate management
  autoRotateUserChoice: true, // user's intent — survives touch pauses
  autoRotateResumeTimer: null
};

// ===== MOLECULAR FOCUS PERSISTENCE =====
// Round-trip state.molecular.focusPath through localStorage so reopening the app
// returns the user to the same cluster they were inside.

var MOL_FOCUS_STORAGE_KEY = 'molFocusPath';

function persistMolFocusPath() {
  try {
    localStorage.setItem(MOL_FOCUS_STORAGE_KEY, JSON.stringify(state.molecular.focusPath));
  } catch {}
}

// Read whatever's in localStorage and validate it against current data — projects
// and subprojects can be archived or deleted between sessions, so a stored path
// may point at nodes that no longer exist. Falls back to the deepest valid prefix.
function restoreMolFocusPath() {
  let raw;
  try { raw = localStorage.getItem(MOL_FOCUS_STORAGE_KEY); } catch { return; }
  if (!raw) return;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return; }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed[0] !== '__you') return;

  const validated = ['__you'];
  // Segment 1 should be 'p:KEY' — verify the project exists and isn't archived.
  if (parsed.length >= 2 && typeof parsed[1] === 'string' && parsed[1].startsWith('p:')) {
    const projKey = parsed[1].slice(2);
    const proj = state.data?.projects?.[projKey];
    if (proj && !proj.archived) {
      validated.push(parsed[1]);
      // Segment 2 should be 'sp:ID' — verify the subproject exists on that project.
      if (parsed.length >= 3 && typeof parsed[2] === 'string' && parsed[2].startsWith('sp:')) {
        const spId = parsed[2].slice(3);
        // Special case: the loose bucket has id 'sp:__loose__KEY'.
        if (spId.startsWith('__loose__')) {
          if (spId === '__loose__' + projKey) validated.push(parsed[2]);
        } else {
          const sp = (proj.subprojects || []).find(s => s.id === spId && !s.archived);
          if (sp) validated.push(parsed[2]);
        }
      }
    }
  }
  state.molecular.focusPath = validated;
}

function molDaysSince(iso) {
  if (!iso) return 9999;
  const d = new Date(iso);
  if (isNaN(d)) return 9999;
  return Math.max(0, (Date.now() - d.getTime()) / 86400000);
}

// Recency-weighted score 0..1. 1 = touched today, 0 = older than 30 days.
function molTouchWeight(item) {
  const candidates = [item.completedAt, item.updated, item.created, item.archivedAt].filter(Boolean);
  if (!candidates.length) return 0.05;
  const newest = candidates.map(molDaysSince).reduce((a, b) => Math.min(a, b), 9999);
  return Math.max(0.05, 1 - (newest / MOL_TIME_DECAY_DAYS));
}

// Reminders are weighted by proximity to firing — soon-firing or already-overdue
// reminders are very hot; reminders weeks away cool off toward the rim.
function molReminderWeight(rem) {
  if (!rem.datetime) return 0.05;
  const dt = new Date(rem.datetime);
  if (isNaN(dt)) return 0.05;
  const daysFromNow = (dt.getTime() - Date.now()) / 86400000;
  if (daysFromNow < 0) return 0.95;                                       // overdue/past not-done = very hot
  return Math.max(0.1, 1 - daysFromNow / MOL_TIME_DECAY_DAYS);
}

function buildMolecularGraph() {
  const nodes = [];
  const edges = [];
  const seen = new Set();
  const pushNode = (n) => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };

  // Center: the user, fixed at origin.
  pushNode({ id: '__you', type: 'self', label: 'You', color: getCssVar('--accent') || '#6366f1', weight: 1, fixed: true, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });

  const projects = Object.entries(state.data.projects || {}).filter(([, p]) => !p.archived);

  for (const [key, proj] of projects) {
    const projId = 'p:' + key;
    pushNode({ id: projId, type: 'project', label: proj.name, color: proj.color || '#6366f1', weight: 0.8, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, projectKey: key });
    edges.push({ source: '__you', target: projId, kind: 'primary', restLen: 440 });

    // Pull in todos, notes, and live reminders. Each with its own weight calc so the
    // layout naturally pulls hot items inward and lets cold ones drift to the rim.
    const todoNodes = (proj.todos || [])
      .filter(t => !t.archived && !t.done)
      .map(t => ({ ...t, _w: molTouchWeight(t), _kind: 'todo' }));
    const noteNodes = (proj.notes || [])
      .filter(n => !n.archived)
      .map(n => ({ ...n, _w: molTouchWeight(n), _kind: 'note' }));
    const reminderNodes = (proj.reminders || [])
      .filter(r => !r.doneAt)
      .map(r => ({ ...r, title: r.title || 'Reminder', _w: molReminderWeight(r), _kind: 'reminder' }));
    const items = [...todoNodes, ...noteNodes, ...reminderNodes].sort((a, b) => b._w - a._w).slice(0, MOL_PROJECT_ITEM_LIMIT);

    // Items grouped by subprojectId. Items without a subproject go into a "loose"
    // bucket (only created if the project actually has subprojects to contrast against
    // — otherwise items hang directly off the project).
    const projSubs = (proj.subprojects || []).filter(s => !s.archived);
    const validSpIds = new Set(projSubs.map(s => s.id));
    const itemsBySp = new Map();
    const looseItems = [];
    for (const it of items) {
      if (it.subprojectId && validSpIds.has(it.subprojectId)) {
        if (!itemsBySp.has(it.subprojectId)) itemsBySp.set(it.subprojectId, []);
        itemsBySp.get(it.subprojectId).push(it);
      } else {
        looseItems.push(it);
      }
    }

    // Subproject nodes: one per subproject the project has, sitting between project and items.
    for (const sp of projSubs) {
      const spId = 'sp:' + sp.id;
      pushNode({
        id: spId,
        type: 'subproject',
        label: sp.name || '(untitled)',
        color: sp.color || proj.color || '#6366f1',
        weight: 0.7,
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        projectKey: key,
        refId: sp.id
      });
      edges.push({ source: projId, target: spId, kind: 'primary', restLen: 220 });

      const spItems = itemsBySp.get(sp.id) || [];
      for (const it of spItems) {
        const id = it._kind[0] + ':' + it.id;
        pushNode({
          id,
          type: it._kind,
          label: (it.title || '').slice(0, 60) || '(untitled)',
          color: sp.color || proj.color || '#6366f1',
          weight: it._w,
          x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
          projectKey: key,
          refId: it.id
        });
        edges.push({ source: spId, target: id, kind: 'primary', restLen: 110 + (1 - it._w) * 120 });
      }
    }

    // "Loose" bucket — items without a subproject. Only render this node if the project
    // has subprojects (so it visually contrasts with the grouped items). Otherwise hang
    // items straight off the project to keep the graph clean.
    if (projSubs.length > 0 && looseItems.length > 0) {
      const looseId = 'sp:__loose__' + key;
      pushNode({
        id: looseId,
        type: 'loose',
        label: 'No subproject',
        color: proj.color || '#6366f1',
        weight: 0.4,
        x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        projectKey: key
      });
      edges.push({ source: projId, target: looseId, kind: 'primary', restLen: 200 });
      for (const it of looseItems) {
        const id = it._kind[0] + ':' + it.id;
        pushNode({
          id,
          type: it._kind,
          label: (it.title || '').slice(0, 60) || '(untitled)',
          color: proj.color || '#6366f1',
          weight: it._w,
          x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
          projectKey: key,
          refId: it.id
        });
        edges.push({ source: looseId, target: id, kind: 'primary', restLen: 110 + (1 - it._w) * 120 });
      }
    } else if (projSubs.length === 0) {
      // No subprojects at all — items hang directly off the project (legacy behaviour).
      for (const it of looseItems) {
        const id = it._kind[0] + ':' + it.id;
        pushNode({
          id,
          type: it._kind,
          label: (it.title || '').slice(0, 60) || '(untitled)',
          color: proj.color || '#6366f1',
          weight: it._w,
          x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
          projectKey: key,
          refId: it.id
        });
        edges.push({ source: projId, target: id, kind: 'primary', restLen: 130 + (1 - it._w) * 140 });
      }
    }
  }

  // Pinned items get an extra direct bond to [you].
  for (const p of (state.data.pinned || [])) {
    if (p.type === 'project') {
      const id = 'p:' + p.projectKey;
      if (seen.has(id)) edges.push({ source: '__you', target: id, kind: 'primary', restLen: 220 });
    } else if (p.type === 'subproject') {
      const id = 'sp:' + p.refId;
      if (seen.has(id)) edges.push({ source: '__you', target: id, kind: 'primary', restLen: 200 });
    } else if (p.type === 'todo' || p.type === 'note') {
      const id = p.type[0] + ':' + p.refId;
      if (seen.has(id)) edges.push({ source: '__you', target: id, kind: 'primary', restLen: 180 });
    }
  }

  // Secondary bonds — @-mention edges.
  for (const [, proj] of projects) {
    for (const note of (proj.notes || [])) {
      if (note.archived) continue;
      const sourceId = 'n:' + note.id;
      if (!seen.has(sourceId)) continue;
      const html = note.content || '';
      const re = /<a[^>]*\bdata-mention-type="([^"]+)"[^>]*\bdata-mention-ref="([^"]+)"/gi;
      let m;
      while ((m = re.exec(html)) !== null) {
        const type = m[1], ref = m[2];
        const prefix = type === 'project' ? 'p:'
                     : type === 'subproject' ? 'sp:'
                     : type[0] + ':';
        const targetId = prefix + ref;
        if (seen.has(targetId) && targetId !== sourceId) {
          edges.push({ source: sourceId, target: targetId, kind: 'secondary', restLen: 130 });
        }
      }
    }
  }

  return { nodes, edges };
}

// 3D force layout. Project nodes seed on a Fibonacci sphere so they distribute
// evenly across the sphere surface, not in a flat ring. Items seed near their
// parent project. Forces: n² repulsion + spring on edges + soft pull toward
// the gravity anchor.
//
// `anchorId` (optional): node id to act as the gravity center. When null,
// gravity pulls toward (0,0,0). When set, the named node is fixed at origin
// and centerPull pulls all others toward (0,0,0) — same vector math, but the
// resulting layout has the focused node at the universe's hot center.
// Used at first render only when state.molecular.focusPath is non-root
// (e.g. user reopens the app while focused on a project).
function molSimulate3D(graph, iterations = 500, anchorId = null) {
  const { nodes, edges } = graph;
  const idx = new Map(nodes.map((n, i) => [n.id, i]));

  // If an anchor is requested, find it; if not, the You node (id '__you') already
  // sits at origin and is fixed, so gravity-toward-origin is gravity-toward-You.
  // For project/subproject anchors, free You from its origin pin and pin the
  // anchor there instead — only one fixed node at a time, otherwise the
  // simulation has two rigid overlapping points and distorts.
  let anchorNode = null;
  if (anchorId && anchorId !== '__you') {
    anchorNode = nodes[idx.get(anchorId)] || null;
    if (anchorNode) {
      const youNode = nodes[idx.get('__you')];
      if (youNode) youNode.fixed = false;
      anchorNode.fixed = true;
      anchorNode.x = 0; anchorNode.y = 0; anchorNode.z = 0;
      anchorNode.vx = 0; anchorNode.vy = 0; anchorNode.vz = 0;
    }
  }

  const projectNodes = nodes.filter(n => n.type === 'project');
  const projectPos = new Map();
  // Fibonacci sphere distribution — golden angle gives near-optimal even spread.
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const ringR = 460;
  projectNodes.forEach((p, i) => {
    const t = projectNodes.length === 1 ? 0.5 : i / (projectNodes.length - 1);
    const y = (1 - 2 * t);                                  // -1 to 1
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const phi = goldenAngle * i;
    p.x = Math.cos(phi) * r * ringR;
    p.y = y * ringR;
    p.z = Math.sin(phi) * r * ringR;
    p.vx = 0; p.vy = 0; p.vz = 0;
    projectPos.set(p.id, { x: p.x, y: p.y, z: p.z });
  });

  // Item nodes seed in a small sphere around their parent project.
  const itemParent = new Map();
  for (const e of edges) {
    if (e.kind !== 'primary') continue;
    const a = nodes[idx.get(e.source)];
    if (a && a.type === 'project') itemParent.set(e.target, a);
  }
  for (const n of nodes) {
    if (n.fixed || n.type === 'project') continue;
    const parent = itemParent.get(n.id);
    const r = 80 + Math.random() * 60;
    // Random direction on the unit sphere.
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const dx = s * Math.cos(a), dy = u, dz = s * Math.sin(a);
    if (parent) {
      n.x = parent.x + dx * r;
      n.y = parent.y + dy * r;
      n.z = parent.z + dz * r;
    } else {
      n.x = dx * 200; n.y = dy * 200; n.z = dz * 200;
    }
    n.vx = 0; n.vy = 0; n.vz = 0;
  }

  // Numbers tuned for graphs with up to ~200 nodes spread across a wide spherical shell.
  const repelStrength = 24000;
  const damping = 0.78;
  const centerPull = 0.0019;
  const minDist2 = 64;

  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (a.fixed) continue;
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const d2 = Math.max(minDist2, dx * dx + dy * dy + dz * dz);
        const inv = 1 / Math.sqrt(d2);
        const f = (repelStrength / d2) * 0.001;
        a.vx += dx * inv * f;
        a.vy += dy * inv * f;
        a.vz += dz * inv * f;
      }
    }
    for (const e of edges) {
      const a = nodes[idx.get(e.source)];
      const b = nodes[idx.get(e.target)];
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const d = Math.max(0.1, Math.sqrt(dx * dx + dy * dy + dz * dz));
      const stiffness = e.kind === 'primary' ? 0.04 : 0.014;
      const f = (d - e.restLen) * stiffness;
      const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
      if (!a.fixed) { a.vx += fx; a.vy += fy; a.vz += fz; }
      if (!b.fixed) { b.vx -= fx; b.vy -= fy; b.vz -= fz; }
    }
    for (const n of nodes) {
      if (n.fixed) continue;
      n.vx += -n.x * centerPull;
      n.vy += -n.y * centerPull;
      n.vz += -n.z * centerPull;
      n.vx *= damping; n.vy *= damping; n.vz *= damping;
      n.x += n.vx; n.y += n.vy; n.z += n.vz;
    }
  }
  return graph;
}

// Helper: read a CSS variable from :root so we can pick up the user's accent at runtime.
function getCssVar(name) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || null;
}

// Resolve any color string Three.js might choke on (CSS var, named, hex) to a hex string.
function resolveColor(c) {
  if (!c) return '#6366f1';
  if (c.startsWith('var(')) {
    const m = c.match(/var\((--[a-z0-9-]+)\)/i);
    if (m) {
      const resolved = getCssVar(m[1]);
      if (resolved) return resolved;
    }
    return '#6366f1';
  }
  return c;
}

// ===== MOLECULAR FOCUS FILTER =====
// Walks the graph and tags each node 'bright' / 'dim' / 'hidden' based on the
// current focusPath. Returns the tag map plus the deepest valid anchorId for
// the simulation to use as a gravity anchor (only at first render).
//
//   ['__you']                  → You + projects bright; everything else hidden.
//   ['__you','p:eh']           → You + project eh + eh's subprojects + eh's loose
//                                + items inside eh's subprojects/loose are bright.
//                                Other projects are dim. Items inside other projects hidden.
//   ['__you','p:eh','sp:q4']   → subproject q4 + its items bright. Project eh and
//                                sibling subprojects dim. Everything else hidden.
function applyFocusFilter(graph, focusPath) {
  const tags = new Map();
  const set = (id, t) => tags.set(id, t);
  const nodes = graph.nodes;
  const edges = graph.edges;

  // Build a quick parent lookup: child id → parent id (via primary edges).
  const primaryParent = new Map();
  for (const e of edges) {
    if (e.kind === 'primary') primaryParent.set(e.target, e.source);
  }

  const depth = focusPath.length;
  // Default everything hidden, then promote what should be visible.
  for (const n of nodes) set(n.id, 'hidden');

  if (depth === 1) {
    // Root: You + every project node bright; rest hidden.
    set('__you', 'bright');
    for (const n of nodes) {
      if (n.type === 'project') set(n.id, 'bright');
    }
  } else if (depth === 2) {
    // Project focus: focused project + its subprojects/loose + their items bright.
    // Other projects dim, everything else hidden.
    const focusedProjId = focusPath[1];
    set('__you', 'bright');
    set(focusedProjId, 'bright');
    for (const n of nodes) {
      if (n.type === 'project') {
        if (n.id !== focusedProjId) set(n.id, 'dim');
      } else if (n.type === 'subproject' || n.type === 'loose') {
        if (primaryParent.get(n.id) === focusedProjId) set(n.id, 'bright');
      } else if (n.type === 'todo' || n.type === 'note' || n.type === 'reminder') {
        // Items hang off either a subproject/loose (which hangs off the project)
        // or directly off the project (when the project has no subprojects).
        const parent = primaryParent.get(n.id);
        if (!parent) continue;
        if (parent === focusedProjId) {
          set(n.id, 'bright');
        } else {
          // Parent is a subproject/loose — check if its parent is the focused project.
          const grandparent = primaryParent.get(parent);
          if (grandparent === focusedProjId) set(n.id, 'bright');
        }
      }
    }
  } else if (depth >= 3) {
    // Subproject focus: focused subproject + its items bright. Project + sibling
    // subprojects dim. Everything else hidden.
    const focusedProjId = focusPath[1];
    const focusedSubId = focusPath[2];
    set(focusedSubId, 'bright');
    set(focusedProjId, 'dim');
    set('__you', 'dim');
    for (const n of nodes) {
      if ((n.type === 'subproject' || n.type === 'loose') && primaryParent.get(n.id) === focusedProjId && n.id !== focusedSubId) {
        set(n.id, 'dim');
      } else if (n.type === 'todo' || n.type === 'note' || n.type === 'reminder') {
        if (primaryParent.get(n.id) === focusedSubId) set(n.id, 'bright');
      }
    }
  }

  // Resolve the gravity anchor for the simulation. Deepest segment wins, but if
  // it points at a node that doesn't exist (subproject was removed mid-session,
  // graph dropped it under some condition, etc.), fall back to the parent.
  const idsInGraph = new Set(nodes.map(n => n.id));
  let anchorId = null;
  for (let i = focusPath.length - 1; i >= 0; i--) {
    if (idsInGraph.has(focusPath[i])) { anchorId = focusPath[i]; break; }
  }
  if (!anchorId) anchorId = '__you';

  return { tags, anchorId };
}

// Smooth camera fly-to. OrbitControls' `target` is the orbit center; we lerp it
// AND camera.position toward the new spot, preserving the camera's offset
// direction so the user keeps their orientation.
function flyCameraTo(targetPos, distance, ms = 600) {
  const camera = molState.camera;
  const controls = molState.controls;
  if (!camera || !controls) return;
  const startTarget = controls.target.clone();
  const startCam = camera.position.clone();
  const endTarget = targetPos.clone();
  // Preserve current viewing direction; if the camera is currently sitting on top
  // of the target (degenerate), use the world-Y axis as a fallback.
  let dir = startCam.clone().sub(startTarget);
  if (dir.lengthSq() < 0.0001) dir = new window.THREE.Vector3(0, 0.2, 1);
  dir.normalize();
  const endCam = endTarget.clone().add(dir.multiplyScalar(distance));
  const t0 = performance.now();
  const tick = () => {
    const t = Math.min(1, (performance.now() - t0) / ms);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
    controls.target.lerpVectors(startTarget, endTarget, e);
    camera.position.lerpVectors(startCam, endCam, e);
    controls.update();
    if (t < 1 && state.view === 'molecular') requestAnimationFrame(tick);
  };
  tick();
}

// Per-focus-level camera distance (orbit radius from the focus node).
function molFocusDistance(depth) {
  if (depth <= 1) return 1200;
  if (depth === 2) return 600;
  return 300;
}

// Push a node id onto the focus stack. Validates that the push is legal
// (project at root, subproject at project, no deeper). Persists + applies.
function pushMolFocus(nodeId) {
  if (!molState.scene) return;
  const path = state.molecular.focusPath;
  // Defend against duplicate pushes.
  if (path[path.length - 1] === nodeId) return;
  // Cap at depth 3.
  const newPath = (path.length >= 3 ? path.slice(0, 2) : path.slice()).concat(nodeId);
  state.molecular.focusPath = newPath;
  persistMolFocusPath();
  applyFocusToScene();
}

// Truncate the focus stack to a given segment index (0 = root). Persist + apply.
function popMolFocusTo(index) {
  if (!molState.scene) return;
  const path = state.molecular.focusPath;
  const targetIdx = Math.max(0, Math.min(path.length - 1, index));
  if (targetIdx === path.length - 1) return; // already there
  state.molecular.focusPath = path.slice(0, targetIdx + 1);
  persistMolFocusPath();
  applyFocusToScene();
}

// Re-apply the current focus path to the existing scene without re-running the
// simulation. Updates: visibility tags on every node mesh + halo + label,
// edge opacity, camera fly-to, autorotate level, and the breadcrumb DOM.
function applyFocusToScene() {
  if (!molState.scene) return;
  const graph = { nodes: molState.nodeMeshes.map(nm => ({ id: nm.id, type: nm.type })),
                  edges: molState.edgeLines.map(e => ({ source: e.source, target: e.target, kind: e.kind })) };
  const { tags, anchorId } = applyFocusFilter(graph, state.molecular.focusPath);
  molState.focusTags = tags;

  // Apply tags to every node's mesh / halo / label.
  for (const nm of molState.nodeMeshes) {
    const tag = tags.get(nm.id) || 'hidden';
    if (tag === 'hidden') {
      nm.mesh.visible = false;
      if (nm.halo) nm.halo.visible = false;
      if (nm.label3D) nm.label3D.visible = false;
    } else if (tag === 'dim') {
      nm.mesh.visible = true;
      nm.mesh.material.transparent = true;
      nm.mesh.material.opacity = 0.18;
      if (nm.halo) nm.halo.visible = false;
      if (nm.label3D) { nm.label3D.visible = false; }
    } else { // bright
      nm.mesh.visible = true;
      nm.mesh.material.transparent = false;
      nm.mesh.material.opacity = 1;
      if (nm.halo) nm.halo.visible = true;
      if (nm.label3D) nm.label3D.visible = true; // animate-loop will set per-distance opacity
    }
  }

  // Apply tags to edges.
  for (const e of molState.edgeLines) {
    const sTag = tags.get(e.source) || 'hidden';
    const tTag = tags.get(e.target) || 'hidden';
    // Worst tag wins: bright > dim > hidden.
    const worst = (sTag === 'hidden' || tTag === 'hidden') ? 'hidden'
                : (sTag === 'dim' || tTag === 'dim') ? 'dim' : 'bright';
    if (worst === 'hidden') { e.line.visible = false; }
    else if (worst === 'dim') { e.line.visible = true; e.line.material.opacity = 0.05; }
    else { e.line.visible = true; e.line.material.opacity = e.baseOpacity; }
  }

  // Fly the camera to the anchor's current position.
  const anchorNm = molState.nodeMeshes.find(nm => nm.id === anchorId);
  const anchorPos = anchorNm ? anchorNm.mesh.position : new window.THREE.Vector3(0, 0, 0);
  flyCameraTo(anchorPos, molFocusDistance(state.molecular.focusPath.length));

  // Auto-rotate: on at root + project levels (when user hasn't manually toggled it
  // off), off at subproject level.
  const depth = state.molecular.focusPath.length;
  if (molState.controls) {
    if (depth >= 3) {
      molState.controls.autoRotate = false;
    } else if (molState.autoRotateUserChoice && !molState.pointer) {
      molState.controls.autoRotate = true;
    }
  }

  // Re-render the breadcrumb chrome (cheap DOM swap, no full view re-render).
  rebuildMolBreadcrumbDOM();
}

// Resolve a focusPath segment id to its display label. Used by the breadcrumb.
function molLabelFor(id) {
  if (id === '__you') return 'You';
  if (id.startsWith('p:')) {
    const proj = state.data?.projects?.[id.slice(2)];
    return proj ? (proj.name || '(project)') : '(project)';
  }
  if (id.startsWith('sp:')) {
    const spId = id.slice(3);
    if (spId.startsWith('__loose__')) return 'No subproject';
    for (const proj of Object.values(state.data?.projects || {})) {
      const sp = (proj.subprojects || []).find(s => s.id === spId);
      if (sp) return sp.name || '(subproject)';
    }
    return '(subproject)';
  }
  return id;
}

// Re-render the breadcrumb chrome in-place (no full view re-render). Each
// non-final segment is a tappable button; the final segment is plain text.
function rebuildMolBreadcrumbDOM() {
  const host = document.getElementById('mol-breadcrumb');
  if (!host) return;
  const path = state.molecular.focusPath;
  const lastIdx = path.length - 1;
  host.innerHTML = path.map((id, i) => {
    const label = escapeHTML(molLabelFor(id));
    if (i < lastIdx) {
      return `<button class="mol-bc-btn" type="button" data-mol-focus-index="${i}" aria-label="Pop focus to ${label}">${i === 0 ? '⌂ ' : ''}${label}</button>` +
             `<span class="mol-bc-sep" aria-hidden="true">›</span>`;
    }
    return `<span class="mol-bc-current">${i === 0 ? '⌂ ' : ''}${label}</span>`;
  }).join('');
  // Wire each breadcrumb segment to popMolFocusTo. We use click here (works
  // for mouse + tap once `touch-action: manipulation` is in place via CSS).
  host.querySelectorAll('[data-mol-focus-index]').forEach(btn => {
    btn.addEventListener('click', () => {
      popMolFocusTo(parseInt(btn.dataset.molFocusIndex, 10));
    });
  });
}

function renderMolecular() {
  // Three.js loads as an ES module and is deferred — if we get here before it's ready,
  // show a tiny loading state and retry once the global appears.
  if (!window.THREE || !window.THREE_OrbitControls) {
    document.getElementById('content').innerHTML = `
      <div class="view active" id="view-molecular">
        <div class="mol-loading">
          <div class="mol-loading-orb"></div>
          <div class="mol-loading-msg">Loading 3D engine…</div>
        </div>
      </div>`;
    if (molState.loaderRetry) clearTimeout(molState.loaderRetry);
    molState.loaderRetry = setTimeout(() => renderMolecular(), 150);
    return;
  }
  if (molState.loaderRetry) { clearTimeout(molState.loaderRetry); molState.loaderRetry = null; }

  teardownMolecular();

  // Restore the persisted focusPath from the last session and validate it
  // against current data. Validation strips segments pointing at projects /
  // subprojects that have been removed or archived since the user last
  // looked at the universe.
  if (!Array.isArray(state.molecular.focusPath) || state.molecular.focusPath[0] !== '__you') {
    state.molecular.focusPath = ['__you'];
  }
  restoreMolFocusPath();

  const graph = buildMolecularGraph();

  // Compute the focus filter once (derives the gravity anchor for the sim) and
  // again later for visibility tags after the scene is built.
  const initialFilter = applyFocusFilter(graph, state.molecular.focusPath);

  // Simulate with anchor only when restoring a non-root focus — otherwise the
  // default origin gravity (You at center) is what we want.
  molSimulate3D(graph, 500, initialFilter.anchorId);

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-molecular">
      <div class="mol-toolbar">
        <div class="mol-title">⚛ <strong>Your universe</strong> · ${graph.nodes.length - 1} nodes · ${graph.edges.length} bonds</div>
        <div class="mol-breadcrumb" id="mol-breadcrumb" role="navigation" aria-label="Molecular focus"></div>
        <div class="mol-legend" title="Node shape by item type">
          <span class="mol-legend-item"><span class="mol-legend-dot mol-legend-subproject"></span>subproject</span>
          <span class="mol-legend-item"><span class="mol-legend-dot mol-legend-todo"></span>todo</span>
          <span class="mol-legend-item"><span class="mol-legend-dot mol-legend-note"></span>note</span>
          <span class="mol-legend-item"><span class="mol-legend-dot mol-legend-reminder"></span>reminder</span>
        </div>
        <div class="mol-toolbar-actions">
          <button class="btn btn-ghost btn-sm" id="mol-toggle-rotate" title="Toggle auto-rotate">↻ Spin</button>
          <button class="btn btn-ghost btn-sm" id="mol-fit" title="Reset camera">Reset</button>
          <button class="btn btn-ghost btn-sm" id="mol-refresh" title="Re-run layout">⟳</button>
        </div>
      </div>
      <div class="mol-canvas-wrap" id="mol-canvas-wrap">
        <div class="mol-hover-label" id="mol-hover-label" hidden></div>
        <div class="mol-hint">Drag to rotate · scroll to zoom · tap a node to drill in</div>
      </div>
    </div>`;

  setupMolecularThree(graph);
  // After scene is built, apply the focus filter so dim/hidden tags are reflected
  // in mesh visibility and the camera flies to the anchor. This also paints the
  // breadcrumb chrome.
  applyFocusToScene();
}

function setupMolecularThree(graph) {
  const wrap = document.getElementById('mol-canvas-wrap');
  if (!wrap) return;
  const w = Math.max(300, wrap.clientWidth);
  const h = Math.max(300, wrap.clientHeight);

  const THREE = window.THREE;
  const OrbitControls = window.THREE_OrbitControls;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07070d);
  scene.fog = new THREE.FogExp2(0x07070d, 0.0008);

  const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 6000);
  camera.position.set(0, 140, 1200);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
  renderer.setSize(w, h);
  renderer.domElement.classList.add('mol-canvas');
  wrap.insertBefore(renderer.domElement, wrap.firstChild);

  // Lighting — ambient base + a glowing point light at the user's position.
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const accentHex = resolveColor(getCssVar('--accent') || '#6366f1');
  const youLight = new THREE.PointLight(new THREE.Color(accentHex), 2.2, 1200, 1.4);
  youLight.position.set(0, 0, 0);
  scene.add(youLight);

  // Distant starfield — adds depth and the "universe" feel.
  const starGeo = new THREE.BufferGeometry();
  const starCount = 1200;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 1400 + Math.random() * 1200;
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    positions[i * 3]     = s * Math.cos(phi) * r;
    positions[i * 3 + 1] = u * r;
    positions[i * 3 + 2] = s * Math.sin(phi) * r;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: true, transparent: true, opacity: 0.55 });
  scene.add(new THREE.Points(starGeo, starMat));

  // Node spheres + halo for the larger ones.
  for (const n of graph.nodes) {
    const isYou = n.id === '__you';
    const isProject = n.type === 'project';
    const isSubproject = n.type === 'subproject' || n.type === 'loose';
    const r = isYou ? 26
            : isProject ? 16
            : isSubproject ? 11
            : (5 + n.weight * 6.5);
    const colorHex = resolveColor(n.color);
    const color = new THREE.Color(colorHex);

    const geo = (isYou || isProject) ? new THREE.SphereGeometry(r, 28, 22) : makeNodeGeometry(n.type, r);
    // Per-type material: notes are matter (paper), reminders pulse hot (alarm),
    // subprojects sit in the middle (container), loose is muted (the "rest").
    const matOpts = { color, emissive: color, roughness: 0.5, metalness: 0.1 };
    if (isYou) {
      // Drop emissive on You — bright basic + halo + light source already do the work.
    } else if (isProject) {
      matOpts.emissiveIntensity = 0.55;
    } else if (n.type === 'subproject') {
      matOpts.emissiveIntensity = 0.4;
      matOpts.roughness = 0.4;
    } else if (n.type === 'loose') {
      // Loose bucket: dim, no glow, washed out — visually a placeholder, not a real container.
      matOpts.emissiveIntensity = 0.05;
      matOpts.roughness = 0.85;
      matOpts.color = new THREE.Color(0x6b7280);
      matOpts.emissive = new THREE.Color(0x6b7280);
    } else if (n.type === 'note') {
      matOpts.emissiveIntensity = 0.18;
      matOpts.roughness = 0.65;
    } else if (n.type === 'reminder') {
      matOpts.emissiveIntensity = 0.5;
      matOpts.roughness = 0.35;
    } else {                                                         // todo
      matOpts.emissiveIntensity = 0.32;
    }
    const mat = isYou
      ? new THREE.MeshBasicMaterial({ color })
      : new THREE.MeshStandardMaterial(matOpts);
    const mesh = new THREE.Mesh(geo, mat);
    // Slow rotation on non-spheres so the facets catch light differently — adds life
    // and reinforces the shape distinction at a glance. Subproject/loose cubes spin slow.
    if (!isYou && !isProject) {
      const baseRate = n.type === 'reminder' ? 0.6
                     : n.type === 'subproject' ? 0.2
                     : n.type === 'loose' ? 0.15
                     : 0.25;
      mesh.userData.spinRate = baseRate + Math.random() * 0.2;
      mesh.userData.spinAxis = new THREE.Vector3(Math.random() - 0.5, 1, Math.random() - 0.5).normalize();
    }
    mesh.position.set(n.x, n.y, n.z);
    mesh.userData = { id: n.id, type: n.type, projectKey: n.projectKey, refId: n.refId, label: n.label };
    scene.add(mesh);

    // Halo: a slightly larger inverted sphere with a soft transparent material gives the glow effect.
    // Skip on loose buckets (they shouldn't grab attention) and items (too noisy with many of them).
    let halo = null;
    if (isYou || isProject || n.type === 'subproject') {
      const haloScale = isYou ? 2.4 : isProject ? 1.7 : 1.5;
      const haloOpacity = isYou ? 0.18 : isProject ? 0.13 : 0.09;
      const haloGeo = new THREE.SphereGeometry(r * haloScale, 20, 16);
      const haloMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: haloOpacity, side: THREE.BackSide, depthWrite: false });
      halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(mesh.position);
      scene.add(halo);
    }

    // Every node except [you] gets a canvas-textured sprite label.
    //   project + subproject + loose → always visible (they're the "anchors")
    //   todo / note / reminder       → fade in/out by camera distance (handled in animate loop)
    let label3D = null;
    if (!isYou) {
      const isAnchor = isProject || n.type === 'subproject' || n.type === 'loose';
      const truncated = isAnchor ? n.label : (n.label.length > 36 ? n.label.slice(0, 35) + '…' : n.label);
      label3D = makeLabelSprite(truncated, colorHex, isAnchor ? 'project' : 'item');
      label3D.position.copy(mesh.position);
      label3D.position.y += r + (isAnchor ? 14 : 8);
      // Item labels start hidden; the animation loop fades them in/out per camera distance.
      if (!isAnchor) label3D.material.opacity = 0;
      scene.add(label3D);
    }

    molState.nodeMeshes.push({ id: n.id, mesh, halo, label3D, type: n.type, projectKey: n.projectKey, refId: n.refId, label: n.label, weight: n.weight, baseRadius: r, baseColor: color.clone() });
  }

  // Edges: thin lines, opacity by kind. Hover dims the rest.
  for (const e of graph.edges) {
    const a = graph.nodes.find(n => n.id === e.source);
    const b = graph.nodes.find(n => n.id === e.target);
    if (!a || !b) continue;
    const isPrimary = e.kind === 'primary';
    const colorHex = isPrimary ? resolveColor(b.color || a.color || '#6366f1') : '#6b7280';
    const baseOpacity = isPrimary ? 0.55 : 0.22;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(a.x, a.y, a.z),
      new THREE.Vector3(b.x, b.y, b.z)
    ]);
    const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(colorHex), transparent: true, opacity: baseOpacity });
    const line = new THREE.Line(geo, mat);
    scene.add(line);
    molState.edgeLines.push({ source: e.source, target: e.target, line, kind: e.kind, baseColor: new THREE.Color(colorHex), baseOpacity });
  }

  // OrbitControls — drag to rotate, scroll to zoom, right-drag (or two-finger) to pan.
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.autoRotate = molState.autoRotateUserChoice;
  controls.autoRotateSpeed = 0.35;
  controls.minDistance = 200;
  controls.maxDistance = 2000;
  controls.enablePan = true;
  // Touch gestures: one finger rotates the universe, two fingers pinch-zoom + pan.
  // Without this explicit map, OrbitControls' touch defaults are inconsistent
  // across versions. THREE.TOUCH.* enums are: ROTATE = 0, PAN = 1, DOLLY_PAN = 2,
  // DOLLY_ROTATE = 3.
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  };

  // Raycaster for hover/click.
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // Animation loop.
  let lastTime = performance.now();
  const animate = () => {
    molState.rafHandle = requestAnimationFrame(animate);
    const t = performance.now();
    const dt = (t - lastTime) * 0.001;
    lastTime = t;
    controls.update();

    // Camera distance from origin (= roughly how zoomed-out we are). OrbitControls'
    // target is (0,0,0), so position.length() is the orbit radius.
    const camDist = camera.position.length();
    // At camDist <= 500: all item labels fully visible.
    // At camDist >= 1700: only the very hottest items barely visible.
    // Linear remap → threshold weight required to be visible at the current zoom.
    const visMin = 500, visMax = 1700;
    const tNorm = Math.max(0, Math.min(1, (camDist - visMin) / (visMax - visMin)));

    const focusTags = molState.focusTags;
    for (const nm of molState.nodeMeshes) {
      // Skip nodes that the focus filter has hidden — no need to spin or bob
      // off-screen geometry, and we'd just thrash visibility flags otherwise.
      const focusTag = focusTags ? focusTags.get(nm.id) : 'bright';
      if (focusTag === 'hidden') continue;

      // Subtle bobbing on item-level nodes (skip projects/you so they stay anchored).
      if (nm.id !== '__you' && nm.type !== 'project') {
        const phase = (nm.id.charCodeAt(2) || 0) + (nm.id.charCodeAt(3) || 0);
        nm.mesh.position.y += Math.sin((t + phase * 90) * 0.0009) * 0.04;
        // Spin non-sphere shapes so their facets catch the light from different angles.
        const spinRate = nm.mesh.userData.spinRate;
        const spinAxis = nm.mesh.userData.spinAxis;
        if (spinRate && spinAxis) {
          nm.mesh.rotateOnAxis(spinAxis, dt * spinRate);
        }
      }
      // Item label opacity: heavy (recent) items fight through more zoom-out.
      // Each item has weight 0..1; show it when weight > tNorm, with a soft fade band.
      // Skip anchors (project/subproject/loose) — those are always visible.
      // Skip dim items — applyFocusToScene already set their label visible=false.
      const isAnchorType = nm.type === 'project' || nm.type === 'subproject' || nm.type === 'loose';
      if (nm.label3D && !isAnchorType && nm.id !== '__you' && focusTag === 'bright') {
        // If hovered, override and force full opacity for the hovered node + neighbours.
        let opacity;
        if (molState.hoveredId) {
          const involved = molState.hoveredId === nm.id || molState.edgeLines.some(e =>
            (e.source === molState.hoveredId && e.target === nm.id) ||
            (e.target === molState.hoveredId && e.source === nm.id));
          opacity = involved ? 1 : 0;
        } else {
          const fade = (nm.weight - tNorm) / 0.18;       // 0.18 = fade band width
          opacity = Math.max(0, Math.min(1, fade));
        }
        nm.label3D.material.opacity = opacity;
        nm.label3D.visible = opacity > 0.02;
      }
    }

    renderer.render(scene, camera);
  };
  animate();

  // Hover + tap detection via pointer events. Pointer events unify mouse,
  // pen, and touch under one event model — and OrbitControls captures the
  // gesture for rotation/zoom independently. We layer our hover/tap on top.
  //
  // Tap-vs-drag: track movement + duration on pointerdown→pointerup. If
  // movement > TAP_MOVE_PX or duration > TAP_TIME_MS, treat as a drag and
  // skip navigation. This prevents OrbitControls' touch-rotate from
  // accidentally firing the click handler.
  const TAP_MOVE_PX = 6;
  const TAP_TIME_MS = 300;
  const AUTOROTATE_RESUME_MS = 3000;

  const hoverLabel = document.getElementById('mol-hover-label');

  // Filter the raycaster to only bright-tagged meshes — dimmed/hidden nodes
  // shouldn't be tappable or hoverable.
  const pickAt = (clientX, clientY) => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const tags = molState.focusTags;
    const meshes = molState.nodeMeshes
      .filter(nm => !tags || tags.get(nm.id) === 'bright')
      .map(nm => nm.mesh);
    const intersects = raycaster.intersectObjects(meshes);
    return intersects.length ? { hit: intersects[0].object.userData, rect } : { hit: null, rect };
  };

  const updateHover = (hit, rect, clientX, clientY) => {
    if (hit) {
      if (molState.hoveredId !== hit.id) {
        molState.hoveredId = hit.id;
        applyHoverHighlight();
      }
      if (hoverLabel) {
        hoverLabel.textContent = hit.label || '';
        hoverLabel.style.left = (clientX - rect.left + 14) + 'px';
        hoverLabel.style.top  = (clientY - rect.top + 14) + 'px';
        hoverLabel.hidden = false;
      }
      renderer.domElement.style.cursor = 'pointer';
    } else {
      if (molState.hoveredId !== null) {
        molState.hoveredId = null;
        applyHoverHighlight();
      }
      if (hoverLabel) hoverLabel.hidden = true;
      renderer.domElement.style.cursor = '';
    }
  };

  // Drill the focus path one level deeper. Items at subproject focus level
  // are no-ops in Phase A — Phase D will handle the side panel.
  const dispatchTapTarget = (nm) => {
    if (!nm) return;
    const depth = state.molecular.focusPath.length;
    if (depth === 1 && nm.type === 'project') {
      pushMolFocus('p:' + nm.projectKey);
    } else if (depth === 2 && (nm.type === 'subproject' || nm.type === 'loose')) {
      // Subproject id is sp:ID; loose bucket id is sp:__loose__KEY.
      const id = nm.type === 'loose' ? 'sp:__loose__' + nm.projectKey : 'sp:' + nm.refId;
      pushMolFocus(id);
    }
    // depth === 3 (subproject focus): tapping items is a Phase D concern.
  };

  const scheduleAutoRotateResume = () => {
    if (molState.autoRotateResumeTimer) clearTimeout(molState.autoRotateResumeTimer);
    molState.autoRotateResumeTimer = setTimeout(() => {
      molState.autoRotateResumeTimer = null;
      if (molState.pointer) return;             // still touching
      if (state.view !== 'molecular') return;
      const depth = state.molecular.focusPath.length;
      if (depth >= 3) return;                   // subproject level: stay paused
      if (molState.controls && molState.autoRotateUserChoice) {
        molState.controls.autoRotate = true;
      }
    }, AUTOROTATE_RESUME_MS);
  };

  const onPointerDown = (e) => {
    molState.pointer = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: Date.now(), moved: 0, type: e.pointerType };
    // Pause auto-rotate while a touch is in progress; we'll resume after release + idle.
    if (molState.autoRotateResumeTimer) {
      clearTimeout(molState.autoRotateResumeTimer);
      molState.autoRotateResumeTimer = null;
    }
    if (molState.controls) molState.controls.autoRotate = false;
  };
  const onPointerMove = (e) => {
    // Mouse-only hover. Touch doesn't have a hover semantic — we don't want
    // a swipe to spam hover updates and re-rendering.
    if (e.pointerType === 'mouse' && (!molState.pointer || molState.pointer.type === 'mouse')) {
      const { hit, rect } = pickAt(e.clientX, e.clientY);
      updateHover(hit, rect, e.clientX, e.clientY);
    }
    if (molState.pointer && e.pointerId === molState.pointer.id) {
      const dx = e.clientX - molState.pointer.x0;
      const dy = e.clientY - molState.pointer.y0;
      molState.pointer.moved = Math.max(molState.pointer.moved, Math.sqrt(dx*dx + dy*dy));
    }
  };
  const onPointerUp = (e) => {
    const p = molState.pointer;
    molState.pointer = null;
    scheduleAutoRotateResume();
    if (!p || e.pointerId !== p.id) return;
    const dt = Date.now() - p.t0;
    const isTap = p.moved <= TAP_MOVE_PX && dt <= TAP_TIME_MS;
    if (!isTap) return;
    // Resolve the tapped node by raycasting at the current pointer position.
    // For touch, hover state is unreliable — always re-pick on tap.
    const { hit } = pickAt(e.clientX, e.clientY);
    if (!hit) return;
    const nm = molState.nodeMeshes.find(x => x.id === hit.id);
    dispatchTapTarget(nm);
  };
  const onPointerCancel = () => {
    molState.pointer = null;
    scheduleAutoRotateResume();
  };
  const onPointerLeave = () => {
    if (molState.hoveredId !== null) { molState.hoveredId = null; applyHoverHighlight(); }
    if (hoverLabel) hoverLabel.hidden = true;
  };
  // Held finger / right click on the canvas should NOT pop the system context
  // menu — users expect a long press to do nothing visible (or to be a future
  // gesture).
  const onContextMenu = (e) => { e.preventDefault(); };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointercancel', onPointerCancel);
  renderer.domElement.addEventListener('pointerleave', onPointerLeave);
  renderer.domElement.addEventListener('contextmenu', onContextMenu);
  molState.pointerDownHandler = onPointerDown;
  molState.pointerMoveHandler = onPointerMove;
  molState.pointerUpHandler = onPointerUp;
  molState.pointerCancelHandler = onPointerCancel;
  molState.pointerLeaveHandler = onPointerLeave;
  molState.contextMenuHandler = onContextMenu;

  // Resize handler so the canvas tracks the panel size.
  const onResize = () => {
    if (!wrap || !renderer) return;
    const ww = Math.max(300, wrap.clientWidth);
    const hh = Math.max(300, wrap.clientHeight);
    camera.aspect = ww / hh;
    camera.updateProjectionMatrix();
    renderer.setSize(ww, hh);
  };
  window.addEventListener('resize', onResize);
  molState.resizeHandler = onResize;

  // Toolbar. Reset pops focus all the way out and flies back to the home view.
  document.getElementById('mol-fit')?.addEventListener('click', () => {
    if (state.molecular.focusPath.length > 1) {
      popMolFocusTo(0);
    } else {
      // Already at root — just re-center the camera if the user has dragged it.
      camera.position.set(0, 140, 1200);
      controls.target.set(0, 0, 0);
      controls.update();
    }
  });
  document.getElementById('mol-refresh')?.addEventListener('click', () => renderMolecular());
  document.getElementById('mol-toggle-rotate')?.addEventListener('click', (e) => {
    // The user's intent toggles independently of the auto-pause-on-touch state.
    molState.autoRotateUserChoice = !molState.autoRotateUserChoice;
    // Apply immediately if we're not deeper than project level (subproject focus
    // forces autorotate off).
    const depth = state.molecular.focusPath.length;
    controls.autoRotate = molState.autoRotateUserChoice && depth < 3 && !molState.pointer;
    e.currentTarget.classList.toggle('on', molState.autoRotateUserChoice);
  });

  molState.scene = scene;
  molState.camera = camera;
  molState.renderer = renderer;
  molState.controls = controls;
  molState.raycaster = raycaster;
  molState.mouse = mouse;
}

// Different node types get different geometries so the user can tell them apart at a glance:
//   todo       → sphere       (round, action atom)
//   note       → octahedron   (8-sided, paper-fold / crystal feel)
//   reminder   → tetrahedron  (pointy, "alarm" silhouette)
//   subproject → cube         (container of items)
//   loose      → cube (dim)   (the "no subproject" bucket — same shape, faded look)
//   project    → sphere       (large, with halo)
//   self       → sphere       (largest, glowing)
function makeNodeGeometry(type, r) {
  const THREE = window.THREE;
  if (type === 'note')       return new THREE.OctahedronGeometry(r, 0);
  if (type === 'reminder')   return new THREE.TetrahedronGeometry(r * 1.15, 0);
  if (type === 'subproject' || type === 'loose') return new THREE.BoxGeometry(r * 1.5, r * 1.5, r * 1.5);
  return new THREE.SphereGeometry(r, 28, 22);
}

// Build a sprite with text baked into a canvas texture. Sprites always face the camera,
// so labels stay readable as the universe rotates. Two visual variants:
//   variant='project'  → bigger bold text with a colored glow halo, always visible
//   variant='item'     → smaller, soft-grey text, opacity zoom-driven by the renderer
function makeLabelSprite(text, colorHex, variant = 'project') {
  const THREE = window.THREE;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const isProject = variant === 'project';
  const fontSize = isProject ? 48 : 32;
  const fontWeight = isProject ? 600 : 500;
  const padding = isProject ? 16 : 10;
  const fontStr = `${fontWeight} ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.font = fontStr;
  const metrics = ctx.measureText(text);
  canvas.width = Math.ceil(metrics.width + padding * 2);
  canvas.height = fontSize + padding * 2;
  // Re-set font after canvas resize (resizing clears state).
  ctx.font = fontStr;
  ctx.fillStyle = isProject ? 'rgba(255,255,255,0.96)' : 'rgba(220,225,235,0.92)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  if (isProject) {
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 18;
  } else {
    // Subtle dark stroke under item labels so they stay legible against bright nodes.
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    ctx.strokeText(text, padding, canvas.height / 2);
  }
  ctx.fillText(text, padding, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  // Sprite size: width / height in world units. Smaller multiplier = more readable at distance.
  const mult = isProject ? 0.18 : 0.13;
  sprite.scale.set(canvas.width * mult, canvas.height * mult, 1);
  return sprite;
}

// Dim everything not connected to the hovered node, restore on un-hover.
function applyHoverHighlight() {
  const id = molState.hoveredId;
  if (!id) {
    for (const nm of molState.nodeMeshes) {
      nm.mesh.material.opacity = 1;
      if (nm.mesh.material.transparent !== undefined) nm.mesh.material.transparent = false;
      if (nm.halo) nm.halo.visible = true;
    }
    for (const e of molState.edgeLines) {
      e.line.material.opacity = e.baseOpacity;
    }
    return;
  }
  const involvedIds = new Set([id]);
  for (const e of molState.edgeLines) {
    if (e.source === id) involvedIds.add(e.target);
    if (e.target === id) involvedIds.add(e.source);
  }
  for (const nm of molState.nodeMeshes) {
    const involved = involvedIds.has(nm.id);
    if (!involved) {
      nm.mesh.material.transparent = true;
      nm.mesh.material.opacity = 0.18;
      if (nm.halo) nm.halo.visible = false;
    } else {
      nm.mesh.material.opacity = 1;
      if (nm.halo) nm.halo.visible = true;
    }
  }
  for (const e of molState.edgeLines) {
    const involved = e.source === id || e.target === id;
    e.line.material.opacity = involved ? Math.max(0.7, e.baseOpacity * 1.5) : 0.05;
  }
}

function teardownMolecular() {
  if (molState.rafHandle) {
    cancelAnimationFrame(molState.rafHandle);
    molState.rafHandle = null;
  }
  if (molState.autoRotateResumeTimer) {
    clearTimeout(molState.autoRotateResumeTimer);
    molState.autoRotateResumeTimer = null;
  }
  if (molState.resizeHandler) { window.removeEventListener('resize', molState.resizeHandler); molState.resizeHandler = null; }
  if (molState.controls) { molState.controls.dispose(); molState.controls = null; }
  if (molState.renderer) {
    const dom = molState.renderer.domElement;
    if (dom) {
      if (molState.pointerDownHandler)   dom.removeEventListener('pointerdown', molState.pointerDownHandler);
      if (molState.pointerMoveHandler)   dom.removeEventListener('pointermove', molState.pointerMoveHandler);
      if (molState.pointerUpHandler)     dom.removeEventListener('pointerup', molState.pointerUpHandler);
      if (molState.pointerCancelHandler) dom.removeEventListener('pointercancel', molState.pointerCancelHandler);
      if (molState.pointerLeaveHandler)  dom.removeEventListener('pointerleave', molState.pointerLeaveHandler);
      if (molState.contextMenuHandler)   dom.removeEventListener('contextmenu', molState.contextMenuHandler);
    }
    molState.renderer.dispose();
    if (dom && dom.parentNode) dom.parentNode.removeChild(dom);
    molState.renderer = null;
  }
  if (molState.scene) {
    molState.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose && m.dispose());
        else if (obj.material.dispose) obj.material.dispose();
      }
      if (obj.material && obj.material.map && obj.material.map.dispose) obj.material.map.dispose();
    });
    molState.scene = null;
  }
  molState.nodeMeshes = [];
  molState.edgeLines = [];
  molState.hoveredId = null;
  molState.pointer = null;
  molState.focusTags = null;
  molState.pointerDownHandler = null;
  molState.pointerMoveHandler = null;
  molState.pointerUpHandler = null;
  molState.pointerCancelHandler = null;
  molState.pointerLeaveHandler = null;
  molState.contextMenuHandler = null;
  molState.camera = null;
  molState.raycaster = null;
  molState.mouse = null;
}



function renderToday() {
  const buckets = buildTodayBuckets();
  const total = buckets.overdueTodos.length + buckets.todayTodos.length + buckets.todayReminders.length + buckets.overdueCommitments.length + buckets.overdueDelegations.length;
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'long' });
  const greeting = todayGreeting();

  if (!(state.todayFilter instanceof Set)) state.todayFilter = new Set();
  const filter = state.todayFilter;
  const filterActive = filter.size > 0;
  const showSection = (kind) => !filterActive || filter.has(kind);

  const mostUrgent = buckets.overdueTodos[0] || buckets.todayTodos[0] || null;

  const session = state.focusSession;
  const sessionActive = !!(session && session.taskId);
  let focusProj = null, focusTodo = null, focusRemain = null;
  if (sessionActive) {
    focusProj = state.data.projects[session.projectKey];
    focusTodo = focusProj?.todos?.find(t => t.id === session.taskId);
    if (focusTodo) focusRemain = getFocusRemaining();
  }

  const waitingCount = buckets.overdueCommitments.length + buckets.overdueDelegations.length;

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-today">
      <div class="view-body-scrollable" style="padding:24px 36px 32px">

        <header class="today-hero">
          <div class="today-hero-eyebrow">${dateStr.toUpperCase()}</div>
          <h1 class="today-hero-title">${escapeHTML(greeting)}.</h1>
          <div class="today-hero-summary">
            ${total === 0
              ? `<span class="today-summary-clean">Nothing pressing today. 🎉</span>`
              : `${buckets.overdueTodos.length > 0 ? `<button class="today-summary-pill alert ${filter.has('overdue')?'active':''}" data-today-filter="overdue">⚠ ${buckets.overdueTodos.length} overdue</button>` : ''}
                 ${buckets.todayTodos.length > 0 ? `<button class="today-summary-pill warn ${filter.has('today')?'active':''}" data-today-filter="today">📅 ${buckets.todayTodos.length} today</button>` : ''}
                 ${buckets.todayReminders.length > 0 ? `<button class="today-summary-pill ${filter.has('reminders')?'active':''}" data-today-filter="reminders">🔔 ${buckets.todayReminders.length} reminder${buckets.todayReminders.length === 1 ? '' : 's'}</button>` : ''}
                 ${waitingCount > 0 ? `<button class="today-summary-pill ${filter.has('waiting')?'active':''}" data-today-filter="waiting">🤝 ${waitingCount} waiting</button>` : ''}
                 ${buckets.upcomingTodos.length > 0 ? `<button class="today-summary-pill muted ${filter.has('upcoming')?'active':''}" data-today-filter="upcoming">📆 ${buckets.upcomingTodos.length} this week</button>` : ''}
                 ${filterActive ? `<button class="today-summary-pill clear" id="today-filter-clear">✕ Clear filter</button>` : ''}`}
          </div>
        </header>

        ${sessionActive && focusTodo ? `
          <section class="today-focus" style="--focus-accent:${focusProj?.color || 'var(--accent)'}">
            <div class="today-focus-card">
              <div class="today-focus-eyebrow">🔥 In focus</div>
              <div class="today-focus-title">${escapeHTML(focusTodo.title)}</div>
              <div class="today-focus-meta">${escapeHTML(focusProj?.name || '')} · ${focusRemain ? formatTimer(focusRemain.remaining) : ''} remaining</div>
              <div class="today-focus-actions">
                <button class="btn btn-ghost btn-sm" data-today-focus="toggle">${session.pausedAt ? '▶ Resume' : '⏸ Pause'}</button>
                <button class="btn btn-ghost btn-sm" data-today-focus="ext5">+5m</button>
                <button class="btn btn-ghost btn-sm" data-today-focus="end">End</button>
              </div>
            </div>
          </section>` : ''}

        ${mostUrgent && !sessionActive && !filterActive ? `
          <section class="today-next-up">
            <div class="today-next-card" data-today-jump-todo="${mostUrgent.todo.id}" data-today-jump-project="${mostUrgent.projectKey}">
              <div class="today-next-eyebrow" style="color:${mostUrgent.projectColor}">⚡ Next up · ${escapeHTML(mostUrgent.projectName)}${mostUrgent.todo.dueDate && isOverdue(mostUrgent.todo.dueDate) ? ` · ⚠ ${daysOverdueLabel(mostUrgent.todo.dueDate)}` : ''}</div>
              <div class="today-next-title">${escapeHTML(mostUrgent.todo.title)}</div>
              <div class="today-next-actions">
                <button class="btn btn-primary btn-sm" data-today-action="done" data-todo-id="${mostUrgent.todo.id}" data-project-key="${mostUrgent.projectKey}">✓ Done</button>
                <button class="btn btn-secondary btn-sm" data-today-action="focus" data-todo-id="${mostUrgent.todo.id}" data-project-key="${mostUrgent.projectKey}">⚡ Focus</button>
                <button class="btn btn-secondary btn-sm" data-today-action="snooze" data-todo-id="${mostUrgent.todo.id}" data-project-key="${mostUrgent.projectKey}">⏰ Tomorrow</button>
                <button class="btn btn-ghost btn-sm" data-today-action="open" data-todo-id="${mostUrgent.todo.id}" data-project-key="${mostUrgent.projectKey}">↗ Open</button>
              </div>
            </div>
          </section>` : ''}

        <div class="today-grid">

          ${showSection('overdue') && buckets.overdueTodos.length > 0 ? `
            <section class="today-card today-card-alert">
              <div class="today-card-header">
                <span class="today-card-icon">⚠</span>
                <span class="today-card-title">Overdue</span>
                <span class="today-card-count">${buckets.overdueTodos.length}</span>
              </div>
              <div class="today-card-body">
                ${buckets.overdueTodos.map(it => todayTodoRowHTML(it, 'overdue')).join('')}
              </div>
            </section>` : ''}

          ${showSection('today') && buckets.todayTodos.length > 0 ? `
            <section class="today-card today-card-warn">
              <div class="today-card-header">
                <span class="today-card-icon">📅</span>
                <span class="today-card-title">Due today</span>
                <span class="today-card-count">${buckets.todayTodos.length}</span>
              </div>
              <div class="today-card-body">
                ${buckets.todayTodos.map(it => todayTodoRowHTML(it, 'today')).join('')}
              </div>
            </section>` : ''}

          ${showSection('reminders') && buckets.todayReminders.length > 0 ? `
            <section class="today-card">
              <div class="today-card-header">
                <span class="today-card-icon">🔔</span>
                <span class="today-card-title">Reminders today</span>
                <span class="today-card-count">${buckets.todayReminders.length}</span>
              </div>
              <div class="today-card-body">
                ${buckets.todayReminders.map(it => `
                  <div class="today-row" data-today-jump-reminder="${it.reminder.id}" data-today-jump-project="${it.projectKey}">
                    <span class="today-row-proj-pill" style="background:color-mix(in srgb, ${it.projectColor} 18%, transparent); color:${it.projectColor}; border-color:${it.projectColor}55">${escapeHTML(shortProjLabel(it.projectName))}</span>
                    <span class="today-row-title">${escapeHTML(it.reminder.title)}</span>
                    <span class="today-row-meta">${formatDateTime(it.reminder.datetime)}</span>
                  </div>`).join('')}
              </div>
            </section>` : ''}

          ${showSection('waiting') && waitingCount > 0 ? `
            <section class="today-card">
              <div class="today-card-header">
                <span class="today-card-icon">🤝</span>
                <span class="today-card-title">Waiting on people</span>
                <span class="today-card-count">${waitingCount}</span>
              </div>
              <div class="today-card-body">
                ${buckets.overdueCommitments.map(it => {
                  const c = it.commitment;
                  const arrow = c.direction === 'they_owe' ? '←' : '→';
                  return `<div class="today-row" data-today-jump-commitment="${c.id}" data-today-jump-project="${it.projectKey}">
                    <span class="today-row-proj-pill" style="background:color-mix(in srgb, ${it.projectColor} 18%, transparent); color:${it.projectColor}; border-color:${it.projectColor}55">${escapeHTML(shortProjLabel(it.projectName))}</span>
                    <span class="today-row-title"><span class="today-row-prefix">${arrow} ${escapeHTML(c.counterparty)}:</span> ${escapeHTML(c.description)}</span>
                    <span class="today-row-meta ${isOverdue(c.due_date) ? 'overdue' : ''}">${formatDate(c.due_date)}</span>
                  </div>`;
                }).join('')}
                ${buckets.overdueDelegations.map(it => {
                  const d = it.delegation;
                  return `<div class="today-row" data-today-jump-delegation="${d.id}" data-today-jump-project="${it.projectKey}">
                    <span class="today-row-proj-pill" style="background:color-mix(in srgb, ${it.projectColor} 18%, transparent); color:${it.projectColor}; border-color:${it.projectColor}55">${escapeHTML(shortProjLabel(it.projectName))}</span>
                    <span class="today-row-title"><span class="today-row-prefix">→ ${escapeHTML(d.delegated_to)}:</span> ${escapeHTML(d.task)}</span>
                    <span class="today-row-meta ${isOverdue(d.due_date) ? 'overdue' : ''}">${formatDate(d.due_date)}</span>
                  </div>`;
                }).join('')}
              </div>
            </section>` : ''}

          ${showSection('upcoming') && buckets.upcomingTodos.length > 0 ? `
            <section class="today-card today-card-muted today-card-wide">
              <div class="today-card-header">
                <span class="today-card-icon">📆</span>
                <span class="today-card-title">Coming up this week</span>
                <span class="today-card-count">${buckets.upcomingTodos.length}</span>
              </div>
              <div class="today-card-body">
                ${buckets.upcomingTodos.map(it => todayTodoRowHTML(it, 'upcoming')).join('')}
              </div>
            </section>` : ''}

        </div>

        ${total === 0 ? `
          <section class="today-empty">
            <div style="font-size:48px; margin-bottom:12px">🎉</div>
            <div style="font-size:18px; font-weight:600; margin-bottom:6px">All caught up.</div>
            <div style="color:var(--text-secondary); font-size:13px; line-height:1.6; max-width:480px; margin:0 auto">
              No overdue items, nothing due today, no reminders firing, nobody waiting on you.
              Use this time to plan ahead, or capture something new with <kbd>Ctrl+K</kbd>.
            </div>
          </section>` : ''}

        ${filterActive && total > 0 ? (() => {
          const visibleSections = ['overdue','today','reminders','waiting','upcoming'].filter(s => filter.has(s) && (
            (s === 'overdue' && buckets.overdueTodos.length) ||
            (s === 'today' && buckets.todayTodos.length) ||
            (s === 'reminders' && buckets.todayReminders.length) ||
            (s === 'waiting' && waitingCount) ||
            (s === 'upcoming' && buckets.upcomingTodos.length)
          ));
          return visibleSections.length === 0 ? `
            <section class="today-empty">
              <div style="font-size:14px; color:var(--text-secondary)">Nothing matches the active filter.</div>
              <button class="btn btn-ghost btn-sm" id="today-filter-clear-2" style="margin-top:10px">Clear filter</button>
            </section>` : '';
        })() : ''}

      </div>
    </div>`;

  // Filter pills
  document.querySelectorAll('[data-today-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.todayFilter;
      if (state.todayFilter.has(f)) state.todayFilter.delete(f);
      else state.todayFilter.add(f);
      renderToday();
    });
  });
  const clearFilter = () => { state.todayFilter.clear(); renderToday(); };
  document.getElementById('today-filter-clear')?.addEventListener('click', clearFilter);
  document.getElementById('today-filter-clear-2')?.addEventListener('click', clearFilter);

  // Wire up actions
  document.querySelectorAll('[data-today-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.todayAction;
      const todoId = btn.dataset.todoId;
      const projKey = btn.dataset.projectKey;
      handleTodayAction(action, projKey, todoId);
    });
  });
  document.querySelectorAll('.today-row[data-today-jump-todo], .today-next-card[data-today-jump-todo]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const projKey = el.dataset.todayJumpProject;
      if (projKey && projKey !== state.project) switchProject(projKey);
      showView('todos');
    });
  });
  document.querySelectorAll('[data-today-jump-reminder]').forEach(el => {
    el.addEventListener('click', () => {
      const projKey = el.dataset.todayJumpProject;
      if (projKey && projKey !== state.project) switchProject(projKey);
      showView('reminders');
    });
  });
  document.querySelectorAll('[data-today-jump-commitment]').forEach(el => {
    el.addEventListener('click', () => {
      const projKey = el.dataset.todayJumpProject;
      if (projKey && projKey !== state.project) switchProject(projKey);
      showView('commitments');
    });
  });
  document.querySelectorAll('[data-today-jump-delegation]').forEach(el => {
    el.addEventListener('click', () => {
      const projKey = el.dataset.todayJumpProject;
      if (projKey && projKey !== state.project) switchProject(projKey);
      showView('delegations');
    });
  });
  document.querySelectorAll('[data-today-focus]').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.todayFocus;
      if (a === 'toggle') stickyTogglePauseFocus();
      else if (a === 'ext5') stickyExtendFocus(5);
      else if (a === 'end') stickyEndFocus();
      renderToday();
    });
  });
}

function shortProjLabel(name) {
  if (!name) return '';
  if (name.length <= 12) return name;
  const words = name.split(/\s+/);
  if (words.length > 1) return words.map(w => w[0]).join('').toUpperCase().slice(0, 4);
  return name.slice(0, 10);
}

function todayTodoRowHTML(item, kind) {
  const t = item.todo;
  const dueLabel = kind === 'overdue'
    ? `⚠ ${daysOverdueLabel(t.dueDate)}`
    : kind === 'today' ? 'today' : formatDate(t.dueDate);
  return `<div class="today-row today-row-todo today-row-${kind}" data-today-jump-todo="${t.id}" data-today-jump-project="${item.projectKey}">
    <span class="today-row-proj-pill" style="background:color-mix(in srgb, ${item.projectColor} 18%, transparent); color:${item.projectColor}; border-color:${item.projectColor}55" title="${escapeHTML(item.projectName)}">${escapeHTML(shortProjLabel(item.projectName))}</span>
    <span class="today-row-title">${escapeHTML(t.title)}</span>
    <span class="today-row-meta ${kind === 'overdue' ? 'overdue' : ''}">${dueLabel}</span>
    <span class="today-row-actions">
      <button class="btn btn-ghost btn-icon" data-today-action="done" data-todo-id="${t.id}" data-project-key="${item.projectKey}" title="Mark done">✓</button>
      <button class="btn btn-ghost btn-icon" data-today-action="snooze" data-todo-id="${t.id}" data-project-key="${item.projectKey}" title="Push to tomorrow">⏰</button>
    </span>
  </div>`;
}

function daysOverdueLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((today - d) / 86400000);
  if (days <= 0) return formatDate(dateStr);
  if (days === 1) return '1 day overdue';
  return `${days} days overdue`;
}

function handleTodayAction(action, projKey, todoId) {
  const proj = state.data.projects[projKey];
  if (!proj) return;
  const t = (proj.todos || []).find(x => x.id === todoId);
  if (!t) return;
  if (action === 'done') {
    t.done = true;
    t.completedAt = new Date().toISOString();
    if (t.recurrence) {
      const clone = spawnNextRecurringTodo(t);
      if (clone) showToast(`Next: ${clone.title} → ${formatDate(clone.dueDate)}`, 'success');
    }
    saveData();
    renderApp();
    return;
  }
  if (action === 'snooze') {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const oldDue = t.dueDate ? new Date(t.dueDate) : tomorrow;
    const delta = Math.round((tomorrow - oldDue) / 86400000);
    t.dueDate = toDateString(tomorrow);
    if (t.startDate && delta) {
      const s = new Date(t.startDate);
      s.setDate(s.getDate() + delta);
      t.startDate = toDateString(s);
    }
    saveData();
    showToast(`Pushed "${t.title}" to tomorrow`, 'success');
    renderApp();
    return;
  }
  if (action === 'focus') {
    if (projKey !== state.project) switchProject(projKey);
    stickyStartFocus({ refType: 'todo', id: todoId, projectKey: projKey });
    if (!state.stickyMode) toggleStickyMode();
    return;
  }
  if (action === 'open') {
    if (projKey !== state.project) switchProject(projKey);
    showView('todos');
    return;
  }
}

