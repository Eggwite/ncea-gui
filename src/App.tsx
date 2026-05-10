import React, { useEffect, useState } from "react";
import SearchView from "./views/SearchView";
import PaperSelector from "./views/PaperSelector";
import SettingsView from "./views/SettingsView";
import { Toaster } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Sun, Moon, Settings, Minus, Square, X, Maximize2 } from "lucide-react";

export default function App() {
  const [view, setView] = useState<"search" | "settings">("search");
  const [selectorStandard, setSelectorStandard] = useState<any | null>(null);
  const [downloads, setDownloads] = useState<any[]>([]);
  const [isMaximized, setIsMaximized] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // load config if needed
    if (typeof window !== "undefined" && window.ncea?.getConfig) {
      window.ncea
        .getConfig()
        .then((cfg) => {
          // noop for now
        })
        .catch(() => {});
    }
  }, []);

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

  const openPaperSelector = (standard: any) => {
    setSelectorStandard(standard);
  };

  const onStartDownload = (item: any) => {
    setDownloads((d) => [item, ...d]);
  };

  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-50 border-b bg-card backdrop-blur-sm window-bar">
          <div className="flex items-center justify-end px-2 ">
            <div className="flex items-center gap-2">
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
                variant="ghost"
                size="icon"
                className="no-drag"
                onClick={() => setView("settings")}
                aria-label="settings"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </Button>
              <div className="window-controls no-drag ml-2">
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
                    <Square className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
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
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-8">
          {view === "search" && (
            <SearchView onSelectStandard={openPaperSelector} />
          )}

          {view === "settings" && (
            <SettingsView onClose={() => setView("search")} />
          )}
        </main>

        {selectorStandard && (
          <PaperSelector
            standard={selectorStandard}
            onClose={() => setSelectorStandard(null)}
            onDownloadStart={(item) => onStartDownload(item)}
          />
        )}
      </div>
      <Toaster />
    </>
  );
}
