import type { NextApiRequest, NextApiResponse } from "next";
import Replicate from "replicate";
import { put } from "@vercel/blob";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

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

    // Step 2: Run selected Replicate model
    console.log(`🚀 Running model: ${model}`);
    const output = await replicate.run(model, {
      input: {
        image: blob.url,
        scale: 2,
        face_enhance: true,
      },
    });

    // Step 3: Normalize output → ensure always a URL
    let enhancedUrl: string | null = null;

    if (Array.isArray(output) && output.length > 0 && typeof output[0] === "string") {
      enhancedUrl = output[0];
    } else if (typeof output === "string") {
      enhancedUrl = output;
    } else if (output?.output && Array.isArray(output.output)) {
      enhancedUrl = output.output[0];
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