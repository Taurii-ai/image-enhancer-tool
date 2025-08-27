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

    console.log("🔍 Raw Replicate output:", JSON.stringify(output, null, 2));

    // 🔑 Normalize into a string URL using recursive extraction
    let enhancedUrl = null;

    const tryExtract = (val) => {
      if (!val) return null;
      if (typeof val === "string" && val.startsWith("http")) return val;
      if (Array.isArray(val)) {
        for (const v of val) {
          const found = tryExtract(v);
          if (found) return found;
        }
      }
      if (typeof val === "object") {
        if (typeof val.url === "string") return val.url;
        for (const key of Object.keys(val)) {
          const found = tryExtract(val[key]);
          if (found) return found;
        }
      }
      return null;
    };

    enhancedUrl = tryExtract(output);

    if (!enhancedUrl) {
      console.error("❌ Could not extract URL from Replicate output:", output);
      return res.status(500).json({ error: "No enhanced image URL returned from Replicate" });
    }

    console.log("✅ Final enhancedUrl:", enhancedUrl);
    return res.status(200).json({ url: enhancedUrl });

  } catch (err) {
    console.error("❌ Enhance API error:", err);
    return res.status(500).json({ 
      error: "Image enhancement failed", 
      details: err.message 
    });
  }
}