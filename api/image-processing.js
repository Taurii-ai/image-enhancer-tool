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
    // SwinIR expects { image, task_type }
    return { 
      image: imageUrl,
      task_type: "Real-World Image Super-Resolution-Large"
    };
  }

  if (m.includes("codeformer")) {
    // CodeFormer uses { image, background_enhance, face_upsample, fidelity }
    return {
      image: imageUrl,
      background_enhance: true,
      face_upsample: true,
      fidelity: 0.5
    };
  }

  if (m.includes("realesrgan")) {
    // Real-ESRGAN uses { img, scale, face_enhance, version }
    return { 
      img: imageUrl,
      scale: 4,
      face_enhance: false,
      version: "General - v3"
    };
  }

  // Fallback
  return { image: imageUrl };
}

function extractFirstUrl(payload) {
  // Robustly find the first https URL anywhere in the Replicate response
  if (!payload) return null;

  // Direct string URL
  if (typeof payload === "string") {
    return payload.startsWith("http") ? payload : null;
  }

  // Array format - check each item
  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (typeof item === "string" && item.startsWith("http")) {
        return item;
      }
      // Recursive check for nested objects
      const nested = extractFirstUrl(item);
      if (nested) return nested;
    }
    return null;
  }

  // Object format - check common keys first, then all values
  if (typeof payload === "object" && payload !== null) {
    // Check common output keys
    const commonKeys = ['output', 'url', 'image', 'result', 'data'];
    for (const key of commonKeys) {
      if (payload[key] && typeof payload[key] === "string" && payload[key].startsWith("http")) {
        return payload[key];
      }
    }
    
    // Check all values recursively
    for (const val of Object.values(payload)) {
      const nested = extractFirstUrl(val);
      if (nested) return nested;
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
      console.error("❌ Missing REPLICATE_API_TOKEN");
      return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN" });
    }
    if (!BLOB_READ_WRITE_TOKEN) {
      console.error("❌ Missing BLOB_READ_WRITE_TOKEN");
      return res.status(500).json({ error: "Missing BLOB_READ_WRITE_TOKEN" });
    }
    
    console.log("✅ Environment variables OK");

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
    console.log("🔍 Output type:", typeof output);
    console.log("🔍 Is array:", Array.isArray(output));
    
    let enhancedUrl = null;
    
    // Convert output to string for analysis
    const outputStr = JSON.stringify(output);
    console.log("🔍 Output as string:", outputStr);
    
    // Direct string URL
    if (typeof output === "string" && output.startsWith("http")) {
      enhancedUrl = output;
      console.log("✅ Found direct string URL");
    } 
    // Array with URL as first element
    else if (Array.isArray(output) && output.length > 0) {
      console.log("📋 Processing array output, length:", output.length);
      if (typeof output[0] === "string" && output[0].startsWith("http")) {
        enhancedUrl = output[0];
        console.log("✅ Found URL in array[0]");
      }
    }
    // Try extractFirstUrl as fallback
    if (!enhancedUrl) {
      console.log("🔧 Trying extractFirstUrl fallback...");
      enhancedUrl = extractFirstUrl(output);
      if (enhancedUrl) {
        console.log("✅ Found URL via extraction:", enhancedUrl);
      }
    }

    if (!enhancedUrl) {
      console.error("❌ No URL found in output:", output);
      console.error("❌ Full output string:", outputStr);
      return res.status(500).json({ 
        error: "No valid URL found in Replicate output", 
        raw: output,
        type: typeof output,
        isArray: Array.isArray(output),
        stringified: outputStr
      });
    }
    
    console.log("✅ Final extracted URL:", enhancedUrl);

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