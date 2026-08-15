import './style.css';
import Papa from 'papaparse';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import Wkt from 'wicket';
// DOM Elements
const listContainer = document.getElementById('list-container');
const loading = document.getElementById('loading');
const mapOverlay = document.getElementById('map-overlay');
const closeMapBtn = document.getElementById('close-map-btn');
const mapTitle = document.getElementById('map-title');
const recordCount = document.getElementById('record-count');
const searchInput = document.getElementById('search-input');

// Gelişmiş Filtreleme DOM
const openFilterBtn = document.getElementById('open-filter-btn');
const closeFilterBtn = document.getElementById('close-filter-btn');
const filterOverlay = document.getElementById('filter-overlay');
const filterDrawer = document.getElementById('filter-drawer');
const filterIlce = document.getElementById('filter-ilce');
const filterMahalle = document.getElementById('filter-mahalle');
const filterAda = document.getElementById('filter-ada');
const filterParsel = document.getElementById('filter-parsel');
const filterKesisimOp = document.getElementById('filter-kesisim-op');
const filterKesisimVal = document.getElementById('filter-kesisim-val');
const filterTapuCins = document.getElementById('filter-tapucins');
const filterApplyBtn = document.getElementById('filter-apply-btn');
const filterClearBtn = document.getElementById('filter-clear-btn');
const filterBadge = document.getElementById('filter-badge');

// Filter Drawer Aç Kapat
function toggleFilterDrawer() {
  if (filterDrawer.classList.contains('translate-x-full')) {
    filterDrawer.classList.remove('translate-x-full');
    filterOverlay.classList.remove('hidden');
    setTimeout(() => filterOverlay.classList.remove('opacity-0'), 10);
  } else {
    filterDrawer.classList.add('translate-x-full');
    filterOverlay.classList.add('opacity-0');
    setTimeout(() => filterOverlay.classList.add('hidden'), 300);
  }
}
if (openFilterBtn) openFilterBtn.addEventListener('click', toggleFilterDrawer);
if (closeFilterBtn) closeFilterBtn.addEventListener('click', toggleFilterDrawer);
if (filterOverlay) filterOverlay.addEventListener('click', toggleFilterDrawer);

// Layer Control Elements
const toggleLayerA = document.getElementById('toggle-layer-a');
const toggleLayerB = document.getElementById('toggle-layer-b');
const toggleLayerInt = document.getElementById('toggle-layer-int');

// Legend Toggle Elements
const legendToggleBtn = document.getElementById('legend-toggle-btn');
const legendContent = document.getElementById('legend-content');
const legendChevron = document.getElementById('legend-chevron');

if (legendToggleBtn) {
  legendToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    legendContent.classList.toggle('hidden');
  });
}

// Pagination Elements
const paginationContainer = document.getElementById('pagination-container');
const itemsPerPageSelect = document.getElementById('items-per-page');
const pageInfo = document.getElementById('page-info');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');

let map = null;
let currentLayers = [];
let activeMapLayers = { a: null, b: null, int: null };
let allData = [];
let filteredData = []; // Arama sonrası filtrelenmiş verileri tutar
let currentViewMode = 'list'; // 'grid' veya 'list'
let currentPage = 1;
// Tüm cihazlar için varsayılan kayıt listeleme limiti 10 olarak belirlendi.
let itemsPerPage = 10;

// View Toggles DOM Elements
const viewTogglesContainer = document.getElementById('view-toggles');
const viewGridBtn = document.getElementById('view-grid-btn');
const viewListBtn = document.getElementById('view-list-btn');

// View Toggle Events
function updateViewToggleUI() {
  if (currentViewMode === 'grid') {
    viewGridBtn.classList.add('bg-white/20', 'shadow-sm', 'text-white');
    viewGridBtn.classList.remove('text-emerald-100/70', 'hover:text-white', 'hover:bg-white/10');
    
    viewListBtn.classList.remove('bg-white/20', 'shadow-sm', 'text-white');
    viewListBtn.classList.add('text-emerald-100/70', 'hover:text-white', 'hover:bg-white/10');
  } else {
    viewListBtn.classList.add('bg-white/20', 'shadow-sm', 'text-white');
    viewListBtn.classList.remove('text-emerald-100/70', 'hover:text-white', 'hover:bg-white/10');
    
    viewGridBtn.classList.remove('bg-white/20', 'shadow-sm', 'text-white');
    viewGridBtn.classList.add('text-emerald-100/70', 'hover:text-white', 'hover:bg-white/10');
  }
}

viewGridBtn.addEventListener('click', () => {
  if (currentViewMode !== 'grid') {
    currentViewMode = 'grid';
    updateViewToggleUI();
    renderList();
  }
});

viewListBtn.addEventListener('click', () => {
  if (currentViewMode !== 'list') {
    currentViewMode = 'list';
    updateViewToggleUI();
    renderList();
  }
});

// Pagination Events
itemsPerPageSelect.addEventListener('change', (e) => {
  itemsPerPage = parseInt(e.target.value, 10);
  currentPage = 1;
  renderList();
});

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderList();
  }
});

