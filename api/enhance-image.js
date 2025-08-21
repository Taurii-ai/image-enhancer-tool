// pages/api/enhance-image.js
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Save to Vercel Blob
    const blob = await put(`uploads/${uuidv4()}.png`, buffer, {
      access: "public",
    });

    const imageUrl = blob.url;

    // Send to Replicate
    const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version:
          "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
        input: { image: imageUrl },
      }),
    });

    let prediction = await replicateRes.json();
    
    // Poll for completion
    while (!["succeeded", "failed"].includes(prediction.status)) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });
      prediction = await pollRes.json();
    }

    res.status(200).json(prediction);
  } catch (err) {
    console.error("Enhance error:", err);
    res.status(500).json({ error: err.message });
  }
}