import './style.css';
import Papa from 'papaparse';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import Wkt from 'wicket';
import JSZip from 'jszip';
// DOM Elements
const listContainer = document.getElementById('list-container');
const loading = document.getElementById('loading');
const mapOverlay = document.getElementById('map-overlay');
const closeMapBtn = document.getElementById('close-map-btn');
const mapTitle = document.getElementById('map-title');
const recordCount = document.getElementById('record-count');
const searchInput = document.getElementById('search-input');

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
let currentViewMode = 'grid'; // 'grid' veya 'list'
let currentPage = 1;
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

// Search Events (Debounce ile)
let searchTimeout;
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  const term = e.target.value.toLowerCase().trim();
  
  searchTimeout = setTimeout(() => {
    if (!term) {
      filteredData = [...allData];
    } else {
      filteredData = allData.filter(record => {
        // Obje değerlerini string'e çevirip içinde aranan metin var mı bakıyoruz (hızlı ve basit)
        return Object.values(record).some(val => 
          val && String(val).toLowerCase().includes(term)
        );
      });
    }
    currentPage = 1;
    renderList();
  }, 250);
});

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
      const content = `<strong>Orman A</strong><br/>
                       Ada: ${record.parsel_a_adano} / Parsel: ${record.parsel_a_parselno}<br/>
                       Alan: ${record.parsel_a_tapualan || ''} m²`;
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
      const content = `<strong>Orman B</strong><br/>
                       Ada: ${record.parsel_b_adano} / Parsel: ${record.parsel_b_parselno}<br/>
                       Alan: ${record.parsel_b_tapualan || ''} m²`;
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
      const content = `<strong>Kesişim Alanı</strong><br/>
                       Kesişim: ${record.kesisim_alani_m2 || '?'} m²`;
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

  // Mevcut grid/list class'larını temizle
  listContainer.className = '';
  
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
        <div class="p-5 flex-1">
          <div class="flex justify-between items-start mb-2">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              Mükerrer Tespit
            </span>
            <span class="text-xs text-gray-400">#${globalIndex}</span>
          </div>
          <h3 class="text-lg font-bold text-gray-900 mb-1 leading-tight group-hover:text-emerald-600 transition-colors">
            ${record.ilad || '-'} / ${record.ilcead || '-'}
          </h3>
          <p class="text-sm font-medium text-gray-500 mb-4">${record.mahallead || '-'}</p>
          
          <div class="grid grid-cols-2 gap-4 text-sm mt-auto">
            <div class="bg-blue-50/90 p-3 rounded-lg border border-blue-100/50">
              <p class="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wider">Orman A</p>
              <p class="text-gray-800 font-bold">Ada: ${record.parsel_a_adano || '-'}</p>
              <p class="text-gray-800">Parsel: ${record.parsel_a_parselno || '-'}</p>
            </div>
            <div class="bg-emerald-50/90 p-3 rounded-lg border border-emerald-100/50">
              <p class="text-xs text-emerald-600 font-semibold mb-1 uppercase tracking-wider">Orman B</p>
              <p class="text-gray-800 font-bold">Ada: ${record.parsel_b_adano || '-'}</p>
              <p class="text-gray-800">Parsel: ${record.parsel_b_parselno || '-'}</p>
            </div>
          </div>
        </div>
        <div class="bg-white/90 px-5 py-3 border-t border-white/50 flex items-center justify-between">
           <span class="text-xs font-semibold text-gray-500">Kesişim Alanı:</span>
           <span class="text-sm font-bold text-red-600">${parseFloat(record.kesisim_alani_m2 || 0).toFixed(2)} m²</span>
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
            <h3 class="text-sm sm:text-base font-bold text-gray-900 group-hover:text-emerald-600 transition-colors leading-tight">
              ${record.ilad || '-'} / ${record.ilcead || '-'}
            </h3>
            <p class="text-xs text-gray-500">${record.mahallead || '-'}</p>
            
            <!-- Mobilde (sm:hidden) Orman A ve B'yi ince badge olarak göster -->
            <div class="flex items-center gap-2 text-[10px] sm:hidden mt-2">
               <span class="text-blue-700 bg-blue-50/80 px-1.5 py-1 rounded border border-blue-100">
                 <span class="font-bold">A:</span> ${record.parsel_a_adano || '-'}/${record.parsel_a_parselno || '-'}
               </span>
               <span class="text-emerald-700 bg-emerald-50/80 px-1.5 py-1 rounded border border-emerald-100">
                 <span class="font-bold">B:</span> ${record.parsel_b_adano || '-'}/${record.parsel_b_parselno || '-'}
               </span>
            </div>
          </div>
          
          <!-- Masaüstünde (hidden sm:flex) Orman A ve B Kutuları -->
          <div class="hidden sm:flex gap-2 text-sm w-1/2">
            <div class="bg-blue-50/90 px-3 py-1.5 rounded-lg border border-blue-100/50 flex-1 min-w-30">
              <p class="text-[10px] text-blue-600 font-semibold uppercase tracking-wider">Orman A</p>
              <p class="text-gray-800 font-bold text-xs">${record.parsel_a_adano || '-'}/${record.parsel_a_parselno || '-'}</p>
            </div>
            <div class="bg-emerald-50/90 px-3 py-1.5 rounded-lg border border-emerald-100/50 flex-1 min-w-30">
              <p class="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider">Orman B</p>
              <p class="text-gray-800 font-bold text-xs">${record.parsel_b_adano || '-'}/${record.parsel_b_parselno || '-'}</p>
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
    const res = await fetch('https://api.counterapi.dev/v1/cbstkgm/ormanlar3/up');
    const data = await res.json();
    const countEl = document.getElementById('visitor-count');
    if (countEl) countEl.textContent = data.count.toLocaleString();
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

