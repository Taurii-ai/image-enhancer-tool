import type { VercelRequest, VercelResponse } from '@vercel/node';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('🌟 API CALLED:', req.method, req.url);
  console.log('🔍 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📝 Body type:', typeof req.body);
  
  if (req.method !== 'POST') {
    console.log('❌ Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📦 Raw body:', req.body);
    
    const { imageBase64, model } = req.body;

    if (!imageBase64 || !model) {
      console.log('❌ Missing parameters:', { hasImageBase64: !!imageBase64, hasModel: !!model });
      return res.status(400).json({ error: 'Missing imageBase64 or model parameter' });
    }

    console.log('🚀 Processing with model:', model);
    console.log('📊 Image base64 length:', imageBase64.length);

    // 1. Upload to Vercel Blob → get a URL
    const blob = await put(`uploads/${Date.now()}.png`, Buffer.from(imageBase64, "base64"), {
      access: "public",
    });

    console.log('📁 Uploaded to blob:', blob.url);

    // 2. Build correct input for the model
    const input = buildInput(model, blob.url);
    console.log('🔧 Built input:', JSON.stringify(input, null, 2));

    // 3. Run Replicate
    console.log('🤖 Calling Replicate with model:', model);
    const output = await replicate.run(model, { input });
    console.log('✅ Replicate output:', output);

    return res.status(200).json({ url: output });
  } catch (err: any) {
    console.error("❌ Backend API Error:", err);
    console.error("❌ Stack trace:", err.stack);
    return res.status(500).json({ 
      error: err.message,
      details: err.stack,
      timestamp: new Date().toISOString()
    });
  }
}