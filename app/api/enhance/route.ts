// app/api/enhance/route.ts
import { NextResponse } from "next/server";
import { replicate } from "@/app/lib/replicate";
import { put } from "@vercel/blob";

const REAL_ESRGAN_VERSION =
  // Pin to a current public version to avoid 422 "Invalid version".
  // (Model: nightmareai/real-esrgan; inputs: image, scale, face_enhance)
  // https://replicate.com/nightmareai/real-esrgan/api/learn-more
  "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // ensure this runs on server

export async function POST(req: Request) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is missing on the server." },
        { status: 500 }
      );
    }

    const { imageUrl, dataUrl, params } = await req.json();
    
    console.log("📨 REQUEST BODY received:");
    console.log("- imageUrl:", imageUrl ? `${imageUrl.substring(0, 100)}...` : "null");
    console.log("- dataUrl:", dataUrl ? `${dataUrl.substring(0, 50)}...` : "null");
    console.log("- params:", params);

    const model = process.env.ENHANCER_MODEL_SLUG || "nightmareai/real-esrgan";
    const inputKey = process.env.ENHANCER_INPUT_KEY || "image";

    // Merge defaults from env + per-request overrides
    const envExtra = JSON.parse(process.env.ENHANCER_EXTRA || "{}");
    const merged = { ...envExtra, ...(params || {}) };

    if (!imageUrl && !dataUrl) {
      return NextResponse.json({ error: "Provide imageUrl (public) or dataUrl (base64)" }, { status: 400 });
    }

    // 1) Get a URL Replicate can reach
    let sourceUrl = imageUrl || null;

    if (!sourceUrl && dataUrl) {
      console.log("🔄 Converting dataURL to Replicate file...");
      
      // Convert dataURL to buffer and upload to Replicate
      const matches = dataUrl.match(/^data:(.+);base64,(.*)$/);
      if (!matches) throw new Error("Invalid dataUrl");
      const [, mime, b64] = matches;
      const buffer = Buffer.from(b64, "base64");

      // Upload to Vercel Blob as fallback (in case Replicate files API doesn't work)
      const originalBlob = await put(
        `uploads/${crypto.randomUUID()}.${mime.includes("png") ? "png" : "jpg"}`,
        new Uint8Array(buffer),
        { access: "public", contentType: mime }
      );
      sourceUrl = originalBlob.url;
      console.log("✅ Uploaded to Vercel Blob:", sourceUrl);
    }

    // 2) Build inputs
    const inputs = { [inputKey]: sourceUrl, ...merged };

    console.log("🧪 ENHANCE start");
    console.log("Model:", model);
    console.log("Input key:", inputKey);
    console.log("Source URL:", sourceUrl);
    console.log("Environment extras:", envExtra);
    console.log("Merged params:", merged);
    console.log("Final inputs object:", JSON.stringify(inputs, null, 2));

    // 3) Call Real-ESRGAN on Replicate
    const output = await replicate.run(model, { input: inputs });

    console.log("✅ Replicate output:", output);

    // Normalize output => URL
    const enhancedUrl = Array.isArray(output) ? output[0] : output;
    if (!enhancedUrl || typeof enhancedUrl !== "string") {
      return NextResponse.json(
        { error: "Model returned no URL", debug: output },
        { status: 502 }
      );
    }

    // 4) Optional: measure sizes (server-side best-effort)
    async function getNaturalSize(url: string) {
      try {
        const resp = await fetch(url, { method: "GET" });
        if (!resp.ok) throw new Error(`Bad status ${resp.status}`);
        const buf = Buffer.from(await resp.arrayBuffer());

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

    const enhancedSize = await getNaturalSize(enhancedUrl);

    return NextResponse.json({
      ok: true,
      model,
      usedParams: inputs,
      original: { url: sourceUrl },
      enhanced: { url: enhancedUrl, ...enhancedSize },
      cacheBust: Date.now(),
    });
  } catch (err: any) {
    console.error("❌ ENHANCE error", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}