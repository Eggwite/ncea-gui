import { useState, useEffect } from "react";

export function useDownloadManager() {
  const [downloads, setDownloads] = useState<any[]>([]);

  const onStartDownload = (item: any) => {
    const fileName =
      item.fileName || item.filename || item.paper?.filename || "";
    const title = item.title || item.paper?.title || fileName;
    const standardId = item.standardId || item.paper?.standardId || "";
    const source = item.source || item.paper?.sourceName || "";
    const downloadedAt = item.downloadedAt || Date.now();

    setDownloads((current) => [
      {
        ...item,
        fileName,
        filename: fileName,
        title,
        standardId,
        source,
        downloadedAt,
        progress: 0,
        status: "pending",
      },
      ...current,
    ]);
  };

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
                downloadedAt: d.downloadedAt || Date.now(),
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

  return { downloads, onStartDownload };
}
