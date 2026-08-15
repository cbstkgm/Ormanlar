import re

with open("main.js", "r") as f:
    content = f.read()

# Eski loadData fonksiyonunu bulup yerine yenisini ve başlatıcı event'ı ekleyelim.
new_logic = """// CSV Verisini Seçilen İle Göre Fetch Etme
async function loadData(ilAdi) {
  try {
    recordCount.textContent = 'Veri hazırlanıyor...';
    const statusText = document.getElementById('loading-status');
    const parseBar = document.getElementById('prog-bar-parse');
    const loadingSteps = document.getElementById('loading-steps');
    const loadingSpinner = document.getElementById('loading-spinner');
    
    // UI Ayarları
    document.getElementById('city-selector-container').classList.add('hidden');
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

    // Fazladan kopyalama yapmamak için referans aktarımı
    filteredData = allData;
    searchInput.disabled = false;
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
  const citySelect = document.getElementById('city-select');
  const startBtn = document.getElementById('start-btn');
  
  if (citySelect && startBtn) {
      iller.forEach(il => {
          const option = document.createElement('option');
          option.value = il;
          option.textContent = il;
          citySelect.appendChild(option);
      });
      
      citySelect.addEventListener('change', () => {
          if (citySelect.value) {
              startBtn.disabled = false;
          }
      });
      
      startBtn.addEventListener('click', () => {
          const seciliIl = citySelect.value;
          if (seciliIl) {
              startBtn.disabled = true;
              startBtn.textContent = 'Yükleniyor...';
              loadData(seciliIl);
          }
      });
  }
});
"""

# replace: // CSV Verisini Parçalı (Chunked) Olarak Fetch Etme... den dosya sonuna kadar
new_content = re.sub(r'// CSV Verisini Parçalı \(Chunked\) Olarak Fetch Etme\nasync function loadData\(\) \{.*', new_logic, content, flags=re.DOTALL)

with open("main.js", "w") as f:
    f.write(new_content)

