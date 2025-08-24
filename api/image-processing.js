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

    console.log("🚀 STEP 1: Starting simple approach");
    console.log("🔑 API Token available:", !!process.env.REPLICATE_API_TOKEN);
    console.log("🔑 API Token length:", process.env.REPLICATE_API_TOKEN?.length || 0);
    console.log("📏 Image data length:", image.length);
    console.log("📷 Image format:", image.substring(0, 50) + "...");

    console.log("🚀 STEP 2: Converting data URL to buffer");
    
    // Convert data URL to buffer for Replicate upload
    if (!image.startsWith('data:')) {
      console.error("❌ STEP 2 FAILED: Not a data URL:", image.substring(0, 100));
      throw new Error('Image must be a data URL');
    }

    const base64Data = image.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    
    console.log("✅ STEP 2 SUCCESS: Buffer created, size:", buffer.length);
    console.log("🚀 STEP 3: Creating form data for Replicate upload");

    // Detect original image type from data URL
    const imageType = image.split(';')[0].split(':')[1] || 'image/jpeg';
    const fileExtension = imageType.split('/')[1] || 'jpg';
    
    // Upload directly to Replicate files
    const formData = new FormData();
    formData.append('content', new Blob([buffer], { type: imageType }), `image.${fileExtension}`);

    console.log("🚀 STEP 4: Uploading to Replicate files endpoint");
    console.log("📊 STEP 4 IMAGE TYPE:", imageType, "Extension:", fileExtension);
    const uploadResp = await fetch("https://api.replicate.com/v1/files", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`
      },
      body: formData
    });

    console.log("📊 STEP 4 RESPONSE: Status:", uploadResp.status, uploadResp.statusText);

    if (!uploadResp.ok) {
      const errorText = await uploadResp.text();
      console.error("❌ STEP 4 FAILED: Upload error:", errorText);
      throw new Error(`Replicate upload failed: ${uploadResp.status} - ${errorText}`);
    }

    const uploadData = await uploadResp.json();
    console.log("📊 STEP 4 DATA:", JSON.stringify(uploadData, null, 2));
    
    // Try multiple possible URL fields from Replicate response
    const replicateImageUrl = uploadData.urls?.get || uploadData.url || uploadData.download_url || uploadData.urls?.download;

    if (!replicateImageUrl) {
      console.error("❌ STEP 4 FAILED: No URL in response:", uploadData);
      console.error("📊 Available keys:", Object.keys(uploadData));
      throw new Error('Failed to get image URL from Replicate upload');
    }

    console.log("✅ STEP 4 SUCCESS: Image uploaded to Replicate:", replicateImageUrl);

    console.log("🚀 STEP 5: Starting Real-ESRGAN enhancement");
    console.log("📊 STEP 5 INPUT: Image URL:", replicateImageUrl);
    console.log("📊 STEP 5 PARAMS: scale=4, face_enhance=true");
    
    const enhanceResp = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
        input: {
          image: replicateImageUrl,
          scale: 4,
          face_enhance: true,
        },
      }),
    });

    console.log("📊 STEP 5 RESPONSE: Status:", enhanceResp.status, enhanceResp.statusText);

    if (!enhanceResp.ok) {
      const errorText = await enhanceResp.text();
      console.error("❌ STEP 5 FAILED: Enhancement request failed:", errorText);
      throw new Error(`Enhancement failed: ${enhanceResp.status} - ${errorText}`);
    }

    const prediction = await enhanceResp.json();
    console.log("✅ STEP 5 SUCCESS: Enhancement started");
    console.log("📊 STEP 5 PREDICTION:", JSON.stringify(prediction, null, 2));

    console.log("🚀 STEP 6: Polling for enhancement completion");
    
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
      console.log(`🔄 STEP 6 Poll ${attempts + 1}: Status=${finalPrediction.status}`);
      
      if (finalPrediction.status === "failed") {
        console.error("❌ STEP 6 FAILED: Enhancement failed during processing");
        console.error("📊 FAILURE DETAILS:", JSON.stringify(finalPrediction, null, 2));
        break;
      }
      
      attempts++;
    }

    console.log("🚀 STEP 7: Processing final result");
    console.log("📊 STEP 7 FINAL STATUS:", finalPrediction.status);
    console.log("📊 STEP 7 FINAL PREDICTION:", JSON.stringify(finalPrediction, null, 2));

    if (finalPrediction.status === "succeeded") {
      console.log("✅ STEP 7 SUCCESS: Enhancement completed");
      console.log("📊 STEP 7 RAW OUTPUT:", finalPrediction.output);
      
      let enhancedUrl;
      if (Array.isArray(finalPrediction.output)) {
        enhancedUrl = finalPrediction.output[0];
        console.log("📊 Array output, using first item:", enhancedUrl);
      } else if (typeof finalPrediction.output === 'string') {
        enhancedUrl = finalPrediction.output;
        console.log("📊 String output:", enhancedUrl);
      } else {
        console.error("❌ STEP 7 FAILED: Unexpected output format:", typeof finalPrediction.output, finalPrediction.output);
        throw new Error(`Unexpected output format: ${typeof finalPrediction.output}`);
      }
      
      console.log("🎉 FINAL ENHANCED URL:", enhancedUrl);
      
      if (!enhancedUrl) {
        console.error("❌ STEP 7 FAILED: No enhanced URL found");
        throw new Error('No enhanced URL in successful response');
      }
      
      if (typeof enhancedUrl !== 'string') {
        console.error("❌ STEP 7 FAILED: Enhanced URL is not a string:", typeof enhancedUrl, enhancedUrl);
        throw new Error(`Enhanced URL is not a string: ${typeof enhancedUrl}`);
      }
      
      if (!enhancedUrl.startsWith('http')) {
        console.error("❌ STEP 7 FAILED: Invalid enhanced URL format:", enhancedUrl);
        throw new Error(`Invalid enhanced URL format: ${enhancedUrl}`);
      }
      
      return res.status(200).json({ 
        output: enhancedUrl,
        success: true 
      });
    } else {
      console.error("❌ STEP 7 FAILED: Final status not succeeded");
      console.error("📊 FINAL STATUS:", finalPrediction.status);
      console.error("📊 ERROR DETAILS:", finalPrediction.error || 'No error details');
      console.error("📊 FULL RESPONSE:", JSON.stringify(finalPrediction, null, 2));
      
      return res.status(500).json({ 
        error: "Enhancement failed", 
        details: finalPrediction.error || finalPrediction.status,
        status: finalPrediction.status,
        fullResponse: finalPrediction
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