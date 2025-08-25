import { NextResponse } from "next/server";
import Replicate from "replicate";
import { put } from "@vercel/blob";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_TOKEN,
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
    console.log("🔑 API Token available:", !!process.env.REPLICATE_API_TOKEN);
    console.log("🔑 Token available:", !!process.env.REPLICATE_TOKEN);
    
    const { imageBase64, model } = await req.json();
    console.log("📦 Model:", model);
    console.log("📦 Image length:", imageBase64?.length);
    
    if (!process.env.REPLICATE_API_TOKEN && !process.env.REPLICATE_TOKEN) {
      throw new Error("Missing REPLICATE_API_TOKEN environment variable");
    }
    
    // 1. Upload to Vercel Blob → get a URL
    const blob = await put(`uploads/${Date.now()}.png`, Buffer.from(imageBase64, "base64"), {
      access: "public",
    });
    console.log("📁 Blob URL:", blob.url);
    
    // 2. Build correct input for the model
    const input = buildInput(model, blob.url);
    console.log("🔧 Input:", JSON.stringify(input));
    
    // 3. Run Replicate
    console.log("🚀 Calling Replicate...");
    const output = await replicate.run(model, { input });
    console.log("✅ Output:", output);
    
    return NextResponse.json({ url: output });
  } catch (err: any) {
    console.error("❌ Backend API Error:", err);
    console.error("❌ Stack:", err.stack);
    return NextResponse.json({ 
      error: err.message,
      stack: err.stack,
      env_check: {
        has_replicate_api_token: !!process.env.REPLICATE_API_TOKEN,
        has_replicate_token: !!process.env.REPLICATE_TOKEN
      }
    }, { status: 500 });
  }
}