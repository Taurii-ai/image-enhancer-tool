import Replicate from "replicate";
import { put } from "@vercel/blob";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Validate API token on startup
if (!process.env.REPLICATE_API_TOKEN) {
  console.error('❌ REPLICATE_API_TOKEN is not set!');
} else {
  console.log('✅ REPLICATE_API_TOKEN is configured');
}

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

  console.log('🚀 API HANDLER STARTED');
  console.log('  - Method:', req.method);
  console.log('  - Body keys:', Object.keys(req.body || {}));

  try {
    const { imageBase64, model } = req.body;
    
    console.log('📋 REQUEST DATA:');
    console.log('  - Has imageBase64:', !!imageBase64);
    console.log('  - Model:', model);
    console.log('  - Image data length:', imageBase64?.length || 0);

    if (!imageBase64 || !model) {
      return res.status(400).json({ error: 'Missing imageBase64 or model' });
    }

    console.log('Processing model:', model);

    // Convert base64 to buffer
    const base64Data = imageBase64.split(',')[1] || imageBase64;
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Upload to Vercel Blob - ensure clean filename
    const timestamp = Date.now();
    const filename = `uploads/${timestamp}.png`;
    console.log('🔍 CREATING BLOB WITH FILENAME:', filename);
    
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/png',
    });
    
    if (!blob || !blob.url) {
      throw new Error('Blob upload failed - no URL returned');
    }
    
    console.log('✅ Blob upload successful:', blob.url);
    console.log('Uploaded to blob:', blob.url);
    console.log('Blob URL type:', typeof blob.url);
    console.log('Blob URL constructor:', blob.url?.constructor?.name);

    // CRITICAL FIX: Ensure blob.url is always a string
    const cleanBlobUrl = String(blob.url);
    console.log('Clean blob URL:', cleanBlobUrl);

    // Build input
    const input = buildInput(model, cleanBlobUrl);
    console.log('Input:', input);

    // Call Replicate with timeout handling
    console.log('🚀 CALLING REPLICATE...');
    console.log('  - Model:', model);
    console.log('  - Input:', JSON.stringify(input));
    console.log('  - Replicate instance:', typeof replicate);
    console.log('  - API Token exists:', !!process.env.REPLICATE_API_TOKEN);
    
    const startTime = Date.now();
    
    let output;
    try {
      // Set a reasonable timeout for Vercel limits (30 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AI processing timeout - try again or use a smaller image')), 30000);
      });
      
      console.log('⚡ STARTING REPLICATE CALL...');
      const replicatePromise = replicate.run(model, { input });
      console.log('⚡ REPLICATE PROMISE CREATED');
      
      const rawOutput = await Promise.race([replicatePromise, timeoutPromise]);
      
      // NUCLEAR DEBUG: Check what Replicate ACTUALLY returns
      console.log('🔍 RAW REPLICATE OUTPUT:');
      console.log('  Type:', typeof rawOutput);
      console.log('  Constructor:', rawOutput?.constructor?.name);  
      console.log('  Is Function:', typeof rawOutput === 'function');
      console.log('  String:', String(rawOutput).substring(0, 200));
      console.log('  JSON:', JSON.stringify(rawOutput, null, 2).substring(0, 200));
      
      // If Replicate returns a FUNCTION - this is the bug
      if (typeof rawOutput === 'function') {
        console.error('🔥 REPLICATE RETURNED A FUNCTION OBJECT!');
        console.error('  Function name:', rawOutput.name);
        console.error('  Function toString:', rawOutput.toString().substring(0, 200));
        throw new Error('Replicate model returned a function instead of an image URL');
      }
      
      // Smart processing based on what Replicate returns
      console.log('🎯 PROCESSING REPLICATE OUTPUT:');
      
      if (typeof rawOutput === 'string') {
        console.log('✅ Got string output:', rawOutput);
        output = rawOutput;
      } else if (Array.isArray(rawOutput)) {
        console.log('✅ Got array output:', rawOutput);
        output = String(rawOutput[0] || rawOutput);
      } else if (rawOutput && typeof rawOutput === 'object') {
        console.log('✅ Got object output:', rawOutput);
        // Check all possible properties
        output = rawOutput.url || rawOutput.image || rawOutput.output || rawOutput[0] || String(rawOutput);
        console.log('🎯 Extracted from object:', output);
      } else {
        console.log('⚠️ Unknown output type, converting to string:', typeof rawOutput);
        output = String(rawOutput);
      }
      
      // Ensure we have a proper URL from Replicate
      if (!output || (!output.includes('replicate.delivery') && !output.startsWith('https://'))) {
        console.error('❌ No valid Replicate URL found!');
        console.error('  - Raw output:', rawOutput);
        console.error('  - Processed output:', output);
        throw new Error('Replicate did not return a valid image URL');
      }
      
      console.log('✅ PROCESSED OUTPUT:', typeof output, output);
      
      const endTime = Date.now();
      console.log(`Replicate completed in ${(endTime - startTime) / 1000}s`);
      console.log('Replicate output:', output);
      
    } catch (replicateError) {
      const endTime = Date.now();
      console.error(`❌ REPLICATE FAILED after ${(endTime - startTime) / 1000}s:`, replicateError);
      console.error('  - Error message:', replicateError.message);
      console.error('  - Error stack:', replicateError.stack);
      console.error('  - Model used:', model);
      console.error('  - Input used:', JSON.stringify(input));
      
      // Return detailed error instead of silent fallback
      return res.status(500).json({ 
        error: `AI model processing failed: ${replicateError.message}`,
        details: replicateError.toString(),
        model: model,
        suggestion: 'Try a different model or check image format'
      });
    }

    // CHECK: Is this a valid image URL or our input URL being returned?
    let resultUrl = String(output);
    console.log('🔄 STARTING WITH:', resultUrl);
    
    // If the result URL is the same as our input URL, Replicate didn't process it properly
    if (resultUrl.includes('image-enhancer-tool') && resultUrl.includes('vercel.app')) {
      console.log('⚠️ OUTPUT IS OUR INPUT URL - Replicate may have failed');
      console.log('Input was:', cleanBlobUrl);
      console.log('Output is:', resultUrl);
    }
    
    // NUCLEAR URL CLEANING - STRIP ALL FUNCTION GARBAGE
    if (resultUrl && typeof resultUrl === 'string') {
      // Remove all variants of function garbage
      resultUrl = resultUrl
        .replace(/\/url\([^)]*\).*$/, '')  // Remove /url() and everything after
        .replace(/\/url\([^)]*$/, '')      // Remove /url( at end
        .replace(/\/url\(\).*$/, '')       // Remove /url() and everything after
        .replace(/url\([^)]*\).*$/, '')    // Remove url() and everything after
        .replace(/url\([^)]*$/, '')        // Remove url( at end
        .replace(/url\(\).*$/, '')         // Remove url() and everything after
        .replace(/\/function.*$/, '')      // Remove /function at end
        .replace(/\/\{.*$/, '')            // Remove /{ at end
        .replace(/\([^)]*$/, '')           // Remove ( at end
        .replace(/\{.*$/, '')              // Remove { at end
        .replace(/%20.*$/, '')             // Remove encoded spaces and after
        .replace(/%7B.*$/, '')             // Remove encoded { and after
        .trim();
    }

    console.log('Returning URL:', resultUrl);
    return res.status(200).json({ url: resultUrl });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Processing failed',
      details: error.toString()
    });
  }
}