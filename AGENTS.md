# Etyr — Agent Guide

Etyr is a Manifest V3 dictionary-tooltip browser extension: select a word on any page
and a sleek, self-contained tooltip shows its meaning, pronunciation, tags, quotes,
and cross-references.

## The Product Goal

> Make word lookup **as interactive and sleek as humanly + AIly possible**.

Every feature should move the extension toward that goal. When in doubt:

- **Interactive**: definitions should invite exploration — linked words are clickable
  and resolve in place; nothing on the surface should feel dead.
- **Sleek**: minimal, deliberate, responsive (both themes, both motion pref states).
  Small surface details matter more than feature breadth.
- **Fast**: cached lookups resolve instantly; navigation never feels like a page turn.

Cross-reference pattern (the core interaction): senses like `plural of decade.` expose
`decade` as a linked word. Clicking it navigates the tooltip to that word's definition
(same tooltip, breadcrumb + back button), reusing the resolver cache. The same
interaction exists in the popup search page. Cycle-guarded (never A→B→A loops) and
depth-capped (`NAV_MAX_DEPTH = 12`).

**Full-dictionary surface** (the "everything the API gives you" layer): each
part-of-speech group can show word-form chips (`happier — comparative`), all examples
(expandable), quoted passages with citations (expandable), nested subsenses (indented,
recursion capped at depth 2), and **clickable Synonyms/Antonyms chips** aggregated from
the entry, every sense, and every subsense (cap 6 + `+N more`). Chips behave like linked
words — clicking one navigates in place. Every rich field is mapped by
`normalizeOnlineResponse`; components never read the raw API.

## Architecture (read before touching)

```
src/
  background/service-worker.ts   Message router; owns dictionaryResolver (only place that fetches/parses)
  dictionary/
    online.ts                    fetches API, maps raw → OnlineDictionaryResponse
    types.ts                     extractFormOfTarget, normalizeOnlineResponse (source of truth for shape)
    ai.ts / offline.ts / cache.ts
  shared/
    types/index.ts                DictionaryResult, Definition (tags/quotes/linkedWords), Settings
    constants/index.ts            DEFAULT_SETTINGS, MESSAGE_ACTIONS, STORAGE_KEYS, DICTIONARY_API_BASE
    utils/index.ts                normalizeQuery, sourceLabel, splitDefinitionSegments, ...
    messaging.ts                  sendMessage helper (used by popup/options/newtab)
  content/                       Runs in page context (ISOLATED world)
    index.ts                     EtyrContent orchestrator: selection → state machine → tooltip + nav
    selection/detector.ts        mouseup/dblclick detection, candidate validation
    selection/state-machine.ts   IDLE → SELECTION_DETECTED → WAITING → RESOLVING → SHOWING
    selection/validate.ts        isLookupCandidate, getSelectionRect
    tooltip/
      index.ts                   TooltipBridge (thin API over the controller) — options wired from index.ts
      TooltipController.tsx      Shadow DOM mount, positioning/measuring, holds nav state
      TooltipRoot.tsx            Presentational root (header/breadcrumb/body/footer)
      components/                DefinitionList, CopyButton, ErrorState, icons, ...
    styles/tooltip.css           Scoped to `:host` shadow subtree; dark + light + reduced-motion
  popup/  options/  newtab/      React 19 UIs using lucide-react + tokens.css

Tests: __tests__/ (vitest). Build: chrome → dist/, firefox → dist-firefox/.
```

**Key invariants**

