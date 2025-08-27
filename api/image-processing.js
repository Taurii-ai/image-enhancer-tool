const Replicate = require("replicate");

// Model configurations
const MODELS = {
  'general': 'jingyunliang/swinir:660d922d33153019e8c263a3bba265de882e7f4f70396546b6c9c8f9d47a021a',
  'faces': 'sczhou/codeformer:cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2', 
  'anime': 'xinntao/realesrgan:1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56'
};

// Initialize Replicate
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

// Extract first HTTPS URL from any nested structure
function extractUrl(obj) {
  if (!obj) return null;
  
  // If it's a string and starts with https, return it
  if (typeof obj === "string" && obj.startsWith("https://")) {
    return obj;
  }
  
  // If it's an array, search through each item
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const url = extractUrl(item);
      if (url) return url;
    }
  }
  
  // If it's an object, search through each value
  if (typeof obj === "object") {
    for (const key in obj) {
      const url = extractUrl(obj[key]);
      if (url) return url;
    }
  }
  
  return null;
}

export default async function handler(req, res) {
  try {
    // Always set JSON content type first
    res.setHeader('Content-Type', 'application/json');
    
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).json({ message: 'OK' });
    }
    
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    console.log("🚀 Image processing API called");
    
    // Check API token
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("❌ REPLICATE_API_TOKEN missing");
      return res.status(500).json({ error: "API token not configured" });
    }

    // Parse request body
    const { image, model = 'general' } = req.body || {};
    console.log("📥 Request body keys:", Object.keys(req.body || {}));
    console.log("🔍 Image type:", typeof image, "length:", image?.length || 0);
    console.log("🎯 Model selected:", model);

    if (!image || typeof image !== "string") {
      console.error("❌ No valid image provided");
      return res.status(400).json({ error: "No image provided" });
    }

    // Select model
    const selectedModel = MODELS[model] || MODELS.general;
    console.log("🤖 Using model:", selectedModel);

    // Create Replicate prediction
    console.log("⏳ Creating Replicate prediction...");
    let prediction = await replicate.predictions.create({
      version: selectedModel,
      input: { image }
    });
    
    console.log("📝 Prediction created:", prediction.id, "status:", prediction.status);

    // Poll until completion
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max
    
    while (
      prediction.status !== "succeeded" && 
      prediction.status !== "failed" && 
      prediction.status !== "canceled" &&
      attempts < maxAttempts
    ) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      prediction = await replicate.predictions.get(prediction.id);
      attempts++;
      console.log(`🔄 Poll ${attempts}/${maxAttempts}: ${prediction.status}`);
      
      if (attempts >= maxAttempts) {
        console.error("⏰ Prediction timed out");
        return res.status(504).json({ error: "Enhancement timed out" });
      }
    }
    
    if (prediction.status !== "succeeded") {
      console.error("❌ Prediction failed:", prediction.status);
      return res.status(500).json({ 
        error: `Replicate job ${prediction.status}`,
        logs: prediction.logs || null
      });
    }
    
    // Log raw output for debugging
    console.log("🔍 Raw Replicate output:", JSON.stringify(prediction.output, null, 2));
    
    // Extract URL from response
    const enhancedUrl = extractUrl(prediction.output);
    
    if (!enhancedUrl) {
      console.error("❌ No URL found in output:", prediction.output);
      return res.status(500).json({ 
        error: "No enhanced image URL returned from Replicate",
        rawOutput: prediction.output
      });
    }
    
    console.log("✅ Enhancement successful:", enhancedUrl);
    
    // Return success response
    return res.status(200).json({ 
      enhancedUrl,
      predictionId: prediction.id,
      model: model
    });
    
  } catch (innerError) {
    console.error("❌ Inner API Error:", innerError);
    return res.status(500).json({ 
      error: innerError.message || "Internal server error",
      details: innerError.toString()
    });
  }
  } catch (outerError) {
    console.error("❌ Outer API Error:", outerError);
    // Ensure we always return JSON, even if headers failed
    try {
      res.setHeader('Content-Type', 'application/json');
    } catch (headerError) {
      console.error("❌ Header Error:", headerError);
    }
    return res.status(500).json({ 
      error: "Critical API failure",
      message: outerError.message || "Unknown error",
      details: outerError.toString()
    });
  }
}