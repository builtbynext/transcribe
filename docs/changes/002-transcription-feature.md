# 002 — Transcription Feature

**Date:** 2026-03-20
**Commit:** `f4b86e8` feat: implemented transcribe feature
**Plan:** [docs/plans/wma-transcription-upload.md](../plans/wma-transcription-upload.md)

## Summary

Built the core transcription pipeline: drag-and-drop .wma upload in the browser, proxied through Next.js to a Python FastAPI backend that converts audio via FFmpeg and transcribes with Whisper.

## Architecture

Two services:
- **Next.js (port 3000)** — frontend UI + API route proxy
- **Python FastAPI (port 8001)** — audio conversion + Whisper transcription

## Files created

| File | Purpose |
|------|---------|
| `components/DropZone.tsx` | Drag-and-drop upload UI with state machine (idle → processing → done → error) |
| `app/api/transcribe/route.ts` | Next.js proxy to Python `/transcribe` endpoint |
| `python/main.py` | FastAPI app with startup model loading and `/transcribe` endpoint |
| `python/transcribe.py` | FFmpeg WMA→WAV conversion + faster-whisper transcription |
| `python/requirements.txt` | faster-whisper, fastapi, uvicorn, python-multipart |
| `AGENTS.md` | Project conventions and documentation rules |

## Key decisions

- **Whisper base.en** — English-only, ~140M params, CPU with int8 quantization for zero-cost operation
- **Faster-whisper** over standard whisper — CTranslate2 backend, ~4x faster on CPU
- **DRM detection** — FFmpeg error parsing to catch protected .wma files early
