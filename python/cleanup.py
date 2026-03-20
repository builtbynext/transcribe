import re

# Filler phrases ordered longest-first so multi-word patterns match before single words.
# Each pattern removes the filler and any trailing comma + space.
_FILLER_PATTERNS = [
    # Multi-word phrases first
    r"\byou\s+know\s+what\s+I\s+mean\b,?\s*",
    r"\byou\s+know\b,?\s*",
    r"\bkind\s+of\b\s*",
    r"\bsort\s+of\b\s*",
    r"\bI\s+mean\b,?\s*",
    r"\bwhatsoever\b\s*",
    r"\bwhatnot\b,?\s*",
    r"\bbasically\b,?\s*",
    r"\bliterally\b,?\s*",
    # "like" as a filler — followed by a space (avoids stripping verb/preposition "like")
    r"\blike\b\s+",
    # Single-word interjections
    r"\b(um+|uh+)\b,?\s*",
]

# Sentence-boundary interjections (applied separately with ^ / $ anchors)
_BOUNDARY_PATTERNS = [
    r"^yeah\s*,?\s*",   # "Yeah so I was thinking..." → "So I was thinking..."
    r"\s*yeah\.?$",      # "...and that's it yeah" → "...and that's it"
    r"^right\s*,?\s*",  # "Right so the idea is..." → "So the idea is..."
    r"^so\s*,?\s+",     # "So I was thinking..." → "I was thinking..."
]

_STUTTER_RE = re.compile(r"\b(\w+)(\s+\1)+\b", re.IGNORECASE)
_MULTI_SPACE_RE = re.compile(r"\s{2,}")
_SPACE_BEFORE_PUNCT_RE = re.compile(r"\s+([.,!?;:])")


def clean_sentence(text: str) -> str:
    """Remove filler words and fix stutters from a single sentence."""
    # Fix stutters: "I I was" → "I was"
    text = _STUTTER_RE.sub(r"\1", text)

    # Remove mid-sentence fillers
    for pattern in _FILLER_PATTERNS:
        text = re.sub(pattern, " ", text, flags=re.IGNORECASE)

    # Remove boundary interjections
    for pattern in _BOUNDARY_PATTERNS:
        text = re.sub(pattern, "", text, flags=re.IGNORECASE)

    # Tidy whitespace
    text = _MULTI_SPACE_RE.sub(" ", text).strip()
    text = _SPACE_BEFORE_PUNCT_RE.sub(r"\1", text)

    return text
