# Poca - AI Tourism Companion for Indonesia
**Dokumen Arsitektur & Spesifikasi Sistem**

Dokumen ini disusun untuk menjelaskan secara komprehensif mengenai arsitektur, aliran data (*flow*), dan komponen-komponen utama dari sistem **Poca**, sebuah asisten pariwisata cerdas berbasis *Artificial Intelligence* (AI) untuk mengeksplorasi destinasi di Indonesia.

---

## 1. Ikhtisar Sistem (System Overview)
Poca adalah aplikasi *web* interaktif yang memadukan informasi pariwisata Indonesia, rekomendasi cerdas AI, komunitas pelancong (Community Feed), dan gamifikasi. 

Poca menyelesaikan masalah kebingungan wisatawan dalam menyusun rencana perjalanan (*itinerary*) dengan menggunakan pendekatan **Tiered AI Conversational Flow** — asisten AI yang tidak hanya menjawab pasif, tetapi dapat proaktif mewawancarai (*prompting*) pengguna untuk mendapatkan preferensi liburan mereka (seperti budget, durasi, dan minat) secara organik layaknya mengobrol dengan pemandu wisata asli.

---

## 2. Tech Stack & Infrastruktur
Poca menggunakan arsitektur *Client-Server* modern (Frontend-Backend terpisah) yang sepenuhnya *Asynchronous* (non-blocking) untuk memastikan latensi minimal.

### **A. Backend**
- **Bahasa & Framework:** Python 3.12 + FastAPI
- **Database Relasional:** PostgreSQL 16 (diakses menggunakan SQLAlchemy 2.x ORM dengan *driver* `asyncpg`)
- **Caching & Rate Limiting:** Redis 7 (diakses menggunakan `redis-py` async)
- **AI Integrasi:** LiteLLM (Mendukung berbagai *provider* LLM seperti Groq, OpenAI, atau Gemini)
- **Validasi Data:** Pydantic (untuk request/response schemas)
- **Migrasi Database:** Alembic

### **B. Frontend**
- **Framework Utama:** Next.js 14 (App Router) dengan React
- **Bahasa:** TypeScript
- **Styling:** TailwindCSS (Vanilla)
- **State Management:** Zustand (Global State) + React Query (Data Fetching & Server State Caching)
- **Komponen Spesifik:** `leaflet` & `react-leaflet` (untuk *Interactive Maps*)

### **C. Deployment & DevOps**
- **Containerization:** Docker & Docker Compose
- **Platform:** Coolify (Mendukung CI/CD otomatis)

---

## 3. Komponen & Modul Utama Sistem

1. **Modul AI (Conversational AI & Trip Planner)**
   Modul ini adalah otak utama Poca. Mampu menerima *chat* pengguna, mendeteksi niat (*intent*), dan menyusun *itinerary* dinamis. Disertai manajemen riwayat percakapan (*Context-Aware*).
2. **Modul Destinasi & Review (Places & UGC)**
   Katalog destinasi wisata yang diperkaya secara otomatis. Pengguna dapat memberikan *rating* dan *review*.
3. **Modul Community Feed**
   Mirip dengan media sosial mini, pengguna dapat membuat *post*, membagikan foto perjalanan, serta memberikan *like* dan *comment*.
4. **Modul Peta Interaktif (Interactive Maps)**
   Mengekstrak kordinat destinasi dari AI atau *database* dan memvisualisasikannya di atas peta interaktif.
5. **Modul Gamifikasi (Gamification)**
   Meningkatkan retensi pengguna melalui *User Points*, *Leveling*, *Badges* (seperti "Explorer", "Reviewer"), dan *Leaderboard*.

---

## 4. Alur Kerja Cerdas AI (The AI "Tiered" Flow)
Salah satu inovasi terbesar pada Poca adalah arsitektur **Tiered AI**. Sistem tidak langsung "membuang" *query* pengguna ke LLM berbayar (yang memakan waktu dan biaya), melainkan disaring melalui *State Machine* lokal terlebih dahulu.

