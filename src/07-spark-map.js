'use strict';

// ===== src/07-spark-map.js =====
// Wave-2 extraction (M0): the Spark Map (mind-map) feature in full,
// including the brainmap-navigation tail that was previously co-located
// after the nodeLinks module. This is the largest single Wave-2 module:
// rendering, layout (tidy-tree), event wiring, node CRUD, navigation,
// detail panel, link chips, and chip-popover infrastructure.
//
// var conversion (11 top-level declarations):
// - BM_PAD_X, BM_FONT, BM_ROOT_FONT, BM_H_GAP, BM_V_GAP, BM_NODE_H,
//   BM_ROOT_H, BM_SWATCH_COLORS, BM_SVG_NS — spark-map layout constants
// - _bmMeasureCtx — let, lazily-initialized canvas 2D context for text
//   measurement
// - NODE_LINK_CHIP_INLINE_LIMIT — referenced from this file's chip render
//
// Critical functions called from residual app.js:
// - renderBrainmap / teardownBrainmap / saveBrainmap — used by switchProject
//   and showView in residual. Function declarations are global at
//   script-tag top-level, so the calls resolve identically post-extraction.
// - bmWindowKeyHandler is registered on window in init() (residual);
//   the function declaration moves with this module and stays globally
//   resolvable by name.
// ===== SPARK MAP (brand-new mind map, SVG-rendered, tidy-tree layout) =====
var BM_PAD_X = 16;
var BM_FONT = '13px "Segoe UI", system-ui, sans-serif';
var BM_ROOT_FONT = '15px "Segoe UI", system-ui, sans-serif';
var BM_H_GAP = 72;
var BM_V_GAP = 14;
var BM_NODE_H = 34;
var BM_ROOT_H = 44;
var BM_SWATCH_COLORS = ['#16a34a','#3b82f6','#f59e0b','#ec4899','#8b5cf6','#14b8a6','#f97316','#64748b'];
var BM_SVG_NS = 'http://www.w3.org/2000/svg';

var _bmMeasureCtx = null;
function bmMeasure(label, isRoot, hasAccent) {
  if (!_bmMeasureCtx) _bmMeasureCtx = document.createElement('canvas').getContext('2d');
  _bmMeasureCtx.font = isRoot ? BM_ROOT_FONT : BM_FONT;
  const w = _bmMeasureCtx.measureText(label || ' ').width;
  const extra = hasAccent && !isRoot ? 12 : 0;
  return { w: Math.max(60, Math.round(w)) + BM_PAD_X * 2 + extra, h: isRoot ? BM_ROOT_H : BM_NODE_H };
}

function getBrainmap() {
  const proj = getProject();
  if (!proj.brainmap || !proj.brainmap.rootId || !proj.brainmap.nodes) {
    const rootId = 'bm-root';
    proj.brainmap = {
      rootId,
      nodes: { [rootId]: { id: rootId, parentId: null, label: proj.name || 'Workspace', color: null, side: null, collapsed: false, note: '', order: 0 } }
    };
  }
  return proj.brainmap;
}

function bmAccent() {
  return getProject().color || '#16a34a';
}

function bmGetChildren(bm, parentId) {
  return Object.values(bm.nodes)
    .filter(n => n.parentId === parentId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

function bmBranchColor(bm, node) {
  let n = node;
  while (n && n.parentId && !n.color) n = bm.nodes[n.parentId];
  if (n && n.color) return n.color;
  return bmAccent();
}

function bmSubprojectOf(node) {
  if (!node || !node.subprojectId) return null;
  return (getProject().subprojects || []).find(s => s.id === node.subprojectId) || null;
}

function bmLayout(bm) {
  const out = {};
  const root = bm.nodes[bm.rootId];
  const rootSize = bmMeasure(root.label, true, !!root.subprojectId);
  out[root.id] = { x: 0, y: 0, w: rootSize.w, h: rootSize.h, side: 'center' };

  function subtreeHeight(nodeId) {
    const node = bm.nodes[nodeId];
    const size = bmMeasure(node.label, nodeId === bm.rootId, !!node.subprojectId);
    if (node.collapsed) return size.h;
    const kids = bmGetChildren(bm, nodeId);
    if (!kids.length) return size.h;
    const totals = kids.map(k => subtreeHeight(k.id));
    const sum = totals.reduce((a, b) => a + b, 0) + (kids.length - 1) * BM_V_GAP;
    return Math.max(size.h, sum);
  }

  function layoutDescendants(nodeId, nx, ny, dir) {
    const node = bm.nodes[nodeId];
    if (node.collapsed) return;
    const kids = bmGetChildren(bm, nodeId);
    if (!kids.length) return;
    const heights = kids.map(k => subtreeHeight(k.id));
    const total = heights.reduce((a, b) => a + b, 0) + (kids.length - 1) * BM_V_GAP;
    const parentSize = bmMeasure(node.label, nodeId === bm.rootId, !!node.subprojectId);
    let cursor = ny - total / 2;
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i];
      const h = heights[i];
      const ksize = bmMeasure(k.label, false, !!k.subprojectId);
      const cy = cursor + h / 2;
      const cx = dir > 0
        ? nx + parentSize.w / 2 + BM_H_GAP + ksize.w / 2
        : nx - parentSize.w / 2 - BM_H_GAP - ksize.w / 2;
      out[k.id] = { x: cx, y: cy, w: ksize.w, h: ksize.h, side: dir > 0 ? 'right' : 'left' };
      layoutDescendants(k.id, cx, cy, dir);
      cursor += h + BM_V_GAP;
    }
  }

  const all = bmGetChildren(bm, bm.rootId);
  const right = [];
  const left = [];
  let altRight = true;
  for (const n of all) {
    if (n.side === 'left') left.push(n);
    else if (n.side === 'right') right.push(n);
    else { (altRight ? right : left).push(n); altRight = !altRight; }
  }

  function layoutRootSide(kids, dir) {
    if (!kids.length) return;
    const heights = kids.map(k => subtreeHeight(k.id));
    const total = heights.reduce((a, b) => a + b, 0) + (kids.length - 1) * BM_V_GAP;
    let cursor = 0 - total / 2;
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i];
      const h = heights[i];
      const ksize = bmMeasure(k.label, false, !!k.subprojectId);
      const cy = cursor + h / 2;
      const cx = dir > 0
        ? 0 + rootSize.w / 2 + BM_H_GAP + ksize.w / 2
        : 0 - rootSize.w / 2 - BM_H_GAP - ksize.w / 2;
      out[k.id] = { x: cx, y: cy, w: ksize.w, h: ksize.h, side: dir > 0 ? 'right' : 'left' };
      layoutDescendants(k.id, cx, cy, dir);
      cursor += h + BM_V_GAP;
    }
  }

  layoutRootSide(right, +1);
  layoutRootSide(left, -1);

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const id in out) {
    const n = out[id];
    if (n.x - n.w / 2 < minX) minX = n.x - n.w / 2;
    if (n.x + n.w / 2 > maxX) maxX = n.x + n.w / 2;
    if (n.y - n.h / 2 < minY) minY = n.y - n.h / 2;
    if (n.y + n.h / 2 > maxY) maxY = n.y + n.h / 2;
  }
  return { nodes: out, bounds: { minX, maxX, minY, maxY } };
}

