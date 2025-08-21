import { NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = "nodejs"; // ensure Node runtime for Buffer

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

function parseExtra() {
  try {
    return JSON.parse(process.env.ENHANCER_EXTRA || "{}");
  } catch {
    return {};
  }
}

// Manual upload helper in case library upload ever fails
async function uploadToReplicateFile(buf: Buffer, filename: string) {
  const res = await fetch("https://api.replicate.com/v1/files", {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
    body: buf,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`File upload failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<{ id: string; url: string; name: string }>;
}

export async function POST(request: Request) {
  try {
    if (!process.env.REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "Missing REPLICATE_API_TOKEN" }, { status: 500 });
    }
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded (field 'image')" }, { status: 400 });
    }

    const modelSlug = process.env.ENHANCER_MODEL_SLUG!;
    const inputKey = process.env.ENHANCER_INPUT_KEY || "image";
    const extras = parseExtra();

    // Convert to Buffer for upload
    const ab = await file.arrayBuffer();
    const buf = Buffer.from(ab);

    // 1) Upload file to Replicate (returns a fetchable URL)
    const uploaded = await uploadToReplicateFile(buf, file.name || "upload.png");

    // 2) Create prediction (do NOT pass blob: urls! Use the uploaded file URL)
    const prediction = await replicate.predictions.create({
      model: modelSlug, // use a slug so you don't get "Invalid version" errors
      input: {
        [inputKey]: uploaded.url,
        ...extras,
      },
    });

    if ((prediction as any).error) {
      return NextResponse.json({ error: (prediction as any).error }, { status: 500 });
    }

    // Return the prediction id so the client can poll (best UX + real progress)
    return NextResponse.json(
      {
        id: prediction.id,
        status: prediction.status,
        origin: uploaded.url, // original file url (for debugging; you can hide later)
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Create prediction error:", err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}