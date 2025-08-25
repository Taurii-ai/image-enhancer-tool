// Force Node.js runtime (we need Buffer, Replicate SDK, etc.)
export const runtime = "nodejs";
// Give the lambda enough time
export const maxDuration = 60;

import Replicate from "replicate";
import { put } from "@vercel/blob";

// --- helpers ---------------------------------------------------------

function parseBase64DataUrl(dataUrl: string): Buffer {
  // Accept "data:image/png;base64,AAAA" or raw base64 "AAAA"
  const commaIdx = dataUrl.indexOf(",");
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Buffer.from(base64, "base64");
}

function buildInput(model: string, imageUrl: string) {
  const m = model.toLowerCase();

  if (m.includes("swinir")) {
    // SwinIR expects { image }
    return { image: imageUrl };
  }

  if (m.includes("codeformer")) {
    // CodeFormer commonly uses { img, background_enhance, face_upsample, scale }
    return {
      img: imageUrl,
      background_enhance: true,
      face_upsample: true,
      scale: 2,
    };
  }

  if (m.includes("realesrgan")) {
    // Real-ESRGAN uses { image, scale }
    return { image: imageUrl, scale: 2 };
  }

  // Fallback
  return { image: imageUrl };
}

function extractFirstUrl(payload: unknown): string | null {
  // Robustly find the first https URL anywhere in the Replicate response
  if (!payload) return null;

  if (typeof payload === "string") {
    return payload.startsWith("http") ? payload : null;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const u = extractFirstUrl(item);
      if (u) return u;
    }
    return null;
  }

  if (typeof payload === "object") {
    for (const val of Object.values(payload as Record<string, unknown>)) {
      const u = extractFirstUrl(val);
      if (u) return u;
    }
  }

  return null;
}

// --- handler ---------------------------------------------------------

export async function POST(request: Request) {
  try {
    // Never throw at module top-level; handle env inside handler to avoid
    // Vercel FUNCTION_INVOCATION_FAILED before we can JSON-respond.
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
    const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

    if (!REPLICATE_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: "Missing REPLICATE_API_TOKEN" }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }
    if (!BLOB_READ_WRITE_TOKEN) {
      // @vercel/blob will throw if missing; fail fast with JSON
      return new Response(
        JSON.stringify({ error: "Missing BLOB_READ_WRITE_TOKEN" }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    const body = await request.json().catch(() => null) as
      | { imageBase64?: string; model?: string }
      | null;

    if (!body?.imageBase64 || !body?.model) {
      return new Response(
        JSON.stringify({ error: "Missing imageBase64 or model" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

    // 1) Upload base64 -> Vercel Blob (public URL)
    const buffer = parseBase64DataUrl(body.imageBase64);
    const objectName = `uploads/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.png`;

    let blobUrl: string;
    try {
      const blob = await put(objectName, buffer, {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: false,
      });
      blobUrl = blob.url;
    } catch (e: any) {
      // Return JSON, never HTML
      return new Response(
        JSON.stringify({ error: `Blob upload failed: ${e?.message || String(e)}` }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    // 2) Build the correct input for the chosen model
    const input = buildInput(body.model, blobUrl);

    // 3) Run Replicate
    let output: unknown;
    try {
      output = await replicate.run(body.model, { input });
    } catch (e: any) {
      // Surface Replicate errors cleanly
      return new Response(
        JSON.stringify({
          error: "Replicate run failed",
          detail: e?.message || String(e),
        }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    // 4) Normalize the output to a single URL
    const enhancedUrl =
      (Array.isArray(output) && typeof output[0] === "string" && output[0].startsWith("http"))
        ? output[0]
        : extractFirstUrl(output);

    if (!enhancedUrl) {
      return new Response(
        JSON.stringify({ error: "No valid URL found in Replicate output", raw: output }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    // 5) Success
    return new Response(
      JSON.stringify({ url: enhancedUrl, source: "replicate" }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  } catch (err: any) {
    // Absolute last-resort catch to guarantee JSON, preventing
    // "Server returned non-JSON response" in the browser.
    return new Response(
      JSON.stringify({
        error: "Unhandled server error",
        detail: err?.message || String(err),
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}

// Optional: allow GET/HEAD to quickly probe liveness
export async function GET() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
}
export async function HEAD() {
  return new Response(null, { status: 204 });
}