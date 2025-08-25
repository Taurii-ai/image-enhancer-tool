import Replicate from "replicate";
import { put } from "@vercel/blob";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

function buildInput(model, imageUrl) {
  // Keep it simple - just use image parameter for all models
  return { image: imageUrl };
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64, model } = req.body;

    if (!imageBase64 || !model) {
      return res.status(400).json({ error: 'Missing imageBase64 or model' });
    }

    console.log('Processing model:', model);

    // Convert base64 to buffer
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Upload to Vercel Blob
    const blob = await put(`uploads/${Date.now()}.png`, buffer, {
      access: 'public',
      contentType: 'image/png',
    });

    console.log('Uploaded to blob:', blob.url);

    // Build input
    const input = buildInput(model, blob.url);
    console.log('Input:', input);

    // Call Replicate
    const output = await replicate.run(model, { input });
    console.log('Replicate output:', output);

    // Handle output - Replicate usually returns array or string
    let resultUrl;
    if (Array.isArray(output)) {
      resultUrl = output[0];
    } else if (typeof output === 'string') {
      resultUrl = output;
    } else {
      resultUrl = output;
    }

    console.log('Result URL:', resultUrl);

    return res.status(200).json({ url: resultUrl });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Processing failed',
      details: error.toString()
    });
  }
}