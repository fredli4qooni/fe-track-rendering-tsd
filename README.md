# fe-track-rendering-tsd

> **Tactical Situation Display (TSD) Track Rendering & Management Platform**  
> _Take-Home Test Submission — Software Developer (PT Len Innovation Technology)_

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x_Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![MapTalks](https://img.shields.io/badge/MapTalks-1.6.1-green.svg)](https://maptalks.com/)
[![WebGL2](https://img.shields.io/badge/WebGL-2.0_Instanced-red.svg)](https://registry.khronos.org/webgl/specs/latest/2.0/)
[![Bundler](https://img.shields.io/badge/Bundler-Rspack-purple.svg)](https://rspack.rs/)
[![State](https://img.shields.io/badge/State-Zustand-orange.svg)](https://github.com/pmndrs/zustand)
[![Styling](https://img.shields.io/badge/Styling-TailwindCSS-38B2AC.svg)](https://tailwindcss.com/)

Platform **Tactical Situation Display (TSD)** berbasis maritim untuk menampilkan, memanipulasi, dan mengelola entitas taktis (_tracks_) secara real-time. Aplikasi ini memanfaatkan **Custom WebGL2 Hardware Instancing**, **2D Texture Arrays**, **GPU DataTexture Sharing**, dan multi-threaded **Web Workers** untuk merender dan menggerakkan lebih dari **10.000 entitas aktif secara mulus pada 60 FPS**.

---

## 📋 Ringkasan Pemenuhan Kebutuhan Fungsional (Task Compliance)

Aplikasi ini memenuhi seluruh kebutuhan fungsional berikut:

| No    | Kebutuhan Fungsional             | Implementasi Teknis & Lokasi Kode                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| :---- | :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **1** | **Menampilkan Entity pada Peta** | • Render via **WebGL2 Hardware Instancing** (`gl.drawArraysInstanced`).<br>• Menampilkan hingga **10.000+ entitas taktis maritim** pada 60 FPS.<br>• Simbologi maritim taktis (6 varian icon di `src/assets/icons/`).<br>• Multi-line BMFont label text per entitas (Callsign, Vessel Class, Type).<br>• Vektor arah haluan (_course line_) & jejak rekam historis (_breadcrumb polylines_).<br>• File: `src/components/map-canvas/hooks/MaptalksLayer.ts` & `HistoryLayer.ts`. |
| **2** | **Menambahkan Entity**           | • **Batch Spawner**: Toolbar interaktif untuk spawn acak 50, 100, 500, 1.000, 2.000, 5.000, hingga 10.000 entitas.<br>• **Quick Add**: Tombol penambahan cepat `+ 1 Track` di sekitar posisi OwnShip.<br>• File: `src/components/tactical-toolbar/TacticalToolbar.tsx` & `src/utils/trackGenerator.ts`.                                                                                                                                                                         |
| **3** | **Memperbarui (Edit) Entity**    | • Klik entitas pada peta ➜ Buka Tactical Drawer (`EntityDetailPanel.tsx`).<br>• Penggantian klasifikasi taktis (_Hostile, Friendly, Neutral, Unknown_) instan via dropdown.<br>• Tombol **Edit Entity** ➜ Modal form (`EditEntityModal.tsx`) untuk memperbarui Nama/Callsign, Lat, Lon, Course, dan Speed.<br>• Pembaruan langsung tercermin pada WebGL texture & label bitmap tanpa refresh halaman.                                                                           |
| **4** | **Menghapus (Delete) Entity**    | • **Hapus Satuan**: Tombol _Hapus_ di panel detail disertai dialog konfirmasi protektif (`DeleteConfirmDialog.tsx`).<br>• **Clear All**: Tombol hapus massal di toolbar untuk membersihkan semua entitas dan riwayat WebGL secara instan.                                                                                                                                                                                                                                       |
| **5** | **Melihat Detail Entity**        | • Panel Tactical Drawer menampilkan: Preview Icon, Status Badge (_Hostile/Friendly/Neutral_), Callsign lengkap, Koordinat akurat (Lat/Lon) dengan tombol _Salin_ & _Pusatkan ke Track_, HUD Kompas Haluan berputar, dan Indikator Kecepatan (_knots_).<br>• File: `src/components/entity-panel/EntityDetailPanel.tsx`.                                                                                                                                                          |
| **6** | **Validasi Input & Data**        | • Modul validator terpusat di `src/utils/validation.ts`.<br>• Memvalidasi panjang nama entity (2–60 karakter), latitude (-90° s/d 90°), longitude (-180° s/d 180°), course (0° s/d 360°), speed (0 s/d 120 knots), dan batas spawn (50 s/d 10.000).<br>• Pesan kesalahan inline yang interaktif pada form.                                                                                                                                                                      |

---

## 🛠️ Technology Stack Rationale

Mengacu pada ketentuan arsitektur [AGENTS.md](AGENTS.md), berikut alasan pemilihan teknologi utama:

### 1. MapTalks 1.6.1 + Custom WebGL2 Instancing (vs Leaflet / OpenLayers / SVG)

- **Problem**: Solusi pemetaan tradisional berbasis DOM/SVG (seperti Leaflet Markers atau OpenLayers default) mengalami degradasi performa drastis ketika menangani > 500 objek bergerak akibat _DOM reflow_ dan _garbage collection_.
- **Solution**: MapTalks menyediakan integrasi canvas kustom tingkat rendah (`CanvasRenderer`). Kami mengimplementasikan **Hardware Instanced Rendering** (`gl.drawArraysInstanced`) yang memungkinkan 10.000+ sprite dirender hanya dalam **1 kali draw call** per frame.
- **GPU DataTexture Sharing**: Data posisi dan rotasi dibagikan ke layer icon, vektor arah haluan, dan teks label melalui shared texture GPU (`DataTexture`), meniadakan transfer data bolak-balik antara CPU dan GPU.

### 2. Multi-Threaded Web Workers (Offloading Kinematika)

- Simulasi fisika pergerakan kapal (`trackMover.worker.ts`) dan penghitungan jejak historis (`trackHistory.worker.ts`) dijalankan di **Web Worker (background thread)** terpisah.
- Main thread UI tetap 100% responsif pada 60 FPS untuk interaksi pengguna, panning, zooming, dan manipulasi drawer.

### 3. Zustand (State Management)

- **Ringan & Minimalis**: Tanpa _boilerplate_ rumit (seperti action creators atau reducers pada Redux).
- **Decoupled Architecture**: Memisahkan layer _core/vanilla store_ (`useTrackStore.ts`) dari layer komponen React, sehingga subscriber di luar React (seperti event listener WebGL dan worker synchronizer) dapat membaca dan menulis state secara direct tanpa re-render yang tidak perlu.

### 4. Rspack (Modern High-Performance Bundler)

- **Kecepatan Kompilasi**: Ditulis dengan Rust, Rspack menyediakan performa build dan HMR hingga 10x lebih cepat dibanding Webpack konvensional.
- **Kompatibilitas Webpack & Module Federation**: Kompatibel penuh dengan ekosistem Webpack dan mendukung arsitektur Micro-Frontend berbasis Module Federation untuk integrasi modul masa depan.

### 5. TypeScript Strict Mode

- Menjamin _type safety_ pada level kontrak data koordinat, entitas taktis, dan komunikasi antar worker guna mencegah runtime error (`null`/`undefined`).

### 6. Arsitektur API: REST API & Kesiapan Kontrak gRPC

- **Evaluasi Mandiri Tanpa Hambatan (Zero-Friction Review)**: Mengacu pada kebebasan perancangan API pada [`.task/task.md`](.task/task.md), backend Go pendamping (`be-explore-maptalks`) menyediakan RESTful API berbasis Go standard library `net/http` dan SQLite murni. Pendekatan ini memungkinkan tim reviewer menjalankan pengujian secara instan (`go run ./cmd/server/main.go`) tanpa perlu menyiapkan Docker container Apache APISIX Gateway atau etcd terlebih dahulu.
- **Kesiapan Produksi Enterprise (gRPC / APISIX Parity)**: Schema entitas dan validasi boundary dirancang 1:1 kompatibel dengan standar `AGENTS.md`. Kontrak Protocol Buffers lengkap disertakan pada repository backend (`proto/entity.proto`) untuk kesiapan migrasi ke gRPC server streaming saat diterapkan pada infrastruktur APISIX gateway.

---

## 🔗 Repository Backend Go Pendamping

Layanan backend pendukung untuk pengelolaan dan persistensi data entity taktis (CRUD, validasi, dan auto-seeding kontak laut) tersedia di:  
👉 **`be-explore-maptalks/`** (atau repositori backend Go terkait).

---

## 🚀 Installation & Setup (Panduan Menjalankan Program)

### Prasyarat Sistem

- **Node.js**: Versi `>= 18.x` (disarankan LTS 20.x)
- **Package Manager**: `pnpm` versi `>= 8.x` (atau `npm` / `yarn`)
- Browser modern yang mendukung **WebGL 2.0** (Google Chrome, Microsoft Edge, Mozilla Firefox)

### Langkah Instalasi

1. **Clone Repository:**

   ```bash
   git clone https://github.com/fredli4qooni/fe-track-rendering-tsd.git
   cd fe-track-rendering-tsd
   ```

2. **Konfigurasi Environment Variables:**
   Salin file `.env.example` menjadi `.env`:

   ```bash
   cp .env.example .env
   ```

   _File `.env` sudah dilengkapi dengan konfigurasi default basemap CARTO:_

   ```env
   BASEMAP_URL=https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_50pw_1_1e6a8c0e26802916fbfc5e9c
   CARTO_API_KEY=cb1_50pw_1_1e6a8c0e26802916fbfc5e9c
   ```

3. **Install Dependencies:**

   ```bash
   pnpm install
   ```

4. **Jalankan Development Server:**
   ```bash
   pnpm dev
   ```
   Aplikasi akan berjalan pada port default:  
   👉 **`http://localhost:8123`**

---

## 🧪 Testing & Quality Assurance

Proyek ini dilengkapi dengan unit test Jest dan type-checking ketat sesuai standar `AGENTS.md`:

```bash
# 1. Jalankan TypeScript Type Check
npx tsc --noEmit

# 2. Jalankan Unit Test (Jest)
pnpm test

# 3. Jalankan Linter (ESLint Flat Config)
pnpm lint

# 4. Format Kode (Prettier)
pnpm format

# 5. Build Versi Produksi
pnpm build
```

---

## 📁 Struktur Direktori Utama

```
src/
├── assets/                    # Tactical icons (Friendly, Hostile, Support, Unknown, Waypoint)
├── common/                    # Shared WebGL renderers (HistoryLineRenderer, OwnShipRenderer)
├── components/
│   ├── entity-panel/          # Tactical Inspection Drawer, Edit Entity Modal, Delete Dialog
│   ├── map-canvas/            # MapTalks canvas wrapper & WebGL2 Custom Layers (MaptalksLayer)
│   ├── map-tools/             # Tactical tools (Ruler, Range Rings, Azimuth, Graticule)
│   └── tactical-toolbar/      # Batch spawner, presets (50-10k), Quick Add, Clear All
├── hooks/
│   ├── useTrackMover.ts       # Bridge synchronizer antara Zustand store & background workers
│   └── worker/                # Web Workers: trackMover.worker.ts & trackHistory.worker.ts
├── store/                     # Zustand stores (useTrackStore, useTrackHistoryStore, useMapStore)
├── types/                     # TypeScript definitions (track.types.ts, entity.types.ts)
└── utils/                     # Validators (validation.ts), track generator, asset loader
```

---

## 🤖 Agentic AI Workflow & Developer Guide

Instruksi konvensi, aturan arsitektur, dan pedoman coding untuk AI agents dapat dibaca pada file:  
👉 **[`AGENTS.md`](AGENTS.md)**.

---

## 👤 Author & Submission

- **Nama**: Fredli Fourqoni
- **Repository**: [https://github.com/fredli4qooni/fe-track-rendering-tsd.git](https://github.com/fredli4qooni/fe-track-rendering-tsd.git)
