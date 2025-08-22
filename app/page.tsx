"use client";

import { useState } from "react";

// Helper to convert File to dataURL
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

// Helper to load image with dimensions
function loadWithSize(url: string): Promise<{ url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    const cacheBustUrl = url.includes("?") ? `${url}&_=${Date.now()}` : `${url}?_=${Date.now()}`;
    img.src = cacheBustUrl;
    img.decoding = "async";
  });
}

// Main enhance function with progress polling
async function enhanceImage(file: File, onProgress: (progress: number) => void) {
  // Convert file to base64
  const imageBase64 = await fileToDataUrl(file);

  // Start prediction
  const resp = await fetch("/api/enhance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });

  const prediction = await resp.json();
  if (prediction.error) throw new Error(prediction.error);

  console.log("✅ Prediction started:", prediction.id);
  onProgress(10); // Started

  // Poll for completion
  let result = prediction;
  while (result.status === "starting" || result.status === "processing") {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResp = await fetch(`/api/enhance/status/${result.id}`);
    result = await statusResp.json();
    
    console.log(`⏳ Status: ${result.status}`);
    
    // Update progress based on status
    if (result.status === "starting") {
      onProgress(20);
    } else if (result.status === "processing") {
      onProgress(50);
    }
  }

  if (result.status === "failed") {
    throw new Error(`Enhancement failed: ${result.error}`);
  }

  if (result.status === "succeeded") {
    onProgress(100);
    
    // Get enhanced URL from output
    const enhancedUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    if (!enhancedUrl || typeof enhancedUrl !== "string") {
      throw new Error("Model returned no URL");
    }

    return {
      originalUrl: URL.createObjectURL(file),
      enhancedUrl,
      model: "nightmareai/real-esrgan",
      predictionId: result.id,
    };
  }

  throw new Error(`Unexpected status: ${result.status}`);
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [slider, setSlider] = useState<number>(50);
  const [originalSize, setOriginalSize] = useState<{ width: number; height: number } | null>(null);
  const [enhancedSize, setEnhancedSize] = useState<{ width: number; height: number } | null>(null);
  const [ratio, setRatio] = useState<string | null>(null);

  async function handleEnhance() {
    if (!file) {
      setError("Please choose an image.");
      return;
    }

    try {
      setError(null);
      setStatus("uploading");
      setProgress(0);

      const result = await enhanceImage(file, (progress) => {
        setProgress(progress);
        if (progress <= 20) {
          setStatus("starting");
        } else if (progress <= 50) {
          setStatus("processing");
        } else if (progress < 100) {
          setStatus("finalizing");
        }
      });

      setStatus("loading");
      const original = await loadWithSize(result.originalUrl);
      const enhanced = await loadWithSize(result.enhancedUrl);

      setOriginalPreview(original.url);
      setEnhancedUrl(enhanced.url);
      setOriginalSize({ width: original.width, height: original.height });
      setEnhancedSize({ width: enhanced.width, height: enhanced.height });

      // Calculate ratio
      const ratioW = enhanced.width / original.width;
      const ratioH = enhanced.height / original.height;
      const avgRatio = (ratioW + ratioH) / 2;
      setRatio(`${avgRatio.toFixed(1)}×`);

      console.log("📏 ORIGINAL:", original.width, original.height);
      console.log("📏 ENHANCED:", enhanced.width, enhanced.height);

      setProgress(100);
      setStatus("completed");
    } catch (e: any) {
      setError(e.message || "Enhancement failed");
      setStatus("error");
      setProgress(0);
    }
  }

  function reset() {
    setFile(null);
    setOriginalPreview(null);
    setEnhancedUrl(null);
    setStatus("idle");
    setProgress(0);
    setError(null);
    setOriginalSize(null);
    setEnhancedSize(null);
    setRatio(null);
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold mb-6">Image Enhancer (Real-ESRGAN)</h1>

      <div className="space-y-4">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            reset();
            const f = e.target.files?.[0] || null;
            setFile(f);
          }}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />

        <div className="flex gap-2">
          <button
            onClick={handleEnhance}
            disabled={!file || (status !== "idle" && status !== "error" && status !== "completed")}
            className="px-6 py-2 rounded bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            {status === "idle" && "Enhance Image"}
            {status === "uploading" && "Uploading..."}
            {status === "starting" && "Starting..."}
            {status === "processing" && "Processing..."}
            {status === "finalizing" && "Finalizing..."}
            {status === "loading" && "Loading..."}
            {status === "completed" && "Enhance Another"}
            {status === "error" && "Try Again"}
          </button>

          {(originalPreview || enhancedUrl) && (
            <button
              onClick={reset}
              className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {status !== "idle" && status !== "completed" && status !== "error" && (
        <div className="mt-4">
          <div className="h-2 bg-gray-200 rounded">
            <div
              className="h-2 bg-blue-600 rounded transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-sm mt-1 text-gray-600">
            {status} • {progress}%
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Enhancement results */}
      {originalPreview && enhancedUrl && (
        <div className="mt-8 space-y-4">
          {/* Dimension info and ratio badge */}
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Original: {originalSize?.width} × {originalSize?.height}
              </p>
              <p className="text-sm text-gray-600">
                Enhanced: {enhancedSize?.width} × {enhancedSize?.height}
              </p>
            </div>
            {ratio && (
              <div className="px-3 py-1 bg-green-600 text-white rounded-full font-semibold">
                {ratio}
              </div>
            )}
          </div>

          {/* Before/After slider */}
          <div className="relative w-full aspect-video overflow-hidden rounded-lg border">
            {/* Enhanced image (background) */}
            <img
              key={enhancedUrl}
              src={enhancedUrl}
              alt="Enhanced"
              className="absolute inset-0 w-full h-full object-contain"
              style={{ imageRendering: "pixelated" }}
            />
            
            {/* Original image (clipped overlay) */}
            <div
              className="absolute top-0 left-0 h-full overflow-hidden"
              style={{ width: `${slider}%` }}
            >
              <img
                src={originalPreview}
                alt="Original"
                className="w-full h-full object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            </div>

            {/* Divider line */}
            <div
              className="absolute top-0 h-full border-l-2 border-white shadow-lg"
              style={{ left: `${slider}%` }}
            />
          </div>

          {/* Slider control */}
          <input
            className="w-full"
            type="range"
            min={0}
            max={100}
            value={slider}
            onChange={(e) => setSlider(Number(e.target.value))}
          />
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>← Original</span>
            <span>Enhanced →</span>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <a
              href={enhancedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Open Enhanced (Full Size)
            </a>
            <button
              onClick={() => setSlider(50)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Reset Slider (50%)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}