import Replicate from "replicate";
import { put } from "@vercel/blob";

// --- helpers ---------------------------------------------------------

function parseBase64DataUrl(dataUrl) {
  // Accept "data:image/png;base64,AAAA" or raw base64 "AAAA"
  const commaIdx = dataUrl.indexOf(",");
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  return Buffer.from(base64, "base64");
}

function buildInput(model, imageUrl) {
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

function extractFirstUrl(payload) {
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
    for (const val of Object.values(payload)) {
      const u = extractFirstUrl(val);
      if (u) return u;
    }
  }

  return null;
}

// --- handler ---------------------------------------------------------

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Never throw at module top-level; handle env inside handler to avoid
    // Vercel FUNCTION_INVOCATION_FAILED before we can JSON-respond.
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
    const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

    if (!REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN" });
    }
    if (!BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({ error: "Missing BLOB_READ_WRITE_TOKEN" });
    }

    const { imageBase64, model } = req.body || {};

    if (!imageBase64 || !model) {
      return res.status(400).json({ error: "Missing imageBase64 or model" });
    }

    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

    // 1) Upload base64 -> Vercel Blob (public URL)
    const buffer = parseBase64DataUrl(imageBase64);
    const objectName = `uploads/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.png`;

    let blobUrl;
    try {
      const blob = await put(objectName, buffer, {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: false,
      });
      blobUrl = blob.url;
    } catch (e) {
      // Return JSON, never HTML
      return res.status(500).json({ error: `Blob upload failed: ${e?.message || String(e)}` });
    }

    // 2) Build the correct input for the chosen model
    const input = buildInput(model, blobUrl);
    console.log("🔧 Built input for model:", model, JSON.stringify(input, null, 2));

    // 3) Run Replicate
    let output;
    try {
      console.log("🚀 Calling Replicate with model:", model);
      output = await replicate.run(model, { input });
      console.log("✅ Replicate completed successfully");
    } catch (e) {
      // Surface Replicate errors cleanly
      console.error("❌ Replicate error:", e);
      return res.status(500).json({
        error: "Replicate run failed",
        detail: e?.message || String(e),
      });
    }

    // 4) Normalize the output to a single URL
    console.log("🔍 Raw Replicate output:", JSON.stringify(output, null, 2));
    
    let enhancedUrl = null;
    
    // Try multiple extraction methods
    if (typeof output === "string" && output.startsWith("http")) {
      enhancedUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      if (typeof output[0] === "string" && output[0].startsWith("http")) {
        enhancedUrl = output[0];
      } else {
        enhancedUrl = extractFirstUrl(output[0]);
      }
    } else {
      enhancedUrl = extractFirstUrl(output);
    }

    if (!enhancedUrl) {
      console.error("❌ No URL found in output:", output);
      return res.status(500).json({ 
        error: "No valid URL found in Replicate output", 
        raw: output,
        type: typeof output,
        isArray: Array.isArray(output)
      });
    }
    
    console.log("✅ Extracted URL:", enhancedUrl);

    // 5) Success
    return res.status(200).json({ url: enhancedUrl, source: "replicate" });
  } catch (err) {
    // Absolute last-resort catch to guarantee JSON, preventing
    // "Server returned non-JSON response" in the browser.
    console.error("Unhandled server error:", err);
    return res.status(500).json({
      error: "Unhandled server error",
      detail: err?.message || String(err),
    });
  }
}