// CSV Verisini ZIP içerisinden Fetch Etme (Cache Destekli)
async function loadData() {
  try {
    recordCount.textContent = 'Veri hazırlanıyor...';
    const statusText = document.getElementById('loading-status');
    
    // 1. ZIP dosyasını indir (Cache Kontrolü)
    const zipUrl = new URL('MukerrerOrmanlar.csv.zip', window.location.href).href;
    const cacheName = 'ormanlar-cache-v1';
    
    statusText.textContent = 'Ağdan veya önbellekten indiriliyor (141 MB)...';
    
    let arrayBuffer;
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(zipUrl);
    
    if (cachedResponse) {
       updateProgress('download', 100);
       setStepActive('step-download');
       statusText.textContent = 'Önbellekten (Cache) anında yüklendi!';
       arrayBuffer = await cachedResponse.arrayBuffer();
    } else {
       const response = await fetch(zipUrl);
       if (!response.ok) throw new Error(`Ağ hatası: ${response.status}`);
       
       const contentLength = response.headers.get('content-length');
       const total = contentLength ? parseInt(contentLength, 10) : 148473000;
       
       const reader = response.body.getReader();
       let received = 0;
       const chunks = [];
       
       while(true) {
         const {done, value} = await reader.read();
         if (done) break;
         chunks.push(value);
         received += value.length;
         updateProgress('download', (received / total) * 100);
       }
       
       let chunksAll = new Uint8Array(received);
       let position = 0;
       for(let chunk of chunks) {
         chunksAll.set(chunk, position);
         position += chunk.length;
       }
       arrayBuffer = chunksAll.buffer;
       
       // Cache'e kopyala
       const cacheResponse = new Response(arrayBuffer, { headers: response.headers });
       await cache.put(zipUrl, cacheResponse);
       
       setStepActive('step-download');
       statusText.textContent = 'Dosya başarıyla indirildi ve diske kaydedildi.';
    }
    
    statusText.textContent = 'Veri bilgisayarınıza çıkarılıyor (Unzip)...';
    
    // 2. JSZip ile bellekte aç
    const zip = await JSZip.loadAsync(arrayBuffer);
    const csvFilename = Object.keys(zip.files).find(name => name.endsWith('.csv'));
    if (!csvFilename) throw new Error('ZIP içinde .csv bulunamadı!');
    
    const csvFile = zip.files[csvFilename];
    
    // Progress göstergeli ZIP çıkarma ve String belleği yerine BLOB kullanımı!
    const csvBlob = await csvFile.async('blob', function updateCallback(metadata) {
        updateProgress('unzip', metadata.percent);
    });
    
    setStepActive('step-unzip');
    statusText.textContent = 'Veriler haritaya dökülüyor (Parse)...';
    updateProgress('parse', 10);
    const parseBar = document.getElementById('prog-bar-parse');
    if (parseBar) parseBar.classList.add('animate-pulse');
    
    // 3. PapaParse ile BLOB'u parse et (String olmadığı için TypeError vermez)
    Papa.parse(csvBlob, {
      header: true,
      worker: true,
      delimiter: ';',
      skipEmptyLines: true,
      complete: function (results) {
        updateProgress('parse', 100);
        setStepActive('step-parse');
        statusText.textContent = 'Harita hazırlandı!';
        if (parseBar) parseBar.classList.remove('animate-pulse');
        
        allData = results.data;
        allData.sort((a, b) => {
          const ilA = (a.ilad || '').trim();
          const ilB = (b.ilad || '').trim();
          const ilCompare = ilA.localeCompare(ilB, 'tr');
          if (ilCompare !== 0) return ilCompare;
          const ilceA = (a.ilcead || '').trim();
          const ilceB = (b.ilcead || '').trim();
          return ilceA.localeCompare(ilceB, 'tr');
        });

        filteredData = [...allData];
        searchInput.disabled = false;
        renderList();
        
        // Yükleme ekranını gizle (Sinematik Fade Out)
        setTimeout(() => {
           loading.classList.add('opacity-0');
           setTimeout(() => { loading.classList.add('hidden'); }, 700);
        }, 800);
      },
      error: function (error) {
        console.error("CSV Ayrıştırma Hatası:", error);
        statusText.textContent = 'Veriler ayrıştırılırken hata oluştu!';
        statusText.classList.add('text-red-400');
        recordCount.textContent = 'Hata!';
      }
    });

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

// Uygulama Başlatma
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  updateVisitorCount();
});
