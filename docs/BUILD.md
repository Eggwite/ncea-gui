# Build

## Prerequisites

- Node.js >= 20
- npm

## Install dependencies

```bash
npm ci
```

If peer dependency conflicts occur:

```bash
npm install --legacy-peer-deps
```

## Development

Start the app in dev mode with hot reload:

```bash
npm run dev
```

## Building

Build for Windows:

```bash
npm run build:win
```

Build for Linux:

```bash
npm run build:linux
```

Build for both:

```bash
npm run build
```

Output is placed in `release/{version}/`.

## Adding a new adapter

1. Add the adapter file to `electron/adapters/`
2. Add a static import in `electron/adapters/loader.js`
3. Rebuild with `npm run build:win` or `npm run build:linux`

See [ADDING_ADAPTER.md](ADDING_ADAPTER.md) for full adapter authoring guidance.

## Common issues

**No adapters found at runtime**
- Ensure the adapter is statically imported in `electron/adapters/loader.js` and rebuild.

**`seed/standards.json` not found / empty search results**
- In development, the file is resolved from `electron/seed/standards.json`.
- In a packaged build, it is resolved from `process.resourcesPath`. Ensure `electron/seed` is listed under `files` in `electron-builder.json5`.
