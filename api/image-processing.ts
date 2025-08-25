import { NextResponse } from "next/server";
import Replicate from "replicate";
import { put } from "@vercel/blob";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

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

    // 1. Upload to Vercel Blob → get a URL
    const blob = await put(`uploads/${Date.now()}.png`, Buffer.from(imageBase64, "base64"), {
      access: "public",
    });

    // 2. Build correct input for the model
    const input = buildInput(model, blob.url);

    // 3. Run Replicate
    const output = await replicate.run(model, { input });

    return NextResponse.json({ url: output });
  } catch (err: any) {
    console.error("Backend API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}