interface Window {
  ncea: {
    search: (query: string) => Promise<any[]>
    getPapers: (standardId: string) => Promise<any[]>
    download: (paper: any, downloadPath: string) => Promise<any>
    getConfig: () => Promise<{ downloadPath?: string; favoriteSource?: string; alwaysRefresh?: boolean }>
    setConfig: (key: string, value: any) => Promise<boolean>
    getSources: () => Promise<Array<{ value: string; label: string }>>
    pickFolder: () => Promise<string | null>
    openFolder: (path: string) => Promise<any>
    getStorageUsage: () => Promise<{ cache: string; manifest: string; total: string } | null>
    clearCache: () => Promise<any>
    clearManifest: () => Promise<any>
  }
}