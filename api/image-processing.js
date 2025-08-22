// pages/api/image-processing.js - Consolidated image operations
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

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

// Handle image enhancement (formerly /api/enhance-image)
async function handleEnhance(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('Missing REPLICATE_API_TOKEN');
    return res.status(500).json({ error: 'Server misconfiguration: missing token' });
  }

  // Parse JSON body
  if (!req.body || !req.body.image) {
    return res.status(400).json({ error: 'No image URL provided in request body' });
  }

  try {
    const imageData = req.body.image;
    console.log('📥 BACKEND: Received image data type:', imageData.startsWith('data:') ? 'data URL' : imageData.startsWith('blob:') ? 'blob URL' : 'other');
    console.log('📥 BACKEND: First 100 chars:', imageData.substring(0, 100) + '...');

    // Convert data URL to buffer
    let buffer;
    if (imageData.startsWith('data:')) {
      console.log('🔄 Converting data URL to buffer...');
      const base64Data = imageData.split(',')[1];
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      throw new Error('Only data URLs are supported');
    }

    // Step 1: Upload to Replicate using correct API
    console.log('🔄 Uploading to Replicate files endpoint...');
    
    // Create FormData for multipart upload
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
      console.error('🔴 Upload error response:', errorText);
      throw new Error(`Replicate upload failed: ${uploadResp.status} - ${errorText}`);
    }

    const uploadData = await uploadResp.json();
    console.log('📦 Upload response:', uploadData);
    
    // Get the correct file URL - check multiple possible formats
    const replicateUrl = uploadData.urls?.get || uploadData.url || uploadData.urls?.download;
    console.log('✅ Uploaded to Replicate:', replicateUrl);
    
    if (!replicateUrl) {
      console.error('❌ No file URL in upload response:', uploadData);
      throw new Error('Failed to get file URL from upload response');
    }

    // Step 2: Call ESRGAN model - try higher scale for more visible enhancement
    console.log('🧪 Creating prediction with higher scale...');
    const versionId = "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa"; 
    
    const requestBody = {
      version: versionId,
      input: {
        image: replicateUrl,
        scale: 4,  // Increased from 2 to 4 for more dramatic enhancement
        face_enhance: false
      }
    };
    
    console.log('📤 Prediction request:', JSON.stringify(requestBody, null, 2));
    
    const predictionResp = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    if (!predictionResp.ok) {
      const errorText = await predictionResp.text();
      console.error('🔴 Prediction error response:', errorText);
      throw new Error(`Prediction failed: ${predictionResp.status} - ${errorText}`);
    }

    let prediction = await predictionResp.json();
    console.log('✅ Prediction created:', prediction.id);

    // Poll for completion
    while (!["succeeded", "failed"].includes(prediction.status)) {
      console.log(`⏳ Status: ${prediction.status}, waiting...`);
      await new Promise(r => setTimeout(r, 1000));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
      });
      prediction = await pollRes.json();
    }

    if (prediction.status === "succeeded") {
      const enhancedUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      
      console.log('✅ Enhancement completed!');
      console.log('📊 Output URL:', enhancedUrl);
      console.log('📊 Prediction metrics:', prediction.metrics);
      
      // Check if we got a valid output
      if (!enhancedUrl || enhancedUrl === replicateUrl) {
        console.error('⚠️ Model returned same image or empty result!');
        console.log('⚠️ This might indicate the model didn\'t actually enhance the image');
      }
      
      return res.status(200).json({ 
        output: enhancedUrl,
        model: "nightmareai/real-esrgan",
        cost: prediction.metrics?.predict_time ? (prediction.metrics.predict_time * 0.000575).toFixed(4) : "0.0025", // Estimate based on time
        input: { image: replicateUrl, scale: 4, face_enhance: false },
        metrics: prediction.metrics,
        logs: prediction.logs,
        success: true,
        id: prediction.id
      });
    } else {
      console.error('❌ Enhancement failed:', prediction);
      return res.status(500).json({ error: "Enhancement failed", details: prediction });
    }
  } catch (error) {
    console.error('❌ ENHANCE error', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
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