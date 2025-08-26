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
    console.log('Blob URL type:', typeof blob.url);
    console.log('Blob URL constructor:', blob.url?.constructor?.name);

    // CRITICAL FIX: Ensure blob.url is always a string
    const cleanBlobUrl = String(blob.url);
    console.log('Clean blob URL:', cleanBlobUrl);

    // Build input
    const input = buildInput(model, cleanBlobUrl);
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
      
      // Normal processing
      if (typeof rawOutput === 'string' && rawOutput.startsWith('http')) {
        output = rawOutput;
      } else if (Array.isArray(rawOutput) && rawOutput.length > 0) {
        output = String(rawOutput[0]);
      } else if (rawOutput && typeof rawOutput === 'object') {
        output = rawOutput.url || rawOutput.image || rawOutput.output || String(rawOutput);
      } else {
        output = String(rawOutput);
      }
      
      console.log('🔧 PROCESSED OUTPUT:', typeof output, output);
      
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

    // SIMPLIFIED: output is already processed above, just clean it
    let resultUrl = String(output);
    console.log('🔄 STARTING WITH:', resultUrl);
    
    // AGGRESSIVE URL CLEANING: Extract only the actual image URL
    if (resultUrl && typeof resultUrl === 'string') {
      console.log('🧹 BEFORE CLEANING:', resultUrl);
      
      // If it contains replicate.delivery, extract that
      const replicateMatch = resultUrl.match(/https:\/\/replicate\.delivery\/[^%\s'")\{]+/);
      if (replicateMatch) {
        resultUrl = replicateMatch[0];
        console.log('🎯 EXTRACTED REPLICATE URL:', resultUrl);
      } 
      // If it contains other image domains, extract those  
      else if (resultUrl.includes('https://')) {
        // Extract any https URL but stop at function artifacts
        const cleanUrlMatch = resultUrl.match(/https:\/\/[^%\s'")\{\|]+/);
        if (cleanUrlMatch) {
          let cleanUrl = cleanUrlMatch[0];
          // Remove common function artifacts from the end
          cleanUrl = cleanUrl.replace(/\/url\([^)]*$/, '')
                             .replace(/\/function[^\/]*$/, '')
                             .replace(/\/\{[^}]*$/, '')
                             .replace(/url\([^)]*$/, '')
                             .replace(/\([^)]*$/, '')
                             .replace(/\{.*$/, '');
          resultUrl = cleanUrl;
          console.log('🎯 CLEANED GENERIC URL:', resultUrl);
        }
      }
      
      console.log('🧹 AFTER CLEANING:', resultUrl);
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