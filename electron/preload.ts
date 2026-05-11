import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('ncea', {
  search: (query: string) => ipcRenderer.invoke('search', query),
  getStandard: (standardId) => ipcRenderer.invoke("ncea:getStandard", standardId),

  getPapers: (standardId: string) => ipcRenderer.invoke('get-papers', standardId),
  download: (paper: any, downloadPath: string) => ipcRenderer.invoke('download', paper, downloadPath),
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('set-config', key, value),
  getSources: () => ipcRenderer.invoke('get-sources'),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  openFolder: (path: string) => ipcRenderer.invoke('open-folder', path),
  getStorageUsage: () => ipcRenderer.invoke('get-storage-usage'),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  clearManifest: () => ipcRenderer.invoke('clear-manifest'),
  // Downloads management
  getDownloadsHistory: () => ipcRenderer.invoke('get-downloads-history'),
  addDownload: (downloadInfo: any) => ipcRenderer.invoke('add-download', downloadInfo),
  removeDownload: (downloadId: string) => ipcRenderer.invoke('remove-download', downloadId),
  clearDownloadsHistory: () => ipcRenderer.invoke('clear-downloads-history'),
  resetDownloadPath: () => ipcRenderer.invoke('reset-download-path'),
  // Window controls
  minimize: () => ipcRenderer.invoke('window-minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window-toggle-maximize'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  close: () => ipcRenderer.invoke('window-close'),
  onMaximizeChanged: (cb: (isMax: boolean) => void) => {
    const listener = (_: any, isMax: boolean) => cb(isMax)
    ipcRenderer.on('window-maximize-changed', listener)
    return () => ipcRenderer.removeListener('window-maximize-changed', listener)
  }
})