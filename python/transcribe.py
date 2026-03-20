import shutil
import subprocess
import tempfile
from pathlib import Path

from faster_whisper import WhisperModel

FFMPEG = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"

_model: WhisperModel | None = None


def load_model() -> WhisperModel:
    global _model
    if _model is None:
        _model = WhisperModel("base.en", device="cpu", compute_type="int8")
    return _model


def _build_paragraph(sentences: list[dict]) -> dict:
    """Join sentences into a paragraph, capitalising only the first character."""
    text = " ".join(s["text"] for s in sentences)
    if text:
        text = text[0].upper() + text[1:]
    return {
        "text": text,
        "start": sentences[0]["start"],
        "end": sentences[-1]["end"],
        "sentences": sentences,
    }


def transcribe_wma(file_bytes: bytes, filename: str) -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        input_path = tmp_path / filename
        wav_path = tmp_path / "audio.wav"

        input_path.write_bytes(file_bytes)

        result = subprocess.run(
            [
                FFMPEG,
                "-y",
                "-i", str(input_path),
                "-ar", "16000",
                "-ac", "1",
                "-c:a", "pcm_s16le",
                str(wav_path),
            ],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            stderr = result.stderr
            if "drm" in stderr.lower() or "protection" in stderr.lower():
                raise ValueError(
                    "This file appears to be DRM-protected and cannot be transcribed."
                )
            raise RuntimeError(f"Audio conversion failed: {stderr[-500:]}")

        model = load_model()
        segments, info = model.transcribe(str(wav_path), beam_size=5, language="en")

        paragraphs: list[dict] = []
        current_sentences: list[dict] = []
        prev_end: float | None = None
        PAUSE_THRESHOLD = 1.5  # seconds — force break on long silence
        MAX_SENTENCES = 5      # force break after this many segments

        for segment in segments:
            text = segment.text.strip()
            if not text:
                continue

            long_pause = prev_end is not None and (segment.start - prev_end) > PAUSE_THRESHOLD
            max_reached = len(current_sentences) >= MAX_SENTENCES

            if (long_pause or max_reached) and current_sentences:
                paragraphs.append(_build_paragraph(current_sentences))
                current_sentences = []

            current_sentences.append({"text": text, "start": segment.start, "end": segment.end})
            prev_end = segment.end

        if current_sentences:
            paragraphs.append(_build_paragraph(current_sentences))

        full_text = "\n\n".join(p["text"] for p in paragraphs)
        return {
            "text": full_text,
            "paragraphs": paragraphs,
            "duration_seconds": round(info.duration, 1),
        }
