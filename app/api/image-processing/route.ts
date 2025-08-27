import { NextResponse } from "next/server";
import Replicate from "replicate";

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
    const body = await req.json();
    console.log("📥 Incoming body:", body);

    const image = body?.image;
    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Send to Replicate
    let prediction = await replicate.predictions.create({
      version: MODEL,
      input: { image },
    });

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