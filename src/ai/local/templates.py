"""Response template engine — replaces LLM narration for 50-60% of responses."""

import random
from typing import Any


class ResponseTemplates:
    """Deterministic response templates for common AI interactions."""

    # ── Greeting templates ──────────────────────────────────────────
    GREETINGS = [
        "Halo {name}! Mau liburan ke mana nih? 🌴",
        "Hai {name}! Ada rencana liburan yang mau dibahas? ✈️",
        "Hey {name}! Siap explore destinasi baru? 🗺️",
        "Halo {name}! Lagi nyari tempat wisata seru? Cerita aja!",
        "Hai {name}! Mau dibantu bikin rencana perjalanan? 🏖️",
    ]

    HELP = (
        "Halo! Aku Poca, teman seperjalanan kamu 🌴\n\n"
        "Aku bisa bantu:\n"
        "• **Rekomendasi destinasi** — ceritain minatmu, aku cariin tempat yang cocok\n"
        "• **Buat rencana perjalanan** — itinerary lengkap dengan estimasi budget\n"
        "• **Tips liburan** — soal budget, penginapan, kuliner, transport\n\n"
        "Coba ketik: \"pantai di Bali\" atau \"buatkan plan 3 hari di Jogja\""
    )

    # ── Recommendation intro templates (per category) ───────────────
    RECO_INTROS: dict[str, list[str]] = {
        "pantai": [
            "Wah, pantai nih! 🏖️ {location} punya beberapa pilihan keren:",
            "Ombak dan pasir menanti! Ini rekomendasi pantai di {location}:",
            "Suka laut ya? Ini dia pantai-pantai asik di {location}:",
        ],
        "gunung": [
            "Pecinta gunung! ⛰️ {location} punya trek yang mantap:",
            "Siap-siap hiking! Ini gunung dan bukit di {location}:",
        ],
        "kuliner": [
            "Siap-siap ngiler! 🍜 Ini kuliner wajib di {location}:",
            "Perut keroncongan? {location} punya banyak pilihan enak:",
            "Buat food lover, ini dia kuliner top di {location}:",
        ],
        "alam": [
            "Buat pecinta alam, {location} juara banget 🌿",
            "Hijau dan segar! Ini destinasi alam di {location}:",
            "Mau healing? {location} punya tempat alam yang menenangkan:",
        ],
        "candi": [
            "Suka sejarah? {location} punya situs bersejarah yang menarik 🏛️",
            "Jelajahi jejak masa lalu di {location}:",
        ],
        "budaya": [
            "Kekayaan budaya {location} luar biasa! Ini yang wajib dikunjungi 🎭",
            "Mau merasakan budaya lokal? Ini rekomendasi di {location}:",
        ],
        "belanja": [
            "Siap shopping? 🛍️ Ini tempat belanja seru di {location}:",
        ],
        "petualangan": [
            "Buat yang suka tantangan! ⚡ Ini adventure di {location}:",
            "Adrenalin junkie? Coba aktivitas seru di {location}:",
        ],
        "default": [
            "Ini beberapa destinasi menarik di {location}:",
            "Cek tempat-tempat keren di {location} ini:",
            "Ada banyak yang bisa dieksplor di {location}! Contohnya:",
        ],
    }

    # ── Plan templates ──────────────────────────────────────────────
    PLAN_FIT_MESSAGES = {
        "hemat": "Masih ada sisa Rp{sisa:,} — bisa ditabung atau dipakai shopping! 🎉",
        "pas": "Budget-nya pas banget! 👌",
        "over": "Agak over budget Rp{sisa:,}, tapi bisa disesuaikan kok. Kurangi aktivitas atau ganti opsi yang lebih hemat 💡",
        "estimasi": "Ini estimasi kasar ya, bisa disesuaikan sesuai kebutuhan.",
    }

    PLAN_APPROVED = (
        "Rencana **{days} hari di {location}** sudah tersimpan! 🎉\n\n"
        "Total perkiraan: **Rp{budget:,}** ({fit_message})\n\n"
        "Kamu bisa lihat detailnya di menu **Trips** ya. Selamat liburan! ✈️"
    )

    # ── Topic response templates ────────────────────────────────────
    TOPIC_RESPONSES: dict[str, str] = {
        "budget": (
            "Tips budget liburan 💰\n\n"
            "• **Budget tier** (< Rp300rb/hari): hostel, street food, transport umum\n"
            "• **Mid tier** (Rp300rb-1jt/hari): hotel bintang 2-3, restoran lokal, ojol\n"
            "• **Luxury** (> Rp1jt/hari): resort, fine dining, private transport\n\n"
            "TIPS: Selalu siapkan dana darurat 10-15% dari total budget. "
            "Mau aku buatkan rencana perjalanan sesuai budgetmu?"
        ),
        "accommodation": (
            "Tips penginapan 🏨\n\n"
            "• **Backpacker**: hostel/guesthouse Rp100-200rb/malam\n"
            "• **Mid-range**: hotel bintang 2-3 Rp300-700rb/malam\n"
            "• **Luxury**: resort/villa Rp1jt+/malam\n\n"
            "TIPS: Booking jauh-jauh hari untuk harga lebih murah. "
            "Mau cari penginapan di daerah tertentu?"
        ),
        "food": (
            "Tips kuliner 🍜\n\n"
            "• **Street food**: Rp15-50rb/porsi — rasa autentik, harga bersahabat\n"
            "• **Restoran lokal**: Rp50-150rb/porsi — nyaman, porsi besar\n"
            "• **Fine dining**: Rp200rb+/porsi — pengalaman premium\n\n"
            "TIPS: Coba makanan lokal daripada restoran chain — lebih murah dan autentik! "
            "Mau rekomendasi kuliner di daerah tertentu?"
        ),
        "transport": (
            "Tips transportasi 🚗\n\n"
            "• **Ojek online**: Rp10-30rb — cepat dan praktis\n"
            "• **Transport umum**: Rp5-15rb — paling murah\n"
            "• **Sewa motor**: Rp70-100rb/hari — fleksibel\n"
            "• **Sewa mobil + supir**: Rp300-500rb/hari — nyaman untuk grup\n\n"
            "TIPS: Untuk jarak dekat, jalan kaki atau naik sebisa lebih hemat. "
            "Mau hitung estimasi transport untuk perjalananmu?"
        ),
    }

    # ── Clarification templates (state machine) ─────────────────────
    CLARIFICATION = {
        "location": "Mau liburan ke mana nih? 🗺️ Ceritain daerah atau kotanya ya.",
        "days": "Berapa hari mau liburan? (contoh: 3 hari)",
        "people": "Berapa orang yang ikut? (contoh: 2 orang)",
        "budget": "Budget-nya berapa? (contoh: 5 juta, 500rb)",
        "interest": "Ada minat khusus? (contoh: pantai, kuliner, alam, budaya)",
    }

    # ── Edit response templates ─────────────────────────────────────
    EDIT_RESPONSES = {
        "no_plan": "Belum ada rencana yang bisa diedit. Mau buat rencana baru dulu?",
        "ambiguous": "Mau diubah bagian apa? Coba sebutkan:\n• Durasi (\"tambah 1 hari\")\n• Budget (\"ubah budget jadi 3 juta\")\n• Lokasi (\"ganti ke Lombok\")\n• Minat (\"fokus ke kuliner\")",
        "ask_budget": "Budget baru yang kamu inginkan berapa? (contoh: 1,5 juta atau Rp2.000.000)",
        "ask_days": "Mau jadi berapa hari? (contoh: 3 hari)",
        "ask_people": "Mau untuk berapa orang? (contoh: 2 orang)",
        "ask_location": "Mau ganti ke lokasi mana? (contoh: Lombok atau Jogja)",
        "ask_category": "Mau fokus ke minat apa? (contoh: alam, pantai, atau kuliner)",
        "cancelled": "Rencana dibatalkan. Tidak ada perubahan atau trip yang disimpan. Kalau mau, kita bisa buat rencana baru.",
        "cancelled_no_plan": "Tidak ada rencana aktif yang perlu dibatalkan.",
        "days_added": "Siap! Rencana sudah ditambah jadi {days} hari. Cek perubahannya ya! 📝",
        "budget_changed": "Budget sudah diubah jadi Rp{budget:,}. Rencana sudah disesuaikan! 💰",
        "location_changed": "Oke, rencana sudah diganti ke {location}! 📍",
    }

    # ── Fallback ────────────────────────────────────────────────────
    FALLBACK = (
        "Maaf, aku belum sepenuhnya nangkap maksudnya. "
        "Coba tanya tentang:\n"
        "• Destinasi wisata (\"pantai di Bali\")\n"
        "• Rencana perjalanan (\"buatkan plan 3 hari di Jogja\")\n"
        "• Tips liburan (\"budget makan di Bali\")"
    )

    OUT_OF_SCOPE = (
        "Hehe, aku fokusnya soal liburan dan traveling aja nih 🌴\n"
        "Mau tanya soal destinasi, budget, atau rencana perjalanan?"
    )

    # ── Static methods for generating responses ─────────────────────

    @staticmethod
    def greeting(name: str | None = None) -> str:
        display = name or "Traveler"
        return random.choice(ResponseTemplates.GREETINGS).format(name=display)

    @staticmethod
    def recommendation_intro(category: str, location: str) -> str:
        intros = ResponseTemplates.RECO_INTROS.get(
            category, ResponseTemplates.RECO_INTROS["default"]
        )
        return random.choice(intros).format(location=location.title())

    @staticmethod
    def narrate_recommendations(
        destinations: list[dict[str, Any]],
        category: str,
        location: str,
    ) -> str:
        """Generate recommendation text without LLM."""
        intro = ResponseTemplates.recommendation_intro(category, location)
        items = []
        for d in destinations[:5]:
            cat = d.get("category_name", "")
            city = d.get("city", "")
            rating = d.get("rating_avg", 0)
            star = f" ⭐{rating:.1f}" if rating > 0 else ""
            items.append(f"• **{d['name']}** — {city} ({cat}){star}")
        return f"{intro}\n\n" + "\n".join(items)

    @staticmethod
    def narrate_plan(plan: dict[str, Any]) -> str:
        """Generate plan narration without LLM."""
        loc = plan.get("location", "destinasi").title()
        lines = [f"Rencana **{plan['num_days']} hari di {loc}** 🗺️\n"]

        for day in plan.get("days", []):
            lines.append(f"**Hari {day['day']}:**")
            for act in day.get("activities", []):
                cost_str = f"Rp{act['cost']:,}" if act.get("cost") else "Gratis"
                time_str = act.get("time", "")
                name = act.get("name", "")
                lines.append(f"  {time_str} — {name} ({cost_str})")
            lines.append("")

        budget_est = plan.get("budget_estimate", {})
        total = budget_est.get("total", 0)
        fit = plan.get("budget_fit", "estimasi")
        lines.append(f"**Total perkiraan: Rp{total:,} ({fit})**")

        fit_msg = ResponseTemplates.PLAN_FIT_MESSAGES.get(fit, "")
        if fit_msg and fit != "estimasi":
            sisa = abs(plan.get("budget_delta", 0))
            lines.append(f"\n{fit_msg.format(sisa=sisa)}")

        return "\n".join(lines)

    @staticmethod
    def plan_approved(plan: dict[str, Any]) -> str:
        budget_est = plan.get("budget_estimate", {})
        total = budget_est.get("total", 0)
        fit = plan.get("budget_fit", "estimasi")
        fit_msg = ResponseTemplates.PLAN_FIT_MESSAGES.get(fit, "")
        sisa = abs(plan.get("budget_delta", 0))
        return ResponseTemplates.PLAN_APPROVED.format(
            days=plan.get("num_days", "?"),
            location=plan.get("location", "destinasi").title(),
            budget=total,
            fit_message=fit_msg.format(sisa=sisa) if fit_msg else fit,
        )

    @staticmethod
    def topic_response(topic: str) -> str:
        return ResponseTemplates.TOPIC_RESPONSES.get(topic, ResponseTemplates.FALLBACK)

    @staticmethod
    def clarification(field: str) -> str:
        return ResponseTemplates.CLARIFICATION.get(
            field, "Bisa kasih info lebih detail?"
        )

    @staticmethod
    def edit_response(action: str, **kwargs: Any) -> str:
        template = ResponseTemplates.EDIT_RESPONSES.get(action, ResponseTemplates.FALLBACK)
        return template.format(**kwargs) if kwargs else template
