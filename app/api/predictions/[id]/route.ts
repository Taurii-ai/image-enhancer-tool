import { NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = "nodejs";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export async function GET(_: Request, ctx: { params: { id: string } }) {
  try {
    const id = ctx.params.id;
    const prediction = await replicate.predictions.get(id);

    // Parse logs for a numeric progress if available, else smooth estimate
    let progress = 0;
    if (prediction.status === "starting") progress = 10;
    if (prediction.status === "processing") {
      const logs = prediction.logs || "";
      const match = logs.match(/progress.*?([0-9.]+)/i);
      if (match) {
        progress = Math.floor(Math.min(95, Number(match[1]) * 100));
      } else {
        // fallback: rough heuristic
        progress = 50;
      }
    }
    if (prediction.status === "succeeded") progress = 100;

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      output: prediction.output ?? null,
      logs: prediction.logs ?? null,
      progress,
    });
  } catch (err: any) {
    console.error("Poll prediction error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}