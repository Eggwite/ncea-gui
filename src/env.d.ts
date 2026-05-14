interface Window {
  ncea: {
    search: (query: string) => Promise<any[]>
    getStandard: (standardId: string) => Promise<any>
    getPapers: (standardId: string, forceRefresh?: boolean) => Promise<any[]>
    download: (paper: any, downloadPath: string, id?: string) => Promise<any>
    getConfig: () => Promise<{ downloadPath?: string; favoriteSource?: string; alwaysRefresh?: boolean }>
    setConfig: (key: string, value: any) => Promise<boolean>
    getSources: () => Promise<Array<{ value: string; label: string }>>
    pickFolder: () => Promise<string | null>
    openFolder: (path: string) => Promise<any>
    openCacheFolder: () => Promise<any>
    openManifestFolder: () => Promise<any>
    getStorageUsage: () => Promise<{ cache: string; manifest: string; total: string } | null>
    clearCache: () => Promise<any>
    clearManifest: () => Promise<any>
    getDownloadsHistory: () => Promise<any[]>
    addDownload: (downloadInfo: any) => Promise<boolean>
    removeDownload: (downloadId: string) => Promise<boolean>
    clearDownloadsHistory: () => Promise<boolean>
    verifyDownloads: (paths: string[]) => Promise<Array<{ path: string; exists: boolean }>>
    resetDownloadPath: () => Promise<string>
    onDownloadProgress: (callback: (progress: { id: string; progress: number }) => void) => () => void
    onDownloadsHistoryChanged: (callback: () => void) => () => void
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<void>
    isMaximized: () => Promise<boolean>
    close: () => Promise<void>
    onMaximizeChanged: (callback: (isMaximized: boolean) => void) => () => void
    onPapersProgress: (callback: (progress: { completed: number; total: number; adapter?: string; error?: boolean; timeout?: boolean; message?: string }) => void) => () => void
  }
}
declare const __APP_VERSION__: string
