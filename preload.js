const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  winMinimize: () => ipcRenderer.invoke('win-minimize'),
  winMaximize: () => ipcRenderer.invoke('win-maximize'),
  winClose: () => ipcRenderer.invoke('win-close'),
  winSetAlwaysOnTop: (on) => ipcRenderer.invoke('win-set-always-on-top', on),
  winSetStickyBounds: (opts) => ipcRenderer.invoke('win-set-sticky-bounds', opts),
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