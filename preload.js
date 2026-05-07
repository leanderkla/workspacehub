const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Zoom is exposed through the Electron webFrame so the entire viewport
  // rescales (no leftover dark band that document.body.style.zoom leaves
  // behind when zooming out). Levels follow Chromium's convention: 0 = 100 %,
  // each ±1 step is roughly ±20 %.
  zoomGet: () => webFrame.getZoomLevel(),
  zoomSet: (level) => { webFrame.setZoomLevel(level); return webFrame.getZoomLevel(); },
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  winMinimize: () => ipcRenderer.invoke('win-minimize'),
  winMaximize: () => ipcRenderer.invoke('win-maximize'),
  winClose: () => ipcRenderer.invoke('win-close'),
  winSetAlwaysOnTop: (on) => ipcRenderer.invoke('win-set-always-on-top', on),
  winSetStickyBounds: (opts) => ipcRenderer.invoke('win-set-sticky-bounds', opts),
  winToggleFullscreen: () => ipcRenderer.invoke('win-toggle-fullscreen'),
  checkRemindersNow: () => ipcRenderer.invoke('check-reminders-now'),
  onReminderFired: (cb) => ipcRenderer.on('reminder-fired', (_, data) => cb(data)),
  saveAttachment: (projectKey, base64, name) => ipcRenderer.invoke('attachment-save', { projectKey, base64, name }),
  pickAttachments: (projectKey) => ipcRenderer.invoke('attachment-pick', projectKey),
  openAttachment: (relPath) => ipcRenderer.invoke('attachment-open', relPath),
  deleteAttachment: (relPath) => ipcRenderer.invoke('attachment-delete', relPath),
  openProjectFolder: (projectKey) => ipcRenderer.invoke('attachment-open-folder', projectKey),
  readAttachmentDataUrl: (relPath) => ipcRenderer.invoke('attachment-read-datauri', relPath),
  createBackup: () => ipcRenderer.invoke('create-backup')
});