function renderBrainmap() {
  const bm = getBrainmap();
  const proj = getProject();
  if (!state.bm.selectedId || !bm.nodes[state.bm.selectedId]) {
    state.bm.selectedId = bm.rootId;
  }
  const subprojects = proj.subprojects || [];
  const spOptions = subprojects.map(sp =>
    `<option value="${sp.id}">${escapeHTML(sp.name)}</option>`
  ).join('');
  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-brainmap">
      <div class="bm-toolbar">
        <button class="btn btn-secondary btn-sm" id="bm-add-child" title="Tab">+ Child</button>
        <button class="btn btn-secondary btn-sm" id="bm-add-sibling" title="Enter">+ Sibling</button>
        <button class="btn btn-secondary btn-sm" id="bm-rename" title="F2 / double-click">Rename</button>
        <button class="btn btn-secondary btn-sm" id="bm-delete" title="Del">Delete</button>
        <button class="btn btn-secondary btn-sm" id="bm-collapse" title="Space">Collapse</button>
        <div class="bm-tb-divider"></div>
        <div class="bm-color-swatches" id="bm-colors">
          ${BM_SWATCH_COLORS.map(c => `<button class="bm-swatch" data-color="${c}" style="background:${c}" title="Color branch"></button>`).join('')}
          <button class="bm-swatch bm-swatch-clear" data-color="" title="Clear color">×</button>
        </div>
        ${subprojects.length ? `
        <div class="bm-tb-divider"></div>
        <select class="form-select bm-sp-assign" id="bm-sp-assign" title="Link selected node to a subproject">
          <option value="">No subproject</option>
          ${spOptions}
        </select>` : ''}
        <div class="bm-tb-divider"></div>
        <button class="btn btn-secondary btn-sm" id="bm-flip" title="Swap side of a root child">Flip side</button>
        <button class="btn btn-secondary btn-sm" id="bm-zoom-in">＋</button>
        <button class="btn btn-secondary btn-sm" id="bm-zoom-out">−</button>
        <button class="btn btn-secondary btn-sm" id="bm-fit">Fit</button>
        <div class="bm-tb-divider"></div>
        <button class="btn btn-primary btn-sm" id="bm-save">Save</button>
        <span class="bm-hint" id="bm-hint">Tab child · Enter sibling · F2 rename · Del remove · Space collapse · Arrows navigate</span>
      </div>
      <div class="bm-main">
        <div class="bm-stage" id="bm-stage" tabindex="0">
          <svg id="bm-svg" xmlns="http://www.w3.org/2000/svg">
            <g id="bm-pan">
              <g id="bm-edges"></g>
              <g id="bm-nodes"></g>
            </g>
          </svg>
          <div id="bm-edit-layer"></div>
        </div>
        <aside class="bm-detail-panel" id="bm-detail-panel" aria-label="Selected node detail"></aside>
      </div>
      <div class="bm-status" id="bm-status"></div>
    </div>`;

  drawBrainmap();
  // On arrival, center on the selected node when one is set (and isn't the
  // root) — that's the case when the user got here via a reverse-link chip
  // or the linked-items row, and they expect to land on that node, not on
  // a fitted overview where it might be tiny. Default fit-all otherwise.
  requestAnimationFrame(() => {
    if (!bmCenterOnSelected()) bmFitToView();
    setupBrainmapEvents();
  });
}

// Returns true when it centered on a non-root selected node, false otherwise
// (caller should fall back to fit-to-view). Picks a comfortable zoom (1.2x)
// so the selected node sits prominently with parent/sibling context still
// visible around it.
function bmCenterOnSelected() {
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  if (!id || id === bm.rootId) return false;
  const stage = document.getElementById('bm-stage');
  const ln = state.bm.layout && state.bm.layout.nodes[id];
  if (!stage || !ln) return false;
  state.bm.zoom = 1.2;
  state.bm.panX = stage.clientWidth  / 2 - ln.x * state.bm.zoom;
  state.bm.panY = stage.clientHeight / 2 - ln.y * state.bm.zoom;
  applyBmTransform();
  bmUpdateStatus();
  return true;
}

function drawBrainmap() {
  const bm = getBrainmap();
  const layout = bmLayout(bm);
  state.bm.layout = layout;

  const edgesG = document.getElementById('bm-edges');
  const nodesG = document.getElementById('bm-nodes');
  if (!edgesG || !nodesG) return;
  while (edgesG.firstChild) edgesG.removeChild(edgesG.firstChild);
  while (nodesG.firstChild) nodesG.removeChild(nodesG.firstChild);

  for (const id in layout.nodes) {
    const node = bm.nodes[id];
    if (!node || !node.parentId) continue;
    const pn = layout.nodes[node.parentId];
    const cn = layout.nodes[id];
    if (!pn || !cn) continue;
    const dir = cn.x >= pn.x ? 1 : -1;
    const sx = pn.x + dir * pn.w / 2;
    const sy = pn.y;
    const ex = cn.x - dir * cn.w / 2;
    const ey = cn.y;
    const mx = (sx + ex) / 2;
    const color = bmBranchColor(bm, node);
    const path = document.createElementNS(BM_SVG_NS, 'path');
    path.setAttribute('d', `M ${sx} ${sy} C ${mx} ${sy}, ${mx} ${ey}, ${ex} ${ey}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', node.parentId === bm.rootId ? '3' : '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('class', 'bm-edge');
    edgesG.appendChild(path);
  }

  for (const id in layout.nodes) {
    const node = bm.nodes[id];
    if (!node) continue;
    const ln = layout.nodes[id];
    const isRoot = id === bm.rootId;
    const isSel = state.bm.selectedId === id;
    const color = isRoot ? bmAccent() : bmBranchColor(bm, node);
    const kids = bmGetChildren(bm, id);
    const hasKids = kids.length > 0;

    const g = document.createElementNS(BM_SVG_NS, 'g');
    g.setAttribute('class', 'bm-node' + (isSel ? ' bm-node-selected' : '') + (isRoot ? ' bm-node-root' : ''));
    g.setAttribute('transform', `translate(${ln.x - ln.w / 2}, ${ln.y - ln.h / 2})`);
    g.setAttribute('data-id', id);

    const rect = document.createElementNS(BM_SVG_NS, 'rect');
    rect.setAttribute('width', ln.w);
    rect.setAttribute('height', ln.h);
    rect.setAttribute('rx', isRoot ? 12 : 9);
    rect.setAttribute('ry', isRoot ? 12 : 9);
    rect.setAttribute('fill', isRoot ? color : '#ffffff');
    rect.setAttribute('stroke', color);
    rect.setAttribute('stroke-width', isSel ? '3' : '2');
    g.appendChild(rect);

    const sp = bmSubprojectOf(node);
    if (sp && !isRoot) {
      const bar = document.createElementNS(BM_SVG_NS, 'rect');
      bar.setAttribute('x', '4');
      bar.setAttribute('y', '4');
      bar.setAttribute('width', '5');
      bar.setAttribute('height', ln.h - 8);
      bar.setAttribute('rx', '2.5');
      bar.setAttribute('ry', '2.5');
      bar.setAttribute('fill', sp.color);
      g.appendChild(bar);
    }

    const textX = (sp && !isRoot) ? (ln.w / 2) + 6 : ln.w / 2;
    const text = document.createElementNS(BM_SVG_NS, 'text');
    text.setAttribute('x', textX);
    text.setAttribute('y', ln.h / 2 + (isRoot ? 5 : 4));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', '"Segoe UI", system-ui, sans-serif');
    text.setAttribute('font-size', isRoot ? '15' : '13');
    text.setAttribute('font-weight', isRoot ? '600' : '500');
    text.setAttribute('fill', isRoot ? '#ffffff' : '#0f172a');
    text.textContent = node.label || '(empty)';
    g.appendChild(text);

    if (sp && isRoot) {
      const dot = document.createElementNS(BM_SVG_NS, 'circle');
      dot.setAttribute('cx', ln.w - 10);
      dot.setAttribute('cy', 10);
      dot.setAttribute('r', 5);
      dot.setAttribute('fill', sp.color);
      dot.setAttribute('stroke', '#ffffff');
      dot.setAttribute('stroke-width', 1.5);
      g.appendChild(dot);
    }

    if (hasKids && !isRoot) {
      const dir = ln.side === 'right' ? 1 : -1;
      const bx = dir > 0 ? ln.w + 6 : -20;
      const badge = document.createElementNS(BM_SVG_NS, 'g');
      badge.setAttribute('class', 'bm-badge');
      badge.setAttribute('transform', `translate(${bx}, ${ln.h / 2 - 8})`);
      const circ = document.createElementNS(BM_SVG_NS, 'circle');
      circ.setAttribute('cx', '8'); circ.setAttribute('cy', '8'); circ.setAttribute('r', '8');
      circ.setAttribute('fill', color);
      badge.appendChild(circ);
      const bt = document.createElementNS(BM_SVG_NS, 'text');
      bt.setAttribute('x', '8'); bt.setAttribute('y', '12');
      bt.setAttribute('text-anchor', 'middle');
      bt.setAttribute('font-size', '11');
      bt.setAttribute('font-weight', '700');
      bt.setAttribute('fill', '#ffffff');
      bt.textContent = node.collapsed ? '+' : '−';
      badge.appendChild(bt);
      g.appendChild(badge);
    }

    // Linked-items count badge — skipped at 0 per the v2 plan to avoid
    // clutter on every empty node. Positioned above-right outside the node
    // box. Tapping it routes selection to this node and ensures the detail
    // panel scrolls its linked-items section into view (handled in the
    // svg-click delegate). Render this AFTER the collapse badge so it
    // overlaps neither the subproject color bar nor the collapse '+/−'.
    const linkCount = nodeLinkCount(id);
    if (linkCount > 0) {
      const lbadge = document.createElementNS(BM_SVG_NS, 'g');
      lbadge.setAttribute('class', 'bm-link-badge');
      lbadge.setAttribute('data-link-badge-for', id);
      lbadge.setAttribute('transform', `translate(${ln.w - 6}, -10)`);
      const lcirc = document.createElementNS(BM_SVG_NS, 'circle');
      lcirc.setAttribute('cx', '0'); lcirc.setAttribute('cy', '0');
      lcirc.setAttribute('r', '9');
      lcirc.setAttribute('fill', '#0f172a');
      lcirc.setAttribute('stroke', '#ffffff');
      lcirc.setAttribute('stroke-width', '1.5');
      lbadge.appendChild(lcirc);
      const ltxt = document.createElementNS(BM_SVG_NS, 'text');
      ltxt.setAttribute('x', '0'); ltxt.setAttribute('y', '4');
      ltxt.setAttribute('text-anchor', 'middle');
      ltxt.setAttribute('font-size', linkCount > 9 ? '10' : '11');
      ltxt.setAttribute('font-weight', '700');
      ltxt.setAttribute('fill', '#ffffff');
      ltxt.textContent = linkCount > 99 ? '99+' : String(linkCount);
      lbadge.appendChild(ltxt);
      g.appendChild(lbadge);
    }

    nodesG.appendChild(g);
  }

  applyBmTransform();
  bmUpdateStatus();
  bmSyncSpSelect();
  bmRenderDetailPanel();
}

function bmSyncSpSelect() {
  const sel = document.getElementById('bm-sp-assign');
  if (!sel) return;
  const bm = getBrainmap();
  const node = bm.nodes[state.bm.selectedId];
  sel.value = (node && node.subprojectId) || '';
}

function bmUpdateStatus() {
  const s = document.getElementById('bm-status');
  if (!s) return;
  const count = Object.keys(getBrainmap().nodes).length;
  s.textContent = `${count} node${count === 1 ? '' : 's'}  ·  zoom ${Math.round(state.bm.zoom * 100)}%`;
}

function applyBmTransform() {
  const g = document.getElementById('bm-pan');
  if (!g) return;
  g.setAttribute('transform', `translate(${state.bm.panX} ${state.bm.panY}) scale(${state.bm.zoom})`);
}

function bmFitToView() {
  const layout = state.bm.layout;
  const stage = document.getElementById('bm-stage');
  if (!layout || !stage) return;
  if (stage.clientWidth === 0 || stage.clientHeight === 0) {
    requestAnimationFrame(bmFitToView);
    return;
  }
  const { minX, maxX, minY, maxY } = layout.bounds;
  const w = Math.max(1, maxX - minX) + 80;
  const h = Math.max(1, maxY - minY) + 80;
  const scale = Math.min(stage.clientWidth / w, stage.clientHeight / h, 1.4);
  state.bm.zoom = Math.max(0.25, scale);
  state.bm.panX = stage.clientWidth / 2 - ((minX + maxX) / 2) * state.bm.zoom;
  state.bm.panY = stage.clientHeight / 2 - ((minY + maxY) / 2) * state.bm.zoom;
  applyBmTransform();
  bmUpdateStatus();
}