**Berikut adalah *Flow* ketika pengguna meminta AI membuatkan rencana (misal: "Buatkan rencana liburan santai ke Bali"):**

1. **Step 1: NLP Intent Classification (Tier 0 - Local Heuristics)**
   - Input: `"Buatkan rencana liburan santai ke Bali"`
   - `IntentClassifier` berbasis Regex/NLP Python yang sangat ringan membedah input tersebut.
   - **Hasil:** AI mendeteksi Intent = `PLAN_CREATE` (berkat kata "Buatkan rencana") dan Location = `"Bali"`.

2. **Step 2: Conversation State Machine (Manajemen Slot Kosong)**
   - Sistem Poca menyadari bahwa untuk membuat *plan* yang akurat, sistem membutuhkan `num_days` (jumlah hari) dan `budget` (anggaran), namun data tersebut belum ada.
   - `StateManager` merubah status percakapan pengguna menjadi `AWAITING_DAYS`.
   - **Hasil:** Backend langsung membalas (*return*) seketika: *"Tentu! Berapa hari kamu mau liburan di Bali?"*. **(Proses Step 1 & 2 tidak memakai 1 token LLM pun, menghasilkan respons 0 ms latency!)**

3. **Step 3: Pengumpulan Konteks Lanjutan**
   - Pengguna membalas: *"3 hari aja"*.
   - `StateManager` menyimpan `num_days = 3`, lalu mengubah status menjadi `AWAITING_BUDGET` dan bertanya: *"Berapa budget untuk liburan ini?"*.
   - Pengguna membalas: *"3 juta"*.
   - `StateManager` mem- *parsing* angka tersebut menjadi `3000000`.

4. **Step 4: LLM Generation (Tier 1 - LiteLLM)**
   - Karena slot kriteria sudah lengkap (Lokasi: Bali, Hari: 3, Budget: 3jt), `AIConversationService` mengumpulkan seluruh *context* ini dan merakit *prompt* terstruktur.
   - *Prompt* dilempar ke LLM (lewat LiteLLM) untuk di-*generate*.

5. **Step 5: JSON Output & Rendering UI**
   - AI mengembalikan JSON terstruktur (Hari 1, Hari 2, Estimasi Biaya, dll).
   - Backend memvalidasi JSON tersebut dan menyimpannya ke tabel `trips` di PostgreSQL.
   - Frontend merender hasil tersebut dalam bentuk *UI Card* interaktif, di mana pengguna bisa mengklik peta, membaca aktivitas harian, dsb.

---

## 5. Keamanan & Standar Kualitas (Quality Assurance)

Untuk memastikan sistem layak skala produksi (Production-Ready), Poca menerapkan beberapa standar ketat:
- **Zero Hardcoded Secrets:** Seluruh API Key (LLM, JWT, DB Password) dipasok murni melalui *Environment Variables* (.env).
- **Type-Safety End-to-End:** 
  - FastAPI dijaga ketat oleh *schema* Pydantic (Validasi Request & Response Otomatis).
  - Next.js sepenuhnya menggunakan *interfaces/types* dari TypeScript tanpa tipe `any`.
- **Security Middleware:** 
  - CORS Middleware terkonfigurasi spesifik (bukan wildcard `*`).
  - SecurityHeaders Middleware disertakan di Backend untuk mencegah serangan *Cross-Site Scripting* (XSS) dan *Clickjacking*.
  - Pembersihan (*Sanitization*) HTML dilakukan untuk UGC (*User Generated Content*) pada Feed & Review.
- **Optimasi Database (N+1 Problem Avoidance):** SQLAlchemy ORM memanfaatkan `selectinload` dan `joinedload` untuk menghindari iterasi SQL yang masif saat *fetching* relasi.
- **Non-blocking Architecture:** Penggunaan *async/await* (dari Uvicorn, FastAPI, hingga `asyncpg`) memungkinkan server menangani ribuan koneksi konkuren (*concurrent connections*) menggunakan satu *event loop*.
