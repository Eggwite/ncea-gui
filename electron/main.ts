import { app, BrowserWindow, dialog, shell } from 'electron'
import fs from 'fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { ipcMain, Menu } from 'electron'
import { SearchAggregator } from './core/search.js'
import { DownloadService } from './core/downloader.js'
import { ManifestService } from './core/manifest.js'
import { CacheService } from './core/cache.js'
import { config } from './core/config.js'
import {
  getAppConfig,
  setAppConfig,
  resetDownloadPath,
  getDownloadsHistory,
  addDownloadToHistory,
  removeDownloadFromHistory,
  clearDownloadsHistory,
  expandPath,
} from './core/configManager.js'
import { getStorageUsage } from './utils/storage.js'
import { formatBytes } from './utils/format.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const aggregator = new SearchAggregator()
const manifestService = new ManifestService()

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

Menu.setApplicationMenu(null)

const supportsPublicUpdateService = process.platform === 'win32' || process.platform === 'darwin'


let win: BrowserWindow | null

const notifyDownloadsHistoryChanged = () => {
  for (const browserWindow of BrowserWindow.getAllWindows()) {
    browserWindow.webContents.send('downloads-history-changed')
  }
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'icon.svg'),
    width: 1080,
    height: 720,
    // Frameless window so we can implement a custom window bar in the renderer
    frame: false,
    // On macOS keep a hidden inset titlebar so traffic-light buttons remain available
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  // Notify renderer when maximize/unmaximize happens so UI can update
  win.on('maximize', () => {
    win?.webContents.send('window-maximize-changed', true)
  })

  win.on('unmaximize', () => {
    win?.webContents.send('window-maximize-changed', false)
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  await aggregator.initialise()
  createWindow()
})

ipcMain.handle('search', async (_event, query: string) => {
  return await aggregator.search(query, {
    refresh: Boolean(config.get('always_refresh_sources'))
  })
})

ipcMain.handle('get-config', async () => {
  const cfg = getAppConfig()
  return cfg
})

ipcMain.handle('set-config', async (_event, key: string, value: any) => {
  setAppConfig(key, value)
  return true
})

ipcMain.handle('get-sources', async () => {
  await aggregator.ensureAdaptersLoaded()
  return aggregator.getSourceOptions()
})

ipcMain.handle('pick-folder', async () => {
  const focusedWindow = BrowserWindow.getFocusedWindow()
  const dialogOwner = focusedWindow ?? win
  if (!dialogOwner) return null

  const res = await dialog.showOpenDialog(dialogOwner, {
    properties: ['openDirectory'],
  })
  if (res.canceled || !res.filePaths || res.filePaths.length === 0) return null
  return res.filePaths[0]
})

ipcMain.handle('open-folder', async (_event, folderPath: string) => {
  try {
    return await shell.openPath(folderPath)
  } catch (e) {
    return String(e)
  }
})

ipcMain.handle('open-cache-folder', async () => {
  try {
    const cacheDir = path.join(os.homedir(), '.ncea-cli-cache')
    return await shell.openPath(cacheDir)
  } catch (e) {
    return String(e)
  }
})

ipcMain.handle('open-manifest-folder', async () => {
  try {
    const dataDir = path.join(os.homedir(), '.ncea-cli')
    return await shell.openPath(dataDir)
  } catch (e) {
    return String(e)
  }
})

ipcMain.handle('get-storage-usage', async () => {
  try {
    const cacheDir = path.join(os.homedir(), '.ncea-cli-cache')
    const dataDir = path.join(os.homedir(), '.ncea-cli')
    const usage = getStorageUsage(cacheDir, dataDir)
    return {
      cache: formatBytes(usage.cacheBytes),
      manifest: formatBytes(usage.manifestBytes),
      total: formatBytes(usage.totalBytes),
    }
  } catch (e) {
    return null
  }
})

ipcMain.handle('clear-cache', async () => {
  try {
    CacheService.clear()
    return true
  } catch (e) {
    return String(e)
  }
})

ipcMain.handle('clear-manifest', async () => {
  try {
    manifestService.clear()
    return true
  } catch (e) {
    return String(e)
  }
})

