<div align="center">

# 🎓 NCEA GUI

**Find and download NCEA past papers — no hassle.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey.svg)]()
[![Releases](https://img.shields.io/github/v/release/Eggwite/ncea-gui)](../../releases/latest)

<!-- TODO: add a demo GIF here -->
<img width="804" height="533" alt="image" src="https://github.com/user-attachments/assets/1b3f68cf-bc39-4f3d-8cef-6ed8110608ac" />


A desktop app for finding and downloading NCEA past papers built for students.

</div>

---

## Installation

### Windows

1. Download **`NCEA GUI-Windows-Setup.exe`** from [Releases](../../releases/latest)
2. Run the installer and follow the prompts
3. Launch **NCEA GUI** from your desktop or Start Menu

### Linux

1. Download **`NCEA GUI-Linux.AppImage`** from [Releases](../../releases/latest)
2. Make it executable:
   ```bash
   chmod +x "NCEA GUI-Linux.AppImage"
   ```
3. Double-click to run, or launch from terminal:
   ```bash
   ./"NCEA GUI-Linux.AppImage"
   ```

> For building from source, see [docs/BUILD.md](docs/BUILD.md).

---

## How it works

**1. Search** — type a subject, standard ID, or keyword

<img width="934" height="266" alt="image" src="https://github.com/user-attachments/assets/f8963513-7cb1-42c3-8514-4865805ba400" />

**2. Pick your papers** — choose the year and paper type you need

<img width="916" height="383" alt="image" src="https://github.com/user-attachments/assets/fb977f82-37f2-4260-be8d-149288363088" />

**3. Download** — files are saved straight to your Downloads folder

<img width="931" height="539" alt="image" src="https://github.com/user-attachments/assets/dab09272-7ad8-494b-b410-647737457e1a" />

---
<div align="center">

## Features

| | |
|---|---|
| 🔍 | Fuzzy search over titles, subjects, and standard IDs |
| 📚 | Multi-source retrieval with source preference support |
| 📅 | Interactive year and paper-type selection |
| ⚡ | Manifest and adapter caching for faster repeat lookups |
| ⚙️ | Settings for download folder, source preference, and cache management |
| 🖥️ | Native desktop app |
</div>

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

### Running GUI Tests

Use these before opening a PR to catch common frontend regressions:

```bash
npm test
```

Watch mode while developing:

```bash
npm run test:watch
```

## License

MIT


<div align="center">

~ made with lots of love by a fellow student! 💖

</div>
