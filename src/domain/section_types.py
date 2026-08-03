SECTION_TYPES = {
    "hero-gallery": {
        "name": "Hero Gallery",
        "icon": "image",
        "fields": [
            {"key": "images", "type": "asset[]", "label": "Gallery Images", "max": 10},
            {"key": "title", "type": "text", "label": "Title Override"},
            {"key": "subtitle", "type": "text", "label": "Subtitle"},
            {"key": "overlay", "type": "select", "label": "Overlay Style", "options": ["gradient", "dark", "light", "none"]},
        ],
    },
    "rich-text": {
        "name": "Rich Text",
        "icon": "type",
        "fields": [
            {"key": "heading", "type": "text", "label": "Heading"},
            {"key": "body", "type": "textarea", "label": "Content"},
            {"key": "alignment", "type": "select", "label": "Alignment", "options": ["left", "center"]},
        ],
    },
    "info-cards": {
        "name": "Info Cards",
        "icon": "info",
        "fields": [
            {
                "key": "cards",
                "type": "card[]",
                "label": "Cards",
                "max": 6,
                "item_fields": [
                    {"key": "icon", "type": "icon", "label": "Icon"},
                    {"key": "label", "type": "text", "label": "Label"},
                    {"key": "value", "type": "text", "label": "Value"},
                ],
            },
        ],
    },
    "image-grid": {
        "name": "Image Gallery Grid",
        "icon": "grid",
        "fields": [
            {"key": "images", "type": "asset[]", "label": "Images", "max": 20},
            {"key": "columns", "type": "number", "label": "Columns", "min": 2, "max": 4, "default": 3},
            {"key": "lightbox", "type": "boolean", "label": "Lightbox Preview", "default": True},
        ],
    },
    "timeline": {
        "name": "Itinerary Timeline",
        "icon": "clock",
        "fields": [
            {"key": "heading", "type": "text", "label": "Section Heading"},
            {
                "key": "items",
                "type": "timeline-item[]",
                "label": "Timeline Items",
                "item_fields": [
                    {"key": "time", "type": "text", "label": "Time"},
                    {"key": "title", "type": "text", "label": "Title"},
                    {"key": "desc", "type": "textarea", "label": "Description"},
                    {"key": "image", "type": "asset", "label": "Image (optional)"},
                ],
            },
        ],
    },
    "guide-cards": {
        "name": "Local Guide Cards",
        "icon": "map-pin",
        "fields": [
            {
                "key": "cards",
                "type": "guide-card[]",
                "label": "Guide Cards",
                "max": 4,
                "item_fields": [
                    {"key": "icon_type", "type": "select", "label": "Type", "options": ["food", "customs", "gems", "transport", "safety"]},
                    {"key": "title", "type": "text", "label": "Title"},
                    {"key": "body", "type": "textarea", "label": "Content"},
                    {"key": "link_text", "type": "text", "label": "Link Text"},
                ],
            },
        ],
    },
    "cta-banner": {
        "name": "Call-to-Action Banner",
        "icon": "megaphone",
        "fields": [
            {"key": "heading", "type": "text", "label": "Heading"},
            {"key": "subtext", "type": "text", "label": "Subtext"},
            {"key": "button_text", "type": "text", "label": "Button Text"},
            {"key": "button_url", "type": "url", "label": "Button URL"},
            {"key": "bg_image", "type": "asset", "label": "Background Image"},
            {"key": "bg_color", "type": "color", "label": "Background Color"},
        ],
    },
    "map": {"name": "Map", "icon": "map", "fields": [], "auto": True},
    "reviews": {"name": "Reviews", "icon": "star", "fields": [], "auto": True},
}
