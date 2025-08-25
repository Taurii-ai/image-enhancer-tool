import Replicate from "replicate";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

    if (!REPLICATE_API_TOKEN) {
      return res.status(500).json({ error: "Missing REPLICATE_API_TOKEN" });
    }

    const replicate = new Replicate({ auth: REPLICATE_API_TOKEN });

    // Test with a simple public image URL
    const testImageUrl = "https://replicate.delivery/pbxt/2pEw8fxPnYTyiGIx4U2HjxTHZLKYsqYLnN7vqZGW8lxNLnvN1/out-0.png";
    
    console.log("🧪 Testing SwinIR model...");
    const swinirOutput = await replicate.run("jingyunliang/swinir:660d922d33153019e8c263a3bba265de882e7f4f70396546b6c9c8f9d47a021a", {
      input: { 
        image: testImageUrl,
        task_type: "Real-World Image Super-Resolution-Large"
      }
    });

    console.log("📋 SwinIR Raw Output:", JSON.stringify(swinirOutput, null, 2));

    return res.status(200).json({
      success: true,
      swinir_output: swinirOutput,
      swinir_type: typeof swinirOutput,
      swinir_is_array: Array.isArray(swinirOutput)
    });

  } catch (err) {
    console.error("Debug error:", err);
    return res.status(500).json({
      error: "Debug test failed",
      detail: err?.message || String(err),
    });
  }
}