import { NextResponse } from "next/server";

// Simple test first - no external dependencies
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    console.log("🚀 API route called - TEST VERSION");
    
    const body = await req.json().catch((err) => {
      console.error("❌ Failed to parse request body:", err);
      return null;
    });
    
    console.log("📥 Body received:", body ? "YES" : "NO");
    console.log("📥 Image field type:", typeof body?.image);
    console.log("📥 Image length:", body?.image?.length || 0);

    if (!body?.image) {
      console.error("❌ No image in request");
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // FOR NOW: Return a test response to see if basic JSON works
    console.log("✅ Returning test response - REDEPLOY");
    return NextResponse.json({ 
      enhancedUrl: "https://replicate.delivery/pbxt/test123/output.png",
      test: true,
      message: "API is working, returning test URL - REDEPLOY"
    });
    
  } catch (err: any) {
    console.error("❌ API error:", err);
    return NextResponse.json({ 
      error: "API failed", 
      message: String(err)
    }, { status: 500 });
  }
}