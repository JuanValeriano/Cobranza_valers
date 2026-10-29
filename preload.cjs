const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  exportPdfNative: (options) => ipcRenderer.invoke('export-pdf-native', options)
});

