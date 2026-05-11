const { app, BrowserWindow, ipcMain, Notification, dialog, shell, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Must be set BEFORE the app is ready so Windows correctly groups
// taskbar icons and pinning works as one instance.
if (process.platform === 'win32') {
  app.setAppUserModelId('com.workspacehub.app');
}

// Make sure only one instance of the app runs at a time. Without this,
// clicking the pinned shortcut while the app is already open can spawn
// a second taskbar icon. We wrap the rest of initialization in an `if`
// guard (rather than calling process.exit) so Electron can cleanly tear
// down any helper processes it started before realizing another instance
// already has the lock.
const gotSingleInstance = app.requestSingleInstanceLock();
if (!gotSingleInstance) {
  app.quit();
} else {
  // Fired when a second instance was launched (e.g. user clicked the
  // pinned taskbar shortcut, ran `npm start` again, or — once §1.2 ships
  // — clicked the desktop/Start-menu shortcut). Defer to showMainWindow()
  // so all four states (destroyed, hidden-to-tray, minimized, visible)
  // route through one path. The pre-tray version only handled minimized;
  // hidden-to-tray would silently fail to surface the window, making the
  // pinned shortcut feel broken.
  // showMainWindow is a function declaration further down — hoisted, so
  // safe to reference here at module load time.
  app.on('second-instance', () => {
    showMainWindow();
  });
}

let mainWindow;
let tray;
let dataPath;
let projectsDir;
let reminderInterval;
// Tracks "the user actually wants out" vs "the user clicked the X button".
// Set true by the tray's Quit item and by app.on('before-quit'). The 'close'
// handler on mainWindow consults this to decide whether to hide-to-tray
// (default) or let destruction proceed (true quit, OS shutdown, restart for
// auto-updater, etc.).
let isQuitting = false;

// Per-load defaults: idempotent backfills of missing fields. Always run on
// every load. Schema-versioned one-shot migrations live in the renderer at
// src/10-schema-attachments.js (SCHEMA_MIGRATIONS dict); main.js's job is
// just (a) per-load default normalization and (b) pre-migration backup of
// the on-disk file before the renderer's runSchemaMigrations touches it.
function migrateData(data) {
  if (!data || !data.projects) return data;
  for (const proj of Object.values(data.projects)) {
    if (!Array.isArray(proj.subprojects)) proj.subprojects = [];
    for (const note of (proj.notes || [])) {
      if (note.subprojectId === undefined) note.subprojectId = null;
      if (!Array.isArray(note.linkedTodos)) note.linkedTodos = [];
    }
    for (const todo of (proj.todos || [])) {
      if (todo.subprojectId === undefined) todo.subprojectId = null;
      if (todo.startDate === undefined) todo.startDate = '';
    }
    if (proj.mindmap) delete proj.mindmap;
    if (!proj.brainmap || typeof proj.brainmap !== 'object') {
      proj.brainmap = makeDefaultBrainmap(proj.name || 'Workspace');
    }
    if (!proj.brainmap.rootId || !proj.brainmap.nodes || !proj.brainmap.nodes[proj.brainmap.rootId]) {
      proj.brainmap = makeDefaultBrainmap(proj.name || 'Workspace');
    }
    for (const bn of Object.values(proj.brainmap.nodes)) {
      if (bn.subprojectId === undefined) bn.subprojectId = null;
    }
  }
  return data;
}

// Pre-v4-migration backup. Called by loadData ONLY when the on-disk
// raw.schemaVersion is below 4 (the target the renderer's
// SCHEMA_MIGRATIONS[4] will bump to). Throws on any I/O failure so the
// caller can abort the migration path and keep the live data untouched.
// Backups accumulate; no auto-rotation in v0.1 (volume is bounded — one
// backup per schema-version migration per workspace).
//
// Session-flag guard: loadData can be called many times in one session
// (init's first call, periodic checkReminders ticks, IPC re-entry). All
// of those see the same pre-migration disk state until the renderer's
// post-migration saveData fires. Without this guard, every loadData
// re-entry would write a fresh backup. Once we've successfully written
// one backup this session, subsequent calls short-circuit and return
// the existing path. The flag resets on app restart, which is
// intentional — a new session with on-disk schemaVersion still < 4 IS
// a new migration attempt and deserves a fresh backup.
let v4BackupTakenThisSession = false;
let v4BackupPathThisSession = null;
function backupBeforeV4Migration() {
  if (v4BackupTakenThisSession) return v4BackupPathThisSession;
  const backupsDir = path.join(app.getPath('userData'), 'backups');
  try { fs.mkdirSync(backupsDir, { recursive: true }); } catch {}
  // ISO timestamp with millisecond precision; colons + dots stripped so
  // the path is filesystem-safe on Windows. Collisions are essentially
  // impossible at millisecond resolution.
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `workspace-data.pre-migration-v4.${ts}.json`);
  fs.copyFileSync(dataPath, backupPath);
  console.log('Pre-migration backup written to', backupPath);
  // Set flag AFTER successful copy so a copy failure doesn't suppress
  // future attempts in the same session.
  v4BackupTakenThisSession = true;
  v4BackupPathThisSession = backupPath;
  return backupPath;
}

