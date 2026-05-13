import { useState, useEffect } from "react";

type ViewType = "search" | "years" | "settings" | "downloads";

export function useViewNavigation() {
  const [view, setView] = useState<ViewType>("search");
  const [previousView, setPreviousView] = useState<ViewType>("search");
  const [selectedStandard, setSelectedStandard] = useState<any | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Backspace" && view === "years") {
        e.preventDefault();
        backToSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [view]);

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
      setView(previousView);
    } else if (view === "downloads") {
      setView("settings");
    } else {
      setPreviousView(view as "search" | "years");
      setView("settings");
    }
  };

  const toggleDownloads = () => {
    if (view === "downloads") {
      setView(previousView);
    } else if (view === "settings") {
      setView("downloads");
    } else {
      setPreviousView(view as "search" | "years");
      setView("downloads");
    }
  };

  return {
    view,
    previousView,
    selectedStandard,
    openYearsView,
    backToSearch,
    toggleSettings,
    toggleDownloads,
  };
}
