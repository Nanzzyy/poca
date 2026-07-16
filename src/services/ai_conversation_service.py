import re

from sqlalchemy.ext.asyncio import AsyncSession
from litellm import acompletion

from src.core.config import settings
from src.core.locations import cities_for, detect_location as _detect_location
from src.repositories.destination_repo import DestinationRepository
from src.repositories.conversation_repo import ConversationRepository
from src.services.plan_service import PlanService

# Friendlier greeting/template responses (Indonesian, conversational).
GREETINGS = {
    "halo": "Halo juga! 👋 Senang ketemu kamu. Lagi kepingin liburan ke mana nih?",
    "hai": "Hai! 😊 Ceritain dong, mau jalan-jalan kemana? Biar aku bantu rencanain.",
    "hi": "Hi! Mau ngobrol soal liburan? Aku siap bantu, tinggal bilang aja.",
    "pagi": "Selamat pagi! 🌞 Ada rencana liburan hari ini?",
    "malam": "Selamat malam! 🌙 Mau ngobrolin rencana trip santai?",
}

INTRO = (
    "Hai! Aku Poca, temen liburan kamu. 🌴\n\n"
    "Tinggal cerita aja mau liburan kayak gimana — aku bisa bantu:\n"
    "• nyari destinasi yang cocok sama kamu\n"
    "• perkirakan budget & rute\n"
    "• kasih tips lokal & kuliner\n\n"
    "Gimana, ada tempat yang lagi kepikiran?"
)

KW_ALIASES = {
    "pantai": "pantai", "beach": "pantai", "laut": "pantai",
    "gunung": "gunung", "mountain": "gunung", "hiking": "gunung",
    "candi": "candi", "temple": "candi", "sejarah": "candi",
    "kuliner": "kuliner", "makan": "kuliner", "makanan": "kuliner", "food": "kuliner",
    "budaya": "budaya", "culture": "budaya",
    "alam": "alam", "nature": "alam", "hutan": "alam", "air terjun": "alam",
    "hijau": "alam", "asri": "alam", "sawah": "alam", "pohon": "alam",
    "rice": "alam", "terrace": "alam", "kebun": "alam",
    "belanja": "belanja", "shopping": "belanja",
    "hiburan": "hiburan", "waterfall": "alam",
}

# Markers that introduce something the user wants to AVOID: "bukan pantai",
# "selain gunung", etc. The word after them is read as an excluded interest.
EXCLUDE_MARKERS = ("bukan", "bukanlah", "selain", "kecuali", "jangan", "tanpa", "hindari", "bukan yang")


def _detect_keyword(msg: str) -> str | None:
    m = msg.lower()
    for k, canonical in KW_ALIASES.items():
        if k in m:
            return canonical
    return None


def _detect_exclusions(msg: str) -> list[tuple[str, str]]:
    """Interests the user wants to AVOID. Returns (canonical, matched_span)
    pairs, e.g. 'bukan pantai' -> [('pantai', 'bukan pantai')]. The span is
    returned so callers can strip it before positive-keyword detection —
    otherwise 'bukan pantai' would make _detect_keyword latch onto 'pantai'."""
    m = msg.lower()
    out: list[tuple[str, str]] = []
    for match in re.finditer(r"(?:bukanlah|bukan|selain|kecuali|jangan|tanpa|hindari)\s+([a-zA-Z]+)", m):
        canon = KW_ALIASES.get(match.group(1))
        if canon:
            out.append((canon, match.group(0)))
    return out


def _extract_query_terms(msg: str) -> list[str]:
    """Crude keyword extraction for DB search: strip common filler words, return tokens."""
    import re
    stop = {
        "saya", "mau", "nih", "dong", "tolong", "rekomendasi", "rekomend", "recommend",
        "yang", "bagus", "untuk", "di", "ke", "dari", "apa", "aja", "please", "kasih",
        "bantu", "carikan", "cari", "liburan", "vacation", "trip", "holiday", "again",
        "ada", "apa", "aja", "yg", "dgn", "dan", "atau", "ini", "itu",
    }
    tokens = re.findall(r"[a-zA-Z]+", msg.lower())
    seen: set[str] = set()
    kept: list[str] = []
    for t in tokens:
        if t in stop or len(t) < 3 or t in seen:
            continue
        seen.add(t)
        kept.append(t)
    return kept[:4]


