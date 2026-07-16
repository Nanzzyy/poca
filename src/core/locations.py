"""Region/location helpers shared across services.

Kept here (not in a service module) so several services can import it without
circular dependencies. The DB stores city names (Denpasar, Badung, ...) while
users type provinces/regions (Bali, Jogja, ...), so we map region -> its cities.
"""

# Region/province keyword -> the city names actually stored on destinations.
# ponytail: hardcoded map; upgrade path = add a `region`/`province` column to
# destinations + populate from seed, then filter on that directly.
REGION_CITIES: dict[str, list[str]] = {
    "bali": ["denpasar", "badung", "tabanan", "gianyar", "klungkung",
             "karangasem", "bangli", "jembrana", "buleleng", "ubud", "kuta", "sanur",
             "uluwatu", "nusua"],
    "jogja": ["yogyakarta", "sleman", "bantul", "kulon progo", "gunung kidul"],
    "yogyakarta": ["yogyakarta", "sleman", "bantul", "kulon progo", "gunung kidul"],
    "bandung": ["bandung", "lembang"],
    "jakarta": ["jakarta"],
    "lombok": ["lombok", "mataram", "senggigi"],
    "raja ampat": ["raja ampat", "sorong", "waisai", "wayag"],
    "toba": ["parapat", "prapat", "balige", "samosir"],
    "komodo": ["labuan bajo", "komodo"],
    "labuan bajo": ["labuan bajo", "komodo"],
    "bromo": ["probolinggo", "tengger"],
    "dieng": ["banjarnegara", "wonosobo"],
    "bunaken": ["manado"],
    "derawan": ["berau", "derawan"],
    "tanah toraja": ["toraja"],
}

LOCATION_ALIASES: dict[str, str] = {
    "pulau dewata": "bali", "bali": "bali",
    "jogja": "jogja", "yogyakarta": "yogyakarta", "jogjakarta": "yogyakarta",
    "bandung": "bandung",
    "jakarta": "jakarta", "dki jakarta": "jakarta",
    "lombok": "lombok",
    "raja ampat": "raja ampat", "wayag": "raja ampat",
    "danau toba": "toba", "toba": "toba", "samosir": "toba",
    "komodo": "komodo", "labuan bajo": "labuan bajo",
    "bromo": "bromo", "gunung bromo": "bromo",
    "dieng": "dieng",
    "derawan": "derawan", "kakaban": "derawan",
    "bunaken": "bunaken",
    "tana toraja": "tanah toraja", "toraja": "tanah toraja",
}


def detect_location(msg: str) -> str | None:
    """Match a region keyword in the message; longest aliases first so
    'danau toba' wins over bare 'toba'."""
    m = " " + msg.lower() + " "
    for alias in sorted(LOCATION_ALIASES, key=len, reverse=True):
        if alias in m:
            return LOCATION_ALIASES[alias]
    return None


def cities_for(location: str | None) -> list[str] | None:
    """Return the DB city names for a detected region, or None if unknown."""
    return REGION_CITIES.get(location) if location else None
