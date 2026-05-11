export interface SearchStandard {
  standardId: string;
  title: string;
  subject: string;
  level: string;
  label?: string;
  credits?: number;
  entries: unknown[];
}

export interface DetailedStandard extends SearchStandard {
  entries: Array<{
    entryKey: string;
    label: string;
    year?: number;
    yearFrom?: number;
    yearTo?: number;
    isBulk?: boolean;
    typeChoices?: unknown[];
  }>;
}

export interface PapersProgress {
  completed: number;
  total: number;
  adapter?: string;
  error?: boolean;
}