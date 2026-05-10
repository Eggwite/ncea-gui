import React, { useState } from "react";
import Card from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Badge } from "../components/ui/badge";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldLabel } from "@/components/ui/field";

export default function SearchView({
  onSelectStandard,
}: {
  onSelectStandard: (std: any) => void;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (v: any) => {
    if (typeof v === "string") {
      setQuery(v);
    } else if (v && v.target && typeof v.target.value === "string") {
      setQuery(v.target.value);
    } else {
      setQuery("");
    }
  };

  const doSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = typeof query === "string" ? query : "";
      const res = await window.ncea.search(q || "");
      //temporary log
      console.log("search results:", JSON.stringify(res, null, 2));
      setResults(res || []);
    } catch (e: any) {
      setError(String(e?.message || e));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      doSearch();
    }
  };
  const handleSelectStandard = async (std: any) => {
    try {
      const detailed = await window.ncea.getStandard(std.standardId);
      onSelectStandard(detailed ?? std);
    } catch {
      onSelectStandard(std);
    }
  };

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
        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            <p className="font-semibold">Search Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && results && results.length === 0 && query && (
          <div className="rounded-lg border border-dashed border-muted-foreground/50 p-8 text-center">
            <p className="text-muted-foreground">
              No results found for "{query}"
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Try searching with a different standard ID
            </p>
          </div>
        )}

        {!loading && (!results || results.length === 0) && !query && (
          <div className="rounded-lg border border-dashed border-muted-foreground/50 p-12 text-center">
            <p className="text-lg font-medium text-muted-foreground">
              Ready to search
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Enter a standard ID above to get started
            </p>
          </div>
        )}

        {!loading && results && results.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground mb-3">
              Found {results.length} result{results.length !== 1 ? "s" : ""}
            </div>
            {results.map((r: any) => (
              <Card
                key={r.standardId}
                onClick={() => handleSelectStandard(r)}
                className="hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
                      {r.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 items-center mt-2">
                      <Badge variant="outline" className="text-xs">
                        {r.subject}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Level {r.level}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {r.standardId}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 text-right flex-shrink-0">
                    <div className="text-sm font-medium">
                      {r.entries?.length || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">years</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