function setupBrainmapEvents() {
  const stage = document.getElementById('bm-stage');
  const svg = document.getElementById('bm-svg');
  if (!stage || !svg) return;

  document.getElementById('bm-add-child').onclick   = bmAddChild;
  document.getElementById('bm-add-sibling').onclick = bmAddSibling;
  document.getElementById('bm-rename').onclick      = bmStartRename;
  document.getElementById('bm-delete').onclick      = bmDeleteSelected;
  document.getElementById('bm-collapse').onclick    = bmToggleCollapse;
  document.getElementById('bm-flip').onclick        = bmFlipSide;
  document.getElementById('bm-zoom-in').onclick     = () => bmZoomAt(1.15);
  document.getElementById('bm-zoom-out').onclick    = () => bmZoomAt(1 / 1.15);
  document.getElementById('bm-fit').onclick         = bmFitToView;
  document.getElementById('bm-save').onclick        = () => { saveBrainmap(); showToast('Spark map saved.', 'success'); };

  document.getElementById('bm-colors').addEventListener('click', (e) => {
    const sw = e.target.closest('[data-color]');
    if (!sw) return;
    bmApplyColor(sw.dataset.color || null);
  });

  const spSel = document.getElementById('bm-sp-assign');
  if (spSel) {
    spSel.addEventListener('change', (e) => {
      bmAssignToSubproject(e.target.value || null);
    });
  }

  svg.addEventListener('click', (e) => {
    const badge = e.target.closest('.bm-badge');
    const linkBadge = e.target.closest('.bm-link-badge');
    const g = e.target.closest('.bm-node');
    if (badge && g) {
      state.bm.selectedId = g.dataset.id;
      bmToggleCollapse();
      return;
    }
    if (linkBadge && g) {
      // Select the node and surface the linked-items section. Panel is
      // always visible; we just scroll it to the section header so taps
      // behave the same whether the panel was scrolled or not.
      state.bm.selectedId = g.dataset.id;
      drawBrainmap();
      const panel = document.getElementById('bm-detail-panel');
      const section = panel && panel.querySelector('.bm-dp-linked');
      if (section) section.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    if (g) {
      state.bm.selectedId = g.dataset.id;
      drawBrainmap();
      stage.focus();
    }
  });

  svg.addEventListener('dblclick', (e) => {
    const g = e.target.closest('.bm-node');
    if (!g) return;
    state.bm.selectedId = g.dataset.id;
    bmStartRename();
  });

  svg.addEventListener('contextmenu', (e) => {
    const g = e.target.closest('.bm-node');
    if (!g) return;
    e.preventDefault();
    state.bm.selectedId = g.dataset.id;
    drawBrainmap();
    showBmContextMenu(e.clientX, e.clientY);
  });

  let panning = false, panStart = null;
  svg.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.bm-node') || e.target.closest('.bm-edge')) return;
    panning = true;
    panStart = { x: e.clientX, y: e.clientY, panX: state.bm.panX, panY: state.bm.panY };
    stage.classList.add('bm-panning');
  });
  const onMouseMove = (e) => {
    if (!panning) return;
    state.bm.panX = panStart.panX + (e.clientX - panStart.x);
    state.bm.panY = panStart.panY + (e.clientY - panStart.y);
    applyBmTransform();
  };
  const onMouseUp = () => {
    if (!panning) return;
    panning = false;
    stage.classList.remove('bm-panning');
  };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  state.bm._mouseMoveHandler = onMouseMove;
  state.bm._mouseUpHandler = onMouseUp;

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = stage.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= 400;
    const sensitivity = e.ctrlKey ? 0.008 : 0.0022;
    let factor = Math.exp(-dy * sensitivity);
    factor = Math.max(0.85, Math.min(1.18, factor));
    bmZoomAt(factor, cx, cy);
  }, { passive: false });

  // Touch: one-finger pan, two-finger pinch zoom, long-press contextmenu
  let touchState = null;
  let longPressTimer = null;
  const LONG_PRESS_MS = 500;
  const LONG_PRESS_MOVE_TOL = 10;

  const clearLongPress = () => {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  };

  const touchDist = (a, b) => {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  };
  const touchMid = (a, b) => ({
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2
  });

  svg.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const nodeEl = document.elementFromPoint(t.clientX, t.clientY)?.closest('.bm-node');
      touchState = {
        mode: 'pan',
        startX: t.clientX,
        startY: t.clientY,
        panX: state.bm.panX,
        panY: state.bm.panY,
        onNode: nodeEl ? nodeEl.dataset.id : null,
        moved: false
      };
      stage.classList.add('bm-panning');
      if (nodeEl) {
        longPressTimer = setTimeout(() => {
          longPressTimer = null;
          if (touchState && !touchState.moved) {
            state.bm.selectedId = nodeEl.dataset.id;
            drawBrainmap();
            showBmContextMenu(t.clientX, t.clientY);
            touchState.mode = 'longpress';
            stage.classList.remove('bm-panning');
          }
        }, LONG_PRESS_MS);
      }
    } else if (e.touches.length === 2) {
      clearLongPress();
      const [a, b] = [e.touches[0], e.touches[1]];
      const rect = stage.getBoundingClientRect();
      const mid = touchMid(a, b);
      touchState = {
        mode: 'pinch',
        startDist: touchDist(a, b),
        lastDist: touchDist(a, b),
        lastMidX: mid.x - rect.left,
        lastMidY: mid.y - rect.top
      };
      stage.classList.remove('bm-panning');
    }
  }, { passive: true });

  svg.addEventListener('touchmove', (e) => {
    if (!touchState) return;
    if (touchState.mode === 'pan' && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - touchState.startX;
      const dy = t.clientY - touchState.startY;
      if (!touchState.moved && Math.hypot(dx, dy) > LONG_PRESS_MOVE_TOL) {
        touchState.moved = true;
        clearLongPress();
      }
      if (touchState.moved) {
        e.preventDefault();
        state.bm.panX = touchState.panX + dx;
        state.bm.panY = touchState.panY + dy;
        applyBmTransform();
      }
    } else if (touchState.mode === 'pinch' && e.touches.length === 2) {
      e.preventDefault();
      const [a, b] = [e.touches[0], e.touches[1]];
      const dist = touchDist(a, b);
      const mid = touchMid(a, b);
      const rect = stage.getBoundingClientRect();
      const cx = mid.x - rect.left;
      const cy = mid.y - rect.top;
      const oldZoom = state.bm.zoom;
      const rawZoom = oldZoom * (dist / touchState.lastDist);
      const newZoom = Math.max(0.2, Math.min(3, rawZoom));
      // Keep the content that was under the previous midpoint stationary
      // relative to the new midpoint, while zooming around it.
      state.bm.panX = cx - (touchState.lastMidX - state.bm.panX) * (newZoom / oldZoom);
      state.bm.panY = cy - (touchState.lastMidY - state.bm.panY) * (newZoom / oldZoom);
      state.bm.zoom = newZoom;
      touchState.lastDist = dist;
      touchState.lastMidX = cx;
      touchState.lastMidY = cy;
      applyBmTransform();
      bmUpdateStatus();
    }
  }, { passive: false });

  const endTouch = (e) => {
    if (!touchState) return;
    clearLongPress();
    if (touchState.mode === 'pan' && !touchState.moved && touchState.onNode) {
      state.bm.selectedId = touchState.onNode;
      drawBrainmap();
    }
    if (e.touches && e.touches.length === 1 && touchState.mode === 'pinch') {
      // Transition from pinch to single-finger pan without dropping the gesture
      const t = e.touches[0];
      touchState = {
        mode: 'pan',
        startX: t.clientX,
        startY: t.clientY,
        panX: state.bm.panX,
        panY: state.bm.panY,
        onNode: null,
        moved: true
      };
      return;
    }
    touchState = null;
    stage.classList.remove('bm-panning');
  };
  svg.addEventListener('touchend', endTouch, { passive: true });
  svg.addEventListener('touchcancel', endTouch, { passive: true });

  stage.focus();
}

function bmWindowKeyHandler(e) {
  if (state.view !== 'brainmap') return;
  if (paletteState && paletteState.open) return;
  // Modifier-bearing keys are reserved for app-wide shortcuts (Ctrl+Tab to
  // cycle views, Alt+1..9 to jump out, Ctrl+Z to undo, etc.). Without this
  // skip, Ctrl+Tab would also be eaten as "add child" because Tab matches
  // below regardless of modifiers.
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tgt = e.target;
  if (tgt && tgt.classList && tgt.classList.contains('bm-rename-input')) {
    if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      bmCommitRenameThenAddChild();
    }
    return;
  }
  const tag = tgt && tgt.tagName;
  const editable = tgt && (tgt.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
  const inStage = tgt && tgt.closest && tgt.closest('#bm-stage');
  if (editable && !inStage) return;
  const k = e.key;
  if (k === 'Tab' || k === 'Enter' || k === 'F2' || k === 'Delete' || k === 'Backspace' || k === ' ' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight') {
    e.preventDefault();
    e.stopPropagation();
    bmKeyHandler(e);
  }
}

function bmCommitRenameThenAddChild() {
  const layer = document.getElementById('bm-edit-layer');
  const input = layer && layer.querySelector('.bm-rename-input');
  const id = state.bm.editingId;
  if (!input || !id) { bmAddChild(); return; }
  const bm = getBrainmap();
  if (bm.nodes[id]) bm.nodes[id].label = input.value.trim() || 'Untitled';
  state.bm.editingId = null;
  layer.innerHTML = '';
  drawBrainmap();
  saveBrainmap();
  bmAddChild();
}

function bmZoomAt(factor, cx, cy) {
  const stage = document.getElementById('bm-stage');
  if (!stage) return;
  if (cx == null) { cx = stage.clientWidth / 2; cy = stage.clientHeight / 2; }
  const oldZoom = state.bm.zoom;
  const newZoom = Math.max(0.2, Math.min(3, oldZoom * factor));
  state.bm.panX = cx - (cx - state.bm.panX) * (newZoom / oldZoom);
  state.bm.panY = cy - (cy - state.bm.panY) * (newZoom / oldZoom);
  state.bm.zoom = newZoom;
  applyBmTransform();
  bmUpdateStatus();
}

function hideBmContextMenu() {
  const m = document.getElementById('bm-context-menu');
  if (m) m.remove();
  document.removeEventListener('mousedown', bmContextMenuOutsideHandler, true);
  document.removeEventListener('keydown', bmContextMenuKeyHandler, true);
  window.removeEventListener('blur', hideBmContextMenu);
}

function bmContextMenuOutsideHandler(e) {
  const m = document.getElementById('bm-context-menu');
  if (m && !m.contains(e.target)) hideBmContextMenu();
}

function bmContextMenuKeyHandler(e) {
  if (e.key === 'Escape') { e.preventDefault(); hideBmContextMenu(); }
}

