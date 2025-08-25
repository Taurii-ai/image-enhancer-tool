import type { NextApiRequest, NextApiResponse } from "next";
import Replicate from "replicate";
import { put } from "@vercel/blob";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

// Dynamic input builder - each model expects different parameters
const buildInput = (model: string, imageUrl: string) => {
  if (model.includes("swinir")) {
    return { image: imageUrl };
  }
  if (model.includes("real-esrgan")) {
    return { image: imageUrl, scale: 2 };
  }
  if (model.includes("codeformer") || model.includes("gfpgan")) {
    return {
      img: imageUrl,
      scale: 2,
      background_enhance: true,
      face_upsample: true,
    };
  }
  // fallback
  return { image: imageUrl };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image, model } = req.body;
    if (!image || !model) {
      return res.status(400).json({ error: "Missing image or model" });
    }

    // Step 1: Upload to Vercel Blob (turns base64 into public URL)
    const buffer = Buffer.from(image.split(",")[1], "base64");
    const blob = await put(`uploads/${Date.now()}.png`, buffer, {
      access: "public",
      contentType: "image/png",
    });

    // Step 2: Run selected Replicate model with correct input schema
    console.log(`🚀 Running model: ${model}`);
    const input = buildInput(model, blob.url);
    console.log(`📋 Input parameters:`, input);
    
    const output = await replicate.run(model, { input });

    // Step 3: Normalize output → ensure always a URL
    let enhancedUrl: string | null = null;
    
    console.log(`📊 Raw output:`, typeof output, output);

    if (Array.isArray(output)) {
      enhancedUrl = output.find(item => typeof item === "string") || null;
    } else if (typeof output === "string") {
      enhancedUrl = output;
    } else if (output && typeof output === "object") {
      // Try different possible output structures
      if (Array.isArray(output.output)) {
        enhancedUrl = output.output.find(item => typeof item === "string") || null;
      } else if (typeof output.output === "string") {
        enhancedUrl = output.output;
      } else if (output.url) {
        enhancedUrl = output.url;
      }
    }

    if (!enhancedUrl) {
      throw new Error("No valid URL returned by model");
    }

    return res.status(200).json({ enhancedUrl });
  } catch (err: any) {
    console.error("❌ Backend Error:", err);
    return res.status(500).json({ error: err.message || "Enhancement failed" });
  }
}