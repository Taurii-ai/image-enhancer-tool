// app/api/enhance/status/[id]/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is missing on the server." },
        { status: 500 }
      );
    }

    const { id } = params;
    console.log("📊 Checking status for prediction:", id);

    const statusResp = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: {
        "Authorization": `Bearer ${process.env.REPLICATE_API_TOKEN}`
      }
    });

    if (!statusResp.ok) {
      throw new Error(`Status check failed: ${statusResp.status}`);
    }

    const prediction = await statusResp.json();
    console.log(`⏳ Status: ${prediction.status}`);

    return NextResponse.json(prediction);

  } catch (err: any) {
    console.error("❌ STATUS error", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}