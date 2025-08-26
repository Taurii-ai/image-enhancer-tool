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

    // Handle Replicate output and ensure we return a valid URL string
    let resultUrl;
    
    console.log('🔍 DEBUGGING REPLICATE OUTPUT:');
    console.log('  - Type:', typeof output);
    console.log('  - Constructor:', output?.constructor?.name);
    console.log('  - Is Array:', Array.isArray(output));
    console.log('  - JSON:', JSON.stringify(output, null, 2));
    console.log('  - String conversion:', String(output));
    console.log('  - Object keys:', output && typeof output === 'object' ? Object.keys(output) : 'Not an object');
    
    if (typeof output === 'string') {
      resultUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      resultUrl = output[0];
    } else if (output && typeof output === 'object') {
      // Handle different object structures
      if (output.url) {
        resultUrl = output.url;
      } else if (output.image) {
        resultUrl = output.image;
      } else if (output.output) {
        resultUrl = output.output;
      } else {
        // Try to get the first property that looks like a URL
        const values = Object.values(output);
        resultUrl = values.find(val => 
          typeof val === 'string' && 
          (val.startsWith('http://') || val.startsWith('https://'))
        );
      }
    }
    
    // Final fallback - convert whatever we have to string and clean it
    if (!resultUrl) {
      resultUrl = String(output);
    }
    
    // Make sure it's a string
    resultUrl = String(resultUrl);
    
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