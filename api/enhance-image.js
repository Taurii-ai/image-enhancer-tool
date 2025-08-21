// pages/api/enhance-image.js
import formidable from "formidable";
import fs from "fs";

// Disable Next.js body parser
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
    const form = formidable({});
    const [fields, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // Step 1: upload image to file.io for a public URL
    const fileStream = fs.createReadStream(file.filepath);
    const uploadRes = await fetch("https://file.io/?expires=1d", {
      method: "POST",
      body: fileStream,
    });
    const uploadJson = await uploadRes.json();
    const imageUrl = uploadJson.link;

    if (!imageUrl) {
      return res.status(500).json({ error: "Failed to upload to file.io" });
    }

    // Step 2: call Replicate with the public URL
    const replicateRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
        input: { image: imageUrl },
      }),
    });

    let prediction = await replicateRes.json();
    
    // Step 3: Poll for completion
    while (!["succeeded", "failed"].includes(prediction.status)) {
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
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