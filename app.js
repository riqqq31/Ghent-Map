/* ============================================================
   Ghent Explorer — Application Logic
   Leaflet map, data loading, sidebar, search, geolocation
   ============================================================ */

// ---- Utilities ----
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : 'Unknown';

// ---- Toast Notification System ----
const toastContainer = document.getElementById('toast-container');
function showToast(message, type = 'info', duration = 4000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ---- Loading Overlay ----
const loadingOverlay = document.getElementById('loading-overlay');
const loadingBarFill = document.getElementById('loading-bar-fill');
const loadingText = document.getElementById('loading-text');

function setLoadingProgress(percent, text) {
  loadingBarFill.style.width = percent + '%';
  if (text) loadingText.textContent = text;
}
function hideLoading() {
  setLoadingProgress(100, 'Ready!');
  setTimeout(() => loadingOverlay.classList.add('hidden'), 400);
}

// ---- Map Initialization ----
const map = L.map('map', { zoomControl: false }).setView([51.0543, 3.7174], 13);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);

// ---- Sidebar ----
const sidebar = document.getElementById('sidebar');
const sbBody = document.getElementById('sb-body');
document.getElementById('sb-close').onclick = () => sidebar.classList.remove('open');

// Close sidebar on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') sidebar.classList.remove('open');
});

// ---- Icons & Colors ----
const ICONS = {
  waterway: '🌊', building: '🏢', historic: '🏛️', hotel: '🏨',
  castle: '🏰', church: '⛪', monastery: '🕌', cathedral: '⛪', monument: '🗿',
  memorial: '🪦', fort: '🏰', tower: '🗼', windmill: '🌬️', ruins: '🏚️',
  bridge: '🌉', cannon: '💣', tomb: '⚰️', chapel: '⛪', prison: '🔒',
  hospital: '🏥', school: '🎓', cinema: '🎬', farm: '🌾', warehouse: '📦',
  guest_house: '🏡', hostel: '🛏️', motel: '🏩', apartment: '🏢'
};
const getIcon = (cat, type) => ICONS[type] || ICONS[cat] || '📍';

const COLORS = {
  waterway: { bg: 'rgba(0,212,255,0.12)', border: 'rgba(0,212,255,0.3)', text: 'var(--accent-water)' },
  building: { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)', text: 'var(--accent-building)' },
  historic: { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)', text: 'var(--accent-historic)' },
  hotel:    { bg: 'rgba(244,114,182,0.12)', border: 'rgba(244,114,182,0.3)', text: 'var(--accent-hotel)' }
};

// ---- Wikipedia Fetch ----
async function fetchWiki(name) {
  if (!name || name === 'Unknown' || name === 'Unnamed Feature') return null;
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
    let res = await fetch(url);
    if (!res.ok) {
      const q = encodeURIComponent(name + ' Ghent Belgium');
      const sr = await (await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&format=json&origin=*&srlimit=1`)).json();
      if (!sr.query?.search?.length) return null;
      res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sr.query.search[0].title)}`);
      if (!res.ok) return null;
    }
    return await res.json();
  } catch (e) {
    console.warn('Wikipedia fetch failed:', e);
    return null;
  }
}

