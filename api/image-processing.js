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

// Handle image enhancement (formerly /api/enhance-image)
async function handleEnhance(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔍 Environment check:');
  console.log('- REPLICATE_API_TOKEN exists:', !!process.env.REPLICATE_API_TOKEN);
  console.log('- ENHANCER_MODEL_SLUG:', process.env.ENHANCER_MODEL_SLUG);
  console.log('- ENHANCER_INPUT_KEY:', process.env.ENHANCER_INPUT_KEY);
  console.log('- ENHANCER_EXTRA:', process.env.ENHANCER_EXTRA);

  if (!process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_TOKEN === 'YOUR_TOKEN') {
    console.error('❌ REPLICATE_API_TOKEN missing or placeholder');
    return res.status(500).json({ 
      error: 'Server misconfiguration: REPLICATE_API_TOKEN not set',
      debug: {
        tokenExists: !!process.env.REPLICATE_API_TOKEN,
        isPlaceholder: process.env.REPLICATE_API_TOKEN === 'YOUR_TOKEN'
      }
    });
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

    // Step 2: Use Replicate SDK with robust URL extraction
    const model = process.env.ENHANCER_MODEL_SLUG;
    const extra = process.env.ENHANCER_EXTRA ? JSON.parse(process.env.ENHANCER_EXTRA) : {};
    
    console.log("🚀 Running Replicate with model:", model, "on image:", replicateUrl);
    console.log("🚀 Input config:", { image: replicateUrl, ...extra });
    console.log("🚀 API Token exists:", !!process.env.REPLICATE_API_TOKEN);
    console.log("🚀 API Token length:", process.env.REPLICATE_API_TOKEN?.length || 0);
    
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
    
    console.log("🚀 Replicate instance created successfully");
    
    let prediction;
    try {
      prediction = await replicate.run(model, {
        input: {
          image: replicateUrl,  // ESRGAN expects key `image`
          ...extra,
        },
      });
      
      console.log("🔍 Replicate call completed successfully");
      console.log("🔍 Prediction type:", typeof prediction);
      console.log("🔍 Prediction keys:", prediction ? Object.keys(prediction) : 'null/undefined');
      console.log("🔍 Replicate raw response:", prediction);
      
    } catch (replicateError) {
      console.error("❌ Replicate API Error:", replicateError);
      console.error("❌ Error message:", replicateError.message);
      console.error("❌ Error stack:", replicateError.stack);
      console.error("❌ Model used:", model);
      console.error("❌ Input used:", { image: replicateUrl, ...extra });
      
      return res.status(500).json({
        error: `Replicate API failed: ${replicateError.message}`,
        details: {
          model,
          input: { image: replicateUrl, ...extra },
          errorType: replicateError.name,
          errorMessage: replicateError.message
        }
      });
    }

    // BACKEND URL EXTRACTION - STOP DEBUGGING, JUST FIX IT
    console.log("🔧 BACKEND: Starting URL extraction...");
    let enhancedUrl = null;
    
    // Method 1: Direct string conversion with regex
    const predictionString = String(prediction);
    const urlMatch = predictionString.match(/https:\/\/replicate\.delivery\/[^\s\]"}]+/);
    if (urlMatch) {
      enhancedUrl = urlMatch[0];
      console.log("✅ BACKEND: Regex extracted URL:", enhancedUrl);
    }
    
    // Method 2: Try standard extraction methods
    if (!enhancedUrl) {
      if (Array.isArray(prediction) && prediction.length > 0) {
        enhancedUrl = prediction[0];
        console.log("✅ BACKEND: Array extraction:", enhancedUrl);
      } else if (typeof prediction === "string" && prediction.includes("replicate.delivery")) {
        enhancedUrl = prediction;
        console.log("✅ BACKEND: Direct string:", enhancedUrl);
      } else if (prediction && prediction.output) {
        enhancedUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
        console.log("✅ BACKEND: Output property:", enhancedUrl);
      }
    }
    
    // Method 3: Try valueOf/toString methods
    if (!enhancedUrl && prediction && typeof prediction === 'object') {
      try {
        if (prediction.valueOf) {
          const valueResult = prediction.valueOf();
          if (typeof valueResult === 'string' && valueResult.includes('replicate.delivery')) {
            enhancedUrl = valueResult;
            console.log("✅ BACKEND: valueOf method:", enhancedUrl);
          }
        }
        if (!enhancedUrl && prediction.toString) {
          const stringResult = prediction.toString();
          if (typeof stringResult === 'string' && stringResult.includes('replicate.delivery')) {
            enhancedUrl = stringResult;
            console.log("✅ BACKEND: toString method:", enhancedUrl);
          }
        }
      } catch (e) {
        console.log("Method 3 failed:", e.message);
      }
    }
    
    if (!enhancedUrl) {
      console.error("❌ BACKEND: Could not extract URL from prediction:", prediction);
      return res.status(500).json({
        error: "Could not extract enhanced image URL",
        debug: {
          predictionType: typeof prediction,
          predictionString: String(prediction),
          predictionKeys: prediction ? Object.keys(prediction) : null,
          rawPrediction: prediction
        }
      });
    }
    
    console.log("🎉 BACKEND: Successfully extracted URL:", enhancedUrl);
    
    // Return normal response format that frontend expects
    return res.status(200).json({
      output: enhancedUrl,
      originalUrl: replicateUrl,
      enhancedUrl: enhancedUrl,
      success: true,
      model: model,
      cost: "0.0025"
    });
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