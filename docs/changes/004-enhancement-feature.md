# 004 — Enhancement Feature

**Date:** 2026-03-20
**Commit:** `69d4b50` feat: implement enhancement feature to transcript
**Plan:** [docs/plans/enumerated-humming-prism.md](../plans/enumerated-humming-prism.md)

## Summary

Added a post-processing "Enhance" step that cleans up filler words, clusters paragraphs into semantic sections, and generates topic headers using KeyBERT.

## Files created

| File | Purpose |
|------|---------|
| `python/cleanup.py` | Regex-based filler word removal — "um", "uh", "like", "you know", "kind of", "sort of", etc. Also fixes stutters and excess whitespace |
| `python/clustering.py` | Paragraph embedding (SentenceTransformer all-MiniLM-L6-v2), agglomerative clustering (Ward linkage, ~1 cluster per 3 paragraphs), KeyBERT header generation |
| `app/api/enhance/route.ts` | Next.js proxy to Python `/enhance` endpoint |

## Files modified

| File | Change |
|------|--------|
| `python/main.py` | Added `/enhance` endpoint, `load_embed_model()` at startup |
| `python/transcribe.py` | Minor adjustments to support enhance flow |
| `components/DropZone.tsx` | Added Enhanced view toggle (Original / Enhanced), renders sections with headers |
| `python/requirements.txt` | Added sentence-transformers, scikit-learn, keybert |

## Known issues (at time of commit)

- Section headers were keyword soup — "Like · Channel · Thinking" instead of meaningful topic labels
- This was the motivation for the subsequent local LLM integration (change 005)
