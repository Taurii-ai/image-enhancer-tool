export const runtime = "nodejs";            // ✅ Use Node runtime (Replicate SDK needs it)
export const dynamic = "force-dynamic";     // ✅ Disable caching for this route

import { NextResponse } from "next/server";
import Replicate from "replicate";

// --- Configure Replicate client ---
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

// --- Model version (your SwinIR) ---
const MODEL_VERSION = "660d922d33153019e8c263a3bba265de882e7f4f70396546b6c9c8f9d47a021a";
// Fully qualified ref: "jingyunliang/swinir:660d922d3315..."

// ---- Helpers ----
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function firstHttpUrl(value: any): string | null {
  // Recursively find the *first* string that looks like a URL anywhere in the output
  if (!value) return null;
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  if (Array.isArray(value)) {
    for (const v of value) {
      const found = firstHttpUrl(v);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const k of Object.keys(value)) {
      const found = firstHttpUrl((value as any)[k]);
      if (found) return found;
    }
  }
  return null;
}

async function isReachable(url: string): Promise<boolean> {
  try {
    // HEAD check helps avoid returning broken links
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    // If CORS blocks HEAD, don't kill the request — let the client try to load it.
    return true;
  }
}

// ---- Route handler ----
export async function POST(req: Request) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Server missing REPLICATE_API_TOKEN" },
        { status: 500 }
      );
    }

    const { image, model } = await req.json().catch(() => ({} as any));

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Create a prediction (explicitly, so we can poll). This is more reliable than run()
    const prediction = await replicate.predictions.create({
      version: MODEL_VERSION,
      input: { image }, // data URL or http(s) URL both ok for this model
      // (You can pass model params here if needed)
    });

    let current = prediction;
    const started = Date.now();
    const TIMEOUT_MS = 120_000;      // 2 minutes hard timeout
    const POLL_INTERVAL_MS = 1200;   // gentle polling

    while (
      current.status !== "succeeded" &&
      current.status !== "failed" &&
      current.status !== "canceled"
    ) {
      if (Date.now() - started > TIMEOUT_MS) {
        return NextResponse.json(
          { error: "Enhancement timed out", id: current.id, status: current.status },
          { status: 504 }
        );
      }
      await delay(POLL_INTERVAL_MS);
      current = await replicate.predictions.get(current.id);
    }

    if (current.status !== "succeeded") {
      return NextResponse.json(
        {
          error: `Replicate job ${current.status}`,
          id: current.id,
          logs: current.logs ?? null,
        },
        { status: 502 }
      );
    }

    // Extract a usable URL from output (string | string[] | nested object)
    const enhancedUrl = firstHttpUrl(current.output);

    if (!enhancedUrl) {
      // Log the raw output for debugging; still return 500 to client
      console.error("❌ Could not find URL in Replicate output:", current.output);
      return NextResponse.json(
        { error: "No enhanced image URL returned from Replicate", id: current.id },
        { status: 500 }
      );
    }

    // Optional: verify it's reachable (don't be strict on CORS failures)
    const ok = await isReachable(enhancedUrl);
    if (!ok) {
      console.warn("⚠️ Enhanced URL might not be reachable:", enhancedUrl);
    }

    // Return a minimal, clean response the frontend can trust
    return NextResponse.json({
      enhancedUrl,
      // Useful extras for your logs/UI if you want:
      meta: {
        id: current.id,
        model: model || `jingyunliang/swinir:${MODEL_VERSION.slice(0, 7)}`,
        status: current.status,
        // comment these in if you want to see full output/logs in client:
        // output: current.output,
        // logs: current.logs,
      },
    });
  } catch (err: any) {
    console.error("❌ /api/image-processing error:", err);
    return NextResponse.json(
      { error: "Image enhancement failed", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}