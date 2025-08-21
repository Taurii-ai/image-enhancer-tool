// app/api/enhance/route.ts
import { NextResponse } from "next/server";
import { replicate } from "@/app/lib/replicate";
import { put } from "@vercel/blob";

const REAL_ESRGAN_VERSION =
  // Pin to a current public version to avoid 422 "Invalid version".
  // (Model: nightmareai/real-esrgan; inputs: image, scale, face_enhance)
  // https://replicate.com/nightmareai/real-esrgan/api/learn-more
  "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // ensure this runs on server

export async function POST(req: Request) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "REPLICATE_API_TOKEN is missing on the server." },
        { status: 500 }
      );
    }

    const form = await req.formData();
    const file = form.get("image") as File | null;
    const scale = Number(form.get("scale") ?? 4);
    const faceEnhance = String(form.get("faceEnhance") ?? "false") === "true";

    if (!file) {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    // Upload original to Vercel Blob so Replicate can fetch it.
    // (blob: URLs from the browser are NOT fetchable by Replicate.)
    const arrayBuffer = await file.arrayBuffer();
    const originalBlob = await put(
      `uploads/${crypto.randomUUID()}-${file.name || "image"}`,
      new Uint8Array(arrayBuffer),
      { access: "public", contentType: file.type || "image/png" }
    );
    const originalUrl = originalBlob.url;

    // Call Real-ESRGAN on Replicate (server-side only).
    // Inputs documented here (image, scale, face_enhance).
    const output = await replicate.run(REAL_ESRGAN_VERSION, {
      input: {
        image: originalUrl,
        scale,
        face_enhance: faceEnhance,
      },
    });

    // Handle both return shapes (string or array) depending on client version.
    const maybeUrl = Array.isArray(output) ? output[output.length - 1] : output;
    if (typeof maybeUrl !== "string") {
      return NextResponse.json(
        { error: "Unexpected Replicate output shape.", debug: output },
        { status: 500 }
      );
    }

    // Re-host the output to Vercel Blob so it won't expire (delivery URLs are temporary).
    const enhancedRes = await fetch(maybeUrl);
    if (!enhancedRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch enhanced image from Replicate delivery.", status: enhancedRes.status },
        { status: 502 }
      );
    }
    const enhancedArrayBuffer = await enhancedRes.arrayBuffer();
    const enhancedBlob = await put(
      `outputs/${crypto.randomUUID()}-enhanced.png`,
      new Uint8Array(enhancedArrayBuffer),
      { access: "public", contentType: "image/png" }
    );

    return NextResponse.json(
      {
        ok: true,
        originalUrl,
        enhancedUrl: enhancedBlob.url, // stable URL for your UI
      },
      { status: 200 }
    );
  } catch (err: any) {
    // Normalize common Replicate errors
    const message = String(err?.message || err);
    const isVersionErr =
      message.includes("Invalid version") || message.includes("not permitted");
    const status = isVersionErr ? 422 : 500;

    return NextResponse.json(
      {
        ok: false,
        error: isVersionErr
          ? "Invalid or private model version. We pinned a public version; check REAL_ESRGAN_VERSION."
          : "Enhance failed.",
        detail: message,
      },
      { status }
    );
  }
}