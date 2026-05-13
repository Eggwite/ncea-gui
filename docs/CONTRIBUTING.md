# Contributing

Thanks for your interest in contributing to NCEA GUI!

## Setting up

```bash
git clone https://github.com/Eggwite/ncea-gui.git
cd ncea-gui
npm install
npm run dev
```

See [docs/BUILD.md](docs/BUILD.md) for full build instructions.

## Ways to contribute

- **Bug reports** — open an Issue with steps to reproduce, your OS, and app version
- **New adapters** — add a new past paper source; see [docs/ADDING_ADAPTER.md](docs/ADDING_ADAPTER.md)
- **UI improvements** — tweaks to the search, paper selector, or settings views
- **Documentation** — fixes, clarifications, or additions to any doc in `docs/`

## Pull requests

- Use conventional commit messages: `fix:`, `feat:`, `refactor:`, `docs:`, `chore:`
- Keep PRs focused — one feature or fix per PR
- For new features, open an Issue first so we can discuss before you build
- For new adapters, follow the adapter guide and include at least one working search result in your PR description

## Code style

- TypeScript for all renderer (`src/`) code
- Plain JS is fine for `electron/` code
- Run `npm run lint` before submitting

## Reporting bugs

Open an Issue and include:
- Your OS and version
- App version (shown in Settings)
- What you did, what you expected, and what happened instead
- Console output if available (open via `View → Toggle Developer Tools`)

---

~ made with lots of love by a fellow student! 💖