nextPageBtn.addEventListener('click', () => {
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderList();
  }
});

// Arama ve Filtreleme Uygulama Fonksiyonu
function applyFilters() {
  const searchTerm = searchInput.value.toLocaleLowerCase('tr-TR').trim();
  const selectedIlceler = Array.from(filterIlce.selectedOptions).map(opt => opt.value);
  const selectedMahalleler = Array.from(filterMahalle.selectedOptions).map(opt => opt.value);
  const selectedAdalar = Array.from(filterAda.selectedOptions).map(opt => opt.value);
  const selectedParseller = Array.from(filterParsel.selectedOptions).map(opt => opt.value);
  const selectedCinsler = Array.from(filterTapuCins.selectedOptions).map(opt => opt.value);
  const kesOp = filterKesisimOp.value;
  const kesVal = parseFloat(filterKesisimVal.value);

  filteredData = allData.filter(record => {
    // 1. Hızlı Arama
    if (searchTerm) {
       const hasSearchTerm = Object.values(record).some(val => 
          val && String(val).toLocaleLowerCase('tr-TR').includes(searchTerm)
       );
       if (!hasSearchTerm) return false;
    }
    // 2. İlçe Kontrolü
    if (selectedIlceler.length > 0 && !selectedIlceler.includes(record.ilcead)) return false;
    // 3. Mahalle Kontrolü
    if (selectedMahalleler.length > 0 && !selectedMahalleler.includes(record.mahallead)) return false;
    // 4. Ada
    if (selectedAdalar.length > 0) {
       const adaA = String(record.parsel_a_adano || '').trim();
       const adaB = String(record.parsel_b_adano || '').trim();
       if (!selectedAdalar.includes(adaA) && !selectedAdalar.includes(adaB)) return false;
    }
    // 5. Parsel
    if (selectedParseller.length > 0) {
       const parA = String(record.parsel_a_parselno || '').trim();
       const parB = String(record.parsel_b_parselno || '').trim();
       if (!selectedParseller.includes(parA) && !selectedParseller.includes(parB)) return false;
    }
    // 6. Kesişim
    if (kesOp && !isNaN(kesVal)) {
       const recKes = parseFloat(record.kesisim_alani_m2 || 0);
       if (kesOp === '>' && recKes <= kesVal) return false;
       if (kesOp === '<' && recKes >= kesVal) return false;
       if (kesOp === '=' && recKes !== kesVal) return false;
    }
    // 7. Tapu Cins
    if (selectedCinsler.length > 0) {
       const cinsA = String(record.orman_a_tapucinsaciklama || '').trim();
       const cinsB = String(record.orman_b_tapucinsaciklama || '').trim();
       if (!selectedCinsler.includes(cinsA) && !selectedCinsler.includes(cinsB)) return false;
    }
    return true;
  });
  
  currentPage = 1;
  renderList();
  updateFilterBadge();
}

function updateFilterBadge() {
  let count = 0;
  if (filterIlce.selectedOptions.length > 0) count++;
  if (filterMahalle.selectedOptions.length > 0) count++;
  if (filterAda.selectedOptions.length > 0) count++;
  if (filterParsel.selectedOptions.length > 0) count++;
  if (filterKesisimOp.value !== '' && filterKesisimVal.value !== '') count++;
  if (filterTapuCins.selectedOptions.length > 0) count++;
  
  if (count > 0) {
    filterBadge.textContent = count;
    filterBadge.classList.remove('hidden');
    openFilterBtn.classList.add('bg-emerald-600', 'text-white', 'border-emerald-500');
    openFilterBtn.classList.remove('bg-white/10', 'text-emerald-50');
  } else {
    filterBadge.classList.add('hidden');
    openFilterBtn.classList.remove('bg-emerald-600', 'text-white', 'border-emerald-500');
    openFilterBtn.classList.add('bg-white/10', 'text-emerald-50');
  }
}

if (filterApplyBtn) {
  filterApplyBtn.addEventListener('click', () => {
    applyFilters();
    toggleFilterDrawer();
  });
}

if (filterClearBtn) {
  filterClearBtn.addEventListener('click', () => {
    Array.from(filterIlce.options).forEach(opt => opt.selected = false);
    Array.from(filterMahalle.options).forEach(opt => opt.selected = false);
    Array.from(filterAda.options).forEach(opt => opt.selected = false);
    Array.from(filterParsel.options).forEach(opt => opt.selected = false);
    Array.from(filterTapuCins.options).forEach(opt => opt.selected = false);
    filterKesisimOp.value = '';
    filterKesisimVal.value = '';
    applyFilters();
  });
}

// Search Events (Debounce ile)
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    applyFilters();
  }, 250);
});

