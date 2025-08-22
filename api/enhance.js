// api/enhance.js
import Replicate from "replicate";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "Missing imageUrl in request body" });
    }

    console.log("🚀 Enhancing image:", imageUrl);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Build inputs
    const inputs = {
      [process.env.ENHANCER_INPUT_KEY || "image"]: imageUrl,
      ...JSON.parse(process.env.ENHANCER_EXTRA || "{}"),
    };

    console.log("📦 Sending to Replicate with model:", process.env.ENHANCER_MODEL_SLUG);
    console.log("📤 Inputs:", inputs);

    // Run model
    const output = await replicate.run(
      `${process.env.ENHANCER_MODEL_SLUG}:latest`,
      { input: inputs }
    );

    console.log("✅ Replicate output:", output);

    if (!output || output.length === 0) {
      return res.status(500).json({ error: "No output from Replicate" });
    }

    // Real-ESRGAN usually returns a single image URL
    const enhancedUrl = Array.isArray(output) ? output[0] : output;

    return res.status(200).json({
      success: true,
      original: imageUrl,
      enhanced: enhancedUrl,
    });
  } catch (err) {
    console.error("❌ Backend API Error:", err);
    return res.status(500).json({
      error: err.message || "Unknown server error",
    });
  }
}