def _detect_plan_intent(msg: str) -> bool:
    """Plan request = a duration (X hari/malam) AND a planning verb/noun."""
    m = msg.lower()
    has_duration = bool(re.search(r"\d+\s*(hari|malam|days?|nights?)", m))
    has_plan_word = bool(re.search(r"\b(buat|buatkan|susun|arrange|rencana|rencanain|jadwal|itinerary|\bplan\b|trip|rute)\b", m))
    return has_duration and has_plan_word


def _parse_budget(msg: str) -> float | None:
    m = msg.lower()
    mj = re.search(r"(\d+(?:[.,]\d+)?)\s*(juta|jt)", m)
    if mj:
        return float(mj.group(1).replace(",", ".")) * 1_000_000
    mr = re.search(r"(\d+(?:[.,]\d+)?)\s*(ribu|rb|ratus|k)", m)
    if mr:
        return float(mr.group(1).replace(",", ".")) * 1_000
    mrp = re.search(r"(?:rp\.?\s*)?(\d{6,})", m)
    if mrp:
        return float(mrp.group(1))
    return None


def _extract_plan_params(msg: str) -> dict:
    m = msg.lower()
    days = 2
    d_match = re.findall(r"(\d+)\s*(hari|days?)", m)
    if d_match:
        days = max(int(x[0]) for x in d_match)
    else:
        n_match = re.findall(r"(\d+)\s*(malam|nights?)", m)
        if n_match:
            days = max(int(x[0]) for x in n_match) + 1  # "X malam" == X+1 hari
    people = 1
    p_match = re.search(r"(\d+)\s*(orang|people|person|px)", m)
    if p_match:
        people = int(p_match.group(1))
    return {"num_days": min(max(days, 1), 7), "people": max(people, 1), "budget": _parse_budget(msg)}


def _plan_intro_fallback(plan: dict, prefs: dict) -> str:
    loc = plan.get("location") or "Indonesia"
    total = int(plan["budget_estimate"]["total"])
    return (
        f"Ini dia rencana liburan {plan['num_days']} hari di {loc} buat {plan['people']} orang! 🗺️ "
        f"Total perkiraan biaya sekitar Rp{total:,} ({plan['budget_fit']}). "
        "Cek alur tiap hari di kartu di bawah — bisa langsung kamu simpan jadi trip. 😉"
    )


class AIConversationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.conv_repo = ConversationRepository(db)
        self.dest_repo = DestinationRepository(db)

    async def generate_response(self, conversation_id: str, user_message: str) -> tuple[str, dict]:
        """Return (content, metadata). metadata may carry recommendation cards."""
        conv = await self.conv_repo.get_by_id(conversation_id)
        if not conv:
            raise ValueError("Conversation not found")

        history = conv.messages[-10:] if conv.messages else []
        context_data = conv.context_data or {}
        msg_lower = user_message.lower().strip()

        # Track preferences for richer context
        prefs = dict(context_data.get("preferences") or {})
        # Detect things to AVOID ("bukan pantai") first, and strip them so they
        # don't get read as a positive interest by _detect_keyword/_extract_query_terms.
        excl = _detect_exclusions(user_message)
        excluded_cats = list({c for c, _ in excl})
        cleaned = user_message
        for _, span in excl:
            cleaned = cleaned.replace(span, " ", 1)
        kw = _detect_keyword(cleaned)
        tokens = _extract_query_terms(cleaned)
        loc = _detect_location(cleaned)
        if kw:
            prefs["interest"] = kw
        if tokens:
            prefs["query"] = " ".join(tokens)
        if loc:
            prefs["location"] = loc
        if excluded_cats:
            prefs["exclude"] = excluded_cats
        await self.conv_repo.update_context(conversation_id, {**context_data, "preferences": prefs, "last_topic": user_message[:80]})

        meta: dict = {}

        # 1) Greetings
        for key, resp in GREETINGS.items():
            if msg_lower == key or (len(msg_lower) < 12 and key in msg_lower):
                return resp, meta
        if msg_lower in {"help", "bantu", "menu"}:
            return INTRO, meta

        # 1.5) Plan intent -> build a full multi-day itinerary (not just cards)
        if _detect_plan_intent(user_message):
            params = _extract_plan_params(user_message)
            plan, used = await PlanService(self.db).build_plan(
                num_days=params["num_days"], location=loc, budget=params["budget"],
                people=params["people"], kw=kw, excluded=excluded_cats,
            )
            if used:
                meta["plan"] = plan
                meta["recommendations"] = [_dest_card(d) for d in used]
                intro = await self._llm_wrap(history, user_message, prefs, destinations=used, plan=plan)
                return (intro or _plan_intro_fallback(plan, prefs)), meta
            # not enough destinations for the region -> fall through; the LLM/
            # fallback will honestly ask the user to confirm/narrow the region.

        # 2) Recommendation intent -> attach destination cards from DB
        wants_reco = any(w in msg_lower for w in ("rekomendasi", "rekomend", "recommend", "usul", "saran", "ajak", "ide", "tempat", "wisata"))
        keyword_interest = kw
        if wants_reco or keyword_interest or tokens or loc:
            # Try the canonical interest first, then each significant token (cascade),
            # so "pantai bagus di bali" matches beaches even though the raw phrase wouldn't.
            candidates = [kw] + tokens if kw else tokens
            # Map category names -> ids so we can apply a positive category filter
            # (e.g. "hijau" -> Alam) and exclude ones the user rejected ("bukan pantai").
            cat_map = {c.name.lower(): c.id for c in await self.dest_repo.get_categories()}
            pos_cat = cat_map.get(kw) if kw else None
            excl_cat_ids = [cat_map[e] for e in excluded_cats if e in cat_map]
            dests = await self._search_smart(
                candidates, loc=loc, category_id=pos_cat,
                exclude_category_ids=excl_cat_ids or None, size=5,
            )
            if dests:
                meta["recommendations"] = [_dest_card(d) for d in dests]
                names = ", ".join(d.name for d in dests[:3])
                tail = f", dan {dests[4].name}" if len(dests) > 4 else ""
                templated = (
                    f"{_reco_opener(keyword_interest or (tokens[0] if tokens else ''))} Ini beberapa pilihan yang cocok buat kamu: "
                    f"{names}{tail}. Langsung bisa kamu klik di kartu di bawah ya. 😉"
                )
                llm_line = await self._llm_wrap(history, user_message, prefs, destinations=dests)
                return (llm_line or templated), meta

        # 3) Budget / transport topics
        topic_text = _topic_response(msg_lower)
        if topic_text:
            llm_line = await self._llm_wrap(history, user_message, prefs)
            return llm_line or topic_text, meta

        # 5) LLM free-form (if key configured)
        if settings.ai_api_key:
            llm_line = await self._llm_wrap(history, user_message, prefs)
            if llm_line:
                return llm_line, meta

        # 6) Fallback
        return (
            "Hmm, aku belum sepenuhnya nangkap maksudnya. 😅 Coba sebutin tempat atau "
            "aktivitas yang kamu suka ya — misal \"rekomendasi pantai di Bali\" atau "
            "\"kuliner khas Bandung\". Aku bantu cariin! 🌊🍜"
        ), meta

    async def _search_smart(self, candidates: list[str], loc: str | None,
                            category_id: int | None = None,
                            exclude_category_ids: list[int] | None = None,
                            size: int = 5) -> list:
        """Location- and category-aware destination search.

        When a region is detected, every query is scoped to that region's cities
        so a generic token like 'tempat'/'wisata' can't pull in destinations from
        another province (the Bali->Lembang bug). ``category_id`` forces a
        category (e.g. Alam for "yang hijau"); ``exclude_category_ids`` drops
        categories the user rejected (e.g. Pantai for "bukan pantai"). Falls back
        to unscoped cascade only if the region yields nothing or no region."""
        loc_cities = cities_for(loc)
        kwf = dict(category_id=category_id, exclude_category_ids=exclude_category_ids)

        def _dedup(seq: list[str]) -> list[str]:
            seen: set[str] = set()
            out: list[str] = []
            for q in seq:
                if q and q not in seen:
                    seen.add(q)
                    out.append(q)
            return out

        candidates = _dedup(candidates)

        # 1) When a category constraint is in play (positive or excluded), prefer a
        #    broad category filter over q-narrowing — otherwise "yang hijau" only
        #    returns spots whose description literally contains "alam" (often just
        #    one), instead of all Alam destinations in the region.
        if category_id or exclude_category_ids:
            if loc_cities:
                dests, _ = await self.dest_repo.search(cities=loc_cities, size=size, **kwf)
                if dests:
                    return list(dests)
            dests, _ = await self.dest_repo.search(size=size, **kwf)
            if dests:
                return list(dests)

        # 2) keyword/token queries scoped to the detected region
        if loc_cities:
            for q in candidates:
                dests, _ = await self.dest_repo.search(q=q, cities=loc_cities, size=size, **kwf)
                if dests:
                    return list(dests)
            dests, _ = await self.dest_repo.search(cities=loc_cities, size=size, **kwf)
            if dests:
                return list(dests)

        # 3) unscoped cascade (original behaviour) — fallback / no region
        for q in candidates:
            dests, _ = await self.dest_repo.search(q=q, size=size, **kwf)
            if dests:
                return list(dests)
        return []

    async def _llm_wrap(self, history, user_message, prefs, destinations=None, plan=None) -> str | None:
        if not settings.ai_api_key:
            return None
        loc = (prefs or {}).get("location")
        system_prompt = (
            "Kamu adalah Poca, teman liburan AI yang asik, ramah, dan ngerti gaya bicara anak "
            "Indonesia. Jawab pakai Bahasa Indonesia yang santai tapi sopan, hangat, tidak kaku. "
            "Emoji secukupnya. Pahami konteks percakapan sebelumnya dan maksud user. "
            "Fokus cuma di travel, liburan, destinasi, budget, kuliner, budaya, dan transport. "
            "Di luar itu, tolak ramah dan arahkan balik ke topik liburan. "
            "Jawaban ringkas (maksimal ~150 kata).\n"
            "ATURAN ANTI-HALUSINASI (sangat penting):\n"
            "- Kalau ada daftar destinasi di bawah, dasari jawabanmu HANYA pada tempat di daftar "
            "itu. Sebut dan deskripsikan hanya tempat yang ADA di daftar — JANGAN namakan destinasi "
            "lain yang tidak ada di daftar, seakan-akan itu bagian dari rekomendasi.\n"
            "- Kalau user menyebut lokasi/daerah, pastikan setiap destinasi yang kamu sebut benar-benar "
            f"berada di lokasi tersebut{f' (user menulis: {loc})' if loc else ''}. Kalau daftar tidak cocok dengan lokasi yang user minta, bilang jujur bahwa kandidat di database terbatas, jangan pura-pura cocok.\n"
            "- Jangan mengarang angka spesifik (harga/jarak/jadwal pasti). Gunakan kata 'perkiraan' atau sarankan cek info terkini.\n"
            "- Jawab harus lengkap dan terpotong di tengah kalimat."
        )
        if destinations:
            lines = []
            for i, d in enumerate(destinations, 1):
                bits = [str(d.name)]
                if getattr(d, "city", None):
                    bits.append(str(d.city))
                cat = getattr(d, "category", None)
                if cat and getattr(cat, "name", None):
                    bits.append(f"kategori:{cat.name}")
                if d.description:
                    bits.append((d.description[:150] or "").strip())
                lines.append(f"{i}. " + " — ".join(bits))
            system_prompt += (
                "\n\nDAFTAR DESTINASI (card yang akan ditampilkan ke user). Jawabanmu HARUS "
                "mengacu pada tempat-tempat ini saja, jangan sebut destinasi lain:\n"
                + "\n".join(lines)
            )
        if plan:
            day_lines = []
            for day in plan.get("days", []):
                acts = ", ".join(f"{a['time']} {a['name']}" for a in day["activities"])
                day_lines.append(f"Hari {day['day']}: {acts}")
            total = int(plan["budget_estimate"]["total"])
            system_prompt += (
                "\n\nRENCANA LIBURAN (sudah disusun, akan tampil sebagai kartu rencana ke user). "
                "Tuliskan intro hangat & ringkas yang menarasikan rencana ini: sebutkan alur per hari "
                "dan aktivitas NYATA yang ada di daftar di bawah, plus 1-2 tips praktis. JANGAN "
                "tambah destinasi di luar daftar. Sebut totalnya sebagai 'perkiraan'.\n"
                f"Total perkiraan Rp{total:,} ({plan['budget_fit']}).\n"
                + "\n".join(day_lines)
            )
        llm_messages = [{"role": "system", "content": system_prompt}]
        for m in history:
            llm_messages.append({"role": m.role, "content": m.content})
        llm_messages.append({"role": "user", "content": user_message})
        try:
            # max_tokens tinggi: deepseek-v4-flash adalah model reasoning — reasoning_content
            # ikut memakan budget, jadi 300 memotong jawaban asli di tengah.
            resp = await acompletion(
                model=settings.ai_model, api_key=settings.ai_api_key,
                messages=llm_messages, max_tokens=1200, temperature=0.5,
            )
            return (resp.choices[0].message.content or "").strip() or None
        except Exception:
            return None


