# Poca — AI Tourism Companion

FastAPI backend + Next.js frontend, PostgreSQL, Redis. Asisten liburan AI: rekomendasi destinasi kontekstual, penyusun rencana perjalanan + estimasi budget, peta, feed, dan gamifikasi.

## Fitur

**Chat AI (grounded, anti-halusinasi)**
- Rekomendasi sadar lokasi: "pantai di Bali" → hanya destinasi Bali (bukan miscmatch provinsi lain).
- Constraint negatif: "wisata hijau **bukan pantai** di Bali" → kartu kategori Alam, pantai dikecualikan.
- Jawaban LLM di-ground ke daftar kartu DB — tidak mengarung tempat di luar konteks, jujur kalau data terbatas.
- Format rich: `**bold**`/`*italic*` dirender (bukan asterisk mentah).

**AI Trip Plan Generator**
- "buatkan plan 2 hari di Bali budget 2 juta buat 2 orang" → rencana harian (atraksi + makan), slot waktu, biaya per aktivitas, total + breakdown, badge budget fit (hemat/pas/over), travel-time antar stop.
- Kartu rencana di chat + tombol **Simpan ke Trips** (membuat Trip → Day → Activity).

**Kelola riwayat chat**
- Ganti judul percakapan (inline, PATCH).
- Hapus percakapan (DELETE, cascade pesan).

**Kolektor POI gratis (OpenStreetMap)**
- `seed/collect_places_overpass.py` — ambil wisata/penginapan/resto lintas daerah Indonesia via Overpass API, tanpa API key, tanpa biaya. Dump JSON + opsional seed DB.
- Alternatif gratis untuk Google Places (yang berbayar). Catatan: OSM tidak punya rating user.

## Prasyarat

- Docker + Docker Compose
- Python 3.12+
- Node.js (npm)

## Setup awal (sekali)

```bash
# 1. env (jangan pernah di-commit — sudah di-gitignore)
cp .env.example .env          # isi AI_API_KEY, JWT_SECRET, dll

# 2. backend deps
python -m venv .venv
source .venv/bin/activate.fish   # fish ; atau .venv/bin/activate (bash/zsh)
pip install -e ".[dev]"

# 3. frontend deps
cd frontend && npm install && cd ..
```

## Menjalankan service (development)

Tiga terminal, atau pakai background.

**DB + Redis:**
```bash
docker compose up -d db redis
```

**Backend (port 8000, reload aktif):**
```bash
PYTHONPATH=. .venv/bin/uvicorn src.main:app --reload --port 8000
```
> `PYTHONPATH=.` wajib — `src` belum installed sebagai package.

**Frontend (port 3001):**
```bash
cd frontend && PORT=3001 npm run dev
```
> Pakai 3001 karena 3000 sering dipakai project lain di mesin ini.

## Port

| Service  | URL / alamat               |
|----------|----------------------------|
| Backend  | http://localhost:8000      |
| Frontend | http://localhost:3001      |
| Postgres | localhost:5433 (db: tourism, user/pass: tourism/tourism) |
| Redis    | localhost:6379             |

Cek sehat:
```bash
curl localhost:8000/health
```

## Database

```bash
# migrasi
PYTHONPATH=. .venv/bin/alembic upgrade head

# seed data demo (kategori, destinasi, achievement)
# login demo: demo@poca.app / demo123
PYTHONPATH=. .venv/bin/python -m seed.seed_destinations
```

**Koleksi POI dari OpenStreetMap (opsional, gratis):**
```bash
# dump JSON saja:
PYTHONPATH=. .venv/bin/python -m seed.collect_places_overpass --regions Bali,Lombok,Yogyakarta
# yang punya web/wikipedia doang (proxy kualitas):
PYTHONPATH=. .venv/bin/python -m seed.collect_places_overpass --notable-only
# masukkan ke tabel destinations:
PYTHONPATH=. .venv/bin/python -m seed.collect_places_overpass --seed
```

## Test

```bash
PYTHONPATH=. .venv/bin/pytest
```

## Catatan

- Endpoint API: prefix `/api/v1`. Modul: `src/api/v1/` (destinations, trips, reviews, ai_conversation, recommendations, gamification, map, places, posts, users).
- Provider AI via LiteLLM (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`). DeepSeek `deepseek/deepseek-v4-flash` teruji.
- **Frontend Next.js 16 ada breaking change.** Sebelum ubah kode frontend, baca `frontend/AGENTS.md` dan dokumen di `frontend/node_modules/next/dist/docs/`.
- Config memuat `.env` otomatis lewat pydantic-settings (`src/core/config.py`).
- Log (kalau dijalankan background): `/tmp/poca-backend.log`, `/tmp/poca-frontend.log`.

## Docker (opsional, semua service)

```bash
docker compose up -d --build
# backend di http://localhost:8000
```
