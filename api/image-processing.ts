import { NextResponse } from "next/server";
import Replicate from "replicate";
import { put } from "@vercel/blob";

// Init Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

// Match input schema depending on model
function buildInput(model: string, imageUrl: string) {
  if (model.includes("swinir")) {
    return { image: imageUrl };
  }
  if (model.includes("codeformer")) {
    return {
      img: imageUrl,
      background_enhance: true,
      face_upsample: true,
      scale: 2,
    };
  }
  if (model.includes("realesrgan")) {
    return { image: imageUrl, scale: 2 };
  }
  return { image: imageUrl };
}

export async function POST(req: Request) {
  try {
    const { imageBase64, model } = await req.json();

    if (!imageBase64 || !model) {
      return NextResponse.json({ error: "Missing imageBase64 or model" }, { status: 400 });
    }

    // 1. Upload base64 → Blob
    const buffer = Buffer.from(
      imageBase64.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );
    const blob = await put(`uploads/${Date.now()}.png`, buffer, { access: "public" });

    // 2. Prepare input
    const input = buildInput(model, blob.url);

    // 3. Run Replicate
    const output = await replicate.run(model, { input });

    // Replicate sometimes returns array → normalize
    const result = Array.isArray(output) ? output[0] : output;

    return NextResponse.json({ url: result });
  } catch (err: any) {
    console.error("❌ Backend API Error:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}