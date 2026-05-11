import React, { useEffect, useState } from "react";
import { Sheet } from "../components/ui/sheet";
import { Checkbox } from "../components/ui/Checkbox";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

type DownloadPaper = {
  filename: string;
};

type PaperChoice = {
  label: string;
  papers?: DownloadPaper[];
};

type PaperEntry = {
  label: string;
  isBulk?: boolean;
  typeChoices?: PaperChoice[];
};

type PaperGroup = {
  entries?: PaperEntry[];
};

type SelectorStandard = {
  standardId: string;
  title?: string;
};

export default function PaperSelector({
  standard,
  onClose,
  onDownloadStart,
  downloadPath,
}: {
  standard: SelectorStandard | null;
  onClose: () => void;
  onDownloadStart: (item: { paper: DownloadPaper; filename: string }) => void;
  downloadPath: string;
}) {
  const [groups, setGroups] = useState<PaperGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!standard) return;
    setLoading(true);
    setSelection({});
    window.ncea
      .getPapers(standard.standardId)
      .then((res) => {
        setGroups((res || []) as PaperGroup[]);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [standard]);

  const rows = groups.flatMap((group, groupIndex) =>
    (group.entries || []).flatMap((entry, entryIndex) =>
      (entry.typeChoices || []).map((typeChoice, typeIndex) => ({
        key: `${groupIndex}:${entryIndex}:${typeIndex}`,
        groupIndex,
        entryIndex,
        typeIndex,
        group,
        entry,
        typeChoice,
      })),
    ),
  );

  const selectedCount = rows.filter(({ key }) => selection[key]).length;
  const totalCount = rows.length;

  const toggle = (key: string) => {
    setSelection((current) => ({ ...current, [key]: !current[key] }));
  };

  const toggleAll = () => {
    setSelection((current) => {
      const allSelected =
        rows.length > 0 && rows.every(({ key }) => current[key]);
      if (allSelected) {
        return {};
      }

      return rows.reduce<Record<string, boolean>>((next, row) => {
        next[row.key] = true;
        return next;
      }, {});
    });
  };

  const doDownload = async () => {
    const chosenRows = rows.filter(({ key }) => selection[key]);
    if (chosenRows.length === 0) return;

    for (const row of chosenRows) {
      const paper = row.typeChoice?.papers?.[0];
      if (paper) {
        onDownloadStart({ paper, filename: paper.filename });
        window.ncea.download(paper, downloadPath || "").catch(() => {});
      }
    }

    onClose();
  };

  return (
    <Sheet
      open={Boolean(standard)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6 sm:px-8 sm:py-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            {standard?.title || standard?.standardId}
          </h2>
          <p className="text-sm text-muted-foreground">
            Select the papers you want to download. Rows are grouped by year,
            and clicking anywhere on a row toggles it.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {selectedCount} of {totalCount} selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAll}
              disabled={totalCount === 0}
            >
              {selectedCount === 0
                ? "Select All"
                : selectedCount === totalCount
                  ? "Deselect All"
                  : "Clear Selection"}
            </Button>
            <Button
              size="sm"
              onClick={doDownload}
              disabled={selectedCount === 0}
            >
              Download Selected
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex min-h-96 items-center justify-center rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/20 px-6 py-12">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-primary mb-2"></div>
              <p className="text-muted-foreground">Loading papers…</p>
            </div>
          </div>
        )}

        {!loading && groups && groups.length === 0 && (
          <div className="rounded-2xl border border-dashed border-muted-foreground/50 p-10 text-center">
            <p className="text-muted-foreground">
              No papers available for this standard
            </p>
          </div>
        )}

        {!loading && groups && groups.length > 0 && (
          <div className="rounded-2xl border bg-card/40 shadow-sm">
            <ScrollArea className="h-[min(72vh,calc(100vh-16rem))] min-h-96">
              <div className="overflow-x-auto">
                <Table className="min-w-208 table-fixed">
                  <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
                    <TableRow>
                      <TableHead className="w-14">Select</TableHead>
                      <TableHead className="w-[62%]">Paper type</TableHead>
                      <TableHead className="w-28 text-right">Papers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group, gi) =>
                      (group.entries || []).map((entry, ei) => (
                        <React.Fragment key={`${gi}:${ei}`}>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableCell colSpan={3} className="px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-semibold text-foreground">
                                    {entry.label}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {entry.typeChoices?.length || 0} paper type
                                    {(entry.typeChoices?.length || 0) !== 1
                                      ? "s"
                                      : ""}
                                  </p>
                                </div>
                                {entry.isBulk && (
                                  <Badge variant="outline" className="text-xs">
                                    Bulk ZIP
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {(entry.typeChoices || []).map((typeChoice, ti) => {
                            const key = `${gi}:${ei}:${ti}`;
                            const isSelected = Boolean(selection[key]);

                            return (
                              <TableRow
                                key={key}
                                data-state={
                                  isSelected ? "selected" : "unselected"
                                }
                                className={`cursor-pointer ${
                                  isSelected ? "bg-muted/25" : ""
                                }`}
                                onClick={() => toggle(key)}
                              >
                                <TableCell className="w-14 align-top">
                                  <Checkbox
                                    checked={isSelected}
                                    onClick={(event) => event.stopPropagation()}
                                    onCheckedChange={() => toggle(key)}
                                  />
                                </TableCell>
                                <TableCell className="whitespace-normal align-top">
                                  <div className="space-y-1">
                                    <p className="font-medium leading-5">
                                      {typeChoice.label}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Available in this year section
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="w-28 text-right align-top">
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {typeChoice.papers?.length || 0}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </React.Fragment>
                      )),
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </Sheet>
  );
}
