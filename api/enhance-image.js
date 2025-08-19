import Replicate from "replicate";

// Initialize Replicate client - will use REPLICATE_API_TOKEN automatically
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
      console.log(`[${requestId}] 🔄 Running Real-ESRGAN model on Replicate...`);
      
      const input = { 
        image: imageBase64, 
        scale: scale, 
        face_enhance: face_enhance 
      };
      
      const output = await replicate.run(
        "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
        { input }
      );
      
      console.log(`[${requestId}] ✅ Real-ESRGAN processing completed`);
      
      if (!output) {
        throw new Error('No output received from Real-ESRGAN');
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`[${requestId}] ⏱️ Processing completed in ${processingTime}ms`);
      
      // Handle different output formats
      let enhancedImageUrl;
      
      console.log(`[${requestId}] 🔍 OUTPUT TYPE:`, typeof output);
      console.log(`[${requestId}] 🔍 OUTPUT:`, Array.isArray(output) ? 'Array length: ' + output.length : output);
      
      if (output instanceof ReadableStream) {
        // Handle ReadableStream (binary data)
        console.log(`[${requestId}] 🔄 Processing ReadableStream...`);
        
        const chunks = [];
        const reader = output.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const imageBuffer = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          imageBuffer.set(chunk, offset);
          offset += chunk.length;
        }
        
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        enhancedImageUrl = `data:image/jpeg;base64,${base64Image}`;
        
        console.log(`[${requestId}] ✅ Converted ReadableStream to base64 (${totalLength} bytes)`);
      } else if (Array.isArray(output) && output.length > 0) {
        // Some models return an array with URL
        enhancedImageUrl = output[0];
        console.log(`[${requestId}] ✅ Got URL from array:`, enhancedImageUrl);
      } else if (typeof output === 'string' && output.startsWith('https://')) {
        // Direct URL string
        enhancedImageUrl = output;
        console.log(`[${requestId}] ✅ Got direct URL:`, enhancedImageUrl);
      } else if (output && output.url && typeof output.url === 'function') {
        // Replicate object with url() method
        const urlObject = output.url();
        enhancedImageUrl = urlObject.toString();
        console.log(`[${requestId}] ✅ Got URL from method:`, enhancedImageUrl);
      } else {
        console.error(`[${requestId}] 🚨 Unexpected output format:`, typeof output, output);
        throw new Error(`Unexpected output format: ${typeof output}`);
      }
      
      // Return success response
      const response = {
        success: true,
        output: enhancedImageUrl,
        processingTime: processingTime,
        estimatedCost: 0.0025,
        requestId: requestId
      };

      console.log(`[${requestId}] ✅ RETURNING SUCCESS RESPONSE`);
      return res.status(200).json(response);

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