# AI coding agent guide for csc-demo

This repo is a static, client-only demo for the Countries-States-Cities (CSC) database. It fetches JSON from the upstream CSC repository, stores core datasets in IndexedDB, and renders a 5-column master→detail UI (Regions → Subregions → Countries → States → Cities).

## Architecture and data flow
- Single page app: `index.html` markup + `js/app.js` logic + `css/app.css` styles. No build step; CDN Tailwind is used.
- Persistent data: IndexedDB stores seed data on first load, then queries locally.
  - DB constants in `js/app.js`: `DB_NAME = 'CountryStateCityDB'`, `DB_VERSION = 2`.
  - Object stores: `regions`, `subregions`, `countries`, `states` (keyPath: `id`). Cities are loaded on-demand and cached in-memory only.
  - Indexes created in `openDB().onupgradeneeded`:
    - subregions: `region_id`
    - countries: `subregion_id`, `iso2`
    - states: `country_id`, `country_code`
- Data source: `CONTRIBUTIONS_BASE = https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/contributions/`.
  - First load per store pulls `contributions/<collection>/<collection>.json` into IndexedDB.
  - Cities: fetched lazily from `contributions/cities/{countryCode}.json` and cached in `citiesCache`.
- UI flow (see `index.html`): select left to right. Search inputs filter visible rows only. Stats bar shows counts from IndexedDB; cities shows an estimate.

## Key APIs and helpers (use these patterns)
- Read all: `getAllFromStore(store)` → Promise<Array>.
- Read by index: `getFromIndex(store, index, value)` → Promise<Array> (e.g., `getFromIndex('states','country_id', countryId)`).
- Initialization: `initializeData()` creates DB, seeds collections if empty, renders Regions, updates stats.
- Modal details: `toggleModal(id, type)` reads from IndexedDB (or cities cache) and shows JSON.

## Conventions and UI structure
- Element identifiers: table containers use IDs "regions", "subregions", "countries", "states", "cities"; matching search inputs use IDs like "search-regions"; row bodies use classes like "regions-tb" inside a tbody.
- Rendering: `renderRegions|renderSubregions|renderCountries|renderStates|renderCities` replace `.innerHTML` with template rows that include inline `onclick` handlers like `filterStates(id, iso2)`.
- Filtering: `filter(type)` performs case-insensitive contains on first cell text.
- Styling: Tailwind via `<script src="https://cdn.tailwindcss.com"></script>` plus `css/app.css` for UX polish (tooltips, modal, scrollbars). jQuery is vendored but current logic uses vanilla JS.

## Developer workflows
- Run locally (static): serve the folder to avoid CORS/file:// issues. Examples:
  - Python: `python3 -m http.server 8080`
  - Node: `npx serve -l 8080 .`
- Reset DB: append `?reset=true` to the URL (or call `deleteDatabase()` in console) then reload.
- Inspect data: DevTools → Application → IndexedDB (stores match `COLLECTIONS`).
- Deployment: GitHub Pages (CNAME: `demo.countrystatecity.in`) serves from branch `main` root. No CI/build.

## Extending data or schema (IndexedDB)
- Add a new index/store: bump `DB_VERSION`, update `onupgradeneeded`, and if it’s a new collection, add it to `COLLECTIONS` and seed from `CONTRIBUTIONS_BASE`.
- Example (add an index):
  - Upgrade: `store.createIndex('name', 'name', { unique: false })`
  - Query: `getFromIndex('countries', 'name', 'Canada')`

## External integrations and PWA notes
- Emoji flags: `country-flag-emoji-polyfill` loaded as an ES module in `index.html` for consistent flag rendering.
- Service worker: `sw.js` exists but is not registered in `index.html`. If enabling offline, register it and update `cache.addAll([...])` to reflect current assets and the contributions endpoints (or add runtime caching for city JSONs). The current cache list references some legacy vendor files and old `json/*` endpoints.

## Gotchas and guardrails
- Keep functions referenced by inline `onclick` global in `app.js` (don’t wrap in modules without exposing them).
- Cities are intentionally not persisted in IndexedDB; they’re fetched per country and filtered by `state_id` from memory.
- When altering schema, always bump `DB_VERSION` to trigger `onupgradeneeded` and avoid stale indexes.
- Prefer vanilla JS to match the current code style; avoid introducing bundlers or frameworks for small changes.

Reference files: `index.html`, `js/app.js`, `css/app.css`, `sw.js`, `CNAME`, `vendor/**`.
