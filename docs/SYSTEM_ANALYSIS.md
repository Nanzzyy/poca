# Poca — AI Tourism Companion: System Analysis & PRD

> Document created: 2026-08-03
> Purpose: Deep analysis of architecture, user flow, system flow (fokus AI), dan PRD untuk planning update besar.

---

## 1. RINGKASAN EKSEKUTIF

Poca adalah platform AI Tourism Companion berbasis Indonesia yang menyediakan:
- **Chat AI** dengan anti-hallucination grounding (rekomendasi destinasi dari DB, bukan karangan LLM)
- **AI Trip Planner** — generator itinerary multi-hari dengan estimasi budget
- **Social Feed** — postingan, komentar, like
- **Peta Interaktif** — Leaflet + OpenStreetMap
- **Gamifikasi** — XP, level, achievements, leaderboard
- **Admin Panel** — manajemen destinasi, user, kategori, traffic analytics

**Tech Stack:**
| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (async), Python 3.12+ |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Database | PostgreSQL 16 (asyncpg) |
| Cache | Redis 7 (initialized, belum aktif dipakai) |
| AI Provider | LiteLLM → DeepSeek V4 Flash (default) / Gemini 2.0 Flash |
| Auth | JWT (python-jose) + bcrypt + Google OAuth |
| Maps | Leaflet + React-Leaflet |
| State Mgmt | Zustand 5 (client) + TanStack React Query 5 (server) |

---

