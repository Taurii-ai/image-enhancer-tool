// app/api/enhance/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    if (!imageUrl && !dataUrl) {
      return NextResponse.json({ error: "Provide imageUrl (public) or dataUrl (base64)" }, { status: 400 });
    }

    let imgBlob: ArrayBuffer;
    
    if (imageUrl) {
      // Step 1a: Fetch from provided URL
      console.log("🔄 Fetching image from URL...");
      const imgResp = await fetch(imageUrl);
      if (!imgResp.ok) throw new Error(`Failed to fetch image: ${imgResp.status}`);
      imgBlob = await imgResp.arrayBuffer();
    } else {
      // Step 1b: Convert dataURL to buffer
      console.log("🔄 Converting dataURL to buffer...");
      const matches = dataUrl.match(/^data:(.+);base64,(.*)$/);
      if (!matches) throw new Error("Invalid dataUrl");
      const [, , b64] = matches;
      const buffer = Buffer.from(b64, "base64");
      imgBlob = buffer;
    }

    // Step 2: Upload raw file to Replicate's upload endpoint
    console.log("🔄 Uploading to Replicate...");
    const uploadResp = await fetch("https://api.replicate.com/v1/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/octet-stream"
      },
      body: imgBlob
    });

    if (!uploadResp.ok) {
      throw new Error(`Replicate upload failed: ${uploadResp.status}`);
    }

    const uploadData = await uploadResp.json();
    const replicateUrl = uploadData.urls.get; // This is what ESRGAN can read
    console.log("✅ Uploaded to Replicate:", replicateUrl);

    // Step 3: Call Real-ESRGAN with proper input
    console.log("🧪 Creating prediction...");
    const predictionResp = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "9283609c529e4e5ec2d9185cf5f5db8e623da7b91eeb9eb0c7c431e2d0d3af9e",
        input: {
          image: replicateUrl,
          scale: 2,
          face_enhance: true
        }
      })
    });

    if (!predictionResp.ok) {
      throw new Error(`Prediction failed: ${predictionResp.status}`);
    }

    const prediction = await predictionResp.json();
    console.log("✅ Prediction created:", prediction.id);

    // Step 4: Poll for completion
    let result = prediction;
    while (result.status === "starting" || result.status === "processing") {
      console.log(`⏳ Status: ${result.status}, waiting...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResp = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: {
          "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`
        }
      });
      result = await statusResp.json();
    }

    if (result.status === "failed") {
      throw new Error(`Enhancement failed: ${result.error}`);
    }

    console.log("✅ Final result:", result);

    // Get enhanced URL from output
    const enhancedUrl = Array.isArray(result.output) ? result.output[0] : result.output;
    if (!enhancedUrl || typeof enhancedUrl !== "string") {
      return NextResponse.json(
        { error: "Model returned no URL", debug: result },
        { status: 502 }
      );
    }

    // Measure dimensions
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
      model: "nightmareai/real-esrgan",
      usedParams: { image: replicateUrl, scale: 2, face_enhance: true },
      original: { url: imageUrl || "dataUrl" },
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