function showBmContextMenu(clientX, clientY) {
  hideBmContextMenu();
  const bm = getBrainmap();
  const sel = bm.nodes[state.bm.selectedId];
  if (!sel) return;
  const isRoot = !sel.parentId;

  const menu = document.createElement('div');
  menu.id = 'bm-context-menu';
  menu.className = 'bm-context-menu';
  menu.innerHTML = `
    <button class="bm-ctx-item" data-action="rename">
      <span class="bm-ctx-icon">✎</span><span>Rename</span><span class="bm-ctx-shortcut">F2</span>
    </button>
    <button class="bm-ctx-item" data-action="add-child">
      <span class="bm-ctx-icon">＋</span><span>Add child</span><span class="bm-ctx-shortcut">Tab</span>
    </button>
    <button class="bm-ctx-item" data-action="add-sibling" ${isRoot ? 'disabled' : ''}>
      <span class="bm-ctx-icon">＋</span><span>Add sibling</span><span class="bm-ctx-shortcut">Enter</span>
    </button>
    <div class="bm-ctx-divider"></div>
    <button class="bm-ctx-item bm-ctx-danger" data-action="delete" ${isRoot ? 'disabled' : ''}>
      <span class="bm-ctx-icon">✕</span><span>Delete</span><span class="bm-ctx-shortcut">Del</span>
    </button>`;
  document.body.appendChild(menu);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = menu.getBoundingClientRect();
  const x = Math.min(clientX, vw - rect.width - 8);
  const y = Math.min(clientY, vh - rect.height - 8);
  menu.style.left = `${Math.max(4, x)}px`;
  menu.style.top  = `${Math.max(4, y)}px`;

  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('.bm-ctx-item');
    if (!btn || btn.disabled) return;
    const action = btn.dataset.action;
    hideBmContextMenu();
    if (action === 'rename')           bmStartRename();
    else if (action === 'add-child')   bmAddChild();
    else if (action === 'add-sibling') bmAddSibling();
    else if (action === 'delete')      bmDeleteSelected();
  });

  setTimeout(() => {
    document.addEventListener('mousedown', bmContextMenuOutsideHandler, true);
    document.addEventListener('keydown', bmContextMenuKeyHandler, true);
    window.addEventListener('blur', hideBmContextMenu);
  }, 0);
}

function bmKeyHandler(e) {
  if (state.bm.editingId) return;
  const k = e.key;
  if (k === 'Tab')       { e.preventDefault(); bmAddChild();   return; }
  if (k === 'Enter')     { e.preventDefault(); bmAddSibling(); return; }
  if (k === 'F2')        { e.preventDefault(); bmStartRename();return; }
  if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); bmDeleteSelected(); return; }
  if (k === ' ')         { e.preventDefault(); bmToggleCollapse(); return; }
  if (k === 'ArrowUp')   { e.preventDefault(); bmReorderSibling(-1); return; }
  if (k === 'ArrowDown') { e.preventDefault(); bmReorderSibling(+1); return; }
  if (k === 'ArrowLeft') { e.preventDefault(); bmNavigate('left');  return; }
  if (k === 'ArrowRight'){ e.preventDefault(); bmNavigate('right'); return; }
}

function bmAddChild() {
  const bm = getBrainmap();
  const parentId = state.bm.selectedId || bm.rootId;
  const parent = bm.nodes[parentId];
  if (!parent) return;
  const siblings = bmGetChildren(bm, parentId);
  let side = null;
  if (parentId === bm.rootId) {
    const r = siblings.filter(n => n.side === 'right').length;
    const l = siblings.filter(n => n.side === 'left').length;
    side = r <= l ? 'right' : 'left';
  }
  const newId = generateId('bm');
  bm.nodes[newId] = { id: newId, parentId, label: 'New idea', color: null, side, collapsed: false, note: '', order: siblings.length, subprojectId: null, linkedItems: [] };
  if (parent.collapsed) parent.collapsed = false;
  state.bm.selectedId = newId;
  drawBrainmap();
  saveBrainmap();
  bmStartRename();
}

function bmAddSibling() {
  const bm = getBrainmap();
  const sel = bm.nodes[state.bm.selectedId];
  if (!sel) return;
  if (!sel.parentId) { bmAddChild(); return; }
  const parentId = sel.parentId;
  const newId = generateId('bm');
  const side = parentId === bm.rootId ? (sel.side || 'right') : null;
  bm.nodes[newId] = { id: newId, parentId, label: 'New idea', color: null, side, collapsed: false, note: '', order: (sel.order || 0) + 0.5, subprojectId: null, linkedItems: [] };
  bmGetChildren(bm, parentId).forEach((n, i) => { n.order = i; });
  state.bm.selectedId = newId;
  drawBrainmap();
  saveBrainmap();
  bmStartRename();
}

function bmStartRename() {
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  const ln = state.bm.layout && state.bm.layout.nodes[id];
  if (!id || !bm.nodes[id] || !ln) return;
  const layer = document.getElementById('bm-edit-layer');
  const stage = document.getElementById('bm-stage');
  if (!layer || !stage) return;
  state.bm.editingId = id;
  layer.innerHTML = '';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'bm-rename-input';
  input.value = bm.nodes[id].label;
  const screenX = state.bm.panX + ln.x * state.bm.zoom;
  const screenY = state.bm.panY + ln.y * state.bm.zoom;
  const w = Math.max(160, ln.w * state.bm.zoom + 20);
  input.style.left = `${screenX - w / 2}px`;
  input.style.top = `${screenY - 18}px`;
  input.style.width = `${w}px`;
  layer.appendChild(input);
  input.focus();
  input.select();
  const commit = (save) => {
    if (state.bm.editingId !== id) return;
    if (save) bm.nodes[id].label = input.value.trim() || 'Untitled';
    state.bm.editingId = null;
    layer.innerHTML = '';
    drawBrainmap();
    if (save) saveBrainmap();
    stage.focus();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(true); }
    else if (e.key === 'Escape') { e.preventDefault(); commit(false); }
    else e.stopPropagation();
  });
  input.addEventListener('blur', () => commit(true));
}

function bmDeleteSelected() {
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  if (!id) return;
  if (id === bm.rootId) { showToast('Cannot delete the root.', 'info'); return; }
  const node = bm.nodes[id];
  if (!node) return;
  const toDelete = new Set();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop();
    toDelete.add(cur);
    for (const child of bmGetChildren(bm, cur)) stack.push(child.id);
  }
  const parentId = node.parentId;
  toDelete.forEach(d => delete bm.nodes[d]);
  bmGetChildren(bm, parentId).forEach((n, i) => { n.order = i; });
  state.bm.selectedId = parentId || bm.rootId;
  drawBrainmap();
  saveBrainmap();
}

function bmToggleCollapse() {
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  if (!id || id === bm.rootId) return;
  const node = bm.nodes[id];
  if (!node || !bmGetChildren(bm, id).length) return;
  node.collapsed = !node.collapsed;
  drawBrainmap();
  saveBrainmap();
}

function bmFlipSide() {
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  const node = bm.nodes[id];
  if (!node || node.parentId !== bm.rootId) {
    showToast('Only direct children of the root have a side.', 'info');
    return;
  }
  node.side = node.side === 'right' ? 'left' : 'right';
  drawBrainmap();
  saveBrainmap();
}

function bmApplyColor(color) {
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  const node = bm.nodes[id];
  if (!node) return;
  node.color = color || null;
  drawBrainmap();
  saveBrainmap();
}

function bmAssignToSubproject(spId) {
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  const node = bm.nodes[id];
  if (!node) return;
  node.subprojectId = spId || null;
  drawBrainmap();
  saveBrainmap();
  showToast(spId ? 'Node linked to subproject.' : 'Node unlinked.', 'success');
}

function bmReorderSibling(delta) {
  const bm = getBrainmap();
  const node = bm.nodes[state.bm.selectedId];
  if (!node || !node.parentId) return;
  const sibs = bmGetChildren(bm, node.parentId);
  const idx = sibs.findIndex(n => n.id === node.id);
  const next = idx + delta;
  if (next < 0 || next >= sibs.length) return;
  const other = sibs[next];
  const t = node.order; node.order = other.order; other.order = t;
  drawBrainmap();
  saveBrainmap();
}

function bmNavigate(dir) {
  const bm = getBrainmap();
  const layout = state.bm.layout;
  if (!layout) return;
  const cur = state.bm.selectedId;
  const node = bm.nodes[cur];
  if (!node) return;
  const ln = layout.nodes[cur];
  if (!ln) return;

  const intoChildren = () => {
    if (node.collapsed) return false;
    const kids = bmGetChildren(bm, cur);
    if (!kids.length) return false;
    const mid = Math.floor(kids.length / 2);
    state.bm.selectedId = kids[mid].id;
    return true;
  };
  const toParent = () => {
    if (!node.parentId) return false;
    state.bm.selectedId = node.parentId;
    return true;
  };

  if (dir === 'left') {
    if (cur === bm.rootId) {
      const kids = bmGetChildren(bm, bm.rootId).filter(k => k.side === 'left');
      if (kids.length) state.bm.selectedId = kids[Math.floor(kids.length / 2)].id;
    } else if (ln.side === 'right') {
      toParent();
    } else {
      intoChildren();
    }
  } else if (dir === 'right') {
    if (cur === bm.rootId) {
      const kids = bmGetChildren(bm, bm.rootId).filter(k => k.side !== 'left');
      if (kids.length) state.bm.selectedId = kids[Math.floor(kids.length / 2)].id;
    } else if (ln.side === 'left') {
      toParent();
    } else {
      intoChildren();
    }
  }
  drawBrainmap();
}

function saveBrainmap() {
  const bm = getBrainmap();
  const groups = {};
  for (const n of Object.values(bm.nodes)) {
    const p = n.parentId || '__root__';
    (groups[p] ||= []).push(n);
  }
  for (const p in groups) {
    groups[p].sort((a, b) => (a.order || 0) - (b.order || 0));
    groups[p].forEach((n, i) => { n.order = i; });
  }
  saveData();
}

function teardownBrainmap() {
  hideBmContextMenu();
  state.bm.editingId = null;
  state.bm.layout = null;
  state.bm.selectedId = null;
  state.bm.panX = 0; state.bm.panY = 0; state.bm.zoom = 1;
  state.bm.detailExpandedNodeId = null;
  // lastLinkedTypeByNode intentionally NOT cleared — it survives view-switches
  // within the same session per the v2 plan ("reset on app reload").
  document.removeEventListener('click', bmTypePickerOutsideHandler, true);
  document.removeEventListener('click', bmFlowPickerOutsideHandler, true);
  const layer = document.getElementById('bm-edit-layer');
  if (layer) layer.innerHTML = '';
  if (state.bm._mouseMoveHandler) window.removeEventListener('mousemove', state.bm._mouseMoveHandler);
  if (state.bm._mouseUpHandler) window.removeEventListener('mouseup', state.bm._mouseUpHandler);
  state.bm._mouseMoveHandler = null;
  state.bm._mouseUpHandler = null;
}