## 2. ARSITEKTUR SISTEM

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                     │
│  App Router • React 19 • Tailwind v4 • Zustand • React Query    │
│  Port 3001                                                       │
├──────────────────────────────────────────────────────────────────┤
│  Pages: / | /auth | /search | /destination/[id] | /chat |       │
│  /feed | /map | /profile | /trips | /notifications | /admin/*   │
└───────────────────────────┬──────────────────────────────────────┘
                            │ REST API (JSON)
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI Async)                       │
│  11 Routers • ~55 Endpoints • Prefix: /api/v1                    │
│  Port 8000                                                       │
├──────────────────────────────────────────────────────────────────┤
│  API Layer ─→ Service Layer ─→ Repository Layer ─→ Database      │
│                                                                  │
│  Services:                                                       │
│  • AIConversationService (THE BRAIN — intent detection + LLM)    │
│  • PlanService (multi-day itinerary builder)                     │
│  • BudgetService (cost estimation engine)                        │
│  • TripPlannerService (route optimization + travel time)         │
│  • RecommendationService (filtered DB search)                    │
│  • ReviewSummaryService (AI review summarization)                │
│  • GamificationService (XP + achievements)                       │
│  • GooglePlacesService (destination enrichment)                  │
│  • NotificationService (in-app notifications)                    │
├──────────────────────────────────────────────────────────────────┤
│  Infrastructure:                                                 │
│  • PostgreSQL 16 (primary data store, 20 tables)                 │
│  • Redis 7 (initialized, UNUSED — ready for caching)             │
│  • LiteLLM → DeepSeek/Gemini (AI narration layer)                │
│  • Google Places API (optional enrichment)                       │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 Backend Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│  API Layer (src/api/v1/*.py)                        │
│  • 11 routers: users, destinations, reviews, trips, │
│    ai_conversation, posts, gamification, map,        │
│    recommendations, places, admin                    │
│  • Auth guards: get_current_user / require_user /    │
│    require_admin (JWT HS256)                         │
│  • DI: get_db (async session + auto-commit/rollback) │
├─────────────────────────────────────────────────────┤
│  Service Layer (src/services/*.py)                  │
│  • Business logic, AI orchestration, cost calc       │
│  • Instantiated per-request (no singleton/DI)        │
│  • Constructor injection: Service(db: AsyncSession)  │
├─────────────────────────────────────────────────────┤
│  Repository Layer (src/repositories/*.py)           │
│  • 8 repos: user, destination, review, trip, post,   │
│    conversation, gamification, notification          │
│  • All async, use flush (not commit)                 │
├─────────────────────────────────────────────────────┤
│  Domain Layer (src/domain/)                         │
│  • models/ — 20 SQLAlchemy ORM models                │
│  • schemas/ — Pydantic v2 validation schemas         │
└─────────────────────────────────────────────────────┘
```

### 2.3 Frontend Architecture

```
frontend/src/
├── app/                    # Next.js App Router (semua "use client")
│   ├── layout.tsx          # Root layout + providers + AppShell
│   ├── page.tsx            # Home (hero + popular destinations)
│   ├── auth/               # Login + Register (+ Google OAuth)
│   ├── search/             # Destination search + filters
│   ├── destination/[id]/   # Detail (overview/reviews/map/guide tabs)
│   ├── chat/               # ★ AI Chat Assistant (core feature)
│   ├── feed/               # Social feed (masonry + infinite scroll)
│   ├── map/                # Full-screen Leaflet map
│   ├── profile/            # Own profile + public profile + edit
│   ├── trips/              # Trip list + detail (itinerary + map)
│   ├── notifications/      # Notification center
│   └── admin/              # Admin panel (dashboard/dests/users/traffic/categories)
├── components/             # Shared components (layout, ui, chat, feed, map, search)
├── hooks/                  # Custom React hooks
├── lib/                    # api-client, queries (50+ hooks), utils, animations
├── stores/                 # Zustand stores (Auth, Map, UI)
└── types/                  # 20+ TypeScript interfaces
```

### 2.4 Database Schema (20 Tables)

```
User ──1:N──→ Trip ──1:N──→ TripDay ──1:N──→ TripActivity
  │              │ (FK destination_id → Destination)
  │
  ├──1:N──→ Review ──N:1──→ Destination ──1:1──→ ReviewSummary
  │                                      └──N:1──→ Category ──self──→ Category
  │
  ├──1:N──→ Post ──1:N──→ Comment
  │              └──1:N──→ PostLike (unique post+user)
  │
  ├──1:N──→ Conversation ──1:N──→ Message
  │              │ (FK trip_id → Trip, nullable)
  │
  ├──M:N──→ Achievement (via UserAchievement)
  ├──M:N──→ Badge (via UserBadge — no ORM rels)
  │
  ├──1:N──→ Notification (user_id + actor_id)
  │
  └──self──→ Follower (follower_id / followee_id)

Standalone: PageView (analytics)
```

---

## 3. USER FLOW

### 3.1 Onboarding Flow

```
User arrives → Home Page (/)
  │
  ├── AnnouncementModal (first-visit carousel, localStorage-gated)
  │
  ├── Explore without auth:
  │   ├── Search destinations (/search)
  │   ├── View destination detail (/destination/[id])
  │   ├── Browse social feed (/feed)
  │   ├── View map (/map)
  │   └── View public profiles (/profile/[id])
  │
  └── Register/Login (/auth/register | /auth/login)
      ├── Email + Password
      └── Google OAuth (ID token → backend verifies → auto-create)
          │
          └── Authenticated → Full access
```

### 3.2 Core User Journey: AI Trip Planning

```
User opens /chat
  │
  ├── Create new conversation (POST /ai/conversations)
  │
  ├── Type natural language message, e.g.:
  │   "buatkan plan 3 hari di Bali budget 5 juta buat 2 orang"
  │
  ├── AI detects plan intent → builds multi-day itinerary
  │   ├── Returns: PlanCard component (approve/edit/cancel)
  │   ├── Shows: daily schedule, activities, costs, budget fit
  │   └── Budget analysis: hemat / pas / over
  │
  ├── User actions on plan:
  │   ├── ✅ Approve → "Simpan ke Trips" → creates Trip + TripDay + TripActivity
  │   ├── ✏️ Edit → "tambah 1 hari" / "ganti hotel" → AI rebuilds plan
  │   └── ❌ Cancel → dismisses plan card
  │
  └── Follow-up questions:
      ├── "pantai di Bali" → Recommendation cards (from DB)
      ├── "bukan pantai, wisata alam" → Exclusion filtering
      ├── "budget makan di Bali" → Budget tips template
      └── Free-form chat → LLM response (grounded)
```

### 3.3 Core User Journey: Destination Discovery

```
User opens /search
  │
  ├── Search by keyword, category, budget, rating
  │
  ├── Results: DestinationCard grid
  │   ├── Image, name, city, category, rating, price level
  │   └── Click → /destination/[id]
  │
  ├── Destination Detail page (4 tabs):
  │   ├── Overview: description, images, tags, hours, tips
  │   ├── Reviews: user reviews + AI-generated summary (sentiment)
  │   ├── Map: Leaflet map with marker + nearby destinations
  │   └── Local Guide: food tips, customs, hidden gems
  │
  └── Actions:
      ├── Write review (+10 XP, achievement check)
      ├── Add to favorites
      ├── "Plan Visit" → opens /chat with pre-filled context
      └── Share to feed
```

### 3.4 Social Flow

```
Feed (/feed)
  │
  ├── Masonry grid, infinite scroll
  ├── Post cards: content, media (image/video), likes, comments
  │
  ├── Create post (PostComposer)
  │   ├── Text content (required)
  │   ├── Media attachments (optional)
  │   └── Link to destination (optional)
  │
  ├── Interactions:
  │   ├── Like (toggle, notifies post author)
  │   ├── Comment (notifies post author)
  │   └── View user profile
  │
  └── Profile (/profile)
      ├── Stats: level, XP, trips, reviews, achievements
      ├── Tabs: Trips | Saved | Reviews | Achievements
      ├── Leaderboard
      └── Follow/Unfollow other users
```

### 3.5 Admin Flow

```
Admin Login (/admin/login) → role validation
  │
  ├── Dashboard: stats cards + weekly views chart + top pages
  ├── Destinations: paginated table + CRUD + JSON bulk import
  ├── Users: role toggle (user/admin) + ban/unban
  ├── Traffic: page-view log (path, user, IP, timestamp)
  └── Categories: CRUD (name, slug, icon)
```

---

## 4. SYSTEM FLOW — AI SYSTEM (FOKUS UTAMA)

### 4.1 AI System Architecture Overview

Sistem AI Poca menggunakan **hybrid deterministic-LLM architecture**:
- **Deterministic layer** menangani intent detection, DB search, plan building, cost estimation
- **LLM layer** HANYA untuk natural language narration (membungkus hasil data riil)
- **Anti-hallucination** adalah prinsip desain utama — LLM tidak pernah memilih destinasi

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AI SYSTEM DATA FLOW                               │
│                                                                     │
│  User Message                                                       │
│       │                                                             │
│       ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │         AIConversationService.generate_response()            │   │
│  │                                                              │   │
│  │  Stage 0: Load Context + Extract Preferences                 │   │
│  │  ├── Load conversation + last 5 messages                     │   │
│  │  ├── Extract: keywords, location, exclusions, query terms    │   │
│  │  └── Persist to context_data JSON                            │   │
│  │                                                              │   │
│  │  Stage 1: Greeting Detection (dict lookup)                   │   │
│  │  ├── "halo", "hai", "pagi" → greeting template              │   │
│  │  └── "help", "bantu" → INTRO template                       │   │
│  │                                                              │   │
│  │  Stage 1.5: Plan Intent Detection                            │   │
│  │  ├── Regex: duration (N hari/malam) + plan verb              │   │
│  │  ├── Extract params: days, people, budget                    │   │
│  │  ├── → PlanService.build_plan()                              │   │
│  │  └── Save plan to context_data["last_plan"]                  │   │
│  │                                                              │   │
│  │  Stage 1.6: Edit Intent Detection                            │   │
│  │  ├── Regex: edit verb + plan reference                       │   │
│  │  ├── Merge changed params with last_plan                     │   │
│  │  └── → PlanService.build_plan() (rebuild)                    │   │
│  │                                                              │   │
│  │  Stage 2: Recommendation Intent                              │   │
│  │  ├── Keyword match OR detected interest/location             │   │
│  │  ├── → _search_smart() (cascading DB search)                 │   │
│  │  ├── → _dest_card() (format as recommendation cards)         │   │
│  │  └── → _llm_wrap() (LLM narration + grounding)              │   │
│  │                                                              │   │
│  │  Stage 3: Topic Templates                                    │   │
│  │  ├── Budget, hotel, food, transport queries                  │   │
│  │  └── Pre-written templates + optional LLM polish             │   │
│  │                                                              │   │
│  │  Stage 5: LLM Free-form Fallback                             │   │
│  │  └── Pure conversational response via LiteLLM                │   │
│  │                                                              │   │
│  │  Stage 6: Hardcoded Fallback                                 │   │
│  │  └── "Maaf, aku belum bisa bantu dengan itu"                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│       │                                                             │
│       ▼                                                             │
│  Return (text, metadata)                                            │
│  ├── text: natural language response                                │
│  ├── metadata.recommendations: destination cards (if applicable)    │
│  └── metadata.plan: itinerary object (if applicable)                │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 NLP Pipeline Detail

#### 4.2.1 Keyword Alias System (8 Kategori)

```python
KW_ALIASES = {
    "pantai": "pantai",    "beach": "pantai",    "laut": "pantai",
    "gunung": "gunung",    "mountain": "gunung",  "hiking": "gunung",
    "kuliner": "kuliner",  "makan": "kuliner",    "food": "kuliner",
    "alam": "alam",        "nature": "alam",      "hutan": "alam",
    "waterfall": "alam",   "air terjun": "alam",
    "candi": "candi",      "temple": "candi",     "sejarah": "candi",
    "budaya": "budaya",    "culture": "budaya",   "tradisi": "budaya",
    "belanja": "belanja",  "shopping": "belanja", "mall": "belanja",
    "petualangan": "petualangan", "adventure": "petualangan",
}
```

#### 4.2.2 Exclusion Detection

```python
EXCLUDE_MARKERS = ("bukan", "bukanlah", "selain", "kecuali", "jangan", "tanpa", "hindari")
# Pattern: (?:bukanlah|bukan|selain|...)\\s+([a-zA-Z]+)
# Input:  "wisata alam bukan pantai di Bali"
# Output: categories=["alam"], excluded=["pantai"]
```

#### 4.2.3 Budget Parsing (Indonesian Currency)

```
"5 juta" / "5 jt"     → 5,000,000
"200 ribu" / "200 rb" / "200k" → 200,000
"Rp 200.000"          → 200,000
"200000"              → 200,000
```

#### 4.2.4 Plan Intent Detection

```python
def _detect_plan_intent(msg: str) -> bool:
    has_duration = bool(re.search(r"\d+\s*(hari|malam|days?|nights?)", m))
    has_plan_word = bool(re.search(r"\b(buat|susun|rencana|itinerary|plan|trip|rute)\b", m))
    return has_duration and has_plan_word  # BOTH required
```

#### 4.2.5 Edit Intent Detection

```python
# Edit verbs: "ubah", "edit", "ganti", "tambah", "hapus", "kurangi"
# Must combine with: plan reference ("rencana", "plan") OR concrete changes
# Concrete: duration ("1 hari"), budget ("500rb"), people ("1 orang")
```

### 4.3 Smart Search Engine (`_search_smart()`)

Sistem pencarian 3-tier cascading yang memastikan hasil selalu dari database:

```
Input: keywords=["pantai"], location="bali", excluded=["gunung"]
         │
         ▼
Tier 1: Category-First Search
├── Jika ada category constraint → search semua destinasi kategori itu di region
├── Avoids text-matching yang bisa miss
└── Contoh: "alam di Bali" → semua destinasi Alam di Bali cities
         │
         ▼ (jika kosong)
Tier 2: Region-Scoped Keyword Search
├── Search keyword dalam cities dari detected region
├── cities_for("bali") → ["denpasar","badung","tabanan","gianyar","ubud","kuta",...]
├── ILIKE search across name, description, city
└── Fallback: region-only (tanpa keyword) jika keyword kosong
         │
         ▼ (jika masih kosong)
Tier 3: Unscoped National Search
└── Search setiap token keyword secara nasional
```

#### Region → City Mapping (14 Regions)

```python
"bali"     → ["denpasar","badung","tabanan","gianyar","klungkung","ubud","kuta","sanur",...]
"yogyakarta" → ["yogyakarta","sleman","bantul","gunung kidul","kulon progo"]
"lombok"   → ["lombok","mataram","senggigi","kuta lombok"]
"bromo"    → ["malang","probolinggo","pasuruan","lumajang"]
"raja ampat" → ["raja ampat","waisai","sorong"]
# ... dst (14 region)
```

### 4.4 AI Trip Planner Flow

```
Input: "buatkan plan 3 hari di Bali budget 5 juta buat 2 orang"
         │
         ▼
Parameter Extraction:
├── days = 3
├── location = "bali"
├── budget = 5,000,000
├── people = 2
└── price_level = "mid" (budget/person/day = 833k → mid range)
         │
         ▼
PlanService.build_plan():
├── 1. Resolve location → cities_for("bali")
├── 2. Fetch attractions (non-kuliner) dari DB untuk region
├── 3. Fetch kuliner destinations dari DB untuk region
├── 4. For each day, populate time slots:
│   ├── Budget tier:  09:00, 12:00(lunch), 15:00 (3 activities)
│   ├── Mid tier:     09:00, 12:00(lunch), 15:00, 18:30(dinner) (4 activities)
│   └── Luxury tier:  09:00, 12:00(lunch), 15:00, 18:30(dinner) (4 activities)
├── 5. Calculate activity costs via BudgetService
├── 6. Add travel-time hints (haversine distance)
├── 7. Calculate structural costs:
│   ├── Accommodation: rate × days × rooms (1 room per 2 people)
│   └── Transport: Rp150,000/day flat
└── 8. Budget fit analysis: hemat(<90%) / pas(±10%) / over(>110%)
         │
         ▼
Output Structure:
{
  "title": "Rencana Liburan 3 Hari di Bali",
  "num_days": 3,
  "budget_requested": 5000000,
  "budget_estimate": {
    "total": 4200000,
    "breakdown": {"activities": 2100000, "accommodation": 1500000, "transport": 450000}
  },
  "budget_fit": "hemat",
  "days": [
    {
      "day": 1,
      "activities": [
        {"name": "Tanah Lot", "time": "09:00", "cost": 150000,
         "lat": -8.62, "lng": 115.08,
         "travel_next": {"minutes": 25, "mode": "mobil", "distance_km": 15.2}},
        {"name": "Warung Babi Guling", "time": "12:00", "cost": 75000, ...},
        {"name": "Ubud Monkey Forest", "time": "15:00", "cost": 80000, ...}
      ]
    },
    ...
  ]
}
```

### 4.5 LLM Integration Layer (`_llm_wrap()`)

#### System Prompt (Indonesian, conversational)

```
Kamu Poca — teman seperjalanan yang hangat, ngobrol santai kayak temen deket.
Pahami keresahan user: mereka bingung cari destinasi, budget terbatas,
nggak tau itinerary. Bantu dengan empati, bukan robot.
Jawab pakai Bahasa Indonesia santai tapi sopan, hangat, gak kaku.
Emoji secukupnya biar hidup. Pahami konteks sebelumnya.
Fokus: travel, destinasi, budget, kuliner, budaya, transport, penginapan.
Di luar itu, tolak ramah — arahkan balik ke liburan.
Jawaban ringkas maksimal ~150 kata.

ATURAN PENTING — JANGAN MENGARANG:
- Jika ada daftar destinasi di bawah, HANYA sebut tempat dari daftar itu.
  JANGAN tambah destinasi lain.
- Jika user menyebut lokasi, pastikan rekomendasi benar-benar di lokasi itu.
  Jika data terbatas, jujur bilang — jangan pura-pura.
- Jangan mengarang harga/jarak/jadwal pasti — gunakan kata 'perkiraan'.
- Jawab lengkap, jangan terpotong di tengah.
```

#### Grounding Mechanism — Destination List Injection

```
DAFTAR DESTINASI (card yang akan ditampilkan ke user). Jawabanmu HARUS
mengacu pada tempat-tempat ini saja, jangan sebut destinasi lain:
1. Pantai Kuta — Badung — kategori:Pantai — description...
2. Tanah Lot — Tabanan — kategori:Candi — description...
```

#### Grounding Mechanism — Plan Narration Injection

```
RENCANA LIBURAN (sudah disusun, akan tampil sebagai kartu rencana ke user).
Tuliskan intro hangat & ringkas yang menarasikan rencana ini...
Total perkiraan Rp4,200,000 (hemat).
Hari 1: 09:00 Tanah Lot, 12:00 Warung Babi Guling, 15:00 Ubud Monkey Forest
```

#### LLM Call Parameters

```python
model = "deepseek/deepseek-v4-flash"  # or "gemini/gemini-2.0-flash"
max_tokens = 600
temperature = 0.3  # Low creativity, high factual consistency
```

### 4.6 Anti-Hallucination Defense-in-Depth

| Layer | Mekanisme |
|-------|-----------|
| **Architecture** | LLM TIDAK pernah memilih destinasi — semua rekomendasi dari DB query |
| **Prompt** | Explicit "JANGAN MENGARANG" rules + grounded destination list |
| **Temperature** | 0.3 (low creativity, high consistency) |
| **Data Flow** | Plan dihitung secara deterministic → LLM hanya menarasikan |
| **Fallbacks** | Setiap LLM call bisa fail → fallback ke template response |
| **Context** | `context_data` JSON persist preferences + last plan |
| **Exclusion** | "bukan pantai" correctly excludes beach category dari DB |
| **Region Scoping** | "Bali" hanya query Bali cities, mencegah kontaminasi lintas provinsi |
| **Edit Detection** | "tambah 1 hari" correctly menambah plan yang ada, bukan buat baru |

### 4.7 Conversation Context Management

```python
# context_data JSON on conversation record:
{
  "preferences": {
    "interest": "alam",
    "location": "bali",
    "query": ["pantai", "alam"],
    "exclude": ["gunung"]
  },
  "last_plan": { ... full plan dict ... },
  "last_topic": "first 80 chars of last message"
}

# LLM context window: last 5 messages
conv.messages[-5:]

# Auto-title: first user message truncated to 60 chars
```

### 4.8 Cost Estimation Engine (BudgetService)

```python
# Rate tables (IDR per day per person)
ACCOMMODATION = {"budget": 200_000, "mid": 500_000, "luxury": 2_000_000}
FOOD          = {"budget": 100_000, "mid": 250_000, "luxury": 750_000}
TRANSPORT_PER_KM = {"budget": 3_000, "mid": 7_000, "luxury": 20_000}
TICKET        = {"budget": 50_000, "mid": 150_000, "luxury": 350_000}

# Activity costs by category × price level
{
  "attraction":  {"budget": 25_000, "mid": 75_000, "luxury": 250_000},
  "museum":      {"budget": 15_000, "mid": 50_000, "luxury": 150_000},
  "adventure":   {"budget": 150_000, "mid": 350_000, "luxury": 1_000_000},
  "food":        {"budget": 50_000, "mid": 150_000, "luxury": 500_000},
  "shopping":    {"budget": 0, "mid": 0, "luxury": 0},
  "transport":   {"budget": 10_000, "mid": 50_000, "luxury": 200_000},
}

# 15% emergency reserve ditambahkan ke total
```

### 4.9 Route Optimization (TripPlannerService)

```python
# Greedy nearest-neighbor TSP heuristic
optimize_route(activities):
    start from first activity
    while unvisited activities remain:
        pick nearest unvisited (haversine distance)
    return reordered list

# Travel time estimation
estimate_travel_time(lat1, lng1, lat2, lng2):
    distance_km = haversine(lat1, lng1, lat2, lng2)
    walking: 5 km/h
    driving: 40 km/h
    public_transport: driving_time × 1.5
```

---

## 5. PRODUCT REQUIREMENTS DOCUMENT (PRD)

### 5.1 Vision

Poca adalah AI-powered travel companion yang membantu traveler Indonesia merencanakan perjalanan dengan mudah, terjangkau, dan terpersonalisasi. Platform menggabungkan chatbot AI, trip planner, social feed, dan gamifikasi dalam satu ekosistem.

### 5.2 Target Users

| Segment | Deskripsi | Needs |
|---------|-----------|-------|
| Budget Traveler | Mahasiswa/backpacker, budget terbatas | Rekomendasi murah, itinerary hemat |
| Family Traveler | Keluarga dengan anak | Plan yang aman, activity cocok untuk semua umur |
| Solo Explorer | Traveler solo, fleksibel | Destinasi hidden gem, komunitas |
| Content Creator | Influencer/travel blogger | Spot foto, social feed, share experience |

### 5.3 Core Features (Current State)

#### F1: AI Chat Assistant ✅ IMPLEMENTED
- Chat dengan AI dalam Bahasa Indonesia
- Rekomendasi destinasi grounded ke database (anti-hallucination)
- Constraint negatif ("bukan pantai")
- Rich text rendering (bold/italic)
- Conversation history management (rename, delete)
- Auto-title dari pesan pertama

#### F2: AI Trip Planner ✅ IMPLEMENTED
- Multi-day itinerary generation (1-7 hari)
- Budget-aware planning (budget/mid/luxury tiers)
- Per-activity cost estimation
- Accommodation + transport cost calculation
- Budget fit analysis (hemat/pas/over)
- Travel time estimation between stops
- Save to Trips (creates Trip + Days + Activities)
- Edit/refine plan via follow-up chat

#### F3: Destination Discovery ✅ IMPLEMENTED
- Search dengan filters (keyword, category, price, rating)
- Destination detail (overview, reviews, map, local guide)
- Nearby destinations
- Category browsing
- GeoJSON map markers

#### F4: Social Feed ✅ IMPLEMENTED
- Post creation (text + media)
- Like + comment system
- Infinite scroll masonry grid
- User profiles with posts
- Follow/unfollow system

#### F5: Gamification ✅ IMPLEMENTED
- XP system (+10 review, +25 trip creation)
- Level calculation (level = xp/100 + 1)
- 6 achievement types
- Leaderboard (top 20)
- Notification on achievement unlock

#### F6: Review System ✅ IMPLEMENTED
- User reviews with rating (1-5)
- AI-generated review summary (sentiment analysis)
- Helpful vote system
- Moderation status (pending/approved/rejected)
- Photo attachments

#### F7: Interactive Map ✅ IMPLEMENTED
- Full-screen Leaflet map
- Category-filtered markers
- Custom marker icons per category
- Marker types: recommended, trending, hidden_gem, community_favorite
- Sidebar with destination details

#### F8: Admin Panel ✅ IMPLEMENTED
- Dashboard with stats + weekly charts
- Destination CRUD + bulk JSON import
- User management (role, ban)
- Category CRUD
- Traffic analytics

#### F9: Notifications ✅ IMPLEMENTED
- In-app notifications (like, comment, follow, achievement, trip)
- Unread count badge
- Mark all read

#### F10: Google Places Integration ✅ IMPLEMENTED
- Enrich destination data (ratings, photos, hours)
- Text search Google Places API
- Optional (no API key = gracefully degraded)

### 5.4 Technical Requirements

| Requirement | Current State |
|-------------|--------------|
| Authentication | JWT (24h expiry) + Google OAuth |
| API Design | REST, /api/v1 prefix, ~55 endpoints |
| Database | PostgreSQL 16, 20 tables, async via asyncpg |
| Caching | Redis initialized but UNUSED |
| AI Provider | LiteLLM (DeepSeek/Gemini), configurable |
| Frontend | Next.js 16, fully client-rendered |
| State Management | Zustand (client) + React Query (server) |
| Maps | Leaflet + OpenStreetMap |
| Background Jobs | None (all inline) |
| Testing | pytest (backend), Playwright E2E (frontend) |
| Deployment | Docker Compose (standalone output) |

### 5.5 Known Technical Debt & Gaps

| Issue | Severity | Description |
|-------|----------|-------------|
| Redis unused | Medium | Initialized but no service uses it — no caching |
| No background workers | Medium | All AI/enrichment runs inline in request cycle |
| No rate limiting | High | No API rate limiting middleware |
| No request logging | Medium | No structured logging middleware |
| Badge system incomplete | Low | Badge/UserBadge tables exist but no ORM relationships |
| No embedding/RAG | Medium | AI context is purely recent messages, no vector search |
| Template fallbacks weak | Medium | Without API key, responses are basic templates |
| No WebSocket/SSE | Medium | Chat is request-response, no streaming |
| No image upload | Medium | Media references URLs only, no upload pipeline |
| No email verification | Low | Registration doesn't verify email |
| No password reset | Low | No forgot-password flow |
| Alembic initial migration empty | Low | Most tables bootstrapped via create_all, not tracked |

---

## 6. API ENDPOINT REFERENCE

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | None | Register (email/username/password) |
| POST | /auth/login | None | Login (email/password → JWT) |
| POST | /auth/google | None | Google OAuth sign-in/up |

### Users & Profile
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /users/me | Required | Current user profile |
| PUT | /users/me | Required | Update profile |
| PUT | /users/me/preferences | Required | Update preferences |
| GET | /users/me/favorites | Required | Get favorited destinations |
| POST | /users/me/favorites/{id} | Required | Toggle favorite |
| GET | /users/{id} | Optional | Public profile |
| POST | /users/{id}/follow | Required | Toggle follow |
| GET | /users/{id}/posts | None | User's posts |

### Destinations
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /destinations | None | Search/filter (q, category, price, rating, city, geo) |
| GET | /destinations/categories/all | None | All categories |
| GET | /destinations/{id} | None | Destination detail |
| GET | /destinations/{id}/nearby | None | Nearby destinations |
| GET | /destinations/{id}/local-guide | None | Local guide (food, customs, hidden gems) |

### Reviews
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /reviews/my | Required | My reviews |
| GET | /reviews/all | None | All reviews |
| GET | /destinations/{id}/reviews | None | Reviews for destination |
| POST | /destinations/{id}/reviews | Required | Create review (+10 XP) |
| PUT | /reviews/{id} | Required | Update review |
| DELETE | /reviews/{id} | Required | Delete review |
| POST | /reviews/{id}/helpful | None | Toggle helpful |
| GET | /destinations/{id}/review-summary | None | AI review summary |

### Trips
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /trips | Required | Create trip (+25 XP) |
| GET | /trips | Required | List my trips |
| GET | /trips/{id} | Required | Trip detail |
| PUT | /trips/{id} | Required | Update trip |
| DELETE | /trips/{id} | Required | Delete trip |
| POST | /trips/{id}/days | Required | Add day |
| POST | /trips/{id}/days/{n}/activities | Required | Add activity |
| POST | /trips/{id}/optimize-route | Required | Optimize route |
| GET | /trips/{id}/budget | Required | Budget estimate |

### AI Conversations
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /ai/conversations | Required | Create conversation |
| GET | /ai/conversations | Required | List conversations |
| GET | /ai/conversations/{id} | Required | Get conversation + messages |
| PATCH | /ai/conversations/{id} | Required | Rename conversation |
| POST | /ai/conversations/{id}/messages | Required | **Send message → AI response** |
| DELETE | /ai/conversations/{id} | Required | Delete conversation |

### Social (Posts)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /posts | Optional | Feed (paginated) |
| GET | /posts/{id} | Optional | Single post |
| POST | /posts | Required | Create post |
| DELETE | /posts/{id} | Required | Delete post |
| POST | /posts/{id}/like | Required | Toggle like |
| GET | /posts/{id}/comments | None | List comments |
| POST | /posts/{id}/comments | Required | Add comment |

### Gamification
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /gamification/users/me/stats | Required | My stats |
| GET | /gamification/users/me/achievements | Required | My achievements |
| GET | /gamification/achievements | None | All achievements |
| GET | /gamification/leaderboard | None | Top 20 leaderboard |

### Map & Places
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /map/markers | None | GeoJSON markers (bounds + category filter) |
| POST | /places/enrich/{id} | Required | Enrich with Google Places |
| POST | /places/enrich-all | Required | Batch enrich |
| GET | /places/search | None | Google Places text search |

### Recommendations
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /recommendations | Optional | AI recommendations (budget, categories, style, geo) |
| GET | /recommendations/quick | None | Quick recommendations |

### Notifications
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /notifications | Required | List notifications |
| GET | /notifications/unread-count | Required | Unread count |
| POST | /notifications/read-all | Required | Mark all read |

### Analytics
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /analytics/track | None | Page view tracking |

### Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /admin/dashboard | Admin | Dashboard stats + charts |
| GET | /admin/destinations | Admin | List destinations |
| POST | /admin/destinations | Admin | Create destination |
| PUT | /admin/destinations/{id} | Admin | Update destination |
| DELETE | /admin/destinations/{id} | Admin | Soft-delete destination |
| POST | /admin/destinations/bulk | Admin | Bulk import |
| GET | /admin/users | Admin | List users |
| PATCH | /admin/users/{id} | Admin | Update user role/status |
| GET | /admin/categories | Admin | List categories |
| POST | /admin/categories | Admin | Create category |
| PUT | /admin/categories/{id} | Admin | Update category |
| DELETE | /admin/categories/{id} | Admin | Delete category |
| GET | /admin/traffic | Admin | Traffic log |

---

## 7. PROMPT TEMPLATES REFERENCE

### 7.1 Main System Prompt
```
Kamu Poca — teman seperjalanan yang hangat, ngobrol santai kayak temen deket.
Pahami keresahan user: mereka bingung cari destinasi, budget terbatas,
nggak tau itinerary. Bantu dengan empati, bukan robot.
Jawab pakai Bahasa Indonesia santai tapi sopan, hangat, gak kaku.
Emoji secukupnya biar hidup. Pahami konteks sebelumnya.
Fokus: travel, destinasi, budget, kuliner, budaya, transport, penginapan.
Di luar itu, tolak ramah — arahkan balik ke liburan.
Jawaban ringkas maksimal ~150 kata.

ATURAN PENTING — JANGAN MENGARANG:
- Jika ada daftar destinasi di bawah, HANYA sebut tempat dari daftar itu.
  JANGAN tambah destinasi lain.
- Jika user menyebut lokasi, pastikan rekomendasi benar-benar di lokasi itu.
  Jika data terbatas, jujur bilang — jangan pura-pura.
- Jangan mengarang harga/jarak/jadwal pasti — gunakan kata 'perkiraan'.
- Jawab lengkap, jangan terpotong di tengah.
```

### 7.2 Destination Grounding Appendix
```
DAFTAR DESTINASI (card yang akan ditampilkan ke user). Jawabanmu HARUS
mengacu pada tempat-tempat ini saja, jangan sebut destinasi lain:
1. {name} — {city} — kategori:{category} — {description[:150]}
2. ...
```

### 7.3 Plan Narration Appendix
```
RENCANA LIBURAN (sudah disusun, akan tampil sebagai kartu rencana ke user).
Tuliskan intro hangat & ringkas yang menarasikan rencana ini: sebutkan alur
per hari dan aktivitas NYATA yang ada di daftar di bawah, plus 1-2 tips praktis.
JANGAN tambah destinasi di luar daftar. Sebut totalnya sebagai 'perkiraan'.
Total perkiraan Rp{total:,} ({budget_fit}).
Hari 1: {time} {name}, {time} {name}, ...
Hari 2: ...
```

### 7.4 Review Summary Prompt
```
Summarize these tourism destination reviews.
Average rating: {avg:.1f}/5
Reviews ({total} total):
- [{rating}/5] {title}: {content[:200]}
...
Return JSON: {"summary":"...", "positive_topics":["..."],
              "negative_topics":["..."], "sentiment_score":0.0-1.0}
```

### 7.5 Static Response Templates
- **Greetings**: 5 Indonesian greetings with personality
- **INTRO**: Full onboarding message explaining capabilities
- **Recommendation openers**: 8 category-specific (pantai → "Wah, pantai nih!")
- **Topic responses**: 4 templates (budget, accommodation, food, transport)
- **Plan intro fallback**: Template narration with budget breakdown

---

## 8. LOCAL DEVELOPMENT SETUP

```bash
# Prerequisites: Docker, Python 3.12+, Node.js

# 1. Environment
cp .env.example .env  # fill AI_API_KEY

# 2. Database + Redis
docker compose up -d db redis

# 3. Backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
PYTHONPATH=. .venv/bin/alembic upgrade head
PYTHONPATH=. .venv/bin/python -m seed.seed_destinations
PYTHONPATH=. .venv/bin/uvicorn src.main:app --reload --port 8000

# 4. Frontend
cd frontend && npm install && PORT=3001 npm run dev

# Services:
# Backend:  http://localhost:8000
# Frontend: http://localhost:3001
# Postgres: localhost:5433 (tourism/tourism)
# Redis:    localhost:6379

# Demo login: demo@poca.app / demo123
```

---

## 9. FILE STRUCTURE REFERENCE

```
poca/
├── src/
│   ├── main.py                    # FastAPI app + CORS + lifespan
│   ├── ai/
│   │   └── __init__.py            # (empty — AI logic is in services)
│   ├── api/
│   │   ├── deps.py                # Auth dependencies
│   │   └── v1/
│   │       ├── admin.py           # Admin routes
│   │       ├── ai_conversation.py # AI chat routes
│   │       ├── destinations.py    # Destination routes
│   │       ├── gamification.py    # Gamification routes
│   │       ├── map.py             # Map routes
│   │       ├── places.py          # Google Places routes
│   │       ├── posts.py           # Social feed routes
│   │       ├── recommendations.py # Recommendation routes
│   │       ├── reviews.py         # Review routes
│   │       ├── trips.py           # Trip routes
│   │       └── users.py           # User/auth routes
│   ├── core/
│   │   ├── config.py              # Pydantic Settings (env loading)
│   │   ├── database.py            # SQLAlchemy async engine + session
│   │   ├── dependencies.py        # Auth guards (get_current_user/require_user/require_admin)
│   │   ├── locations.py           # Region→city mapping (14 regions)
│   │   └── redis.py               # Redis client (init/close/get)
│   ├── domain/
│   │   ├── models/                # 20 SQLAlchemy models
│   │   └── schemas/               # Pydantic v2 schemas
│   ├── repositories/              # 8 async repository classes
│   ├── services/                  # 11 service classes
│   └── workers/                   # (empty — no background workers)
├── frontend/
│   └── src/
│       ├── app/                   # Next.js App Router pages
│       ├── components/            # Shared components
│       ├── hooks/                 # Custom hooks
│       ├── lib/                   # API client, queries, utils
│       ├── stores/                # Zustand stores
│       └── types/                 # TypeScript interfaces
├── alembic/                       # Database migrations
├── seed/                          # Seed scripts (destinations, OSM collector)
├── tests/                         # Backend tests
├── docker-compose.yml             # PostgreSQL + Redis + App
└── docs/
    └── SYSTEM_ANALYSIS.md         # ← Dokumen ini
```
