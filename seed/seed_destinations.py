"""Seed database with sample destinations across Indonesia."""
import asyncio
import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select

from src.core.config import settings
from src.core.database import Base
from src.domain.models.destination import Category, Destination
from src.domain.models.user import User
from src.domain.models.gamification import Achievement
from src.domain.models.review import Review
import bcrypt


CATEGORIES = [
    {"name": "Pantai", "icon": "beach", "slug": "pantai"},
    {"name": "Candi", "icon": "landmark", "slug": "candi"},
    {"name": "Gunung", "icon": "mountain", "slug": "gunung"},
    {"name": "Kuliner", "icon": "utensils", "slug": "kuliner"},
    {"name": "Budaya", "icon": "palette", "slug": "budaya"},
    {"name": "Alam", "icon": "tree", "slug": "alam"},
    {"name": "Belanja", "icon": "shopping-bag", "slug": "belanja"},
    {"name": "Hiburan", "icon": "music", "slug": "hiburan"},
]

DESTINATIONS = [
    # Bali
    {"name": "Pantai Kuta", "city": "Badung", "country": "Indonesia", "lat": -8.7186, "lng": 115.1686, "cat": "pantai",
     "price": "mid", "rating": 4.2, "reviews": 250, "tags": ["sunset", "surf", "beach"], "desc": "Pantai terkenal dengan sunset dan ombak untuk surfing. Pusat keramaian wisata di Bali.",
     "food": [{"name": "Ayam Betutu", "desc": "Ayam berbumbu kunik khas Bali"}, {"name": "Babi Guling", "desc": "Babi panggang khas Bali"}],
     "customs": [{"title": "Pakai Kain", "desc": "Gunakan kain saat masuk pura"}, {"title": "Salam", "desc": "Sapa dengan senyum dan salam"}],
     "hidden_gems": [{"name": "Taman Segara", "desc": "Taman tersembunyi di belakang Kuta"}]},
    {"name": "Pantai Sanur", "city": "Denpasar", "country": "Indonesia", "lat": -8.6944, "lng": 115.2636, "cat": "pantai",
     "price": "mid", "rating": 4.3, "reviews": 180, "tags": ["sunrise", "calm", "beach"], "desc": "Pantai timur Bali dengan sunrise indah dan ombak tenang."},
    {"name": "Ubud Monkey Forest", "city": "Gianyar", "country": "Indonesia", "lat": -8.5181, "lng": 115.2594, "cat": "alam",
     "price": "budget", "rating": 4.5, "reviews": 320, "tags": ["nature", "monkeys", "forest"], "desc": "Cagar alam dengan ribuan monyet ekor panjang di tengah hutan tropis."},
    {"name": "Tanah Lot", "city": "Tabanan", "country": "Indonesia", "lat": -8.6213, "lng": 115.0867, "cat": "candi",
     "price": "budget", "rating": 4.6, "reviews": 400, "tags": ["temple", "sunset", "ocean"], "desc": "Pura di atas batu karang di tepi laut. Ikon wisata Bali."},
    {"name": "Tegallalang Rice Terrace", "city": "Gianyar", "country": "Indonesia", "lat": -8.4314, "lng": 115.2797, "cat": "alam",
     "price": "budget", "rating": 4.4, "reviews": 200, "tags": ["rice terrace", "nature", "photo"], "desc": "Sawah terasering dengan sistem irigasi Subak yang indah."},
    {"name": "Uluwatu Temple", "city": "Badung", "country": "Indonesia", "lat": -8.8291, "lng": 115.0849, "cat": "candi",
     "price": "budget", "rating": 4.7, "reviews": 350, "tags": ["temple", "cliff", "sunset"], "desc": "Pura di tebing selatan Bali. Pertunjukan Kecak saat sunset."},
    {"name": "Seminyak", "city": "Badung", "country": "Indonesia", "lat": -8.6906, "lng": 115.1551, "cat": "belanja",
     "price": "luxury", "rating": 4.1, "reviews": 150, "tags": ["shopping", "beach", "nightlife"], "desc": "Kawasan mewah dengan butik, restoran, dan nightlife."},
    {"name": "Nusa Penida", "city": "Klungkung", "country": "Indonesia", "lat": -8.7277, "lng": 115.5442, "cat": "alam",
     "price": "mid", "rating": 4.6, "reviews": 180, "tags": ["cliff", "beach", "nature"], "desc": "Pulau dengan tebing dramatis dan pantai tersembunyi seperti Kelingking Beach."},
    {"name": "Jimbaran Bay", "city": "Badung", "country": "Indonesia", "lat": -8.7787, "lng": 115.1595, "cat": "pantai",
     "price": "mid", "rating": 4.3, "reviews": 120, "tags": ["seafood", "sunset", "beach"], "desc": "Teluk dengan deretan restoran seafood pinggir pantai."},

    # Jakarta
    {"name": "Monas", "city": "Jakarta", "country": "Indonesia", "lat": -6.1754, "lng": 106.8272, "cat": "budaya",
     "price": "budget", "rating": 4.3, "reviews": 300, "tags": ["monument", "history", "city"], "desc": "Monumen Nasional. Ikon Jakarta dengan museum sejarah di dalamnya."},
    {"name": "Kota Tua", "city": "Jakarta", "country": "Indonesia", "lat": -6.1352, "lng": 106.8144, "cat": "budaya",
     "price": "budget", "rating": 4.1, "reviews": 220, "tags": ["history", "colonial", "museum"], "desc": "Kawasan kota lama dengan arsitektur kolonial Belanda."},
    {"name": "Ancol Dreamland", "city": "Jakarta", "country": "Indonesia", "lat": -6.1212, "lng": 106.8457, "cat": "hiburan",
     "price": "mid", "rating": 4.0, "reviews": 280, "tags": ["theme park", "beach", "family"], "desc": "Taman rekreasi terbesar di Jakarta dengan Sea World, Dufan, dan pantai."},
    {"name": "Taman Mini Indonesia Indah", "city": "Jakarta", "country": "Indonesia", "lat": -6.3027, "lng": 106.8951, "cat": "budaya",
     "price": "budget", "rating": 4.2, "reviews": 190, "tags": ["culture", "museum", "family"], "desc": "Taman budaya miniatur Indonesia lengkap dengan anjungan daerah."},

    # Yogyakarta
    {"name": "Borobudur Temple", "city": "Magelang", "country": "Indonesia", "lat": -7.6079, "lng": 110.2038, "cat": "candi",
     "price": "mid", "rating": 4.8, "reviews": 500, "tags": ["temple", "unesco", "buddhist"], "desc": "Candi Buddha terbesar di dunia. Situs Warisan Dunia UNESCO."},
    {"name": "Prambanan Temple", "city": "Sleman", "country": "Indonesia", "lat": -7.7520, "lng": 110.4914, "cat": "candi",
     "price": "mid", "rating": 4.6, "reviews": 380, "tags": ["temple", "unesco", "hindu"], "desc": "Kompleks candi Hindu terbesar di Indonesia."},
    {"name": "Malioboro", "city": "Yogyakarta", "country": "Indonesia", "lat": -7.7910, "lng": 110.3662, "cat": "belanja",
     "price": "budget", "rating": 4.0, "reviews": 310, "tags": ["shopping", "street", "food"], "desc": "Jalan legendaris pusat oleh-oleh dan kuliner Yogyakarta."},
    {"name": "Merapi Volcano", "city": "Sleman", "country": "Indonesia", "lat": -7.5407, "lng": 110.4443, "cat": "gunung",
     "price": "mid", "rating": 4.5, "reviews": 150, "tags": ["volcano", "hiking", "adventure"], "desc": "Gunung berapi paling aktif di Indonesia. Jeep tour lava."},
    {"name": "Parangtritis Beach", "city": "Bantul", "country": "Indonesia", "lat": -8.0243, "lng": 110.3268, "cat": "pantai",
     "price": "budget", "rating": 4.0, "reviews": 100, "tags": ["beach", "sunset", "legend"], "desc": "Pantai selatan dengan mitos Nyi Roro Kidul."},

    # Bandung
    {"name": "Tangkuban Perahu", "city": "Lembang", "country": "Indonesia", "lat": -6.7673, "lng": 107.6015, "cat": "gunung",
     "price": "budget", "rating": 4.2, "reviews": 200, "tags": ["volcano", "nature", "crater"], "desc": "Gunung berapi dengan kawah yang bisa dikunjungi."},
    {"name": "Kawah Putih", "city": "Bandung", "country": "Indonesia", "lat": -7.1664, "lng": 107.4072, "cat": "alam",
     "price": "budget", "rating": 4.4, "reviews": 250, "tags": ["crater", "lake", "nature"], "desc": "Kawah dengan danau berwarna putih kehijauan yang eksotis."},
    {"name": "Farmhouse Lembang", "city": "Lembang", "country": "Indonesia", "lat": -6.8167, "lng": 107.6185, "cat": "hiburan",
     "price": "mid", "rating": 4.0, "reviews": 180, "tags": ["family", "photo", "europe"], "desc": "Tempat wisata bernuansa Eropa dengan mini zoo."},

    # Surabaya & East Java
    {"name": "Bromo Tengger Semeru", "city": "Probolinggo", "country": "Indonesia", "lat": -7.9425, "lng": 112.9530, "cat": "gunung",
     "price": "mid", "rating": 4.7, "reviews": 280, "tags": ["volcano", "sunrise", "adventure"], "desc": "Gunung Bromo dengan lautan pasir dan sunrise spektakuler."},
    {"name": "Tumpak Sewu Waterfall", "city": "Lumajang", "country": "Indonesia", "lat": -8.2444, "lng": 113.1972, "cat": "alam",
     "price": "budget", "rating": 4.8, "reviews": 120, "tags": ["waterfall", "nature", "hiking"], "desc": "Air terjun bertingkat yang disebut sebagai Niagara-nya Indonesia."},
    {"name": "Ijen Crater", "city": "Banyuwangi", "country": "Indonesia", "lat": -8.0583, "lng": 114.2422, "cat": "gunung",
     "price": "mid", "rating": 4.6, "reviews": 160, "tags": ["volcano", "blue fire", "crater"], "desc": "Kawah dengan blue fire dan danau asam terbesar di dunia."},

    # Lombok
    {"name": "Gili Trawangan", "city": "Lombok", "country": "Indonesia", "lat": -8.3490, "lng": 116.0367, "cat": "pantai",
     "price": "mid", "rating": 4.5, "reviews": 300, "tags": ["island", "snorkeling", "beach"], "desc": "Pulau kecil dengan pantai indah. Tanpa kendaraan bermotor."},
    {"name": "Mount Rinjani", "city": "Lombok", "country": "Indonesia", "lat": -8.4167, "lng": 116.4667, "cat": "gunung",
     "price": "mid", "rating": 4.7, "reviews": 140, "tags": ["volcano", "hiking", "lake"], "desc": "Gunung berapi kedua tertinggi di Indonesia dengan danau kawah."},
    {"name": "Senggigi Beach", "city": "Lombok", "country": "Indonesia", "lat": -8.4927, "lng": 116.0461, "cat": "pantai",
     "price": "mid", "rating": 4.1, "reviews": 100, "tags": ["beach", "sunset", "resort"], "desc": "Pantai populer di Lombok dengan resort dan sunset indah."},

    # Raja Ampat
    {"name": "Raja Ampat Islands", "city": "Sorong", "country": "Indonesia", "lat": -0.5000, "lng": 130.0000, "cat": "pantai",
     "price": "luxury", "rating": 4.9, "reviews": 150, "tags": ["diving", "island", "marine"], "desc": "Surga bawah laut dengan keanekaragaman hayati laut tertinggi di dunia."},
    {"name": "Wayag Island", "city": "Raja Ampat", "country": "Indonesia", "lat": -0.1333, "lng": 130.0833, "cat": "pantai",
     "price": "luxury", "rating": 4.9, "reviews": 80, "tags": ["kayak", "viewpoint", "island"], "desc": "Pulau dengan pemandangan karst dari atas bukit."},

    # Flores
    {"name": "Kelimutu Lake", "city": "Ende", "country": "Indonesia", "lat": -8.7701, "lng": 121.8190, "cat": "alam",
     "price": "mid", "rating": 4.6, "reviews": 110, "tags": ["volcano", "lake", "colorful"], "desc": "Danau tiga warna yang berubah-ubah di puncak Gunung Kelimutu."},
    {"name": "Komodo Island", "city": "Labuan Bajo", "country": "Indonesia", "lat": -8.5506, "lng": 119.4905, "cat": "alam",
     "price": "luxury", "rating": 4.7, "reviews": 200, "tags": ["komodo", "wildlife", "national park"], "desc": "Habitat asli komodo, kadal terbesar di dunia."},
    {"name": "Pink Beach", "city": "Labuan Bajo", "country": "Indonesia", "lat": -8.5694, "lng": 119.5180, "cat": "pantai",
     "price": "mid", "rating": 4.5, "reviews": 90, "tags": ["beach", "snorkeling", "pink sand"], "desc": "Pantai dengan pasir berwarna merah muda yang langka."},

    # Sulawesi
    {"name": "Bunaken Marine Park", "city": "Manado", "country": "Indonesia", "lat": 1.6115, "lng": 124.7556, "cat": "pantai",
     "price": "mid", "rating": 4.5, "reviews": 130, "tags": ["diving", "marine", "national park"], "desc": "Taman laut dengan dinding karang vertikal dan keanekaragaman hayati."},
    {"name": "Tana Toraja", "city": "Toraja", "country": "Indonesia", "lat": -3.0863, "lng": 119.8785, "cat": "budaya",
     "price": "mid", "rating": 4.5, "reviews": 100, "tags": ["culture", "funeral", "traditional"], "desc": "Tanah adat dengan upacara pemakaman unik dan rumah tongkonan."},

    # Papua
    {"name": "Lake Sentani", "city": "Jayapura", "country": "Indonesia", "lat": -2.6100, "lng": 140.5500, "cat": "alam",
     "price": "mid", "rating": 4.2, "reviews": 60, "tags": ["lake", "culture", "nature"], "desc": "Danau luas dengan pemukiman tradisional di atas air."},
    {"name": "Baliem Valley", "city": "Wamena", "country": "Indonesia", "lat": -4.1000, "lng": 138.9500, "cat": "budaya",
     "price": "luxury", "rating": 4.6, "reviews": 50, "tags": ["culture", "valley", "traditional"], "desc": "Lembah pegunungan dengan suku Dani yang masih tradisional."},

    # Sumatera
    {"name": "Lake Toba", "city": "Parapat", "country": "Indonesia", "lat": 2.6846, "lng": 98.8756, "cat": "alam",
     "price": "budget", "rating": 4.4, "reviews": 220, "tags": ["lake", "volcano", "culture"], "desc": "Danau vulkanik terbesar di Asia Tenggara dengan Pulau Samosir."},
    {"name": "Bukittinggi", "city": "Bukittinggi", "country": "Indonesia", "lat": -0.3031, "lng": 100.3644, "cat": "budaya",
     "price": "budget", "rating": 4.1, "reviews": 120, "tags": ["culture", "history", "nature"], "desc": "Kota di dataran tinggi dengan Jam Gadang dan Ngarai Sianok."},
    {"name": "Harau Valley", "city": "Payakumbuh", "country": "Indonesia", "lat": -0.0100, "lng": 100.6600, "cat": "alam",
     "price": "budget", "rating": 4.3, "reviews": 70, "tags": ["valley", "waterfall", "nature"], "desc": "Lembah curam dengan air terjun dan tebing granit."},
    {"name": "Way Kambas", "city": "Lampung", "country": "Indonesia", "lat": -5.0333, "lng": 105.7167, "cat": "alam",
     "price": "budget", "rating": 4.2, "reviews": 60, "tags": ["elephant", "wildlife", "park"], "desc": "Suaka gajah sumatera dan pusat konservasi."},

    # Kalimantan
    {"name": "Tanjung Puting", "city": "Pangkalan Bun", "country": "Indonesia", "lat": -3.0000, "lng": 112.0000, "cat": "alam",
     "price": "mid", "rating": 4.5, "reviews": 90, "tags": ["orangutan", "jungle", "wildlife"], "desc": "Taman nasional dengan konservasi orangutan."},
    {"name": "Derawan Islands", "city": "Berau", "country": "Indonesia", "lat": 2.2833, "lng": 118.2500, "cat": "pantai",
     "price": "mid", "rating": 4.5, "reviews": 80, "tags": ["diving", "turtle", "island"], "desc": "Kepulauan dengan penyu hijau dan danau ubur-ubur."},

    # Maluku
    {"name": "Banda Islands", "city": "Ambon", "country": "Indonesia", "lat": -4.5500, "lng": 129.8833, "cat": "pantai",
     "price": "luxury", "rating": 4.4, "reviews": 60, "tags": ["diving", "history", "spice"], "desc": "Kepulauan rempah-rempah bersejarah dengan diving kelas dunia."},
    {"name": "Ora Beach", "city": "Seram", "country": "Indonesia", "lat": -3.1333, "lng": 128.4167, "cat": "pantai",
     "price": "mid", "rating": 4.4, "reviews": 40, "tags": ["beach", "resort", "nature"], "desc": "Pantai eksotis dengan cottage di atas air."},
]

