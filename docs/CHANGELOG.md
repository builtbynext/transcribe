# Changelog

All notable changes to this project are documented here.
Each entry links to its plan file and implementation notes for full traceability.

---

## [Unreleased] — Local LLM Integration

**Plan:** [docs/plans/immutable-frolicking-rivest.md](plans/immutable-frolicking-rivest.md)
**Implementation notes:** [docs/changes/005-local-llm-integration.md](changes/005-local-llm-integration.md)

- Add local LLM models to improve enhance quality
- Replace KeyBERT section headers with flan-t5-large summarization
- Add grammar correction via vennify/t5-base-grammar-correction
- Increase enhance API timeout from 30s to 120s for CPU inference

---

## [0.4.0] — 2026-03-20 — Enhancement Feature

**Commit:** `69d4b50` feat: implement enhancement feature to transcript
**Plan:** [docs/plans/enumerated-humming-prism.md](plans/enumerated-humming-prism.md)
**Implementation notes:** [docs/changes/004-enhancement-feature.md](changes/004-enhancement-feature.md)

- Add `/enhance` endpoint for post-processing transcripts
- Filler word removal (cleanup.py) — "um", "uh", "like", "you know", etc.
- Semantic clustering of paragraphs using SentenceTransformer + Agglomerative Clustering
- Section header generation via KeyBERT keyphrase extraction
- Enhanced view toggle in frontend (Original / Enhanced)
- New dependencies: sentence-transformers, scikit-learn, keybert

---

## [0.3.0] — 2026-03-20 — Timestamps & Display

**Commit:** `431fdb6` feat: implemented timestamps for transcript
**Plan:** [docs/plans/transcript-display-improvements.md](plans/transcript-display-improvements.md)
**Implementation notes:** [docs/changes/003-timestamps-display.md](changes/003-timestamps-display.md)

- Surface Whisper segment timestamps in the UI
- Paragraph grouping with pause detection (1.5s threshold) and max 5 sentences
- Formatted `[MM:SS]` timestamps per paragraph and sentence
- Auto-copy on text selection
- "Copy all" button for full transcript

---

## [0.2.0] — 2026-03-20 — Transcription Feature

**Commit:** `f4b86e8` feat: implemented transcribe feature
**Plan:** [docs/plans/wma-transcription-upload.md](plans/wma-transcription-upload.md)
**Implementation notes:** [docs/changes/002-transcription-feature.md](changes/002-transcription-feature.md)

- Drag-and-drop .wma file upload via DropZone component
- FFmpeg audio conversion (WMA to 16kHz mono WAV)
- Whisper base.en transcription (faster-whisper, CPU, int8)
- Python FastAPI backend on port 8001
- Next.js API route proxy at /api/transcribe
- DRM-protected file detection

---

## [0.1.0] — 2026-03-20 — Project Setup

**Commit:** `f8f7348` first commit
**Implementation notes:** [docs/changes/001-project-setup.md](changes/001-project-setup.md)

- Next.js 16.2.0 with React 19, Tailwind CSS 4, TypeScript 5
- Initial project structure and configuration