// ============================================================================
// SPARK MAP — DETAIL PANEL (PHASE 2)
// Per-node panel showing linked items + an inline-add input. The ONLY mutator
// for node.linkedItems remains addNodeLink/removeNodeLink in the nodeLinks
// module — this code orchestrates UI + entity creation, then calls the
// chokepoint helpers.
// ============================================================================

// Per-node memory of last-used link type. Defaults to 'todo' for nodes
// never linked from before. Map is on state.bm (session-only).
function bmGetCurrentLinkType(nodeId) {
  const t = state.bm.lastLinkedTypeByNode.get(nodeId);
  return (t && NODE_LINK_ENTITY_TYPES.includes(t)) ? t : 'todo';
}
function bmSetCurrentLinkType(nodeId, type) {
  if (NODE_LINK_ENTITY_TYPES.includes(type)) {
    state.bm.lastLinkedTypeByNode.set(nodeId, type);
  }
}

function bmEntityTitle(entityType, entity) {
  if (!entity) return null;
  if (entityType === 'todo' || entityType === 'note' || entityType === 'reminder') return entity.title;
  if (entityType === 'commitment') return entity.description;
  if (entityType === 'delegation') return entity.task;
  if (entityType === 'flow')       return entity.name;
  return null;
}

// Done-state helpers. Notes and flows have no "done"; the others each store
// the state in a different field, mirroring the canonical native-view toggles
// (toggleTodoDone / updateCommitmentStatus / updateDelegationStatus). Keeping
// these inline rather than reusing the native toggles because those wrap UI
// concerns we don't want here (toasts, recurrence spawning, navigation).
function bmEntityHasDoneState(entityType) {
  return entityType === 'todo' || entityType === 'reminder'
      || entityType === 'commitment' || entityType === 'delegation';
}
function bmEntityIsDone(entityType, entity) {
  if (!entity) return false;
  if (entityType === 'todo')       return !!entity.done;
  if (entityType === 'reminder')   return !!entity.doneAt;
  if (entityType === 'commitment') return entity.status === 'fulfilled';
  if (entityType === 'delegation') return entity.status === 'done';
  return false;
}
function bmToggleEntityDone(entityType, entity) {
  if (!entity) return;
  const now = new Date().toISOString();
  if (entityType === 'todo') {
    const becoming = !entity.done;
    entity.done = becoming;
    entity.completedAt = becoming ? now : null;
  } else if (entityType === 'reminder') {
    entity.doneAt = entity.doneAt ? null : now;
  } else if (entityType === 'commitment') {
    if (entity.status === 'fulfilled') {
      entity.status = 'open';
      entity.fulfilled_at = null;
    } else {
      entity.status = 'fulfilled';
      entity.fulfilled_at = now;
    }
  } else if (entityType === 'delegation') {
    entity.status = entity.status === 'done' ? 'waiting' : 'done';
    entity.last_update = now;
  }
  saveData();
}

function bmRenderDetailPanel() {
  const panel = document.getElementById('bm-detail-panel');
  if (!panel) return;
  const bm = getBrainmap();
  const id = state.bm.selectedId;
  const node = id && bm.nodes && bm.nodes[id];
  if (!node) { panel.innerHTML = ''; return; }

  // Coarse reset of the "Show all" toggle when selection moves to a
  // different node. Keeps the toggle scoped to the node it was opened on.
  if (state.bm.detailExpandedNodeId && state.bm.detailExpandedNodeId !== id) {
    state.bm.detailExpandedNodeId = null;
  }

  const itemsAll   = getLinkedItems(id);
  const totalAll   = itemsAll.length;
  const archivedN  = itemsAll.reduce((n, it) => n + (it.isArchived ? 1 : 0), 0);
  const doneN      = itemsAll.reduce((n, it) => n + (
    !it.isOrphan && bmEntityHasDoneState(it.entityType) && bmEntityIsDone(it.entityType, it.entity) ? 1 : 0
  ), 0);
  const hideArch   = state.bm.detailHideArchived;
  const hideDone   = state.bm.detailHideDone;
  // Filtered set: rows the user actually sees in the list. Counts and
  // overflow logic key off this filtered set so numbers stay consistent
  // with what's rendered. The `archivedN` / `doneN` tallies above keep
  // the "(N hidden)" hint honest even when filtering is on.
  const items = itemsAll.filter(it => {
    if (hideArch && it.isArchived) return false;
    if (hideDone && !it.isOrphan && bmEntityHasDoneState(it.entityType) && bmEntityIsDone(it.entityType, it.entity)) return false;
    return true;
  });
  const total = items.length;
  const expand    = state.bm.detailExpandedNodeId === id;
  // Array order is oldest-first; tail = newest. Display order is newest-first
  // (so we reverse a copy). When >10 items and not expanded, show only the
  // 8 newest per the v2 plan.
  const visible   = ((total > 10 && !expand) ? items.slice(-8) : items.slice()).reverse();

  // Per-type breakdown chips for the section header. Computed over the
  // filtered set so the chips reflect what's visible.
  const breakdown = Object.create(null);
  for (const it of items) breakdown[it.entityType] = (breakdown[it.entityType] || 0) + 1;
  const breakdownHTML = NODE_LINK_TYPE_META
    .filter(m => breakdown[m.type])
    .map(m => `<span class="bm-dp-bd-chip" title="${m.label}">${m.icon} ${breakdown[m.type]}</span>`)
    .join('');

  // Show the hide-archived/hide-done toggles whenever there's at least one
  // matching item OR the toggle is currently on (so the user always has a
  // way to turn filtering back off if they hid the last matching row).
  const showHideArchived = archivedN > 0 || hideArch;
  const showHideDone     = doneN     > 0 || hideDone;
  const hiddenHints = [];
  if (hideArch && archivedN > 0) hiddenHints.push(`${archivedN} archived hidden`);
  if (hideDone && doneN     > 0) hiddenHints.push(`${doneN} done hidden`);
  const hiddenHintHTML = hiddenHints.length
    ? ` <span class="bm-dp-archived-hint">(${hiddenHints.join(', ')})</span>`
    : '';

  const currentType = bmGetCurrentLinkType(id);

  panel.innerHTML = `
    <header class="bm-dp-head">
      <div class="bm-dp-node-label">${escapeHTML(node.label || '(empty)')}</div>
      <div class="bm-dp-node-meta">${totalAll === 0 ? 'No links yet' : `${total} linked${hiddenHintHTML}`}</div>
    </header>
    <section class="bm-dp-linked">
      ${totalAll > 0 ? `
        <div class="bm-dp-section-title">
          ${total} linked
          <span class="bm-dp-breakdown">${breakdownHTML}</span>
          <span class="bm-dp-section-spacer"></span>
          ${total > 10 ? `<span class="bm-dp-section-status">Showing ${expand ? total : 8} of ${total}</span>` : ''}
        </div>
        ${(showHideArchived || showHideDone) ? `
          <div class="bm-dp-filter-row">
            ${showHideArchived ? `
              <label class="bm-dp-archive-toggle">
                <input type="checkbox" data-filter="archived" ${hideArch ? 'checked' : ''}>
                <span>Hide archived${archivedN > 0 ? ` (${archivedN})` : ''}</span>
              </label>` : ''}
            ${showHideDone ? `
              <label class="bm-dp-archive-toggle">
                <input type="checkbox" data-filter="done" ${hideDone ? 'checked' : ''}>
                <span>Hide done${doneN > 0 ? ` (${doneN})` : ''}</span>
              </label>` : ''}
          </div>
        ` : ''}
        ${total > 0 ? `
          <ul class="bm-dp-list${expand ? ' bm-dp-list-expanded' : ''}">
            ${visible.map(it => bmLinkRowHTML(it)).join('')}
          </ul>
          ${total > 10 ? `<button class="bm-dp-show-toggle" type="button" data-action="${expand ? 'collapse' : 'expand'}">${expand ? 'Show fewer' : `Show all (${total})`}</button>` : ''}
        ` : `<div class="bm-dp-empty-hint">All ${totalAll} linked items are archived. Toggle "Hide archived" to see them.</div>`}
      ` : `<div class="bm-dp-empty-hint">Use the input below to create &amp; link an item.</div>`}
    </section>
    <section class="bm-dp-add">
      <div class="bm-dp-popover-host" id="bm-dp-popover-host"></div>
      ${bmAddRowHTML(id, currentType)}
    </section>
  `;

  bmWireDetailPanel(panel, id);
}

function bmLinkRowHTML(it) {
  const icon     = _nodeLinkTypeIcon[it.entityType] || '·';
  const orphan   = it.isOrphan;
  const archived = it.isArchived;
  const hasDone  = !orphan && bmEntityHasDoneState(it.entityType);
  const isDone   = hasDone && bmEntityIsDone(it.entityType, it.entity);
  const cls      = ['bm-dp-row'];
  if (orphan)   cls.push('bm-dp-row-orphan');
  if (archived) cls.push('bm-dp-row-archived');
  if (isDone)   cls.push('bm-dp-row-done');
  const title = orphan
    ? '(deleted)'
    : (bmEntityTitle(it.entityType, it.entity) || '(untitled)');
  const meta = orphan ? 'deleted' : (archived ? 'archived' : '');
  // Done checkbox slot: rendered for entity types that have a done concept
  // (todo/reminder/commitment/delegation). Notes and flows get a width-
  // matching spacer so the icon + title columns line up across the list.
  const checkSlot = hasDone
    ? `<input type="checkbox" class="bm-dp-row-check" ${isDone ? 'checked' : ''} data-action="toggle-done" aria-label="Mark done">`
    : `<span class="bm-dp-row-check-spacer" aria-hidden="true"></span>`;
  return `
    <li class="${cls.join(' ')}" data-link-type="${it.entityType}" data-link-id="${escapeHTML(it.entityId)}">
      ${checkSlot}
      <span class="bm-dp-row-icon">${icon}</span>
      <span class="bm-dp-row-title">${escapeHTML(title)}</span>
      ${meta ? `<span class="bm-dp-row-meta">${meta}</span>` : ''}
      <button class="bm-dp-row-unlink" type="button" data-action="unlink" title="Unlink" aria-label="Unlink">✕</button>
    </li>
  `;
}

