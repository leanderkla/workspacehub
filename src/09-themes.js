'use strict';

// ===== src/09-themes.js =====
// Wave-3 extraction (M0): the appearance system. Three sub-banners folded:
// THEMES (curated set + applyTheme/loadTheme/applyCurrentTheme/reapplyAccent),
// CUSTOM GLASS THEMES (per-user theme builder with the glass material
// system, color-luminance helpers, save/load/upsert/delete), and CUSTOM
// GLASS settings UI (the editor + preview painters living inside the
// Settings modal's Appearance tab).
//
// SETTINGS_TABS lives here too (the table of all settings tabs) because
// the master tabs list sits adjacent to settingsAppearanceGlobalHTML in
// the source. Slightly off-theme by name but the cohesion is fine.
//
// var conversion (3 top-level declarations):
// - THEMES — referenced by getAllProjectColorOptions in src/01-types-state.js;
//   absolutely needs to stay globally visible across the script-tag boundary.
// - DEFAULT_NEW_GLASS, SETTINGS_TABS — used inside this file today; converted
//   on the cross-file rule.
//
// Critical cross-module call sites:
// - applyCurrentTheme is invoked from residual app.js's switchProject and
//   _restoreSnapshotIntoState (in src/03-undo-save.js). Function declaration
//   stays global — calls resolve identically.
// - openSettings is called from titlebar buttons and the keyboard handler
//   in residual; same global-resolution story.
// ===== THEMES =====
// Curated theme set — kept intentionally short. Adding to this list does
// not require any other code changes; just include a matching CSS block in
// styles.css under html[data-theme="<id>"].
//
// IDs are preserved (eh-sun / eh-sepia / ai5-cyan) so any project pinned
// to one of those keeps its look — only the display names changed.
var THEMES = [
  { id: 'eh-sun',            name: 'Saffron',           swatches: ['#F9A81A','#404A4F','#FFFFFF'], forceAccent: '#F9A81A' },
  { id: 'eh-sepia',          name: 'Vellum',            swatches: ['#F9A81A','#f1e7d0','#3b2f1c'], forceAccent: '#F9A81A' },
  { id: 'ai5-cyan',          name: 'Capri',             swatches: ['#26c9e2','#0d0c12','#ffffff'], forceAccent: '#26c9e2' },
  { id: 'glass',             name: 'Glass',             swatches: ['#ec4899','#4c1d95','#0ea5e9'], forceAccent: '#ec4899' },
  { id: 'lavender',          name: 'Lavender',          swatches: ['#a78bfa','#f8f5ff','#3b0764'], forceAccent: '#a78bfa' },
  { id: 'solarized',         name: 'Solarized',         swatches: ['#268bd2','#fdf6e3','#586e75'], forceAccent: '#268bd2' },
  { id: 'operating-theatre', name: 'Operating Theatre', swatches: ['#1A73C9','#FBFCFE','#E6F0FB'], forceAccent: '#1A73C9' },
  { id: 'stucco',            name: 'Stucco',            swatches: ['#D03A33','#FFF7F1','#FBE7DA'], forceAccent: '#D03A33' }
];

// ===== CUSTOM GLASS THEMES =====
// User-built variants of the `glass` theme: pick accent + base + 3
// gradient stops, save, share the existing glass blur/treatment.
//
// Storage shape (localStorage.customGlassThemes — JSON array):
//   { id, name, accent, base, g1: {color, alpha}, g2: ..., g3: ... }
// Alpha is a 0-100 percent integer.
//
// Lifecycle:
//   * loadCustomGlassThemesIntoMain()  — called at boot, also after any
//     mutation. Strips previous customs from THEMES and re-pushes them
//     so the picker grid + per-project picker show them. Also rewrites
//     the runtime <style> block.
//   * customGlassThemeToCSS(t) — emits the rule that overrides colour
//     vars + body backdrop for one custom theme.

var DEFAULT_NEW_GLASS = {
  name:   'My Glass',
  accent: '#ec4899',
  base:   '#0b0f1e',
  g1: { color: '#4c1d95', alpha: 75 },
  g2: { color: '#db2777', alpha: 70 },
  g3: { color: '#0ea5e9', alpha: 50 }
};

