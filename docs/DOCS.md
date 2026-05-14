# NCEA GUI Documentation

## Overview

NCEA GUI is a desktop application for finding and downloading NCEA past papers.

It is built for students who prefer a graphical interface, and supports:

- Fuzzy search over titles, subjects, and standard IDs.
- Multi-source paper retrieval with source preference handling.
- Interactive year and paper-type selection.
- Local manifest and adapter caching for faster repeat usage.
- Settings for download location, source preferences, and cache management.

## Install

Download the latest installer from [Releases](../../releases/latest) and run it.

### Windows

Run **`NCEA GUI-Windows-Setup.exe`** and follow the prompts.

### Linux

Make the AppImage executable and run it:

```bash
chmod +x "NCEA GUI-Linux.AppImage"
./"NCEA GUI-Linux.AppImage"
```

> For building from source, see [BUILD.md](BUILD.md).

## Usage

### Search

Type a subject, standard ID, or keyword into the search bar and press **Search** or hit Enter. The app returns ranked matching standards — click one to proceed to paper selection.

### Paper Selection

After selecting a standard the app fetches all available papers and displays them in a table grouped by year. Check the papers you want and click **Download**.

- Use **Select All** to select every available paper for that standard.
- The duplicate detection prompt will warn you if a file already exists on disk.

### Download

Downloads run in the background. Active and completed downloads are shown in the downloads panel. Completed downloads show an **Open Folder** button to jump straight to the file.

### Settings

Open Settings via the gear icon in the top right.

- **Download Folder** — where downloaded files are saved (defaults to your system Downloads folder).
- **Favourite Source** — which source to prefer when multiple are available.
- **Always Refresh Sources** — bypass cached data and fetch live from sources on every search.
- **Clear Cache** — delete cached adapter data.
- **Clear Manifest** — delete saved manifest metadata.

## Data and Cache

The app stores a small amount of data locally to open faster and avoid redundant network requests.

Cache path:

- `~/.ncea-cli-cache`

Manifest path:

- `~/.ncea-cli`

These can be cleared from the Settings view.

## Adapter System

Current adapters:

- `OurExamsAdapter`
- `StudyTimeAdapter`
- `NoBrainTooSmallAdapter`
- `QuirkyAdapter`

For adding a new source adapter, see [ADDING_ADAPTER.md](ADDING_ADAPTER.md).

## Project Structure

- `electron/adapters` — source adapters
- `electron/core` — search, models, config, cache, downloader, and manifest
- `electron/seed` — baseline standards catalogue (`standards.json`)
- `src/` — React renderer (UI)
- `src/views/` — page-level views
- `src/components/` — shared UI components

## Troubleshooting

**No results appear**
- Try a different search term or standard ID.
- Enable **Always Refresh Sources** in Settings and search again.

**Source selection feels wrong**
- Set a **Favourite Source** in Settings.

**Downloads fail**
- Check your internet connection.
- Try switching the favourite source in Settings and downloading again.

**App shows no papers for a standard**
- The standard may not be covered by any current adapter.
- Try enabling **Always Refresh Sources** and retrying.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) to get started. Community contributions are welcome, particularly new adapters as paper sources change over time.