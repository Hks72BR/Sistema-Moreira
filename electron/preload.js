const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  // Fotos locais
  savePhoto: (fileName, dataBase64) => ipcRenderer.invoke('photo:save', fileName, dataBase64),
  readPhoto: (fileName) => ipcRenderer.invoke('photo:read', fileName),
  deletePhoto: (fileName) => ipcRenderer.invoke('photo:delete', fileName),
  listPhotos: () => ipcRenderer.invoke('photo:list'),
});
