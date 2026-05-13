import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('ncea', {
  search: (query: string) => ipcRenderer.invoke('search', query),
  getStandard: (standardId) => ipcRenderer.invoke("ncea:getStandard", standardId),

  getPapers: (standardId: string) => ipcRenderer.invoke('get-papers', standardId),
  onPapersProgress: (cb: (progress: any) => void) => {
    const listener = (_: any, progress: any) => cb(progress)
    ipcRenderer.on('papers-progress', listener)
    return () => ipcRenderer.removeListener('papers-progress', listener)
  },
  download: (paper: any, downloadPath: string, id?: string) => ipcRenderer.invoke('download', paper, downloadPath, id),
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (key: string, value: any) => ipcRenderer.invoke('set-config', key, value),
  getSources: () => ipcRenderer.invoke('get-sources'),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  openFolder: (path: string) => ipcRenderer.invoke('open-folder', path),
  openCacheFolder: () => ipcRenderer.invoke('open-cache-folder'),
  openManifestFolder: () => ipcRenderer.invoke('open-manifest-folder'),
  getStorageUsage: () => ipcRenderer.invoke('get-storage-usage'),
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  clearManifest: () => ipcRenderer.invoke('clear-manifest'),
  // Downloads management
  getDownloadsHistory: () => ipcRenderer.invoke('get-downloads-history'),
  addDownload: (downloadInfo: any) => ipcRenderer.invoke('add-download', downloadInfo),
  removeDownload: (downloadId: string) => ipcRenderer.invoke('remove-download', downloadId),
  clearDownloadsHistory: () => ipcRenderer.invoke('clear-downloads-history'),
  verifyDownloads: (paths: string[]) => ipcRenderer.invoke('verify-downloads', paths),
  resetDownloadPath: () => ipcRenderer.invoke('reset-download-path'),
  onDownloadProgress: (cb: (progress: { id: string; progress: number }) => void) => {
    const listener = (_: any, progress: any) => cb(progress)
    ipcRenderer.on('download-progress', listener)
    return () => ipcRenderer.removeListener('download-progress', listener)
  },
  onDownloadsHistoryChanged: (cb: () => void) => {
    const listener = () => cb()
    ipcRenderer.on('downloads-history-changed', listener)
    return () => ipcRenderer.removeListener('downloads-history-changed', listener)
  },
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