function makeDefaultBrainmap(rootLabel) {
  const rootId = 'bm-root';
  return {
    rootId,
    nodes: {
      [rootId]: { id: rootId, parentId: null, label: rootLabel, color: null, side: null, collapsed: false, note: '', order: 0, subprojectId: null, linkedItems: [] }
    }
  };
}

function getDefaultData() {
  const now = new Date().toISOString();
  // Single neutral starter project + a generic example escalation chain to
  // demonstrate the Settings → Workflows feature on first launch. The future
  // onboarding wizard (M5 §1.3) will offer template choices; for now, fresh
  // installs land here. schemaVersion is intentionally NOT set: the renderer's
  // runSchemaMigrations walks fresh data through every shipped migration in
  // sequence, so all idempotent backfills run on first launch and the data
  // ends up at the latest version automatically.
  return {
    activeProject: 'workspace',
    projects: {
      'workspace': {
        name: 'My Workspace',
        subprojects: [],
        notes: [
          {
            id: 'note-welcome', title: 'Welcome to WorkspaceHub',
            content: 'This is your local-first workspace.\n\n**Quick start:**\n- Press Ctrl+K to open the command palette\n- Use the sidebar to switch between Notes, Todos, Reminders, and other views\n- Create new projects from the project switcher in the sidebar\n\nAll your data is stored locally on this device. Nothing leaves your computer.',
            priority: 'medium', tags: ['welcome'], subprojectId: null,
            linkedTodos: [], created: now, updated: now
          }
        ],
        todos: [],
        brainmap: makeDefaultBrainmap('My Workspace'),
        reminders: []
      }
    },
    escalationChains: [
      {
        id: 'chain-example-3-step',
        name: 'Example: 3-step follow-up',
        items: [
          { title: 'Day 7 check-in',   offset: { days: 7 } },
          { title: 'Day 14 follow-up', offset: { days: 14 } },
          { title: 'Final reminder',   offset: { days: 14, plusWorkdays: 3 } }
        ]
      }
    ]
  };
}

