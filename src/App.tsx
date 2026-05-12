import { useEffect, useState } from "react";
import SearchView from "./views/SearchView";
import YearsView from "./views/YearsView";
import SettingsView from "./views/SettingsView";
import DownloadsView from "./views/DownloadsView";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";

import {
  Sun,
  Moon,
  Settings,
  Minus,
  Square,
  X,
  Maximize2,
  Download,
} from "lucide-react";
import { useAppConfig } from "./hooks/useAppConfig";
import { Separator } from "./components/ui/separator";

export default function App() {
  const [view, setView] = useState<
    "search" | "years" | "settings" | "downloads"
  >("search");
  const [previousView, setPreviousView] = useState<
    "search" | "years" | "downloads" | "settings"
  >("search");
  const [selectedStandard, setSelectedStandard] = useState<any | null>(null);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dark, setDark] = useState(false);

  // Centralized config management
  const { config, updateConfig } = useAppConfig();

  // Search state - lifted from SearchView to preserve when navigating back
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDurationNs, setSearchDurationNs] = useState<bigint | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    // init theme from localStorage
    try {
      const t = localStorage.getItem("theme");
      if (t === "dark") {
        document.documentElement.classList.add("dark");
        setDark(true);
      } else {
        document.documentElement.classList.remove("dark");
        setDark(false);
      }
    } catch (e) {}

    // init window maximize state and subscribe to changes (Electron only)
    if (typeof window !== "undefined" && (window as any).ncea) {
      try {
        (window as any).ncea
          .isMaximized?.()
          .then((v: boolean) => setIsMaximized(Boolean(v)));
      } catch (e) {}
      const unsub = (window as any).ncea.onMaximizeChanged?.((v: boolean) =>
        setIsMaximized(Boolean(v)),
      );
      return () => {
        if (typeof unsub === "function") unsub();
      };
    }
  }, []);

  useEffect(() => {
    // Handle backspace to go back from YearsView to SearchView
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && view === "years") {
        e.preventDefault();
        backToSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view]);

  const toggleTheme = () => {
    try {
      if (dark) {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
        setDark(false);
      } else {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
        setDark(true);
      }
    } catch (e) {}
  };

  const minimizeWindow = () => {
    try {
      (window as any).ncea?.minimize?.();
    } catch (e) {}
  };

  const toggleMaximizeWindow = () => {
    try {
      (window as any).ncea?.toggleMaximize?.();
    } catch (e) {}
  };

  const closeWindow = () => {
    try {
      (window as any).ncea?.close?.();
    } catch (e) {}
  };

  const openYearsView = (standard: any) => {
    setPreviousView("search");
    setSelectedStandard(standard);
    setView("years");
  };

  const backToSearch = () => {
    setSelectedStandard(null);
    setView("search");
  };

  const toggleSettings = () => {
    if (view === "settings") {
      // Closing settings, go back
      setView(previousView);
    } else if (view === "downloads") {
      // Switching from downloads to settings
      setView("settings");
    } else {
      // Opening settings from base view, save the base view
      setPreviousView(view as "search" | "years");
      setView("settings");
    }
  };

  const toggleDownloads = () => {
    if (view === "downloads") {
      // Closing downloads, go back
      setView(previousView);
    } else if (view === "settings") {
      // Switching from settings to downloads
      setView("downloads");
    } else {
      // Opening downloads from base view, save the base view
      setPreviousView(view as "search" | "years");
      setView("downloads");
    }
  };

  const onStartDownload = (item: any) => {
    setDownloads((d) => [{ ...item, progress: 0, status: "pending" }, ...d]);
  };

  // Subscribe to native download progress events and update downloads
  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ncea) return;
    const unsub = (window as any).ncea.onDownloadProgress(
      (p: { id: string; progress: number }) => {
        setDownloads((cur) =>
          cur.map((d) => {
            if (!d) return d;
            if (d.id !== p.id) return d;
            if (p.progress >= 0)
              return {
                ...d,
                progress: p.progress,
                status: p.progress === 100 ? "completed" : "downloading",
              };
            return { ...d, status: "failed" };
          }),
        );
      },
    );
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <header
          className="
            sticky top-0 z-50
            border-b border-white/10 dark:border-white/5
            bg-white/60 dark:bg-zinc-900/50
            backdrop-blur-xs
            backdrop-saturate-100
            shadow-[0_4px_16px_rgba(0,0,0,0.04)]
            window-bar
          "
        >
          {" "}
          <div className="flex items-center justify-between p-0.5">
            <div className="flex items-center gap-0.5">
              {downloads.length > 0 && (
                <Badge variant="secondary" className="px-2 py-1 no-drag">
                  {downloads.length} active
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="no-drag"
                onClick={toggleTheme}
                aria-label="toggle theme"
                title="Toggle theme"
              >
                {dark ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>
              <Button
                variant={view === "downloads" ? "default" : "ghost"}
                size="icon"
                className="no-drag"
                onClick={toggleDownloads}
                aria-label="downloads"
                title="Downloads"
              >
                <Download className="w-5 h-5" />
              </Button>
              <Button
                variant={view === "settings" ? "default" : "ghost"}
                size="icon"
                className="no-drag"
                onClick={toggleSettings}
                aria-label="settings"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex items-center gap-0.5 no-drag">
              <Separator orientation="vertical" className="my-2" />
              <Button
                variant="ghost"
                size="icon"
                className="window-button no-drag"
                onClick={minimizeWindow}
                aria-label="minimize"
                title="Minimize"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="window-button no-drag"
                onClick={toggleMaximizeWindow}
                aria-label="maximize"
                title={isMaximized ? "Restore" : "Maximize"}
              >
                {isMaximized ? (
                  <Square className="w-2 h-2" />
                ) : (
                  <Maximize2 className="w-2 h-2" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="window-button no-drag"
                onClick={closeWindow}
                aria-label="close"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl px-6 py-8">
          {view === "search" && (
            <SearchView
              onSelectStandard={openYearsView}
              query={searchQuery}
              onQueryChange={setSearchQuery}
              results={searchResults}
              onResultsChange={setSearchResults}
              loading={searchLoading}
              onLoadingChange={setSearchLoading}
              durationNs={searchDurationNs}
              onDurationChange={setSearchDurationNs}
              error={searchError}
              onErrorChange={setSearchError}
            />
          )}

          {view === "years" && selectedStandard && (
            <YearsView
              standard={selectedStandard}
              onBack={backToSearch}
              onDownloadStart={onStartDownload}
              downloadPath={config.downloadPath}
            />
          )}

          {view === "downloads" && (
            <DownloadsView
              downloads={downloads}
              onOpenStandard={(standardId: string) => {
                setSearchQuery(standardId);
                setView("search");
              }}
            />
          )}

          {view === "settings" && (
            <SettingsView
              onClose={() => setView("search")}
              config={config}
              onConfigUpdate={updateConfig}
            />
          )}
        </main>
      </div>
      <Toaster richColors theme={dark ? "dark" : "light"} />{" "}
    </>
  );
}
