import React, { useEffect, useState } from "react";
import { Sheet } from "../components/ui/sheet";
import { Checkbox } from "../components/ui/checkbox";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";

export default function PaperSelector({
  standard,
  onClose,
  onDownloadStart,
}: {
  standard: any;
  onClose: () => void;
  onDownloadStart: (item: any) => void;
}) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!standard) return;
    setLoading(true);
    window.ncea
      .getPapers(standard.standardId)
      .then((res) => {
        setGroups(res || []);
      })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [standard]);

  const toggle = (key: string) => {
    setSelection((s) => ({ ...s, [key]: !s[key] }));
  };

  const doDownload = async () => {
    const chosen = Object.keys(selection).filter((k) => selection[k]);
    if (chosen.length === 0) return;
    const cfg = await window.ncea
      .getConfig()
      .catch(() => ({ downloadPath: undefined }));
    const path = cfg?.downloadPath || "";
    // For MVP, assume group entries contain papersByType
    for (const key of chosen) {
      const [gIndex, tIndex] = key.split(":").map(Number);
      const group = groups[gIndex];
      const type = group?.entries?.[0]?.typeChoices?.[tIndex];
      const paper = type?.papers?.[0];
      if (paper) {
        onDownloadStart({ paper, filename: paper.filename });
        window.ncea.download(paper, path).catch(() => {});
      }
    }
    onClose();
  };

  return (
    <Sheet open={Boolean(standard)} onClose={onClose}>
      <div className="p-6 max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">
            {standard?.title || standard?.standardId}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select the papers you want to download
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
              <p className="text-muted-foreground">Loading papers…</p>
            </div>
          </div>
        )}

        {!loading && groups && groups.length === 0 && (
          <div className="rounded-lg border border-dashed border-muted-foreground/50 p-8 text-center">
            <p className="text-muted-foreground">
              No papers available for this standard
            </p>
          </div>
        )}

        {!loading && groups && groups.length > 0 && (
          <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
            {groups.map((g: any, gi: number) => (
              <Card key={g.label}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{g.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {g.entries?.[0]?.typeChoices?.map((t: any, ti: number) => (
                      <FieldLabel
                        key={t.type}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <Checkbox
                          checked={Boolean(selection[`${gi}:${ti}`])}
                          onCheckedChange={() => toggle(`${gi}:${ti}`)}
                        />
                        <Field className="flex-1">
                          <FieldLabel className="text-sm font-medium">
                            {t.label}
                          </FieldLabel>
                          <FieldLabel className="text-xs text-muted-foreground">
                            {t.papers?.length || 0} paper
                            {(t.papers?.length || 0) !== 1 ? "s" : ""}
                          </FieldLabel>
                        </Field>
                      </FieldLabel>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={doDownload}>Download Selected</Button>
        </div>
      </div>
    </Sheet>
  );
}