- The **content script must be a small IIFE bundle**. It inlines `tooltip.css` via
  `?inline`; NEVER import `@fontsource`/web-fonts there (they get base64-inlined and
  blow the bundle past Chrome's limits ~2MB). Fonts are system-stack only.
- The background is the **only** place that calls APIs (fetch/free dict). Content/popups
  talk to it via `runtime.sendMessage` (`MESSAGE_ACTIONS.DICTIONARY_RESOLVE`, etc.).
- The tooltip lives in a Shadow DOM: CSS uses `:host(...)` selectors and
  `#etyr-tooltip` as the surface. Theme is driven by `data-etyr-theme` on the host.
- `normalizeOnlineResponse` is the single schema-mapper. New API fields (sense `tags`,
  `quotes`, `examples`, `subsenses`, `forms`, entry/sense `synonyms`/`antonyms`, etc.)
  must be mapped here, not consumed raw in components.
  `online.ts` first maps raw → `OnlineDictionaryResponse`; `types.ts` then normalizes to
  the `DictionaryResult` shape (`mapSense` recursion for subsenses, `mapForms`,
  `mapQuotes`, `mapLinkedWords`).
- Settings flow: `DEFAULT_SETTINGS` → options/popup UI → `storage.local` →
  `onStorageChange` in content. Add new toggles to `shared/types` + `constants`
  first, then wire UIs.
- Selection snapshots carry a `requestId`; the machine only accepts responses matching
  `isActiveRequestId`. Navigation follows the same rule with its own `navRequestId`.
- Stale-response discipline: after any dismiss / new selection / new nav, bump
  `navRequestId` and bail early. Guard `tooltip.updateState` behind `isShown`.

## Side panel

- Chrome-only (MV3): the tooltip header has an "Open in side panel" button
  (`PanelRightIcon`, shown only in the `showing` state). It sends
  `MESSAGE_ACTIONS.SIDEPANEL_OPEN` from the content script; the SW resolves it via
  `chrome.sidePanel.open({ tabId: sender.tab.id })` and stashes the word in
  `STORAGE_KEYS.SIDEPANEL_LAST_QUERY`, then broadcasts `SIDEPANEL_LOAD`.
- `src/sidepanel/` is a fourth vite entry (SidePanelApp shell reusing the popup pages;
  `HomePage` accepts `initialQuery` + `onInitialQueryConsumed`). It loads a word from
  1) the `?q=` URL param, 2) the live `SIDEPANEL_LOAD` broadcast, or
  3) the persisted storage handoff (removed after read). Consumed queries are cleared
  so tab switches don't re-search.
- Fallbacks: if `chrome.sidePanel` is unavailable (Firefox) or `sidePanel.open` throws,
  the SW opens `src/sidepanel/index.html?q=…` in a new tab instead. `scripts/prepare-firefox.mjs`
  strips the `sidePanel` permission + `side_panel` key from the Firefox manifest.

## Working on the cross-reference interaction

- Where links come from: `extractFormOfTarget(definition, tags)` in
  `src/dictionary/types.ts` recognizes "form of" senses and returns the base word.
  Keep extraction conservative — only form-of-style senses become interactive, never
  arbitrary dictionary text.
- Rendering: `splitDefinitionSegments` (`shared/utils`) turns a definition + its
  `linkedWords` into inline text/link segments; used by both the tooltip
  (`DefinitionList.tsx`, classes `etyr-definition__link` / `etyr-definition__chip`) and
  the popup (`SearchResult.tsx`, classes `definition-link` / `definition-chip`).
  Keep both in sync.
- Rich sense rendering: tooltip `MeaningGroup` (POS badge + `forms` chips + `ChipRow`
  for synonyms/antonyms + `SenseItem` for def/`ExpandableExamples`/`ExpandableQuotes`/
  nested `subsenses`); popup `SearchResult.DefinitionBlock` mirrors it (all examples,
  subsenses, syn/ant chips, first quote, `+N more` notes).
- Navigation: `EtyrContent.openNavWord` / `navigateBack` / `runNavLookup` in
  `src/content/index.ts`. `TooltipRoot` shows the breadcrumb + back button when
  `nav` is present (`tooltip.setNavPath`).
- Adding new API surfaces: extend `OnlineDictionaryResponse` + `Definition` first,
  then the mapper, then the components. Style both themes + reduced motion.

## Verification (always after changes)

```bash
npx tsc --noEmit          # typecheck
npx eslint src/ __tests__ # lint
npx vitest run            # unit tests (resolver + interactive words)
npm run build             # Chrome build → dist/
npm run build:firefox     # Firefox build → dist-firefox/
```

Load: `chrome://extensions` → Load unpacked → `dist/`, or Firefox
`about:debugging` → Load Temporary Add-on → `dist-firefox/manifest.json`.
After reloading the extension, hard-refresh the page (Ctrl+Shift+R) to re-inject the
content script (`document.documentElement.dataset.etyrInjected === '1'`).

## Guardrails

- Keep the content bundle small (currently ~73 kB / ~22 kB gz); check bundle size after
  any content-script change.
- `dist/` and `dist-firefox/` are build output — edit `src/`, never the dist files.
- Do not add emoji or decorative noise to the UI unless the task explicitly asks.
- Never commit secrets/API keys; the AI provider key is user-supplied runtime config.