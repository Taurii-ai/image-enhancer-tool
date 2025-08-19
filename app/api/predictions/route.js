import { NextResponse } from "next/server";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { detail: 'The REPLICATE_API_TOKEN environment variable is not set' },
      { status: 500 }
    );
  }

  const { imageUrl } = await request.json();

  try {
    // Use Real-ESRGAN model for image enhancement
    const prediction = await replicate.predictions.create({
      model: "xinntao/realesrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
      input: {
        image: imageUrl,
        scale: 4,
        face_enhance: false
      }
    });

    if (prediction?.error) {
      return NextResponse.json({ detail: prediction.error }, { status: 500 });
    }

    return NextResponse.json(prediction, { status: 201 });
  } catch (error) {
    console.error('Prediction creation failed:', error);
    return NextResponse.json(
      { detail: 'Failed to create prediction' },
      { status: 500 }
    );
  }
}