// Hardened load pipeline. Failures at each stage have a specific recovery:
//   - file missing            → fresh seed (getDefaultData)
//   - read error              → fresh seed (disk problem; safer than crash)
//   - JSON parse error        → fresh seed (file is corrupted; user has
//                               %APPDATA% backup history if needed)
//   - backup error            → return raw UNTOUCHED, skip migration
//                               (user fixes backup target, relaunches; data
//                               sits in v1 shape, fully readable by code)
//   - migrateData throw       → return raw UNMIGRATED so the user keeps the
//                               full workspace; schemaVersion stays unbumped,
//                               migration retries next launch
function loadData() {
  if (!fs.existsSync(dataPath)) {
    return getDefaultData();
  }

  let rawText;
  try {
    rawText = fs.readFileSync(dataPath, 'utf-8');
  } catch (e) {
    console.error('workspace-data.json unreadable; falling back to default seed:', e);
    return getDefaultData();
  }

  let raw;
  try {
    raw = JSON.parse(rawText);
  } catch (e) {
    console.error('workspace-data.json contains invalid JSON; falling back to default seed:', e);
    return getDefaultData();
  }

  // Pre-migration backup — gated on raw.schemaVersion below the renderer's
  // CURRENT_SCHEMA_VERSION (currently 4). Defensive: even if the backup
  // returns successfully but the renderer-side migration later throws, the
  // backup is still on disk for manual recovery. If the backup ITSELF fails
  // for any reason (disk full, permissions), we refuse to surface the data
  // for migration and return it unmodified — user fixes backup target and
  // relaunches; nothing is lost.
  //
  // The 4 here is hardcoded (not imported from the renderer) because main
  // and renderer don't share globals at module load. When future schema
  // versions ship, bump this constant alongside CURRENT_SCHEMA_VERSION in
  // src/10-schema-attachments.js.
  if (typeof raw.schemaVersion !== 'number' || raw.schemaVersion < 4) {
    try {
      backupBeforeV4Migration();
    } catch (e) {
      console.error('Pre-migration backup failed; skipping migration to preserve data integrity:', e);
      return raw;
    }
  }

  let migrated;
  try {
    migrated = migrateData(raw);
  } catch (e) {
    console.error('Migration threw; returning UNMIGRATED data so user keeps full workspace:', e);
    return raw;
  }

  const migratedText = JSON.stringify(migrated, null, 2);
  if (migratedText !== rawText) {
    try {
      fs.writeFileSync(dataPath, migratedText, 'utf-8');
    } catch (e) {
      console.error('Failed to persist migrated data:', e);
    }
  }
  return migrated;
}

function saveData(data) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to save data:', e);
    return false;
  }
}

// ===== ATTACHMENTS =====
function ensureProjectsDir() {
  if (!projectsDir) projectsDir = path.join(app.getPath('userData'), 'projects');
  if (!fs.existsSync(projectsDir)) fs.mkdirSync(projectsDir, { recursive: true });
  return projectsDir;
}

function sanitizeFolderName(name) {
  return (name || 'project').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/\s+/g, '_').slice(0, 80) || 'project';
}

function sanitizeFilename(name) {
  return (name || 'file').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 200);
}

function ensureProjectAttachmentsDir(projectKey) {
  const base = ensureProjectsDir();
  const safeKey = sanitizeFolderName(projectKey || 'default');
  const dir = path.join(base, safeKey, 'attachments');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function uniqueDestPath(dir, filename) {
  const safe = sanitizeFilename(filename);
  const ext = path.extname(safe);
  const stem = path.basename(safe, ext);
  let candidate = path.join(dir, safe);
  let i = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(dir, `${stem} (${i})${ext}`);
    i++;
  }
  return candidate;
}

function makeAttachmentMeta(projectKey, fullPath, originalName) {
  const stats = fs.statSync(fullPath);
  const storedName = path.basename(fullPath);
  const safeKey = sanitizeFolderName(projectKey || 'default');
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: originalName || storedName,
    storedName,
    size: stats.size,
    added: new Date().toISOString(),
    relPath: ['projects', safeKey, 'attachments', storedName].join('/')
  };
}

function saveAttachmentBytes(projectKey, base64, originalName) {
  const dir = ensureProjectAttachmentsDir(projectKey);
  const dest = uniqueDestPath(dir, originalName || 'file');
  fs.writeFileSync(dest, Buffer.from(base64, 'base64'));
  return makeAttachmentMeta(projectKey, dest, path.basename(dest));
}

function saveAttachmentFromPath(projectKey, srcPath) {
  const dir = ensureProjectAttachmentsDir(projectKey);
  const dest = uniqueDestPath(dir, path.basename(srcPath));
  fs.copyFileSync(srcPath, dest);
  return makeAttachmentMeta(projectKey, dest, path.basename(dest));
}

function resolveInsideProjects(relPath) {
  if (!relPath) return null;
  const base = ensureProjectsDir();
  const resolved = path.resolve(path.join(app.getPath('userData'), relPath));
  if (!resolved.startsWith(path.resolve(base))) return null;
  return resolved;
}

