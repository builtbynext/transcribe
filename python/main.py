from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

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
