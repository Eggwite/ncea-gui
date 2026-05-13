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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  clearDownloadsHistory,
  loadDownloads,
  openFileLocation,
  removeDownloadFromHistory,
  verifyDownloadFiles,
} from "@/components/downloads/downloadsActions";
import {
  formatDateLabel,
  getStatusColor,
  mergeDownloads,
  renderSortHead,
  toggleSort,
} from "@/components/downloads/downloadsList";
import type {
  DownloadRecord,
  DownloadsViewProps,
  SortField,
} from "@/components/downloads/types";

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
  const [sortBy, setSortBy] = useState<SortField>("downloadedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const refreshDownloads = useCallback(async () => {
    await loadDownloads({
      setLoading,
      setHistoryDownloads,
      getDownloadsHistory: window.ncea.getDownloadsHistory,
      verifyDownloads: window.ncea.verifyDownloads,
      showLoading: false,
    });
  }, []);

  useEffect(() => {
    void loadDownloads({
      setLoading,
      setHistoryDownloads,
      getDownloadsHistory: window.ncea.getDownloadsHistory,
      verifyDownloads: window.ncea.verifyDownloads,
      showLoading: true,
    });
  }, [refreshDownloads]);

  useEffect(() => {
    const bridge = window.ncea as typeof window.ncea & {
      onDownloadsHistoryChanged?: (callback: () => void) => () => void;
    };
    const unsubscribe = bridge.onDownloadsHistoryChanged?.(() => {
      void refreshDownloads();
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [refreshDownloads]);

  useEffect(() => {
    const id = setInterval(() => {
      void verifyDownloadFiles({
        historyDownloads,
        setVerifying,
        setHistoryDownloads,
        verifyDownloads: window.ncea.verifyDownloads,
      });
    }, 60_000);
    const handleFocus = () => {
      void verifyDownloadFiles({
        historyDownloads,
        setVerifying,
        setHistoryDownloads,
        verifyDownloads: window.ncea.verifyDownloads,
      });
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", handleFocus);
    };
  }, [historyDownloads]);

  const handleSortToggle = (field: SortField) => {
    const next = toggleSort(sortBy, sortDir, field);
    setSortBy(next.sortBy);
    setSortDir(next.sortDir);
  };

  const { groups, orderedKeys, items } = mergeDownloads({
    historyDownloads,
    activeDownloads,
    searchQuery,
    sortBy,
    sortDir,
  });

  return (
    <TooltipProvider>
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
                    onClick={() =>
                      void verifyDownloadFiles({
                        historyDownloads,
                        setVerifying,
                        setHistoryDownloads,
                        verifyDownloads: window.ncea.verifyDownloads,
                      })
                    }
                    disabled={verifying}
                  >
                    {verifying ? "Verifying…" : "Verify files"}
                  </Button>
                )}
                {historyDownloads.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void clearDownloadsHistory({
                        confirmClear: confirm,
                        clearDownloadsHistory:
                          window.ncea.clearDownloadsHistory,
                        setHistoryDownloads,
                      })
                    }
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
            ) : items.length === 0 ? (
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
                  {orderedKeys.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-muted-foreground">
                        No downloads match your search
                      </p>
                    </div>
                  ) : (
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
                                {renderSortHead("File", "fileName", {
                                  sortBy,
                                  sortDir,
                                  onToggleSort: handleSortToggle,
                                })}
                                {renderSortHead("Standard", "standard", {
                                  sortBy,
                                  sortDir,
                                  onToggleSort: handleSortToggle,
                                })}
                                {renderSortHead("Downloaded", "downloadedAt", {
                                  sortBy,
                                  sortDir,
                                  onToggleSort: handleSortToggle,
                                })}
                                {renderSortHead("Status", "size", {
                                  sortBy,
                                  sortDir,
                                  onToggleSort: handleSortToggle,
                                })}
                                <TableHead className="w-24">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {groups[key].map((download) => {
                                const isMissing = download.exists === false;
                                const hasStandard = Boolean(
                                  download.standardId,
                                );
                                const isPending =
                                  download.progress !== undefined &&
                                  download.progress >= 0 &&
                                  download.progress < 100;
                                const isActiveDownload =
                                  download.status === "pending" ||
                                  download.status === "downloading" ||
                                  isPending;
                                const canOpenFolder =
                                  Boolean(download.filePath) && !isMissing;
                                return (
                                  <TableRow key={download.id}>
                                    <TableCell
                                      className={cn(
                                        "font-medium truncate max-w-xs",
                                        isMissing && "opacity-60 grayscale",
                                      )}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span title={download.fileName}>
                                          {download.fileName}
                                        </span>
                                        {isMissing && (
                                          <Badge
                                            variant="outline"
                                            className="text-xs"
                                          >
                                            Missing
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {hasStandard ? (
                                        <Button
                                          variant="link"
                                          size="sm"
                                          onClick={() =>
                                            onOpenStandard?.(
                                              download.standardId,
                                            )
                                          }
                                        >
                                          {download.standardId}
                                        </Button>
                                      ) : (
                                        <span className="text-muted-foreground">
                                          -
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                      {formatRelativeTime(
                                        download.downloadedAt,
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-col gap-1">
                                        {isPending ? (
                                          <Progress value={download.progress} />
                                        ) : isActiveDownload ? (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs w-fit"
                                          >
                                            Downloading
                                          </Badge>
                                        ) : download.status &&
                                          download.status !== "completed" ? (
                                          <Badge
                                            variant={getStatusColor(
                                              download.status,
                                            )}
                                            className="text-xs"
                                          >
                                            {download.status}
                                          </Badge>
                                        ) : (
                                          <span className="text-xs text-muted-foreground">
                                            Ready
                                          </span>
                                        )}
                                        {isMissing && (
                                          <span className="text-xs text-muted-foreground">
                                            file removed
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  void openFileLocation({
                                                    filePath: download.filePath,
                                                    openFolder:
                                                      window.ncea.openFolder,
                                                  });
                                                }}
                                                title="Open file location"
                                                className="h-8 w-8 p-0"
                                                disabled={!canOpenFolder}
                                              >
                                                <FolderOpen className="w-4 h-4" />
                                              </Button>
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {canOpenFolder
                                              ? "Open file location"
                                              : isActiveDownload
                                                ? "File is still downloading"
                                                : "File is not available on disk"}
                                          </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  void removeDownloadFromHistory(
                                                    {
                                                      id: download.id,
                                                      historyDownloads,
                                                      confirmRemove: confirm,
                                                      removeDownload:
                                                        window.ncea
                                                          .removeDownload,
                                                      setHistoryDownloads,
                                                    },
                                                  );
                                                }}
                                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                title="Remove from history"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            Remove from history
                                          </TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <span>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  if (!hasStandard) return;
                                                  onOpenStandard?.(
                                                    download.standardId,
                                                  );
                                                }}
                                                className="h-8 w-8 p-0"
                                                title="Retry download"
                                                disabled={!hasStandard}
                                              >
                                                <Download className="w-4 h-4" />
                                              </Button>
                                            </span>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {hasStandard
                                              ? isPending
                                                ? "Download in progress"
                                                : "Retry download"
                                              : "Standard not available yet"}
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
