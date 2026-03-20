# Plan: Fix Capitalisation Bug + Improve Enhancement Headers

## Context

After testing the enhance feature, two issues surfaced:

1. **Weird mid-sentence capitalisation** — "thinking Of like", "functionality For free", "inspired By good notes" — random words capitalised incorrectly
2. **Headers are meaningless** — "Highlighter · Features · Like" and "Things · Like · Kind" don't summarise sections at all

---

## Root Causes

### Capitalisation bug — `python/transcribe.py:65`

```python
text = text[0].upper() + text[1:] if len(text) > 1 else text.upper()
```

This force-capitalises the first character of **every whisper segment**. But whisper segments are arbitrary audio chunks, not sentence boundaries. When a segment starts with "of", "for", or "by", they become "Of", "For", "By".

**Fix:** Remove the per-segment force-capitalisation entirely. Whisper's `base.en` model already produces correctly-cased English. Only capitalise the very first character of each **paragraph** (after all sentences are joined), as a safety net.

### Missing filler words — `python/cleanup.py`

The filler word list only has: um, uh, you know, whatnot, whatsoever, I mean.

Missing the most common speech fillers:
- **"like"** (as a discourse filler, not as a verb/preposition)
- **"kind of"**, **"sort of"**
- **"basically"**, **"literally"**
- **"right"**, **"yeah"** (as standalone interjections)

Since "like" appears in nearly every sentence of spoken English, TF-IDF treats it as a highly distinctive keyword — hence it dominates headers.

**Challenge with "like":** It's also a legitimate verb ("I like this idea") and preposition ("something like a wiki"). We need word-boundary-aware patterns that target the filler usage specifically:
- Remove "like" only when preceded by a space and followed by a space (not as the main verb of a clause)
- Safe patterns: standalone "like" at sentence start, "like" before a noun phrase without being the main verb

For MVP, removing standalone filler "like" (surrounded by spaces, not at end of sentence) is sufficient. Some false positives are acceptable since the enhanced view is optional.

### TF-IDF can't summarise — `python/clustering.py`

TF-IDF picks **statistically rare words**, not **meaningful topic labels**. Even with fillers removed, it would produce "Highlighter · Monetization · Premium" — better but still not a coherent summary.

**Fix:** Replace TF-IDF with **KeyBERT**. KeyBERT uses the sentence-transformers model we already have to find the keyphrase whose **embedding is most similar** to the whole section's embedding. This means it picks the phrase that best represents the section's meaning, not just the rarest word.

Example improvement:
- TF-IDF: "Highlighter · Features · Like"
- KeyBERT: "Monetization Models" or "Highlighter Monetization"

KeyBERT reuses our existing `all-MiniLM-L6-v2` model — no new model download. Just `pip install keybert`.

---

## Step-by-Step Changes

### Step 1 — Fix capitalisation in `python/transcribe.py`

- **Remove line 65** (the per-segment `text[0].upper()` line)
- After joining sentences into a paragraph (line 72), capitalise the first character of the paragraph text only
- This preserves whisper's natural mid-sentence casing while ensuring paragraph starts are capitalised

### Step 2 — Expand filler list in `python/cleanup.py`

Add these patterns (before the existing ones, longest-first):
```python
r"\bkind\s+of\b\s*",
r"\bsort\s+of\b\s*",
r"\bbasically\b,?\s*",
r"\bliterally\b,?\s*",
r"\blike\b\s+",  # "like" followed by space (filler usage)
```

Also add standalone interjections at sentence boundaries:
```python
r"^yeah\s*,?\s*",   # "Yeah" at sentence start
r"\byeah$",         # "yeah" at sentence end
r"^right\s*,?\s*",  # "Right" at sentence start
r"^so\s*,?\s*",     # "So" at sentence start (discourse marker)
```

### Step 3 — Replace TF-IDF with KeyBERT in `python/clustering.py`

- Add `keybert` to `python/requirements.txt`
- In `_make_header()`, replace TF-IDF scoring with:
  ```python
  from keybert import KeyBERT
  kw_model = KeyBERT(model=embed_model)
  keywords = kw_model.extract_keywords(
      section_text,
      keyphrase_ngram_range=(1, 3),
      stop_words="english",
      top_n=1,
  )
  # → [("monetization models", 0.65)]
  ```
- Reuse the existing `_embed_model` (passed to KeyBERT) — no new model
- Remove `TfidfVectorizer` import and all TF-IDF code
- Title-case the extracted keyphrase as the header

### Step 4 — Also fix capitalisation in `python/cleanup.py:31-32`

The cleanup module also force-capitalises the first character of every cleaned sentence. This re-introduces the same bug. Remove this — capitalisation should only happen at the paragraph level in `transcribe.py`.

---

## Files to Modify

| File | Change |
|------|--------|
| `python/transcribe.py` | Remove per-segment capitalisation (line 65), add per-paragraph capitalisation |
| `python/cleanup.py` | Expand filler list, remove per-sentence force-capitalisation |
| `python/clustering.py` | Replace TF-IDF with KeyBERT for header generation |
| `python/requirements.txt` | Add `keybert` |

No frontend changes needed — the response shape stays the same.

---

## Verification

1. Restart Python service
2. Transcribe the same `.wma` file used for current3.md
3. Check raw transcript: no more random mid-sentence capitals ("Of", "For", "By" should be lowercase)
4. Click Enhance: headers should be meaningful keyphrases, not keyword soup
5. Filler words ("like", "kind of") should be removed from enhanced text
6. Toggle Original/Enhanced still works as before
