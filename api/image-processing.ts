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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, model } = req.body;

    if (!imageBase64 || !model) {
      return res.status(400).json({ error: 'Missing imageBase64 or model parameter' });
    }

    console.log('🚀 Processing with model:', model);

    // 1. Upload to Vercel Blob → get a URL
    const blob = await put(`uploads/${Date.now()}.png`, Buffer.from(imageBase64, "base64"), {
      access: "public",
    });

    console.log('📁 Uploaded to blob:', blob.url);

    // 2. Build correct input for the model
    const input = buildInput(model, blob.url);
    console.log('🔧 Built input:', input);

    // 3. Run Replicate
    const output = await replicate.run(model, { input });
    console.log('✅ Replicate output:', output);

    return res.status(200).json({ url: output });
  } catch (err: any) {
    console.error("Backend API Error:", err);
    return res.status(500).json({ error: err.message });
  }
}