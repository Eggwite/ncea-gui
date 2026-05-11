import { app } from "electron";
import path from "path";
import os from "os";
import { config } from "./config.js";

const getDefaultDownloadPath = () => app.getPath("downloads");

const resolveConfiguredDownloadPath = (filePath) => {
  const rawPath = String(filePath || "").trim();
  if (!rawPath) return getDefaultDownloadPath();

  const normalisedPath = rawPath.replace(/\\/g, "/");
  if (
    normalisedPath === "~" ||
    normalisedPath === "~/Downloads" ||
    normalisedPath === "~/Downloads/"
  ) {
    return getDefaultDownloadPath();
  }

  if (rawPath.startsWith("~")) {
    return path.join(os.homedir(), rawPath.slice(1));
  }

  if (!path.isAbsolute(rawPath)) {
    return path.resolve(getDefaultDownloadPath(), rawPath);
  }

  return rawPath;
};

/**
 * Expands ~ to the user's home directory
 */
export const expandPath = (filePath) => {
  return resolveConfiguredDownloadPath(filePath);
};

/**
 * Configuration manager with proper path handling
 */
export const getAppConfig = () => {
  const savedPath = config.get("default_download_path");
  const pathToUse = resolveConfiguredDownloadPath(savedPath);

  if (savedPath !== pathToUse) {
    config.set("default_download_path", pathToUse);
  }

  return {
    downloadPath: pathToUse,
    favoriteSource: config.get("favorite_source") || "",
    alwaysRefresh: Boolean(config.get("always_refresh_sources")),
  };
};

export const setAppConfig = (key, value) => {
  // The frontend is sending the backend key names directly
  // So we just need to store them as-is
  if (key === "default_download_path") {
    config.set(key, resolveConfiguredDownloadPath(value));
    return;
  }

  config.set(key, value);
};

export const resetDownloadPath = () => {
  const defaultPath = getDefaultDownloadPath();
  config.set("default_download_path", defaultPath);
  return defaultPath;
};

export const getDownloadsHistory = () => {
  try {
    const history = config.get("downloads_history") || [];
    return Array.isArray(history) ? history : [];
  } catch (e) {
    return [];
  }
};

export const addDownloadToHistory = (downloadInfo) => {
  try {
    const history = config.get("downloads_history") || [];
    const newEntry = {
      id: downloadInfo.id || `download-${Date.now()}`,
      title: downloadInfo.title || "Unknown",
      standardId: downloadInfo.standardId || "",
      fileName: downloadInfo.fileName || "",
      filePath: downloadInfo.filePath || "",
      source: downloadInfo.source || "",
      downloadedAt: downloadInfo.downloadedAt || Date.now(),
      size: downloadInfo.size || 0,
      status: downloadInfo.status || "completed",
    };
    const updatedHistory = [newEntry, ...history];
    config.set("downloads_history", updatedHistory);
    return true;
  } catch (e) {
    return false;
  }
};

export const removeDownloadFromHistory = (downloadId) => {
  try {
    const history = config.get("downloads_history") || [];
    const filtered = history.filter((d) => d.id !== downloadId);
    config.set("downloads_history", filtered);
    return true;
  } catch (e) {
    return false;
  }
};

export const clearDownloadsHistory = () => {
  try {
    config.set("downloads_history", []);
    return true;
  } catch (e) {
    return false;
  }
};
