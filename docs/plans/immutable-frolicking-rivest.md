# Plan: Local LLM Integration for Better Transcripts

## Context

The current enhance pipeline uses regex-based filler removal + KeyBERT for section headers. The results are mediocre — headers come out as keyword soup ("Like · Channel · Thinking") and Whisper's transcription errors (wrong words, broken grammar) pass through untouched. The [reference sample](docs/samples/reference.md) shows the target quality: clean, grammatical text with meaningful headers like "Monetization / Business Model".

## Model Selection (Updated from original plan)

**Original plan was facebook/bart-large-cnn**, but testing revealed it doesn't work for transcripts:
- Text correction: BART just passes input through unchanged (trained for summarization, not denoising)
- Headers: BART copies the first sentence instead of generating abstract topic labels (extractive, not abstractive for short outputs)

**What we're using instead:**
| Task | Model | Why |
|------|-------|-----|
| **Headers** | `google/flan-t5-large` (783M params) | Instruction-tuned — responds to "Give a short 2-4 word title for this section:" with outputs like "How To Monetize A Highlighter Tool" |
| **Grammar** | `vennify/t5-base-grammar-correction` (297M params) | Fine-tuned specifically for grammar correction — fixes "dont"→"don't", "Id"→"I'd", adds missing commas |
| **Filler removal** | `cleanup.py` (regex) | Already works well, no model needed |

## Changes

### 1. New file: `python/bart.py`
Module with three functions (kept the name for import compatibility):
- **`load_bart_model()`** — loads both models at startup
- **`correct_text(text) -> str`** — grammar correction via `grammar: {text}` prompt
- **`summarize_header(section_text) -> str`** — topic label via `Give a short 2-4 word title for this section: {text}` prompt

### 2. Modified: `python/main.py`
- Import + call `load_bart_model()` at startup
- Added `correct_text()` step in `/enhance` after filler cleanup

### 3. Modified: `python/clustering.py`
- `_make_header()` now calls `summarize_header()` first, falls back to KeyBERT

### 4. Modified: `python/requirements.txt`
- Added `transformers>=4.40.0` and `torch>=2.2.0`

### 5. Modified: `app/api/enhance/route.ts`
- `maxDuration` increased from 30 to 120 seconds

## Pipeline After Changes

```
Enhance button clicked
  → cleanup.py: regex filler removal (fast, <1s)
  → bart.py correct_text(): grammar fix per paragraph (~1-2s each on CPU)
  → clustering.py: semantic clustering (unchanged, <2s)
  → bart.py summarize_header(): topic labels per section (~2-3s each)
  → Return sections
```

## Verified Results

```
Header test:  "How To Monetize A Highlighter Tool"  (vs KeyBERT: "Like · Channel · Thinking")
Grammar test: "I don't want to overcomplicate things, I'd rather keep it free"
              (vs input: "I dont want to overcomplicate things Id rather keep it free")
```

## No Frontend Changes

Response shape from `/enhance` stays identical: `{sections: [{header, paragraphs}]}`.