// İlçe değiştiğinde Mahalleleri doldurma
if (filterIlce) {
  filterIlce.addEventListener('change', () => {
    const selectedIlceler = Array.from(filterIlce.selectedOptions).map(opt => opt.value);
    filterMahalle.innerHTML = '';
    let currentMahalleler = new Set();
    
    allData.forEach(r => {
      if (selectedIlceler.length === 0 || selectedIlceler.includes(r.ilcead)) {
        if (r.mahallead) currentMahalleler.add(r.mahallead);
      }
    });
    
    const sortedMahalleler = Array.from(currentMahalleler).sort((a,b) => a.localeCompare(b, 'tr-TR'));
    sortedMahalleler.forEach(mah => {
      const opt = document.createElement('option');
      opt.value = mah;
      opt.textContent = mah;
      filterMahalle.appendChild(opt);
    });
  });
}

// Map Layer Toggles
toggleLayerA.addEventListener('change', (e) => {
  if (!map || !activeMapLayers.a) return;
  if (e.target.checked) activeMapLayers.a.addTo(map);
  else map.removeLayer(activeMapLayers.a);
});

toggleLayerB.addEventListener('change', (e) => {
  if (!map || !activeMapLayers.b) return;
  if (e.target.checked) activeMapLayers.b.addTo(map);
  else map.removeLayer(activeMapLayers.b);
});

toggleLayerInt.addEventListener('change', (e) => {
  if (!map || !activeMapLayers.int) return;
  if (e.target.checked) {
    activeMapLayers.int.addTo(map);
    activeMapLayers.int.bringToFront();
  }
  else map.removeLayer(activeMapLayers.int);
});

// Haritayı İlklendirme
function initMap() {
  if (map) return;
  
  // Custom SVG Renderer (Pattern için)
  const myRenderer = L.svg({ padding: 0.5 });
  
  map = L.map('map', { renderer: myRenderer }).setView([39.0, 35.0], 6); // Türkiye geneli

  // --- HARİTA ALTLIKLARI (BASEMAPS) ---
  const cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OSM & CARTO',
    subdomains: 'abcd',
    maxZoom: 20
  });

  const googleStreets = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    attribution: '&copy; Google Maps',
    maxZoom: 20
  });

  const googleSat = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    attribution: '&copy; Google Maps (Satellite)',
    maxZoom: 20
  });

  const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    attribution: '&copy; Google Maps (Hybrid)',
    maxZoom: 20
  });

  const googleTerrain = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
    attribution: '&copy; Google Maps (Terrain)',
    maxZoom: 20
  });

  const esriImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Esri (World Imagery)',
    maxZoom: 19
  });

  const openTopo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenTopoMap',
    maxZoom: 17
  });

  const baseMaps = {
    "Açık Tema (Mevcut)": cartoLight,
    "Google Harita": googleStreets,
    "Google Uydu": googleSat,
    "Google Hibrit (Uydu+Yol)": googleHybrid,
    "Google Arazi (Fiziki)": googleTerrain,
    "Esri Uydu (Orman Detay)": esriImagery,
    "Topografya (TopoMap)": openTopo
  };

  // Varsayılan (Default) Harita
  googleTerrain.addTo(map);

  // Katman Seçici Kontrolü (Sağ Üst)
  L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

  // Lejant Butonunu Leaflet TopRight İçerisine Taşıma
  const legendControlBox = document.getElementById('custom-legend-control');
  const targetContainer = map.getContainer().querySelector('.leaflet-top.leaflet-right');
  if (legendControlBox && targetContainer) {
    legendControlBox.classList.remove('hidden');
    targetContainer.appendChild(legendControlBox);
    L.DomEvent.disableClickPropagation(legendControlBox);
  }

  // --- GEOMAN (ÇİZİM VE ÖLÇÜM ARAÇLARI) ---
  if (map.pm) {
    map.pm.addControls({
      position: 'bottomleft', // CSS ile alt ortaya (bottom-center) hizalayacağız
      drawMarker: true,
      drawPolygon: true,
      drawPolyline: true,
      drawCircle: true,
      drawCircleMarker: false,
      drawRectangle: true,
      editMode: true,
      dragMode: true,
      cutPolygon: true,
      removalMode: true,
    });

    // Ölçüm Ayarları (Her iki seçenek için metrik sistem, metrekare ve kilometre destekli)
    map.pm.setGlobalOptions({
      measurements: { measurement: true, displayFormat: 'metric' },
      hintlineStyle: { color: '#10b981', dashArray: '5,5' },
      templineStyle: { color: '#10b981' },
      pathOptions: { color: '#059669', fillColor: '#10b981', fillOpacity: 0.4 }
    });
  }

  // Taralı Alan (Stripe Pattern) için SVG Defs Ekleme
  const svgContainer = myRenderer._container;
  if (svgContainer) {
    let defs = svgContainer.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svgContainer.appendChild(defs);
    }
    defs.innerHTML += `
      <pattern id="stripe-pattern" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
        <rect width="8" height="8" fill="#ef4444" fill-opacity="0.2"/>
        <line x1="0" y1="0" x2="0" y2="8" stroke="#dc2626" stroke-width="4"/>
      </pattern>
    `;
  }
}

