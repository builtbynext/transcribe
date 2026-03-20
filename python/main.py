from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from clustering import build_sections, load_embed_model
from cleanup import clean_sentence
from transcribe import load_model, transcribe_wma

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    load_model()
    load_embed_model()


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".wma"):
        raise HTTPException(status_code=422, detail="Please upload a .wma file.")

    contents = await file.read()

    try:
        result = transcribe_wma(contents, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result


class EnhanceRequest(BaseModel):
    text: str
    paragraphs: list[dict]


@app.post("/enhance")
async def enhance(req: EnhanceRequest):
    if not req.paragraphs:
        raise HTTPException(status_code=422, detail="No paragraphs provided.")

    # Apply filler-word cleanup to every sentence in every paragraph
    cleaned_paragraphs = []
    for para in req.paragraphs:
        cleaned_sentences = [
            {**s, "text": clean_sentence(s["text"])}
            for s in para.get("sentences", [])
        ]
        cleaned_text = " ".join(s["text"] for s in cleaned_sentences)
        cleaned_paragraphs.append({
            **para,
            "text": cleaned_text,
            "sentences": cleaned_sentences,
        })

    try:
        sections = build_sections(cleaned_paragraphs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clustering failed: {e}")

    return {"sections": sections}
