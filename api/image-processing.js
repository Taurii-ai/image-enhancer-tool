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

// SIMPLE Real-ESRGAN enhancement - NO BULLSHIT APPROACH
async function handleEnhance(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed, use POST" });
    }

    const { image } = req.body; // Expecting data URL directly

    if (!image) {
      return res.status(400).json({ error: "Missing image data" });
    }

    console.log("🚀 SIMPLE APPROACH: Processing image data URL");
    console.log("🔑 API Token available:", !!process.env.REPLICATE_API_TOKEN);

    // Convert data URL to buffer for Replicate upload
    if (!image.startsWith('data:')) {
      throw new Error('Image must be a data URL');
    }

    const base64Data = image.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload directly to Replicate files
    const formData = new FormData();
    formData.append('content', new Blob([buffer], { type: 'image/jpeg' }), 'image.jpg');

    console.log("📤 Uploading directly to Replicate...");
    const uploadResp = await fetch("https://api.replicate.com/v1/files", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
      },
      body: formData
    });

    if (!uploadResp.ok) {
      const errorText = await uploadResp.text();
      throw new Error(`Replicate upload failed: ${uploadResp.status} - ${errorText}`);
    }

    const uploadData = await uploadResp.json();
    const replicateImageUrl = uploadData.urls?.get || uploadData.url;

    if (!replicateImageUrl) {
      throw new Error('Failed to get image URL from Replicate upload');
    }

    console.log("✅ Image uploaded to Replicate:", replicateImageUrl);

    // Now enhance with Real-ESRGAN
    console.log("🔄 Starting Real-ESRGAN enhancement...");
    const enhanceResp = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
        input: {
          image: replicateImageUrl,
          scale: 4,
          face_enhance: true,
        },
      }),
    });

    if (!enhanceResp.ok) {
      const errorText = await enhanceResp.text();
      throw new Error(`Enhancement failed: ${enhanceResp.status} - ${errorText}`);
    }

    const prediction = await enhanceResp.json();
    console.log("🔄 Enhancement started:", prediction.id);

    // Poll for completion
    let finalPrediction = prediction;
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max

    while (
      finalPrediction.status !== "succeeded" &&
      finalPrediction.status !== "failed" &&
      attempts < maxAttempts
    ) {
      await new Promise((r) => setTimeout(r, 2000));
      
      const pollRes = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          },
        }
      );
      
      finalPrediction = await pollRes.json();
      console.log(`🔄 Poll ${attempts + 1}: ${finalPrediction.status}`);
      attempts++;
    }

    if (finalPrediction.status === "succeeded") {
      const enhancedUrl = Array.isArray(finalPrediction.output) 
        ? finalPrediction.output[0] 
        : finalPrediction.output;
      
      console.log("🎉 ENHANCEMENT COMPLETE:", enhancedUrl);
      
      return res.status(200).json({ 
        output: enhancedUrl,
        success: true 
      });
    } else {
      console.error("❌ Enhancement failed:", finalPrediction.error);
      return res.status(500).json({ 
        error: "Enhancement failed", 
        details: finalPrediction.error 
      });
    }
  } catch (error) {
    console.error("❌ Enhancement error:", error);
    return res.status(500).json({ error: error.message });
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