function deleteAttachment(relPath) {
  try {
    const resolved = resolveInsideProjects(relPath);
    if (!resolved) return false;
    if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
    return true;
  } catch (e) {
    console.error('Failed to delete attachment:', e);
    return false;
  }
}

function openAttachment(relPath) {
  try {
    const resolved = resolveInsideProjects(relPath);
    if (!resolved) return 'invalid path';
    return shell.openPath(resolved);
  } catch (e) {
    console.error('Failed to open attachment:', e);
    return e.message;
  }
}

function openProjectFolder(projectKey) {
  try {
    const dir = ensureProjectAttachmentsDir(projectKey);
    return shell.openPath(dir);
  } catch (e) {
    console.error('Failed to open project folder:', e);
    return e.message;
  }
}

const INLINE_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4'
};

const MAX_INLINE_BYTES = 16 * 1024 * 1024; // 16 MB cap for inlining

function readAttachmentDataUrl(relPath) {
  try {
    const resolved = resolveInsideProjects(relPath);
    if (!resolved) return null;
    if (!fs.existsSync(resolved)) return null;
    const ext = path.extname(resolved).toLowerCase().replace('.', '');
    const mime = INLINE_MIME[ext];
    if (!mime) return null;
    const stats = fs.statSync(resolved);
    if (stats.size > MAX_INLINE_BYTES) return null;
    const buf = fs.readFileSync(resolved);
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (e) {
    console.error('readAttachmentDataUrl:', e);
    return null;
  }
}

function checkReminders() {
  const data = loadData();
  const now = new Date();
  let changed = false;
  for (const [projectKey, project] of Object.entries(data.projects)) {
    for (const reminder of project.reminders) {
      if (!reminder.fired && reminder.datetime) {
        if (new Date(reminder.datetime) <= now) {
          if (Notification.isSupported()) {
            new Notification({ title: `[${project.name}] ${reminder.title}`, body: reminder.note || 'Reminder!' }).show();
          }
          reminder.fired = true;
          changed = true;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('reminder-fired', { project: projectKey, reminder });
          }
        }
      }
    }
  }
  if (changed) saveData(data);
}

function createWindow() {
  const iconPath = path.join(__dirname, 'icons', 'workspacehub.ico');
  const opts = {
    width: 1280, height: 820, minWidth: 960, minHeight: 640,
    frame: false, backgroundColor: '#0f172a',
    title: 'WorkspaceHub',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  };
  if (fs.existsSync(iconPath)) opts.icon = iconPath;
  mainWindow = new BrowserWindow(opts);
  mainWindow.loadFile('index.html');

  // Hide-to-tray on user close. Lets the app stay process-resident so the
  // global hotkey (§M1 §4.1b) can capture from anywhere even when the main
  // window is hidden. isQuitting is set by the tray's Quit item, by
  // app.on('before-quit'), and by future auto-updater restart flow.
  // If the tray failed to construct (icon missing, permissions, etc.) we
  // fall through to normal close so the user is never trapped without an
  // exit path.
  mainWindow.on('close', (e) => {
    if (!isQuitting && tray && !tray.isDestroyed()) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on('closed', () => { mainWindow = null; });

  // Windows-only: tell the taskbar how to identify + relaunch this app when
  // the user right-clicks the running icon -> Pin to taskbar. Without this,
  // Windows falls back to electron.exe's default icon/identity and the pin
  // becomes a separate entry from the running instance.
  if (process.platform === 'win32') {
    try {
      mainWindow.setAppDetails({
        appId: 'com.workspacehub.app',
        appIconPath: fs.existsSync(iconPath) ? iconPath : undefined,
        appIconIndex: 0,
        relaunchCommand: `"${process.execPath}" "${__dirname}"`,
        relaunchDisplayName: 'WorkspaceHub'
      });
    } catch (e) {
      console.error('setAppDetails failed:', e);
    }
  }
}

// ===== TRAY =====
// Active in both personal and distribution builds. Reuses the existing
// app icon at icons/workspacehub.ico (also used by the BrowserWindow and
// by setAppDetails for taskbar identity). Single-click and "Open" menu
// item bring the window back from hide-to-tray; "Quit" is the only way
// to truly exit while the tray is alive.
//
// Packaging note (M1 §1.2): when we wire electron-builder, icons/** must
// be added to asarUnpack — Tray construction reads the .ico via a native
// handle and asar-internal paths are not always honored. Failure here
// degrades gracefully: tray is skipped, hide-to-tray short-circuits, and
// the X button quits as before.
function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    try { createWindow(); } catch (e) { console.error('recreate window failed:', e); }
    return;
  }
  // restore() before show() — handles the rare hidden+minimized combo
  // (e.g. minimized first, then hidden into tray). show() alone doesn't
  // always un-minimize on Windows.
  if (mainWindow.isMinimized()) mainWindow.restore();
  if (!mainWindow.isVisible()) mainWindow.show();
  mainWindow.focus();
  // moveTop() asserts z-order against Win11 focus-stealing prevention
  // without touching the user's always-on-top preference (the Sticky
  // Mode IPC owns that). Best-effort; no-op on macOS.
  if (typeof mainWindow.moveTop === 'function') {
    try { mainWindow.moveTop(); } catch {}
  }
}

