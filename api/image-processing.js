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

// Handle image enhancement with production-ready Replicate integration
async function handleEnhance(req, res) {
  try {
    // Validate request method
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed, use POST" });
    }

    // Validate imageUrl parameter
    const { image: imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: "No imageUrl provided" });
    }

    // Read environment variables with defaults
    const modelSlug = process.env.ENHANCER_MODEL_SLUG || "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa";
    const inputKey = process.env.ENHANCER_INPUT_KEY || "image";
    const extra = process.env.ENHANCER_EXTRA ? JSON.parse(process.env.ENHANCER_EXTRA) : { scale: 2, face_enhance: true };

    console.log("🚀 Running Replicate model:", modelSlug, "on image:", imageUrl);

    // Handle data URL conversion to actual URL if needed
    let processedImageUrl = imageUrl;
    
    if (imageUrl.startsWith('data:')) {
      console.log('🔄 Converting data URL to Replicate file...');
      
      // Convert data URL to buffer
      const base64Data = imageUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Upload to Replicate files endpoint
      const formData = new FormData();
      formData.append('content', new Blob([buffer], { type: 'image/jpeg' }), 'image.jpg');
      
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
      processedImageUrl = uploadData.urls?.get || uploadData.url || uploadData.urls?.download;
      
      if (!processedImageUrl) {
        throw new Error('Failed to get file URL from upload response');
      }
      
      console.log('✅ Uploaded to Replicate:', processedImageUrl);
    }

    // Initialize Replicate client
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    // Run Replicate model
    const prediction = await replicate.run(modelSlug, {
      input: {
        [inputKey]: processedImageUrl,
        ...extra,
      },
    });

    console.log("🔍 Raw Replicate response:", prediction);

    // Extract enhanced image URL safely
    let enhancedUrl = null;
    if (Array.isArray(prediction) && prediction.length > 0 && typeof prediction[0] === "string") {
      enhancedUrl = prediction[0];
    } else if (typeof prediction === "string" && prediction.startsWith("http")) {
      enhancedUrl = prediction;
    } else if (prediction?.output && Array.isArray(prediction.output) && prediction.output.length > 0) {
      enhancedUrl = prediction.output[0];
    }

    if (!enhancedUrl) {
      throw new Error("Failed to extract valid enhanced image URL from Replicate response");
    }

    // Return only the enhanced image URL
    return res.status(200).json({ 
      output: enhancedUrl,
      enhancedUrl: enhancedUrl,
      success: true 
    });
  } catch (error) {
    console.error("❌ Enhancement failed:", error);
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