// Map'i temizleme
function clearMap() {
  currentLayers.forEach(layer => map.removeLayer(layer));
  currentLayers = [];
  activeMapLayers = { a: null, b: null, int: null };
}

// WKT'den Leaflet Katmanı Oluşturma
function createLayerFromWKT(wktString, style, popupContent) {
  if (!wktString) return null;

  try {
    const wkt = new Wkt.Wkt();
    wkt.read(wktString);
    const geojson = wkt.toJson();

    const layer = L.geoJSON(geojson, {
      style: style,
      onEachFeature: function (feature, l) {
        if (popupContent) {
          l.bindPopup(
            `<div class="p-3 text-sm">
              ${popupContent}
            </div>`,
            { className: 'custom-popup' }
          );
        }
      }
    });

    return layer;
  } catch (error) {
    console.error("WKT parse hatası:", error);
    return null;
  }
}

// Haritayı Açma
function openMap(record) {
  mapOverlay.classList.remove('translate-y-full');
  document.body.style.overflow = 'hidden'; // Arka plan kaymasını engelle

  // İl/İlçe/Mahalle Ada/Parsel isimleri
  const title = `${record.ilad} / ${record.ilcead} / ${record.mahallead} - Ada: ${record.parsel_a_adano || '-'} Parsel: ${record.parsel_a_parselno || '-'}`;
  mapTitle.textContent = title;

  initMap();
  // Map container size update (animasyon sonrası için timeout)
  setTimeout(() => {
    map.invalidateSize();
    clearMap();

    const bounds = L.latLngBounds();

    // 1. Ana Parsel (Parsel A)
    if (record.parsel_a_geom) {
      const p1Style = { color: '#2563eb', weight: 2, fillColor: '#3b82f6', fillOpacity: 0.3 };
      const content = `<div class="space-y-1">
                         <div class="text-[15px] font-bold text-blue-700 border-b pb-1 mb-2">Orman A Parseli</div>
                         <div><strong>İl/İlçe:</strong> ${record.ilad} / ${record.ilcead}</div>
                         <div><strong>Mahalle:</strong> ${record.mahallead}</div>
                         <div><strong>Ada/Parsel:</strong> ${record.parsel_a_adano} / ${record.parsel_a_parselno}</div>
                         <div><strong>Tapu Alanı:</strong> ${record.parsel_a_tapualan || '-'} m²</div>
                         <div><strong>Cinsi:</strong> ${record.orman_a_tapucinsaciklama || '-'}</div>
                       </div>`;
      const layerA = createLayerFromWKT(record.parsel_a_geom, p1Style, content);
      if (layerA) {
        activeMapLayers.a = layerA;
        if (toggleLayerA.checked) layerA.addTo(map);
        currentLayers.push(layerA);
        bounds.extend(layerA.getBounds());
      }
    }

    // 2. Mükerrer / Kesişen Parsel (Parsel B) - Yeşil/Emerald
    if (record.parsel_b_geom) {
      const p2Style = { color: '#059669', weight: 2, fillColor: '#10b981', fillOpacity: 0.3 };
      const content = `<div class="space-y-1">
                         <div class="text-[15px] font-bold text-emerald-700 border-b pb-1 mb-2">Orman B Parseli</div>
                         <div><strong>İl/İlçe:</strong> ${record.orman_b_ilad || '-'} / ${record.orman_b_ilcead || '-'}</div>
                         <div><strong>Mahalle:</strong> ${record.orman_b_mahallead || '-'}</div>
                         <div><strong>Ada/Parsel:</strong> ${record.parsel_b_adano} / ${record.parsel_b_parselno}</div>
                         <div><strong>Tapu Alanı:</strong> ${record.parsel_b_tapualan || '-'} m²</div>
                         <div><strong>Cinsi:</strong> ${record.orman_b_tapucinsaciklama || '-'}</div>
                       </div>`;
      const layerB = createLayerFromWKT(record.parsel_b_geom, p2Style, content);
      if (layerB) {
        activeMapLayers.b = layerB;
        if (toggleLayerB.checked) layerB.addTo(map);
        currentLayers.push(layerB);
        bounds.extend(layerB.getBounds());
      }
    }

    // 3. Kesişim Alanı - Kırmızı/Red
    if (record.kesisim_geom) {
      const intersectionStyle = { color: '#dc2626', weight: 2, fillColor: 'url(#stripe-pattern)', fillOpacity: 1 };
      const content = `<div class="space-y-1">
                         <div class="text-[15px] font-bold text-red-700 border-b pb-1 mb-2">Kesişim Alanı</div>
                         <div><strong>İl/İlçe:</strong> ${record.ilad} / ${record.ilcead}</div>
                         <div><strong>Mahalle:</strong> ${record.mahallead}</div>
                         <div><strong>Kesişim Miktarı:</strong> ${record.kesisim_alani_m2 || '?'} m²</div>
                       </div>`;
      const layerInt = createLayerFromWKT(record.kesisim_geom, intersectionStyle, content);
      if (layerInt) {
        activeMapLayers.int = layerInt;
        if (toggleLayerInt.checked) {
          layerInt.addTo(map);
          layerInt.bringToFront();
        }
        currentLayers.push(layerInt);
      }
    }

    // Haritayı sığdır
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

  }, 350);
}

