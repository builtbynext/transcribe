export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.paragraphs?.length) {
    return Response.json({ error: "No paragraphs provided." }, { status: 422 });
  }

  let pyResponse: Response;
  try {
    pyResponse = await fetch("http://127.0.0.1:8001/enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  const data = await pyResponse.json();
  return Response.json(data, { status: pyResponse.status });
}