function createTray() {
  const iconPath = path.join(__dirname, 'icons', 'workspacehub.ico');
  if (!fs.existsSync(iconPath)) {
    console.warn('Tray icon missing at', iconPath, '— tray skipped (close-X will quit as before)');
    return;
  }
  try {
    tray = new Tray(iconPath);
  } catch (e) {
    console.error('Tray construction failed — tray skipped:', e);
    tray = null;
    return;
  }
  tray.setToolTip('WorkspaceHub');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open WorkspaceHub', click: showMainWindow },
    { type: 'separator' },
    {
      label: 'Quit WorkspaceHub',
      click: () => {
        // Setting isQuitting up front means the 'close' handler lets the
        // window proceed to destruction instead of hiding it back to tray.
        isQuitting = true;
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);

  // Single-click reopen on Win/Linux. On macOS, single-click natively shows
  // the context menu via setContextMenu — don't double-bind.
  tray.on('click', () => {
    if (process.platform !== 'darwin') showMainWindow();
  });
}

app.whenReady().then(() => {
  // If another instance already holds the lock, skip bootstrapping entirely
  // — we're in the middle of quitting, and creating a window here is what
  // causes the double-instance / double-icon symptom on the taskbar.
  if (!gotSingleInstance) return;
  dataPath = path.join(app.getPath('userData'), 'workspace-data.json');
  const { session } = require('electron');
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media') return callback(true);
    callback(false);
  });
  createWindow();
  createTray();
  reminderInterval = setInterval(checkReminders, 60000);
});

// Set the quit flag before windows start closing so the 'close' interceptor
// on mainWindow lets destruction through instead of hiding to tray. Fires
// for app.quit(), OS shutdown, and (later) electron-updater's restart flow.
app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // With hide-to-tray, this event normally won't fire — closing X just
  // hides. It DOES fire when isQuitting is true (real quit path), and on
  // platforms/builds where the tray failed to construct (degraded mode:
  // app behaves as before, X quits, no background residency).
  if (process.platform === 'darwin') return;
  clearInterval(reminderInterval);
  if (tray && !tray.isDestroyed()) {
    try { tray.destroy(); } catch (e) { console.error('tray.destroy failed:', e); }
  }
  app.quit();
});

