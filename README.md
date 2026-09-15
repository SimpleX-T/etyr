# Etyr

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

A selection-based dictionary tooltip browser extension (Manifest V3). Select any word on the web to see definitions, phonetics, and part-of-speech — without leaving the page.

## Features

- **Selection tooltip** — hover over any word on a page; after a configurable delay the tooltip appears with definitions from the dictionary.
- **Inline bookmarking** — save words for later; export to JSON or CSV and re-import.
- **Pronunciation** — speaker button in both the tooltip and popup; uses the Web Speech API.
- **Lookup history** — recent lookups shown in the popup search tab.
- **Site exclusions** — disable Etyr on any site directly from the tooltip or settings page.
- **Dark-first theme** — tooltip is dark translucent glassmorphic by default; light variant toggled via settings or `prefers-color-scheme`.
- **Offline-first** — ships with a curated offline dictionary; falls back to **Wiktionary** (`en.wiktionary.org`) and then the Free Dictionary API (`api.dictionaryapi.dev`) when the offline dictionary has no match.

## Architecture

```
src/
  content/
    index.ts               # Content script entry — wires selection detection, state machine, tooltip, messages.
    selection/
      detector.ts          # Debounced selectionchange + mousedown listener.
      state-machine.ts     # Explicit lifecycle: IDLE → SELECTION_DETECTED → WAITING → RESOLVING → SHOWING → IDLE.
      validate.ts          # Low-confidence keyword filter + bounding-rect sanity.
    tooltip/
      TooltipRoot.tsx      # React shell; owns #etyr-tooltip-root.
      TooltipController.tsx # Translates machine state into React component props.
      components/          # LoadingState, DefinitionList, SpeakerButton, BookmarkButton, icons.
      styles/tooltip.css   # Dark-first glassmorphic tooltip styles with animations.
    styles/tooltip.css     # Imported via the content build pipeline (Vite library mode).

  background/
    service-worker.ts      # Message router for all extension actions (DICTIONARY_RESOLVE, BOOKMARK_*, etc.).

  dictionary/
    resolver.ts            # Singleton resolution pipeline: offline → cache → online. Records history on success.
    offline.ts             # Curated ~250-entry in-memory dictionary.
    online.ts              # Fetch-based Wiktionary + Free Dictionary API wrapper with timeout and errors.
    cache.ts               # chrome.storage.local cache with TTL.
    pronunciation.ts       # Extension-side pronunciation via SpeechSynthesis (background fallback).

  popup/
    App.tsx                # Three-tab shell: Home / Saved / Settings.
    pages/                 # HomePage (search + recent), SavedPage (filter / export / import), SettingsPage.
    components/SearchResult.tsx  # Pronunciation + bookmark controls for a resolved word.
    styles/popup.css

  options/
    App.tsx                # Full settings page: behavior toggles, exclusions list, data actions.
    styles/options.css

  shared/
    types/index.ts         # Public TypeScript types: DictionaryResult, MessageRequest/Response, Settings, etc.
    constants.ts           # MESSAGE_ACTIONS enum, DEFAULT_SETTINGS, STORAGE_KEYS.
    utils.ts               # formatRelativeTime, normalizeQuery, truncate, debounce, createId, slugify.
    messaging.ts           # Typed sendMessage helper wrapping chrome.runtime.sendMessage.

  browser/
    types.ts               # getBrowserAPI() / isExtensionContext() — globalThis-based chrome/firefox detection.
    api.ts                 # Safe wrappers for Chrome APIs (tabs.query, etc.).

  storage/
    database.ts            # Low-level chrome.storage.local get/set wrappers.
    bookmarks.ts           # Saved words CRUD, dedup-by-query, JSON/CSV export helpers, import parser.
    settings.ts            # Merges persisted settings over defaults.
    history.ts             # Lookup history ring buffer.
    exclusions.ts          # Per-site exclusion list.
```

### Resolution order