// ---- Open Sidebar ----
function openSidebar(props, category, latlng) {
  const name = props.name || 'Unnamed Feature';
  const type = props[category] || props.tourism || props.building || 'unknown';
  const c = COLORS[category];

  // Header
  document.getElementById('sb-icon').textContent = getIcon(category, type);
  document.getElementById('sb-icon').style.cssText = `background:${c.bg};border:1px solid ${c.border}`;
  document.getElementById('sb-title').textContent = name;
  const badge = document.getElementById('sb-badge');
  badge.textContent = cap(type);
  badge.style.cssText = `background:${c.bg};color:${c.text};border:1px solid ${c.border}`;
  const starsEl = document.getElementById('sb-stars');
  starsEl.innerHTML = props.stars ? '<div class="stars">' + '★'.repeat(parseInt(props.stars)) + '</div>' : '';

  // Properties
  let html = '<div class="info-section"><h3>Properties</h3><div class="info-grid">';
  html += `<div class="info-card"><div class="label">Category</div><div class="value">${cap(category)}</div></div>`;
  html += `<div class="info-card"><div class="label">Type</div><div class="value">${cap(type)}</div></div>`;
  if (props.addr_street) html += `<div class="info-card"><div class="label">Street</div><div class="value">${props.addr_street}</div></div>`;
  if (props.addr_housenumber) html += `<div class="info-card"><div class="label">Number</div><div class="value">${props.addr_housenumber}</div></div>`;
  if (props.operator) html += `<div class="info-card"><div class="label">Operator</div><div class="value">${props.operator}</div></div>`;
  if (props.rooms) html += `<div class="info-card"><div class="label">Rooms</div><div class="value">${props.rooms}</div></div>`;
  if (props.internet_access) html += `<div class="info-card"><div class="label">WiFi</div><div class="value">${cap(props.internet_access)}</div></div>`;
  if (props.wheelchair) html += `<div class="info-card"><div class="label">Wheelchair</div><div class="value">${cap(props.wheelchair)}</div></div>`;
  if (props.surface) html += `<div class="info-card"><div class="label">Surface</div><div class="value">${cap(props.surface)}</div></div>`;
  if (props.width) html += `<div class="info-card"><div class="label">Width</div><div class="value">${props.width}m</div></div>`;
  if (props.building_material) html += `<div class="info-card"><div class="label">Material</div><div class="value">${cap(props.building_material)}</div></div>`;
  if (props.amenity) html += `<div class="info-card"><div class="label">Amenity</div><div class="value">${cap(props.amenity)}</div></div>`;
  if (latlng) html += `<div class="info-card full"><div class="label">Coordinates</div><div class="value">${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}</div></div>`;
  html += '</div></div>';

  // Hotel-specific actions
  if (category === 'hotel') {
    html += '<div class="hotel-actions">';
    if (props.website) html += `<a class="hotel-web" href="${props.website}" target="_blank">🌐 Visit Website</a>`;
    if (props.phone) html += `<a class="hotel-phone" href="tel:${props.phone}">📞 ${props.phone}</a>`;
    if (props.email) html += `<a class="hotel-email" href="mailto:${props.email}">✉️ ${props.email}</a>`;
    html += '</div>';
  }

  // OSM Link
  const osmType = props.osm_type === 'nodes' || props.osm_type === 'node' ? 'node' :
    (props.osm_type === 'ways_line' || props.osm_type === 'ways_poly' || props.osm_type === 'way' ? 'way' : 'relation');
  html += `<a class="osm-link" href="https://www.openstreetmap.org/${osmType}/${props.osm_id}" target="_blank">🔗 View on OpenStreetMap</a>`;
  html += '<div id="wiki-area" style="margin-top:20px"></div>';

  sbBody.innerHTML = html;
  sidebar.classList.add('open');

  // Wikipedia lookup
  if (name && name !== 'Unnamed Feature') {
    const wa = document.getElementById('wiki-area');
    wa.innerHTML = '<div class="wiki-loading"><div class="spinner"></div>Searching Wikipedia...</div>';
    fetchWiki(name).then(data => {
      if (!data || data.type === 'disambiguation' || !data.extract) { wa.innerHTML = ''; return; }
      let w = '<div class="wiki-section">';
      if (data.thumbnail?.source) w += `<img src="${data.thumbnail.source}" alt="${data.title}" loading="lazy">`;
      w += `<h4>📖 ${data.title}</h4><p>${data.extract}</p>`;
      w += `<a class="wiki-link" href="${data.content_urls?.desktop?.page || '#'}" target="_blank">Read more on Wikipedia →</a></div>`;
      wa.innerHTML = w;
    });
  }
}

// ---- Layer Feature Handlers ----
function onEach(category) {
  return function (feature, layer) {
    const props = feature.properties;
    const name = props.name || 'Unnamed';
    layer.bindTooltip(name, { sticky: true, direction: 'top', offset: [0, -8] });
    layer.on('click', function (e) {
      const ll = e.latlng || (layer.getCenter ? layer.getCenter() : layer.getLatLng());
      openSidebar(props, category, ll);
    });
    layer.on('mouseover', function (e) {
      const l = e.target;
      if (l.setStyle) l.setStyle({ weight: (l.options.weight || 2) + 2, fillOpacity: .85 });
    });
    layer.on('mouseout', function (e) {
      const ref = { waterway: waterwayLayer, building: buildingLayer, historic: historicLayer, hotel: hotelLayer }[category];
      if (ref && ref.resetStyle) ref.resetStyle(e.target);
    });
  };
}

