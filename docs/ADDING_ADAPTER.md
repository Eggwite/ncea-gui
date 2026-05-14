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

### Instance & Static Properties

Every adapter instance has an **instance property** `this.name` set by the base class constructor:

```javascript
// PaperSourceAdapter constructor:
this.name = this.constructor.sourceName ?? this.constructor.name;
```

This means:
- `this.name` is always set and available on every adapter instance.
- If you define a static `sourceName` field, it becomes the instance name; otherwise the class name is used.
- You should **not** define an instance property `sourceName`—that is a loader-only concept and will cause lookup failures in the app.

Use `this.name` in logs, error messages, and returned paper objects (`sourceName` field in paper JSON).

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

## Adapter Identity & Logging

**Important:** Adapter identity is derived from `this.name`, which is automatically set by the base class. The adapter loader validates that every adapter has a non-empty name at discovery time—if not, the adapter is skipped and a warning is logged.

Never attempt to define an instance property `sourceName`—that is internal to the loader and will cause "unknown adapter" errors in logs.

### How adapter names flow through the system

1. Loader discovers adapters and validates each has a name (from static `sourceName` or class name)
2. Loader builds a metadata map keyed by `sourceName` (derived from `this.name`)
3. During search, when timeouts/errors occur, progress events use `adapter.name` to look up the display name in the metadata map
4. If validation fails at step 1, the adapter is skipped and a warning is logged

### Example: avoiding "unknown adapter" errors and loader validation failures

```javascript
export class MyAdapter extends PaperSourceAdapter {
  static sourceName = "MyAdapter";      // ✓ Correct: sets this.name
  static displayName = "My Paper Source";

  async buildIndex() {
    return [{
      standardId: "91606",
      sourceName: this.name,  // ✓ Correct: always use this.name
      // ...
    }];
  }
}

// ✗ WRONG - will be skipped during adapter discovery:
export class BadAdapter extends PaperSourceAdapter {
  constructor() {
    // super() not called - this.name will be undefined!
    this.sourceName = "BadAdapter";  // ✗ This won't work
  }
}

// ✗ WRONG - will fail validation:
export class AnotherBadAdapter extends PaperSourceAdapter {
  constructor() {
    super();
    delete this.name;  // ✗ Removing the name causes validation failure
  }
}
```

If an adapter's loader validation fails, the app will emit a warning to the console and skip that adapter. If an adapter somehow bypasses validation and has no name, search will emit `timeout=true` events with `adapter=unknown` in the IPC logs.

## Fully Commented Example

```javascript
import { PaperSourceAdapter } from "./index.js";
import { CacheService } from "../core/cache.js";
import { HTTP_TIMEOUT_MS, INDEX_CACHE_TTL_MS, PaperType } from "../core/constants.js";

export class ExampleAdapter extends PaperSourceAdapter {
  static displayName = "Example Educational Source";
  static sourceName = "ExampleAdapter"; // Optional: sets this.name to "ExampleAdapter"

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
          sourceName: this.name, // Always use this.name, not sourceName property
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

## Testing Your Adapter

All adapters are automatically tested by the adapter validation suite. When you add a new adapter, these tests will run against it immediately—no test setup required.

### What Gets Tested Automatically

Your adapter is automatically validated by the search resilience test suite (`src/electron-search-resilience.test.ts`). At discovery time, the loader checks:

1. **Name** – Every adapter instance must have a non-empty `name`
2. **Methods** – The adapter must implement `fetchByStandard()` or `buildIndex()`

### Running Adapter Tests

After adding your adapter file and updating `loader.js`:

```bash
npm run test
```

The validator will check your adapter:
- Blank adapter name → **Skipped at discovery time** (logged as warning)
- Other validation failures → **Test failure with details** (missing fields, wrong types, name mismatches, invalid years, etc.)

### Common Test Failures and Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `adapter.name must be a non-empty string` | Constructor issue | Ensure `super()` is called; define static `sourceName` |
| `missing required fields: standardId` | Paper missing field | Check returned paper objects have all required fields |
| `paper.sourceName must match requested standard` | Wrong data in result | Verify `fetchByStandard()` filters correctly |
| `yearFrom must be <= yearTo` | Invalid BULK_ZIP years | Ensure year ranges are ordered correctly |

## Pull Requests and Issues

If your adapter works locally and passes tests, consider submitting a Pull Request. If you encounter core bugs or schema issues, open an Issue with trace logs attached.