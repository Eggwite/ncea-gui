import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
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
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/Card";
import { FieldLabel } from "@/components/ui/field";
import {
	AppWindow,
	Download,
	ExternalLink,
	FolderInput,
	RotateCcw,
	Trash2,
} from "lucide-react";
import { AppConfig } from "@/hooks/useAppConfig";
import { getLatestVersion } from "@/lib/utils";
import SourcePreferenceFields from "@/components/settings/SourcePreferenceFields";

const currentVersion = __APP_VERSION__;

interface SettingsViewProps {
	config: AppConfig;
	onConfigUpdate: (
		key: keyof AppConfig,
		value: string | boolean
	) => Promise<void>;
	onClose?: () => void;
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
	const [latestVersion, setLatestVersion] = useState<string>(currentVersion);
	const [maintenanceTarget, setMaintenanceTarget] = useState<
		"cache" | "manifest" | null
	>(null);

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

		// Fetch latest version dynamically
		getLatestVersion("Eggwite", "ncea-gui")
			.then((v) => setLatestVersion(String(v)))
			.catch(() => {}); // Keep current version if fetch fails
	}, [config]);

	const pickFolder = async () => {
		const p = await window.ncea.pickFolder();
		if (p) {
			setDownloadPath(p);
			void onConfigUpdate("downloadPath", p);
		}
	};

	const resetDownloadPath = async () => {
		const defaultPath = await window.ncea.resetDownloadPath();
		if (defaultPath) {
			setDownloadPath(defaultPath);
			void onConfigUpdate("downloadPath", defaultPath);
		}
	};

	const runMaintenanceAction = async () => {
		if (maintenanceTarget === "cache") {
			await window.ncea.clearCache();
			toast.success("Cache cleared");
		} else if (maintenanceTarget === "manifest") {
			await window.ncea.clearManifest();
			toast.success("Manifest cleared");
		}

		setMaintenanceTarget(null);
	};

	return (
		<div className="space-y-6">
			<AlertDialog
				open={maintenanceTarget !== null}
				onOpenChange={(open) => {
					if (!open) setMaintenanceTarget(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{maintenanceTarget === "cache"
								? "Clear adapter cache?"
								: "Clear manifest metadata?"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{maintenanceTarget === "cache"
								? "This removes cached source data and may make the next search slower."
								: "This removes stored manifest metadata and will rebuild it when needed."}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={() => void runMaintenanceAction()}>
							Continue
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<div className="space-y-2">
				<div className="flex items-center justify-between gap-3">
					<div>
						<h2 className="text-3xl font-bold">Settings</h2>
						<p className="text-sm text-muted-foreground">
							Configure your preferences
						</p>
					</div>
				</div>
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
										onClick={() => {
											void resetDownloadPath();
										}}
										variant="ghost"
										size="icon"
									>
										<RotateCcw />
									</Button>
								</InputGroup>

								<Button
									onClick={() => {
										void pickFolder();
									}}
									variant="outline"
									size="sm"
								>
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
							<Download className="w-8 h-8" />
							<div>
								<CardTitle className="text-base">Source Preferences</CardTitle>
								<CardDescription>
									Choose your preferred file provider and ordering behaviour
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<SourcePreferenceFields
							sources={sources}
							favoriteSource={favorite}
							alwaysRefresh={alwaysRefresh}
							onFavoriteSourceChange={(value) => {
								setFavorite(value);
								void onConfigUpdate("favoriteSource", value);
							}}
							onAlwaysRefreshChange={(value) => {
								setAlwaysRefresh(value);
								void onConfigUpdate("alwaysRefresh", value);
							}}
						/>
					</CardContent>
				</Card>

				{/* Maintenance */}
				<Card>
					<CardHeader>
						<div className="flex items-center gap-3">
							<Trash2 className="w-8 h-8" />
							<div>
								<CardTitle className="text-base">Maintenance</CardTitle>
								<CardDescription>Clear cached data to free up space</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-2 mb-3">
							<div className="flex gap-1">
								<Button
									variant="destructive"
									size="sm"
									onClick={() => setMaintenanceTarget("cache")}
									className="text-destructive hover:text-destructive hover:bg-destructive/10"
								>
									Clear Cache
								</Button>
							</div>
							<div className="flex gap-1">
								<Button
									variant="destructive"
									size="sm"
									onClick={() => setMaintenanceTarget("manifest")}
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
								onClick={() => {
									void window.ncea.openCacheFolder();
								}}
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
								onClick={() => {
									void window.ncea.openManifestFolder();
								}}
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
							<AppWindow className="w-9 h-9" />
							<div>
								<CardTitle className="text-base">App Version</CardTitle>
								<CardDescription>
									The app should auto-update when a new release is published
									{/* <Button
                    variant="link"
                    size="sm"
                    className="ml-1 p-0"

                    // Add opening GitHub releases page function later (requires passing IPC function from main process otherwise it only opens in an electron browser window which is not ideal)
                  >
                    GitHub releases page <ExternalLink />
                  </Button> */}
								</CardDescription>
							</div>
						</div>
					</CardHeader>
					<CardContent>
						<p className="text-xs text-muted-foreground">
							<strong>Current:</strong> v{currentVersion}
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
