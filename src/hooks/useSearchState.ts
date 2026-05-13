import { useState } from "react";

export function useSearchState() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDurationNs, setSearchDurationNs] = useState<bigint | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    searchLoading,
    setSearchLoading,
    searchDurationNs,
    setSearchDurationNs,
    searchError,
    setSearchError,
  };
}
