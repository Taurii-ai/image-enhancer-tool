// api/enhance.js
import Replicate from "replicate";

// Optional: tiny helper to get image dimensions from a remote URL
async function getNaturalSize(url) {
  try {
    // Lightweight probe using HTMLImageElement on server isn't possible.
    // Instead, fetch the first bytes and parse. To avoid extra deps, we do a full fetch
    // and parse PNG/JPEG headers roughly. If you prefer a lib, install `probe-image-size`.
    const resp = await fetch(url, { method: "GET" });
    if (!resp.ok) throw new Error(`Bad status ${resp.status}`);
    const buf = Buffer.from(await resp.arrayBuffer());

    // Very rough dimension parse (JPEG/PNG only)
    // If parsing fails, we return nulls (UI will still measure on client).
    let w = null, h = null;
    // PNG
    if (buf.slice(0,8).toString('hex') === '89504e470d0a1a0a') {
      w = buf.readUInt32BE(16);
      h = buf.readUInt32BE(20);
    } else {
      // JPEG scan for SOFn
      for (let i=0; i<buf.length-9; i++) {
        if (buf[i] === 0xFF && (buf[i+1] >= 0xC0 && buf[i+1] <= 0xC3)) {
          h = buf.readUInt16BE(i+5);
          w = buf.readUInt16BE(i+7);
          break;
        }
      }
    }
    return { width: w, height: h };
  } catch {
    return { width: null, height: null };
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "20mb" }, // allow big images
  },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { imageUrl, dataUrl, params } = req.body || {};
    console.log("📨 REQUEST BODY received:");
    console.log("- imageUrl:", imageUrl ? `${imageUrl.substring(0, 100)}...` : "null");
    console.log("- dataUrl:", dataUrl ? `${dataUrl.substring(0, 50)}...` : "null");
    console.log("- params:", params);
    const model = process.env.ENHANCER_MODEL_SLUG || "nightmareai/real-esrgan";
    const inputKey = process.env.ENHANCER_INPUT_KEY || "image";

    // Merge defaults from env + per-request overrides
    const envExtra = JSON.parse(process.env.ENHANCER_EXTRA || "{}"); // e.g. {"scale":2,"face_enhance":true}
    const merged = { ...envExtra, ...(params || {}) };

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // 1) Ensure we have a URL Replicate can reach
    let sourceUrl = imageUrl || null;

    if (!sourceUrl && dataUrl) {
      // Convert dataURL to a file and upload with Replicate's uploader (SDK >= 0.30)
      const matches = dataUrl.match(/^data:(.+);base64,(.*)$/);
      if (!matches) throw new Error("Invalid dataUrl");
      const [, mime, b64] = matches;
      const buffer = Buffer.from(b64, "base64");
      const filename = `upload-${Date.now()}.${mime.includes("png") ? "png" : mime.includes("jpeg") ? "jpg" : "bin"}`;

      if (typeof replicate.upload === "function") {
        const fileUrl = await replicate.upload(buffer, { contentType: mime, filename });
        sourceUrl = fileUrl;
      } else {
        // Older SDK: require imageUrl instead (fail clearly)
        throw new Error("Replicate SDK too old for direct uploads. Provide a public imageUrl instead.");
      }
    }

    if (!sourceUrl) return res.status(400).json({ error: "Provide imageUrl (public) or dataUrl (base64)" });

    // 2) Build inputs
    const inputs = { [inputKey]: sourceUrl, ...merged };

    console.log("🧪 ENHANCE start");
    console.log("Model:", model);
    console.log("Input key:", inputKey);
    console.log("Source URL:", sourceUrl);
    console.log("Environment extras:", envExtra);
    console.log("Merged params:", merged);
    console.log("Final inputs object:", JSON.stringify(inputs, null, 2));

    // 3) Run model (pin a version if you have one; leaving unpinned here)
    const output = await replicate.run(`${model}`, { input: inputs });

    console.log("✅ Replicate output:", output);

    // Normalize output => URL
    const enhancedUrl = Array.isArray(output) ? output[0] : output;
    if (!enhancedUrl || typeof enhancedUrl !== "string") {
      return res.status(502).json({ error: "Model returned no URL" });
    }

    // 4) Optional: measure sizes (server-side best-effort)
    const enhancedSize = await getNaturalSize(enhancedUrl);

    return res.status(200).json({
      ok: true,
      model,
      usedParams: inputs,
      original: { url: sourceUrl },
      enhanced: { url: enhancedUrl, ...enhancedSize },
      cacheBust: Date.now(),
    });
  } catch (err) {
    console.error("❌ ENHANCE error", err);
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
}