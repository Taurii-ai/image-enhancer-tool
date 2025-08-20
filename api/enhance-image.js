import Replicate from "replicate";

// Initialize Replicate client following official guide
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Rate limiting for cost control
const MAX_RUNS_PER_MINUTE = process.env.NODE_ENV === "production" ? 20 : Infinity;
let runCount = 0;
let resetTime = Date.now() + 60000; // 1 minute from now

export default async function handler(req, res) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  console.log(`[${requestId}] 🔥 API REQUEST RECEIVED`, {
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] ✅ CORS PREFLIGHT HANDLED`);
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log(`[${requestId}] ❌ INVALID METHOD:`, req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check API token
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error(`[${requestId}] ❌ Missing REPLICATE_API_TOKEN env var`);
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  // Rate limiting
  if (Date.now() > resetTime) {
    runCount = 0;
    resetTime = Date.now() + 60000;
  }
  
  if (runCount >= MAX_RUNS_PER_MINUTE) {
    console.warn(`[${requestId}] ⚠️ Rate limit exceeded`);
    return res.status(429).json({ error: 'Rate limit exceeded, please wait' });
  }

  try {
    const { imageBase64, scale = 4, face_enhance = false } = req.body;

    console.log(`[${requestId}] 📋 REQUEST PARAMETERS:`, {
      hasImageData: !!imageBase64,
      imageDataLength: imageBase64?.length,
      imageDataType: typeof imageBase64,
      scale: scale,
      face_enhance: face_enhance
    });

    // Validate inputs
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }
    runCount++; // Increment counter for rate limiting
    
    try {
      console.log(`[${requestId}] 🔄 Running Real-ESRGAN model...`);
      
      // Following official Replicate Node.js guide pattern
      const output = await replicate.run(
        "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
        {
          input: {
            image: imageBase64,
            scale: scale,
            face_enhance: face_enhance
          }
        }
      );
      
      console.log(`[${requestId}] ✅ Replicate completed. Output type:`, typeof output);
      console.log(`[${requestId}] 📊 Output details:`, {
        isArray: Array.isArray(output),
        isString: typeof output === 'string',
        isStream: output instanceof ReadableStream,
        length: Array.isArray(output) ? output.length : 'N/A'
      });
      
      if (!output) {
        throw new Error('No output received from Real-ESRGAN');
      }
      
      const processingTime = Date.now() - startTime;
      
      // Handle output format - following Replicate Node.js guide
      let enhancedImageUrl;
      
      // The Real-ESRGAN model typically returns a URL string or array with URL
      if (typeof output === 'string') {
        enhancedImageUrl = output;
        console.log(`[${requestId}] ✅ Got direct URL:`, enhancedImageUrl);
      } else if (Array.isArray(output) && output.length > 0) {
        enhancedImageUrl = output[0];
        console.log(`[${requestId}] ✅ Got URL from array:`, enhancedImageUrl);
      } else {
        console.error(`[${requestId}] ❌ Unexpected output format:`, typeof output, output);
        throw new Error(`Unexpected output format: ${typeof output}`);
      }
      
      // Return success response
      console.log(`[${requestId}] ✅ Returning enhanced image URL to frontend`);
      
      return res.status(200).json({
        success: true,
        output: enhancedImageUrl,
        processingTime: processingTime,
        estimatedCost: 0.0025,
        requestId: requestId
      });

    } catch (replicateError) {
      console.error(`[${requestId}] 🚨 Replicate API Error:`, replicateError);
      return res.status(500).json({ 
        error: 'Upscaling failed',
        details: replicateError.message || replicateError,
        requestId: requestId
      });
    }

  } catch (error) {
    console.error(`[${requestId}] 🚨 Unexpected error:`, error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      requestId: requestId
    });
  }
}