// Haritayı Kapatma
closeMapBtn.addEventListener('click', () => {
  mapOverlay.classList.add('translate-y-full');
  document.body.style.overflow = '';
});

// Arayüz Liste Render
function renderList() {
  loading.classList.add('hidden');
  listContainer.classList.remove('hidden');
  viewTogglesContainer.classList.remove('hidden');
  paginationContainer.classList.remove('hidden'); // Pagination'ı göster
  
  recordCount.textContent = `${filteredData.length} Kayıt Bulundu`;

  // Paginator Hesaplamaları
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Güvenlik: Sayfa sınırları aşılmasın
  if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  
  // Paginator UI Güncelleme
  pageInfo.textContent = totalItems === 0 ? '0' : `${startIndex + 1} - ${endIndex} of ${totalItems}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages || totalPages === 0;

  // Görüntülenecek veriyi dilimle
  const pageData = filteredData.slice(startIndex, endIndex);

  // Mevcut dinamik class'ları temizle ve padding statik sınıflarını koru
  listContainer.className = 'px-2 sm:px-4 pt-4 pb-24 content-start';
  
  if (currentViewMode === 'grid') {
    listContainer.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-6');
  } else {
    listContainer.classList.add('flex', 'flex-col', 'gap-4');
  }

  listContainer.innerHTML = ''; // Temizle

  if (pageData.length === 0) {
     listContainer.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">Kayıt bulunamadı.</div>';
     return;
  }

  pageData.forEach((record, idx) => {
    const globalIndex = startIndex + idx + 1; // Gerçek sıra numarası
    // Sadece geçerli geometri varsa ekle (basit bir kontrol)
    if (!record.parsel_a_geom) return;

    const card = document.createElement('div');
    card.className = "bg-white/90 rounded-xl shadow-lg border border-white/50 hover:bg-white/95 hover:shadow-xl transition-all cursor-pointer overflow-hidden group " + 
                     (currentViewMode === 'grid' ? "flex flex-col" : "flex flex-col sm:flex-row items-stretch");

    // Card HTML
    if (currentViewMode === 'grid') {
      card.innerHTML = `
        <div class="p-3 sm:p-5 flex-1">
          <div class="flex justify-between items-start mb-1 sm:mb-2">
            <span class="inline-flex items-center px-1.5 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-100 text-emerald-800">
              Mükerrer Tespit
            </span>
            <span class="text-[10px] sm:text-xs text-gray-400">#${globalIndex}</span>
          </div>
          <h3 class="text-base sm:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1 leading-tight group-hover:text-emerald-600 transition-colors">
            A: ${record.ilad || '-'} / ${record.ilcead || '-'}
          </h3>
          <p class="text-[11px] sm:text-sm font-medium text-gray-500 mb-1">A: ${record.mahallead || '-'}</p>
          <h3 class="text-base sm:text-lg font-bold text-gray-900 mb-0.5 sm:mb-1 leading-tight group-hover:text-emerald-600 transition-colors">
            B: ${record.orman_b_ilad || '-'} / ${record.orman_b_ilcead || '-'}
          </h3>
          <p class="text-[11px] sm:text-sm font-medium text-gray-500 mb-2 sm:mb-4">B: ${record.orman_b_mahallead || '-'}</p>
          
          <div class="grid grid-cols-2 gap-2 sm:gap-4 text-[11px] sm:text-sm mt-auto">
            <div class="bg-blue-50/90 p-2 sm:p-3 rounded-lg border border-blue-100/50">
              <p class="text-[9px] sm:text-xs text-blue-600 font-semibold mb-0.5 sm:mb-1 uppercase tracking-wider">Orman A</p>
              <p class="text-gray-800 font-bold">Ada/Parsel: ${record.parsel_a_adano || '-'}/${record.parsel_a_parselno || '-'}</p>
              <p class="text-gray-800">Alan: ${record.parsel_a_tapualan || '-'} m²</p>
              <p class="text-gray-800">Zemin Ref: ${record.orman_a_tapuzeminref || '-'}</p>
              <p class="text-gray-800 mt-1 text-[10px] line-clamp-2" title="${record.orman_a_tapucinsaciklama || '-'}">${record.orman_a_tapucinsaciklama || '-'}</p>
            </div>
            <div class="bg-emerald-50/90 p-2 sm:p-3 rounded-lg border border-emerald-100/50">
              <p class="text-[9px] sm:text-xs text-emerald-600 font-semibold mb-0.5 sm:mb-1 uppercase tracking-wider">Orman B</p>
              <p class="text-gray-800 font-bold">Ada/Parsel: ${record.parsel_b_adano || '-'}/${record.parsel_b_parselno || '-'}</p>
              <p class="text-gray-800">Alan: ${record.parsel_b_tapualan || '-'} m²</p>
              <p class="text-gray-800">Zemin Ref: ${record.orman_b_tapuzeminref || '-'}</p>
              <p class="text-gray-800 mt-1 text-[10px] line-clamp-2" title="${record.orman_b_tapucinsaciklama || '-'}">${record.orman_b_tapucinsaciklama || '-'}</p>
            </div>
          </div>
        </div>
        <div class="bg-white/90 px-3 sm:px-5 py-2 sm:py-3 border-t border-white/50 flex items-center justify-between">
           <span class="text-[10px] sm:text-xs font-semibold text-gray-500">Kesişim Alanı:</span>
           <span class="text-xs sm:text-sm font-bold text-red-600">${parseFloat(record.kesisim_alani_m2 || 0).toFixed(2)} m²</span>
        </div>
      `;
    } else {
      // Liste (Yatay) Görünümü
      card.innerHTML = `
        <div class="p-3 sm:p-4 flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          
          <div class="flex-1 flex flex-col sm:block">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="text-xs text-gray-400 font-medium">#${globalIndex}</span>
              <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 leading-none">Mükerrer</span>
            </div>
            <h3 class="text-sm sm:text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors leading-tight mb-1">
              <span class="text-blue-600">A:</span> ${record.ilad || '-'} / ${record.ilcead || '-'} - <span class="text-xs text-gray-500">${record.mahallead || '-'}</span>
            </h3>
            <h3 class="text-sm sm:text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors leading-tight">
              <span class="text-emerald-600">B:</span> ${record.orman_b_ilad || '-'} / ${record.orman_b_ilcead || '-'} - <span class="text-xs text-gray-500">${record.orman_b_mahallead || '-'}</span>
            </h3>
            
            <div class="flex flex-row items-center justify-between sm:justify-start gap-2 mt-1 sm:mt-1">
               <p class="text-xs text-gray-500 hidden"></p>
               
               <!-- Mobilde (sm:hidden) Orman A ve B'yi ince badge olarak aynı satırda göster -->
               <div class="flex items-center gap-1.5 text-[9px] sm:hidden">
                 <span class="text-blue-700 bg-blue-50/80 px-1 py-0.5 rounded border border-blue-100">
                   <span class="font-bold">A:</span> ${record.parsel_a_adano || '-'}/${record.parsel_a_parselno || '-'}
                 </span>
                 <span class="text-emerald-700 bg-emerald-50/80 px-1 py-0.5 rounded border border-emerald-100">
                   <span class="font-bold">B:</span> ${record.parsel_b_adano || '-'}/${record.parsel_b_parselno || '-'}
                 </span>
               </div>
            </div>
          </div>
          
          <!-- Masaüstünde (hidden sm:flex) Orman A ve B Kutuları -->
          <div class="hidden sm:flex gap-2 text-sm w-[60%]">
            <div class="bg-blue-50/90 px-3 py-1.5 rounded-lg border border-blue-100/50 flex-1 min-w-30">
              <p class="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Orman A</p>
              <p class="text-gray-800 font-bold text-xs">${record.parsel_a_adano || '-'}/${record.parsel_a_parselno || '-'}</p>
              <p class="text-gray-800 text-[10px]">Alan: ${record.parsel_a_tapualan || '-'} m² | Zemin Ref: ${record.orman_a_tapuzeminref || '-'}</p>
              <p class="text-gray-800 text-[10px] truncate max-w-[180px]" title="${record.orman_a_tapucinsaciklama || '-'}">${record.orman_a_tapucinsaciklama || '-'}</p>
            </div>
            <div class="bg-emerald-50/90 px-3 py-1.5 rounded-lg border border-emerald-100/50 flex-1 min-w-30">
              <p class="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Orman B</p>
              <p class="text-gray-800 font-bold text-xs">${record.parsel_b_adano || '-'}/${record.parsel_b_parselno || '-'}</p>
              <p class="text-gray-800 text-[10px]">Alan: ${record.parsel_b_tapualan || '-'} m² | Zemin Ref: ${record.orman_b_tapuzeminref || '-'}</p>
              <p class="text-gray-800 text-[10px] truncate max-w-[180px]" title="${record.orman_b_tapucinsaciklama || '-'}">${record.orman_b_tapucinsaciklama || '-'}</p>
            </div>
          </div>
          
        </div>
        
        <div class="bg-white/90 sm:bg-transparent px-3 py-2 sm:px-4 sm:py-0 border-t sm:border-t-0 sm:border-l border-gray-200/60 flex flex-row sm:flex-col items-center sm:justify-center justify-between sm:min-w-30">
           <span class="text-[10px] font-semibold text-gray-500 uppercase sm:mb-1">Kesişim</span>
           <span class="text-xs sm:text-sm font-bold text-red-600">${parseFloat(record.kesisim_alani_m2 || 0).toFixed(2)} m²</span>
        </div>
      `;
    }

    // Click event
    card.addEventListener('click', () => {
      openMap(record);
    });

    listContainer.appendChild(card);
  });
}

// Sinematik Adım Güncelleyici
function setStepActive(stepId) {
  const el = document.getElementById(stepId);
  if (el) {
    el.classList.remove('text-gray-400');
    el.classList.add('text-emerald-400');
    const svg = el.querySelector('svg');
    if (svg) {
      svg.outerHTML = `<svg class="w-5 h-5 mr-3 flex-shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
    }
  }
}

