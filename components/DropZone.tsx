"use client";

import { useRef, useState } from "react";

type State =
  | { status: "idle" }
  | { status: "processing"; stage: string }
  | { status: "done"; text: string; paragraphs: string[]; duration: number }
  | { status: "error"; message: string };

export default function DropZone() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".wma")) {
      setState({ status: "error", message: "Only .wma files are supported." });
      return;
    }
    upload(file);
  }

  async function upload(file: File) {
    setState({ status: "processing", stage: "Converting audio format..." });

    const formData = new FormData();
    formData.append("file", file);

    // Cycle through stages while waiting
    const stages = [
      "Converting audio format...",
      "Transcribing speech...",
      "Tidying text...",
    ];
    let stageIndex = 0;
    const stageTimer = setInterval(() => {
      stageIndex = Math.min(stageIndex + 1, stages.length - 1);
      setState({ status: "processing", stage: stages[stageIndex] });
    }, 4000);

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      clearInterval(stageTimer);
      const data = await res.json();

      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Something went wrong." });
        return;
      }

      setState({
        status: "done",
        text: data.text,
        paragraphs: data.paragraphs,
        duration: data.duration_seconds,
      });
    } catch {
      clearInterval(stageTimer);
      setState({ status: "error", message: "Network error. Please try again." });
    }
  }

  function copyAll(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function reset() {
    setState({ status: "idle" });
    setCopied(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  // ── Idle ───────────────────────────────────────────────────────────────────
  if (state.status === "idle") {
    return (
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
        className={[
          "flex flex-col items-center justify-center gap-4",
          "w-full max-w-xl h-72 rounded-2xl border-2 border-dashed",
          "cursor-pointer select-none transition-colors",
          dragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".wma"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 9l-7-7-7 7M12 2v14M5 19h14"
          />
        </svg>
        <div className="text-center">
          <p className="text-gray-700 font-medium">Drop a .wma file here</p>
          <p className="text-gray-400 text-sm mt-1">or click to browse</p>
        </div>
      </div>
    );
  }

  // ── Processing ─────────────────────────────────────────────────────────────
  if (state.status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 w-full max-w-xl h-72">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 font-medium">{state.stage}</p>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 w-full max-w-xl">
        <div className="w-full rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700 font-medium mb-1">Could not transcribe</p>
          <p className="text-red-500 text-sm">{state.message}</p>
        </div>
        <button
          onClick={reset}
          className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────
  const minutes = Math.floor(state.duration / 60);
  const seconds = Math.round(state.duration % 60);
  const durationLabel = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">Audio length: {durationLabel}</p>
        <div className="flex gap-3">
          <button
            onClick={() => copyAll(state.text)}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            {copied ? "Copied!" : "Copy all"}
          </button>
          <button
            onClick={reset}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Transcribe another
          </button>
        </div>
      </div>

      <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm max-h-[60vh] overflow-y-auto">
        {state.paragraphs.map((para, i) => (
          <p key={i} className={["text-gray-800 leading-relaxed", i > 0 ? "mt-4" : ""].join(" ")}>
            {para}
          </p>
        ))}
      </div>
    </div>
  );
}
