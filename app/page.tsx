// app/page.tsx
'use client';

import { useState } from "react";
import dynamic from "next/dynamic";

// Lazy-load the compare slider to keep bundle light
const Compare = dynamic(() => import("react-compare-image"), { ssr: false });

export default function Home() {
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setEnhancedUrl(null);
    setBusy(true);

    const fd = new FormData(e.currentTarget);
    const file = (fd.get("image") as File) || null;
    if (!file) {
      setErr("Please choose an image.");
      setBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/enhance", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data?.enhancedUrl) {
        throw new Error(data?.error || data?.detail || "Failed to enhance.");
      }
      setOriginalUrl(data.originalUrl);
      setEnhancedUrl(`${data.enhancedUrl}?v=${Date.now()}`); // cache-bust
    } catch (e: any) {
      setErr(e.message || "Enhance failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Image Enhancer (Real-ESRGAN)</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
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

        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {busy ? "Enhancing…" : "Enhance"}
        </button>
      </form>

      {err && <p className="text-red-600">{err}</p>}

      {originalUrl && enhancedUrl && (
        <div className="border rounded overflow-hidden">
          {/* Use plain <img> so blob/public URLs always render; Next/Image is fine too since we whitelisted domains */}
          <Compare
            leftImage={originalUrl}
            rightImage={enhancedUrl}
            sliderPositionPercentage={50}
            leftImageAlt="Original"
            rightImageAlt="Enhanced"
          />
        </div>
      )}
    </main>
  );
}