// ---- Custom DivIcon Factories ----
function createHistoricIcon(feature) {
  const type = feature.properties.historic || 'historic';
  const emoji = getIcon('historic', type);
  return L.divIcon({
    className: '',
    html: `<div class="custom-marker marker-historic">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
}
function createHotelIcon(feature) {
  const type = feature.properties.tourism || 'hotel';
  const emoji = getIcon('hotel', type);
  return L.divIcon({
    className: '',
    html: `<div class="custom-marker marker-hotel">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

// ---- GeoJSON Layers ----
const waterwayLayer = L.geoJSON(null, {
  style: f => ({
    color: '#00d4ff',
    weight: f.properties.waterway === 'river' ? 4 : f.properties.waterway === 'canal' ? 3 : 2,
    opacity: .85
  }),
  onEachFeature: onEach('waterway')
});
const buildingLayer = L.geoJSON(null, {
  style: { fillColor: '#a78bfa', fillOpacity: .25, color: '#7c3aed', weight: 1, opacity: .7 },
  onEachFeature: onEach('building')
});
const historicLayer = L.geoJSON(null, {
  style: { fillColor: '#fbbf24', fillOpacity: .6, color: '#f59e0b', weight: 2, opacity: 1 },
  pointToLayer: (f, ll) => L.marker(ll, { icon: createHistoricIcon(f) }),
  onEachFeature: onEach('historic')
});
const hotelLayer = L.geoJSON(null, {
  style: { fillColor: '#f472b6', fillOpacity: .5, color: '#ec4899', weight: 2, opacity: 1 },
  pointToLayer: (f, ll) => L.marker(ll, { icon: createHotelIcon(f) }),
  onEachFeature: onEach('hotel')
});

// ---- Search Feature ----
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
let allFeatures = []; // collected after loading

function populateSearchIndex(waterways, buildings, historic, hotels) {
  allFeatures = [];
  const addFeatures = (geojson, category) => {
    if (!geojson.features) return;
    geojson.features.forEach(f => {
      if (f.properties.name) {
        const center = getFeatureCenter(f);
        if (center) {
          allFeatures.push({
            name: f.properties.name,
            category,
            properties: f.properties,
            center
          });
        }
      }
    });
  };
  addFeatures(waterways, 'waterway');
  addFeatures(buildings, 'building');
  addFeatures(historic, 'historic');
  addFeatures(hotels, 'hotel');
}

function getFeatureCenter(feature) {
  const geom = feature.geometry;
  if (!geom) return null;
  if (geom.type === 'Point') return { lat: geom.coordinates[1], lng: geom.coordinates[0] };
  if (geom.type === 'MultiPoint' && geom.coordinates.length) return { lat: geom.coordinates[0][1], lng: geom.coordinates[0][0] };
  if (geom.type === 'LineString' && geom.coordinates.length) {
    const mid = geom.coordinates[Math.floor(geom.coordinates.length / 2)];
    return { lat: mid[1], lng: mid[0] };
  }
  if (geom.type === 'MultiLineString' && geom.coordinates.length) {
    const line = geom.coordinates[0];
    const mid = line[Math.floor(line.length / 2)];
    return { lat: mid[1], lng: mid[0] };
  }
  if (geom.type === 'Polygon' && geom.coordinates.length) {
    const ring = geom.coordinates[0];
    let latS = 0, lngS = 0;
    ring.forEach(c => { latS += c[1]; lngS += c[0]; });
    return { lat: latS / ring.length, lng: lngS / ring.length };
  }
  if (geom.type === 'MultiPolygon' && geom.coordinates.length) {
    const ring = geom.coordinates[0][0];
    let latS = 0, lngS = 0;
    ring.forEach(c => { latS += c[1]; lngS += c[0]; });
    return { lat: latS / ring.length, lng: lngS / ring.length };
  }
  return null;
}

let searchDebounce = null;
searchInput.addEventListener('input', function () {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => performSearch(this.value.trim()), 200);
});
searchInput.addEventListener('focus', function () {
  if (this.value.trim().length >= 2) performSearch(this.value.trim());
});
document.addEventListener('click', function (e) {
  if (!e.target.closest('.search-container')) {
    searchResults.classList.remove('active');
  }
});

function performSearch(query) {
  if (query.length < 2) {
    searchResults.classList.remove('active');
    return;
  }
  const q = query.toLowerCase();
  const matches = allFeatures
    .filter(f => f.name.toLowerCase().includes(q))
    .slice(0, 12);

  if (matches.length === 0) {
    searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
    searchResults.classList.add('active');
    return;
  }

  searchResults.innerHTML = matches.map(m => {
    const c = COLORS[m.category];
    return `<div class="search-result-item" data-lat="${m.center.lat}" data-lng="${m.center.lng}" data-category="${m.category}">
      <span class="sr-icon">${getIcon(m.category, m.properties[m.category] || '')}</span>
      <span class="sr-name">${m.name}</span>
      <span class="sr-cat" style="background:${c.bg};color:${c.text};border:1px solid ${c.border}">${cap(m.category)}</span>
    </div>`;
  }).join('');
  searchResults.classList.add('active');

  // Attach click events
  searchResults.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const lat = parseFloat(item.dataset.lat);
      const lng = parseFloat(item.dataset.lng);
      const cat = item.dataset.category;
      map.flyTo([lat, lng], 17, { duration: 1.2 });
      searchResults.classList.remove('active');
      searchInput.value = item.querySelector('.sr-name').textContent;

      // Find the matching feature and open sidebar
      const match = allFeatures.find(f => f.center.lat === lat && f.center.lng === lng);
      if (match) {
        setTimeout(() => openSidebar(match.properties, cat, { lat, lng }), 600);
      }
    });
  });
}

