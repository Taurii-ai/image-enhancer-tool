import type { VercelRequest, VercelResponse } from '@vercel/node';
import Replicate from "replicate";
import { put } from "@vercel/blob";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("🔑 Env vars:", Object.keys(process.env).filter(k => k.includes('REPLIC')));
    console.log("🔑 API Token available:", !!process.env.REPLICATE_API_TOKEN);
    
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN!,
    });
    
    const { imageBase64, model } = req.body;
    console.log("📦 Model:", model);
    console.log("📦 Image length:", imageBase64?.length);
    
    if (!process.env.REPLICATE_API_TOKEN) {
      throw new Error("Missing REPLICATE_API_TOKEN environment variable");
    }
    
    if (!imageBase64 || !model) {
      return res.status(400).json({ error: 'Missing imageBase64 or model parameter' });
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
    
    return res.status(200).json({ url: output });
  } catch (err: any) {
    console.error("❌ Backend API Error:", err);
    console.error("❌ Stack:", err.stack);
    return res.status(500).json({ 
      error: err.message,
      stack: err.stack,
      env_available: Object.keys(process.env).filter(k => k.includes('REPLIC')),
      token_check: !!process.env.REPLICATE_API_TOKEN
    });
  }
}