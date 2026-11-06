"""MED-03 — a destination `name` was interpolated unescaped into a SPARQL
string literal sent to Wikidata. An admin-controlled name containing a
double quote could break out of the literal and alter the query."""
from src.services.free_places_service import _escape_sparql_string


def test_escapes_double_quote():
    assert _escape_sparql_string('X" } UNION { ?item wdt:P000 ?leak } #') == \
        'X\\" } UNION { ?item wdt:P000 ?leak } #'


def test_escapes_backslash_before_quote():
    assert _escape_sparql_string('a\\"b') == 'a\\\\\\"b'


def test_passthrough_plain_name():
    assert _escape_sparql_string("Pantai Kuta") == "Pantai Kuta"


def test_escaped_name_cannot_break_out_of_literal():
    malicious = 'X" } UNION { ?x ?y ?z } #'
    escaped = _escape_sparql_string(malicious)
    query_fragment = f'?item rdfs:label "{escaped}"@id .'
    # Strip escaped quotes (\"), then only the two literal delimiters
    # (opening and closing) should remain as unescaped `"`.
    without_escaped_quotes = query_fragment.replace('\\"', "")
    assert without_escaped_quotes.count('"') == 2
