"""Rule-based hybrid intent classifier with confidence scoring.

Replaces regex-based detection in ai_conversation_service.py with a structured
decision tree. Confidence < threshold → fallback to LLM.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum

from src.core.locations import detect_location


class Intent(Enum):
    GREETING = "greeting"
    HELP = "help"
    PLAN_CREATE = "plan_create"
    PLAN_EDIT = "plan_edit"
    PLAN_CANCEL = "plan_cancel"
    RECOMMEND = "recommend"
    BUDGET_QUERY = "budget_query"
    HOTEL_QUERY = "hotel_query"
    FOOD_QUERY = "food_query"
    TRANSPORT_QUERY = "transport_query"
    CHITCHAT = "chitchat"
    UNKNOWN = "unknown"


@dataclass
class ClassificationResult:
    intent: Intent
    confidence: float
    params: dict = field(default_factory=dict)

    @property
    def is_confident(self) -> bool:
        return self.confidence >= IntentClassifier.CONFIDENCE_THRESHOLD


class IntentClassifier:
    """Rule-based hybrid intent classifier for Indonesian tourism chat."""

    CONFIDENCE_THRESHOLD = 0.70

    # ── Keyword sets ────────────────────────────────────────────────

    _GREETINGS = {
        "halo", "hai", "hey", "hi", "helo", "hello",
        "pagi", "siang", "sore", "malam", "selamat",
        "assalamualaikum", "salam", "woi", "bro", "sis",
    }

    _HELP_KEYWORDS = {"help", "bantu", "bantuan", "menu", "fitur", "apa yang bisa", "gimana cara"}

    _PLAN_VERBS = {
        "buat", "buatkan", "susun", "susunin", "rencana", "rencanain",
        "jadwal", "itinerary", "plan", "trip", "rute", "arrange",
        "tolong buat", "tolong susun", "dong",
    }

    _EDIT_VERBS = {
        "ubah", "edit", "ganti", "tambah", "hapus", "kurangi",
        "perbarui", "update", "revisi", "rubah", "tolong ubah",
    }

    _PLAN_REFS = {
        "rencana", "plan", "itinerary", "jadwal", "trip", "rute",
        "yang tadi", "sebelumnya", "yang barusan",
    }

    _CANCEL_KEYWORDS = {
        "batal", "batalkan", "batalin", "cancel", "cancelkan",
        "hapus rencana", "jangan jadi", "tidak jadi", "gak jadi",
        "nggak jadi", "hapus plan",
    }

    _CATEGORY_KEYWORDS: dict[str, list[str]] = {
        "pantai": ["pantai", "beach", "laut", " laut", "surfing", "snorkeling", "diving", "selancar"],
        "gunung": ["gunung", "mountain", "hiking", "trekking", "pendakian", "bukit"],
        "kuliner": ["kuliner", "makan", "makanan", "food", "restoran", "warung", "cafe", "jajanan", "wisata kuliner"],
        "alam": ["alam", "nature", "hutan", "air terjun", "waterfall", "danau", "sungai", "taman nasional"],
        "candi": ["candi", "temple", "sejarah", "heritage", "situs", "bersejarah", "historical"],
        "budaya": ["budaya", "culture", "tradisi", "adat", "seni", "tari", "upacara", "festival"],
        "belanja": ["belanja", "shopping", "mall", "pasar", "souvenir", "oleh-oleh"],
        "petualangan": ["petualangan", "adventure", "extreme", "arung jeram", "rafting", "zipline", "paralayang"],
    }

    _BUDGET_KEYWORDS = {"budget", "biaya", "harga", "tarif", "cost", "anggaran", "murah", "mahal", "hemat", "mahal"}
    _HOTEL_KEYWORDS = {"hotel", "penginapan", "inap", "homestay", "villa", "resort", "hostel", "motel", "inap", "nginap", "menginap", "stay"}
    _FOOD_KEYWORDS = {"makan", "makanan", "kuliner", "restoran", "warung", "cafe", "jajanan", "enak", "food", "sarapan", "makan siang", "makan malam"}
    _TRANSPORT_KEYWORDS = {"transport", "transportasi", "ojek", "taksi", "bus", "kereta", "pesawat", "sewa mobil", "sewa motor", "jalan", "rute", "arah"}

    # ── Regex patterns ──────────────────────────────────────────────

    _RE_DURATION = re.compile(r"(\d+)\s*(hari|malam|days?|nights?)", re.I)
    _RE_PLAN_VERB = re.compile(
        r"\b(" + "|".join(re.escape(v) for v in _PLAN_VERBS) + r")\b", re.I
    )
    _RE_EDIT_VERB = re.compile(
        r"\b(" + "|".join(re.escape(v) for v in _EDIT_VERBS) + r")\b", re.I
    )
    _RE_PLAN_REF = re.compile(
        r"\b(" + "|".join(re.escape(r) for r in _PLAN_REFS) + r")\b", re.I
    )
    _RE_PEOPLE = re.compile(r"(\d+)\s*(orang|people|person|pax)", re.I)
    _RE_BUDGET_JUTA = re.compile(r"(\d+(?:[.,]\d+)?)\s*(juta|jt)", re.I)
    _RE_BUDGET_RIBU = re.compile(r"(\d+(?:[.,]\d+)?)\s*(ribu|rb|ratus|k)\b", re.I)
    _RE_BUDGET_RP = re.compile(r"(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+)", re.I)
    _RE_BUDGET_RAW = re.compile(r"(?:rp\.?\s*)?(\d{4,})")
    _RE_EXCLUSION = re.compile(
        r"(?:bukanlah|bukan|selain|kecuali|jangan|tanpa|hindari)\s+([a-zA-Z\u00C0-\u024F]+)",
        re.I,
    )

    # ── Main classifier ─────────────────────────────────────────────

    def classify(self, message: str, context: dict | None = None) -> ClassificationResult:
        msg = message.lower().strip()
        ctx = context or {}

        # 1. Greeting
        if self._is_greeting(msg):
            return ClassificationResult(Intent.GREETING, 0.99)

        # 2. Help
        if self._is_help(msg):
            return ClassificationResult(Intent.HELP, 0.99)

        # Cancellation must win over edit/create keywords. It is destructive
        # to the current draft and must never rebuild a plan.
        if self._is_plan_cancel(msg):
            return ClassificationResult(Intent.PLAN_CANCEL, 0.99)

        # A reply to a pending edit (for example, "3 juta" after the AI asked
        # for a new budget) is an edit even without an edit verb.
        pending_field = ctx.get("pending_edit")
        if pending_field:
            pending_params = self._extract_pending_edit_value(msg, pending_field, ctx)
            if pending_params:
                return ClassificationResult(Intent.PLAN_EDIT, 0.95, pending_params)

        # 3. Plan create
        plan_params = self._extract_plan_params(msg)
        has_duration = plan_params.pop("has_duration", False)
        has_plan_verb = plan_params.pop("has_plan_verb", False)
        if has_duration and has_plan_verb:
            return ClassificationResult(Intent.PLAN_CREATE, 0.95, plan_params)

        # 4. Plan edit
        if self._is_plan_edit(msg, ctx):
            edit_params = self._extract_edit_params(msg, ctx)
            return ClassificationResult(Intent.PLAN_EDIT, 0.90, edit_params)

        # 5. Category-based recommendation
        cat_match = self._match_category(msg)
        if cat_match:
            params: dict = {"category": cat_match}
            loc = detect_location(msg)
            if loc:
                params["location"] = loc
            params.update(self._extract_query_params(msg))
            return ClassificationResult(Intent.RECOMMEND, 0.85, params)

        # 6. Budget query
        if self._matches_any(msg, self._BUDGET_KEYWORDS):
            return ClassificationResult(Intent.BUDGET_QUERY, 0.80, {"location": detect_location(msg)})

        # 7. Hotel query
        if self._matches_any(msg, self._HOTEL_KEYWORDS):
            return ClassificationResult(Intent.HOTEL_QUERY, 0.80, {"location": detect_location(msg)})

        # 8. Food query
        if self._matches_any(msg, self._FOOD_KEYWORDS):
            return ClassificationResult(Intent.FOOD_QUERY, 0.80, {"location": detect_location(msg)})

        # 9. Transport query
        if self._matches_any(msg, self._TRANSPORT_KEYWORDS):
            return ClassificationResult(Intent.TRANSPORT_QUERY, 0.80, {"location": detect_location(msg)})

        # 10. Location + question → recommend
        loc = detect_location(msg)
        if loc and self._is_question(msg):
            params = {"location": loc}
            cat = self._match_category(msg)
            if cat:
                params["category"] = cat
            return ClassificationResult(Intent.RECOMMEND, 0.60, params)

        # 11. Plan verb without duration (still plan intent, lower confidence)
        if has_plan_verb and not has_duration:
            return ClassificationResult(Intent.PLAN_CREATE, 0.65, plan_params)

        # 12. Unknown
        return ClassificationResult(Intent.UNKNOWN, 0.30)

    # ── Private helpers ─────────────────────────────────────────────

    def _is_greeting(self, msg: str) -> bool:
        tokens = msg.split()
        if len(tokens) <= 3:
            return any(g in msg for g in self._GREETINGS)
        return False

    def _is_help(self, msg: str) -> bool:
        return any(kw in msg for kw in self._HELP_KEYWORDS)

    def _is_plan_edit(self, msg: str, ctx: dict) -> bool:
        has_edit = bool(self._RE_EDIT_VERB.search(msg))
        has_ref = bool(self._RE_PLAN_REF.search(msg))
        has_concrete_change = bool(
            self._RE_DURATION.search(msg)
            or self._RE_BUDGET_JUTA.search(msg)
            or self._RE_PEOPLE.search(msg)
            or self._detect_edit_field(msg)
        )
        # Classify explicit edit requests even without a current plan so the
        # service can respond "no active plan" instead of treating them as a
        # generic budget/topic question.
        return has_edit and (has_ref or has_concrete_change)

    def _is_plan_cancel(self, msg: str) -> bool:
        return any(
            re.search(r"\b" + re.escape(keyword) + r"\b", msg)
            for keyword in self._CANCEL_KEYWORDS
        )

    def _detect_edit_field(self, msg: str) -> str | None:
        if re.search(r"\b(budget|anggaran|biaya|dana|harga)\b", msg):
            return "budget"
        if re.search(r"\b(hari|durasi|malam|lama)\b", msg):
            return "days"
        if re.search(r"\b(orang|peserta|pax)\b", msg):
            return "people"
        if re.search(r"\b(lokasi|kota|tempat|tujuan)\b", msg):
            return "location"
        if re.search(r"\b(minat|fokus|kategori|aktivitas)\b", msg):
            return "category"
        return None

    def _match_category(self, msg: str) -> str | None:
        """Match category keywords, return canonical category name or None."""
        for cat, keywords in self._CATEGORY_KEYWORDS.items():
            if any(kw in msg for kw in keywords):
                return cat
        return None

    def _matches_any(self, msg: str, keywords: set[str]) -> bool:
        return any(kw in msg for kw in keywords)

    def _is_question(self, msg: str) -> bool:
        question_markers = ["?", "apa", "dimana", "di mana", "kapan", "bagaimana",
                           "gimana", "mana", "rekomendasi", "saran", "ada gak", "ada nggak"]
        return any(m in msg for m in question_markers)

    # ── Parameter extraction ────────────────────────────────────────

    def _extract_plan_params(self, msg: str) -> dict:
        params: dict = {}

        # Duration
        m = self._RE_DURATION.search(msg)
        if m:
            num = int(m.group(1))
            unit = m.group(2).lower()
            if "malam" in unit or "night" in unit:
                num += 1
            params["num_days"] = max(1, min(num, 7))
            params["has_duration"] = True
        else:
            params["has_duration"] = False

        # Plan verb
        params["has_plan_verb"] = bool(self._RE_PLAN_VERB.search(msg))

        # People
        m = self._RE_PEOPLE.search(msg)
        if m:
            params["people"] = max(1, min(int(m.group(1)), 10))

        # Budget
        budget = self._parse_budget(msg)
        if budget:
            params["budget"] = budget

        # Location
        loc = detect_location(msg)
        if loc:
            params["location"] = loc

        # Exclusions
        excl = self._RE_EXCLUSION.findall(msg)
        if excl:
            params["excluded"] = excl

        # Category interest
        cat = self._match_category(msg)
        if cat:
            params["category"] = cat

        return params

    def _extract_edit_params(self, msg: str, ctx: dict) -> dict:
        params: dict = {}
        last_plan = ctx.get("last_plan", {})
        field = self._detect_edit_field(msg)
        if field:
            params["edit_field"] = field

        # Duration change
        m = self._RE_DURATION.search(msg)
        if m:
            num = int(m.group(1))
            unit = m.group(2).lower()
            if "malam" in unit or "night" in unit:
                num += 1
            # "tambah 1 hari" / "kurangi 1 hari" are relative changes;
            # "ubah jadi 4 hari" is an absolute target.
            if re.search(r"\b(tambah|naik|perpanjang)\b", msg) and not re.search(r"\b(jadi|menjadi)\b", msg):
                num = int(last_plan.get("num_days", 1)) + num
            elif re.search(r"\b(kurangi|turun|pendekkan)\b", msg) and not re.search(r"\b(jadi|menjadi)\b", msg):
                num = int(last_plan.get("num_days", 2)) - num
            params["new_days"] = max(1, min(num, 7))

        # People change
        m = self._RE_PEOPLE.search(msg)
        if m:
            params["new_people"] = max(1, min(int(m.group(1)), 10))

        # Budget change
        budget = self._parse_budget(msg)
        if budget:
            params["new_budget"] = budget

        # Location change
        loc = detect_location(msg)
        if loc and loc != (last_plan.get("location") or ""):
            params["new_location"] = loc

        # Category change
        cat = self._match_category(msg)
        if cat:
            params["new_category"] = cat

        return params

    def _extract_pending_edit_value(self, msg: str, field: str, ctx: dict) -> dict:
        """Parse a value-only answer to the previous edit question."""
        params: dict = {"edit_field": field}
        if field == "budget":
            value = self._parse_budget(msg)
            if value:
                params["new_budget"] = value
        elif field == "days":
            match = self._RE_DURATION.search(msg)
            if match:
                value = int(match.group(1))
                if "malam" in match.group(2).lower() or "night" in match.group(2).lower():
                    value += 1
                params["new_days"] = max(1, min(value, 7))
        elif field == "people":
            match = self._RE_PEOPLE.search(msg)
            if match:
                params["new_people"] = max(1, min(int(match.group(1)), 10))
        elif field == "location":
            location = detect_location(msg)
            if location:
                params["new_location"] = location
        elif field == "category":
            category = self._match_category(msg)
            if category:
                params["new_category"] = category
        return params if any(k.startswith("new_") for k in params) else {}

    def _extract_query_params(self, msg: str) -> dict:
        params: dict = {}
        excl = self._RE_EXCLUSION.findall(msg)
        if excl:
            params["excluded"] = excl
        loc = detect_location(msg)
        if loc:
            params["location"] = loc
        return params

    def _parse_budget(self, msg: str) -> int | None:
        """Parse Indonesian budget expressions to integer IDR."""
        # "5 juta" / "5 jt"
        m = self._RE_BUDGET_JUTA.search(msg)
        if m:
            return int(float(m.group(1).replace(",", ".")) * 1_000_000)

        # "200 ribu" / "200 rb" / "200k"
        m = self._RE_BUDGET_RIBU.search(msg)
        if m:
            return int(float(m.group(1).replace(",", ".")) * 1_000)

        # "Rp 200.000"
        m = self._RE_BUDGET_RP.search(msg)
        if m:
            return int(m.group(1).replace(".", "").replace(",", ""))

        # "200000"
        m = self._RE_BUDGET_RAW.search(msg)
        if m:
            return int(m.group(1))

        return None
