import { describe, expect, it } from "vitest";
import { DOWNLOADING_GROUP, UNKNOWN_DATE_GROUP } from "./constants";
import { formatDateLabel, mergeDownloads, toggleSort } from "./downloadsList";

describe("downloadsList helpers", () => {
  it("merges active downloads and prioritizes downloading group", () => {
    const now = Date.now();
    const merged = mergeDownloads({
      historyDownloads: [
        {
          id: "download-1",
          filePath: "C:/tmp/a.pdf",
          fileName: "a.pdf",
          title: "A",
          standardId: "91524",
          downloadedAt: now,
          status: "completed",
        },
      ],
      activeDownloads: [
        { id: "download-1", progress: 42, status: "downloading" },
      ],
      searchQuery: "",
      sortBy: "downloadedAt",
      sortDir: "desc",
    });

    expect(merged.items).toHaveLength(1);
    expect(merged.orderedKeys[0]).toBe(DOWNLOADING_GROUP);
    expect(merged.groups[DOWNLOADING_GROUP][0].id).toBe("download-1");
  });

  it("filters by search text and places invalid dates in unknown bucket", () => {
    const merged = mergeDownloads({
      historyDownloads: [
        {
          id: "known",
          filePath: "C:/tmp/a.pdf",
          fileName: "alpha.pdf",
          title: "Alpha",
          standardId: "91524",
          downloadedAt: Date.now(),
          status: "completed",
        },
        {
          id: "unknown",
          filePath: "C:/tmp/b.pdf",
          fileName: "beta.pdf",
          title: "Beta",
          standardId: "91100",
          downloadedAt: 0,
          status: "completed",
        },
      ],
      activeDownloads: [],
      searchQuery: "beta",
      sortBy: "downloadedAt",
      sortDir: "desc",
    });

    expect(merged.items).toHaveLength(1);
    expect(merged.orderedKeys).toEqual([UNKNOWN_DATE_GROUP]);
    expect(merged.groups[UNKNOWN_DATE_GROUP][0].id).toBe("unknown");
  });

  it("toggles sort direction and formats special date labels", () => {
    expect(toggleSort("fileName", "asc", "fileName")).toEqual({
      sortBy: "fileName",
      sortDir: "desc",
    });
    expect(toggleSort("fileName", "desc", "standard")).toEqual({
      sortBy: "standard",
      sortDir: "asc",
    });

    expect(formatDateLabel(DOWNLOADING_GROUP)).toBe("Downloading");
    expect(formatDateLabel(UNKNOWN_DATE_GROUP)).toBe("Unknown date");
  });
});