function bmAddRowHTML(nodeId, type) {
  const icon  = _nodeLinkTypeIcon[type]  || '✓';
  const label = _nodeLinkTypeLabel[type] || 'Todo';
  const typeBtn = `
    <button class="bm-dp-type-btn" type="button" id="bm-dp-type-btn"
            data-current-type="${type}" title="Pick a different type" aria-label="Pick link type">
      <span class="bm-dp-type-ic">${icon}</span>
    </button>
  `;
  // Secondary action shown below each non-flow type's create form. Flow has
  // its own dedicated "Link existing" button up top because its create path
  // is also a button (not a text input), so the layout already accommodates
  // the choice.
  const linkExistingBtn = type === 'flow' ? '' : `
    <button class="bm-dp-link-existing" type="button" data-link-existing-type="${type}">
      Or link an existing ${label.toLowerCase()} →
    </button>
  `;

  // Title input: every non-flow type now wraps in the slash-ghost shell.
  // Slash sync is opt-in per type (driven by the install call in
  // bmWireDetailPanel), so the structural cost here is one extra wrapper
  // and a hidden chips host even for types that won't use them.
  const titleWrap = (placeholder) => `
    <div class="bm-dp-input-wrap">
      <div class="bm-dp-input-ghost" id="bm-dp-input-ghost" aria-hidden="true"></div>
      <input type="text" class="bm-dp-add-input" id="bm-dp-add-input"
             placeholder="${placeholder}" maxlength="200" autocomplete="off" spellcheck="false">
    </div>
  `;
  const chipsHost = `<div class="todo-slash-chips bm-dp-slash-chips" id="bm-dp-slash-chips" hidden></div>`;

  if (type === 'todo') {
    return `
      <div class="bm-dp-add-row">
        ${typeBtn}
        ${titleWrap('Add a todo… try /tomorrow /high /sp:name')}
      </div>
      ${chipsHost}
      <div class="bm-dp-rich-form">
        <div class="bm-dp-rich-field">
          <label>Priority</label>
          <select class="bm-dp-rich-input" id="bm-dp-todo-pri">
            <option value="high">🔴 High</option>
            <option value="medium" selected>🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>
        <div class="bm-dp-rich-field bm-dp-rich-field-grow">
          <label>Due (optional)</label>
          <input type="date" class="bm-dp-rich-input" id="bm-dp-todo-due">
        </div>
        <button class="bm-dp-add-submit bm-dp-add-submit-grow" type="button" id="bm-dp-add-submit">Add</button>
      </div>
      ${linkExistingBtn}
    `;
  }

  if (type === 'note') {
    return `
      <div class="bm-dp-add-row">
        ${typeBtn}
        ${titleWrap('Add a note… try /high')}
      </div>
      ${chipsHost}
      <div class="bm-dp-rich-form">
        <div class="bm-dp-rich-field bm-dp-rich-field-grow">
          <label>Priority</label>
          <select class="bm-dp-rich-input" id="bm-dp-note-pri">
            <option value="high">🔴 High</option>
            <option value="medium" selected>🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>
        <button class="bm-dp-add-submit" type="button" id="bm-dp-add-submit">Add</button>
      </div>
      ${linkExistingBtn}
    `;
  }

  if (type === 'reminder') {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm   = String(today.getMonth() + 1).padStart(2, '0');
    const dd   = String(today.getDate()).padStart(2, '0');
    return `
      <div class="bm-dp-add-row">
        ${typeBtn}
        ${titleWrap('Reminder title… try /tomorrow')}
      </div>
      ${chipsHost}
      <div class="bm-dp-rich-form">
        <div class="bm-dp-rich-field">
          <label>Date</label>
          <input type="date" class="bm-dp-rich-input" id="bm-dp-rem-date" value="${yyyy}-${mm}-${dd}">
        </div>
        <div class="bm-dp-rich-field">
          <label>Time</label>
          <input type="time" class="bm-dp-rich-input" id="bm-dp-rem-time" value="09:00">
        </div>
        <button class="bm-dp-add-submit" type="button" id="bm-dp-add-submit">Add</button>
      </div>
      ${linkExistingBtn}
    `;
  }

  if (type === 'commitment') {
    return `
      <div class="bm-dp-add-row">
        ${typeBtn}
        ${titleWrap("What's the commitment? Try /tomorrow")}
      </div>
      ${chipsHost}
      <div class="bm-dp-rich-form">
        <button class="bm-dp-direction" type="button" data-direction="i_owe" id="bm-dp-com-dir"
                title="Click to flip">I owe</button>
        <input type="text" class="bm-dp-rich-input bm-dp-rich-input-grow" id="bm-dp-com-cp"
               placeholder="Counterparty" maxlength="100" autocomplete="off">
      </div>
      <div class="bm-dp-rich-form">
        <div class="bm-dp-rich-field">
          <label>Due (optional)</label>
          <input type="date" class="bm-dp-rich-input" id="bm-dp-com-due">
        </div>
        <button class="bm-dp-add-submit bm-dp-add-submit-grow" type="button" id="bm-dp-add-submit">Add</button>
      </div>
      ${linkExistingBtn}
    `;
  }

  if (type === 'delegation') {
    return `
      <div class="bm-dp-add-row">
        ${typeBtn}
        ${titleWrap('Task… try /tomorrow')}
      </div>
      ${chipsHost}
      <div class="bm-dp-rich-form">
        <input type="text" class="bm-dp-rich-input bm-dp-rich-input-grow" id="bm-dp-del-to"
               placeholder="Delegated to" maxlength="100" autocomplete="off">
      </div>
      <div class="bm-dp-rich-form">
        <div class="bm-dp-rich-field">
          <label>Due (optional)</label>
          <input type="date" class="bm-dp-rich-input" id="bm-dp-del-due">
        </div>
        <button class="bm-dp-add-submit bm-dp-add-submit-grow" type="button" id="bm-dp-add-submit">Add</button>
      </div>
      ${linkExistingBtn}
    `;
  }

  if (type === 'flow') {
    return `
      <div class="bm-dp-add-row bm-dp-add-row-flow">
        ${typeBtn}
        <button class="bm-dp-flow-action" type="button" data-flow-action="create">+ Create new flow</button>
        <button class="bm-dp-flow-action bm-dp-flow-action-secondary" type="button" data-flow-action="link">Link existing</button>
      </div>
    `;
  }

  return '';
}

function bmWireDetailPanel(panel, nodeId) {
  // Type-picker open
  const typeBtn = panel.querySelector('#bm-dp-type-btn');
  if (typeBtn) {
    typeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      bmOpenTypePicker(nodeId);
    });
  }

  // Linked-items rows: tap navigates, ✕ unlinks, checkbox toggles done.
  panel.querySelectorAll('.bm-dp-row').forEach(row => {
    const unlinkBtn = row.querySelector('[data-action="unlink"]');
    if (unlinkBtn) {
      unlinkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const t   = row.dataset.linkType;
        const eid = row.dataset.linkId;
        if (removeNodeLink(nodeId, t, eid)) {
          saveData();
          drawBrainmap();
        }
      });
    }
    const doneCheck = row.querySelector('[data-action="toggle-done"]');
    if (doneCheck) {
      // Stop click bubbling so it doesn't trigger row-navigation. The change
      // event then handles the actual state flip.
      doneCheck.addEventListener('click', (e) => e.stopPropagation());
      doneCheck.addEventListener('change', (e) => {
        e.stopPropagation();
        const t   = row.dataset.linkType;
        const eid = row.dataset.linkId;
        const proj = getProject();
        const entity = _findEntityInProject(proj, t, eid);
        if (entity) {
          bmToggleEntityDone(t, entity);
          drawBrainmap();
        }
      });
    }
    row.addEventListener('click', (e) => {
      if (e.target.closest('[data-action="unlink"]')) return;
      if (e.target.closest('[data-action="toggle-done"]')) return;
      if (row.classList.contains('bm-dp-row-orphan')) return;
      bmNavigateToEntity(row.dataset.linkType, row.dataset.linkId);
    });
  });

  // Hide-archived / hide-done filter toggles (session-only global state).
  panel.querySelectorAll('.bm-dp-archive-toggle input[data-filter]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const which = cb.dataset.filter;
      if (which === 'archived')  state.bm.detailHideArchived = e.target.checked;
      else if (which === 'done') state.bm.detailHideDone     = e.target.checked;
      bmRenderDetailPanel();
    });
  });

  // Show-all / show-fewer toggle. When expanding, we ALSO scroll the
  // linked-items section into view so the user sees the list visibly grow
  // (otherwise the just-revealed items sit below the fold and the click
  // looks like it did nothing).
  const showToggle = panel.querySelector('.bm-dp-show-toggle');
  if (showToggle) {
    showToggle.addEventListener('click', () => {
      const expanding = showToggle.dataset.action === 'expand';
      state.bm.detailExpandedNodeId = expanding ? nodeId : null;
      bmRenderDetailPanel();
      if (expanding) {
        const linked = panel.querySelector('.bm-dp-linked');
        if (linked) linked.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    });
  }

  // Title input: Enter submits, Escape clears.
  const titleInput = panel.querySelector('#bm-dp-add-input');
  if (titleInput) {
    titleInput.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter')  { e.preventDefault(); bmSubmitAdd(nodeId); }
      else if (e.key === 'Escape') { e.preventDefault(); titleInput.value = ''; }
    });
    // Slash-command ghost completion + live chips + real-time field sync.
    // Same engine for every non-flow type — the fields object below decides
    // which form controls each type's slash command actually drives. Types
    // not listed in the map skip slash entirely (e.g. flow uses dedicated
    // buttons, no text input).
    const ghost     = panel.querySelector('#bm-dp-input-ghost');
    const chipsHost = panel.querySelector('#bm-dp-slash-chips');
    const currentType = bmGetCurrentLinkType(nodeId);
    const slashFieldsByType = {
      todo: () => ({
        priority: panel.querySelector('#bm-dp-todo-pri'),
        due:      panel.querySelector('#bm-dp-todo-due')
      }),
      note: () => ({
        priority: panel.querySelector('#bm-dp-note-pri')
      }),
      reminder:   () => ({ due: panel.querySelector('#bm-dp-rem-date') }),
      commitment: () => ({ due: panel.querySelector('#bm-dp-com-due') }),
      delegation: () => ({ due: panel.querySelector('#bm-dp-del-due') })
    };
    if (slashFieldsByType[currentType]) {
      installTodoSlashCompletion(titleInput, ghost, chipsHost, slashFieldsByType[currentType]());
    }
  }

  // Rich-form inputs: Enter also submits
  panel.querySelectorAll('.bm-dp-rich-input').forEach(inp => {
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); bmSubmitAdd(nodeId); }
    });
  });

  // Add submit button (rich types)
  const submitBtn = panel.querySelector('#bm-dp-add-submit');
  if (submitBtn) submitBtn.addEventListener('click', () => bmSubmitAdd(nodeId));

  // Commitment direction toggle
  const dirBtn = panel.querySelector('#bm-dp-com-dir');
  if (dirBtn) {
    dirBtn.addEventListener('click', () => {
      const next = dirBtn.dataset.direction === 'i_owe' ? 'they_owe' : 'i_owe';
      dirBtn.dataset.direction = next;
      dirBtn.textContent = next === 'i_owe' ? 'I owe' : 'They owe';
    });
  }

  // Flow actions
  panel.querySelectorAll('.bm-dp-flow-action').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (btn.dataset.flowAction === 'create') bmFlowCreateAndLink(nodeId);
      else if (btn.dataset.flowAction === 'link') bmFlowLinkExisting(nodeId);
    });
  });

  // "Or link an existing X →" — secondary action below each non-flow form.
  // Opens the same fuzzy picker pattern as flow's "Link existing" button.
  panel.querySelectorAll('.bm-dp-link-existing').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = btn.dataset.linkExistingType;
      if (t) bmLinkExistingForType(nodeId, t);
    });
  });
}

