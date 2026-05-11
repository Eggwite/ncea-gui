import React, { useState } from "react";
import Card from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { formatDurationNs } from "@/lib/utils";

/** Step 1: Search result - basic standard info without years/papers */
interface SearchStandard {
  standardId: string;
  title: string;
  subject: string;
  level: string;
  label?: string;
  credits?: number;
  entries: unknown[]; // Empty in search results
}

/** Step 2: Detailed standard with years/papers populated */
interface DetailedStandard extends SearchStandard {
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

interface SearchViewProps {
  onSelectStandard: (std: DetailedStandard) => void;
  query?: string;
  onQueryChange?: (query: string) => void;
  results?: SearchStandard[] | null;
  onResultsChange?: (results: SearchStandard[] | null) => void;
  loading?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  durationNs?: bigint | null;
  onDurationChange?: (duration: bigint | null) => void;
  error?: string | null;
  onErrorChange?: (error: string | null) => void;
}

export default function SearchView({
  onSelectStandard,
  query: propQuery,
  onQueryChange,
  results: propResults,
  onResultsChange,
  loading: propLoading,
  onLoadingChange,
  durationNs: propDurationNs,
  onDurationChange,
  error: propError,
  onErrorChange,
}: SearchViewProps) {
  // Use prop values if provided (from App), otherwise use local state for backward compatibility
  const [localQuery, setLocalQuery] = useState("");
  const [localSearchLoading, setLocalSearchLoading] = useState(false);
  const [localSearchDurationNs, setLocalSearchDurationNs] = useState<
    bigint | null
  >(null);
  const [selectingStandardId, setSelectingStandardId] = useState<string | null>(
    null,
  );
  const [localResults, setLocalResults] = useState<SearchStandard[] | null>(
    null,
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const query = propQuery !== undefined ? propQuery : localQuery;
  const setQuery = onQueryChange || setLocalQuery;
  const searchLoading =
    propLoading !== undefined ? propLoading : localSearchLoading;
  const setSearchLoading = onLoadingChange || setLocalSearchLoading;
  const searchDurationNs =
    propDurationNs !== undefined ? propDurationNs : localSearchDurationNs;
  const setSearchDurationNs = onDurationChange || setLocalSearchDurationNs;
  const results = propResults !== undefined ? propResults : localResults;
  const setResults = onResultsChange || setLocalResults;
  const error = propError !== undefined ? propError : localError;
  const setError = onErrorChange || setLocalError;

  const handleInputChange = (v: unknown) => {
    if (typeof v === "string") {
      setQuery(v);
    } else if (
      v &&
      typeof v === "object" &&
      "target" in v &&
      v.target &&
      typeof v.target === "object" &&
      "value" in v.target &&
      typeof v.target.value === "string"
    ) {
      setQuery(v.target.value);
    } else {
      setQuery("");
    }
  };

  const doSearch = async () => {
    setSearchLoading(true);
    setSearchDurationNs(null);
    setError(null);
    const startedAt = performance.now();
    try {
      const q = typeof query === "string" ? query : "";
      const res = await window.ncea.search(q || "");
      setResults(res || []);
      const elapsedNs = BigInt(
        Math.max(0, Math.round((performance.now() - startedAt) * 1_000_000)),
      );
      setSearchDurationNs(elapsedNs);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(errorMessage);
      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      doSearch();
    }
  };
  const handleSelectStandard = async (std: SearchStandard) => {
    setSelectingStandardId(std.standardId);
    try {
      const detailed = await window.ncea.getStandard(std.standardId);
      if (detailed) {
        onSelectStandard(detailed);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      setError(errorMessage);
    } finally {
      setSelectingStandardId(null);
    }
  };
  const resultCount = results?.length ?? 0;
  const searchSummary =
    searchDurationNs !== null
      ? `Found ${resultCount} result${resultCount !== 1 ? "s" : ""} in ${formatDurationNs(searchDurationNs)}`
      : null;

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Search Standards</h2>
        <p className="text-muted-foreground mb-4">
          Find and download NCEA exam papers by standard ID
        </p>
      </div>

      {/* Search Input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <ButtonGroup className="w-full">
            <Input
              value={typeof query === "string" ? query : ""}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="Search standards, e.g. 91026"
              className="pr-10"
            />
            <Button onClick={doSearch} variant="outline">
              Search
            </Button>
          </ButtonGroup>
        </div>
      </div>

      {/* Results Section */}
      <div className="min-h-96">
        {searchLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        )}

        {!searchLoading && error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <p className="font-semibold">Search Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!searchLoading && results && results.length === 0 && query && (
          <div className="rounded-lg border border-dashed border-muted-foreground/50 p-8 text-center">
            <p className="text-muted-foreground">
              No results found for "{query}"
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Try searching with a different standard ID
            </p>
            {searchSummary && (
              <p className="text-xs text-muted-foreground mt-2">
                {searchSummary}
              </p>
            )}
          </div>
        )}

        {!searchLoading && (!results || results.length === 0) && !query && (
          <div className="rounded-lg border border-dashed border-muted-foreground/50 p-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Ready to search
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Enter a standard ID above to get started
            </p>
          </div>
        )}

        {!searchLoading && results && results.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-3">
              {searchSummary ??
                `Found ${results.length} result${results.length !== 1 ? "s" : ""}`}
            </div>
            {results.map((r: SearchStandard) => {
              const isSelecting = selectingStandardId === r.standardId;
              return (
                <Card
                  key={r.standardId}
                  onClick={() => handleSelectStandard(r)}
                  className={`hover:shadow-md transition-shadow cursor-pointer group ${
                    isSelecting ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center gap-0 min-w-0">
                    <HoverCard>
                      <HoverCardTrigger asChild>
                        <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors truncate min-w-0 flex-1">
                          {r.title}
                        </h3>
                      </HoverCardTrigger>
                      <HoverCardContent
                        className="w-80" //@ts-expect-error openDelay is missing from types but otherwise works fine.
                        openDelay={300}
                        closeDelay={100}
                      >
                        <div className="space-y-2">
                          <h4 className="font-semibold">{r.title}</h4>
                          {r.credits !== undefined && (
                            <p className="text-sm text-muted-foreground">
                              Credits: {r.credits}
                            </p>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    <div className="flex gap-1 items-center flex-shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {r.subject}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {r.level === "scholarship"
                          ? "Scholarship"
                          : `L ${r.level}`}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {r.standardId}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
