# Ormanlar V1 🌲

[![Canlı Demo](https://img.shields.io/badge/🚀_Canlı_Demo-Uygulamayı_Aç-064e3b?style=for-the-badge&logo=github)](https://cbstkgm.github.io/Ormanlar)

Orman verilerini interaktif bir harita ve liste görünümü üzerinde sunan, performans odaklı ve modern bir Coğrafi Bilgi Sistemleri (CBS) web uygulamasıdır.

## 🌟 Özellikler
- **İnteraktif Harita:** Leaflet.js tabanlı, pürüzsüz ve hızlı harita deneyimi.
- **CBS Araçları (Geoman):** Harita üzerinde gelişmiş ölçüm (alan, mesafe), çizim (poligon, çizgi) ve düzenleme yetenekleri.
- **Glassmorphism Tasarım:** Zümrüt (Emerald) renk tonlarına sahip, modern ve şık bir arayüz (TailwindCSS).
- **Responsive (Mobil Uyumlu):** Hem cep telefonlarında hem de masaüstü ekranlarda kusursuz çalışan esnek yapı.
- **Büyük Veri (LFS):** Gelişmiş veri okuma optimizasyonu (PapaParse) ve GitHub LFS mimarisiyle 300MB+ büyüklüğündeki mekansal veri setlerini sorunsuz yükleme.
- **Akıllı Lejant ve Katman Yönetimi:** Harita katmanlarının şık, hızlı açılır (toggle) menülerle kontrolü.

## 🛠️ Kullanılan Teknolojiler
- **Vanilla JavaScript** (Modern ES6+)
- **Vite** (Hızlı derleyici ve sunucu)
- **Tailwind CSS** (Şekillendirme ve UI)
- **Leaflet.js** (Harita motoru)
- **Leaflet Geoman** (Çizim ve Ölçüm uzantısı)
- **PapaParse** (CSV verisi ayrıştırma)
- **Wicket** (WKT Mekansal format dönüşümü)

## 🚀 Kurulum & Çalıştırma
Projeyi kendi bilgisayarınızda çalıştırmak için:

1. Depoyu klonlayın:
```bash
git clone https://github.com/cbstkgm/Ormanlar.git
```
2. Klasöre girin ve bağımlılıkları yükleyin:
```bash
cd Ormanlar
npm install
```
3. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

*(Projeyi çalıştırabilmeniz için sisteminizde Git LFS eklentisinin kurulu olması gerekmektedir).*
