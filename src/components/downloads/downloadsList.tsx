import { TableHead } from "@/components/ui/table";
import { DOWNLOADING_GROUP, UNKNOWN_DATE_GROUP } from "./constants";
import { SortIndicator } from "./SortIndicator";
import type { DownloadGroups, DownloadRecord, SortField } from "./types";

export const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
};

export const toggleSort = (
  sortBy: SortField,
  sortDir: "asc" | "desc",
  field: SortField,
) => ({
  sortBy: field,
  sortDir:
    sortBy === field && sortDir === "asc"
      ? ("desc" as const)
      : ("asc" as const),
});

export const renderSortHead = (
  label: string,
  field: SortField,
  options: {
    sortBy: SortField;
    sortDir: "asc" | "desc";
    onToggleSort: (field: SortField) => void;
  },
) => (
  <TableHead
    className="cursor-pointer select-none hover:bg-muted/50"
    onClick={() => options.onToggleSort(field)}
  >
    <span className="inline-flex items-center">
      {label}
      <SortIndicator
        active={options.sortBy === field}
        direction={options.sortDir}
      />
    </span>
  </TableHead>
);

export const formatDateLabel = (dateString: string) => {
  if (dateString === DOWNLOADING_GROUP) return "Downloading";
  if (dateString === UNKNOWN_DATE_GROUP) return "Unknown date";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString();
};

export const mergeDownloads = ({
  historyDownloads,
  activeDownloads,
  searchQuery,
  sortBy,
  sortDir,
}: {
  historyDownloads: DownloadRecord[];
  activeDownloads: Array<{
    id?: string;
    filename?: string;
    paper?: { filename: string };
    progress?: number;
    status?: string;
  }>;
  searchQuery: string;
  sortBy: SortField;
  sortDir: "asc" | "desc";
}): DownloadGroups => {
  const map: Record<string, DownloadRecord> = {};
  historyDownloads.forEach((h) => {
    map[h.id || h.filePath] = { ...h };
  });

  activeDownloads
    .filter((download) => {
      const isActive =
        download.status === "pending" ||
        download.status === "downloading" ||
        (download.progress !== undefined && download.progress < 100);
      return isActive;
    })
    .forEach((a) => {
      const key = a.id || a.filename || (a.paper && a.paper.filename);
      if (key) map[key] = { ...(map[key] || {}), ...a } as DownloadRecord;
    });

  let items = Object.values(map);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    items = items.filter(
      (d) =>
        (d.title || "").toLowerCase().includes(q) ||
        (d.fileName || "").toLowerCase().includes(q) ||
        (d.standardId || "").toLowerCase().includes(q),
    );
  }

  const direction = sortDir === "asc" ? 1 : -1;
  items.sort((a, b) => {
    switch (sortBy) {
      case "fileName":
        return direction * (a.fileName || "").localeCompare(b.fileName || "");
      case "size":
        return direction * ((a.size || 0) - (b.size || 0));
      case "standard":
        return (
          direction * (a.standardId || "").localeCompare(b.standardId || "")
        );
      case "downloadedAt":
      default:
        return direction * ((b.downloadedAt || 0) - (a.downloadedAt || 0));
    }
  });

  const groups: Record<string, DownloadRecord[]> = {};
  items.forEach((d) => {
    const isDownloading =
      (d.status === "pending" || d.status === "downloading") &&
      (d.progress === undefined || d.progress < 100);
    if (isDownloading) {
      if (!groups[DOWNLOADING_GROUP]) groups[DOWNLOADING_GROUP] = [];
      groups[DOWNLOADING_GROUP].push(d);
      return;
    }

    const hasValidTimestamp =
      Number.isFinite(d.downloadedAt) && d.downloadedAt > 0;
    const key = hasValidTimestamp
      ? new Date(d.downloadedAt).toDateString()
      : UNKNOWN_DATE_GROUP;
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  });

  const orderedKeys = Object.keys(groups).sort((a, b) => {
    if (a === DOWNLOADING_GROUP && b === DOWNLOADING_GROUP) return 0;
    if (a === DOWNLOADING_GROUP) return -1;
    if (b === DOWNLOADING_GROUP) return 1;
    if (a === UNKNOWN_DATE_GROUP && b === UNKNOWN_DATE_GROUP) return 0;
    if (a === UNKNOWN_DATE_GROUP) return 1;
    if (b === UNKNOWN_DATE_GROUP) return -1;
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return { groups, orderedKeys, items };
};
