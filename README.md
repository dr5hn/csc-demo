# 🌍 Countries States Cities Database - Interactive Demo

An interactive, client-side web application demonstrating the [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database) with real-time data browsing capabilities.

**Live Demo:** [demo.countrystatecity.in](https://demo.countrystatecity.in)

## 📊 Database Coverage

- **Regions:** 6 global regions
- **Subregions:** 22 geographical subregions
- **Countries:** 250+ countries with full metadata
- **States:** 5,000+ states/provinces
- **Cities:** ~150,000 cities worldwide

## ✨ Features

### Core Functionality
- **Progressive Data Loading**: Master-detail interface with 5-column drill-down navigation (Regions → Subregions → Countries → States → Cities)
- **Offline-First Architecture**: Uses IndexedDB for persistent local storage after initial load
- **On-Demand City Loading**: Cities are fetched per country to optimize performance
- **Real-Time Search**: Filter any column with instant search
- **Detailed Views**: Click any item to see complete JSON metadata
- **Copy to Clipboard**: Export any data object as JSON
- **Responsive Design**: Mobile-optimized with Tailwind CSS

### Technical Highlights
- Zero build step - pure vanilla JavaScript
- No backend required - fully static hosting
- Persistent cache with IndexedDB (DB version 2)
- Country flag emoji support with polyfill
- Progressive Web App ready (service worker included but not registered)

## 🚀 Quick Start

### Local Development

Serve the project directory with any static file server:

**Python:**
```bash
python3 -m http.server 8080
```

**Node.js:**
```bash
npx serve -l 8080 .
```

**PHP:**
```bash
php -S localhost:8080
```

Then open [http://localhost:8080](http://localhost:8080)

### Reset Database

To clear cached data and reload from source:
```
http://localhost:8080?reset=true
```

Or run in browser console:
```javascript
deleteDatabase()
```

## 🏗️ Architecture

### Data Flow

1. **Initial Load**
   - Opens IndexedDB (`CountryStateCityDB` v2)
   - Checks if object stores are populated
   - Fetches missing data from GitHub contributions folder
   - Renders regions automatically

2. **User Interaction**
   - Click regions to load subregions via IndexedDB index query
   - Navigate through hierarchy: Subregions → Countries → States
   - Cities are fetched on-demand from `contributions/cities/{countryCode}.json`
   - Cities cached in-memory (not persisted to IndexedDB)

3. **Search & Filter**
   - Client-side filtering on visible rows
   - Case-insensitive substring matching
   - No network requests during search

### File Structure

```
csc-demo/
├── index.html              # Main HTML structure
├── css/
│   └── app.css            # Custom styles and UX polish
├── js/
│   ├── app.js             # Core application logic
│   └── cache-polyfill.js  # Legacy cache polyfill
├── vendor/
│   ├── jquery/            # jQuery (legacy, minimal usage)
│   ├── bootstrap/         # Bootstrap CSS/JS (legacy)
│   └── dynatable/         # Dynamic table library (unused)
├── sw.js                  # Service worker (not registered)
├── CNAME                  # GitHub Pages domain config
└── README.md              # This file
```

## 🗄️ IndexedDB Schema

**Database:** `CountryStateCityDB` (version 2)

### Object Stores

| Store | Key Path | Indexes | Description |
|-------|----------|---------|-------------|
| `regions` | `id` | - | Global regions (e.g., Africa, Asia) |
| `subregions` | `id` | `region_id` | Geographical subregions (e.g., Western Europe) |
| `countries` | `id` | `subregion_id`, `iso2` | Countries with ISO codes, flags, coordinates |
| `states` | `id` | `country_id`, `country_code` | States/provinces with codes |

**Note:** Cities are **not** persisted to IndexedDB. They are fetched per country and cached in memory only.

### Key Functions

```javascript
// Read all items from a store
getAllFromStore(storeName) → Promise<Array>

// Query by index
getFromIndex(storeName, indexName, value) → Promise<Array>

// Examples:
const states = await getFromIndex('states', 'country_id', 101);
const countries = await getFromIndex('countries', 'iso2', 'US');
```

## 🔧 Extending the Schema

To add new indexes or object stores:

1. **Increment DB version:**
   ```javascript
   const DB_VERSION = 3;  // was 2
   ```

2. **Add upgrade logic in `openDB()`:**
   ```javascript
   request.onupgradeneeded = event => {
     const store = db.createObjectStore('new_collection', { keyPath: 'id' });
     store.createIndex('custom_field', 'custom_field', { unique: false });
   };
   ```

3. **Add to collections (if needed):**
   ```javascript
   const COLLECTIONS = ['regions', 'subregions', 'countries', 'states', 'new_collection'];
   ```

## 🌐 Data Source

All data is fetched from the official repository:
```
https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/contributions/
```

### API Endpoints Used

- `contributions/regions/regions.json` - All regions
- `contributions/subregions/subregions.json` - All subregions
- `contributions/countries/countries.json` - All countries
- `contributions/states/states.json` - All states
- `contributions/cities/{countryCode}.json` - Cities per country (e.g., `US.json`, `IN.json`)

## 🎨 UI Components

### Statistics Bar
Real-time counts from IndexedDB displayed at the top:
- Regions, Subregions, Countries, States (exact counts)
- Cities (estimated ~150k)

### Navigation Flow
```
[Regions] → [Subregions] → [Countries] → [States] → [Cities]
```
Each column has:
- Search input (instant filter)
- Item count badge
- Action buttons (navigate forward, view details)

### Modal Details
Click the info icon (ℹ️) on any item to see:
- Full JSON representation
- Copy-to-clipboard button
- Close with Esc key or overlay click

## 📱 Progressive Web App

A service worker (`sw.js`) is included but **not registered** in production. To enable offline support:

1. Register in `index.html`:
   ```javascript
   if ('serviceWorker' in navigator) {
     navigator.serviceWorker.register('/sw.js');
   }
   ```

2. Update `sw.js` cache list with current assets
3. Add runtime caching for city JSON endpoints

## 🔗 Related Projects

- **NPM Package:** [@countrystatecity/countries](https://www.npmjs.com/package/@countrystatecity/countries)
- **REST API:** [countrystatecity.in](https://countrystatecity.in/)
- **Export Tool:** [export.countrystatecity.in](https://export.countrystatecity.in/)
- **Data Manager:** [manager.countrystatecity.in](https://manager.countrystatecity.in/)
- **Source Database:** [GitHub Repository](https://github.com/dr5hn/countries-states-cities-database)

## 🛠️ Development Guidelines

### Code Conventions
- Vanilla JavaScript (ES6+)
- Inline event handlers for simplicity (e.g., `onclick="filterStates(id)"`)
- No bundler or transpiler required
- Tailwind CSS via CDN
- jQuery vendored but minimally used

### Adding Features
- Keep functions global if referenced in inline `onclick` handlers
- Follow existing naming patterns: `render{Type}`, `filter{Type}`
- Update statistics bar when adding new data types
- Maintain responsive design for mobile

### Performance Tips
- Cities are intentionally not persisted to avoid IndexedDB bloat
- Use indexes for all foreign key queries
- Filter operations work on visible DOM only
- Consider virtualizing long lists if adding >1000 items per column

## 📄 License

This demo follows the license of the [Countries States Cities Database](https://github.com/dr5hn/countries-states-cities-database).

## 🤝 Contributing

This is a demonstration project. For data updates or corrections, please contribute to the main [countries-states-cities-database](https://github.com/dr5hn/countries-states-cities-database) repository.

## 📞 Support

- **Issues:** Report bugs or request features via GitHub Issues
- **Database Updates:** Use the [Manager Tool](https://manager.countrystatecity.in/)
- **API Access:** Check the [API Documentation](https://countrystatecity.in/)

---

Made with ❤️ by [dr5hn](https://github.com/dr5hn)
