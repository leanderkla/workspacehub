'use strict';

// ===== src/06-flows.js =====
// Wave-2 extraction (M0): the Flows feature — guided decision-tree workflows.
// Includes the data model helpers (createFlow / findFlow / deleteFlow,
// flowAddNode, flowDeleteNode, flowUpdateNodeText, flowUpdateNodeName,
// flowAddOption, flowUpdateOption, flowDeleteOption, flowSetStart) and the
// view layer (renderFlows, renderFlowList, renderFlowEditor, renderFlowRunner)
// plus modal helpers (confirmDeleteFlow, openFlowNameModal,
// refreshFlowTargetLabels, flowNodeEditorHTML).
//
// No top-level const declarations in this section, so no var conversion is
// needed. All function declarations are global at script top-level and
// resolve identically from residual app.js's renderContent dispatcher.
//
// Master plan estimated 890 lines for this module; actual size is 500. The
// difference is orphaned commitment + reminder render code that ended up
// inside the FLOWS section after WIP commit 58c4a88; that code stays in
// residual app.js and will be rebanered if/when it gets touched again.
// ===== FLOWS =====
function createFlow(name) {
  const proj = getProject();
  if (!Array.isArray(proj.flows)) proj.flows = [];
  const startId = generateId('fnode');
  const flow = {
    id: generateId('flow'),
    name: (name || 'Untitled flow').trim() || 'Untitled flow',
    description: '',
    color: null,
    startNodeId: startId,
    nodes: { [startId]: { id: startId, name: '', text: '', options: [] } },
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  proj.flows.unshift(flow);
  saveData();
  return flow;
}
function findFlow(id) {
  const proj = getProject();
  return (proj.flows || []).find(f => f.id === id) || null;
}
function deleteFlow(id) {
  const proj = getProject();
  proj.flows = (proj.flows || []).filter(f => f.id !== id);
  cleanupNodeLinksOnEntityDelete(state.project, 'flow', id);
  saveData();
}
function flowAddNode(flowId, afterNodeId) {
  const flow = findFlow(flowId);
  if (!flow) return null;
  const id = generateId('fnode');
  flow.nodes[id] = { id, name: '', text: '', options: [] };
  flow.updated = new Date().toISOString();
  saveData();
  return id;
}
function flowDeleteNode(flowId, nodeId) {
  const flow = findFlow(flowId);
  if (!flow) return;
  if (flow.startNodeId === nodeId) {
    const remaining = Object.keys(flow.nodes).filter(k => k !== nodeId);
    if (remaining.length === 0) return;
    flow.startNodeId = remaining[0];
  }
  delete flow.nodes[nodeId];
  for (const n of Object.values(flow.nodes)) {
    n.options = (n.options || []).map(o => o.nextNodeId === nodeId ? { ...o, nextNodeId: null } : o);
  }
  flow.updated = new Date().toISOString();
  saveData();
}
function flowUpdateNodeText(flowId, nodeId, text) {
  const flow = findFlow(flowId);
  if (!flow || !flow.nodes[nodeId]) return;
  flow.nodes[nodeId].text = text;
  flow.updated = new Date().toISOString();
  saveData();
}
function flowUpdateNodeName(flowId, nodeId, name) {
  const flow = findFlow(flowId);
  if (!flow || !flow.nodes[nodeId]) return;
  flow.nodes[nodeId].name = name;
  flow.updated = new Date().toISOString();
  saveData();
}
function flowAddOption(flowId, nodeId) {
  const flow = findFlow(flowId);
  if (!flow || !flow.nodes[nodeId]) return;
  flow.nodes[nodeId].options.push({ id: generateId('fopt'), label: '', nextNodeId: null });
  flow.updated = new Date().toISOString();
  saveData();
}
function flowUpdateOption(flowId, nodeId, optId, patch) {
  const flow = findFlow(flowId);
  if (!flow || !flow.nodes[nodeId]) return;
  const opt = flow.nodes[nodeId].options.find(o => o.id === optId);
  if (!opt) return;
  Object.assign(opt, patch);
  flow.updated = new Date().toISOString();
  saveData();
}
function flowDeleteOption(flowId, nodeId, optId) {
  const flow = findFlow(flowId);
  if (!flow || !flow.nodes[nodeId]) return;
  flow.nodes[nodeId].options = flow.nodes[nodeId].options.filter(o => o.id !== optId);
  flow.updated = new Date().toISOString();
  saveData();
}
function flowSetStart(flowId, nodeId) {
  const flow = findFlow(flowId);
  if (!flow || !flow.nodes[nodeId]) return;
  flow.startNodeId = nodeId;
  flow.updated = new Date().toISOString();
  saveData();
}

function renderFlows() {
  if (state.flowRunning) { renderFlowRunner(); return; }
  if (state.flowEditing) { renderFlowEditor(); return; }
  renderFlowList();
}

function renderFlowList() {
  const proj = getProject();
  const flows = proj.flows || [];
  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-flows">
      <div class="view-header">
        <div class="view-header-row">
          <div class="view-title">Flows</div>
          <button class="btn btn-primary" id="btn-new-flow">+ New flow</button>
        </div>
        <div class="view-subtitle" style="font-size:12px;color:var(--text-muted);margin-top:2px">Branching scripts you can step through during conversations or any guided process.</div>
      </div>
      <div class="view-body-scrollable" style="padding:0 24px 24px">
        ${flows.length === 0 ? `
          <div class="empty-state" style="padding:60px 20px; text-align:center">
            <div style="font-size:36px; margin-bottom:8px">🔀</div>
            <div style="font-size:14px; color:var(--text-secondary); margin-bottom:12px">No flows yet. Build a step-by-step script with branching responses.</div>
            <button class="btn btn-primary" id="btn-new-flow-2">+ Create your first flow</button>
          </div>` : `
          <div class="flow-grid">
            ${flows.map(f => {
              const nodeCount = Object.keys(f.nodes || {}).length;
              const startNode = f.nodes[f.startNodeId];
              // Flow node text is HTML (contenteditable storage). Strip to
              // plain text first so the preview doesn't render raw markup,
              // then decorate so @-mentions still show the styled chip.
              const fullPlain = startNode ? noteContentText(startNode.text || '') : '';
              const preview = fullPlain.slice(0, 100);
              return `<div class="flow-card" data-flow-id="${f.id}">
                <div class="flow-card-head">
                  <span class="flow-card-icon">🔀</span>
                  <span class="flow-card-name">${decoratePlainTextMentions(f.name)}</span>
                </div>
                ${f.description ? `<div class="flow-card-desc">${decoratePlainTextMentions(f.description)}</div>` : ''}
                ${preview ? `<div class="flow-card-preview">${decoratePlainTextMentions(preview)}${fullPlain.length > 100 ? '…' : ''}</div>` : '<div class="flow-card-preview" style="font-style:italic;color:var(--text-muted)">Empty start</div>'}
                <div class="flow-card-meta">
                  <span>${nodeCount} step${nodeCount === 1 ? '' : 's'}</span>
                  <span class="flow-card-actions">
                    ${pinToggleButtonHTML('flow', state.project, f.id, 'btn btn-ghost btn-sm')}
                    <button class="btn btn-ghost btn-sm" data-flow-action="run" data-flow-id="${f.id}" title="Step through this flow">▶ Run</button>
                    <button class="btn btn-ghost btn-sm" data-flow-action="edit" data-flow-id="${f.id}" title="Edit nodes & branches">✎ Edit</button>
                    <button class="btn btn-ghost btn-sm" data-flow-action="delete" data-flow-id="${f.id}" title="Delete flow">✕</button>
                  </span>
                </div>
              </div>`;
            }).join('')}
          </div>`}
      </div>
    </div>`;

  document.getElementById('btn-new-flow')?.addEventListener('click', openFlowNameModal);
  document.getElementById('btn-new-flow-2')?.addEventListener('click', openFlowNameModal);

  document.querySelectorAll('[data-flow-action]').forEach(btn =>
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.flowAction;
      const id = btn.dataset.flowId;
      if (action === 'run') { state.flowRunning = id; state.flowRunCurrent = null; state.flowRunHistory = []; renderFlows(); }
      else if (action === 'edit') { state.flowEditing = id; renderFlows(); }
      else if (action === 'delete') confirmDeleteFlow(id);
    }));
  document.querySelectorAll('.flow-card').forEach(el =>
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-flow-action]')) return;
      state.flowEditing = el.dataset.flowId;
      renderFlows();
    }));
}

function confirmDeleteFlow(id) {
  const f = findFlow(id);
  if (!f) return;
  const overlay = document.getElementById('modal-overlay');
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  overlay.innerHTML = `
    <div class="modal new-project-modal">
      <h3>Delete "${escapeHTML(f.name)}"?</h3>
      <p style="font-size:13px;color:var(--text-secondary);margin:8px 0 14px">
        This flow has ${Object.keys(f.nodes || {}).length} step${Object.keys(f.nodes || {}).length === 1 ? '' : 's'}. This cannot be undone.
      </p>
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="flow-del-cancel">Cancel</button>
        <button class="btn" id="flow-del-ok" style="background:#dc2626;color:white;border-color:#dc2626">Delete</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  document.getElementById('flow-del-cancel').onclick = close;
  document.getElementById('flow-del-ok').onclick = () => {
    deleteFlow(id);
    close();
    renderFlows();
    showToast(`Flow "${f.name}" deleted.`, 'info');
  };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

// `onCreate` (optional) is invoked after a NEW flow is created and persisted.
// When provided, it FULLY OWNS post-creation behavior — the modal closes and
// the callback is responsible for whatever navigation/linking should happen.
// This is how Phase 2's spark-map detail panel forms an atomic node→flow link
// at creation time (no pending-state dance). For the Rename branch onCreate
// is ignored.
function openFlowNameModal(prefillId, onCreate) {
  const overlay = document.getElementById('modal-overlay');
  const existing = prefillId ? findFlow(prefillId) : null;
  overlay.innerHTML = `
    <div class="modal new-project-modal">
      <h3>${existing ? 'Rename flow' : 'New flow'}</h3>
      <label class="settings-label">Name</label>
      <input type="text" class="modal-input" id="flow-name-input" placeholder="e.g. Discovery script · Onboarding · Triage" maxlength="80" value="${existing ? escapeHTML(existing.name) : ''}">
      <label class="settings-label" style="margin-top:10px">Description (optional)</label>
      <input type="text" class="modal-input" id="flow-desc-input" placeholder="Short summary" maxlength="200" value="${existing ? escapeHTML(existing.description || '') : ''}">
      <div class="modal-buttons">
        <button class="btn btn-secondary" id="flow-name-cancel">Cancel</button>
        <button class="btn btn-primary" id="flow-name-ok">${existing ? 'Save' : 'Create'}</button>
      </div>
    </div>`;
  overlay.classList.remove('hidden');
  const inp = document.getElementById('flow-name-input');
  inp.focus(); inp.select();
  const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; overlay.onclick = null; };
  const submit = () => {
    const name = inp.value.trim();
    if (!name) { inp.focus(); return; }
    const desc = document.getElementById('flow-desc-input').value.trim();
    if (existing) {
      existing.name = name;
      existing.description = desc;
      existing.updated = new Date().toISOString();
      saveData();
      close();
      renderFlows();
    } else {
      const f = createFlow(name);
      f.description = desc;
      saveData();
      close();
      if (typeof onCreate === 'function') {
        onCreate(f);
      } else {
        state.flowEditing = f.id;
        renderFlows();
      }
    }
  };
  document.getElementById('flow-name-cancel').onclick = close;
  document.getElementById('flow-name-ok').onclick = submit;
  inp.onkeydown = (e) => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') close(); };
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
}

function renderFlowEditor() {
  const flow = findFlow(state.flowEditing);
  if (!flow) { state.flowEditing = null; renderFlows(); return; }
  const nodes = Object.values(flow.nodes);
  const nodeOptions = nodes.map((n, idx) => {
    const trimmedName = (n.name || '').trim();
    const previewText = (n.text || '').trim().split('\n')[0].slice(0, 50);
    const baseLabel = trimmedName || `Step ${idx + 1}`;
    const fullLabel = trimmedName
      ? (previewText ? `${trimmedName} · ${previewText}` : trimmedName)
      : (previewText ? `Step ${idx + 1} · ${previewText}` : `Step ${idx + 1}`);
    return {
      id: n.id,
      label: fullLabel,
      shortLabel: baseLabel,
      isStart: n.id === flow.startNodeId
    };
  });

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-flow-editor">
      <div class="view-header">
        <div class="view-header-row">
          <div style="display:flex;align-items:center;gap:10px">
            <button class="btn btn-ghost btn-sm" id="flow-back">← Flows</button>
            <span class="view-title">${escapeHTML(flow.name)}</span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" id="flow-rename">✎ Rename</button>
            <button class="btn btn-primary" id="flow-run-now">▶ Run</button>
          </div>
        </div>
        ${flow.description ? `<div class="view-subtitle" style="font-size:12px;color:var(--text-muted);margin-top:2px">${escapeHTML(flow.description)}</div>` : ''}
        ${(() => {
          const linksChip = genericLinksChip('flow', flow.id);
          return linksChip ? `<div class="flow-editor-meta" style="margin-top:6px">${linksChip}</div>` : '';
        })()}
      </div>
      <div class="view-body-scrollable" style="padding:0 24px 32px">
        <div class="flow-editor">
          ${nodes.map((n, i) => flowNodeEditorHTML(flow, n, i, nodeOptions)).join('')}
          <button class="btn btn-secondary flow-add-node" id="flow-add-node-btn">+ Add step</button>
        </div>
        ${backlinksPanelHTML('flow', state.project, flow.id)}
      </div>
    </div>`;

  document.getElementById('flow-back').onclick = () => { state.flowEditing = null; renderFlows(); };
  document.getElementById('flow-rename').onclick = () => openFlowNameModal(flow.id);
  document.getElementById('flow-run-now').onclick = () => {
    state.flowRunning = flow.id; state.flowEditing = null;
    state.flowRunCurrent = flow.startNodeId; state.flowRunHistory = [];
    renderFlows();
  };
  document.getElementById('flow-add-node-btn').onclick = () => {
    flowAddNode(flow.id);
    renderFlows();
  };

  document.querySelectorAll('[data-flow-node-text]').forEach(el => {
    installRichEditorPaste(el);
    el.addEventListener('input', () => {
      flowUpdateNodeText(flow.id, el.dataset.flowNodeText, el.innerHTML || '');
      refreshFlowTargetLabels(flow.id);
    });
  });
  document.querySelectorAll('[data-flow-node-name]').forEach(inp => {
    inp.addEventListener('input', () => {
      flowUpdateNodeName(flow.id, inp.dataset.flowNodeName, inp.value);
      refreshFlowTargetLabels(flow.id);
    });
  });
  document.querySelectorAll('[data-flow-set-start]').forEach(btn =>
    btn.addEventListener('click', () => { flowSetStart(flow.id, btn.dataset.flowSetStart); renderFlows(); }));
  document.querySelectorAll('[data-flow-delete-node]').forEach(btn =>
    btn.addEventListener('click', () => {
      flowDeleteNode(flow.id, btn.dataset.flowDeleteNode);
      renderFlows();
    }));
  document.querySelectorAll('[data-flow-add-option]').forEach(btn =>
    btn.addEventListener('click', () => {
      flowAddOption(flow.id, btn.dataset.flowAddOption);
      renderFlows();
    }));
  document.querySelectorAll('[data-flow-opt-label]').forEach(inp => {
    inp.addEventListener('input', () => {
      flowUpdateOption(flow.id, inp.dataset.flowNode, inp.dataset.flowOptLabel, { label: inp.value });
    });
  });
  document.querySelectorAll('[data-flow-opt-target]').forEach(sel => {
    sel.addEventListener('change', () => {
      flowUpdateOption(flow.id, sel.dataset.flowNode, sel.dataset.flowOptTarget, {
        nextNodeId: sel.value || null
      });
    });
  });
  document.querySelectorAll('[data-flow-delete-opt]').forEach(btn =>
    btn.addEventListener('click', () => {
      flowDeleteOption(flow.id, btn.dataset.flowNode, btn.dataset.flowDeleteOpt);
      renderFlows();
    }));
}

function refreshFlowTargetLabels(flowId) {
  const flow = findFlow(flowId);
  if (!flow) return;
  const nodes = Object.values(flow.nodes);
  const idIndex = new Map(nodes.map((n, i) => [n.id, i]));
  document.querySelectorAll('[data-flow-opt-target]').forEach(sel => {
    const sourceNodeId = sel.dataset.flowNode;
    const currentValue = sel.value;
    const opts = ['<option value="">— End —</option>'];
    nodes.forEach((n, i) => {
      if (n.id === sourceNodeId) return;
      const trimmedName = (n.name || '').trim();
      const previewText = noteContentText(n.text || '').split('\n')[0].slice(0, 50);
      const label = trimmedName
        ? (previewText ? `${trimmedName} · ${previewText}` : trimmedName)
        : (previewText ? `Step ${i + 1} · ${previewText}` : `Step ${i + 1}`);
      const isStart = n.id === flow.startNodeId;
      const safeLabel = (isStart ? '★ ' : '') + label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const sel2 = currentValue === n.id ? ' selected' : '';
      opts.push(`<option value="${n.id}"${sel2}>${safeLabel}</option>`);
    });
    sel.innerHTML = opts.join('');
  });
}

function flowNodeEditorHTML(flow, node, index, nodeOptions) {
  const isStart = node.id === flow.startNodeId;
  const stepNumber = index + 1;
  return `<div class="flow-node ${isStart ? 'is-start' : ''}" data-node-id="${node.id}">
    <div class="flow-node-head">
      <span class="flow-node-badge">${isStart ? 'START' : `#${stepNumber}`}</span>
      <input type="text" class="flow-node-name" data-flow-node-name="${node.id}"
        placeholder="Step name (optional, e.g. ‘Objection: too expensive’)" value="${escapeHTML(node.name || '')}" maxlength="80">
      ${!isStart ? `<button class="btn btn-ghost btn-sm" data-flow-set-start="${node.id}" title="Make this the starting step">⤴ Set start</button>` : ''}
      <button class="btn btn-ghost btn-sm" data-flow-delete-node="${node.id}" title="Delete this step">✕</button>
    </div>
    <div class="flow-node-text" data-flow-node-text="${node.id}" contenteditable="true" data-placeholder="What you'll say at this step… (Ctrl+B / Ctrl+I for formatting)">${noteContentInitialHTML(node.text || '')}</div>
    <div class="flow-options">
      ${(node.options || []).map(opt => `
        <div class="flow-option" data-opt-id="${opt.id}">
          <span class="flow-option-arrow">→</span>
          <input type="text" class="flow-option-label" data-flow-opt-label="${opt.id}" data-flow-node="${node.id}"
            placeholder="If they respond…" value="${escapeHTML(opt.label || '')}">
          <span class="flow-option-then">then go to</span>
          <select class="flow-option-target" data-flow-opt-target="${opt.id}" data-flow-node="${node.id}">
            <option value="">— End —</option>
            ${nodeOptions.filter(no => no.id !== node.id).map(no => `<option value="${no.id}" ${opt.nextNodeId===no.id?'selected':''}>${no.isStart?'★ ':''}${escapeHTML(no.label)}</option>`).join('')}
          </select>
          <button class="btn btn-ghost btn-sm" data-flow-delete-opt="${opt.id}" data-flow-node="${node.id}" title="Remove branch">✕</button>
        </div>`).join('')}
      <button class="btn btn-ghost btn-sm flow-option-add" data-flow-add-option="${node.id}">+ Add branch</button>
    </div>
  </div>`;
}

function renderFlowRunner() {
  const flow = findFlow(state.flowRunning);
  if (!flow) { state.flowRunning = null; renderFlows(); return; }
  if (!state.flowRunCurrent || !flow.nodes[state.flowRunCurrent]) {
    state.flowRunCurrent = flow.startNodeId;
    state.flowRunHistory = [];
  }
  const node = flow.nodes[state.flowRunCurrent];
  if (!node) { state.flowRunning = null; renderFlows(); return; }
  const opts = node.options || [];

  document.getElementById('content').innerHTML = `
    <div class="view active" id="view-flow-runner">
      <div class="view-header">
        <div class="view-header-row">
          <div style="display:flex;align-items:center;gap:10px">
            <button class="btn btn-ghost btn-sm" id="flow-runner-exit">✕ Close</button>
            <span class="view-title">${escapeHTML(flow.name)}</span>
            <span class="flow-runner-step">step ${state.flowRunHistory.length + 1}</span>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" id="flow-runner-back" ${state.flowRunHistory.length === 0 ? 'disabled' : ''}>← Back</button>
            <button class="btn btn-ghost btn-sm" id="flow-runner-restart">⟲ Restart</button>
            <button class="btn btn-ghost btn-sm" id="flow-runner-edit">✎ Edit</button>
          </div>
        </div>
      </div>
      <div class="view-body-scrollable" style="padding:0 24px 32px">
        <div class="flow-runner">
          <div class="flow-runner-text">${noteContentText(node.text || '') ? noteContentInitialHTML(node.text || '') : '<em style="color:var(--text-muted)">No text for this step</em>'}</div>
          ${opts.length > 0 ? `
            <div class="flow-runner-prompt">Pick the response that matches what they said:</div>
            <div class="flow-runner-options">
              ${opts.map(o => `<button class="flow-runner-option" data-flow-runner-go="${o.nextNodeId || ''}">
                <span class="flow-runner-option-label">${escapeHTML(o.label || '(unlabeled branch)')}</span>
                <span class="flow-runner-option-arrow">${o.nextNodeId ? '→' : '⌧'}</span>
              </button>`).join('')}
            </div>` : `
            <div class="flow-runner-end">
              <div style="font-size:18px; font-weight:600; margin-bottom:6px">End of this branch</div>
              <div style="font-size:13px; color:var(--text-secondary)">No next steps defined here. Use Back to return or Restart to start over.</div>
            </div>`}
          ${state.flowRunHistory.length > 0 ? `
            <details class="flow-runner-history">
              <summary>Path so far (${state.flowRunHistory.length} step${state.flowRunHistory.length===1?'':'s'})</summary>
              <ol class="flow-runner-history-list">
                ${state.flowRunHistory.map(h => {
                  const n = flow.nodes[h.nodeId];
                  const optLabel = h.optLabel || '(no choice)';
                  return `<li><div class="frh-text">${escapeHTML((n?.text || '').trim().slice(0, 120) || '(empty)')}</div><div class="frh-choice">→ ${escapeHTML(optLabel)}</div></li>`;
                }).join('')}
              </ol>
            </details>` : ''}
        </div>
      </div>
    </div>`;

  document.getElementById('flow-runner-exit').onclick = () => { state.flowRunning = null; state.flowRunCurrent = null; state.flowRunHistory = []; renderFlows(); };
  document.getElementById('flow-runner-back').onclick = () => {
    if (state.flowRunHistory.length === 0) return;
    const prev = state.flowRunHistory.pop();
    state.flowRunCurrent = prev.nodeId;
    renderFlows();
  };
  document.getElementById('flow-runner-restart').onclick = () => {
    state.flowRunCurrent = flow.startNodeId; state.flowRunHistory = [];
    renderFlows();
  };
  document.getElementById('flow-runner-edit').onclick = () => {
    state.flowEditing = flow.id; state.flowRunning = null; renderFlows();
  };
  document.querySelectorAll('[data-flow-runner-go]').forEach(btn =>
    btn.addEventListener('click', () => {
      const next = btn.dataset.flowRunnerGo;
      const optLabel = btn.querySelector('.flow-runner-option-label')?.textContent || '';
      state.flowRunHistory.push({ nodeId: state.flowRunCurrent, optLabel });
      if (next) state.flowRunCurrent = next;
      else state.flowRunCurrent = null;
      if (!state.flowRunCurrent) {
        showToast('End of this branch.', 'info');
        state.flowRunCurrent = state.flowRunHistory[state.flowRunHistory.length - 1]?.nodeId || flow.startNodeId;
      }
      renderFlows();
    }));
}

