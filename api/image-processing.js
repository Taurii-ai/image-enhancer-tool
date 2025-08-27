import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Validate API token on startup
if (!process.env.REPLICATE_API_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN is not set!');
} else {
  console.log('✅ REPLICATE_API_TOKEN is configured');
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64: image, model } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    if (!model) {
      return res.status(400).json({ error: "No model provided" });
    }

    console.log('🚀 Starting enhancement with model:', model);
    
    const output = await replicate.run(model, {
      input: { image }
    });

    console.log("🧪 Raw replicate output:", output);

    // 🔑 Replicate returns an array of URLs
    let enhancedUrl = null;
    if (Array.isArray(output) && output.length > 0 && typeof output[0] === "string") {
      enhancedUrl = output[0];
    } else if (typeof output === "string") {
      enhancedUrl = output;
    }

    if (!enhancedUrl) {
      return res.status(500).json({ error: "No enhanced image URL returned from Replicate" });
    }

    console.log("✅ Final enhancedUrl:", enhancedUrl);
    return res.status(200).json({ url: enhancedUrl });

  } catch (err) {
    console.error("❌ Replicate API error:", err);
    return res.status(500).json({ 
      error: err?.message || "Internal Server Error"
    });
  }
}