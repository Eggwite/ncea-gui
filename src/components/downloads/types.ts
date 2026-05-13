export type SortField = "downloadedAt" | "fileName" | "size" | "standard";

export interface DownloadRecord {
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

export interface ActiveDownload {
  id?: string;
  filename?: string;
  paper?: { filename: string };
  progress?: number;
  status?: string;
}

export interface DownloadsViewProps {
  downloads?: ActiveDownload[];
  onOpenStandard?: (standardId: string) => void;
}

export interface DownloadGroups {
  groups: Record<string, DownloadRecord[]>;
  orderedKeys: string[];
  items: DownloadRecord[];
}