function bmOpenTypePicker(nodeId) {
  const host = document.getElementById('bm-dp-popover-host');
  if (!host) return;
  // Toggle: a second tap on the same type-btn closes it.
  if (host.firstChild && host.firstChild.classList.contains('bm-dp-type-popover')) {
    host.innerHTML = '';
    document.removeEventListener('click', bmTypePickerOutsideHandler, true);
    return;
  }
  const popover = document.createElement('div');
  popover.className = 'bm-dp-type-popover';
  popover.innerHTML = NODE_LINK_TYPE_META.map(m => `
    <button class="bm-dp-type-opt" type="button" data-type="${m.type}">
      <span class="bm-dp-type-opt-ic">${m.icon}</span>
      <span class="bm-dp-type-opt-lbl">${m.label}</span>
    </button>
  `).join('');
  popover.addEventListener('click', (e) => {
    e.stopPropagation();
    const opt = e.target.closest('.bm-dp-type-opt');
    if (!opt) return;
    bmSetCurrentLinkType(nodeId, opt.dataset.type);
    host.innerHTML = '';
    document.removeEventListener('click', bmTypePickerOutsideHandler, true);
    bmRenderDetailPanel();
    requestAnimationFrame(() => {
      const inp = document.getElementById('bm-dp-add-input');
      if (inp) inp.focus();
    });
  });
  host.appendChild(popover);
  // Capture-phase outside-click to close. setTimeout defers past the
  // current click event so we don't immediately self-close.
  setTimeout(() => document.addEventListener('click', bmTypePickerOutsideHandler, true), 0);
}

function bmTypePickerOutsideHandler(e) {
  const host = document.getElementById('bm-dp-popover-host');
  if (!host || !host.firstChild) {
    document.removeEventListener('click', bmTypePickerOutsideHandler, true);
    return;
  }
  if (e.target.closest('.bm-dp-type-popover')) return;
  if (e.target.closest('#bm-dp-type-btn'))     return;
  host.innerHTML = '';
  document.removeEventListener('click', bmTypePickerOutsideHandler, true);
}

function bmSubmitAdd(nodeId) {
  const type = bmGetCurrentLinkType(nodeId);
  if (type === 'flow') return;  // flow uses dedicated buttons, not this submit path

  const titleInput = document.getElementById('bm-dp-add-input');
  const rawTitle = titleInput ? titleInput.value.trim() : '';
  if (!rawTitle) {
    if (titleInput) titleInput.focus();
    showToast(`Please enter a ${_nodeLinkTypeLabel[type].toLowerCase()} title.`, 'error');
    return;
  }

  const proj = getProject();
  const node = proj.brainmap.nodes[nodeId];
  const subId = node ? (node.subprojectId || null) : null;
  let newId = null;
  // For non-slash-aware types, the title used downstream is rawTitle as-is.
  // The todo branch overrides this with the slash-parsed title.
  let title = rawTitle;

  if (type === 'todo') {
    // Match addTodo's behavior: slash commands override form fields. So a
    // user typing "Call Lukas /tom /high" gets dueDate=tomorrow, priority=high
    // even when the dropdowns say "Medium" / blank. Slash-parsed title falls
    // back to the raw input if no command stripped any text.
    const slash = parseTodoSlashCommands(rawTitle);
    title = slash.title || rawTitle;
    if (!title) {
      if (titleInput) titleInput.focus();
      showToast('Please enter a todo title.', 'error');
      return;
    }
    const priInp = document.getElementById('bm-dp-todo-pri');
    const dueInp = document.getElementById('bm-dp-todo-due');
    const priority   = slash.priority   || (priInp && priInp.value)   || 'medium';
    const startDate  = slash.startDate  || '';
    let   dueDate    = slash.dueDate    || (dueInp && dueInp.value)   || '';
    const subprojectId = slash.subprojectId || subId;
    const recurrence = slash.recurrence ? JSON.parse(JSON.stringify(slash.recurrence)) : null;
    if (recurrence && !dueDate) {
      const first = computeNextOccurrence(recurrence, new Date());
      if (first) dueDate = toDateString(first);
    }
    newId = generateId('todo');
    proj.todos = proj.todos || [];
    proj.todos.unshift({
      id: newId, title, done: false, priority,
      startDate, dueDate, subprojectId, tags: [],
      created: new Date().toISOString(), attachments: [], steps: [], recurrence
    });
  } else if (type === 'note') {
    const priInp = document.getElementById('bm-dp-note-pri');
    const priority = (priInp && priInp.value) || 'medium';
    newId = generateId('note');
    const now = new Date().toISOString();
    proj.notes = proj.notes || [];
    proj.notes.unshift({
      id: newId, title, content: '', priority, tags: [],
      subprojectId: subId, linkedTodos: [], created: now, updated: now
    });
  } else if (type === 'reminder') {
    const dateInp = document.getElementById('bm-dp-rem-date');
    const timeInp = document.getElementById('bm-dp-rem-time');
    const date = dateInp ? dateInp.value : '';
    const time = timeInp ? timeInp.value : '';
    if (!date || !time) {
      (date ? timeInp : dateInp)?.focus();
      showToast('Please set a date and time.', 'error');
      return;
    }
    const datetime = new Date(`${date}T${time}`);
    if (isNaN(datetime.getTime())) {
      showToast('Invalid date/time.', 'error');
      return;
    }
    if (datetime < new Date()) {
      showToast('Please pick a future time.', 'error');
      return;
    }
    newId = generateId('rem');
    proj.reminders = proj.reminders || [];
    proj.reminders.push({ id: newId, title, note: '', datetime: datetime.toISOString(), fired: false, tags: [] });
  } else if (type === 'commitment') {
    const cpInp  = document.getElementById('bm-dp-com-cp');
    const dueInp = document.getElementById('bm-dp-com-due');
    const dirBtn = document.getElementById('bm-dp-com-dir');
    const cp  = cpInp ? cpInp.value.trim() : '';
    const due = dueInp ? (dueInp.value || null) : null;
    const dir = dirBtn ? dirBtn.dataset.direction : 'i_owe';
    if (!cp) {
      if (cpInp) cpInp.focus();
      showToast('Please enter a counterparty.', 'error');
      return;
    }
    const created = addCommitment({ direction: dir, counterparty: cp, description: title, due_date: due });
    if (!created) { showToast('Could not create commitment.', 'error'); return; }
    newId = created.id;
  } else if (type === 'delegation') {
    const toInp  = document.getElementById('bm-dp-del-to');
    const dueInp = document.getElementById('bm-dp-del-due');
    const to  = toInp  ? toInp.value.trim() : '';
    const due = dueInp ? (dueInp.value || null) : null;
    if (!to) {
      if (toInp) toInp.focus();
      showToast("Please enter who it's delegated to.", 'error');
      return;
    }
    const created = addDelegation({ task: title, delegated_to: to, due_date: due });
    if (!created) { showToast('Could not create delegation.', 'error'); return; }
    newId = created.id;
  }

  if (!newId) return;
  if (!addNodeLink(nodeId, type, newId)) {
    showToast('Created but could not link.', 'error');
    return;
  }
  saveData();
  drawBrainmap();
  // Re-focus the title input (panel was re-rendered, so this is the fresh
  // element). Matches the v2 plan's "clear input + keep focus" requirement.
  requestAnimationFrame(() => {
    const fresh = document.getElementById('bm-dp-add-input');
    if (fresh) fresh.focus();
  });
  showToast(`${_nodeLinkTypeLabel[type]} created and linked.`, 'success');
}

function bmFlowCreateAndLink(nodeId) {
  // openFlowNameModal accepts an optional onCreate callback so the link
  // is formed atomically with creation — no pending-state dance.
  openFlowNameModal(null, (flow) => {
    addNodeLink(nodeId, 'flow', flow.id);
    bmSetCurrentLinkType(nodeId, 'flow');
    saveData();
    state.flowEditing = flow.id;
    showView('flows');
  });
}

// Backwards-compatible thin wrapper kept so the flow-action button keeps
// working unchanged. Both the flow path and every non-flow type now share
// the bmLinkExistingForType / bmOpenEntityPicker pair below.
function bmFlowLinkExisting(nodeId) {
  bmLinkExistingForType(nodeId, 'flow');
}

// Open a fuzzy-search picker for any entity type. Filters out items already
// linked from this node + archived items (the latter typically aren't what
// the user wants to surface; a "show archived" toggle could be added later
// if real use shows it's needed).
function bmLinkExistingForType(nodeId, entityType) {
  const proj = getProject();
  const collection = NODE_LINK_COLLECTION[entityType];
  if (!collection) return;
  const items = (proj[collection] || []).filter(item =>
    item && item.id
    && !nodeLinkExists(nodeId, entityType, item.id)
    && !item.archived
  );
  if (items.length === 0) {
    const label = _nodeLinkTypeLabel[entityType].toLowerCase();
    showToast(`No ${label}s available to link, or all are already linked.`, 'info');
    return;
  }
  bmOpenEntityPicker(nodeId, entityType, items);
}

