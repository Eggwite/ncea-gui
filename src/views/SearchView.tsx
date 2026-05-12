import React, { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { formatDurationNs } from "@/lib/utils";
import SearchHeader from "@/components/search/SearchHeader";
import SearchInput from "@/components/search/SearchInput";
import SearchEmptyState from "@/components/search/SearchEmptyState";
import SearchResultCard from "@/components/search/SearchResultCard";
import { SearchStandard, DetailedStandard, PapersProgress } from "@/types";

const normaliseStandardId = (value: string) =>
  String(value || "").match(/\d{5}/)?.[0] ?? "";

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
  const [papersProgress, setPapersProgress] = useState<PapersProgress | null>(
    null,
  );
  const [displayResults, setDisplayResults] = useState<SearchStandard[] | null>(
    null,
  );

  const pendingQuery = useRef<string>("");
  const hasSearched = useRef(false);
  const lastSearched = useRef<string>("");

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    if (query === lastSearched.current) return;
    lastSearched.current = query;
    pendingQuery.current = query;
    setSearchLoading(true);
    setSearchDurationNs(null);
    setError(null);
    const startedAt = performance.now();
    try {
      const res = await window.ncea.search(query);
      if (pendingQuery.current === query) {
        setResults(res || []);
        hasSearched.current = true;
        setDisplayResults(res || []);
        const elapsedNs = BigInt(
          Math.max(0, Math.round((performance.now() - startedAt) * 1_000_000)),
        );
        setSearchDurationNs(elapsedNs);

        const exactId = normaliseStandardId(query);
        const exactMatch = (res || []).find(
          (item) => normaliseStandardId(item.standardId) === exactId,
        );
        if (exactMatch && exactId && (res || []).length === 1) {
          void handleSelectStandard(exactMatch);
        }
      }
    } catch (e: unknown) {
      if (pendingQuery.current === query) {
        setError(e instanceof Error ? e.message : String(e));
        setDisplayResults([]);
      }
    } finally {
      if (pendingQuery.current === query) {
        setSearchLoading(false);
      }
    }
  }, [query, setSearchLoading, setSearchDurationNs, setError, setResults]);

  useEffect(() => {
    if (!query.trim()) {
      setDisplayResults(null);
      lastSearched.current = "";
      return;
    }
    const timer = setTimeout(() => {
      void doSearch();
    }, 600);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void doSearch();
  };

  const handleSelectStandard = async (std: SearchStandard) => {
    setSelectingStandardId(std.standardId);
    setPapersProgress(null);
    const unsubscribe = window.ncea.onPapersProgress((progress) =>
      setPapersProgress(progress),
    );
    try {
      const grouped = (await window.ncea.getPapers(
        std.standardId,
      )) as DetailedStandard[];
      const detailed = grouped.find((g) => g.standardId === std.standardId);
      if (detailed && detailed.entries.length > 0) {
        onSelectStandard(detailed);
      } else {
        toast.warning("  =^•ᴥ•^= No papers found", {
          description: `Sorry, couldn't find anything for ${std.standardId} from any configured source.`,
        });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSelectingStandardId(null);
      setPapersProgress(null);
      unsubscribe();
    }
  };

  const resultCount = results?.length ?? 0;
  const searchSummary =
    searchDurationNs !== null
      ? `Found ${resultCount} result${resultCount !== 1 ? "s" : ""} in ${formatDurationNs(searchDurationNs)}`
      : null;

  return (
    <div className="space-y-6">
      <SearchHeader />
      <SearchInput
        query={typeof query === "string" ? query : ""}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        onSearch={() => {
          void doSearch();
        }}
      />

      <div className="min-h-96">
        {!searchLoading && error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <p className="font-semibold">Search Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!searchLoading &&
          hasSearched.current &&
          displayResults &&
          displayResults.length === 0 &&
          query && (
            <div className="rounded-lg border border-dashed border-muted-foreground/50 p-8 text-center">
              <p className="text-muted-foreground">No results for "{query}"</p>
              <p className="text-xs text-muted-foreground mt-2">
                Try a different search term, or check that the right sources are
                enabled in Settings.
              </p>
              {searchSummary && (
                <p className="text-xs text-muted-foreground mt-2">
                  {searchSummary}
                </p>
              )}
            </div>
          )}
        {!searchLoading &&
          (!displayResults || displayResults.length === 0) &&
          !query && <SearchEmptyState />}

        {displayResults && displayResults.length > 0 && (
          <div className="space-y-2 animate-in fade-in duration-150">
            <div className="text-sm text-muted-foreground mb-3">
              {searchSummary ??
                `Found ${displayResults.length} result${displayResults.length !== 1 ? "s" : ""}`}
            </div>
            {displayResults.map((r) => (
              <SearchResultCard
                key={r.standardId}
                result={r}
                isSelecting={selectingStandardId === r.standardId}
                papersProgress={papersProgress}
                onSelect={(standard) => {
                  void handleSelectStandard(standard);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
