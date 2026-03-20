"use client";

import { useRef, useState } from "react";

type Sentence = { text: string; start: number; end: number };
type Paragraph = { text: string; start: number; end: number; sentences: Sentence[] };
type EnhancedSection = { header: string; paragraphs: Paragraph[] };

type State =
  | { status: "idle" }
  | { status: "processing"; stage: string }
  | { status: "done"; text: string; paragraphs: Paragraph[]; duration: number }
  | { status: "error"; message: string };

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function DropZone() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [selectionCopied, setSelectionCopied] = useState(false);

  // Enhancement state (kept separate from the main state machine)
  const [enhanced, setEnhanced] = useState<EnhancedSection[] | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhancedView, setEnhancedView] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);

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

  async function enhance(text: string, paragraphs: Paragraph[]) {
    setIsEnhancing(true);
    setEnhanceError(null);

    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, paragraphs }),
      });

      const data = await res.json();

      if (!res.ok) {
        setEnhanceError(data.error ?? "Enhancement failed.");
        setIsEnhancing(false);
        return;
      }

      setEnhanced(data.sections);
      setEnhancedView(true);
    } catch {
      setEnhanceError("Network error. Please try again.");
    }

    setIsEnhancing(false);
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
    setSelectionCopied(false);
    setEnhanced(null);
    setIsEnhancing(false);
    setEnhancedView(false);
    setEnhanceError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

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

  const copyText = enhancedView && enhanced
    ? enhanced.map(s => `${s.header}\n\n${s.paragraphs.map(p => p.text).join("\n\n")}`).join("\n\n")
    : state.text;

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <p className="text-gray-400 text-sm">Audio length: {durationLabel}</p>

          {/* Original / Enhanced toggle — shown once enhancement is ready */}
          {enhanced && (
            <div className="flex text-sm border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setEnhancedView(false)}
                className={`px-3 py-1 transition-colors ${
                  !enhancedView
                    ? "bg-gray-100 text-gray-800 font-medium"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Original
              </button>
              <button
                onClick={() => setEnhancedView(true)}
                className={`px-3 py-1 transition-colors ${
                  enhancedView
                    ? "bg-gray-100 text-gray-800 font-medium"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Enhanced
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 items-center">
          {/* Enhance button — hidden once enhancement exists */}
          {!enhanced && (
            <button
              onClick={() => enhance(state.text, state.paragraphs)}
              disabled={isEnhancing}
              className="text-sm font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {isEnhancing ? (
                <>
                  <span className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin inline-block" />
                  Enhancing...
                </>
              ) : (
                "Enhance"
              )}
            </button>
          )}

          <button
            onClick={() => copyAll(copyText)}
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

      {/* Enhancement error banner */}
      {enhanceError && (
        <p className="text-sm text-red-500 text-center">{enhanceError}</p>
      )}

      {/* Transcript / Enhanced panel */}
      <div
        className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm max-h-[60vh] overflow-y-auto"
        onMouseUp={handleMouseUp}
      >
        {enhancedView && enhanced ? (
          // ── Enhanced view: sections with keyword headers ──────────────────
          enhanced.map((section, si) => (
            <div key={si} className={si > 0 ? "mt-8" : ""}>
              {section.header && (
                <p className="font-semibold text-gray-900 mb-3">{section.header}</p>
              )}
              {section.paragraphs.map((para, pi) => (
                <div key={pi} className={pi > 0 ? "mt-4" : ""}>
                  <span className="font-mono text-xs text-gray-400 mr-2 select-none">
                    [{formatTimestamp(para.start)}]
                  </span>
                  <span className="text-gray-800 leading-relaxed">{para.text}</span>
                </div>
              ))}
            </div>
          ))
        ) : (
          // ── Original view: raw paragraphs with timestamps ─────────────────
          state.paragraphs.map((para, i) => (
            <div key={i} className={i > 0 ? "mt-5" : ""}>
              <span className="font-mono text-xs text-gray-400 mr-2 select-none">
                [{formatTimestamp(para.start)}]
              </span>
              <span className="text-gray-800 leading-relaxed">
                {para.sentences.map(s => s.text).join(" ")}
              </span>
            </div>
          ))
        )}
      </div>

      {selectionCopied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none z-50">
          Copied!
        </div>
      )}
    </div>
  );
}
