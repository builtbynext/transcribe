"""Local LLM integration for text correction and header summarization.

Uses two models:
- google/flan-t5-large:  instruction-tuned T5 for generating topic headers
- vennify/t5-base-grammar-correction: fine-tuned T5 for fixing grammar/punctuation
"""

from __future__ import annotations

import torch
from transformers import AutoTokenizer, T5ForConditionalGeneration

# Header model (flan-t5-large)
_header_model: T5ForConditionalGeneration | None = None
_header_tokenizer: AutoTokenizer | None = None

# Grammar correction model (t5-base-grammar-correction)
_grammar_model: T5ForConditionalGeneration | None = None
_grammar_tokenizer: AutoTokenizer | None = None


def load_bart_model() -> None:
    """Download (first run) and load both models into memory."""
    global _header_model, _header_tokenizer, _grammar_model, _grammar_tokenizer

    if _header_model is None:
        _header_tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-large")
        _header_model = T5ForConditionalGeneration.from_pretrained("google/flan-t5-large")
        _header_model.eval()

    if _grammar_model is None:
        _grammar_tokenizer = AutoTokenizer.from_pretrained(
            "vennify/t5-base-grammar-correction"
        )
        _grammar_model = T5ForConditionalGeneration.from_pretrained(
            "vennify/t5-base-grammar-correction"
        )
        _grammar_model.eval()


def correct_text(text: str) -> str:
    """Fix grammar, punctuation, and capitalization in transcript text."""
    if not text.strip() or _grammar_model is None or _grammar_tokenizer is None:
        return text

    prompt = f"grammar: {text}"
    inputs = _grammar_tokenizer(
        prompt,
        max_length=512,
        truncation=True,
        return_tensors="pt",
    )

    with torch.no_grad():
        output_ids = _grammar_model.generate(
            inputs["input_ids"],
            attention_mask=inputs["attention_mask"],
            max_length=200,
            num_beams=4,
        )

    return _grammar_tokenizer.decode(output_ids[0], skip_special_tokens=True)


def summarize_header(section_text: str) -> str:
    """Generate a concise section header using flan-t5-large."""
    if not section_text.strip() or _header_model is None or _header_tokenizer is None:
        return "General"

    prompt = f"Give a short 2-4 word title for this section: {section_text}"
    inputs = _header_tokenizer(
        prompt,
        max_length=1024,
        truncation=True,
        return_tensors="pt",
    )

    with torch.no_grad():
        summary_ids = _header_model.generate(
            inputs["input_ids"],
            attention_mask=inputs["attention_mask"],
            max_length=15,
            num_beams=4,
        )

    header = _header_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
    header = header.rstrip(".")
    return header.title()
