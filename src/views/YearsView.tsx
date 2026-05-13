import { useEffect, useRef, useState } from "react";
import { ArrowBigLeftDash, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/Checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface YearEntry {
  entryKey: string;
  label: string;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  isBulk?: boolean;
  typeChoices?: Array<{
    type: string;
    label: string;
    papers: Array<DownloadPaper>;
    sourceCount: number;
  }>;
  typeSummary?: string;
  sourceSummary?: string;
}

interface DownloadPaper {
  filename: string;
  __downloadId?: string;
  [key: string]: unknown;
}

interface DownloadHistoryEntry {
  standardId?: string;
  fileName?: string;
  filePath?: string;
}

interface DownloadStartItem {
  paper: DownloadPaper;
  filename: string;
  id: string;
}

interface StandardData {
  standardId: string;
  title: string;
  subject: string;
  level: number | "scholarship";
  label?: string;
  entries: YearEntry[];
}

interface YearsViewProps {
  standard: StandardData;
  onBack: () => void;
  onDownloadStart: (item: DownloadStartItem) => void;
  downloadPath: string;
}

export default function YearsView({
  standard,
  onBack,
  onDownloadStart,
  downloadPath,
}: YearsViewProps) {
  const [selection, setSelection] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateDialogNames, setDuplicateDialogNames] = useState<string[]>(
    [],
  );
  const duplicateDialogResolver = useRef<
    ((shouldProceed: boolean) => void) | null
  >(null);

  const toggleSelection = (key: string) => {
    setSelection((s) => ({ ...s, [key]: !s[key] }));
  };

  const toggleAll = () => {
    const allKeys = standard.entries
      .flatMap(
        (entry, ei) => entry.typeChoices?.map((_, ti) => `${ei}:${ti}`) || [],
      )
      .filter(Boolean);

    const allSelected = allKeys.every((k) => selection[k]);

    if (allSelected) {
      setSelection({});
    } else {
      const newSelection: Record<string, boolean> = {};
      allKeys.forEach((k) => {
        newSelection[k] = true;
      });
      setSelection(newSelection);
    }
  };

  const promptForDuplicateDownloads = (names: string[]) => {
    setDuplicateDialogNames(names);
    setDuplicateDialogOpen(true);
    return new Promise<boolean>((resolve) => {
      duplicateDialogResolver.current = resolve;
    });
  };

  const resolveDuplicateDialog = (shouldProceed: boolean) => {
    duplicateDialogResolver.current?.(shouldProceed);
    duplicateDialogResolver.current = null;
    setDuplicateDialogOpen(false);
    if (!shouldProceed) {
      setDuplicateDialogNames([]);
    }
  };

  const doDownload = async () => {
    const chosen = Object.keys(selection).filter((k) => selection[k]);
    if (chosen.length === 0) return;

    const history = ((await window.ncea.getDownloadsHistory()) ||
      []) as DownloadHistoryEntry[];
    const historyLookup = new Map<string, DownloadHistoryEntry[]>();

    for (const record of history) {
      const key = `${String(record.standardId || "")}::${String(record.fileName || "")}`;
      const items = historyLookup.get(key) || [];
      items.push(record);
      historyLookup.set(key, items);
    }

    const downloadJobs = chosen
      .map((key) => {
        const [entryIndex, typeIndex] = key.split(":").map(Number);
        const entry = standard.entries[entryIndex];
        const typeChoice = entry?.typeChoices?.[typeIndex];
        const paper = typeChoice?.papers?.[0];

        if (!paper) return null;

        const duplicateKey = `${standard.standardId}::${paper.filename}`;
        const existingRecords = historyLookup.get(duplicateKey) || [];

        return {
          key,
          paper,
          filename: paper.filename,
          duplicateRecords: existingRecords,
        };
      })
      .filter(
        (
          job,
        ): job is {
          key: string;
          paper: DownloadPaper;
          filename: string;
          duplicateRecords: DownloadHistoryEntry[];
        } => Boolean(job),
      );

    const duplicatePaths = Array.from(
      new Set(
        downloadJobs.flatMap((job) =>
          job.duplicateRecords
            .map((record) => record.filePath)
            .filter((filePath): filePath is string => Boolean(filePath)),
        ),
      ),
    );
    const verifiedDuplicates =
      duplicatePaths.length > 0
        ? await window.ncea.verifyDownloads(duplicatePaths)
        : [];
    const existingDuplicatePaths = new Set(
      verifiedDuplicates.filter((item) => item.exists).map((item) => item.path),
    );

    const duplicateJobs = downloadJobs.filter((job) =>
      job.duplicateRecords.some((record) =>
        existingDuplicatePaths.has(record.filePath || ""),
      ),
    );
    let finalJobs = downloadJobs;

    if (duplicateJobs.length > 0) {
      const shouldRedownload = await promptForDuplicateDownloads(
        duplicateJobs.map((job) => job.filename),
      );

      if (!shouldRedownload) {
        finalJobs = downloadJobs.filter(
          (job) => job.duplicateRecords.length === 0,
        );
      }
    }

    if (finalJobs.length === 0) return;

    setDownloading(true);
    try {
      const queuedJobs = finalJobs.map((job) => ({
        ...job,
        id: `dl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      }));

      queuedJobs.forEach((job) => {
        // attach id to paper so main can use it when emitting progress
        job.paper.__downloadId = job.id;
        onDownloadStart({
          paper: job.paper,
          filename: job.filename,
          id: job.id,
        });
      });

      for (const job of queuedJobs) {
        try {
          await window.ncea.download(job.paper, downloadPath || "", job.id);
        } catch (e) {
          console.error("Download failed:", e);
        }
      }
    } finally {
      setDownloading(false);
    }
  };

  const selectedCount = Object.values(selection).filter(Boolean).length;
  const totalCount = standard.entries.flatMap(
    (entry) => entry.typeChoices || [],
  ).length;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Backspace") onBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onBack]);

  useEffect(() => {
    return () => {
      duplicateDialogResolver.current?.(false);
      duplicateDialogResolver.current = null;
    };
  }, []);

  return (
    <div className="space-y-4">
      <AlertDialog
        open={duplicateDialogOpen}
        onOpenChange={(open) => {
          setDuplicateDialogOpen(open);
          if (!open && duplicateDialogResolver.current) {
            resolveDuplicateDialog(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Download existing files again?</AlertDialogTitle>
            <AlertDialogDescription>
              These files are already on disk. Downloading again will create
              another copy with a unique filename.
              <br />
              <br />
              {duplicateDialogNames.length > 0 && (
                <span className="block max-h-28 overflow-auto rounded-md border bg-muted/40 p-3 text-xs text-foreground">
                  {duplicateDialogNames.join("\n")}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => resolveDuplicateDialog(false)}>
              Skip duplicates
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => resolveDuplicateDialog(true)}>
              Download anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Compact Header with Back Button & Metadata */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="gap-2 text-muted-foreground"
        >
          <ArrowBigLeftDash />{" "}
          <span className="text-sm text-muted-foreground mr-2">
            Return to Search
          </span>
        </Button>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{standard.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{standard.subject}</Badge>
            <Badge variant="secondary">
              {standard.level === 0 || standard.level === "scholarship"
                ? "Scholarship"
                : `Level ${standard.level}`}
            </Badge>
            <Badge variant="outline">{standard.standardId}</Badge>
            <Badge variant="outline">
              {(() => {
                const years = standard.entries.flatMap((e) =>
                  e.isBulk
                    ? [e.yearFrom, e.yearTo].filter(Boolean)
                    : [e.year].filter(Boolean),
                ) as number[];
                if (years.length === 0) return "No years";
                const min = Math.min(...years);
                const max = Math.max(...years);
                return min === max ? `${min}` : `${min}–${max}`;
              })()}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* Main Content */}
      <div className="space-y-4">
        {standard.entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-muted-foreground/50 p-12 text-center">
            <p className="text-muted-foreground">
              No papers available for this standard
            </p>
          </div>
        ) : (
          <>
            {/* Select All / Deselect All */}
            {standard.entries.length > 0 && (
              <div className="flex justify-between items-center gap-3">
                <p className="text-xs text-muted-foreground">
                  {selectedCount} of {totalCount} selected
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {selectedCount === 0
                      ? "Select All"
                      : selectedCount === totalCount
                        ? "Deselect All"
                        : `Clear Selection`}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      void doDownload();
                    }}
                    disabled={selectedCount === 0 || downloading}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {downloading
                      ? "Downloading..."
                      : `Download ${selectedCount > 0 ? `(${selectedCount})` : ""}`}
                  </Button>
                </div>
              </div>
            )}

            {/* Years/Entries Table */}
            <div className="rounded-lg border">
              <ScrollArea className="h-[70vh]">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            selectedCount === totalCount && totalCount > 0
                          }
                          onCheckedChange={() => toggleAll()}
                        />
                      </TableHead>
                      <TableHead className="w-20">Year</TableHead>
                      <TableHead className="flex-1">Type</TableHead>
                      <TableHead className="flex-1">Filename</TableHead>
                      <TableHead className="flex-1">Sources</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standard.entries.map((entry, entryIndex) =>
                      entry.typeChoices?.map((typeChoice, typeIndex) => {
                        const key = `${entryIndex}:${typeIndex}`;
                        const isSelected = selection[key];
                        const filename =
                          typeChoice.papers?.[0]?.filename || "—";

                        return (
                          <TableRow
                            key={key}
                            className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                              isSelected ? "bg-muted/30" : ""
                            }`}
                            onClick={() => toggleSelection(key)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={Boolean(isSelected)}
                                onCheckedChange={() => toggleSelection(key)}
                              />
                            </TableCell>
                            <TableCell className="font-medium whitespace-nowrap">
                              {typeIndex === 0 ? entry.label : ""}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {typeChoice.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground truncate">
                              {filename}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {entry.sourceSummary || "-"}
                            </TableCell>
                          </TableRow>
                        );
                      }),
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
