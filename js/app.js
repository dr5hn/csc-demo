/**
 * CSC Database Demo - Enhanced JavaScript
 * Optimized for performance, accessibility, and mobile experience
 */

// =============================================================================
// Configuration & State
// =============================================================================

const DB_NAME = 'CountryStateCityDB';
const DB_VERSION = 2;
const COLLECTIONS = ['regions', 'subregions', 'countries', 'states'];
const CONTRIBUTIONS_BASE = 'https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/contributions/';

let db = null;
const citiesCache = {};
let currentSelections = {
  region: null,
  subregion: null,
  country: null,
  state: null
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Debounce function to limit rapid function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Update loading progress
 * @param {number} percent - Progress percentage
 * @param {string} status - Status message
 */
function updateLoadingProgress(percent, status) {
  const progressBar = document.getElementById('loadingProgress');
  const statusText = document.getElementById('loadingStatus');
  const progressContainer = progressBar?.parentElement;

  if (progressBar) {
    progressBar.style.width = `${percent}%`;
  }
  if (progressContainer) {
    progressContainer.setAttribute('aria-valuenow', percent);
  }
  if (statusText) {
    statusText.textContent = status;
  }
}

// =============================================================================
// IndexedDB Functions
// =============================================================================

/**
 * Delete the database (for reset functionality)
 * @returns {Promise<void>}
 */
function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      console.log(`Database ${DB_NAME} successfully deleted`);
      resolve();
    };
    request.onerror = (event) => {
      console.error(`Error deleting database: ${event.target.error}`);
      reject(event.target.error);
    };
  });
}

/**
 * Open the IndexedDB database
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      reject(new Error(`IndexedDB error: ${event.target.error}`));
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      COLLECTIONS.forEach(collectionName => {
        if (!db.objectStoreNames.contains(collectionName)) {
          const store = db.createObjectStore(collectionName, { keyPath: 'id' });

          switch(collectionName) {
            case 'subregions':
              store.createIndex('region_id', 'region_id', { unique: false });
              break;
            case 'countries':
              store.createIndex('subregion_id', 'subregion_id', { unique: false });
              store.createIndex('iso2', 'iso2', { unique: false });
              break;
            case 'states':
              store.createIndex('country_id', 'country_id', { unique: false });
              store.createIndex('country_code', 'country_code', { unique: false });
              break;
          }
        }
      });
      console.log('Database upgraded');
    };
  });
}

/**
 * Get all items from an IndexedDB store
 * @param {string} storeName - Name of the object store
 * @returns {Promise<Array>}
 */
function getAllFromStore(storeName) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get items from an index
 * @param {string} storeName - Name of the object store
 * @param {string} indexName - Name of the index
 * @param {*} value - Value to search for
 * @returns {Promise<Array>}
 */
function getFromIndex(storeName, indexName, value) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a single item by ID
 * @param {string} storeName - Name of the object store
 * @param {number} id - Item ID
 * @returns {Promise<Object>}
 */
function getById(storeName, id) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not initialized'));
      return;
    }
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(parseInt(id, 10));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// =============================================================================
// Data Initialization
// =============================================================================

/**
 * Initialize all data from the contributions folder
 */
