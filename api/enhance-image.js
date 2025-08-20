import Replicate from "replicate";

// Initialize Replicate client exactly like the official guide
const replicate = new Replicate();

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

  // Check API token - following Replicate guide requirements
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error(`[${requestId}] ❌ Missing REPLICATE_API_TOKEN environment variable`);
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN environment variable not set' });
  }
  
  console.log(`[${requestId}] ✅ REPLICATE_API_TOKEN is set (length: ${process.env.REPLICATE_API_TOKEN.length})`);
  console.log(`[${requestId}] Token starts with: ${process.env.REPLICATE_API_TOKEN.substring(0, 10)}...`);

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
      console.log(`[${requestId}] Running the model...`);
      
      // Let's try a different, simpler Real-ESRGAN model that definitely works
      console.log(`[${requestId}] Using Real-ESRGAN model...`);
      
      const output = await replicate.run(
        "xinntao/realesrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
        {
          input: {
            image: imageBase64,
            scale: scale
          }
        }
      );
      
      console.log(`[${requestId}] Model completed. Output:`, output);
      
      if (!output) {
        throw new Error('No output received from model');
      }
      
      const processingTime = Date.now() - startTime;
      
      // Simple output handling - take whatever we get
      console.log(`[${requestId}] Raw output:`, output);
      console.log(`[${requestId}] Output type:`, typeof output);
      console.log(`[${requestId}] Is array:`, Array.isArray(output));
      
      let enhancedImageUrl;
      
      // Handle different output types
      if (typeof output === 'string') {
        enhancedImageUrl = output;
        console.log(`[${requestId}] Direct string URL`);
      } else if (Array.isArray(output)) {
        enhancedImageUrl = output[0];
        console.log(`[${requestId}] Array - using first element:`, enhancedImageUrl);
      } else if (output && typeof output === 'object') {
        // Just take the first value that looks like a URL
        console.log(`[${requestId}] Object keys:`, Object.keys(output));
        
        const values = Object.values(output);
        enhancedImageUrl = values.find(val => 
          typeof val === 'string' && (val.startsWith('http') || val.startsWith('data:'))
        );
        
        if (!enhancedImageUrl) {
          // If no URL found, just try the first string value
          enhancedImageUrl = values.find(val => typeof val === 'string');
        }
        
        console.log(`[${requestId}] Object - extracted URL:`, enhancedImageUrl);
      } else {
        console.log(`[${requestId}] Using output as-is:`, output);
        enhancedImageUrl = String(output);
      }
      
      console.log(`[${requestId}] Enhanced image URL:`, enhancedImageUrl);
      
      return res.status(200).json({
        success: true,
        output: enhancedImageUrl,
        processingTime: processingTime,
        estimatedCost: 0.0025,
        requestId: requestId
      });

    } catch (replicateError) {
      console.error(`[${requestId}] 🚨 Replicate API Error:`, {
        message: replicateError.message,
        stack: replicateError.stack,
        name: replicateError.name,
        cause: replicateError.cause,
        fullError: replicateError
      });
      return res.status(500).json({ 
        error: 'Replicate API failed',
        details: replicateError.message || String(replicateError),
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