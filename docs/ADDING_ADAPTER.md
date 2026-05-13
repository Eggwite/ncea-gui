# Adding a New Adapter

This guide explains how to add a new paper source adapter to NCEA GUI.

Adapters retrieve, map, and return paper data from an external source (HTML pages, JSON endpoints, etc.) into the exact JSON shape required by the app.

## `PaperSourceAdapter` API

Every adapter must extend the `PaperSourceAdapter` class and implement one or both of the main fetching methods. Adapter validity is determined by `instanceof PaperSourceAdapter` at runtime.

### Imports required

```javascript
import { PaperSourceAdapter } from "./index.js";
import { PaperType, INDEX_CACHE_TTL_MS } from "../core/constants.js";
import { CacheService } from "../core/cache.js";

export class ExampleAdapter extends PaperSourceAdapter {
  static displayName = "Example Educational Source";

  async buildIndex() { /* ... */ }
  async fetchByStandard(standardId) { /* ... */ }
}
```

Store new adapters in `electron/adapters/`. To include a new adapter in the distributed build, add a static import in `electron/adapters/loader.js` and rebuild.

### `buildIndex()`

Implement this if the source provides a bulk index or search page listing all available papers.

```javascript
/**
 * Scrapes the source to build a complete index of all available papers.
 * @returns {Promise<Array<Object>>}
 */
async buildIndex() {
  // 1. Fetch data from source endpoint
  // 2. Map data to the required JS object shape
  // 3. Return the mapped array
}
```

### `fetchByStandard(standardId)`

Implement this to fetch all material associated with a specific standard number.

```javascript
/**
 * Scrapes the source for papers belonging to a specific standard.
 * @param {string} standardId - The 5-digit standard ID (e.g. "91606")
 * @returns {Promise<Array<Object>>}
 */
async fetchByStandard(standardId) {
  // 1. Fetch data from the endpoint specific to standardId
  // 2. Map data to the required JS object shape
  // 3. Return the mapped array
}
```

## Required Data Shapes

Your methods must return arrays of plain JSON objects mapped to one of the following schemas.

> Use `PaperType` constants rather than raw string literals.

### Single File (PDFs, Docs)

```json
{
  "standardId": "91606",
  "subject": "Biology",
  "title": "Demonstrate understanding of trends in human evolution",
  "level": 3,
  "year": 2024,
  "format": "pdf",
  "url": "https://example.org/91606/2024/exam.pdf",
  "sourceName": "ExampleAdapter",
  "filename": "91606_2024_exam.pdf",
  "type": "exam"
}
```

### Bulk Archive (ZIPs)

```json
{
  "standardId": "91606",
  "subject": "Biology",
  "title": "Topic specific resources",
  "level": 3,
  "yearFrom": 2014,
  "yearTo": 2020,
  "format": "zip",
  "url": "https://example.org/91606/archive.zip",
  "sourceName": "ExampleAdapter",
  "filename": "91606_2014-2020_bulk.zip",
  "type": "bulk_zip"
}
```

## Data Normalisation & Validation Rules

The `PaperSourceAdapter` base class runs `normalisePaper(paper)` for each row and drops invalid objects. Rules:

- `standardId` must be present and parseable.
- `url` must be present.
- For `PaperType.BULK_ZIP`, `coerceYearRange(yearFrom, yearTo)` must succeed.
- For single-file types, `coerceYear(year)` must succeed.

## Caching with `CacheService`

```javascript
import { CacheService } from "../core/cache.js";
import { INDEX_CACHE_TTL_MS } from "../core/constants.js";

const CACHE_KEY = `example_adapter_index`;

return CacheService.getOrSet(CACHE_KEY, INDEX_CACHE_TTL_MS, async () => {
  const response = await fetch("...");
  const data = await response.json();
  return data.map(item => ({ /* mapping */ }));
});
```

## Fully Commented Example

```javascript
import { PaperSourceAdapter } from "./index.js";
import { CacheService } from "../core/cache.js";
import { HTTP_TIMEOUT_MS, INDEX_CACHE_TTL_MS, PaperType } from "../core/constants.js";

export class ExampleAdapter extends PaperSourceAdapter {
  static displayName = "Example Educational Source";

  async buildIndex() {
    return CacheService.getOrSet("example_index", INDEX_CACHE_TTL_MS, async () => {
      try {
        const response = await fetch("https://example.org/api/index.json", {
          signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
        });
        const rows = await response.json();

        return rows.map((row) => ({
          standardId: row.standardId,
          subject: row.category || "Unknown",
          title: row.name || `Standard ${row.standardId}`,
          level: Number(row.nqrLevel) || 0,
          year: Number(row.yearPublished),
          format: "pdf",
          url: row.downloadLink,
          sourceName: this.name,
          filename: `${row.standardId}_${row.yearPublished}_${PaperType.EXAM}.pdf`,
          type: PaperType.EXAM,
        }));
      } catch (err) {
        console.error(`Failed to fetch from ${this.name}: ${err.message}`);
        return [];
      }
    });
  }

  async fetchByStandard(standardId) {
    if (!standardId) return [];
    const index = await this.getIndex();
    return index.filter((paper) => String(paper.standardId) === standardId);
  }
}
```

## Including in the Build

1. Add the adapter file to `electron/adapters/`
2. Add a static import in `electron/adapters/loader.js`
3. Rebuild with `npm run build:win` or `npm run build:linux`

## Pull Requests and Issues

If your adapter works locally, consider submitting a Pull Request. If you encounter core bugs or schema issues, open an Issue with trace logs attached.