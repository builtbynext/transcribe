# 005 — Local LLM Integration

**Date:** 2026-03-20
**Status:** Uncommitted
**Plan:** [docs/plans/immutable-frolicking-rivest.md](../plans/immutable-frolicking-rivest.md)

## Summary

Integrate locally-hosted LLM models into the enhance pipeline to improve transcript output quality. Replaces KeyBERT keyword extraction with instruction-tuned summarization for section headers, and adds grammar correction as a post-processing step.

## What Changed

### Original plan vs actual

The original plan called for `facebook/bart-large-cnn` (400M params, summarization model). During implementation, testing revealed BART does not work well for transcripts:

- **Text correction:** BART passes input through unchanged — it was trained for summarization, not denoising/grammar correction.
- **Header generation:** BART does extractive summarization (copies first sentence) instead of generating abstract topic labels.

Pivoted to two purpose-built models that tested well:

| Task | Planned Model | Actual Model | Why |
|------|--------------|--------------|-----|
| Headers | facebook/bart-large-cnn | google/flan-t5-large (783M) | Instruction-tuned — responds to "Give a short 2-4 word title:" prompts |
| Grammar | facebook/bart-large-cnn | vennify/t5-base-grammar-correction (297M) | Fine-tuned specifically for grammar correction |

### Files created

| File | Purpose |
|------|---------|
| `python/bart.py` | Model loading (`load_bart_model`), text correction (`correct_text`), header generation (`summarize_header`) |

### Files modified

| File | Change |
|------|--------|
| `python/main.py` | Import and load models at startup; add `correct_text()` step in `/enhance` endpoint after filler cleanup |
| `python/clustering.py` | `_make_header()` now calls `summarize_header()` from bart.py, falls back to KeyBERT if model unavailable |
| `python/requirements.txt` | Added `transformers>=4.40.0`, `torch>=2.2.0` |
| `app/api/enhance/route.ts` | `maxDuration` increased from 30 to 120 (CPU inference is slower) |

### No files modified

- No frontend component changes — response shape from `/enhance` is unchanged
- No changes to `cleanup.py` — regex filler removal still runs as the first step

## Enhance pipeline (before → after)

```
BEFORE:
  cleanup.py (filler removal) → clustering.py (cluster + KeyBERT headers) → return

AFTER:
  cleanup.py (filler removal) → bart.py correct_text() → clustering.py (cluster) → bart.py summarize_header() → return
```

## Verified test results

```
Header generation:
  Input section: "When I think about starting this annotation and highlighter tool,
                  I am considering different possibilities for monetization..."
  KeyBERT output:  "Like · Channel · Thinking"
  flan-t5 output:  "How To Monetize A Highlighter Tool"

Grammar correction:
  Input:  "since I dont want to overcomplicate things Id rather keep it free"
  Output: "since I don't want to overcomplicate things, I'd rather keep it free"
```

## Performance impact

| Metric | Before | After |
|--------|--------|-------|
| Startup time | ~10s | ~20-30s (two new models load) |
| Enhance time | ~3s | ~30-90s (CPU inference) |
| Memory (Python process) | ~500MB | ~1.5-2GB |
| First-run download | — | ~4GB (models cached in ~/.cache/huggingface/) |

## Dependencies added

- `transformers>=4.40.0` — HuggingFace model loading and inference
- `torch>=2.2.0` — PyTorch backend for model inference (CPU)