async function initializeData() {
  console.log('Initializing data from contributions folder');

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('reset') === 'true') {
    await deleteDatabase();
    window.location.search = '';
    return;
  }

  try {
    await openDB();

    let progress = 0;
    const progressStep = 100 / COLLECTIONS.length;

    for (const collectionName of COLLECTIONS) {
      updateLoadingProgress(progress, `Loading ${collectionName}...`);

      const objectStore = db.transaction(collectionName, 'readonly').objectStore(collectionName);
      const count = await new Promise(resolve => {
        const countRequest = objectStore.count();
        countRequest.onsuccess = (e) => resolve(e.target.result);
      });

      if (count === 0) {
        const url = `${CONTRIBUTIONS_BASE}${collectionName}/${collectionName}.json`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch ${collectionName}: ${response.status}`);
        }

        const data = await response.json();
        const transaction = db.transaction(collectionName, 'readwrite');
        const store = transaction.objectStore(collectionName);

        for (const item of data) {
          store.add(item);
        }

        await new Promise(resolve => {
          transaction.oncomplete = resolve;
        });

        console.log(`Loaded ${data.length} ${collectionName} from contributions`);
      }

      if (collectionName === 'regions') {
        const regions = await getAllFromStore('regions');
        renderRegions(regions);
      }

      progress += progressStep;
    }

    updateLoadingProgress(100, 'Complete!');
    await updateStatistics();
    hideLoadingOverlay();

  } catch (error) {
    console.error('Error initializing data:', error);
    updateLoadingProgress(0, `Error: ${error.message}`);
  }
}

/**
 * Hide the loading overlay with animation
 */
function hideLoadingOverlay() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.classList.add('opacity-0');
    setTimeout(() => {
      loadingOverlay.remove();
    }, 300);
  }
}

/**
 * Update statistics display
 */
async function updateStatistics() {
  try {
    const stats = {
      regions: (await getAllFromStore('regions')).length,
      subregions: (await getAllFromStore('subregions')).length,
      countries: (await getAllFromStore('countries')).length,
      states: (await getAllFromStore('states')).length,
    };

    Object.entries(stats).forEach(([key, value]) => {
      const element = document.getElementById(`stat-${key}`);
      if (element) {
        element.textContent = value.toLocaleString();
      }
    });

    const citiesElement = document.getElementById('stat-cities');
    if (citiesElement) {
      citiesElement.textContent = '~150k';
    }
  } catch (error) {
    console.error('Error updating statistics:', error);
  }
}

// =============================================================================
// Rendering Functions (Optimized with DocumentFragment)
// =============================================================================

/**
 * Create action buttons for a row
 * @param {number} id - Item ID
 * @param {string} type - Item type
 * @param {string} nextAction - Action for the arrow button
 * @param {string} nextLabel - Label for the arrow button tooltip
 * @returns {string} HTML string for buttons
 */
function createActionButtons(id, type, nextAction = null, nextLabel = null) {
  let buttons = '';

  if (nextAction) {
    buttons += `
      <button class="tooltip inline-block align-middle float-right p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onclick="${nextAction}"
              aria-label="${nextLabel}"
              type="button">
        <svg viewBox="0 0 20 20" fill="currentColor" class="arrow-circle-right w-6 h-6 text-pink-600" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd"></path>
        </svg>
        <span class="tooltip-text bg-indigo-600 rounded text-white text-sm">${escapeHtml(nextLabel)}</span>
      </button>`;
  }

  buttons += `
    <button class="tooltip inline-block align-middle float-right p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onclick="toggleModal(${id}, '${type}')"
            aria-label="View details"
            type="button">
      <svg viewBox="0 0 20 20" fill="currentColor" class="information-circle w-6 h-6 text-blue-600" aria-hidden="true">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
      </svg>
      <span class="tooltip-text bg-indigo-600 rounded text-white text-sm">View Details</span>
    </button>`;

  return buttons;
}

/**
 * Render regions list
 * @param {Array} regions - Array of region objects
 */
function renderRegions(regions) {
  const regionsTb = document.querySelector('.regions-tb');
  if (!regionsTb) return;

  const fragment = document.createDocumentFragment();

  regions.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'data-row';
    tr.setAttribute('role', 'listitem');
    tr.innerHTML = `
      <td class="border px-4 py-2">
        ${escapeHtml(r.name)}
        ${createActionButtons(r.id, 'regions', `filterSubregions(${r.id})`, 'Show Subregions')}
      </td>
    `;
    fragment.appendChild(tr);
  });

  regionsTb.innerHTML = '';
  regionsTb.appendChild(fragment);
  updateCount('regions', regions.length);
}

/**
 * Render subregions list
 * @param {Array} subregions - Array of subregion objects
 */
function renderSubregions(subregions) {
  const subregionsTb = document.querySelector('.subregions-tb');
  if (!subregionsTb) return;

  if (subregions.length === 0) {
    subregionsTb.innerHTML = '<tr><td class="border px-4 py-2 text-center text-gray-500">No subregions found</td></tr>';
    updateCount('subregions', 0);
    return;
  }

  const fragment = document.createDocumentFragment();

  subregions.forEach(sr => {
    const tr = document.createElement('tr');
    tr.className = 'data-row';
    tr.setAttribute('role', 'listitem');
    tr.innerHTML = `
      <td class="border px-4 py-2">
        ${escapeHtml(sr.name)}
        ${createActionButtons(sr.id, 'subregions', `filterCountries(${sr.id})`, 'Show Countries')}
      </td>
    `;
    fragment.appendChild(tr);
  });

  subregionsTb.innerHTML = '';
  subregionsTb.appendChild(fragment);
  updateCount('subregions', subregions.length);
}

/**
 * Render countries list
 * @param {Array} countries - Array of country objects
 */
function renderCountries(countries) {
  const countriesTb = document.querySelector('.countries-tb');
  if (!countriesTb) return;

  if (countries.length === 0) {
    countriesTb.innerHTML = '<tr><td class="border px-4 py-2 text-center text-gray-500">No countries found</td></tr>';
    updateCount('countries', 0);
    return;
  }

  const fragment = document.createDocumentFragment();

  countries.forEach(c => {
    const tr = document.createElement('tr');
    tr.className = 'data-row';
    tr.setAttribute('role', 'listitem');
    tr.innerHTML = `
      <td class="border px-4 py-2">
        <span class="emoji">${c.emoji || ''}</span> ${escapeHtml(c.name)}
        <span class="inline-block bg-gray-200 rounded-full px-3 text-sm font-semibold text-gray-700">${escapeHtml(c.iso2)}</span>
        ${createActionButtons(c.id, 'countries', `filterStates(${c.id}, '${c.iso2}')`, 'Show States')}
      </td>
    `;
    fragment.appendChild(tr);
  });

  countriesTb.innerHTML = '';
  countriesTb.appendChild(fragment);
  updateCount('countries', countries.length);
}

/**
 * Render states list
 * @param {Array} states - Array of state objects
 * @param {string} countryCode - Country ISO2 code
 */
function renderStates(states, countryCode) {
  const statesTb = document.querySelector('.states-tb');
  if (!statesTb) return;

  if (states.length === 0) {
    statesTb.innerHTML = '<tr><td class="border px-4 py-2 text-center text-gray-500">No states found</td></tr>';
    updateCount('states', 0);
    return;
  }

  const fragment = document.createDocumentFragment();

  states.forEach(s => {
    const tr = document.createElement('tr');
    tr.className = 'data-row';
    tr.setAttribute('role', 'listitem');
    tr.innerHTML = `
      <td class="border px-4 py-2">
        ${escapeHtml(s.name)}
        <span class="inline-block bg-gray-200 rounded-full px-3 text-sm font-semibold text-gray-700">${escapeHtml(s.state_code || s.iso2 || '')}</span>
        ${createActionButtons(s.id, 'states', `filterCities(${s.id}, '${countryCode}')`, 'Show Cities')}
      </td>
    `;
    fragment.appendChild(tr);
  });

  statesTb.innerHTML = '';
  statesTb.appendChild(fragment);
  updateCount('states', states.length);
}

/**
 * Render cities list
 * @param {Array} cities - Array of city objects
 */
function renderCities(cities) {
  const citiesTb = document.querySelector('.cities-tb');
  if (!citiesTb) return;

  if (cities.length === 0) {
    citiesTb.innerHTML = '<tr><td class="border px-4 py-2 text-center text-gray-500">No cities found</td></tr>';
    updateCount('cities', 0);
    return;
  }

  const fragment = document.createDocumentFragment();

  cities.forEach(c => {
    const tr = document.createElement('tr');
    tr.className = 'data-row';
    tr.setAttribute('role', 'listitem');
    tr.innerHTML = `
      <td class="border px-4 py-2">
        ${escapeHtml(c.name)}
        ${createActionButtons(c.id, 'cities')}
      </td>
    `;
    fragment.appendChild(tr);
  });

  citiesTb.innerHTML = '';
  citiesTb.appendChild(fragment);
  updateCount('cities', cities.length);
}

/**
 * Update count badge
 * @param {string} type - Type of items
 * @param {number} count - Count to display
 */
function updateCount(type, count) {
  const countElement = document.getElementById(`${type}-count`);
  if (countElement) {
    countElement.textContent = count.toLocaleString();
  }
}

/**
 * Clear a column and reset its count
 * @param {string} type - Column type to clear
 */
function clearColumn(type) {
  const tbody = document.querySelector(`.${type}-tb`);
  if (tbody) {
    tbody.innerHTML = `<tr><td class="px-4 py-8 text-center text-gray-400 text-sm empty-state"><span aria-hidden="true">←</span> Select an item</td></tr>`;
  }
  updateCount(type, 0);
}

// =============================================================================
// Filter Functions
// =============================================================================

/**
 * Filter and display subregions for a region
 * @param {number|string} regionId - Region ID or 'reset' for database reset
 */
async function filterSubregions(regionId) {
  if (typeof regionId === 'string') {
    window.location.search = 'reset=true';
    return;
  }

  try {
    currentSelections.region = regionId;
    const subregions = await getFromIndex('subregions', 'region_id', regionId);
    renderSubregions(subregions);

    // Clear dependent columns
    clearColumn('countries');
    clearColumn('states');
    clearColumn('cities');
  } catch (error) {
    console.error('Error filtering subregions:', error);
  }
}

/**
 * Filter and display countries for a subregion
 * @param {number} subregionId - Subregion ID
 */
async function filterCountries(subregionId) {
  try {
    currentSelections.subregion = subregionId;
    const countries = await getFromIndex('countries', 'subregion_id', subregionId);
    renderCountries(countries);

    // Clear dependent columns
    clearColumn('states');
    clearColumn('cities');
  } catch (error) {
    console.error('Error filtering countries:', error);
  }
}

/**
 * Filter and display states for a country
 * @param {number} countryId - Country ID
 * @param {string} countryCode - Country ISO2 code
 */
async function filterStates(countryId, countryCode) {
  try {
    currentSelections.country = { id: countryId, code: countryCode };
    const states = await getFromIndex('states', 'country_id', countryId);
    renderStates(states, countryCode);

    // Clear dependent column
    clearColumn('cities');
  } catch (error) {
    console.error('Error filtering states:', error);
  }
}

/**
 * Filter and display cities for a state
 * @param {number} stateId - State ID
 * @param {string} countryCode - Country ISO2 code
 */
async function filterCities(stateId, countryCode) {
  const citiesTb = document.querySelector('.cities-tb');
  if (!citiesTb) return;

  citiesTb.innerHTML = '<tr><td class="border px-4 py-2 text-center text-gray-500" aria-live="polite">Loading cities...</td></tr>';

  try {
    currentSelections.state = stateId;

    if (!citiesCache[countryCode]) {
      const response = await fetch(`${CONTRIBUTIONS_BASE}cities/${countryCode}.json`);
      if (!response.ok) {
        throw new Error(`Failed to fetch cities: ${response.status}`);
      }
      citiesCache[countryCode] = await response.json();
      console.log(`Loaded ${citiesCache[countryCode].length} cities for ${countryCode}`);
    }

    const cities = citiesCache[countryCode].filter(c => c.state_id === parseInt(stateId, 10));
    renderCities(cities);
  } catch (error) {
    console.error(`Error loading cities for ${countryCode}:`, error);
    citiesTb.innerHTML = '<tr><td class="border px-4 py-2 text-center text-red-500">Error loading cities</td></tr>';
  }
}

/**
 * Filter table rows based on search input (debounced)
 * @param {string} type - Type of data to filter
 */
const filter = debounce((type) => {
  const input = document.getElementById('search-' + type);
  if (!input) return;

  const filterValue = input.value.toUpperCase();
  const table = document.getElementById(type);
  if (!table) return;

  const rows = table.getElementsByTagName('tr');

  for (const row of rows) {
    const cell = row.getElementsByTagName('td')[0];
    if (cell) {
      const txtValue = cell.textContent || cell.innerText;
      row.style.display = txtValue.toUpperCase().includes(filterValue) || filterValue === '' ? '' : 'none';
    }
  }
}, 150);

// =============================================================================
// Modal Functions
// =============================================================================

/**
 * Toggle modal visibility and display item details
 * @param {number|null} id - Item ID or null to close
 * @param {string|null} type - Item type or null to close
 */
async function toggleModal(id = null, type = null) {
  const body = document.body;
  const modal = document.querySelector('.modal');
  if (!modal) return;

  const isOpening = modal.classList.contains('opacity-0');

  modal.classList.toggle('opacity-0');
  modal.classList.toggle('pointer-events-none');
  body.classList.toggle('modal-active');

  // Update ARIA attributes
  modal.setAttribute('aria-hidden', !isOpening);

  if (isOpening && id && type) {
    let item = null;

    if (type === 'cities') {
      for (const countryCode in citiesCache) {
        const city = citiesCache[countryCode].find(c => c.id === parseInt(id, 10));
        if (city) {
          item = city;
          break;
        }
      }
    } else {
      item = await getById(type, id);
    }

    if (item) {
      const titleEl = document.querySelector('.modal-title');
      const codeEl = document.getElementById('modal-code');

      if (titleEl) titleEl.textContent = item.name;
      if (codeEl) codeEl.textContent = JSON.stringify(item, null, 2);
    }

    // Focus management for accessibility
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      setTimeout(() => closeBtn.focus(), 100);
    }
  }
}

/**
 * Copy modal content to clipboard
 */
async function copyToClipboard() {
  const copyText = document.getElementById('modal-code')?.textContent;
  if (!copyText) return;

  try {
    await navigator.clipboard.writeText(copyText);

    const copyBtn = document.querySelector('.copy-to-clipboard');
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('opacity-50', 'cursor-not-allowed');
      copyBtn.disabled = true;

      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        copyBtn.disabled = false;
      }, 2000);
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
  }
}

// =============================================================================
// Event Listeners
// =============================================================================

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
  // Modal overlay click to close
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => toggleModal());
  }

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(el => {
    el.addEventListener('click', () => toggleModal());
  });

  // Keyboard escape to close modal
  document.addEventListener('keydown', (evt) => {
    if ((evt.key === 'Escape' || evt.key === 'Esc') && document.body.classList.contains('modal-active')) {
      toggleModal();
    }
  });

  // Copy to clipboard button
  const copyBtn = document.querySelector('.copy-to-clipboard');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyToClipboard);
  }

  // Mobile menu toggle
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      const isExpanded = mobileMenu.classList.toggle('show');
      mobileMenuBtn.setAttribute('aria-expanded', isExpanded);
    });
  }

  // Keyboard navigation for data rows
  document.addEventListener('keydown', (evt) => {
    if (evt.key === 'Enter' && evt.target.closest('.data-row')) {
      const btn = evt.target.querySelector('button');
      if (btn) btn.click();
    }
  });
}

// =============================================================================
// Initialization
// =============================================================================

// Make functions globally available
window.filter = filter;
window.filterSubregions = filterSubregions;
window.filterCountries = filterCountries;
window.filterStates = filterStates;
window.filterCities = filterCities;
window.toggleModal = toggleModal;

// Initialize on page load
window.addEventListener('load', () => {
  console.log('CSC Database Demo - Initializing...');
  console.log('Base URL:', CONTRIBUTIONS_BASE);

  initializeEventListeners();
  initializeData();
});

// Handle visibility change for performance
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('Page hidden - pausing animations');
  }
});