// Global Ziyaretçi Sayacı
async function updateVisitorCount() {
  try {
    const res = await fetch('https://countapi.mileshilliard.com/api/v1/hit/cbstkgm-ormanlar3-app');
    const data = await res.json();
    const countEl = document.getElementById('visitor-count');
    if (countEl) countEl.textContent = data.value.toLocaleString();
  } catch(e) {
    const countEl = document.getElementById('visitor-count');
    if (countEl) countEl.textContent = '...';
  }
}

// İlerleme Çubuğu Güncelleyici
function updateProgress(stepId, percent) {
  const bar = document.getElementById(`prog-bar-${stepId}`);
  const txt = document.getElementById(`prog-txt-${stepId}`);
  if (bar && txt) {
    if (percent > 0) {
      txt.classList.remove('opacity-0');
      if (stepId === 'parse') bar.classList.remove('opacity-0');
    }
    if (percent > 100) percent = 100;
    bar.style.width = `${percent}%`;
    txt.textContent = `${Math.round(percent)}%`;
  }
}

// CSV Verisini Seçilen İle Göre Fetch Etme
async function loadData(ilAdi) {
  try {
    recordCount.textContent = 'Veri hazırlanıyor...';
    const statusText = document.getElementById('loading-status');
    const parseBar = document.getElementById('prog-bar-parse');
    const loadingSteps = document.getElementById('loading-steps');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    // UI Ayarları
    loading.classList.remove('hidden', 'opacity-0');
    loadingSteps.classList.remove('hidden');
    loadingSpinner.classList.remove('hidden');
    
    // Yükleme arayüzü reset
    updateProgress('download', 0);
    updateProgress('unzip', 0);
    updateProgress('parse', 0);

    allData = [];
    let parsedCount = 0;
    
    setStepActive('step-download');
    statusText.textContent = `${ilAdi} verisi indiriliyor ve işleniyor...`;

    const url = new URL(`iller/${ilAdi}.csv`, window.location.href).href;

    await new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        worker: false, // Mobil kilitlenmeleri önlemek için false
        delimiter: ';',
        skipEmptyLines: true,
        transformHeader: function(h) {
          const map = {
            'orman_a_ilad': 'ilad',
            'orman_a_ilcead': 'ilcead',
            'orman_a_mahallead': 'mahallead',
            'orman_a_adano': 'parsel_a_adano',
            'orman_b_adano': 'parsel_b_adano',
            'orman_a_parselno': 'parsel_a_parselno',
            'orman_b_parselno': 'parsel_b_parselno',
            'orman_a_geom': 'parsel_a_geom',
            'orman_b_geom': 'parsel_b_geom',
            'orman_a_tapualan': 'parsel_a_tapualan',
            'orman_b_tapualan': 'parsel_b_tapualan'
          };
          return map[h] || h;
        },
        chunk: function (results, parser) {
          parser.pause();
          allData.push(...results.data);
          parsedCount += results.data.length;
          
          // Ortalama bir dosya büyüklüğüne göre temsili yüzde
          let progress = Math.min(99, (parsedCount / 50000) * 100);
          updateProgress('download', progress);
          updateProgress('parse', progress);
          
          setTimeout(() => { parser.resume(); }, 20); // Garbage Collector nefes alsın
        },
        complete: function() {
          resolve();
        },
        error: function(err) {
          reject(err);
        }
      });
    });
       
    updateProgress('download', 100);
    updateProgress('parse', 100);
    
    // 2. Adım (Çıkartma) pas geçildiği için görsel olarak %100 yapıyoruz
    setStepActive('step-unzip');
    updateProgress('unzip', 100);
    
    updateProgress('parse', 100);
    setStepActive('step-parse');
    statusText.textContent = 'Harita hazırlandı!';
    if (parseBar) parseBar.classList.remove('animate-pulse');
    
    // Verileri İl ve İlçeye göre (A'dan Z'ye) Türkçe karakter uyumlu sırala
    allData.sort((a, b) => {
      const ilA = a.ilad || '';
      const ilB = b.ilad || '';
      const ilFarki = ilA.localeCompare(ilB, 'tr-TR');
      if (ilFarki !== 0) return ilFarki;
      
      const ilceA = a.ilcead || '';
      const ilceB = b.ilcead || '';
      return ilceA.localeCompare(ilceB, 'tr-TR');
    });

    // Filtre Panelindeki Verileri Başlangıç İçin Doldur
    filterIlce.innerHTML = '';
    filterMahalle.innerHTML = '';
    filterAda.innerHTML = '';
    filterParsel.innerHTML = '';
    filterTapuCins.innerHTML = '';

    let ilceler = new Set();
    let mahalleler = new Set();
    let adalar = new Set();
    let parseller = new Set();
    let cinsler = new Set();
    
    allData.forEach(r => {
      if(r.ilcead) ilceler.add(r.ilcead);
      if(r.mahallead) mahalleler.add(r.mahallead);
      if(r.parsel_a_adano) adalar.add(String(r.parsel_a_adano).trim());
      if(r.parsel_b_adano) adalar.add(String(r.parsel_b_adano).trim());
      if(r.parsel_a_parselno) parseller.add(String(r.parsel_a_parselno).trim());
      if(r.parsel_b_parselno) parseller.add(String(r.parsel_b_parselno).trim());
      if(r.orman_a_tapucinsaciklama) cinsler.add(String(r.orman_a_tapucinsaciklama).trim());
      if(r.orman_b_tapucinsaciklama) cinsler.add(String(r.orman_b_tapucinsaciklama).trim());
    });
    
    const fillSelect = (selectEl, dataSet, sortNum = false) => {
      const arr = Array.from(dataSet).filter(val => val !== '');
      if(sortNum) {
         arr.sort((a,b) => {
           const numA = parseFloat(a);
           const numB = parseFloat(b);
           if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
           return a.localeCompare(b, 'tr-TR');
         });
      } else {
         arr.sort((a,b) => a.localeCompare(b, 'tr-TR'));
      }
      arr.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        selectEl.appendChild(opt);
      });
    };

    fillSelect(filterIlce, ilceler);
    fillSelect(filterMahalle, mahalleler);
    fillSelect(filterAda, adalar, true);
    fillSelect(filterParsel, parseller, true);
    fillSelect(filterTapuCins, cinsler);
    
    // Filtre Formunu Temizle (Yeni il seçilmişse)
    filterKesisimOp.value = '';
    filterKesisimVal.value = '';
    searchInput.value = '';
    updateFilterBadge();

    // Fazladan kopyalama yapmamak için referans aktarımı
    filteredData = allData;
    searchInput.disabled = false;
    if(openFilterBtn) openFilterBtn.disabled = false;
    renderList();
    
    // Yükleme ekranını gizle (Sinematik Fade Out)
    setTimeout(() => {
       loading.classList.add('opacity-0');
       setTimeout(() => { loading.classList.add('hidden'); }, 700);
    }, 800);

  } catch (err) {
    console.error("CSV Yükleme Hatası:", err);
    const statusText = document.getElementById('loading-status');
    if (statusText) {
       statusText.textContent = `Hata: ${err.message}`;
       statusText.classList.add('text-red-400');
    }
    recordCount.textContent = 'Hata!';
  }
}

