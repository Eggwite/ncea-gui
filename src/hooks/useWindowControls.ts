import { useState, useEffect } from "react";

export function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !(window as any).ncea) return;

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
  }, []);

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

  return {
    isMaximized,
    minimizeWindow,
    toggleMaximizeWindow,
    closeWindow,
  };
}
