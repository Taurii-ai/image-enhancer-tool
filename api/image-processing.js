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

    // Call Replicate with timeout handling
    console.log('Calling Replicate...');
    const startTime = Date.now();
    
    let output;
    try {
      // Set a reasonable timeout for Vercel limits (45 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Replicate timeout after 45 seconds')), 45000);
      });
      
      const replicatePromise = replicate.run(model, { input });
      
      output = await Promise.race([replicatePromise, timeoutPromise]);
      
      const endTime = Date.now();
      console.log(`Replicate completed in ${(endTime - startTime) / 1000}s`);
      console.log('Replicate output:', output);
      
    } catch (error) {
      const endTime = Date.now();
      console.log(`Replicate failed after ${(endTime - startTime) / 1000}s:`, error.message);
      
      if (error.message.includes('timeout')) {
        return res.status(408).json({ 
          error: 'Processing timeout - image enhancement is taking too long',
          suggestion: 'Try with a smaller image or different model'
        });
      }
      throw error;
    }

    // Handle output with detailed debugging
    console.log('🔍 Raw output type:', typeof output);
    console.log('🔍 Is array:', Array.isArray(output));
    console.log('🔍 Raw output:', JSON.stringify(output, null, 2));
    
    let resultUrl = null;
    
    // Handle different output formats
    if (typeof output === 'string' && output.startsWith('http')) {
      resultUrl = output;
      console.log('✅ Found direct string URL');
    } else if (Array.isArray(output) && output.length > 0) {
      // Check first element
      if (typeof output[0] === 'string' && output[0].startsWith('http')) {
        resultUrl = output[0];
        console.log('✅ Found URL in array[0]');
      } else {
        console.log('❌ Array[0] is not a valid URL:', output[0]);
      }
    } else if (output && typeof output === 'object') {
      // Check common properties
      resultUrl = output.url || output.image || output.output;
      if (resultUrl) {
        console.log('✅ Found URL in object property');
      } else {
        console.log('❌ No URL found in object properties');
      }
    }
    
    // Validate the final URL
    if (!resultUrl || typeof resultUrl !== 'string' || !resultUrl.startsWith('http')) {
      console.error('❌ Invalid result URL:', resultUrl);
      return res.status(500).json({ 
        error: 'No valid URL returned from Replicate',
        debug: {
          outputType: typeof output,
          isArray: Array.isArray(output),
          rawOutput: output,
          extractedUrl: resultUrl
        }
      });
    }

    console.log('✅ Final result URL:', resultUrl);
    return res.status(200).json({ url: resultUrl });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Processing failed',
      details: error.toString()
    });
  }
}