/* ============================================================
   Ghent Explorer — Application Logic v2
   Basemaps, clustering, layer panel, sidebar, search, geolocation
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

// ---- Basemaps ----
const basemaps = {
  Dark:      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',      { attribution: '&copy; <a href="https://carto.com/">CARTO</a>', subdomains: 'abcd', maxZoom: 20 }),
  Light:     L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',     { attribution: '&copy; <a href="https://carto.com/">CARTO</a>', subdomains: 'abcd', maxZoom: 20 }),
  Street:    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',                  { attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>', maxZoom: 19 }),
  Satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '&copy; Esri', maxZoom: 19 })
};
let activeBasemap = basemaps.Dark;

// ---- Map Init ----
const map = L.map('map', { zoomControl: false, layers: [activeBasemap] }).setView([51.0543, 3.7174], 13);
L.control.zoom({ position: 'topright' }).addTo(map);

// ---- Basemap Switcher UI ----
document.querySelectorAll('.basemap-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const name = btn.dataset.bm;
    if (!basemaps[name] || basemaps[name] === activeBasemap) return;
    map.removeLayer(activeBasemap);
    activeBasemap = basemaps[name];
    map.addLayer(activeBasemap);
    activeBasemap.bringToBack();
    document.querySelectorAll('.basemap-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ---- Stats Bar Toggle ----
const statsBar = document.getElementById('stats-bar');
const statsBtnToggle = document.getElementById('stats-toggle-btn');
const sidebar = document.getElementById('sidebar');

function syncSidebarTop() {
  if (statsBar.classList.contains('hidden')) {
    sidebar.style.top = '56px';
  } else {
    sidebar.style.top = '100px';
  }
}
statsBtnToggle.addEventListener('click', () => {
  statsBar.classList.toggle('hidden');
  syncSidebarTop();
});

// ---- Legend Toggle ----
const legendPanel = document.getElementById('legend-panel');
const legendToggle = document.getElementById('legend-toggle');
legendToggle.addEventListener('click', () => legendPanel.classList.toggle('collapsed'));

// ---- Layer Panel Toggle ----
const layerPanel = document.getElementById('layer-panel');
const layerToggleBtn = document.getElementById('layer-toggle-btn');
layerToggleBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  layerPanel.classList.toggle('show');
});
document.addEventListener('click', (e) => {
  if (!layerPanel.contains(e.target) && e.target !== layerToggleBtn) {
    layerPanel.classList.remove('show');
  }
});

// ---- Sidebar ----
const sbBody = document.getElementById('sb-body');
document.getElementById('sb-close').onclick = () => { sidebar.classList.remove('open'); clearActiveLayer(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') { sidebar.classList.remove('open'); clearActiveLayer(); } });

// ---- Active Feature Highlight ----
let activeLayerRef = null;

function clearActiveLayer() {
  if (!activeLayerRef) return;
  const { layer, category } = activeLayerRef;
  if (layer.setStyle) {
    try { if (layerMap[category]?.resetStyle) layerMap[category].resetStyle(layer); } catch(e) {}
  }
  const el = layer.getElement?.();
  if (el) el.querySelector('.custom-marker')?.classList.remove('marker-active');
  activeLayerRef = null;
}

function setActiveLayer(layer, category) {
  clearActiveLayer();
  activeLayerRef = { layer, category };
  if (layer.setStyle) {
    layer.setStyle({ weight: 3, opacity: 1, fillOpacity: 0.8, color: '#ffffff' });
  }
  const el = layer.getElement?.();
  if (el) el.querySelector('.custom-marker')?.classList.add('marker-active');
}

// ---- Icons & Colors ----
const ICONS = {
  waterway:'🌊', building:'🏢', historic:'🏛️', hotel:'🏨',
  castle:'🏰', church:'⛪', monastery:'🕌', cathedral:'⛪', monument:'🗿',
  memorial:'🪦', fort:'🏰', tower:'🗼', windmill:'🌬️', ruins:'🏚️',
  bridge:'🌉', chapel:'⛪', prison:'🔒', hospital:'🏥', school:'🎓',
  guest_house:'🏡', hostel:'🛏️', apartment:'🏢',
  restaurant:'🍽️', cafe:'☕', fast_food:'🍔', bar:'🍺', pub:'🍻',
  artwork:'🎭', museum:'🖼️', gallery:'🖼️', information:'ℹ️', viewpoint:'🔭', picnic_site:'🍱',
  food:'🍽️', art:'🎨', info:'ℹ️'
};
const getIcon = (cat, type) => ICONS[type] || ICONS[cat] || '📍';

const COLORS = {
  waterway: { bg:'rgba(0,212,255,0.12)',    border:'rgba(0,212,255,0.3)',    text:'var(--accent-water)' },
  building: { bg:'rgba(167,139,250,0.12)',  border:'rgba(167,139,250,0.3)',  text:'var(--accent-building)' },
  historic: { bg:'rgba(251,191,36,0.12)',   border:'rgba(251,191,36,0.3)',   text:'var(--accent-historic)' },
  hotel:    { bg:'rgba(244,114,182,0.12)',  border:'rgba(244,114,182,0.3)',  text:'var(--accent-hotel)' },
  food:     { bg:'rgba(16,185,129,0.12)',   border:'rgba(16,185,129,0.3)',   text:'var(--accent-food)' },
  art:      { bg:'rgba(249,115,22,0.12)',   border:'rgba(249,115,22,0.3)',   text:'var(--accent-art)' },
  info:     { bg:'rgba(59,130,246,0.12)',   border:'rgba(59,130,246,0.3)',   text:'var(--accent-info)' }
};

// ---- Wikipedia Fetch ----
async function fetchWiki(name) {
  if (!name || name === 'Unnamed Feature') return null;
  try {
    let res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`);
    if (!res.ok) {
      const q = encodeURIComponent(name + ' Ghent Belgium');
      const sr = await (await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&format=json&origin=*&srlimit=1`)).json();
      if (!sr.query?.search?.length) return null;
      res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(sr.query.search[0].title)}`);
      if (!res.ok) return null;
    }
    return await res.json();
  } catch { return null; }
}

// ---- Open Sidebar ----
function openSidebar(props, category, latlng) {
  const name = props.name || 'Unnamed Feature';
  const type = props[category] || props.amenity || props.tourism || props.building || 'unknown';
  const c = COLORS[category] || COLORS.historic;

  document.getElementById('sb-icon').textContent = getIcon(category, type);
  document.getElementById('sb-icon').style.cssText = `background:${c.bg};border:1px solid ${c.border}`;
  document.getElementById('sb-title').textContent = name;
  const badge = document.getElementById('sb-badge');
  badge.textContent = cap(type);
  badge.style.cssText = `background:${c.bg};color:${c.text};border:1px solid ${c.border}`;
  document.getElementById('sb-stars').innerHTML = props.stars ? '<div class="stars">' + '★'.repeat(+props.stars) + '</div>' : '';

  let html = '<div class="info-section"><h3>Properties</h3><div class="info-grid">';
  html += `<div class="info-card"><div class="label">Category</div><div class="value">${cap(category)}</div></div>`;
  html += `<div class="info-card"><div class="label">Type</div><div class="value">${cap(type)}</div></div>`;
  if (props.addr_street)    html += `<div class="info-card"><div class="label">Street</div><div class="value">${props.addr_street}</div></div>`;
  if (props.addr_housenumber) html += `<div class="info-card"><div class="label">No.</div><div class="value">${props.addr_housenumber}</div></div>`;
  if (props.operator)       html += `<div class="info-card"><div class="label">Operator</div><div class="value">${props.operator}</div></div>`;
  if (props.cuisine)        html += `<div class="info-card"><div class="label">Cuisine</div><div class="value">${cap(props.cuisine)}</div></div>`;
  if (props.rooms)          html += `<div class="info-card"><div class="label">Rooms</div><div class="value">${props.rooms}</div></div>`;
  if (props.internet_access) html += `<div class="info-card"><div class="label">WiFi</div><div class="value">${cap(props.internet_access)}</div></div>`;
  if (props.wheelchair)     html += `<div class="info-card"><div class="label">Wheelchair</div><div class="value">${cap(props.wheelchair)}</div></div>`;
  if (latlng) html += `<div class="info-card full"><div class="label">Coordinates</div><div class="value">${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}</div></div>`;
  html += '</div></div>';

  if (props.website || props.phone || props.email) {
    html += '<div class="hotel-actions">';
    if (props.website) html += `<a class="hotel-web" href="${props.website}" target="_blank">🌐 Visit Website</a>`;
    if (props.phone)   html += `<a class="hotel-phone" href="tel:${props.phone}">📞 ${props.phone}</a>`;
    if (props.email)   html += `<a class="hotel-email" href="mailto:${props.email}">✉️ ${props.email}</a>`;
    html += '</div>';
  }

  const osmType = props.osm_type === 'nodes' || props.osm_type === 'node' ? 'node' :
    (props.osm_type?.includes('way') ? 'way' : 'relation');
  html += `<a class="osm-link" href="https://www.openstreetmap.org/${osmType}/${props.osm_id}" target="_blank">🔗 View on OpenStreetMap</a>`;
  html += '<div id="wiki-area" style="margin-top:20px"></div>';

  sbBody.innerHTML = html;
  sidebar.classList.add('open');
  syncSidebarTop();

  if (name !== 'Unnamed Feature') {
    const wa = document.getElementById('wiki-area');
    wa.innerHTML = `<div class="wiki-skeleton">
      <div class="skel-img skeleton"></div>
      <div class="skel-title skeleton"></div>
      <div class="skel-line skeleton"></div>
      <div class="skel-line skeleton" style="width:80%"></div>
      <div class="skel-line skeleton" style="width:60%"></div>
    </div>`;
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
      setActiveLayer(e.target, category);
      openSidebar(props, category, ll);
    });
    layer.on('mouseover', function (e) {
      if (e.target.setStyle) e.target.setStyle({ weight: (e.target.options.weight || 2) + 2, fillOpacity: .85 });
    });
    layer.on('mouseout', function (e) {
      const ref = layerMap[category];
      if (ref && ref.resetStyle) ref.resetStyle(e.target);
    });
  };
}

// ---- DivIcon Factory ----
function createCustomIcon(feature, category, typeKey, cssClass) {
  const emoji = getIcon(category, feature.properties[typeKey] || category);
  return L.divIcon({ className: '', html: `<div class="custom-marker ${cssClass}">${emoji}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] });
}

// ---- GeoJSON Layers ----
const waterwayLayer = L.geoJSON(null, {
  style: f => ({ color: '#00d4ff', weight: f.properties.waterway === 'river' ? 4 : f.properties.waterway === 'canal' ? 3 : 2, opacity: .85 }),
  onEachFeature: onEach('waterway')
});
const buildingLayer = L.geoJSON(null, {
  style: { fillColor: '#a78bfa', fillOpacity: .25, color: '#7c3aed', weight: 1, opacity: .7 },
  onEachFeature: onEach('building')
});
const historicLayer = L.geoJSON(null, {
  style: { fillColor: '#fbbf24', fillOpacity: .6, color: '#f59e0b', weight: 2, opacity: 1 },
  pointToLayer: (f, ll) => L.marker(ll, { icon: createCustomIcon(f, 'historic', 'historic', 'marker-historic') }),
  onEachFeature: onEach('historic')
});
const hotelLayer = L.geoJSON(null, {
  style: { fillColor: '#f472b6', fillOpacity: .5, color: '#ec4899', weight: 2, opacity: 1 },
  pointToLayer: (f, ll) => L.marker(ll, { icon: createCustomIcon(f, 'hotel', 'tourism', 'marker-hotel') }),
  onEachFeature: onEach('hotel')
});

// ---- Clustered Layers ----
function makeCluster(color) {
  return L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 50,
    iconCreateFunction: cluster => L.divIcon({
      html: `<div style="background:${color};border:2px solid #fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${cluster.getChildCount()}</div>`,
      className: '', iconSize: [34, 34], iconAnchor: [17, 17]
    })
  });
}
const foodCluster = makeCluster('#10b981');
const artCluster  = makeCluster('#f97316');
const infoCluster = makeCluster('#3b82f6');

const foodGeoLayer = L.geoJSON(null, {
  pointToLayer: (f, ll) => L.marker(ll, { icon: createCustomIcon(f, 'food', 'amenity', 'marker-food') }),
  onEachFeature: onEach('food')
});
const artGeoLayer = L.geoJSON(null, {
  pointToLayer: (f, ll) => L.marker(ll, { icon: createCustomIcon(f, 'art', 'tourism', 'marker-art') }),
  onEachFeature: onEach('art')
});
const infoGeoLayer = L.geoJSON(null, {
  pointToLayer: (f, ll) => L.marker(ll, { icon: createCustomIcon(f, 'info', 'tourism', 'marker-info') }),
  onEachFeature: onEach('info')
});

// Layer map for mouseout reset
const layerMap = { waterway: waterwayLayer, building: buildingLayer, historic: historicLayer, hotel: hotelLayer, food: foodGeoLayer, art: artGeoLayer, info: infoGeoLayer };

// ---- Layer Panel Checkboxes ----
function wireLayerToggles() {
  document.querySelectorAll('.layer-toggle-item input').forEach(cb => {
    const layerName = cb.dataset.layer;
    const layerOrCluster = { waterway: waterwayLayer, building: buildingLayer, historic: historicLayer, hotel: hotelLayer, food: foodCluster, art: artCluster, info: infoCluster }[layerName];
    if (!layerOrCluster) return;
    cb.addEventListener('change', () => {
      if (cb.checked) { map.addLayer(layerOrCluster); }
      else { map.removeLayer(layerOrCluster); }
    });
  });
}

// ---- Search ----
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchClear = document.getElementById('search-clear');
let allFeatures = [];
let focusedResultIndex = -1;

function highlightText(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return text.slice(0, idx) +
    `<mark class="sr-highlight">${text.slice(idx, idx + query.length)}</mark>` +
    text.slice(idx + query.length);
}

function populateSearchIndex(layersData) {
  allFeatures = [];
  layersData.forEach(({ data, category }) => {
    if (!data.features) return;
    data.features.forEach(f => {
      if (f.properties.name) {
        const center = getFeatureCenter(f);
        if (center) allFeatures.push({ name: f.properties.name, category, properties: f.properties, center });
      }
    });
  });
}

function getFeatureCenter(feature) {
  const g = feature.geometry;
  if (!g) return null;
  if (g.type === 'Point') return { lat: g.coordinates[1], lng: g.coordinates[0] };
  if (g.type === 'LineString' && g.coordinates.length) { const m = g.coordinates[Math.floor(g.coordinates.length/2)]; return { lat: m[1], lng: m[0] }; }
  if (g.type === 'Polygon' && g.coordinates.length) { const r = g.coordinates[0]; let la=0,ln=0; r.forEach(c=>{la+=c[1];ln+=c[0];}); return {lat:la/r.length,lng:ln/r.length}; }
  if (g.type === 'MultiPolygon' && g.coordinates.length) { const r = g.coordinates[0][0]; let la=0,ln=0; r.forEach(c=>{la+=c[1];ln+=c[0];}); return {lat:la/r.length,lng:ln/r.length}; }
  if (g.type === 'MultiLineString' && g.coordinates.length) { const l=g.coordinates[0]; const m=l[Math.floor(l.length/2)]; return {lat:m[1],lng:m[0]}; }
  return null;
}

function updateSearchFocus(items) {
  items.forEach((item, i) => item.classList.toggle('focused', i === focusedResultIndex));
  if (items[focusedResultIndex]) items[focusedResultIndex].scrollIntoView({ block: 'nearest' });
}

let searchDebounce = null;
searchInput.addEventListener('input', function() {
  clearTimeout(searchDebounce);
  const val = this.value.trim();
  searchClear.classList.toggle('visible', val.length > 0);
  focusedResultIndex = -1;
  searchDebounce = setTimeout(() => performSearch(val), 200);
});
searchInput.addEventListener('focus', function() { if (this.value.trim().length >= 2) performSearch(this.value.trim()); });
searchInput.addEventListener('keydown', function(e) {
  const items = searchResults.querySelectorAll('.search-result-item');
  if (!items.length) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); focusedResultIndex = Math.min(focusedResultIndex + 1, items.length - 1); updateSearchFocus(items); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); focusedResultIndex = Math.max(focusedResultIndex - 1, 0); updateSearchFocus(items); }
  else if (e.key === 'Enter' && focusedResultIndex >= 0) { items[focusedResultIndex]?.click(); }
});
searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.remove('visible');
  searchResults.classList.remove('active');
  focusedResultIndex = -1;
  searchInput.focus();
});
document.addEventListener('click', e => { if (!e.target.closest('.search-container')) { searchResults.classList.remove('active'); focusedResultIndex = -1; } });

function performSearch(query) {
  if (query.length < 2) { searchResults.classList.remove('active'); return; }
  const q = query.toLowerCase();
  const matches = allFeatures.filter(f => f.name.toLowerCase().includes(q)).slice(0, 12);
  if (!matches.length) { searchResults.innerHTML = '<div class="search-no-results">No results found</div>'; searchResults.classList.add('active'); return; }
  searchResults.innerHTML = matches.map(m => {
    const c = COLORS[m.category] || COLORS.historic;
    const typeKey = m.properties.amenity || m.properties.tourism || '';
    return `<div class="search-result-item" data-lat="${m.center.lat}" data-lng="${m.center.lng}" data-category="${m.category}">
      <span class="sr-icon">${getIcon(m.category, typeKey)}</span>
      <span class="sr-name">${highlightText(m.name, query)}</span>
      <span class="sr-cat" style="background:${c.bg};color:${c.text};border:1px solid ${c.border}">${cap(m.category)}</span>
    </div>`;
  }).join('');
  focusedResultIndex = -1;
  searchResults.classList.add('active');
  searchResults.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const lat = parseFloat(item.dataset.lat), lng = parseFloat(item.dataset.lng), cat = item.dataset.category;
      map.flyTo([lat, lng], 17, { duration: 1.2 });
      searchResults.classList.remove('active');
      searchInput.value = item.querySelector('.sr-name').textContent;
      const match = allFeatures.find(f => f.center.lat === lat && f.center.lng === lng);
      if (match) setTimeout(() => openSidebar(match.properties, cat, { lat, lng }), 600);
    });
  });
}

// ---- Geolocation ----
const locateBtn = document.getElementById('locate-btn');
locateBtn.addEventListener('click', () => {
  if (!navigator.geolocation) { showToast('Geolocation not supported', 'error'); return; }
  locateBtn.classList.add('locating');
  navigator.geolocation.getCurrentPosition(
    pos => {
      map.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { duration: 1.5 });
      L.circleMarker([pos.coords.latitude, pos.coords.longitude], { radius: 8, fillColor: '#6366f1', fillOpacity: 1, color: '#fff', weight: 3 }).addTo(map).bindPopup('<b>Your Location</b>').openPopup();
      locateBtn.classList.remove('locating');
      showToast('Location found!', 'success');
    },
    () => { locateBtn.classList.remove('locating'); showToast('Unable to get location', 'error'); },
    { enableHighAccuracy: true, timeout: 10000 }
  );
});

// ---- Data Loading ----
async function loadAllData() {
  try {
    setLoadingProgress(10, 'Loading waterways...');
    const w = await (await fetch('./data/ghent_waterways.geojson')).json();
    setLoadingProgress(25, 'Loading buildings...');
    const b = await (await fetch('./data/ghent_buildings.geojson')).json();
    setLoadingProgress(40, 'Loading historic sites...');
    const h = await (await fetch('./data/ghent_historic.geojson')).json();
    setLoadingProgress(55, 'Loading hotels...');
    const ho = await (await fetch('./data/ghent_hotels.geojson')).json();
    setLoadingProgress(70, 'Loading additional data...');
    const t = await (await fetch('./tambahan_geojson_uid_19270ad4-e1fc-43a9-aa49-bb7963106727/tambahan.geojson')).json();

    // Filter tambahan
    const foodGeoJSON = { type: 'FeatureCollection', features: [] };
    const artGeoJSON  = { type: 'FeatureCollection', features: [] };
    const infoGeoJSON = { type: 'FeatureCollection', features: [] };
    const foodTypes = new Set(['restaurant','fast_food','cafe','pub','bar']);
    const artTypes  = new Set(['artwork','museum','gallery']);
    const infoTypes = new Set(['information','viewpoint','picnic_site']);

    t.features.forEach(f => {
      if (foodTypes.has(f.properties.amenity))  foodGeoJSON.features.push(f);
      else if (artTypes.has(f.properties.tourism))  artGeoJSON.features.push(f);
      else if (infoTypes.has(f.properties.tourism)) infoGeoJSON.features.push(f);
    });

    setLoadingProgress(85, 'Rendering layers...');

    waterwayLayer.addData(w);
    buildingLayer.addData(b);
    historicLayer.addData(h);
    hotelLayer.addData(ho);
    foodGeoLayer.addData(foodGeoJSON);
    artGeoLayer.addData(artGeoJSON);
    infoGeoLayer.addData(infoGeoJSON);

    // Add clustered data
    foodCluster.addLayer(foodGeoLayer);
    artCluster.addLayer(artGeoLayer);
    infoCluster.addLayer(infoGeoLayer);

    // Default visible layers
    buildingLayer.addTo(map);
    historicLayer.addTo(map);
    waterwayLayer.addTo(map);
    hotelLayer.addTo(map);
    // food/art/info off by default — user toggles

    // Stats
    document.getElementById('stat-water').textContent    = w.features.length;
    document.getElementById('stat-building').textContent = b.features.length;
    document.getElementById('stat-historic').textContent = h.features.length;
    document.getElementById('stat-hotel').textContent    = ho.features.length;
    document.getElementById('stat-food').textContent     = foodGeoJSON.features.length;
    document.getElementById('stat-art').textContent      = artGeoJSON.features.length;
    document.getElementById('stat-info').textContent     = infoGeoJSON.features.length;

    // Show legend now
    legendPanel.style.display = 'block';

    // Fit bounds
    const bounds = waterwayLayer.getBounds().extend(buildingLayer.getBounds()).extend(historicLayer.getBounds()).extend(hotelLayer.getBounds());
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 80] });

    setLoadingProgress(95, 'Building search index...');
    populateSearchIndex([
      { data: w, category: 'waterway' },
      { data: b, category: 'building' },
      { data: h, category: 'historic' },
      { data: ho, category: 'hotel' },
      { data: foodGeoJSON, category: 'food' },
      { data: artGeoJSON, category: 'art' },
      { data: infoGeoJSON, category: 'info' }
    ]);

    wireLayerToggles();
    hideLoading();
    const total = w.features.length + b.features.length + h.features.length + ho.features.length + foodGeoJSON.features.length + artGeoJSON.features.length + infoGeoJSON.features.length;
    showToast(`✅ ${total.toLocaleString()} features loaded`, 'success', 3500);

  } catch (err) {
    console.error(err);
    hideLoading();
    showToast(`Error loading data: ${err.message}`, 'error', 8000);
  }
}

loadAllData();
