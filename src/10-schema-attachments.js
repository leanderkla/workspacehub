'use strict';

// ===== src/10-schema-attachments.js =====
// Wave-3 extraction (M0): schema versioning + migrations, plus the
// attachment-handling toolkit that lives adjacent in the source. The
// schema migrations bring data from version N-1 to N, run in order on
// every load via runSchemaMigrations() called from init(). Attachments
// cover file uploads (drag/drop, picker), thumbnails, project icons,
// audio metadata, and the per-entity attachment panel.
//
// var conversion (4 top-level declarations):
// - CURRENT_SCHEMA_VERSION, SCHEMA_MIGRATIONS — referenced inside this
//   file by runSchemaMigrations and by the schema test in pure.test.js.
// - IMAGE_EXTS, attachmentThumbCache — used inside this file only today,
//   converted on the cross-file rule for uniformity.
//
// Critical cross-module call sites:
// - runSchemaMigrations is called from init() in residual app.js.
//   Function declaration → global → resolves identically.
// - The attachment helpers (uploadFileToAttachment, pickAndAddAttachments,
//   etc.) are called from todo / note / dump editors throughout residual.
//   All function declarations stay global.
//
// applyListPanelWidth is included in this module despite being a layout
// helper rather than a schema/attachment concern, because it lives at the
// tail of the SCHEMA section in the source. Trivially small (5 lines).
// ===== SCHEMA VERSIONING + MIGRATIONS =====
// Each migration brings data from version N-1 → N. Numbered, runs in order.
// Add new migrations as new keys; never edit shipped ones.
var CURRENT_SCHEMA_VERSION = 4;
var SCHEMA_MIGRATIONS = {
  // v1: consolidates everything migrateAttachments() used to do ad-hoc.
  // For fresh installs schemaVersion starts at 0 and runs through all.
  1: (data) => {
    if (!Array.isArray(data.pinned)) data.pinned = [];
    for (const proj of Object.values(data.projects || {})) {
      if (!Array.isArray(proj.attachments)) proj.attachments = [];
      if (!('iconRelPath' in proj)) proj.iconRelPath = null;
      if (!Array.isArray(proj.dumps)) proj.dumps = [];
      proj.dumps.forEach(d => { if (!('subprojectId' in d)) d.subprojectId = null; });
      if (!Array.isArray(proj.commitments)) proj.commitments = [];
      if (!Array.isArray(proj.delegations)) proj.delegations = [];
      (proj.notes || []).forEach(n => { if (!Array.isArray(n.attachments)) n.attachments = []; });
      (proj.todos || []).forEach(t => {
        if (!Array.isArray(t.attachments)) t.attachments = [];
        if (!Array.isArray(t.steps)) t.steps = [];
        if (t.recurrence === undefined) t.recurrence = null;
      });
      (proj.subprojects || []).forEach(s => {
        if (!Array.isArray(s.attachments)) s.attachments = [];
        if (!Array.isArray(s.tags)) s.tags = [];
      });
      if (!Array.isArray(proj.flows)) proj.flows = [];
      proj.flows.forEach(f => {
        Object.values(f.nodes || {}).forEach(n => {
          if (typeof n.name !== 'string') n.name = '';
        });
      });
    }
    return data;
  },
  // v2: every brainmap node gains a linkedItems array — generic node→entity
  // linking infrastructure. Idempotent: backfilling an already-present
  // array is a no-op (the Array.isArray guard skips it).
  2: (data) => {
    for (const proj of Object.values(data.projects || {})) {
      const nodes = proj.brainmap && proj.brainmap.nodes;
      if (!nodes) continue;
      for (const node of Object.values(nodes)) {
        if (!Array.isArray(node.linkedItems)) node.linkedItems = [];
      }
    }
    return data;
  },
  // v3: tags lift from notes-only to a workspace-wide layer. Backfills an
  // empty `tags` array on every entity type that didn't have one. Notes
  // already have tags from earlier; the Array.isArray guard makes the
  // backfill a no-op for them, and idempotent on re-runs.
  3: (data) => {
    for (const proj of Object.values(data.projects || {})) {
      (proj.todos       || []).forEach(t => { if (!Array.isArray(t.tags)) t.tags = []; });
      (proj.notes       || []).forEach(n => { if (!Array.isArray(n.tags)) n.tags = []; });
      (proj.commitments || []).forEach(c => { if (!Array.isArray(c.tags)) c.tags = []; });
      (proj.delegations || []).forEach(d => { if (!Array.isArray(d.tags)) d.tags = []; });
      (proj.dumps       || []).forEach(d => { if (!Array.isArray(d.tags)) d.tags = []; });
      (proj.reminders   || []).forEach(r => { if (!Array.isArray(r.tags)) r.tags = []; });
    }
    return data;
  },
  // v4: generalize the legacy Rückbucher follow-up workflow into the public
  // Custom Escalation Chains feature. CONDITIONAL synthesis: the German
  // legacy chain is only inserted when this workspace actually has
  // kind:'rueckbucher' todos. Fresh installs and users who never used
  // Rückbucher get nothing here (their generic example chain comes from
  // getDefaultData in main.js). Strings preserved verbatim from the
  // pre-v0.1 private German workflow so existing user todos stay
  // display-consistent with the synthesized chain template. Public feature
  // code (Settings UI, spawn UX, runtime rendering) contains no such
  // strings — THIS BLOCK IS THE ONLY PLACE "Rückbucher" appears in
  // post-cleanup source. Idempotent: hasLegacyTodos check + chain dedup
  // + todo kind predicate make repeat runs no-ops.
  4: (data) => {
    if (!Array.isArray(data.escalationChains)) data.escalationChains = [];

    // Detect the user came from the legacy workflow. Single pass; bail on
    // first hit. Fresh installs and users who never used Rückbucher: false.
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
};

function runSchemaMigrations(data) {
  if (!data) return data;
  const from = data.schemaVersion || 0;
  for (let v = from + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const m = SCHEMA_MIGRATIONS[v];
    if (m) {
      try {
        data = m(data) || data;
        data.schemaVersion = v;
        if (typeof console !== 'undefined') console.info(`[schema] migrated to v${v}`);
      } catch (e) {
        console.error(`[schema] migration v${v} failed:`, e);
        break;
      }
    }
  }
  return data;
}

// Backwards-compatible wrapper. Init still calls migrateAttachments();
// keep the name so existing call sites don't break.
//
// Post-migration persist: if runSchemaMigrations bumped the schema
// version (i.e. some migration actually ran on this load), we IMMEDIATELY
// write the migrated data to disk via the IPC saveData. Otherwise the
// in-memory data sits at the new version while the on-disk file lags at
// the old version until the user happens to make a saveData-triggering
// edit, which causes main's pre-migration backup gate to refire on every
// subsequent loadData (e.g. periodic checkReminders ticks). Bypasses the
// renderer's saveData() wrapper because that wrapper participates in the
// undo stack — this is a one-shot internal write, not a user-visible
// mutation. Fire-and-forget; if the IPC fails for some reason, the next
// real saveData will catch up.
function migrateAttachments() {
  if (!state.data) return;
  const before = (typeof state.data.schemaVersion === 'number') ? state.data.schemaVersion : 0;
  state.data = runSchemaMigrations(state.data);
  const after = (typeof state.data.schemaVersion === 'number') ? state.data.schemaVersion : 0;
  if (after > before && typeof window !== 'undefined' && window.api && typeof window.api.saveData === 'function') {
    try { window.api.saveData(state.data); } catch (e) { console.error('post-migration persist failed:', e); }
  }
}

function formatFileSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024*1024)).toFixed(1)} MB`;
  return `${(bytes / (1024*1024*1024)).toFixed(1)} GB`;
}

var IMAGE_EXTS = ['png','jpg','jpeg','gif','webp','svg','bmp','ico'];
var attachmentThumbCache = new Map();

function isImageFile(name) {
  const ext = (name || '').toLowerCase().split('.').pop();
  return IMAGE_EXTS.includes(ext);
}

function fileIconFor(name) {
  const ext = (name || '').toLowerCase().split('.').pop();
  if (IMAGE_EXTS.includes(ext)) return '🖼';
  if (ext === 'pdf') return '📕';
  if (['doc','docx','odt','rtf'].includes(ext)) return '📄';
  if (['xls','xlsx','csv','ods'].includes(ext)) return '📊';
  if (['ppt','pptx','odp'].includes(ext)) return '📽';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return '🗜';
  if (['mp3','wav','flac','ogg','m4a'].includes(ext)) return '🎵';
  if (['mp4','mkv','mov','avi','webm'].includes(ext)) return '🎞';
  if (['js','ts','jsx','tsx','py','go','rs','java','c','cpp','html','css','json','xml','md'].includes(ext)) return '📝';
  return '📎';
}

async function loadAttachmentThumbnails(container) {
  if (!container || !window.api || typeof window.api.readAttachmentDataUrl !== 'function') return;
  const pending = container.querySelectorAll('.att-thumb[data-thumb-src]');
  for (const el of pending) {
    const relPath = el.dataset.thumbSrc;
    el.removeAttribute('data-thumb-src');
    if (!relPath) continue;
    if (attachmentThumbCache.has(relPath)) {
      const cached = attachmentThumbCache.get(relPath);
      if (cached) el.innerHTML = `<img class="att-thumb-img" src="${cached}" alt="">`;
      continue;
    }
    try {
      const url = await window.api.readAttachmentDataUrl(relPath);
      attachmentThumbCache.set(relPath, url || null);
      if (url) el.innerHTML = `<img class="att-thumb-img" src="${url}" alt="">`;
    } catch (e) {
      console.error('readAttachmentDataUrl:', e);
      attachmentThumbCache.set(relPath, null);
    }
  }
}

function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function uploadFileToAttachment(file) {
  if (!window.api || typeof window.api.saveAttachment !== 'function') {
    showToast('Attachments API not available — please fully restart the app.', 'error');
    return null;
  }
  try {
    const buf = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buf);
    const res = await window.api.saveAttachment(state.project, base64, file.name);
    if (res && res.ok) return res.attachment;
    console.error('saveAttachment failed:', res && res.error);
    showToast(`Failed to save ${file.name}: ${res?.error || 'unknown error'}`, 'error');
  } catch (e) {
    console.error('uploadFileToAttachment:', e);
    showToast(`Failed to upload ${file.name}: ${e.message}`, 'error');
  }
  return null;
}

async function uploadProjectIcon(projectKey, file) {
  if (!window.api || typeof window.api.saveAttachment !== 'function') {
    showToast('Attachments API not available — please fully restart the app.', 'error');
    return false;
  }
  if (!file || !file.type || !file.type.startsWith('image/')) {
    showToast('Please pick an image file.', 'error');
    return false;
  }
  const proj = state.data.projects[projectKey];
  if (!proj) return false;
  try {
    const buf = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buf);
    const res = await window.api.saveAttachment(projectKey, base64, `project-icon-${Date.now()}.${file.name.split('.').pop() || 'png'}`);
    if (!res || !res.ok || !res.attachment) {
      showToast(`Icon upload failed: ${res?.error || 'unknown'}`, 'error');
      return false;
    }
    const oldRel = proj.iconRelPath;
    proj.iconRelPath = res.attachment.relPath;
    saveData();
    if (oldRel) {
      attachmentThumbCache.delete(oldRel);
      try { window.api.deleteAttachment(oldRel); } catch {}
    }
    showToast(`Icon set for "${proj.name}".`, 'success');
    return true;
  } catch (e) {
    console.error('uploadProjectIcon:', e);
    showToast(`Icon upload error: ${e.message}`, 'error');
    return false;
  }
}

function removeProjectIcon(projectKey) {
  const proj = state.data.projects[projectKey];
  if (!proj || !proj.iconRelPath) return false;
  const rel = proj.iconRelPath;
  proj.iconRelPath = null;
  saveData();
  attachmentThumbCache.delete(rel);
  try { window.api.deleteAttachment(rel); } catch {}
  return true;
}

function projectDotOrIconHTML(proj, size = 8, extraStyle = '') {
  if (proj && proj.iconRelPath) {
    return `<img class="project-icon-img" data-project-icon-rel="${escapeHTML(proj.iconRelPath)}" style="width:${size * 1.6}px;height:${size * 1.6}px;object-fit:cover;border-radius:4px;${extraStyle}" alt="">`;
  }
  const color = (proj && proj.color) || '#16a34a';
  return `<span class="project-dot" style="background:${color};width:${size}px;height:${size}px;${extraStyle}"></span>`;
}

function loadProjectIcons() {
  document.querySelectorAll('img.project-icon-img[data-project-icon-rel]').forEach(async (img) => {
    const rel = img.dataset.projectIconRel;
    img.removeAttribute('data-project-icon-rel');
    if (attachmentThumbCache.has(rel)) {
      const cached = attachmentThumbCache.get(rel);
      if (cached) img.src = cached;
      return;
    }
    try {
      const url = await window.api.readAttachmentDataUrl(rel);
      attachmentThumbCache.set(rel, url || null);
      if (url) img.src = url;
    } catch (e) {
      console.error('project icon load:', e);
    }
  });
}

async function addDroppedFilesToOwner(owner, fileList, onAfter) {
  if (!owner || !fileList || !fileList.length) return 0;
  if (!Array.isArray(owner.attachments)) owner.attachments = [];
  const added = [];
  for (const file of fileList) {
    const att = await uploadFileToAttachment(file);
    if (att) { owner.attachments.push(att); added.push(att); }
  }
  if (added.length) {
    saveData();
    showToast(`Added ${added.length} attachment${added.length===1?'':'s'}`, 'success');
    if (onAfter) onAfter();
  }
  return added.length;
}

async function pickAndAddAttachments(owner, onAfter) {
  if (!window.api || typeof window.api.pickAttachments !== 'function') {
    showToast('Attachments API not available — please fully restart the app.', 'error');
    return 0;
  }
  let res;
  try {
    res = await window.api.pickAttachments(state.project);
  } catch (e) {
    console.error('pickAttachments threw:', e);
    showToast(`File picker failed: ${e.message}`, 'error');
    return 0;
  }
  if (!res) { showToast('File picker returned no result.', 'error'); return 0; }
  if (!res.ok) { showToast(`File picker error: ${res.error || 'unknown'}`, 'error'); return 0; }
  if (!res.attachments || !res.attachments.length) return 0;
  if (!Array.isArray(owner.attachments)) owner.attachments = [];
  owner.attachments.push(...res.attachments);
  saveData();
  showToast(`Added ${res.attachments.length} attachment${res.attachments.length===1?'':'s'}`, 'success');
  if (onAfter) onAfter();
  return res.attachments.length;
}

async function removeAttachment(owner, attId, onAfter) {
  if (!owner || !Array.isArray(owner.attachments)) return;
  const idx = owner.attachments.findIndex(a => a.id === attId);
  if (idx === -1) return;
  const [removed] = owner.attachments.splice(idx, 1);
  if (removed && removed.relPath) {
    attachmentThumbCache.delete(removed.relPath);
    try { await window.api.deleteAttachment(removed.relPath); } catch (e) { console.error(e); }
  }
  saveData();
  if (onAfter) onAfter();
}

function openAttachmentFile(att) {
  if (att && att.relPath) window.api.openAttachment(att.relPath);
}

function isAudioAttachment(att) {
  const n = (att && (att.name || att.relPath) || '').toLowerCase();
  return /\.(webm|ogg|mp3|wav|m4a|aac|flac|opus)$/.test(n);
}
function audioMimeFor(name) {
  const n = (name || '').toLowerCase();
  if (n.endsWith('.ogg') || n.endsWith('.opus')) return 'audio/ogg';
  if (n.endsWith('.mp3')) return 'audio/mpeg';
  if (n.endsWith('.wav')) return 'audio/wav';
  if (n.endsWith('.m4a') || n.endsWith('.aac')) return 'audio/mp4';
  if (n.endsWith('.flac')) return 'audio/flac';
  return 'audio/webm';
}

function fixAudioDuration(audio) {
  const tryFix = () => {
    if (!isFinite(audio.duration)) {
      const onTime = () => {
        audio.removeEventListener('timeupdate', onTime);
        audio.currentTime = 0;
      };
      audio.addEventListener('timeupdate', onTime);
      audio.currentTime = 1e101;
    }
  };
  if (audio.readyState >= 1) tryFix();
  else audio.addEventListener('loadedmetadata', tryFix, { once: true });
}

function attachmentIconHTML(att) {
  if (isImageFile(att.name)) {
    const cached = attachmentThumbCache.get(att.relPath);
    if (cached) {
      return `<span class="att-icon att-thumb"><img class="att-thumb-img" src="${cached}" alt=""></span>`;
    }
    return `<span class="att-icon att-thumb" data-thumb-src="${escapeHTML(att.relPath || '')}">${fileIconFor(att.name)}</span>`;
  }
  return `<span class="att-icon">${fileIconFor(att.name)}</span>`;
}

function attachmentListHTML(taggedItems) {
  if (!taggedItems.length) {
    return `<div class="att-empty">No attachments yet.</div>`;
  }
  return `<div class="att-list">${taggedItems.map(ti => {
    const isAudio = isAudioAttachment(ti.att);
    return `<div class="att-item" data-att-id="${ti.att.id}">
      <div class="att-item-row">
        ${attachmentIconHTML(ti.att)}
        <button class="att-name" data-att-open="${ti.att.id}" data-owner-kind="${ti.ownerKind}" data-owner-id="${ti.ownerId}" title="Open ${escapeHTML(ti.att.name)}">${escapeHTML(ti.att.name)}</button>
        ${ti.sourceLabel ? `<span class="att-source" title="${escapeHTML(ti.sourceTooltip || ti.sourceLabel)}">${escapeHTML(ti.sourceLabel)}</span>` : ''}
        <span class="att-meta">${formatFileSize(ti.att.size)}</span>
        ${isAudio ? `<button class="att-play-btn" data-att-play="${escapeHTML(ti.att.relPath)}" title="Play inline">▶</button>` : ''}
        <button class="att-remove" data-att-remove="${ti.att.id}" data-owner-kind="${ti.ownerKind}" data-owner-id="${ti.ownerId}" title="Remove">✕</button>
      </div>
      ${isAudio ? `<div class="att-audio-container" data-att-audio-container="${ti.att.id}"></div>` : ''}
    </div>`;
  }).join('')}</div>`;
}

function ownerAttachmentsTagged(owner, ownerKind, ownerId) {
  return (owner.attachments || []).map(a => ({ att: a, ownerKind, ownerId }));
}

function subprojectMergedAttachments(sp) {
  const proj = getProject();
  const items = [];
  (sp.attachments || []).forEach(a =>
    items.push({ att: a, ownerKind: 'subproject', ownerId: sp.id, sourceLabel: 'Subproject', sourceTooltip: `Attached directly to ${sp.name}` }));
  (proj.todos || []).filter(t => t.subprojectId === sp.id).forEach(t =>
    (t.attachments || []).forEach(a =>
      items.push({ att: a, ownerKind: 'todo', ownerId: t.id, sourceLabel: `Todo: ${t.title}`, sourceTooltip: `From todo: ${t.title}` })));
  (proj.notes || []).filter(n => n.subprojectId === sp.id).forEach(n =>
    (n.attachments || []).forEach(a =>
      items.push({ att: a, ownerKind: 'note', ownerId: n.id, sourceLabel: `Note: ${n.title}`, sourceTooltip: `From note: ${n.title}` })));
  items.sort((a, b) => new Date(b.att.added || 0) - new Date(a.att.added || 0));
  return items;
}

function attachmentPanelHTML(owner, ownerKind, ownerId, title = 'Attachments', taggedItems) {
  const items = taggedItems || ownerAttachmentsTagged(owner, ownerKind, ownerId);
  const count = items.length;
  return `<div class="att-panel" data-owner-kind="${ownerKind}" data-owner-id="${ownerId}">
    <div class="att-panel-header">
      <span class="att-panel-title">${title} <span class="att-count">(${count})</span></span>
      <div class="att-panel-actions">
        <button class="btn btn-ghost btn-sm att-folder-btn" title="Open attachments folder in Explorer">📁 Folder</button>
        <button class="btn btn-ghost btn-sm att-add-btn">+ Add</button>
      </div>
    </div>
    <div class="att-dropzone">
      <div class="att-dropzone-hint">📎 Drag & drop files here</div>
      ${attachmentListHTML(items)}
    </div>
  </div>`;
}

function resolveAttachmentOwner(kind, id) {
  const proj = getProject();
  if (!proj) return null;
  if (kind === 'project')    return proj;
  if (kind === 'note')       return (proj.notes || []).find(n => n.id === id);
  if (kind === 'todo')       return (proj.todos || []).find(t => t.id === id);
  if (kind === 'subproject') return (proj.subprojects || []).find(s => s.id === id);
  return null;
}

function bindAttachmentPanel(container, onAfter) {
  if (!container) return;
  loadAttachmentThumbnails(container);
  const panels = container.querySelectorAll('.att-panel');
  panels.forEach(panel => {
    const kind = panel.dataset.ownerKind;
    const id = panel.dataset.ownerId;
    const owner = () => resolveAttachmentOwner(kind, id);

    panel.querySelector('.att-add-btn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      const o = owner();
      if (!o) return;
      await pickAndAddAttachments(o, onAfter);
    });

    panel.querySelector('.att-folder-btn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!window.api || typeof window.api.openProjectFolder !== 'function') {
        showToast('Attachments API not available — please fully restart the app.', 'error');
        return;
      }
      try {
        const err = await window.api.openProjectFolder(state.project);
        if (err) showToast(`Could not open folder: ${err}`, 'error');
      } catch (err) {
        showToast(`Could not open folder: ${err.message}`, 'error');
      }
    });

    panel.querySelectorAll('[data-att-open]').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const o = resolveAttachmentOwner(btn.dataset.ownerKind, btn.dataset.ownerId);
        if (!o) return;
        const att = (o.attachments || []).find(a => a.id === btn.dataset.attOpen);
        if (att) openAttachmentFile(att);
      }));

    panel.querySelectorAll('[data-att-remove]').forEach(btn =>
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const o = resolveAttachmentOwner(btn.dataset.ownerKind, btn.dataset.ownerId);
        if (!o) return;
        await removeAttachment(o, btn.dataset.attRemove, onAfter);
      }));

    panel.querySelectorAll('[data-att-play]').forEach(btn =>
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const rel = btn.dataset.attPlay;
        const item = btn.closest('.att-item');
        const container = item?.querySelector('.att-audio-container');
        if (!container) return;
        if (container.firstChild) { container.innerHTML = ''; btn.textContent = '▶'; return; }
        if (!window.api || typeof window.api.readAttachmentDataUrl !== 'function') {
          showToast('Audio API unavailable — please fully restart the app.', 'error');
          return;
        }
        try {
          const url = await window.api.readAttachmentDataUrl(rel);
          if (!url) { showToast('Audio unreachable. Fully restart the app so the new audio MIME handlers load.', 'error'); return; }
          const audio = document.createElement('audio');
          audio.controls = true;
          audio.src = url;
          audio.style.width = '100%';
          audio.style.marginTop = '6px';
          audio.addEventListener('error', () => {
            showToast(`Audio playback failed (code ${audio.error?.code || '?'}).`, 'error');
          });
          container.innerHTML = '';
          container.appendChild(audio);
          fixAudioDuration(audio);
          audio.play().catch(() => {});
          btn.textContent = '⏸';
        } catch (err) {
          console.error(err);
          showToast(`Could not open audio: ${err.message}`, 'error');
        }
      }));

    const zone = panel.querySelector('.att-dropzone');
    if (zone) {
      zone.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.add('att-dropzone-active');
      });
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        zone.classList.add('att-dropzone-active');
      });
      zone.addEventListener('dragleave', (e) => {
        if (!zone.contains(e.relatedTarget)) zone.classList.remove('att-dropzone-active');
      });
      zone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('att-dropzone-active');
        const o = owner();
        if (!o) { showToast('Could not find item to attach to.', 'error'); return; }
        const files = e.dataTransfer?.files;
        if (!files || !files.length) { showToast('No files detected in drop.', 'error'); return; }
        await addDroppedFilesToOwner(o, files, onAfter);
      });
    }
  });
}

function showTodoAttachmentsModal(todoId) {
  const t = getProject().todos.find(x => x.id === todoId);
  if (!t) return;
  const overlay = document.getElementById('modal-overlay');
  const render = () => {
    overlay.innerHTML = `
      <div class="modal attachments-modal">
        <h3>Attachments — ${escapeHTML(t.title)}</h3>
        ${attachmentPanelHTML(t, 'todo', t.id)}
        <div class="modal-buttons">
          <button class="btn btn-primary" id="att-modal-close">Done</button>
        </div>
      </div>`;
    bindAttachmentPanel(overlay, render);
    document.getElementById('att-modal-close').onclick = () => {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
      overlay.onclick = null;
      renderTodos();
    };
  };
  overlay.classList.remove('hidden');
  render();
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.classList.add('hidden');
      overlay.innerHTML = '';
      overlay.onclick = null;
      renderTodos();
    }
  };
}

function setupGlobalDropGuard() {
  // Prevent the browser from navigating away when files are dropped outside a drop zone.
  window.addEventListener('dragover', (e) => { e.preventDefault(); }, false);
  window.addEventListener('drop', (e) => {
    if (!e.target.closest?.('.att-dropzone')) e.preventDefault();
  }, false);
}

function applyListPanelWidth() {
  const stored = parseInt(localStorage.getItem('listPanelWidth'), 10);
  const w = Number.isFinite(stored) && stored >= 200 ? stored : 280;
  document.documentElement.style.setProperty('--list-panel-w', w + 'px');
}

