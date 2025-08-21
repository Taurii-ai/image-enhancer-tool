"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [predictionId, setPredictionId] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [slider, setSlider] = useState<number>(50);
  const pollingRef = useRef<any>(null);

  function reset() {
    setPredictionId(null);
    setEnhancedUrl(null);
    setStatus("idle");
    setProgress(0);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold mb-4">Image Enhancer</h1>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setEnhancedUrl(null);
          setStatus("uploading");
          setProgress(5);

          if (!file) {
            setError("Please choose an image.");
            return;
          }

          // Local preview for the "before" side (safe, does not leave browser)
          const preview = URL.createObjectURL(file);
          setOriginalPreview(preview);

          // Send file to our API (multipart/form-data)
          const fd = new FormData();
          fd.append("image", file);

          const res = await fetch("/api/predictions", {
            method: "POST",
            body: fd,
          });

          const json = await res.json();
          if (!res.ok) {
            setError(json?.error || "Failed to start prediction.");
            setStatus("error");
            return;
          }

          setPredictionId(json.id);
          setStatus("queued");
          setProgress(10);

          // Start polling
          async function poll() {
            try {
              if (!json.id) return;
              const r = await fetch(`/api/predictions/${json.id}`);
              const p = await r.json();
              if (!r.ok) {
                setError(p?.error || "Polling failed.");
                setStatus("error");
                return;
              }

              setStatus(p.status);
              setProgress(p.progress ?? 0);

              if (p.status === "succeeded") {
                // Some models return array; take the last item
                const out =
                  Array.isArray(p.output)
                    ? p.output[p.output.length - 1]
                    : p.output;
                setEnhancedUrl(out || null);
                setProgress(100);
                clearInterval(pollingRef.current);
              } else if (p.status === "failed" || p.status === "canceled") {
                setError("Enhancement failed.");
                clearInterval(pollingRef.current);
              }
            } catch (e: any) {
              setError(e?.message || String(e));
              clearInterval(pollingRef.current);
            }
          }

          await sleep(800);
          pollingRef.current = setInterval(poll, 1200);
          poll();
        }}
        className="space-y-3"
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            reset();
            const f = e.target.files?.[0] || null;
            setFile(f);
            setOriginalPreview(f ? URL.createObjectURL(f) : null);
          }}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          disabled={!file || status === "uploading" || status === "processing" || status === "queued"}
        >
          {status === "idle" && "Enhance"}
          {status === "uploading" && "Uploading…"}
          {(status === "queued" || status === "starting") && "Queued…"}
          {status === "processing" && "Enhancing…"}
        </button>
      </form>

      {/* Progress bar */}
      {status !== "idle" && (
        <div className="mt-4">
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-2 bg-black rounded"
              style={{ width: `${progress}%`, transition: "width 300ms ease" }}
            />
          </div>
          <div className="text-sm mt-1 opacity-70">
            {status} • {progress}%
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 text-red-600">
          {error}
        </div>
      )}

      {/* Before / After slider */}
      {originalPreview && enhancedUrl && (
        <div className="mt-6">
          <div className="relative w-full aspect-square overflow-hidden rounded-lg">
            {/* AFTER (enhanced) sits at the back */}
            <Image
              src={`${enhancedUrl}?id=${predictionId}`} // cache-bust
              alt="Enhanced"
              fill
              sizes="100vw"
              style={{ objectFit: "contain" }}
              unoptimized
            />
            {/* BEFORE on top, masked by slider */}
            <div
              className="absolute top-0 left-0 h-full overflow-hidden pointer-events-none"
              style={{ width: `${slider}%` }}
            >
              <Image
                src={originalPreview}
                alt="Original"
                fill
                sizes="100vw"
                style={{ objectFit: "contain" }}
                unoptimized
              />
            </div>

            {/* Divider line */}
            <div
              className="absolute top-0 h-full border-l border-white"
              style={{ left: `${slider}%` }}
            />
          </div>

          <input
            className="w-full mt-3"
            type="range"
            min={0}
            max={100}
            value={slider}
            onChange={(e) => setSlider(Number(e.target.value))}
          />
          <div className="flex justify-between text-sm opacity-70">
            <span>Before</span>
            <span>After</span>
          </div>
        </div>
      )}
    </div>
  );
}