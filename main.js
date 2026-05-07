const { app, BrowserWindow, ipcMain, Notification, dialog, shell } = require('electron');
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
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      try { createWindow(); } catch (e) { console.error('recreate window failed', e); }
    }
  });
}

let mainWindow;
let dataPath;
let projectsDir;
let reminderInterval;

// Personal-build flag. The plain `npm start` ships a generic "My Workspace"
// project; `npm run start:personal` (which sets WORKSPACEHUB_PERSONAL=1) loads
// the Energy Hero + AI5innovation seed, the Rückbucher workflow UI, and the
// energy-hero brainmap import. The .trim() defends against cmd.exe leaving a
// trailing space in the value when `set FOO=1 && ...` syntax is used.
const IS_PERSONAL_BUILD = (process.env.WORKSPACEHUB_PERSONAL || '').trim() === '1';

const ENERGY_HERO_SEED_VERSION = 2;

let _cachedEnergyHeroBrainmap = null;
function loadEnergyHeroBrainmap() {
  // The energy-hero brainmap seed is personal data and is excluded from the
  // distribution build. Returning null in non-personal mode lets every caller
  // fall back to the generic makeDefaultBrainmap() path without conditionals.
  if (!IS_PERSONAL_BUILD) return null;
  if (_cachedEnergyHeroBrainmap) return _cachedEnergyHeroBrainmap;
  try {
    const p = path.join(__dirname, 'data', 'energy-hero-brainmap.json');
    const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
    _cachedEnergyHeroBrainmap = raw;
    return raw;
  } catch (e) {
    console.error('Failed to load energy-hero brainmap seed:', e);
    return null;
  }
}

