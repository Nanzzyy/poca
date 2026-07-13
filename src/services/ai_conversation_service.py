from sqlalchemy.ext.asyncio import AsyncSession
from litellm import acompletion

from src.core.config import settings
from src.repositories.destination_repo import DestinationRepository
from src.repositories.conversation_repo import ConversationRepository


# Smart template responses — no API key needed for basic functionality
TEMPLATE_RESPONSES = {
    "halo": "Halo! 👋 Saya siap bantu kamu merencanakan liburan. Mau ke mana?",
    "hai": "Hai! Ada yang bisa saya bantu soal perjalanan kamu?",
    "help": "Saya bisa bantu: rekomendasi destinasi, rencana perjalanan, estimasi budget, info kuliner & budaya lokal. Coba tanya: \"rekomendasi pantai di Bali\" atau \"budget 3 hari di Yogyakarta\"",
}

def _check_templates(msg: str) -> str | None:
    msg_lower = msg.lower().strip()
    # Direct template matches
    for key, resp in TEMPLATE_RESPONSES.items():
        if key in msg_lower:
            return resp
    return None

def _generate_template_response(msg: str, context_data: dict) -> str:
    msg_lower = msg.lower()

    if "rekomendasi" in msg_lower or "recommend" in msg_lower or "rekomend" in msg_lower:
        keywords = ["pantai", "gunung", "candi", "budaya", "alam", "kuliner", "belanja"]
        for kw in keywords:
            if kw in msg_lower:
                return (
                    f"Saya rekomendasikan destinasi **{kw}** favorit:\n\n"
                    f"🏖️ **Pantai Kuta** — sunset dan surfing, budget mid\n"
                    f"🏛️ **Candi Borobudur** — candi Buddha terbesar, budget mid\n"
                    f"🌋 **Gunung Bromo** — sunrise spektakuler, budget mid\n\n"
                    f"Mau lihat detail salah satunya? Atau saya bantu buat rencana perjalanan?"
                )
        return (
            "Berikut rekomendasi destinasi populer:\n\n"
            "1. 🏖️ **Bali** — pantai, budaya, resort\n"
            "2. 🏛️ **Yogyakarta** — candi, sejarah, kuliner\n"
            "3. 🌋 **Gunung Bromo** — sunrise petualangan\n"
            "4. 🏝️ **Raja Ampat** — diving kelas dunia\n"
            "5. 🏞️ **Labuan Bajo** — komodo, pink beach\n\n"
            "Mau saya bantu cari destinasi spesifik? Coba sebutkan preferensi kamu!"
        )

    if "budget" in msg_lower or "biaya" in msg_lower or "berapa" in msg_lower:
        return (
            "💰 **Estimasi Budget Liburan (per orang/hari):**\n\n"
            "**Budget:** 🟢 Rp200-400rb/hari\n"
            "  - Penginapan: Rp100-200rb\n"
            "  - Makan: Rp50-100rb\n"
            "  - Transport: Rp30-50rb\n\n"
            "**Mid:** 🟡 Rp500-900rb/hari\n"
            "  - Penginapan: Rp300-500rb\n"
            "  - Makan: Rp150-250rb\n"
            "  - Transport: Rp50-100rb\n\n"
            "**Mewah:** 🔴 Rp1.5jt+/hari\n"
            "  - Penginapan: Rp1jt+\n"
            "  - Makan: Rp400rb+\n"
            "  - Transport: Rp200rb+\n\n"
            "Mau saya hitung budget spesifik untuk trip kamu?"
        )

    if "makan" in msg_lower or "kuliner" in msg_lower or "food" in msg_lower:
        return (
            "🍽️ **Kuliner Indonesia yang Wajib Dicoba:**\n\n"
            "🥘 **Nasi Goreng** — ikon kuliner Indonesia\n"
            "🍢 **Sate** — tusuk daging dengan bumbu kacang\n"
            "🥟 **Gado-gado** — sayur rebus dengan saus kacang\n"
            "🍛 **Rendang** — daging sapi berbumbu rempah\n"
            "🥞 **Martabak** — manis gurih, cocok untuk cemilan\n\n"
            "Tiap daerah punya makanan khas! Mau saya sebutkan kuliner khas daerah tertentu?"
        )

    if "transport" in msg_lower or "travel" in msg_lower or "cara" in msg_lower:
        return (
            "🚗 **Tips Transportasi di Indonesia:**\n\n"
            "✈️ **Pesawat** — tercepat antar pulau, banyak promo\n"
            "🚂 **Kereta** — nyaman untuk Jawa (Jakarta-Surabaya)\n"
            "🚌 **Bus** — ekonomis, tersedia di semua kota\n"
            "🛵 **Sewa Motor** — fleksibel, Rp70-150rb/hari\n"
            "🚕 **Ride-hailing** — Gojek/Grab di kota besar\n\n"
            "Saran: kombinasikan transportasi sesuai budget dan jadwal!"
        )

    if "candi" in msg_lower or "temple" in msg_lower or "sejarah" in msg_lower:
        return (
            "🏛️ **Candi Terbaik di Indonesia:**\n\n"
            "🪷 **Borobudur** — Magelang, candi Buddha terbesar di dunia\n"
            "🕉️ **Prambanan** — Sleman, candi Hindu megah\n"
            "🌊 **Tanah Lot** — Bali, pura di atas batu karang\n"
            "⛰️ **Uluwatu** — Bali, pura di tebing selatan\n"
            "☀️ **Besakih** — Bali, pura ibu di lereng Gunung Agung\n\n"
            "Mau info lebih detail tentang salah satu?"
        )

    if "map" in msg_lower or "peta" in msg_lower or "lokasi" in msg_lower:
        return (
            "🗺️ Kamu bisa lihat peta interaktif dengan semua destinasi di halaman **Map** (ikon peta di navigasi).\n\n"
            "Fitur map:\n"
            "📍 Markir destinasi dengan kategori berbeda\n"
            "🔍 Cari tempat di sekitar lokasi tertentu\n"
            "ℹ️ Klik marker untuk lihat info singkat\n\n"
            "Atau kamu mau rekomendasi berdasarkan lokasi spesifik?"
        )

    # Default: use DB context if available
    return None


class AIConversationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.conv_repo = ConversationRepository(db)
        self.dest_repo = DestinationRepository(db)

    async def generate_response(self, conversation_id: str, user_message: str) -> str:
        conv = await self.conv_repo.get_by_id(conversation_id)
        if not conv:
            raise ValueError("Conversation not found")

        messages = conv.messages[-10:] if conv.messages else []
        context_data = conv.context_data or {}

        # Try template responses first (works without API key, zero cost)
        template_check = _check_templates(user_message)
        if template_check:
            await self.conv_repo.update_context(conversation_id, {
                **context_data,
                "last_topic": user_message[:50],
            })
            return template_check

        template_response = _generate_template_response(user_message, context_data)
        if template_response:
            await self.conv_repo.update_context(conversation_id, {
                **context_data,
                "last_topic": user_message[:50],
            })
            return template_response

        # Fallback: search DB for relevant destinations
        dests, _ = await self.dest_repo.search(q=user_message, size=3)
        if dests:
            response = "🗺️ **Destinasi yang mungkin kamu cari:**\n\n"
            for d in dests:
                response += f"📍 **{d.name}** ({d.city})\n"
                response += f"   ⭐ {d.rating_avg} | 💰 {d.price_level} | 📍 {d.latitude:.2f}, {d.longitude:.2f}\n"
                if d.description:
                    response += f"   {d.description[:100]}...\n"
                response += "\n"
            response += "Klik salah satu di hasil pencarian untuk detail lengkap, atau tanya saya lebih lanjut!"
            return response

        # Try LLM only if API key is configured
        if settings.ai_api_key:
            destinations_context = ""
            if context_data.get("preferences"):
                prefs = context_data["preferences"]
                dests2, _ = await self.dest_repo.search(
                    q=prefs.get("query", ""),
                    size=5,
                )
                if dests2:
                    destinations_context = "\nRelevant destinations:\n" + "\n".join(
                        f"- {d.name} ({d.city}, {d.country}) — rating {d.rating_avg}, {d.price_level}"
                        for d in dests2[:5]
                    )

            system_prompt = f"""You are a helpful AI tourism companion for Indonesia. Help users plan trips.
Current preferences: {context_data.get('preferences', 'not collected')}
{destinations_context}
Keep responses concise under 200 words."""
            llm_messages = [{"role": "system", "content": system_prompt}]
            for msg in messages:
                llm_messages.append({"role": msg.role, "content": msg.content})
            llm_messages.append({"role": "user", "content": user_message})

            try:
                response = await acompletion(
                    model=settings.ai_model,
                    messages=llm_messages,
                    max_tokens=300,
                    temperature=0.7,
                )
                return response.choices[0].message.content or ""
            except Exception:
                pass

        # Last resort
        return (
            "Terima kasih sudah bertanya! 🙏\n\n"
            "Saya bisa bantu kamu dengan:\n"
            "• 🔍 **Cari destinasi** — sebutkan nama tempat\n"
            "• 💰 **Info budget** — tanya soal biaya perjalanan\n"
            "• 🍽️ **Rekomendasi kuliner** — makanan khas daerah\n"
            "• 🗺️ **Rencana perjalanan** — bantu susun itinerary\n\n"
            "Atau kamu bisa langsung lihat destinasi di halaman **Explore**!"
        )
