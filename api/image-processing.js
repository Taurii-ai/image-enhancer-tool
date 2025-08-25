// pages/api/image-processing.js - Consolidated image operations
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import Replicate from 'replicate';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const { method } = req;
  const { action } = req.query;

  // CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (action) {
      case 'upload':
        return await handleUpload(req, res);
      case 'enhance':
        return await handleEnhance(req, res);
      case 'proxy':
        return await handleProxy(req, res);
      case 'fetch':
        return await handleFetch(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action. Use ?action=upload|enhance|proxy|fetch' });
    }
  } catch (error) {
    console.error('Image processing error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// Handle image upload to file.io (formerly /api/upload-image)
async function handleUpload(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({});
  const [fields, files] = await form.parse(req);
  const file = files.file?.[0];

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Read file buffer
    const fileBuffer = await fs.promises.readFile(file.filepath);

    // Upload file to tmpfiles.org for public URL (alternative to file.io)
    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer], { type: file.mimetype }), file.originalFilename || 'image.jpg');

    const uploadRes = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData
    });

    const uploadJson = await uploadRes.json();
    console.log('📤 TMPFILES.ORG UPLOAD RESULT:', uploadJson);

    if (uploadJson.status !== 'success') {
      throw new Error(`tmpfiles.org upload failed: ${uploadJson.error || 'Unknown error'}`);
    }

    const publicUrl = uploadJson.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    console.log('✅ PUBLIC URL CREATED:', publicUrl);

    return res.status(200).json({
      success: true,
      url: publicUrl,
      filename: file.originalFilename || 'uploaded-image'
    });

  } catch (error) {
    console.error('Upload to tmpfiles.org failed:', error);
    return res.status(500).json({ 
      error: 'Failed to upload image to public storage', 
      details: error.message 
    });
  }
}

// Clean Universal Enhancement API
async function handleEnhance(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image, model } = req.body;

    if (!image || !model) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    console.log("🚀 Starting enhancement with model:", model);

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Run replicate prediction
    const prediction = await replicate.run(model, {
      input: { image },
    });

    console.log("✅ Replicate prediction completed");

    // --- Universal output parser ---
    let outputUrl: string | null = null;

    if (!prediction) {
      outputUrl = null;
    } else if (typeof prediction === "string") {
      outputUrl = prediction;
    } else if (Array.isArray(prediction)) {
      outputUrl = prediction.find((item: any) => typeof item === "string") || null;
    } else if (typeof prediction === "object") {
      const out = (prediction as any).output;
      if (Array.isArray(out)) {
        outputUrl = out.find((item: any) => typeof item === "string") || null;
      } else if (typeof out === "string") {
        outputUrl = out;
      } else if (out?.url) {
        outputUrl = out.url;
      }
    }

    if (!outputUrl) {
      return res.status(500).json({
        error: "Failed to extract enhanced image URL from Replicate response",
        debug: prediction,
      });
    }

    return res.status(200).json({ enhancedUrl: outputUrl });
  } catch (error) {
    console.error("Backend API Error:", error);
    return res.status(500).json({ error: error.message || "Unknown error" });
  }
}

// Handle image proxy (formerly /api/proxy-image)
async function handleProxy(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    
    return res.send(Buffer.from(buffer));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to proxy image' });
  }
}

// Handle image fetch (formerly /api/fetch-image) 
async function handleFetch(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' });
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    return res.status(200).json({
      success: true,
      data: `data:${contentType};base64,${base64}`,
      contentType
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch image' });
  }
}