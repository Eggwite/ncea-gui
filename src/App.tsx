import SearchView from "./views/SearchView";
import YearsView from "./views/YearsView";
import SettingsView from "./views/SettingsView";
import DownloadsView from "./views/DownloadsView";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/Button";

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
import { useTheme } from "./hooks/useTheme";
import { useWindowControls } from "./hooks/useWindowControls";
import { useViewNavigation } from "./hooks/useViewNavigation";
import { useDownloadManager } from "./hooks/useDownloadManager";
import { useSearchState } from "./hooks/useSearchState";
import { Separator } from "./components/ui/separator";

export default function App() {
  const { config, updateConfig } = useAppConfig();
  const { dark, toggleTheme } = useTheme();
  const { isMaximized, minimizeWindow, toggleMaximizeWindow, closeWindow } =
    useWindowControls();
  const {
    view,
    selectedStandard,
    openYearsView,
    backToSearch,
    toggleSettings,
    toggleDownloads,
  } = useViewNavigation();
  const { downloads, onStartDownload } = useDownloadManager();
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    searchLoading,
    setSearchLoading,
    searchDurationNs,
    setSearchDurationNs,
    searchError,
    setSearchError,
  } = useSearchState();

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
                backToSearch();
              }}
            />
          )}

          {view === "settings" && (
            <SettingsView
              onClose={backToSearch}
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