function bmOpenEntityPicker(nodeId, entityType, items) {
  const host = document.getElementById('bm-dp-popover-host');
  if (!host) return;
  host.innerHTML = '';
  const typeLabel = _nodeLinkTypeLabel[entityType].toLowerCase();
  const pop = document.createElement('div');
  pop.className = 'bm-dp-flow-picker';
  pop.dataset.pickerType = entityType;
  pop.innerHTML = `
    <input type="search" class="bm-dp-flow-search" placeholder="Search ${typeLabel}s…" autocomplete="off">
    <div class="bm-dp-flow-list">
      ${items.map(item => {
        const title = bmEntityTitle(entityType, item) || '(untitled)';
        return `<button class="bm-dp-flow-row" type="button" data-entity-id="${escapeHTML(item.id)}">${escapeHTML(title)}</button>`;
      }).join('')}
    </div>
  `;
  host.appendChild(pop);
  const search = pop.querySelector('.bm-dp-flow-search');
  const list   = pop.querySelector('.bm-dp-flow-list');
  search.focus();
  search.addEventListener('input', () => {
    const q = search.value.toLowerCase().trim();
    list.querySelectorAll('.bm-dp-flow-row').forEach(row => {
      row.hidden = q && !row.textContent.toLowerCase().includes(q);
    });
  });
  search.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') {
      host.innerHTML = '';
      document.removeEventListener('click', bmFlowPickerOutsideHandler, true);
    }
  });
  pop.addEventListener('click', (e) => {
    e.stopPropagation();
    const row = e.target.closest('.bm-dp-flow-row');
    if (!row) return;
    const eid = row.dataset.entityId;
    if (addNodeLink(nodeId, entityType, eid)) {
      bmSetCurrentLinkType(nodeId, entityType);
      saveData();
      host.innerHTML = '';
      document.removeEventListener('click', bmFlowPickerOutsideHandler, true);
      drawBrainmap();
      showToast(`${_nodeLinkTypeLabel[entityType]} linked.`, 'success');
    }
  });
  setTimeout(() => document.addEventListener('click', bmFlowPickerOutsideHandler, true), 0);
}

function bmFlowPickerOutsideHandler(e) {
  const host = document.getElementById('bm-dp-popover-host');
  if (!host || !host.firstChild) {
    document.removeEventListener('click', bmFlowPickerOutsideHandler, true);
    return;
  }
  if (e.target.closest('.bm-dp-flow-picker'))    return;
  if (e.target.closest('.bm-dp-flow-action'))    return;
  if (e.target.closest('.bm-dp-link-existing'))  return;
  host.innerHTML = '';
  document.removeEventListener('click', bmFlowPickerOutsideHandler, true);
}

function bmNavigateToEntity(entityType, entityId) {
  // Save the brainmap before leaving (showView would teardown the brainmap
  // anyway — this just makes the order explicit). For note/flow the editor
  // opens to that entity directly. For commitment/delegation the existing
  // expandedCommitment/expandedDelegation state expands the matching card
  // in place. Todo and reminder only need a list-view scroll-and-highlight
  // since their renderers don't pinpoint anything.
  saveBrainmap();
  if      (entityType === 'todo')       { showView('todos');       bmHighlightTargetItem('todo', entityId); }
  else if (entityType === 'note')       { state.editingNote        = entityId; showView('notes'); }
  else if (entityType === 'reminder')   { showView('reminders');   bmHighlightTargetItem('reminder', entityId); }
  else if (entityType === 'commitment') { state.expandedCommitment = entityId; showView('commitments'); bmHighlightTargetItem('commitment', entityId); }
  else if (entityType === 'delegation') { state.expandedDelegation = entityId; showView('delegations'); bmHighlightTargetItem('delegation', entityId); }
  else if (entityType === 'flow')       { state.flowEditing        = entityId; showView('flows'); }
}

// Scrolls the target row/card into view and applies a brief pulse so the
// user can spot it in a long list. Selectors map to the data-* attributes
// each entity type's row/card already exposes (see todoItemHTML, etc.).
// Defers to requestAnimationFrame so the showView render has settled.
function bmHighlightTargetItem(entityType, entityId) {
  const selector = ({
    todo:       `.todo-card[data-todo-id="${cssEscape(entityId)}"]`,
    reminder:   `.reminder-item[data-reminder-id="${cssEscape(entityId)}"]`,
    commitment: `.com-card[data-com-id="${cssEscape(entityId)}"]`,
    delegation: `.del-card[data-del-id="${cssEscape(entityId)}"]`
  })[entityType];
  if (!selector) return;
  // Clear the scroll-preservation memory for the current view so the
  // MutationObserver in setupScrollPreservation doesn't restore the
  // previous scroll position right after our scrollIntoView fires.
  // (When navigating ACROSS views showView already clears this; the
  // problem is same-view re-renders, e.g. clicking a @todo mention from
  // inside the todos view.)
  try { delete __scrollMemory[`${state.project}::${state.view}`]; } catch {}
  requestAnimationFrame(() => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    el.classList.add('bm-target-highlight');
    setTimeout(() => el.classList.remove('bm-target-highlight'), 2000);
  });
}

// CSS.escape isn't always available in older WebViews; fall back to a
// minimal escape sufficient for our id format (prefix-timestamp-rand).
function cssEscape(s) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(s);
  return String(s).replace(/[^a-zA-Z0-9_\-]/g, m => '\\' + m);
}

// ============================================================================
// PHASE 3 — REVERSE-LINK CHIPS ON ENTITY VIEWS
// Each entity card/editor calls genericLinksChip(type, id) → returns a small
// pill listing the spark-map nodes linking to it (truncated to 2 + "+N more"
// popover). Tap a name → jump to spark map with that node selected.
//
// Performance: getLinkedNodes uses the Phase 1 reverse-index cache, so each
// call is an O(1) Set lookup. Rendering N chips on a list is N cache hits +
// 1 cache build (lazy, sub-ms on real data scale) — well under the 50ms
// target the v2 plan set for a 100-entity view.
// ============================================================================

// Number of node names rendered before collapsing to "+N more". Two keeps
// the chip compact even on busy cards; the popover handles the long tail.
var NODE_LINK_CHIP_INLINE_LIMIT = 2;

function genericLinksChip(entityType, entityId) {
  const nodes = getLinkedNodes(entityType, entityId);
  if (nodes.length === 0) return '';

  const visible  = nodes.slice(0, NODE_LINK_CHIP_INLINE_LIMIT);
  const overflow = nodes.length - visible.length;

  const namesHTML = visible.map((n, i) => {
    const isLast = (i === visible.length - 1) && overflow === 0;
    return `<button class="node-link-chip-name" type="button" data-node-id="${escapeHTML(n.id)}" title="Open in spark map">${escapeHTML(n.label || '(empty)')}</button>${isLast ? '' : '<span class="node-link-chip-sep">,</span>'}`;
  }).join('');

  const moreHTML = overflow > 0
    ? `<button class="node-link-chip-more" type="button" data-entity-type="${entityType}" data-entity-id="${escapeHTML(entityId)}">+${overflow} more</button>`
    : '';

  return `<span class="node-link-chip" title="Spark-map nodes linking to this ${entityType}"><span class="node-link-chip-icon" aria-hidden="true">↔</span><span class="node-link-chip-label">Linked to:</span>${namesHTML}${moreHTML}</span>`;
}

// Single document-level click delegate handles every chip across every view.
// Cheaper than wiring listeners on each chip, and survives view re-renders
// since the listener lives on document, not on disposable nodes.
function _nodeLinkChipClickHandler(e) {
  const nameBtn = e.target.closest('.node-link-chip-name');
  if (nameBtn) {
    e.stopPropagation();
    const nodeId = nameBtn.dataset.nodeId;
    if (!nodeId) return;
    _hideNodeLinksPopover();
    state.bm.selectedId = nodeId;
    showView('brainmap');
    return;
  }
  const popRow = e.target.closest('.node-link-chip-pop-row, .linked-node-row');
  if (popRow) {
    e.stopPropagation();
    const nodeId = popRow.dataset.nodeId;
    if (!nodeId) return;
    _hideNodeLinksPopover();
    state.bm.selectedId = nodeId;
    showView('brainmap');
    return;
  }
  const moreBtn = e.target.closest('.node-link-chip-more');
  if (moreBtn) {
    e.stopPropagation();
    _showNodeLinksPopover(moreBtn);
    return;
  }
}

function _showNodeLinksPopover(anchor) {
  _hideNodeLinksPopover();
  const entityType = anchor.dataset.entityType;
  const entityId   = anchor.dataset.entityId;
  const nodes = getLinkedNodes(entityType, entityId);
  if (nodes.length === 0) return;

  const pop = document.createElement('div');
  pop.className = 'node-link-chip-popover';
  pop.id = '_nodeLinkChipPopover';
  pop.innerHTML = nodes.map(n =>
    `<button class="node-link-chip-pop-row" type="button" data-node-id="${escapeHTML(n.id)}">${escapeHTML(n.label || '(empty)')}</button>`
  ).join('');
  document.body.appendChild(pop);

  // Position below the anchor; flip up if it would go off-screen.
  const rect = anchor.getBoundingClientRect();
  const popH = pop.offsetHeight;
  const wantTop = rect.bottom + 4;
  const top = (wantTop + popH > window.innerHeight) ? Math.max(8, rect.top - popH - 4) : wantTop;
  pop.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - pop.offsetWidth - 8))}px`;
  pop.style.top  = `${top}px`;

  setTimeout(() => document.addEventListener('click', _nodeLinkChipOutsideHandler, true), 0);
}

function _hideNodeLinksPopover() {
  const pop = document.getElementById('_nodeLinkChipPopover');
  if (pop) pop.remove();
  document.removeEventListener('click', _nodeLinkChipOutsideHandler, true);
}

function _nodeLinkChipOutsideHandler(e) {
  if (e.target.closest('#_nodeLinkChipPopover')) return;
  if (e.target.closest('.node-link-chip-more'))  return;
  _hideNodeLinksPopover();
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', _nodeLinkChipClickHandler);
}

