# Plan: WMA Transcription Upload

## Context
Build a drag-and-drop web app on the existing Next.js 16.2.0 project that accepts a `.wma` audio file and returns clean, readable transcribed text. Goal is zero marginal cost using locally-hosted open source models — no paid AI APIs.

## Architecture

**Two services:**
- **Next.js 16.2 (port 3000)** — frontend + thin proxy Route Handler
- **Python FastAPI (port 8001)** — transcription pipeline

**Pipeline:** `.wma` upload → ffmpeg → 16kHz mono WAV → faster-whisper `base.en` → timestamp-based paragraph splitting → tidy text → JSON response

## Stack Decisions

| Concern | Choice | Reason |
|---|---|---|
| Audio conversion | ffmpeg (already installed at `/opt/homebrew/bin/ffmpeg`) | Only tool that handles all WMA variants (wmav1, wmav2, wmapro, wmalossless) |
| Transcription | faster-whisper `base.en` (74MB) | $0 cost, runs on CPU with int8, 2-4x faster than original Whisper |
| Text tidying | Rule-based using segment timestamps | Whisper outputs decent punctuation; gaps >1.5s between segments → paragraph breaks |
| Backend | Python FastAPI microservice | faster-whisper is Python-native; cleaner than Node subprocess; runs independently |

**Why not whisper.cpp?** Node bindings are poorly maintained and require native compilation — fragile across Node versions.
**Why not OpenAI Whisper API?** Costs $0.006/min; defeats the zero-cost goal.
**Why not text-cleanup models (deepmultilingualpunctuation, rpunct)?** Whisper already outputs punctuation; timestamp-based paragraph splitting is better and requires no extra model.

## Project Structure Changes

```
app/
  api/transcribe/route.ts     NEW — proxy Route Handler (nodejs runtime, 30min maxDuration)
  page.tsx                    REPLACE — server wrapper that renders <DropZone />
components/
  DropZone.tsx                NEW — 'use client' drag-and-drop state machine
python/
  main.py                     NEW — FastAPI app, startup model preload, CORS to localhost:3000
  transcribe.py               NEW — ffmpeg conversion + faster-whisper + paragraph tidy
  requirements.txt            NEW — pip dependencies
next.config.ts                UPDATE — raise body size limit to 200mb
```

## Key Implementation Details

### Python pipeline (`python/transcribe.py`)
- Module-level model singleton loaded once at FastAPI startup via `@app.on_event("startup")`
- ffmpeg command: `ffmpeg -i input.wma -ar 16000 -ac 1 -c:a pcm_s16le output.wav`
  - 16kHz: exactly what Whisper was trained on (higher = wasted CPU, no quality gain)
  - mono: Whisper processes mono internally anyway
- `tempfile.TemporaryDirectory()` — auto-cleanup on error
- Paragraph splitting: group segments where gap between end/start > 1.5s
- ffmpeg path: `shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"`

### FastAPI app (`python/main.py`)
- `POST /transcribe` — multipart/form-data, field `file`
- CORS: `http://localhost:3000` only
- Response: `{ text: string, paragraphs: string[], duration_seconds: number }`
- Errors: 422 for non-.wma, 500 with message for pipeline failures
- Model preloaded at startup — first request won't block on 30s download

### Next.js Route Handler (`app/api/transcribe/route.ts`)
- `export const runtime = 'nodejs'` — Edge runtime cannot reach localhost
- `export const maxDuration = 1800` — handles 2hr recordings
- Validates `.wma` extension, forwards to `http://localhost:8001/transcribe`

### next.config.ts
```typescript
experimental: {
  serverActions: { bodySizeLimit: '200mb' }
}
```

### DropZone component state machine (`components/DropZone.tsx`)
```
idle → processing ("Converting audio..." → "Transcribing speech..." → "Tidying text...") → done | error
```
- Drag-over/drop + hidden `<input type="file" accept=".wma">` (clicking zone triggers input)
- Result: paragraphs as `<p>` blocks + "Copy all" + "Transcribe another" buttons

## pip Dependencies
```
faster-whisper>=1.1.0
fastapi>=0.115.0
uvicorn[standard]>=0.34.0
python-multipart>=0.0.20
```
No new npm packages needed.

## Running Locally
```bash
# Terminal 1 — Python service
cd python && source .venv/bin/activate && uvicorn main:app --host 127.0.0.1 --port 8001 --reload

# Terminal 2 — Next.js
npm run dev
```
Open `http://localhost:3000`.

## Cost Analysis
| Scenario | Cost/min | Monthly (100 hrs) |
|---|---|---|
| faster-whisper local | $0 | $0 |
| OpenAI Whisper API | $0.006 | $36 |
| GPT-4o audio | ~$0.10+ | ~$600+ |

Model is downloaded once (~74MB) to `~/.cache/huggingface/hub/`. Stays resident in the uvicorn process.

## Gotchas
- **DRM-protected WMA**: ffmpeg cannot decode these — show clear error, don't crash
- **First request**: model download takes ~30s — preload at FastAPI startup to avoid timeout
- **Large files (>100MB)**: upload appears frozen in browser — show spinner immediately on drop
- **ffmpeg not in PATH**: hardcode fallback to `/opt/homebrew/bin/ffmpeg`
- **Concurrent requests**: single uvicorn worker processes jobs sequentially (fine for single-user local tool)