```
offline.lookup(query)
  ↓ (no match)
cache.get(query)
  ↓ (no hit)
online.lookup(query, abortSignal)
  ↓ (network error or not found)
return null → UI shows "not found" / "error" badge
```

Every successful resolution is written to history via `addHistoryEntry`.

### Content script

The content script is a self-contained IIFE bundle built by `vite.content.config.ts`. It does not import shared code at runtime; instead all dependencies (React via Preact, utilities, state machine) are bundled in. The host page's DOM is never modified except for appending `#etyr-tooltip-root` (the tooltip mount point) inside a Shadow DOM-like container; no styles leak into the host page.

The content script begins a 1.5-second debounce after a word is selected (configurable via `settings.lookupDelayMs`). If the user changes the selection while waiting, the timer restarts with a fresh `requestId`, ensuring only the most recent selection ever resolves — no stale results.

## Install — Chrome / Chromium

```bash
npm install
npm run build          # builds dist/
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `dist/` folder inside this repository.
4. The Etyr icon appears in your extensions toolbar; pin it for easy access.

### Dev mode (Chrome)

```bash
npm run dev            # parallel: builds popup+options on change + watches content lib
```

Re-load the unpacked extension in `chrome://extensions` to pick up changes (or enable `chrome://extensions → Developer mode → Update`).

## Firefox

```bash
npm run build:firefox   # builds dist/, then runs scripts/prepare-firefox.mjs
```

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `dist/manifest.json`.

`prepare-firefox.mjs` converts `service_worker` → `background.scripts` and sets `browser_specific_settings.gecko.id` automatically.

## Permissions

| Permission | Why |
|---|---|
| `storage` | Persist settings, bookmarks, history, cache, and exclusions via `chrome.storage.local`. |
| `https://en.wiktionary.org/*` | Primary online dictionary provider (host_permissions). |
| `https://api.dictionaryapi.dev/*` | Free Dictionary API fallback (host_permissions). Required only when the offline dictionary and Wiktionary have no match. |

No other permissions are requested. The content script runs on `<all_urls>` purely to enable word selection on any page — it does not read or modify page content beyond appending the tooltip container.

## Tests

```bash
npm test               # vitest run
```

Four test suites:

- `normalization.test.ts` — query normalization (case, accents, whitespace, punctuation stripping).
- `resolver.test.ts` — offline → cache → online resolution chain and ordering.
- `storage.test.ts` — bookmarks CRUD, dedup, ring buffer history.
- `exclusion-and-races.test.ts` — site exclusion logic, requestId race prevention, re-selection restarts the delay timer.

## Scripts

| Script | Description |
|---|---|
| `npm run build` | Production build (popup + options + content lib + background). Output: `dist/`. |
| `npm run build:chrome` | Alias for `build`. |
| `npm run build:firefox` | Build + Firefox manifest transform. |
| `npm run dev` | Watch mode: parallel builds for popup/options and content. |
| `npm run generate-icons` | Regenerate `public/icons/icon-{16,32,48,128}.png` from `public/icon.svg`. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm test` | `vitest run` — unit + integration tests. |

## Adding or swapping dictionary providers

1. Create a new file in `src/dictionary/` implementing a `lookup(query: string, signal?: AbortSignal): Promise<DictionaryResult | null>` method.
2. Register it in `src/dictionary/resolver.ts` — insert it into the resolution chain (offline → cache → **your provider** → online), or replace `OnlineDictionaryProvider` entirely.
3. Adjust `src/shared/types/index.ts` if your provider returns fields not currently in `DictionaryResult`.

The resolver handles caching automatically: any non-null result is written to cache before being returned, so you do not need to implement caching inside your provider.

## Building the icon

`public/icon.svg` is the source. The `generate-icons` script uses `sharp` to rasterise it to 16, 32, 48, and 128 px PNGs. No design tools required.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on how to set up the project locally, run tests, and submit pull requests. By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

This project is licensed under the [MIT License](LICENSE).