def _dest_card(d) -> dict:
    images = list(d.images or [])
    return {
        "id": str(d.id),
        "name": d.name,
        "city": d.city,
        "country": d.country,
        "rating_avg": float(d.rating_avg or 0),
        "review_count": int(d.review_count or 0),
        "price_level": d.price_level,
        "image": images[0] if images and "source.unsplash" not in images[0] else None,
        "category_name": d.category.name if getattr(d, "category", None) else None,
    }


def _reco_opener(interest: str) -> str:
    openers = {
        "pantai": "Wah, pantai nih! 🏖️ Tenang, aku punya beberapa yang worth it.",
        "gunung": "Suka naik gunung ya? 🏔️ Ini daftar yang view-nya juara.",
        "candi": "Buat kamu yang suka sejarah, candi-candi ini wajib kunjung. 🏛️",
        "kuliner": "Lapar nih kayaknya! 🍜 Ini tempat makan yang recommended.",
        "budaya": "Pengen nyelam budaya? 🎭 Coba yang ini.",
        "alam": "Cari yang hijau dan sejuk? 🌲 Aku pilihin yang calming.",
        "belanja": "Mau belanja ya? 🛍️ Ini spot yang lengkap.",
        "hiburan": "Cari hiburan? 🎉 Ini seru buat kamu.",
    }
    return openers.get(interest, "Oke, berdasarkan yang kamu mau, ini rekomendasi terbaikku. ✨")


def _topic_response(msg_lower: str) -> str | None:
    if any(w in msg_lower for w in ("budget", "biaya", "berapa", "harga", "murah")):
        return (
            "Tergantung gaya liburan kamu nih. 💰\n\n"
            "🟢 **Hemat**: Rp200-400rb/hari — penginapan budget, makan warung, transport umum.\n"
            "🟡 **Sedang**: Rp500-900rb/hari — hotel mid, restoran, sewa motor/gojek.\n"
            "🔴 **Mewah**: Rp1,5jt+/hari — resort, fine dining, private transport.\n\n"
            "Mau aku perkirakan lebih spesifik untuk destinasi tertentu? Sebut aja tempatnya. 😊"
        )
    if any(w in msg_lower for w in ("transport", "transportasi", "cara ke", "naik apa", "rute")):
        return (
            "Untuk keliling Indonesia: ✈️ pesawat antar pulau paling cepat, 🚂 kereta nyaman "
            "di Pulau Jawa, 🚌 bus paling hemat, 🛵 sewa motor fleksibel (Rp70-150rb/hari), "
            "dan Gojek/Grab ada di kota besar. Mau aku bantu susun rute dari kota kamu? 🚗"
        )
    return None
