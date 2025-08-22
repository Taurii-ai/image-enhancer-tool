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

    const { imageBase64 } = await req.json();
    
    console.log("📨 REQUEST BODY received:");
    console.log("- imageBase64:", imageBase64 ? `${imageBase64.substring(0, 50)}...` : "null");

    if (!imageBase64) {
      return NextResponse.json({ error: "Provide imageBase64" }, { status: 400 });
    }

    // Convert base64 → binary buffer
    console.log("🔄 Converting base64 to buffer...");
    const buffer = Buffer.from(imageBase64.split(",")[1], "base64");

    // Step 1: Upload to Replicate
    console.log("🔄 Uploading to Replicate...");
    const uploadResp = await fetch("https://api.replicate.com/v1/upload", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/octet-stream"
      },
      body: buffer
    });

    if (!uploadResp.ok) {
      throw new Error(`Replicate upload failed: ${uploadResp.status}`);
    }

    const uploadData = await uploadResp.json();
    const replicateUrl = uploadData.urls.get;
    console.log("✅ Uploaded to Replicate:", replicateUrl);

    // Step 2: Call ESRGAN model
    console.log("🧪 Creating prediction...");
    const predictionResp = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: process.env.ENHANCER_MODEL_VERSION || "9283609c529e4e5ec2d9185cf5f5db8e623da7b91eeb9eb0c7c431e2d0d3af9e",
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

    return NextResponse.json(prediction);

  } catch (err: any) {
    console.error("❌ ENHANCE error", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}