function loadCustomGlassThemes() {
  try {
    const raw = localStorage.getItem('customGlassThemes');
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function saveCustomGlassThemesArr(arr) {
  localStorage.setItem('customGlassThemes', JSON.stringify(arr));
}

function loadCustomGlassThemesIntoMain() {
  // Strip previous customs in place (keep array reference — many places
  // capture THEMES at module scope).
  for (let i = THEMES.length - 1; i >= 0; i--) {
    if (THEMES[i].isCustom) THEMES.splice(i, 1);
  }
  loadCustomGlassThemes().forEach(t => {
    THEMES.push({
      id: t.id,
      name: t.name || 'Custom glass',
      // Picker preview — accent + a sample of the gradient palette.
      swatches: [t.accent, t.g1?.color || t.base, t.g2?.color || t.accent],
      forceAccent: t.accent,
      isCustom: true
    });
  });
  applyCustomGlassThemesStyleTag();
}

function applyCustomGlassThemesStyleTag() {
  let tag = document.getElementById('custom-glass-themes');
  if (!tag) {
    tag = document.createElement('style');
    tag.id = 'custom-glass-themes';
    document.head.appendChild(tag);
  }
  tag.textContent = loadCustomGlassThemes().map(customGlassThemeToCSS).join('\n');
}

function customGlassThemeToCSS(t) {
  const a = (hex, frac) => _hexWithAlpha(hex, frac);
  const text = _pickGlassTextColor(t.base);
  // Mirrors the existing `glass` rule's variable shape so anywhere that
  // reads var(--card-bg) etc. behaves the same; only the values change.
  return `
html[data-glass-id="${t.id}"] {
  --accent: ${t.accent};
  --accent-light: ${a(t.accent, 0.30)};
  --accent-dark: color-mix(in srgb, ${t.accent} 70%, black);
  --accent-faint: ${a(t.accent, 0.12)};
  --accent-soft: ${a(t.accent, 0.06)};
  --sidebar-bg: ${a(t.base, 0.55)};
  --sidebar-hover: ${a(text, 0.06)};
  --sidebar-active: ${a(t.accent, 0.18)};
  --content-bg: transparent;
  --card-bg: ${a(text, 0.06)};
  --text-primary: ${text};
  --text-secondary: ${a(text, 0.72)};
  --text-muted: ${a(text, 0.50)};
  --border: ${a(text, 0.10)};
  --border-strong: ${a(text, 0.20)};
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.30);
  --shadow: 0 4px 12px rgba(0,0,0,0.40);
  --shadow-md: 0 8px 24px rgba(0,0,0,0.40);
  --shadow-lg: 0 16px 40px rgba(0,0,0,0.50);
  /* Modals + completer popovers need a much higher alpha than --card-bg
     so text behind them doesn't bleed through. Tinted from the theme's
     base so each custom variant gets a popup in its own palette. */
  --popover-bg: ${a(t.base, 0.92)};
}
html[data-glass-id="${t.id}"] body {
  background:
    radial-gradient(at 15% 10%, ${a(t.g1.color, t.g1.alpha / 100)} 0%, transparent 50%),
    radial-gradient(at 85%  5%, ${a(t.g2.color, t.g2.alpha / 100)} 0%, transparent 45%),
    radial-gradient(at 60% 100%, ${a(t.g3.color, t.g3.alpha / 100)} 0%, transparent 55%),
    ${t.base};
  background-attachment: fixed;
}`;
}

function _hexWithAlpha(hex, frac) {
  if (!hex || hex[0] !== '#' || hex.length !== 7) return `rgba(0,0,0,${frac})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, frac)).toFixed(3)})`;
}

function _relLuminance(hex) {
  if (!hex || hex[0] !== '#' || hex.length !== 7) return 0;
  const c = (n) => {
    const v = n / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * c(parseInt(hex.slice(1, 3), 16))
       + 0.7152 * c(parseInt(hex.slice(3, 5), 16))
       + 0.0722 * c(parseInt(hex.slice(5, 7), 16));
}

// Glass themes assume a dark base — for very dark bases pick a light cream
// text colour, otherwise fall back to dark slate. The 0.45 threshold is
// conservative so even mid-dark bases still get the cream treatment that
// the existing `glass` theme (#0b0f1e base) uses.
function _pickGlassTextColor(baseHex) {
  return _relLuminance(baseHex) < 0.45 ? '#f1f5ff' : '#0f172a';
}

// CRUD on the saved-list, each call regenerates the style tag + THEMES.
function upsertCustomGlassTheme(theme) {
  if (!theme || !theme.id) return null;
  const arr = loadCustomGlassThemes();
  const idx = arr.findIndex(t => t.id === theme.id);
  if (idx >= 0) arr[idx] = theme; else arr.push(theme);
  saveCustomGlassThemesArr(arr);
  loadCustomGlassThemesIntoMain();
  return theme;
}

function deleteCustomGlassTheme(id) {
  const arr = loadCustomGlassThemes().filter(t => t.id !== id);
  saveCustomGlassThemesArr(arr);
  loadCustomGlassThemesIntoMain();
  // If the deleted theme was active, fall back to default.
  if (localStorage.getItem('theme') === id) applyTheme('glass');
  // Same for any project that pinned it.
  let projChanged = false;
  for (const proj of Object.values(state.data?.projects || {})) {
    if (proj.theme === id) { proj.theme = null; projChanged = true; }
  }
  if (projChanged) saveData();
  applyCurrentTheme();
}

function newCustomGlassTheme(seed = DEFAULT_NEW_GLASS) {
  // Deep-clone so callers can't accidentally mutate DEFAULT_NEW_GLASS.
  return {
    id: 'glass-' + Date.now().toString(36),
    name: seed.name,
    accent: seed.accent,
    base:   seed.base,
    g1: { ...seed.g1 },
    g2: { ...seed.g2 },
    g3: { ...seed.g3 }
  };
}

function loadTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  applyTheme(saved, false);
}

function getEffectiveThemeId() {
  const proj = state.data?.projects?.[state.project];
  if (proj && proj.theme && THEMES.some(t => t.id === proj.theme)) return proj.theme;
  const saved = localStorage.getItem('theme') || 'light';
  return THEMES.some(t => t.id === saved) ? saved : 'light';
}

// Custom glass themes opt into the existing `glass` ruleset by setting
// data-theme="glass" AND a data-glass-id attribute pointing at the saved
// theme's id. The `<style id="custom-glass-themes">` block in <head>
// (emitted by applyCustomGlassThemesStyleTag) targets the data-glass-id
// attribute and overrides only the colour variables + body backdrop.
// All blur / shadow / surface treatment comes from the static glass
// rules in styles.css — those stay untouched.
function _setThemeAttrs(id) {
  const isCustomGlass = typeof id === 'string' && id.startsWith('glass-') && id !== 'glass';
  if (isCustomGlass) {
    document.documentElement.setAttribute('data-theme', 'glass');
    document.documentElement.setAttribute('data-glass-id', id);
  } else {
    document.documentElement.setAttribute('data-theme', id);
    document.documentElement.removeAttribute('data-glass-id');
  }
}

function applyTheme(id, persist = true) {
  const valid = THEMES.some(t => t.id === id) ? id : 'light';
  _setThemeAttrs(valid);
  if (persist) localStorage.setItem('theme', valid);
  reapplyAccent();
}

function applyCurrentTheme() {
  const id = getEffectiveThemeId();
  _setThemeAttrs(id);
  reapplyAccent();
}

function reapplyAccent() {
  // Reads the persisted/effective theme id (which may be a custom-glass id),
  // not the data-theme attribute (which folds custom-glass to "glass").
  const id = getEffectiveThemeId();
  const theme = THEMES.find(t => t.id === id);
  const proj = state.data?.projects?.[state.project];
  if (theme && theme.forceAccent) {
    document.documentElement.style.setProperty('--accent', theme.forceAccent);
  } else if (proj && proj.color) {
    document.documentElement.style.setProperty('--accent', proj.color);
  } else {
    document.documentElement.style.removeProperty('--accent');
  }
}

var SETTINGS_TABS = [
  { id: 'appearance', icon: '🎨', label: 'Appearance' },
  { id: 'workspace',  icon: '◈',  label: 'Workspace' },
  { id: 'contexts',   icon: '🏷',  label: 'Contexts' },
  { id: 'workflows',  icon: '⚡', label: 'Workflows' },
  { id: 'developer',  icon: '🔧', label: 'Developer' }
];

function settingsAppearanceGlobalHTML() {
  const current = localStorage.getItem('theme') || 'light';
  return `
    <div class="settings-section">
      <div class="settings-section-title">Global color scheme</div>
      <div class="settings-hint">Used by projects that don't pick their own.</div>
      <div class="theme-grid">
        ${THEMES.map(t => `
          <button class="theme-card ${t.id===current?'selected':''}" data-theme-id="${t.id}">
            <div class="theme-swatches">
              ${t.swatches.map(c => `<span class="theme-swatch" style="background:${c}"></span>`).join('')}
            </div>
            <div class="theme-name">${escapeHTML(t.name)}</div>
          </button>`).join('')}
      </div>
    </div>`;
}

// Tri-color preview pill — used both inline next to a project name and inside the theme dropdown.
function themePreviewHTML(theme, extraClass = '') {
  if (!theme) return '';
  return `<span class="project-theme-preview ${extraClass}">
    ${theme.swatches.map(c => `<span class="project-theme-preview-swatch" style="background:${c}"></span>`).join('')}
  </span>`;
}

// Custom dropdown: a button that previews the current theme + a popup of all themes
// (each row shows the tri-color preview). Native <option> can't render swatches, hence the popup.
function themeSelectHTML(key, proj) {
  const globalThemeId = localStorage.getItem('theme') || 'light';
  const effectiveId = proj.theme || globalThemeId;
  const effective = THEMES.find(t => t.id === effectiveId) || THEMES[0];
  const buttonLabel = proj.theme
    ? effective.name
    : `Use global · ${effective.name}`;
  return `<div class="theme-select" data-theme-select-root="${key}">
    <button class="theme-select-btn" data-theme-select-toggle="${key}" type="button" title="${escapeHTML(buttonLabel)}">
      ${themePreviewHTML(effective, 'small')}
      <span class="theme-select-name">${escapeHTML(buttonLabel)}</span>
      <span class="theme-select-caret">▾</span>
    </button>
    <div class="theme-select-menu" data-theme-select-menu="${key}" hidden>
      <button class="theme-select-option ${!proj.theme ? 'selected' : ''}" type="button" data-theme-pick="" data-project-key="${key}">
        ${themePreviewHTML(THEMES.find(t => t.id === globalThemeId), 'small')}
        <span class="theme-select-option-name">Use global · <span class="theme-select-option-sub">${escapeHTML((THEMES.find(t => t.id === globalThemeId) || {}).name || '')}</span></span>
      </button>
      <div class="theme-select-divider"></div>
      ${THEMES.map(t => `
        <button class="theme-select-option ${proj.theme === t.id ? 'selected' : ''}" type="button" data-theme-pick="${t.id}" data-project-key="${key}">
          ${themePreviewHTML(t, 'small')}
          <span class="theme-select-option-name">${escapeHTML(t.name)}</span>
          ${proj.theme === t.id ? '<span class="theme-select-check">✓</span>' : ''}
        </button>`).join('')}
    </div>
  </div>`;
}

// ===== CUSTOM GLASS — settings UI =====
// State: `state.editingGlassDraft` holds the in-flight theme being edited.
// null means the editor is closed; an object with an `id` means it's open.
// New themes get `_isNew: true` so Save knows to mint a fresh id; editing
// existing ones keeps the id so Save updates the same row.

function settingsCustomGlassHTML() {
  const customs = loadCustomGlassThemes();
  const draft = state.editingGlassDraft;
  return `
    <div class="settings-section">
      <div class="settings-section-title">Custom glass themes</div>
      <div class="settings-hint">Build your own variant of the Glass theme — pick the accent, base, and three gradient stops. Saves into the picker above.</div>

      ${customs.length === 0
        ? '<div class="custom-glass-empty">No custom glass themes yet.</div>'
        : `<div class="custom-glass-list">
            ${customs.map(t => `
              <div class="custom-glass-row">
                <span class="custom-glass-row-swatches">
                  <span class="custom-glass-row-swatch" style="background:${escapeHTML(t.accent)}" title="accent"></span>
                  <span class="custom-glass-row-swatch" style="background:${escapeHTML(t.g1.color)}" title="grad 1"></span>
                  <span class="custom-glass-row-swatch" style="background:${escapeHTML(t.g2.color)}" title="grad 2"></span>
                  <span class="custom-glass-row-swatch" style="background:${escapeHTML(t.g3.color)}" title="grad 3"></span>
                </span>
                <span class="custom-glass-row-name">${escapeHTML(t.name)}</span>
                <span class="custom-glass-row-actions">
                  <button class="btn btn-ghost btn-sm" data-glass-apply="${t.id}">Apply</button>
                  <button class="btn btn-ghost btn-sm" data-glass-edit="${t.id}">Edit</button>
                  <button class="btn btn-ghost btn-sm" data-glass-delete="${t.id}" style="color:#dc2626">Delete</button>
                </span>
              </div>`).join('')}
          </div>`}

      ${draft
        ? customGlassEditorHTML(draft)
        : '<button class="btn btn-secondary" id="custom-glass-new" style="margin-top:8px">+ New custom glass</button>'}
    </div>`;
}

// Mutates the inline styles of #custom-glass-preview and its children so the
// preview tracks the editor's current draft live, without a re-render. This
// is intentionally separate from customGlassThemeToCSS — the preview lives
// inside the settings modal which has its own surrounding styles, and we
// only need to paint the gradient backdrop + a couple of tinted cards.
function paintCustomGlassPreview(draft) {
  const root = document.getElementById('custom-glass-preview');
  if (!root || !draft) return;
  const a = (hex, frac) => _hexWithAlpha(hex, frac);
  const text = _pickGlassTextColor(draft.base);
  root.style.background =
    `radial-gradient(at 15% 10%, ${a(draft.g1.color, draft.g1.alpha / 100)} 0%, transparent 50%),`
    + `radial-gradient(at 85% 5%, ${a(draft.g2.color, draft.g2.alpha / 100)} 0%, transparent 45%),`
    + `radial-gradient(at 60% 100%, ${a(draft.g3.color, draft.g3.alpha / 100)} 0%, transparent 55%),`
    + draft.base;
  root.style.color = text;

  root.querySelectorAll('.cgp-card').forEach(card => {
    card.style.background = a(text, 0.06);
    card.style.borderColor = a(text, 0.18);
  });
  const title = root.querySelector('.cgp-card-title');
  if (title) title.style.color = text;
  root.querySelectorAll('.cgp-row-title').forEach(el => { el.style.color = text; });
  root.querySelectorAll('.cgp-card-meta').forEach(el => { el.style.color = a(text, 0.65); });

  const rule = root.querySelector('.cgp-rule');
  if (rule) rule.style.background = draft.accent;
  root.querySelectorAll('.cgp-row-badge:not(.cgp-row-badge-muted)').forEach(badge => {
    badge.style.background = draft.accent;
    badge.style.color = draft.base;
  });
  root.querySelectorAll('.cgp-row-badge-muted').forEach(badge => {
    badge.style.background = a(text, 0.10);
    badge.style.color = a(text, 0.85);
    badge.style.borderColor = a(text, 0.20);
  });
}

function customGlassEditorHTML(draft) {
  const isNew = !!draft._isNew;
  return `
    <div class="custom-glass-editor" id="custom-glass-editor">

      <div class="custom-glass-preview-wrap">
        <div class="custom-glass-preview" id="custom-glass-preview">
          <div class="cgp-card cgp-card-1">
            <div class="cgp-card-title">Pull</div>
            <div class="cgp-card-meta">14 things want attention</div>
          </div>
          <div class="cgp-card cgp-card-2">
            <div class="cgp-card-row cgp-active">
              <span class="cgp-rule"></span>
              <span class="cgp-row-title">Call Lukas re: Q4 proposal</span>
              <span class="cgp-row-badge">HIGH</span>
            </div>
            <div class="cgp-card-row">
              <span class="cgp-row-title">Send onboarding doc</span>
              <span class="cgp-row-badge cgp-row-badge-muted">Med</span>
            </div>
          </div>
        </div>
      </div>

      <div class="custom-glass-form">
        <label class="custom-glass-field">
          <span class="custom-glass-field-label">Name</span>
          <input type="text" class="form-input custom-glass-input" data-glass-field="name" value="${escapeHTML(draft.name)}" maxlength="40" placeholder="My Glass">
        </label>

        <div class="custom-glass-row-fields">
          <label class="custom-glass-field custom-glass-field-color">
            <span class="custom-glass-field-label">Accent</span>
            <input type="color" data-glass-field="accent" value="${escapeHTML(draft.accent)}">
            <span class="custom-glass-hex" data-glass-hex-for="accent">${escapeHTML(draft.accent)}</span>
          </label>
          <label class="custom-glass-field custom-glass-field-color">
            <span class="custom-glass-field-label">Base</span>
            <input type="color" data-glass-field="base" value="${escapeHTML(draft.base)}">
            <span class="custom-glass-hex" data-glass-hex-for="base">${escapeHTML(draft.base)}</span>
          </label>
        </div>

        ${[1, 2, 3].map(i => {
          const stop = draft['g' + i];
          return `
            <div class="custom-glass-stop">
              <div class="custom-glass-stop-label">Gradient ${i}</div>
              <input type="color" data-glass-field="g${i}.color" value="${escapeHTML(stop.color)}">
              <span class="custom-glass-hex" data-glass-hex-for="g${i}.color">${escapeHTML(stop.color)}</span>
              <input type="range" min="0" max="100" step="1" data-glass-field="g${i}.alpha" value="${stop.alpha}" class="custom-glass-alpha">
              <span class="custom-glass-alpha-val" data-glass-alpha-for="g${i}.alpha">${stop.alpha}%</span>
            </div>`;
        }).join('')}

        <div class="custom-glass-actions">
          <button class="btn btn-ghost" id="custom-glass-cancel">Cancel</button>
          <button class="btn btn-primary" id="custom-glass-save">${isNew ? 'Create theme' : 'Save changes'}</button>
        </div>
      </div>
    </div>`;
}

function settingsAppearanceHTML() {
  const projectEntries = Object.entries(state.data.projects);
  return `
    ${settingsAppearanceGlobalHTML()}
    ${settingsCustomGlassHTML()}
    <div class="settings-section">
      <div class="settings-section-title">Per-project color scheme</div>
      <div class="settings-hint">Each project can use its own scheme or inherit the global one. The colored dot is the project's identity color.</div>
      <div class="project-theme-list">
        ${projectEntries.map(([key, proj]) => `
          <div class="project-theme-row ${proj.archived?'archived':''}">
            <div class="project-theme-head">
              ${proj.iconRelPath
                ? `<img class="project-theme-dot project-icon-preview project-icon-img" data-project-icon-rel="${escapeHTML(proj.iconRelPath)}" alt="">`
                : `<button class="project-theme-dot project-color-btn" data-color-project="${key}" style="background:${proj.color || '#16a34a'}" title="Change dot color"></button>`}
              <span class="project-theme-name">${escapeHTML(proj.name)}${proj.archived ? ' <span class="proj-archived-tag">📦 archived</span>' : ''}</span>
              <input type="file" accept="image/*" class="project-icon-input" data-icon-input="${key}" style="display:none">
              <button class="btn btn-ghost btn-sm project-icon-upload" data-icon-upload="${key}" title="${proj.iconRelPath ? 'Replace icon' : 'Upload an icon image'}">🖼 ${proj.iconRelPath ? 'Replace' : 'Icon'}</button>
              ${proj.iconRelPath ? `<button class="btn btn-ghost btn-sm project-icon-remove" data-icon-remove="${key}" title="Remove icon">✕</button>` : ''}
              ${themeSelectHTML(key, proj)}
            </div>
            <div class="project-color-picker" data-project-color-picker="${key}" hidden>
              ${getAllProjectColorOptions().map(c => `
                <button class="project-color-swatch ${proj.color && proj.color.toLowerCase()===c.toLowerCase()?'selected':''}" data-pick-color="${c}" data-project="${key}" style="background:${c}" title="${c}"></button>
              `).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>`;
}

function settingsWorkspaceHTML() {
  return `
    <div class="settings-section">
      <div class="settings-section-title">Workspace features</div>
      <div class="settings-hint">Drag to reorder · Uncheck to hide from the sidebar.</div>
      <div class="nav-pref-list" id="nav-pref-list">
        ${getOrderedNavItems().map((item, idx) => `
          <div class="nav-pref-item" draggable="true" data-nav-id="${item.id}" data-nav-idx="${idx}">
            <span class="nav-pref-handle" title="Drag">⋮⋮</span>
            <span class="nav-pref-icon">${item.icon}</span>
            <span class="nav-pref-label">${escapeHTML(item.label)}</span>
            <label class="nav-pref-toggle">
              <input type="checkbox" data-nav-toggle="${item.id}" ${item.visible?'checked':''}>
            </label>
          </div>`).join('')}
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:8px">
        <button class="btn btn-ghost btn-sm" id="nav-pref-reset" title="Restore default order and show everything">Reset to defaults</button>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-section-title">Keyboard shortcuts</div>
      <div class="settings-hint">All keyboard shortcuts in one cheatsheet.</div>
      <button class="btn btn-secondary" id="settings-open-cheatsheet">? Open cheatsheet</button>
    </div>`;
}

function settingsContextsHTML() {
  const contexts = loadSharedContexts();
  return `
    <div class="settings-section">
      <div class="settings-section-title">Shared contexts</div>
      <div class="settings-hint">Used by Commitments and Delegations for autocomplete and filtering.</div>
      <div class="shared-contexts-list">
        ${contexts.length
          ? contexts.map(ctx => `
              <span class="shared-context-chip">
                ${escapeHTML(ctx)}
                <button class="shared-context-remove" data-remove-context="${escapeHTML(ctx)}" title="Remove">✕</button>
              </span>`).join('')
          : '<span style="font-size:11px;color:var(--text-muted);font-style:italic">No shared contexts yet — add one below.</span>'}
      </div>
      <div class="shared-context-add">
        <input type="text" class="form-input" id="shared-context-input" placeholder="Add a context (e.g. Acme Corp)">
        <button class="btn btn-primary btn-sm" id="btn-shared-context-add">Add</button>
      </div>
    </div>`;
}

function settingsWorkflowsHTML() {
  // The Rückbucher toggle is the only entry today and it's Energy-Hero-
  // specific. In distribution builds (window.api.isPersonalBuild === false)
  // the row is hidden, leaving a placeholder so the section reads as a
  // future extension point rather than a missing feature.
  const isPersonal = (typeof window !== 'undefined' && window.api && window.api.isPersonalBuild === true);
  return `
    <div class="settings-section">
      <div class="settings-section-title">Workflow shortcuts</div>
      <div class="settings-hint">Per-project quick-action buttons on the Todos view.</div>
      ${isPersonal ? `
      <label class="dev-checkbox-row">
        <input type="checkbox" id="workflow-rueckbucher-toggle" ${isRueckbucherButtonEnabled()?'checked':''}>
        <span>Energy Hero — "↻ Rückbucher" button
          <span class="settings-hint" style="display:block;margin-top:2px">Spawns three follow-up todos in one click: "2nd reminder" +7 calendar days, "last reminder" +14 calendar days, "inaktiv stellen" +3 workdays after the last reminder (skips Sat/Sun). Visible only when Energy Hero is the active project.</span>
        </span>
      </label>` : `
      <div class="settings-hint" style="font-style:italic;margin-top:6px">No workflow shortcuts available yet.</div>`}
    </div>`;
}

function settingsDeveloperHTML() {
  return `
    <div class="settings-section">
      <div class="settings-section-title">Developer</div>
      <div class="settings-hint">Unlocks internal tools and options.</div>
      <label class="dev-checkbox-row">
        <input type="checkbox" id="dev-mode-toggle" ${isDeveloperMode()?'checked':''}>
        <span>Developer mode</span>
      </label>
      ${isDeveloperMode() ? `
        <label class="dev-checkbox-row dev-checkbox-nested">
          <input type="checkbox" id="dev-ask-backups-toggle" ${isAskForBackups()?'checked':''}>
          <span>Ask for backups?
            <span class="settings-hint" style="display:block;margin-top:2px">Every 15 minutes a popup asks whether to create a local backup zip.</span>
          </span>
        </label>
        <div style="margin:6px 0 12px">
          <button class="btn btn-ghost btn-sm" id="btn-manual-backup">Backup now</button>
        </div>` : ''}
    </div>`;
}

function settingsTabContentHTML(tabId) {
  switch (tabId) {
    case 'appearance': return settingsAppearanceHTML();
    case 'projects':   return settingsAppearanceHTML(); // legacy id from before merge
    case 'workspace':  return settingsWorkspaceHTML();
    case 'contexts':   return settingsContextsHTML();
    case 'workflows':  return settingsWorkflowsHTML();
    case 'developer':  return settingsDeveloperHTML();
    default:           return settingsAppearanceHTML();
  }
}

function openSettings() {
  const overlay = document.getElementById('modal-overlay');
  const close = () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
    overlay.onclick = null;
  };

  // Initialise tab if first open this session.
  if (!state.settingsTab || !SETTINGS_TABS.some(t => t.id === state.settingsTab)) {
    state.settingsTab = localStorage.getItem('settingsLastTab') || 'appearance';
    if (!SETTINGS_TABS.some(t => t.id === state.settingsTab)) state.settingsTab = 'appearance';
  }

  const renderKeepingScroll = () => {
    const pane = overlay.querySelector('.settings-content');
    const top = pane ? pane.scrollTop : 0;
    render();
    requestAnimationFrame(() => {
      const p = overlay.querySelector('.settings-content');
      if (p) p.scrollTop = top;
    });
  };

  const render = () => {
    const tabId = state.settingsTab;
    overlay.innerHTML = `
      <div class="modal settings-modal">
        <div class="settings-rail">
          <div class="settings-rail-title">Settings</div>
          <div class="settings-rail-list">
            ${SETTINGS_TABS.map(t => `
              <button class="settings-rail-item ${t.id===tabId?'active':''}" data-settings-tab="${t.id}">
                <span class="settings-rail-icon">${t.icon}</span>
                <span class="settings-rail-label">${escapeHTML(t.label)}</span>
              </button>`).join('')}
          </div>
          <div class="settings-rail-footer">
            <button class="btn btn-primary btn-sm" id="settings-close">Done</button>
          </div>
        </div>
        <div class="settings-content">
          ${settingsTabContentHTML(tabId)}
        </div>
      </div>`;

    // Tab switching — persist the choice so the user lands on the same place next time.
    overlay.querySelectorAll('[data-settings-tab]').forEach(btn =>
      btn.addEventListener('click', () => {
        state.settingsTab = btn.dataset.settingsTab;
        localStorage.setItem('settingsLastTab', state.settingsTab);
        render();
      }));
    document.getElementById('settings-open-cheatsheet')?.addEventListener('click', () => {
      close();
      openShortcutsCheatsheet();
    });
    overlay.querySelectorAll('.theme-card').forEach(btn =>
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.themeId);
        overlay.querySelectorAll('.theme-card').forEach(b => b.classList.toggle('selected', b === btn));
        applyCurrentTheme();
        // The Appearance tab shows tri-color previews that inherit the global theme — keep them in sync.
        renderKeepingScroll();
      }));

    // ----- Custom glass: list actions + editor wiring -----
    overlay.querySelectorAll('[data-glass-apply]').forEach(btn =>
      btn.addEventListener('click', () => {
        applyTheme(btn.dataset.glassApply);
        applyCurrentTheme();
        renderKeepingScroll();
      }));
    overlay.querySelectorAll('[data-glass-edit]').forEach(btn =>
      btn.addEventListener('click', () => {
        const t = loadCustomGlassThemes().find(x => x.id === btn.dataset.glassEdit);
        if (!t) return;
        // Deep clone so input edits don't mutate the saved theme until Save is clicked.
        state.editingGlassDraft = {
          ...t, g1: { ...t.g1 }, g2: { ...t.g2 }, g3: { ...t.g3 }
        };
        renderKeepingScroll();
        // Paint preview immediately on open so user sees the starting palette.
        requestAnimationFrame(() => paintCustomGlassPreview(state.editingGlassDraft));
      }));
    overlay.querySelectorAll('[data-glass-delete]').forEach(btn =>
      btn.addEventListener('click', () => {
        const t = loadCustomGlassThemes().find(x => x.id === btn.dataset.glassDelete);
        if (!t) return;
        if (!confirm(`Delete custom glass theme "${t.name}"?`)) return;
        deleteCustomGlassTheme(t.id);
        renderKeepingScroll();
      }));

    document.getElementById('custom-glass-new')?.addEventListener('click', () => {
      state.editingGlassDraft = { ...newCustomGlassTheme(DEFAULT_NEW_GLASS), _isNew: true };
      renderKeepingScroll();
      requestAnimationFrame(() => paintCustomGlassPreview(state.editingGlassDraft));
    });

    document.getElementById('custom-glass-cancel')?.addEventListener('click', () => {
      state.editingGlassDraft = null;
      renderKeepingScroll();
    });

    document.getElementById('custom-glass-save')?.addEventListener('click', () => {
      const d = state.editingGlassDraft;
      if (!d) return;
      const cleaned = {
        id: d.id,
        name: (d.name || '').trim() || 'My Glass',
        accent: d.accent,
        base:   d.base,
        g1: { color: d.g1.color, alpha: Math.max(0, Math.min(100, parseInt(d.g1.alpha, 10) || 0)) },
        g2: { color: d.g2.color, alpha: Math.max(0, Math.min(100, parseInt(d.g2.alpha, 10) || 0)) },
        g3: { color: d.g3.color, alpha: Math.max(0, Math.min(100, parseInt(d.g3.alpha, 10) || 0)) }
      };
      upsertCustomGlassTheme(cleaned);
      // Auto-apply on save so the user sees their work — picker grid stays in sync.
      applyTheme(cleaned.id);
      applyCurrentTheme();
      state.editingGlassDraft = null;
      showToast(`Saved "${cleaned.name}"`, 'success');
      renderKeepingScroll();
    });

    // Live preview: every input event mutates the draft + repaints the
    // preview, but does NOT re-render the modal — that would lose focus
    // mid-typing. Hex/alpha labels next to each input are also patched
    // here for the same reason.
    overlay.querySelectorAll('[data-glass-field]').forEach(input =>
      input.addEventListener('input', () => {
        const d = state.editingGlassDraft;
        if (!d) return;
        const path = input.dataset.glassField;
        const val = input.value;
        if (path.includes('.')) {
          const [obj, key] = path.split('.');
          d[obj][key] = (key === 'alpha') ? parseInt(val, 10) : val;
        } else {
          d[path] = val;
        }
        // Patch hex / alpha display labels next to the input.
        const hexLabel = overlay.querySelector(`[data-glass-hex-for="${CSS.escape(path)}"]`);
        if (hexLabel) hexLabel.textContent = val;
        const alphaLabel = overlay.querySelector(`[data-glass-alpha-for="${CSS.escape(path)}"]`);
        if (alphaLabel) alphaLabel.textContent = val + '%';
        // Range inputs use a CSS variable to render the filled portion
        // of the track (Chromium has no equivalent of Firefox's ::range-progress).
        if (input.type === 'range') input.style.setProperty('--cga-fill', val + '%');
        paintCustomGlassPreview(d);
      }));
    // Initial fill paint for any range inputs that already exist.
    overlay.querySelectorAll('input[type="range"][data-glass-field]').forEach(r => {
      r.style.setProperty('--cga-fill', r.value + '%');
    });

    // Custom theme dropdown — open/close + select.
    const closeAllThemeMenus = () => {
      overlay.querySelectorAll('.theme-select-menu').forEach(m => { m.hidden = true; });
      overlay.querySelectorAll('.theme-select-btn.open').forEach(b => b.classList.remove('open'));
    };
    overlay.querySelectorAll('[data-theme-select-toggle]').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.themeSelectToggle;
        const menu = overlay.querySelector(`[data-theme-select-menu="${key}"]`);
        const isOpen = menu && !menu.hidden;
        closeAllThemeMenus();
        if (menu && !isOpen) {
          menu.hidden = false;
          btn.classList.add('open');
          // Scroll the currently selected option into view so the menu opens at the right place.
          const sel = menu.querySelector('.theme-select-option.selected');
          if (sel) sel.scrollIntoView({ block: 'nearest' });
        }
      }));
    overlay.querySelectorAll('[data-theme-pick]').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = btn.dataset.projectKey;
        const proj = state.data.projects[key];
        if (!proj) return;
        proj.theme = btn.dataset.themePick || null;
        saveData();
        applyCurrentTheme();
        renderApp();
        renderKeepingScroll();
      }));
    // closeAllThemeMenus is also used by the overlay click-outside handler set at the end of render().
    state._closeThemeMenusInOverlay = closeAllThemeMenus;

    overlay.querySelectorAll('.project-color-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        const key = btn.dataset.colorProject;
        const picker = overlay.querySelector(`[data-project-color-picker="${key}"]`);
        if (!picker) return;
        overlay.querySelectorAll('.project-color-picker').forEach(p => { if (p !== picker) p.hidden = true; });
        picker.hidden = !picker.hidden;
      }));

    overlay.querySelectorAll('[data-icon-upload]').forEach(btn =>
      btn.addEventListener('click', () => {
        const key = btn.dataset.iconUpload;
        const input = overlay.querySelector(`input[data-icon-input="${key}"]`);
        input?.click();
      }));
    overlay.querySelectorAll('.project-icon-input').forEach(inp =>
      inp.addEventListener('change', async (e) => {
        const key = inp.dataset.iconInput;
        const file = inp.files && inp.files[0];
        if (!file) return;
        const ok = await uploadProjectIcon(key, file);
        inp.value = '';
        if (ok) {
          renderApp();
          renderKeepingScroll();
        }
      }));
    overlay.querySelectorAll('[data-icon-remove]').forEach(btn =>
      btn.addEventListener('click', () => {
        if (removeProjectIcon(btn.dataset.iconRemove)) {
          renderApp();
          renderKeepingScroll();
          showToast('Icon removed.', 'info');
        }
      }));
    // Load any icon previews in the settings modal
    loadProjectIcons();

    overlay.querySelectorAll('[data-pick-color]').forEach(btn =>
      btn.addEventListener('click', () => {
        const key = btn.dataset.project;
        const color = btn.dataset.pickColor;
        const proj = state.data.projects[key];
        if (!proj) return;
        proj.color = color;
        saveData();
        applyCurrentTheme();
        renderApp();
        renderKeepingScroll();
      }));

    // Workspace features: visibility toggles (update sidebar only, don't rebuild modal)
    overlay.querySelectorAll('[data-nav-toggle]').forEach(cb =>
      cb.addEventListener('change', () => {
        const id = cb.dataset.navToggle;
        const prefs = loadNavPrefs();
        const entry = prefs.find(p => p.id === id);
        if (entry) entry.visible = cb.checked;
        saveNavPrefs(prefs);
        if (!cb.checked && state.view === id) {
          const first = prefs.find(p => p.visible);
          if (first) { state.view = first.id; renderContent(); }
        }
        renderSidebar();
      }));

    // Workspace features: drag-and-drop reorder (DOM-reorder in place, no modal rebuild)
    const list = overlay.querySelector('#nav-pref-list');
    if (list) {
      let dragSrcId = null;
      const clearTargetHighlight = () => {
        list.querySelectorAll('.nav-pref-item').forEach(r => r.classList.remove('drop-target'));
      };
      list.querySelectorAll('.nav-pref-item').forEach(row => {
        row.addEventListener('dragstart', (e) => {
          dragSrcId = row.dataset.navId;
          row.classList.add('dragging');
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', dragSrcId); } catch {}
          }
        });
        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          clearTargetHighlight();
          dragSrcId = null;
        });
        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          clearTargetHighlight();
          row.classList.add('drop-target');
        });
        row.addEventListener('dragleave', () => row.classList.remove('drop-target'));
        row.addEventListener('drop', (e) => {
          e.preventDefault();
          const targetId = row.dataset.navId;
          if (!dragSrcId || dragSrcId === targetId) { clearTargetHighlight(); return; }
          const prefs = loadNavPrefs();
          const fromIdx = prefs.findIndex(p => p.id === dragSrcId);
          const toIdx = prefs.findIndex(p => p.id === targetId);
          if (fromIdx === -1 || toIdx === -1) { clearTargetHighlight(); return; }
          const [moved] = prefs.splice(fromIdx, 1);
          prefs.splice(toIdx, 0, moved);
          saveNavPrefs(prefs);
          // Reorder the DOM in place — no full re-render, no scroll jump
          const srcEl = list.querySelector(`.nav-pref-item[data-nav-id="${dragSrcId}"]`);
          const tgtEl = list.querySelector(`.nav-pref-item[data-nav-id="${targetId}"]`);
          if (srcEl && tgtEl) list.insertBefore(srcEl, tgtEl);
          clearTargetHighlight();
          renderSidebar();
        });
      });
    }

    document.getElementById('nav-pref-reset')?.addEventListener('click', () => {
      localStorage.removeItem('navPrefs');
      renderApp();
      render();
    });

    document.getElementById('workflow-rueckbucher-toggle')?.addEventListener('change', e => {
      setRueckbucherButtonEnabled(e.target.checked);
      if (state.view === 'todos') renderTodos();
    });
    document.getElementById('dev-mode-toggle')?.addEventListener('change', e => {
      setDeveloperMode(e.target.checked);
      renderKeepingScroll();
    });
    document.getElementById('dev-ask-backups-toggle')?.addEventListener('change', e => {
      setAskForBackups(e.target.checked);
      if (e.target.checked) showToast('Backup prompt every 15 minutes enabled.', 'success');
      else showToast('Backup prompt disabled.', 'info');
    });
    document.getElementById('btn-manual-backup')?.addEventListener('click', () => runBackupNow());

    // Shared contexts editor
    const addSharedCtx = () => {
      const inp = document.getElementById('shared-context-input');
      if (!inp) return;
      const v = inp.value.trim();
      if (!v) return;
      if (addSharedContext(v)) {
        inp.value = '';
        renderKeepingScroll();
      } else {
        showToast('That context already exists.', 'info');
      }
    };
    document.getElementById('btn-shared-context-add')?.addEventListener('click', addSharedCtx);
    document.getElementById('shared-context-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addSharedCtx(); }
    });
    overlay.querySelectorAll('[data-remove-context]').forEach(btn =>
      btn.addEventListener('click', () => {
        removeSharedContext(btn.dataset.removeContext);
        renderKeepingScroll();
      }));

    document.getElementById('settings-close').onclick = close;
  };

  overlay.classList.remove('hidden');
  render();
  overlay.onclick = (e) => {
    if (e.target === overlay) { close(); return; }
    // Close any open theme dropdown when the click landed outside the dropdown.
    if (!e.target.closest('.theme-select')) state._closeThemeMenusInOverlay?.();
  };
}

