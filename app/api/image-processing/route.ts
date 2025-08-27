import { NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const MODEL = "jingyunliang/swinir:660d922d33153019e8c263a3bba265de882e7f4f70396546b6c9c8f9d47a021a";

// Extract first valid HTTPS URL from any nested structure
function extractUrl(obj: any): string | null {
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

export async function POST(req: Request) {
  try {
    console.log("🚀 API /api/image-processing called");
    
    // Parse request body
    const body = await req.json();
    console.log("📥 Request body keys:", Object.keys(body || {}));
    
    // Validate image field
    const image = body?.image;
    if (!image || typeof image !== "string") {
      console.log("❌ No image provided in request");
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }
    
    console.log("✅ Image received, length:", image.length);
    console.log("🔑 Using REPLICATE_API_TOKEN:", process.env.REPLICATE_API_TOKEN ? "SET" : "MISSING");
    
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "Replicate API token not configured" }, { status: 500 });
    }

    // Create Replicate prediction
    console.log("🤖 Creating Replicate prediction...");
    let prediction = await replicate.predictions.create({
      version: MODEL,
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
    }
    
    if (prediction.status !== "succeeded") {
      console.log("❌ Prediction failed with status:", prediction.status);
      return NextResponse.json({ 
        error: `Replicate job ${prediction.status}` 
      }, { status: 500 });
    }
    
    // Log raw output for debugging
    console.log("🔍 Raw Replicate output:", JSON.stringify(prediction.output, null, 2));
    
    // Extract URL from response
    const enhancedUrl = extractUrl(prediction.output);
    
    if (!enhancedUrl) {
      console.log("❌ No URL found in Replicate output");
      return NextResponse.json({ 
        error: "No enhanced image URL returned from Replicate" 
      }, { status: 500 });
    }
    
    console.log("✅ Enhanced URL extracted:", enhancedUrl);
    
    // Return success response
    return NextResponse.json({ enhancedUrl });
    
  } catch (error: any) {
    console.error("❌ API Error:", error);
    return NextResponse.json({ 
      error: error.message || "Internal server error" 
    }, { status: 500 });
  }
}