// ---- Geolocation (Locate Me) ----
const locateBtn = document.getElementById('locate-btn');
locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    showToast('Geolocation is not supported by your browser', 'error');
    return;
  }
  locateBtn.classList.add('locating');
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      map.flyTo([latitude, longitude], 16, { duration: 1.5 });
      L.circleMarker([latitude, longitude], {
        radius: 8,
        fillColor: '#6366f1',
        fillOpacity: 1,
        color: '#fff',
        weight: 3
      }).addTo(map).bindPopup('<b>Your Location</b>').openPopup();
      locateBtn.classList.remove('locating');
      showToast('Location found!', 'success');
    },
    err => {
      locateBtn.classList.remove('locating');
      showToast('Unable to get your location', 'error');
      console.warn('Geolocation error:', err);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// ---- Data Loading ----
async function loadAllData() {
  try {
    setLoadingProgress(10, 'Loading waterways...');
    const wRes = await fetch('./data/ghent_waterways.geojson');
    if (!wRes.ok) throw new Error('Failed to load waterways');
    const w = await wRes.json();
    setLoadingProgress(30, 'Loading buildings...');

    const bRes = await fetch('./data/ghent_buildings.geojson');
    if (!bRes.ok) throw new Error('Failed to load buildings');
    const b = await bRes.json();
    setLoadingProgress(50, 'Loading historic sites...');

    const hRes = await fetch('./data/ghent_historic.geojson');
    if (!hRes.ok) throw new Error('Failed to load historic sites');
    const h = await hRes.json();
    setLoadingProgress(70, 'Loading hotels...');

    const hoRes = await fetch('./data/ghent_hotels.geojson');
    if (!hoRes.ok) throw new Error('Failed to load hotels');
    const ho = await hoRes.json();
    setLoadingProgress(85, 'Rendering layers...');

    // Add data to layers
    waterwayLayer.addData(w);
    buildingLayer.addData(b);
    historicLayer.addData(h);
    hotelLayer.addData(ho);

    // Add layers to map
    buildingLayer.addTo(map);
    historicLayer.addTo(map);
    waterwayLayer.addTo(map);
    hotelLayer.addTo(map);

    // Update stats
    document.getElementById('stat-water').textContent = w.features.length;
    document.getElementById('stat-building').textContent = b.features.length;
    document.getElementById('stat-historic').textContent = h.features.length;
    document.getElementById('stat-hotel').textContent = ho.features.length;

    // Layer control
    L.control.layers(null, {
      '🌊 Waterways': waterwayLayer,
      '🏢 Notable Buildings': buildingLayer,
      '🏛️ Historic Sites': historicLayer,
      '🏨 Hotels': hotelLayer
    }, { position: 'topright', collapsed: true }).addTo(map);

    // Fit bounds
    const bounds = waterwayLayer.getBounds();
    bounds.extend(buildingLayer.getBounds());
    bounds.extend(historicLayer.getBounds());
    bounds.extend(hotelLayer.getBounds());
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 80] });

    // Build search index
    setLoadingProgress(95, 'Building search index...');
    populateSearchIndex(w, b, h, ho);

    hideLoading();
    showToast(`Loaded ${w.features.length + b.features.length + h.features.length + ho.features.length} features`, 'success', 3000);

  } catch (err) {
    console.error('Data loading error:', err);
    hideLoading();
    showToast('Error loading map data. Please use a local HTTP server.', 'error', 8000);
  }
}

// Start loading
loadAllData();
