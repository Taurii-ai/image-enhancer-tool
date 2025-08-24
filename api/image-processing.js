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

// Real-ESRGAN with Vercel Blob + Replicate
async function handleEnhance(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed, use POST" });
    }

    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "Missing image data" });
    }

    console.log("🚀 STEP 1: Starting Real-ESRGAN Enhancement");
    console.log("🔑 Replicate token:", !!process.env.REPLICATE_API_TOKEN);
    console.log("🔑 Blob token:", !!process.env.BLOB_READ_WRITE_TOKEN);
    console.log("📷 Image size:", image.length);

    // Convert data URL to buffer
    const base64Data = image.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    console.log("✅ STEP 1: Buffer created, size:", buffer.length);

    let imageUrl = image; // Default to data URL

    // Try Vercel Blob upload first for better compatibility
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        console.log("🚀 STEP 2: Uploading to Vercel Blob");
        const { put } = await import('@vercel/blob');
        
        const filename = `enhancement-input-${Date.now()}.jpg`;
        const blob = await put(filename, buffer, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        
        imageUrl = blob.url;
        console.log("✅ STEP 2: Blob uploaded:", imageUrl);
      } catch (blobError) {
        console.warn("⚠️ STEP 2: Blob upload failed, using data URL:", blobError.message);
      }
    } else {
      console.log("⚠️ STEP 2: No blob token, using data URL");
    }

    console.log("🚀 STEP 3: Calling Real-ESRGAN");
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Using the working xinntao/real-esrgan model
    const output = await replicate.run(
      "xinntao/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
      {
        input: {
          image: imageUrl,
          scale: 4
        }
      }
    );

    console.log("✅ STEP 3: Real-ESRGAN completed");
    console.log("📊 Raw output:", typeof output, Array.isArray(output) ? `array[${output.length}]` : 'single');
    console.log("📊 First 200 chars:", JSON.stringify(output).substring(0, 200));

    // Extract the enhanced image URL
    let enhancedUrl;
    if (Array.isArray(output) && output.length > 0) {
      enhancedUrl = output[0];
    } else if (typeof output === 'string') {
      enhancedUrl = output;
    } else if (output && typeof output === 'object' && output.url) {
      enhancedUrl = output.url;
    } else {
      throw new Error(`Invalid output format: ${typeof output} - ${JSON.stringify(output)}`);
    }

    if (!enhancedUrl || typeof enhancedUrl !== 'string') {
      throw new Error(`No valid URL in output: ${enhancedUrl}`);
    }

    if (!enhancedUrl.startsWith('http')) {
      throw new Error(`Invalid URL format: ${enhancedUrl}`);
    }

    console.log("🎉 SUCCESS: Enhanced image URL:", enhancedUrl);

    return res.status(200).json({
      output: enhancedUrl,
      success: true
    });

  } catch (error) {
    console.error("❌ Enhancement failed:", error);
    return res.status(500).json({
      error: error.message,
      details: error.message
    });
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