ACHIEVEMENTS = [
    {"code": "first_review", "name": "First Review!", "desc": "Write your first review", "icon": "star", "xp": 50},
    {"code": "five_reviews", "name": "Reviewer", "desc": "Write 5 reviews", "icon": "stars", "xp": 200},
    {"code": "first_trip", "name": "Trip Planner", "desc": "Create your first trip", "icon": "suitcase", "xp": 100},
    {"code": "globetrotter", "name": "Globetrotter", "desc": "Create 5 trips", "icon": "globe", "xp": 500},
    {"code": "achievement_hunter", "name": "Achievement Hunter", "desc": "Unlock 3 achievements", "icon": "trophy", "xp": 300},
    {"code": "xp_milestone_500", "name": "500 XP", "desc": "Earn 500 XP", "icon": "zap", "xp": 100},
]


async def seed():
    engine = create_async_engine(settings.database_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        # Check if already seeded
        result = await db.execute(select(Category))
        existing_cats = result.scalars().all()
        if existing_cats:
            print(f"Database already seeded ({len(existing_cats)} categories found). Skipping.")
            return

        # Categories
        cat_map = {}
        for c in CATEGORIES:
            cat = Category(**c)
            db.add(cat)
            await db.flush()
            cat_map[cat.slug] = cat.id
            print(f"  Category: {cat.name}")

        # Destinations
        for d in DESTINATIONS:
            cat_slug = d.pop("cat")
            food = d.pop("food", [])
            customs = d.pop("customs", [])
            hidden_gems = d.pop("hidden_gems", [])
            lat = d.pop("lat")
            lng = d.pop("lng")
            desc = d.pop("desc")
            d["price_level"] = d.pop("price")
            d["rating_avg"] = d.pop("rating")
            d["review_count"] = d.pop("reviews")

            dest = Destination(
                id=uuid.uuid4(),
                category_id=cat_map[cat_slug],
                slug=d["name"].lower().replace(" ", "-"),
                latitude=lat,
                longitude=lng,
                description=desc,
                images=[f"https://source.unsplash.com/800x600/?{d['name'].lower().replace(' ', '')},indonesia"],
                local_tips={"food": food, "customs": customs, "hidden_gems": hidden_gems},
                seasonal_info={"best_months": "April-October", "avoid_months": "December-February"},
                opening_hours={"general": "08:00-17:00"},
                best_visiting_hours={"morning": "08:00-11:00", "afternoon": "15:00-17:00"},
                **d,
            )
            db.add(dest)

        # Demo user
        demo = User(
            email="demo@poca.app",
            username="demo",
            hashed_password=bcrypt.hashpw("demo123".encode(), bcrypt.gensalt()).decode(),
            preferences={"budget": "mid", "interests": ["alam", "pantai", "budaya"], "travel_style": "comfort"},
        )
        db.add(demo)

        # Achievements
        for a in ACHIEVEMENTS:
            ach = Achievement(code=a["code"], name=a["name"], description=a["desc"], icon=a["icon"], xp_reward=a["xp"])
            db.add(ach)

        await db.commit()

    print("\nSeed complete!")
    print(f"  Categories: {len(CATEGORIES)}")
    print(f"  Destinations: {len(DESTINATIONS)}")
    print(f"  Achievements: {len(ACHIEVEMENTS)}")
    print(f"\nDemo login: demo@poca.app / demo123")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
