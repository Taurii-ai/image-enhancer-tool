import { NextResponse } from "next/server";
import Replicate from "replicate";

// Vercel runtime configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

const MODEL =
  "jingyunliang/swinir:660d922d33153019e8c263a3bba265de882e7f4f70396546b6c9c8f9d47a021a";

// Helper: dig out the first URL
function extractUrl(output: any): string | null {
  if (!output) return null;
  if (typeof output === "string" && output.startsWith("http")) return output;
  if (Array.isArray(output)) {
    for (const item of output) {
      const u = extractUrl(item);
      if (u) return u;
    }
  }
  if (typeof output === "object") {
    for (const k of Object.keys(output)) {
      const u = extractUrl(output[k]);
      if (u) return u;
    }
  }
  return null;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  try {
    console.log("🚀 API route called");
    
    // Check environment variables
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error("❌ REPLICATE_API_TOKEN is missing from environment");
      return NextResponse.json({ error: "Server configuration error: REPLICATE_API_TOKEN not set" }, { status: 500 });
    }
    
    console.log("✅ REPLICATE_API_TOKEN is present:", process.env.REPLICATE_API_TOKEN ? "***set***" : "missing");
    
    const body = await req.json().catch((err) => {
      console.error("❌ Failed to parse request body:", err);
      return null;
    });
    
    console.log("📥 Incoming body keys:", body ? Object.keys(body) : "null");
    console.log("📥 Image field type:", typeof body?.image);
    console.log("📥 Image field length:", body?.image?.length || 0);

    const image = body?.image;
    if (!image || typeof image !== "string") {
      console.error("❌ No valid image in request body");
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Send to Replicate
    console.log("🤖 Creating Replicate prediction...");
    let prediction;
    try {
      prediction = await replicate.predictions.create({
        version: MODEL,
        input: { image },
      });
      console.log("✅ Prediction created:", prediction.id, "status:", prediction.status);
    } catch (replicateError: any) {
      console.error("❌ Replicate API error:", replicateError);
      console.error("❌ Error details:", {
        message: replicateError.message,
        status: replicateError.status,
        body: replicateError.body,
      });
      return NextResponse.json({ 
        error: `Replicate API failed: ${replicateError.message}`,
        details: replicateError.body || replicateError.message 
      }, { status: 500 });
    }

    // Poll until complete
    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed" &&
      prediction.status !== "canceled"
    ) {
      await wait(2000);
      prediction = await replicate.predictions.get(prediction.id);
    }

    if (prediction.status !== "succeeded") {
      return NextResponse.json(
        { error: `Replicate job ${prediction.status}` },
        { status: 500 }
      );
    }

    const enhancedUrl = extractUrl(prediction.output);
    if (!enhancedUrl) {
      console.error("⚠️ No URL in Replicate output:", prediction.output);
      return NextResponse.json(
        { error: "No enhanced image URL returned from Replicate" },
        { status: 500 }
      );
    }

    console.log("✅ Enhanced URL:", enhancedUrl);
    return NextResponse.json({ enhancedUrl });
  } catch (err: any) {
    console.error("❌ API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}