ipcMain.handle('get-papers', async (event, standardId: string, forceRefresh?: boolean) => {
  // Set up progress callback to send updates to renderer
  aggregator.progressCallback = (progress: any) => {
    if (progress?.timeout || progress?.error) {
      console.warn(
        `[IPC:get-papers] standard=${standardId} adapter=${String(progress?.adapter || 'unknown')} timeout=${Boolean(progress?.timeout)} error=${Boolean(progress?.error)} message=${String(progress?.message || '')}`,
      )
    }
    event.sender.send('papers-progress', progress)
  }
  
  try {
    const papers = await aggregator.searchExactByStandardId(standardId, {
      refresh: Boolean(forceRefresh) || Boolean(config.get('always_refresh_sources'))
    })
    return aggregator.groupResults(papers)
  } finally {
    // Clear callback when done
    aggregator.progressCallback = null
  }
})

ipcMain.handle('download', async (_event, paper: any, downloadPath: string, downloadId?: string) => {
  // Expand the download path if needed
  const expandedPath = expandPath(downloadPath)
  const resolvedDownloadId = String(
    downloadId || paper.__downloadId || paper.id || paper.filename || `download-${Date.now()}`,
  )
  try {
      const result = await DownloadService.downloadInfo(paper, expandedPath, (progress: any) => {      try {
        // send progress updates back to renderer
        _event.sender.send('download-progress', { id: resolvedDownloadId, progress })
      } catch (e) {}
    })

    manifestService.recordDownloadOutcome(paper, typeof result === 'object' && result.success === true)

    // Record successful downloads in history
    if (typeof result === 'object' && result.success === true) {
      const downloadInfo = result.success === true ? {
        id: resolvedDownloadId,
        title: paper.title || paper.filename || 'Unknown',
        standardId: paper.standardId || '',
        fileName: result.fileName || paper.filename || '',
        filePath: result.filePath || '',
        source: paper.sourceName || '',
        downloadedAt: Date.now(),
        size: result.size || 0,
        status: 'completed',
      } : {
        id: resolvedDownloadId,
        title: paper.title || paper.filename || 'Unknown',
        standardId: paper.standardId || '',
        fileName: paper.filename || '',
        filePath: expandedPath,
        source: paper.sourceName || '',
        downloadedAt: Date.now(),
        size: 0,
        status: 'completed',
      }

      addDownloadToHistory(downloadInfo)
      notifyDownloadsHistoryChanged()
    }

    // final progress 100
    try { _event.sender.send('download-progress', { id: resolvedDownloadId, progress: 100 }) } catch (e) {}
    return result
  } catch (e) {
    try { _event.sender.send('download-progress', { id: resolvedDownloadId, progress: -1 }) } catch (err) {}
    throw e
  }
})

// Downloads management handlers
ipcMain.handle('get-downloads-history', async () => {
  return getDownloadsHistory()
})

ipcMain.handle('add-download', async (_event, downloadInfo: any) => {
  const result = addDownloadToHistory(downloadInfo)
  notifyDownloadsHistoryChanged()
  return result
})

ipcMain.handle('remove-download', async (_event, downloadId: string) => {
  const result = removeDownloadFromHistory(downloadId)
  notifyDownloadsHistoryChanged()
  return result
})

ipcMain.handle('clear-downloads-history', async () => {
  const result = clearDownloadsHistory()
  notifyDownloadsHistoryChanged()
  return result
})

ipcMain.handle('verify-downloads', async (_event, paths: string[]) => {
  try {
    const results = (paths || []).map((p) => ({ path: p, exists: fs.existsSync(String(p || '')) }))
    return results
  } catch (e) {
    return []
  }
})

ipcMain.handle('reset-download-path', async () => {
  const expanded = resetDownloadPath()
  return expanded
})

// Window control IPC handlers
ipcMain.handle('window-minimize', async () => {
  const w = BrowserWindow.getFocusedWindow() || win
  w?.minimize()
  return true
})

ipcMain.handle('window-toggle-maximize', async () => {
  const w = BrowserWindow.getFocusedWindow() || win
  if (!w) return false
  if (w.isMaximized()) w.unmaximize()
  else w.maximize()
  return true
})

ipcMain.handle('window-is-maximized', async () => {
  const w = BrowserWindow.getFocusedWindow() || win
  return Boolean(w?.isMaximized())
})

ipcMain.handle('window-close', async () => {
  const w = BrowserWindow.getFocusedWindow() || win
  w?.close()
  return true
})

ipcMain.handle("ncea:getStandard", async (_, standardId) => {
  const papers = await aggregator.searchExactByStandardId(standardId);
  const grouped = aggregator.groupResults(papers);
  return grouped.find(g => g.standardId === standardId) ?? null;
});