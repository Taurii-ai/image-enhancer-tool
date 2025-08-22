// app/api/health/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const model = process.env.ENHANCER_MODEL_SLUG || "nightmareai/real-esrgan";
  const tokenSet = !!process.env.REPLICATE_API_TOKEN;
  const extra = process.env.ENHANCER_EXTRA || "{}";
  
  let parsedExtra;
  try {
    parsedExtra = JSON.parse(extra);
  } catch (e) {
    parsedExtra = { error: "Failed to parse ENHANCER_EXTRA", raw: extra };
  }
  
  return NextResponse.json({
    ok: true,
    model,
    tokenSet,
    extra: parsedExtra,
    inputKey: process.env.ENHANCER_INPUT_KEY || "image",
  });
}