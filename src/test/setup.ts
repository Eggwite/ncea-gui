import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});

Object.defineProperty(window, "ncea", {
  writable: true,
  configurable: true,
  value: {
    search: vi.fn(async () => []),
    getStandard: vi.fn(async () => null),
    getPapers: vi.fn(async () => []),
    download: vi.fn(async () => ({ success: true })),
    getConfig: vi.fn(async () => ({
      downloadPath: "",
      favoriteSource: "",
      alwaysRefresh: false,
    })),
    setConfig: vi.fn(async () => true),
    getSources: vi.fn(async () => []),
    pickFolder: vi.fn(async () => null),
    openFolder: vi.fn(async () => ""),
    openCacheFolder: vi.fn(async () => ""),
    openManifestFolder: vi.fn(async () => ""),
    getStorageUsage: vi.fn(async () => null),
    clearCache: vi.fn(async () => true),
    clearManifest: vi.fn(async () => true),
    getDownloadsHistory: vi.fn(async () => []),
    addDownload: vi.fn(async () => true),
    removeDownload: vi.fn(async () => true),
    clearDownloadsHistory: vi.fn(async () => true),
    verifyDownloads: vi.fn(async () => []),
    resetDownloadPath: vi.fn(async () => ""),
    onDownloadProgress: vi.fn(() => () => {}),
    onDownloadsHistoryChanged: vi.fn(() => () => {}),
    minimize: vi.fn(async () => undefined),
    toggleMaximize: vi.fn(async () => undefined),
    isMaximized: vi.fn(async () => false),
    close: vi.fn(async () => undefined),
    onMaximizeChanged: vi.fn(() => () => {}),
    onPapersProgress: vi.fn(() => () => {}),
  },
});
