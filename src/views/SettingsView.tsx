import { useEffect, useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { FieldLabel } from "@/components/ui/field";
import {
  Download,
  ExternalLink,
  FolderInput,
  Info,
  Package,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { AppConfig } from "@/hooks/useAppConfig";
import { getLatestVersion } from "@/lib/utils";

const currentVersion = __APP_VERSION__;
const latestVersion = await getLatestVersion("Eggwite", "ncea-gui");

interface SettingsViewProps {
  config: AppConfig;
  onConfigUpdate: (
    key: keyof AppConfig,
    value: string | boolean,
  ) => Promise<void>;
}

export default function SettingsView({
  config,
  onConfigUpdate,
}: SettingsViewProps) {
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
    // Initialize from parent config
    setDownloadPath(config.downloadPath || "");
    setFavorite(config.favoriteSource || "__default__");
    setAlwaysRefresh(Boolean(config.alwaysRefresh));
    window.ncea
      .getSources()
      .then((s) => setSources(s || []))
      .catch(() => {});
    window.ncea
      .getStorageUsage()
      .then((s) => setStorage(s))
      .catch(() => {});
  }, [config]);

  const pickFolder = async () => {
    const p = await window.ncea.pickFolder();
    if (p) {
      setDownloadPath(p);
      onConfigUpdate("downloadPath", p);
    }
  };

  const resetDownloadPath = async () => {
    const defaultPath = await window.ncea.resetDownloadPath();
    if (defaultPath) {
      setDownloadPath(defaultPath);
      onConfigUpdate("downloadPath", defaultPath);
    }
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
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure your preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Download Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Download className="w-8 h-8" />
              <div>
                <CardTitle className="text-base">Download Settings</CardTitle>
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
                <InputGroup>
                  <InputGroupInput
                    value={downloadPath} //@ts-expect-error onChange is missing in InputProps
                    onChange={(e) => setDownloadPath(e.target?.value || e)}
                    placeholder="No folder selected"
                    readOnly
                  />
                  <InputGroupAddon>
                    <FolderInput />
                  </InputGroupAddon>
                  <Button
                    onClick={resetDownloadPath}
                    variant="ghost"
                    size="icon"
                  >
                    <RotateCcw />
                  </Button>
                </InputGroup>

                <Button onClick={pickFolder} variant="outline" size="sm">
                  Browse
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                (Default is your system 'Downloads' folder)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Source Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8" />
              <div>
                <CardTitle className="text-base">Source Preferences</CardTitle>
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
              <Select
                value={favorite}
                onValueChange={(value) => {
                  setFavorite(value);
                  onConfigUpdate(
                    "favoriteSource",
                    value === "__default__" ? "" : value,
                  );
                }}
              >
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
                onCheckedChange={(checked) => {
                  const newValue = checked as boolean;
                  setAlwaysRefresh(newValue);
                  onConfigUpdate("alwaysRefresh", newValue);
                }}
              />
              <FieldLabel htmlFor="always-refresh" className="cursor-pointer">
                Always refresh sources on startup
              </FieldLabel>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              (Default is off, not reccomended unless you have issues with stale
              data)
            </p>
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trash2 className="w-8 h-8" />
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
              <div className="flex gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearCache}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Clear Cache
                </Button>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={clearManifest}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Clear Manifest
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              <strong>Cache:</strong> Clears downloaded source data
              {storage && <> ({storage.cache})</>}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => window.ncea.openCacheFolder()}
                title="Open cache folder"
                className="ml-1 relative top-1"
              >
                <ExternalLink className="h-1 w-1" />
              </Button>
              <br />
              <strong>Manifest:</strong> Clears download history and metadata
              {storage && <> ({storage.manifest})</>}
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => window.ncea.openManifestFolder()}
                title="Open manifest folder"
                className="ml-1 relative top-1"
              >
                <ExternalLink className="h-1 w-1" />{" "}
              </Button>
            </p>
          </CardContent>
        </Card>

        {/* Update/Version */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Info className="w-8 h-8" />
              <div>
                <CardTitle className="text-base">App Version</CardTitle>
                <CardDescription>
                  If there's a newer version available, download it from the
                  GitHub releases page
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              <strong>Current:</strong> {currentVersion}
              <br />
              <strong>Latest:</strong> {latestVersion}
              {currentVersion !== latestVersion && <></>}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
