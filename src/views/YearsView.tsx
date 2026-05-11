import React, { useState } from "react";
import { ChevronLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
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
    papers: unknown[];
    sourceCount: number;
  }>;
  typeSummary?: string;
  sourceSummary?: string;
}

interface StandardData {
  standardId: string;
  title: string;
  subject: string;
  level: number;
  label?: string;
  entries: YearEntry[];
}

interface YearsViewProps {
  standard: StandardData;
  onBack: () => void;
  onDownloadStart: (item: any) => void;
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

  const doDownload = async () => {
    const chosen = Object.keys(selection).filter((k) => selection[k]);
    if (chosen.length === 0) return;

    setDownloading(true);
    try {
      for (const key of chosen) {
        const [eIndex, tIndex] = key.split(":").map(Number);
        const entry = standard.entries[eIndex];
        const typeChoice = entry?.typeChoices?.[tIndex];
        const paper = typeChoice?.papers?.[0];

        if (paper) {
          onDownloadStart({
            paper,
            filename: (paper as any).filename,
          });
          try {
            await window.ncea.download(paper, downloadPath || "");
          } catch (e) {
            console.error("Download failed:", e);
          }
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

  return (
    <div className="space-y-4">
      {/* Compact Header with Back Button & Metadata */}
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ChevronLeft className="w-4 h-4" />
          Back to Search
        </Button>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{standard.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{standard.subject}</Badge>
            <Badge variant="secondary">Level {standard.level}</Badge>
            <Badge variant="outline">{standard.standardId}</Badge>
            <Badge variant="outline">
              {standard.entries.length} year
              {standard.entries.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </div>
      </div>

      <Separator />

      {/* Instructions */}
      <p className="text-sm text-muted-foreground">
        Select the years and paper types you want to download (
        {standard.entries.flatMap((e) => e.typeChoices || []).length} total)
      </p>

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
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {selectedCount} of {totalCount} selected
                </p>
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {selectedCount === 0
                    ? "Select All"
                    : selectedCount === totalCount
                      ? "Deselect All"
                      : `Clear Selection`}
                </Button>
              </div>
            )}

            {/* Years/Entries Table */}
            <div className="rounded-lg border">
              <ScrollArea className="h-96">
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
                      <TableHead className="w-32">Year</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-24 text-right">Papers</TableHead>
                      <TableHead className="w-20 text-right">Sources</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standard.entries.map((entry, entryIndex) =>
                      entry.typeChoices?.map((typeChoice, typeIndex) => {
                        const key = `${entryIndex}:${typeIndex}`;
                        const isSelected = selection[key];

                        return (
                          <TableRow
                            key={key}
                            className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                              isSelected ? "bg-muted/30" : ""
                            }`}
                          >
                            <TableCell>
                              <Checkbox
                                checked={Boolean(isSelected)}
                                onCheckedChange={() => toggleSelection(key)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="space-y-1">
                                <p>{entry.label}</p>
                                {entry.sourceSummary && (
                                  <p className="text-xs text-muted-foreground">
                                    {entry.sourceSummary}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {typeChoice.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary" className="text-xs">
                                {typeChoice.papers?.length || 0}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {typeChoice.sourceCount > 1 && (
                                <Badge variant="secondary" className="text-xs">
                                  {typeChoice.sourceCount}
                                </Badge>
                              )}
                              {typeChoice.sourceCount <= 1 && (
                                <span className="text-xs text-muted-foreground">
                                  -
                                </span>
                              )}
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

      {/* Action Buttons */}
      {standard.entries.length > 0 && (
        <>
          <Separator />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onBack}>
              Cancel
            </Button>
            <Button
              onClick={doDownload}
              disabled={selectedCount === 0 || downloading}
            >
              <Download className="w-4 h-4 mr-2" />
              {downloading
                ? "Downloading..."
                : `Download ${selectedCount > 0 ? `(${selectedCount})` : ""}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