// İl Listesi
const iller = ["ADANA","ADIYAMAN","AFYONKARAHİSAR","AKSARAY","AMASYA","ANKARA","ANTALYA","ARDAHAN","ARTVİN","AYDIN","AĞRI","BALIKESİR","BARTIN","BATMAN","BAYBURT","BOLU","BURDUR","BURSA","BİLECİK","BİNGÖL","BİTLİS","DENİZLİ","DÜZCE","DİYARBAKIR","EDİRNE","ELAZIĞ","ERZURUM","ERZİNCAN","ESKİŞEHİR","GAZİANTEP","GÜMÜŞHANE","GİRESUN","HAKKARİ","HATAY","ISPARTA","KAHRAMANMARAŞ","KARABÜK","KARAMAN","KARS","KASTAMONU","KAYSERİ","KIRIKKALE","KIRKLARELİ","KIRŞEHİR","KOCAELİ","KONYA","KÜTAHYA","KİLİS","MALATYA","MANİSA","MARDİN","MERSİN","MUĞLA","MUŞ","NEVŞEHİR","NİĞDE","ORDU","OSMANİYE","RİZE","SAKARYA","SAMSUN","SİNOP","SİVAS","SİİRT","TEKİRDAĞ","TOKAT","TRABZON","TUNCELİ","UŞAK","VAN","YALOVA","YOZGAT","ZONGULDAK","ÇANAKKALE","ÇANKIRI","ÇORUM","İSTANBUL","İZMİR","ŞIRNAK"];

// Uygulama Başlatma
document.addEventListener('DOMContentLoaded', () => {
  if (itemsPerPageSelect) {
    itemsPerPageSelect.value = itemsPerPage.toString();
  }
  
  updateViewToggleUI();
  updateVisitorCount();
  
  // İl seçiciyi doldur
  const citySelect = document.getElementById('header-city-select');
  
  if (citySelect) {
      const siraliIller = iller.sort((a, b) => a.localeCompare(b, 'tr-TR'));
      siraliIller.forEach(il => {
          const option = document.createElement('option');
          option.value = il;
          option.textContent = il;
          citySelect.appendChild(option);
      });
      
      citySelect.addEventListener('change', () => {
          const seciliIl = citySelect.value;
          if (seciliIl) {
              loadData(seciliIl);
          }
      });
  }
});
