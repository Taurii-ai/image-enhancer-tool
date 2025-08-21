// app/page.tsx
'use client';

import { useState } from "react";
import ImageEnhancer from "./components/ImageEnhancer";

export default function Home() {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setEnhancedUrl(null);
    setBusy(true);
    setProgress(0);

    const fd = new FormData(e.currentTarget);
    const file = (fd.get("image") as File) || null;
    if (!file) {
      setErr("Please choose an image.");
      setBusy(false);
      return;
    }

    // Create blob URL for original image preview
    const originalBlob = URL.createObjectURL(file);
    setOriginalUrl(originalBlob);

    try {
      // Simulate progress during upload/processing
      setProgress(10);
      
      const res = await fetch("/api/enhance", { method: "POST", body: fd });
      setProgress(30);
      
      const data = await res.json();
      setProgress(60);
      
      if (!res.ok || !data?.enhancedUrl) {
        throw new Error(data?.error || data?.detail || "Failed to enhance.");
      }
      
      setProgress(90);
      setEnhancedUrl(`${data.enhancedUrl}?v=${Date.now()}`); // cache-bust
      setProgress(100);
      
      // Clean up after a brief delay to show completion
      setTimeout(() => {
        setBusy(false);
        setProgress(0);
      }, 500);
      
    } catch (e: any) {
      setErr(e.message || "Enhance failed.");
      setBusy(false);
      setProgress(0);
      // Clean up blob URL on error
      URL.revokeObjectURL(originalBlob);
      setOriginalUrl(null);
    }
  }

  const handleReset = () => {
    if (originalUrl && originalUrl.startsWith('blob:')) {
      URL.revokeObjectURL(originalUrl);
    }
    setOriginalUrl(null);
    setEnhancedUrl(null);
    setBusy(false);
    setProgress(0);
    setErr(null);
  };

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-center">Image Enhancer (Real-ESRGAN)</h1>

      <form onSubmit={handleSubmit} className="space-y-3 max-w-md mx-auto">
        <input type="file" name="image" accept="image/*" required />
        <div className="flex items-center gap-3">
          <label className="text-sm">Scale:</label>
          <select name="scale" defaultValue="4" className="border rounded px-2 py-1">
            <option value="2">2x</option>
            <option value="4">4x</option>
          </select>
          <label className="text-sm ml-4">
            <input type="checkbox" name="faceEnhance" className="mr-2" />
            Face enhance
          </label>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded bg-black text-white disabled:opacity-50 flex-1"
          >
            {busy ? "Enhancing…" : "Enhance"}
          </button>
          
          {(originalUrl || enhancedUrl) && (
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {err && <p className="text-red-600 text-center">{err}</p>}

      <ImageEnhancer
        originalImage={originalUrl}
        enhancedImage={enhancedUrl}
        isLoading={busy}
        progress={progress}
      />
    </main>
  );
}