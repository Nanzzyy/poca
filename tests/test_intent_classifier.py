"""Unit tests for the rule-based intent classifier (ARCH-08)."""
from src.ai.local.intent_classifier import Intent, IntentClassifier


def test_greeting_detected():
    r = IntentClassifier().classify("halo")
    assert r.intent == Intent.GREETING
    assert r.is_confident


def test_help_detected():
    r = IntentClassifier().classify("bantu saya")
    assert r.intent == Intent.HELP


def test_plan_create_with_days_and_verb():
    r = IntentClassifier().classify("buatkan rencana 3 hari di Bali")
    assert r.intent == Intent.PLAN_CREATE
    assert r.params["num_days"] == 3
    assert r.params["location"] == "bali"


def test_budget_juta_parsing():
    r = IntentClassifier().classify("buatkan plan 2 hari di Bali budget 1,5 juta untuk 2 orang")
    assert r.intent == Intent.PLAN_CREATE
    assert r.params["budget"] == 1_500_000
    assert r.params["people"] == 2


def test_budget_ribu_parsing():
    r = IntentClassifier().classify("buatkan plan 2 hari budget 200 ribu")
    assert r.params["budget"] == 200_000


def test_parse_budget_raw_number():
    c = IntentClassifier()
    assert c._parse_budget("rp 1.500.000") == 1_500_000
    assert c._parse_budget("budget 50000") == 50000


def test_budget_query_intent():
    r = IntentClassifier().classify("berapa budget ke Bali?")
    assert r.intent == Intent.BUDGET_QUERY


def test_category_recommendation():
    r = IntentClassifier().classify("rekomendasi pantai di Bali")
    assert r.intent == Intent.RECOMMEND
    assert r.params["category"] == "pantai"


def test_negative_constraint_exclusion():
    r = IntentClassifier().classify("wisata hijau bukan pantai di Bali")
    assert "pantai" in r.params.get("excluded", [])


def test_cancel_wins_over_edit():
    r = IntentClassifier().classify("batalkan rencana ini", {"last_plan": {"num_days": 2}})
    assert r.intent == Intent.PLAN_CANCEL


def test_pending_edit_value_followup():
    classifier = IntentClassifier()
    first = classifier.classify("ubah budget", {"last_plan": {"num_days": 2}})
    assert first.intent == Intent.PLAN_EDIT
    assert first.params == {"edit_field": "budget"}
    second = classifier.classify("3 juta", {"last_plan": {"num_days": 2}, "pending_edit": "budget"})
    assert second.params["new_budget"] == 3_000_000


def test_unknown_returns_low_confidence():
    r = IntentClassifier().classify("xyzzy")
    assert r.intent == Intent.UNKNOWN
    assert not r.is_confident
