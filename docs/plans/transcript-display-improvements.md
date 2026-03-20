# Plan: Transcript Display — Timestamps, Structure & Auto-Copy

## Context
The current transcript output is a wall of plain text (paragraphs only, no timestamps). Whisper already produces per-segment timestamps internally, but they are discarded before the response is returned. This plan surfaces those timestamps, improves readability with inline sentence structure, and adds auto-copy on mouse selection.

Reference target: `docs/samples/reference.md` — structured with section headers, clean paragraphs.
Note: **section headers with topic labels** (e.g. "Monetization / Business Model") require LLM post-processing and are scoped out of this plan. This plan gets you timestamps + structure + auto-copy.

---

## Files to Modify

| File | Change |
|------|--------|
| `python/transcribe.py` | Return paragraph objects with timestamps instead of flat strings |
| `components/DropZone.tsx` | Updated types, timestamp badges, auto-copy on selection |
| `docs/plans/wma-transcription-upload.md` | Add note about this feature update |

`app/api/transcribe/route.ts` — no changes (pure pass-through).

---

## 1. Python: `python/transcribe.py`

Replace the flat `paragraphs: list[str]` accumulator with structured paragraph dicts that preserve timestamps.

### New return shape
```json
{
  "text": "...",
  "paragraphs": [
    {
      "text": "First sentence. Second sentence.",
      "start": 0.0,
      "end": 12.4,
      "sentences": [
        { "text": "First sentence.", "start": 0.0, "end": 5.1 },
        { "text": "Second sentence.", "start": 5.3, "end": 12.4 }
      ]
    }
  ],
  "duration_seconds": 142.0
}
```

### Loop change (lines 53–77 of current file)
```python
paragraphs: list[dict] = []
current_sentences: list[dict] = []
prev_end: float | None = None
PAUSE_THRESHOLD = 1.5

for segment in segments:
    text = segment.text.strip()
    if not text:
        continue
    text = text[0].upper() + text[1:] if len(text) > 1 else text.upper()

    if prev_end is not None and (segment.start - prev_end) > PAUSE_THRESHOLD:
        if current_sentences:
            paragraphs.append({
                "text": " ".join(s["text"] for s in current_sentences),
                "start": current_sentences[0]["start"],
                "end": current_sentences[-1]["end"],
                "sentences": current_sentences,
            })
            current_sentences = []

    current_sentences.append({"text": text, "start": segment.start, "end": segment.end})
    prev_end = segment.end

if current_sentences:
    paragraphs.append({
        "text": " ".join(s["text"] for s in current_sentences),
        "start": current_sentences[0]["start"],
        "end": current_sentences[-1]["end"],
        "sentences": current_sentences,
    })

full_text = "\n\n".join(p["text"] for p in paragraphs)
return {"text": full_text, "paragraphs": paragraphs, "duration_seconds": round(info.duration, 1)}
```

---

## 2. Frontend: `components/DropZone.tsx`

### New types (replace lines 5–9)
```typescript
type Sentence = { text: string; start: number; end: number };
type Paragraph = { text: string; start: number; end: number; sentences: Sentence[] };

type State =
  | { status: "idle" }
  | { status: "processing"; stage: string }
  | { status: "done"; text: string; paragraphs: Paragraph[]; duration: number }
  | { status: "error"; message: string };
```

### Timestamp helper (add above component)
```typescript
function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
```

### New paragraph render
```tsx
{state.paragraphs.map((para, i) => (
  <div key={i} className={i > 0 ? "mt-5" : ""}>
    <span className="font-mono text-xs text-gray-400 mr-2 select-none">
      [{formatTimestamp(para.start)}]
    </span>
    <span className="text-gray-800 leading-relaxed">
      {para.sentences.map(s => s.text).join(" ")}
    </span>
  </div>
))}
```
`select-none` on the timestamp badge prevents it from being swept into the user's clipboard selection.

### Auto-copy on highlight

Add state: `const [selectionCopied, setSelectionCopied] = useState(false);`

Add handler on the transcript container div:
```tsx
function handleMouseUp() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;
  const selected = selection.toString().trim();
  if (!selected) return;
  navigator.clipboard.writeText(selected).then(() => {
    setSelectionCopied(true);
    setTimeout(() => setSelectionCopied(false), 1500);
  });
}
```

Add `onMouseUp={handleMouseUp}` to the transcript container `<div>`.

Toast:
```tsx
{selectionCopied && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none z-50">
    Copied!
  </div>
)}
```

---

## Verification

1. Start Python service: `cd python && source .venv/bin/activate && uvicorn main:app --host 127.0.0.1 --port 8001`
2. Start Next.js: `npm run dev`
3. Upload a `.wma` file
4. Confirm each paragraph shows a `[0:00]` timestamp badge
5. Verify timestamps increase sequentially across paragraphs
6. Select text with mouse → confirm "Copied!" toast appears and clipboard contains selected text only (no timestamp characters)
7. "Copy all" button still works independently

---

## Out of Scope (future)

- **AI section headers** (e.g. "Monetization / Business Model") — requires an LLM post-processing call after transcription. Can be added as a separate feature once this is working.
