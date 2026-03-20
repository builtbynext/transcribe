export const runtime = "nodejs";
export const maxDuration = 1800; // 30 minutes for long recordings

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || !file.name.toLowerCase().endsWith(".wma")) {
    return Response.json(
      { error: "Please upload a .wma file." },
      { status: 422 }
    );
  }

  const pyForm = new FormData();
  pyForm.append("file", file);

  let pyResponse: Response;
  try {
    pyResponse = await fetch("http://127.0.0.1:8001/transcribe", {
      method: "POST",
      body: pyForm,
    });
  } catch {
    return Response.json(
      {
        error:
          "Transcription service is not running. Start it with: cd python && source .venv/bin/activate && uvicorn main:app --host 127.0.0.1 --port 8001",
      },
      { status: 503 }
    );
  }

  const body = await pyResponse.json();
  return Response.json(body, { status: pyResponse.status });
}
