import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Trash2, FolderOpen, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatRelativeTime } from "@/lib/utils";

interface DownloadRecord {
  id: string;
  title: string;
  standardId: string;
  fileName: string;
  filePath: string;
  source: string;
  downloadedAt: number;
  size: number;
  status: string;
  exists?: boolean;
  progress?: number;
}

interface DownloadsViewProps {
  downloads?: Array<{
    id?: string;
    filename?: string;
    paper?: { filename: string };
    progress?: number;
    status?: string;
  }>;
  onOpenStandard?: (standardId: string) => void;
}

export default function DownloadsView({
  downloads: activeDownloads = [],
  onOpenStandard,
}: DownloadsViewProps) {
  const [historyDownloads, setHistoryDownloads] = useState<DownloadRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [sortBy, setSortBy] = useState<
    "downloadedAt" | "fileName" | "size" | "standard"
  >("downloadedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const verifyFiles = useCallback(async () => {
    setVerifying(true);
    try {
      const paths = historyDownloads.map((d) => d.filePath || "");
      const results = (await window.ncea.verifyDownloads(paths)) || [];
      const merged = historyDownloads.map((d) => ({
        ...d,
        exists: (
          results.find((r) => r.path === d.filePath) || { exists: false }
        ).exists,
      }));
      setHistoryDownloads(merged);
    } catch (e) {
      console.error("Verification failed", e);
    } finally {
      setVerifying(false);
    }
  }, [historyDownloads]);

  useEffect(() => {
    loadDownloads();
  }, []);

  // periodic verification
  useEffect(() => {
    const id = setInterval(() => verifyFiles(), 60_000);
    const handleFocus = () => verifyFiles();
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", handleFocus);
    };
  }, [verifyFiles]);

  // Merged lists effect would be here but is handled inline in render

  const loadDownloads = async () => {
    try {
      setLoading(true);
      const history = (await window.ncea.getDownloadsHistory()) || [];
      history.sort(
        (a: DownloadRecord, b: DownloadRecord) =>
          (b.downloadedAt || 0) - (a.downloadedAt || 0),
      );
      const paths = history.map((h: DownloadRecord) => h.filePath || "");
      let results: Array<{ path: string; exists: boolean }> = [];
      try {
        results = (await window.ncea.verifyDownloads(paths)) || [];
      } catch (e) {
        results = [];
      }
      const merged = history.map((h: DownloadRecord) => ({
        ...h,
        exists: (
          results.find((r) => r.path === h.filePath) || { exists: false }
        ).exists,
      }));
      setHistoryDownloads(merged as DownloadRecord[]);
    } catch (e) {
      console.error("Failed to load downloads:", e);
      setHistoryDownloads([]);
    } finally {
      setLoading(false);
    }
  };

  const removeDownload = async (id: string) => {
    if (!confirm("Remove this download from history?")) return;
    try {
      await window.ncea.removeDownload(id);
      setHistoryDownloads(historyDownloads.filter((d) => d.id !== id));
    } catch (e) {
      console.error("Failed to remove download:", e);
      alert("Failed to remove download from history");
    }
  };

  const clearAllDownloads = async () => {
    if (
      !confirm(
        "Clear all download history? This only removes the history and tracking from the GUI. This action cannot be reversed.",
      )
    )
      return;
    try {
      await window.ncea.clearDownloadsHistory();
      setHistoryDownloads([]);
    } catch (e) {
      console.error("Failed to clear downloads:", e);
      alert("Failed to clear downloads history");
    }
  };

  const openFileLocation = async (filePath: string) => {
    try {
      await window.ncea.openFolder(filePath);
    } catch (e) {
      console.error("Failed to open folder:", e);
      alert("Failed to open file location");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  const mergeLists = () => {
    const map: Record<string, DownloadRecord> = {};
    historyDownloads.forEach((h) => {
      map[h.id || h.filePath] = { ...h };
    });
    activeDownloads.forEach((a) => {
      const key = a.id || a.filename || (a.paper && a.paper.filename);
      if (key) map[key] = { ...(map[key] || {}), ...a };
    });
    let arr = Object.values(map) as DownloadRecord[];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      arr = arr.filter(
        (d) =>
          (d.title || "").toLowerCase().includes(q) ||
          (d.fileName || "").toLowerCase().includes(q) ||
          (d.standardId || "").toLowerCase().includes(q),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortBy) {
        case "fileName":
          return dir * (a.fileName || "").localeCompare(b.fileName || "");
        case "size":
          return dir * ((a.size || 0) - (b.size || 0));
        case "standard":
          return dir * (a.standardId || "").localeCompare(b.standardId || "");
        case "downloadedAt":
        default:
          return dir * ((b.downloadedAt || 0) - (a.downloadedAt || 0));
      }
    });
    const groups: Record<string, DownloadRecord[]> = {};
    arr.forEach((d) => {
      const key = new Date(d.downloadedAt || 0).toDateString();
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });
    const orderedKeys = Object.keys(groups).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    );
    return { groups, orderedKeys, items: arr };
  };

  const formatDateLabel = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Downloads</h1>
        <p className="text-sm text-muted-foreground">
          Track and manage your downloaded exam papers
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5" />
              <div>
                <CardTitle className="text-base">Download History</CardTitle>
                <CardDescription>
                  {historyDownloads.length} file
                  {historyDownloads.length !== 1 ? "s" : ""} downloaded
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {historyDownloads.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={verifyFiles}
                  disabled={verifying}
                >
                  {verifying ? "Verifying…" : "Verify files"}
                </Button>
              )}
              {historyDownloads.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllDownloads}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading downloads...</p>
            </div>
          ) : historyDownloads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Download className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground">No downloads yet</p>
              <p className="text-sm text-muted-foreground">
                Downloaded files will appear here
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search downloads..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                {(() => {
                  const { groups, orderedKeys } = mergeLists();
                  const totalMatches = orderedKeys.reduce(
                    (acc, k) => acc + (groups[k]?.length || 0),
                    0,
                  );
                  if (totalMatches === 0)
                    return (
                      <div className="py-6 text-center">
                        <p className="text-muted-foreground">
                          No downloads match your search
                        </p>
                      </div>
                    );
                  return (
                    <div className="space-y-4 p-4">
                      {orderedKeys.map((key) => (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium">
                              {formatDateLabel(key)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {groups[key].length} item
                              {groups[key].length !== 1 ? "s" : ""}
                            </div>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead
                                  onClick={() => {
                                    setSortBy("fileName");
                                    setSortDir(
                                      sortBy === "fileName" && sortDir === "asc"
                                        ? "desc"
                                        : "asc",
                                    );
                                  }}
                                >
                                  File
                                </TableHead>
                                <TableHead
                                  onClick={() => {
                                    setSortBy("standard");
                                    setSortDir(
                                      sortBy === "standard" && sortDir === "asc"
                                        ? "desc"
                                        : "asc",
                                    );
                                  }}
                                >
                                  Standard
                                </TableHead>
                                <TableHead
                                  onClick={() => {
                                    setSortBy("downloadedAt");
                                    setSortDir(
                                      sortBy === "downloadedAt" &&
                                        sortDir === "asc"
                                        ? "desc"
                                        : "asc",
                                    );
                                  }}
                                >
                                  Downloaded
                                </TableHead>
                                <TableHead
                                  onClick={() => {
                                    setSortBy("size");
                                    setSortDir(
                                      sortBy === "size" && sortDir === "asc"
                                        ? "desc"
                                        : "asc",
                                    );
                                  }}
                                >
                                  Status
                                </TableHead>
                                <TableHead className="w-24">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {groups[key].map((download) => (
                                <TableRow key={download.id}>
                                  <TableCell
                                    className={`font-medium truncate max-w-xs ${download.exists === false ? "opacity-60" : ""}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span title={download.fileName}>
                                        {download.fileName}
                                      </span>
                                      {!download.exists && (
                                        <Badge
                                          variant="destructive"
                                          className="text-xs"
                                        >
                                          Missing
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {download.standardId ? (
                                      <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() =>
                                          onOpenStandard?.(download.standardId)
                                        }
                                      >
                                        {download.standardId}
                                      </Button>
                                    ) : (
                                      "-"
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {formatRelativeTime(download.downloadedAt)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-1">
                                      {download.progress !== undefined &&
                                      download.progress >= 0 ? (
                                        <Progress value={download.progress} />
                                      ) : download.status &&
                                        download.status !== "completed" ? (
                                        <Badge
                                          variant={
                                            getStatusColor(download.status) as
                                              | "secondary"
                                              | "destructive"
                                              | "outline"
                                          }
                                          className="text-xs"
                                        >
                                          {download.status}
                                        </Badge>
                                      ) : null}
                                      {!download.exists && (
                                        <span className="text-xs text-muted-foreground">
                                          (file removed)
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          openFileLocation(download.filePath)
                                        }
                                        title="Open file location"
                                        className="h-8 w-8 p-0"
                                        disabled={!download.exists}
                                      >
                                        <FolderOpen className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          removeDownload(download.id)
                                        }
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        title="Remove from history"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          onOpenStandard?.(download.standardId)
                                        }
                                        className="h-8 w-8 p-0"
                                        title="Retry download"
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
