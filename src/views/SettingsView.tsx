import React, { useEffect, useState } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Download, Package, Trash2 } from "lucide-react";

export default function SettingsView({ onClose }: { onClose: () => void }) {
  const [downloadPath, setDownloadPath] = useState("");
  const [sources, setSources] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [favorite, setFavorite] = useState("");
  const [alwaysRefresh, setAlwaysRefresh] = useState(false);
  const [storage, setStorage] = useState<{
    cache: string;
    manifest: string;
    total: string;
  } | null>(null);

  useEffect(() => {
    window.ncea
      .getConfig()
      .then((cfg) => {
        setDownloadPath(cfg.downloadPath || "");
        setFavorite(cfg.favoriteSource || "__default__");
        setAlwaysRefresh(Boolean(cfg.alwaysRefresh));
      })
      .catch(() => {});
    window.ncea
      .getSources()
      .then((s) => setSources(s || []))
      .catch(() => {});
    window.ncea
      .getStorageUsage()
      .then((s) => setStorage(s))
      .catch(() => {});
  }, []);

  const pickFolder = async () => {
    const p = await window.ncea.pickFolder();
    if (p) setDownloadPath(p);
  };

  const save = async () => {
    await window.ncea.setConfig("default_download_path", downloadPath);
    await window.ncea.setConfig(
      "favorite_source",
      favorite === "__default__" ? "" : favorite,
    );
    await window.ncea.setConfig("always_refresh_sources", alwaysRefresh);
    onClose();
  };

  const clearCache = async () => {
    if (!confirm("Clear adapter cache?")) return;
    await window.ncea.clearCache();
    alert("Cache cleared");
  };

  const clearManifest = async () => {
    if (!confirm("Clear manifest metadata?")) return;
    await window.ncea.clearManifest();
    alert("Manifest cleared");
  };

  return (
    <Dialog open onClose={onClose}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-2xl w-full">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure your preferences
            </p>
          </div>

          <div className="space-y-6">
            {/* Download Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5" />
                  <div>
                    <CardTitle className="text-base">
                      Download Settings
                    </CardTitle>
                    <CardDescription>
                      Configure where exam papers are downloaded
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <FieldLabel className="block text-sm font-medium mb-2">
                    Download Folder
                  </FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      value={downloadPath}
                      onChange={(e) => setDownloadPath(e.target?.value || e)}
                      placeholder="No folder selected"
                      readOnly
                    />
                    <Button onClick={pickFolder} variant="outline" size="sm">
                      Browse
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Where downloaded exam papers will be saved (Default is your
                    system 'Downloads' folder)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Source Preferences */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5" />
                  <div>
                    <CardTitle className="text-base">
                      Source Preferences
                    </CardTitle>
                    <CardDescription>
                      Choose your preferred data source
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <FieldLabel htmlFor="source-select" className="mb-2">
                    Favourite Source
                  </FieldLabel>
                  <Select value={favorite} onValueChange={setFavorite}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="(default)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">(default)</SelectItem>
                      {sources.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Select which data source to prioritise when searching
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="always-refresh"
                    checked={alwaysRefresh}
                    onCheckedChange={(checked) =>
                      setAlwaysRefresh(checked as boolean)
                    }
                  />
                  <FieldLabel
                    htmlFor="always-refresh"
                    className="cursor-pointer"
                  >
                    Always refresh sources on startup
                  </FieldLabel>
                </div>
                <p className="text-xs text-muted-foreground -mt-2">
                  Fetches the latest data when the app starts (Default is off,
                  not reccomended unless you have issues with stale data)
                </p>
              </CardContent>
            </Card>

            {/* Maintenance */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5" />
                  <div>
                    <CardTitle className="text-base">Maintenance</CardTitle>
                    <CardDescription>
                      Clear cached data to free up space
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCache}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Clear Cache
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearManifest}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    Clear Manifest
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong>Cache:</strong> Clears downloaded source data
                  {storage && <> ({storage.cache})</>}
                  <br />
                  <strong>Manifest:</strong> Clears download history and
                  metadata
                  {storage && <> ({storage.manifest})</>}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save}>Save Settings</Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
