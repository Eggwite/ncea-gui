import { useEffect, useState } from "react";
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
}

export default function DownloadsView() {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [filteredDownloads, setFilteredDownloads] = useState<DownloadRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadDownloads();
  }, []);

  useEffect(() => {
    const filtered = downloads.filter(
      (d) =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.standardId.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredDownloads(filtered);
  }, [searchQuery, downloads]);

  const loadDownloads = async () => {
    try {
      setLoading(true);
      const history = await window.ncea.getDownloadsHistory();
      setDownloads(history || []);
    } catch (e) {
      console.error("Failed to load downloads:", e);
      setDownloads([]);
    } finally {
      setLoading(false);
    }
  };

  const removeDownload = async (id: string) => {
    if (!confirm("Remove this download from history?")) return;
    try {
      await window.ncea.removeDownload(id);
      setDownloads(downloads.filter((d) => d.id !== id));
    } catch (e) {
      console.error("Failed to remove download:", e);
      alert("Failed to remove download from history");
    }
  };

  const clearAllDownloads = async () => {
    if (!confirm("Clear all download history? This cannot be undone.")) return;
    try {
      await window.ncea.clearDownloadsHistory();
      setDownloads([]);
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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString() +
      " " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "Unknown";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
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
                  {downloads.length} file{downloads.length !== 1 ? "s" : ""}{" "}
                  downloaded
                </CardDescription>
              </div>
            </div>
            {downloads.length > 0 && (
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
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading downloads...</p>
            </div>
          ) : downloads.length === 0 ? (
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Standard</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Downloaded</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDownloads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          <p className="text-muted-foreground">
                            No downloads match your search
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDownloads.map((download) => (
                        <TableRow key={download.id}>
                          <TableCell className="font-medium truncate max-w-xs">
                            <span title={download.fileName}>
                              {download.fileName}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {download.standardId || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {download.source || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatSize(download.size)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(download.downloadedAt)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusColor(download.status) as any}
                              className="text-xs"
                            >
                              {download.status}
                            </Badge>
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
                              >
                                <FolderOpen className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDownload(download.id)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Remove from history"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
