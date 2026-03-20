# 003 — Timestamps & Display Improvements

**Date:** 2026-03-20
**Commit:** `431fdb6` feat: implemented timestamps for transcript
**Plan:** [docs/plans/transcript-display-improvements.md](../plans/transcript-display-improvements.md)

## Summary

Surfaced Whisper's segment timestamps in the UI, added paragraph grouping logic, and implemented clipboard features (auto-copy on selection + copy-all button).

## Files modified

| File | Change |
|------|--------|
| `python/transcribe.py` | Added paragraph assembly — groups segments by pause threshold (1.5s) and max sentences (5). Returns structured `{text, paragraphs: [{text, start, end, sentences}], duration_seconds}` |
| `components/DropZone.tsx` | Render `[MM:SS]` timestamps per paragraph/sentence, copy-all button, auto-copy on text selection |

## Files created

| File | Purpose |
|------|---------|
| `docs/samples/current.md` | Snapshot of transcription output for comparison |
| `docs/samples/reference.md` | Hand-edited reference showing target quality |

## Key decisions

- **Pause threshold 1.5s** — forces paragraph break on silence, preserves natural speech patterns
- **Max 5 sentences per paragraph** — prevents wall-of-text paragraphs
- **Capitalize first char only** at paragraph level, not per-segment (avoids mid-sentence caps)
