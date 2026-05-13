import type { Dispatch, SetStateAction } from "react";
import type { DownloadRecord } from "./types";

const applyVerificationResults = (
  downloads: DownloadRecord[],
  results: Array<{ path: string; exists: boolean }>,
) =>
  downloads.map((download) => ({
    ...download,
    exists: (results.find((result) => result.path === download.filePath) || { exists: false }).exists,
  }));

export const loadDownloads = async ({
  setLoading,
  setHistoryDownloads,
  getDownloadsHistory,
  verifyDownloads,
  showLoading = true,
}: {
  setLoading: (loading: boolean) => void;
  setHistoryDownloads: Dispatch<SetStateAction<DownloadRecord[]>>;
  getDownloadsHistory: () => Promise<any[]>;
  verifyDownloads: (paths: string[]) => Promise<Array<{ path: string; exists: boolean }>>;
  showLoading?: boolean;
}) => {
  try {
    if (showLoading) {
      setLoading(true);
    }
    const history = ((await getDownloadsHistory()) || []) as DownloadRecord[];
    history.sort(
      (a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0),
    );
    const paths = history.map((record) => record.filePath || "");
    let results: Array<{ path: string; exists: boolean }> = [];
    try {
      results = (await verifyDownloads(paths)) || [];
    } catch (e) {
      results = [];
    }
    setHistoryDownloads(applyVerificationResults(history, results));
  } catch (e) {
    console.error("Failed to load downloads:", e);
    setHistoryDownloads([]);
  } finally {
    if (showLoading) {
      setLoading(false);
    }
  }
};

export const verifyDownloadFiles = async ({
  historyDownloads,
  setVerifying,
  setHistoryDownloads,
  verifyDownloads,
}: {
  historyDownloads: DownloadRecord[];
  setVerifying: (verifying: boolean) => void;
  setHistoryDownloads: Dispatch<SetStateAction<DownloadRecord[]>>;
  verifyDownloads: (paths: string[]) => Promise<Array<{ path: string; exists: boolean }>>;
}) => {
  setVerifying(true);
  try {
    const paths = historyDownloads.map((download) => download.filePath || "");
    const results = (await verifyDownloads(paths)) || [];
    setHistoryDownloads(applyVerificationResults(historyDownloads, results));
  } catch (e) {
    console.error("Verification failed", e);
  } finally {
    setVerifying(false);
  }
};

export const removeDownloadFromHistory = async ({
  id,
  historyDownloads,
  confirmRemove,
  removeDownload,
  setHistoryDownloads,
}: {
  id: string;
  historyDownloads: DownloadRecord[];
  confirmRemove: (message: string) => boolean;
  removeDownload: (downloadId: string) => Promise<boolean>;
  setHistoryDownloads: Dispatch<SetStateAction<DownloadRecord[]>>;
}) => {
  if (!confirmRemove("Remove this download from history?")) return;
  try {
    await removeDownload(id);
    setHistoryDownloads(historyDownloads.filter((download) => download.id !== id));
  } catch (e) {
    console.error("Failed to remove download:", e);
    alert("Failed to remove download from history");
  }
};

export const clearDownloadsHistory = async ({
  confirmClear,
  clearDownloadsHistory,
  setHistoryDownloads,
}: {
  confirmClear: (message: string) => boolean;
  clearDownloadsHistory: () => Promise<boolean>;
  setHistoryDownloads: Dispatch<SetStateAction<DownloadRecord[]>>;
}) => {
  if (
    !confirmClear(
      "Clear all download history? This only removes the history and tracking from the GUI. This action cannot be reversed.",
    )
  )
    return;
  try {
    await clearDownloadsHistory();
    setHistoryDownloads([]);
  } catch (e) {
    console.error("Failed to clear downloads:", e);
    alert("Failed to clear downloads history");
  }
};

export const openFileLocation = async ({
  filePath,
  openFolder,
}: {
  filePath: string;
  openFolder: (path: string) => Promise<string>;
}) => {
  if (!filePath) return;
  try {
    await openFolder(filePath);
  } catch (e) {
    console.error("Failed to open folder:", e);
    alert("Failed to open file location");
  }
};