// Migrate existing data to include new fields without losing anything
function migrateData(data) {
  if (!data || !data.projects) return data;
  for (const [projKey, proj] of Object.entries(data.projects)) {
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

    // Force-replace Energy Hero brainmap with the Miro import on first load
    // after upgrade. Gated by seedVersion so we only do it once, and by
    // IS_PERSONAL_BUILD so distribution builds never touch Energy-Hero seed
    // data even if a user imports a personal JSON dump.
    if (IS_PERSONAL_BUILD &&
        projKey === 'energy-hero' &&
        (proj.brainmap.seedVersion || 0) < ENERGY_HERO_SEED_VERSION) {
      const seed = loadEnergyHeroBrainmap();
      if (seed) {
        proj.brainmap = JSON.parse(JSON.stringify(seed));
      }
    }
  }
  return data;
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

  // Distribution build — neutral single-project seed. No branded content,
  // no personal projects. Anything else (templates, multi-project starter
  // packs, etc.) lives in a future onboarding wizard, not here.
  if (!IS_PERSONAL_BUILD) {
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
      }
    };
  }

  // Personal build — Energy Hero + AI5innovation seed.
  const d = (offset) => {
    const dd = new Date(); dd.setDate(dd.getDate() + offset);
    return dd.toISOString().split('T')[0];
  };
  return {
    activeProject: 'energy-hero',
    projects: {
      'energy-hero': {
        name: 'Energy Hero',
        subprojects: [
          { id: 'sp-eh-1', name: 'Q2 Campaign', description: 'Energy Hero Q2 marketing initiative', color: '#3b82f6' }
        ],
        notes: [
          {
            id: 'note-eh-1', title: 'Campaign Brief',
            content: 'Key messages and goals for the Q2 campaign.\n\n- Target audience: SME energy managers\n- Core message: Save 30% on energy bills\n- Channels: LinkedIn, email, webinar',
            priority: 'high', tags: ['campaign'], subprojectId: 'sp-eh-1',
            linkedTodos: ['todo-eh-1'], created: now, updated: now
          },
          {
            id: 'note-eh-2', title: 'Welcome to Energy Hero',
            content: 'This is your workspace for Energy Hero.\n\nUse Subprojects to group related notes, todos, and track progress with a Gantt chart.',
            priority: 'medium', tags: ['welcome'], subprojectId: null,
            linkedTodos: [], created: now, updated: now
          }
        ],
        todos: [
          { id: 'todo-eh-1', title: 'Design campaign mockups', done: false, priority: 'high', startDate: d(0), dueDate: d(7), subprojectId: 'sp-eh-1', created: now },
          { id: 'todo-eh-2', title: 'Write copy', done: false, priority: 'medium', startDate: d(5), dueDate: d(14), subprojectId: 'sp-eh-1', created: now },
          { id: 'todo-eh-3', title: 'Review & approve', done: false, priority: 'low', startDate: d(14), dueDate: d(21), subprojectId: 'sp-eh-1', created: now },
          { id: 'todo-eh-4', title: 'Set up workspace', done: true, priority: 'high', startDate: '', dueDate: '', subprojectId: null, created: now }
        ],
        brainmap: JSON.parse(JSON.stringify(loadEnergyHeroBrainmap() || makeDefaultBrainmap('Energy Hero'))),
        reminders: []
      },
      'ai5innovation': {
        name: 'AI5innovation',
        subprojects: [
          { id: 'sp-ai-1', name: 'MVP Launch', description: 'First product release milestone', color: '#8b5cf6' }
        ],
        notes: [
          {
            id: 'note-ai-1', title: 'MVP Scope',
            content: 'Define what goes into the first release.\n\n- Core AI feature\n- Basic user auth\n- Dashboard v1',
            priority: 'high', tags: ['mvp'], subprojectId: 'sp-ai-1',
            linkedTodos: ['todo-ai-1'], created: now, updated: now
          },
          {
            id: 'note-ai-2', title: 'AI5innovation Workspace',
            content: 'Your workspace for AI5innovation.\n\nCreate subprojects to track major initiatives and use the Gantt view to plan timelines.',
            priority: 'medium', tags: ['welcome'], subprojectId: null,
            linkedTodos: [], created: now, updated: now
          }
        ],
        todos: [
          { id: 'todo-ai-1', title: 'Define MVP scope', done: false, priority: 'high', startDate: d(0), dueDate: d(7), subprojectId: 'sp-ai-1', created: now },
          { id: 'todo-ai-2', title: 'Build prototype', done: false, priority: 'high', startDate: d(7), dueDate: d(21), subprojectId: 'sp-ai-1', created: now },
          { id: 'todo-ai-3', title: 'User testing', done: false, priority: 'medium', startDate: d(21), dueDate: d(30), subprojectId: 'sp-ai-1', created: now },
          { id: 'todo-ai-4', title: 'Launch prep', done: false, priority: 'low', startDate: d(28), dueDate: d(35), subprojectId: 'sp-ai-1', created: now }
        ],
        brainmap: {
          rootId: 'bm-ai-root',
          nodes: {
            'bm-ai-root':  { id: 'bm-ai-root',  parentId: null,          label: 'AI5innovation', color: null,      side: null,    collapsed: false, note: '', order: 0, subprojectId: null },
            'bm-ai-res':   { id: 'bm-ai-res',   parentId: 'bm-ai-root',  label: 'Research',      color: '#7c3aed', side: 'right', collapsed: false, note: '', order: 0, subprojectId: null },
            'bm-ai-prod':  { id: 'bm-ai-prod',  parentId: 'bm-ai-root',  label: 'Product',       color: '#3b82f6', side: 'right', collapsed: false, note: '', order: 1, subprojectId: 'sp-ai-1' },
            'bm-ai-ops':   { id: 'bm-ai-ops',   parentId: 'bm-ai-root',  label: 'Operations',    color: '#f59e0b', side: 'left',  collapsed: false, note: '', order: 0, subprojectId: null },
            'bm-ai-comm':  { id: 'bm-ai-comm',  parentId: 'bm-ai-root',  label: 'Community',     color: '#ec4899', side: 'left',  collapsed: false, note: '', order: 1, subprojectId: null },
            'bm-ai-r1':    { id: 'bm-ai-r1',    parentId: 'bm-ai-res',   label: 'Models',        color: null,      side: null,    collapsed: false, note: '', order: 0, subprojectId: null },
            'bm-ai-r2':    { id: 'bm-ai-r2',    parentId: 'bm-ai-res',   label: 'Datasets',      color: null,      side: null,    collapsed: false, note: '', order: 1, subprojectId: null },
            'bm-ai-p1':    { id: 'bm-ai-p1',    parentId: 'bm-ai-prod',  label: 'MVP',           color: null,      side: null,    collapsed: false, note: '', order: 0, subprojectId: 'sp-ai-1' },
            'bm-ai-p2':    { id: 'bm-ai-p2',    parentId: 'bm-ai-prod',  label: 'Dashboard',     color: null,      side: null,    collapsed: false, note: '', order: 1, subprojectId: null },
            'bm-ai-c1':    { id: 'bm-ai-c1',    parentId: 'bm-ai-comm',  label: 'Discord',       color: null,      side: null,    collapsed: false, note: '', order: 0, subprojectId: null },
            'bm-ai-c2':    { id: 'bm-ai-c2',    parentId: 'bm-ai-comm',  label: 'Newsletter',    color: null,      side: null,    collapsed: false, note: '', order: 1, subprojectId: null }
          }
        },
        reminders: []
      }
    }
  };
}

function loadData() {
  try {
    if (fs.existsSync(dataPath)) {
      const rawText = fs.readFileSync(dataPath, 'utf-8');
      const raw = JSON.parse(rawText);
      const migrated = migrateData(raw);
      // If migration changed the brainmap seed, persist immediately so the
      // one-time forced replacement isn't redone on every launch.
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
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return getDefaultData();
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
  reminderInterval = setInterval(checkReminders, 60000);
});

app.on('window-all-closed', () => { clearInterval(reminderInterval); if (process.platform !== 'darwin') app.quit(); });

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