ipcMain.handle('load-data', () => loadData());
ipcMain.handle('save-data', (_, data) => saveData(data));
ipcMain.handle('win-minimize', () => mainWindow && mainWindow.minimize());
ipcMain.handle('win-maximize', () => { if (!mainWindow) return; mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); });
ipcMain.handle('win-close', () => { if (mainWindow) mainWindow.close(); });
ipcMain.handle('win-toggle-fullscreen', () => {
  if (!mainWindow) return false;
  const next = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(next);
  return next;
});
ipcMain.handle('win-set-always-on-top', (_, on) => {
  if (!mainWindow) return false;
  // 'pop-up-menu' beats Windows 11's recent focus-stealing behaviour where
  // 'floating' loses the z-order battle to most user apps. It also sits
  // above the taskbar — what users expect from a "pin to top" mode. On
  // macOS the level is treated identically by the OS, so this also works
  // there. moveTop() asserts the z-order immediately rather than waiting
  // for the next focus event.
  mainWindow.setAlwaysOnTop(!!on, 'pop-up-menu');
  if (on && typeof mainWindow.moveTop === 'function') {
    try { mainWindow.moveTop(); } catch {}
  }
  return mainWindow.isAlwaysOnTop();
});
ipcMain.handle('win-set-sticky-bounds', (_, opts) => {
  if (!mainWindow) return null;
  const compact = opts && opts.compact;
  if (compact) {
    const b = mainWindow.getBounds();
    if (!mainWindow._preStickyBounds) {
      mainWindow._preStickyBounds = { x: b.x, y: b.y, width: b.width, height: b.height };
      mainWindow._preStickyMin = mainWindow.getMinimumSize();
    }
    mainWindow.setMinimumSize(200, 80);
    const display = require('electron').screen.getDisplayMatching(b).workArea;
    const w = Math.max(200, Math.min(500, (opts && opts.width) || 280));
    const h = Math.max(80, Math.min(display.height - 60, (opts && opts.height) || 320));
    mainWindow.setBounds({
      x: display.x + display.width - w - 20,
      y: display.y + 40,
      width: w,
      height: h
    }, false);
  } else if (mainWindow._preStickyBounds) {
    if (mainWindow._preStickyMin) {
      mainWindow.setMinimumSize(mainWindow._preStickyMin[0], mainWindow._preStickyMin[1]);
      mainWindow._preStickyMin = null;
    }
    mainWindow.setBounds(mainWindow._preStickyBounds, false);
    mainWindow._preStickyBounds = null;
  }
  return mainWindow.getBounds();
});
ipcMain.handle('check-reminders-now', () => checkReminders());

ipcMain.handle('attachment-save', (_, payload) => {
  try {
    const { projectKey, base64, name } = payload || {};
    if (!projectKey) return { ok: false, error: 'no project' };
    if (!base64) return { ok: false, error: 'no data' };
    const att = saveAttachmentBytes(projectKey, base64, name);
    return { ok: true, attachment: att };
  } catch (e) {
    console.error('attachment-save:', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('attachment-pick', async (_, projectKey) => {
  try {
    if (!mainWindow) return { ok: false, error: 'no window' };
    if (!projectKey) return { ok: false, error: 'no project' };
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      title: 'Add attachments'
    });
    if (result.canceled || !result.filePaths.length) return { ok: true, attachments: [] };
    const attachments = result.filePaths.map(p => saveAttachmentFromPath(projectKey, p));
    return { ok: true, attachments };
  } catch (e) {
    console.error('attachment-pick:', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('attachment-open', (_, relPath) => openAttachment(relPath));
ipcMain.handle('attachment-delete', (_, relPath) => deleteAttachment(relPath));
ipcMain.handle('attachment-open-folder', (_, projectKey) => openProjectFolder(projectKey));
ipcMain.handle('attachment-read-datauri', (_, relPath) => readAttachmentDataUrl(relPath));

ipcMain.handle('create-backup', async () => {
  try {
    const scriptPath = path.join(__dirname, 'tmp', 'make-backup.ps1');
    if (!fs.existsSync(scriptPath)) {
      return { ok: false, error: `Backup script missing: ${scriptPath}` };
    }
    return await new Promise((resolve) => {
      exec(
        `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
        { windowsHide: true, maxBuffer: 10 * 1024 * 1024 },
        (err, stdout, stderr) => {
          if (err) {
            resolve({ ok: false, error: (stderr || err.message || '').trim() });
            return;
          }
          const out = (stdout || '').trim();
          const match = out.match(/Backup created:\s*(.+\.zip)\s*\((.+?)\)/);
          if (match) {
            resolve({ ok: true, file: match[1].trim(), size: match[2].trim(), output: out });
          } else {
            resolve({ ok: true, output: out });
          }
        }
      );
    });
  } catch (e) {
    console.error('create-backup:', e);
    return { ok: false, error: e.message };
  }
});