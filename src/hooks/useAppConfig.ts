import { useEffect, useState, useCallback } from "react";

export interface AppConfig {
  downloadPath: string;
  favoriteSource: string;
  alwaysRefresh: boolean;
}

export const useAppConfig = () => {
  const [config, setConfig] = useState<AppConfig>({
    downloadPath: "",
    favoriteSource: "",
    alwaysRefresh: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const cfg = await window.ncea.getConfig();
        if (cfg) {
          setConfig({
            downloadPath: cfg.downloadPath || "",
            favoriteSource: cfg.favoriteSource || "",
            alwaysRefresh: Boolean(cfg.alwaysRefresh),
          });
        }
      } catch (e) {
        console.error("Failed to load config:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadConfig();
  }, []);

  // Update a config value and persist it
  const updateConfig = useCallback(async (key: keyof AppConfig, value: string | boolean) => {
    const backendKey = key === "downloadPath"
      ? "default_download_path"
      : key === "favoriteSource"
        ? "favorite_source"
        : key === "alwaysRefresh"
          ? "always_refresh_sources"
          : key;

    try {
      const result = await window.ncea.setConfig(backendKey, value);
      setConfig((prev) => ({ ...prev, [key]: value }));
      return result;
    } catch (e) {
      console.error(`Failed to update config ${key}:`, e);
      throw e;
    }
  }, []);

  return { config, updateConfig, isLoading };
};
