import DropZone from "@/components/DropZone";

export const metadata = {
  title: "Transcribe",
  description: "Drop a .wma file to get a clean text transcript.",
};

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="flex flex-col items-center gap-8 w-full">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-800 tracking-tight">
            Voice Transcriber
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Drop a .wma file — get clean, readable text
          </p>
        </div>
        <DropZone />
      </div>
    </main>
  );
}
