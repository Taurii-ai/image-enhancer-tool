import type { NextApiRequest, NextApiResponse } from "next";
import Replicate from "replicate";

// Always check env vars at startup
if (!process.env.REPLICATE_API_TOKEN) {
  throw new Error("❌ Missing REPLICATE_API_TOKEN in environment variables.");
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { imageBase64, model } = req.body;

    if (!imageBase64 || !model) {
      return res.status(400).json({ error: "Missing imageBase64 or model" });
    }

    // ✅ Convert base64 → Blob URL
    const buffer = Buffer.from(imageBase64.split(",")[1], "base64");
    const blobRes = await fetch("https://api.vercel.com/v2/blobs", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        "Content-Type": "application/octet-stream",
      },
      body: buffer,
    });

    if (!blobRes.ok) {
      const text = await blobRes.text();
      throw new Error(`Blob upload failed: ${text}`);
    }

    const { url: blobUrl } = await blobRes.json();

    // ✅ Run Replicate model
    const output = await replicate.run(model, {
      input: { image: blobUrl, scale: 2, face_enhance: true },
    });

    const imageUrl = Array.isArray(output) ? output[0] : output;

    return res.status(200).json({ url: imageUrl });
  } catch (error: any) {
    console.error("🔥 Backend error:", error);
    return res.status(500).json({ error: error.message || "Unknown error" });
  }
}