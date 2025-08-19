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
      console.log(`[${requestId}] 🔑 STEP 4: Backend attempting to send to Replicate...`);
      console.log(`[${requestId}] 🔑 Replicate token check:`, {
        tokenExists: !!process.env.REPLICATE_API_TOKEN,
        tokenLength: process.env.REPLICATE_API_TOKEN ? process.env.REPLICATE_API_TOKEN.length : 0,
        tokenStart: process.env.REPLICATE_API_TOKEN ? process.env.REPLICATE_API_TOKEN.substring(0, 10) + '...' : 'NONE'
      });
      
      // Validate image data before sending
      if (!imageBase64 || !imageBase64.startsWith('data:image/')) {
        console.error(`[${requestId}] ❌ STEP 4 FAILED: Invalid image data format`);
        throw new Error('Invalid image data format - must be data URI');
      }
      
      const input = { 
        image: imageBase64, 
        scale: scale, 
        face_enhance: face_enhance 
      };
      
      console.log(`[${requestId}] 📤 STEP 4 DETAILED: Calling Replicate API...`, {
        modelId: "nightmareai/real-esrgan",
        modelVersion: "f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
        inputScale: scale,
        faceEnhance: face_enhance,
        imageDataSize: imageBase64.length,
        imageDataType: imageBase64.substring(0, 50),
        replicateClientInitialized: !!replicate
      });
      
      console.log(`[${requestId}] ⏳ STEP 4 EXECUTING: Sending to Replicate now...`);
      const startReplicateTime = Date.now();
      
      const output = await replicate.run(
        "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
        { input }
      );
      
      const replicateTime = Date.now() - startReplicateTime;
      console.log(`[${requestId}] ⚡ STEP 5: Replicate Real-ESRGAN processing completed in ${replicateTime}ms`);
      console.log(`[${requestId}] 📥 STEP 6: Analyzing what Replicate returned...`, {
        outputType: typeof output,
        outputIsArray: Array.isArray(output),
        outputIsStream: output instanceof ReadableStream,
        outputConstructor: output ? output.constructor.name : 'null',
        outputStringified: output ? JSON.stringify(output).substring(0, 200) + '...' : 'null'
      });
      
      if (!output) {
        console.error(`[${requestId}] ❌ STEP 5 FAILED: No output received from Replicate`);
        throw new Error('No output received from Real-ESRGAN');
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`[${requestId}] ⏱️ Total processing time: ${processingTime}ms`);
      
      // Handle different output formats with detailed analysis
      let enhancedImageUrl;
      
      console.log(`[${requestId}] 🔍 STEP 6 DETAILED ANALYSIS: What did Replicate return?`, {
        outputType: typeof output,
        outputIsNull: output === null,
        outputIsUndefined: output === undefined,
        outputIsArray: Array.isArray(output),
        outputArrayLength: Array.isArray(output) ? output.length : 'N/A',
        outputIsStream: output instanceof ReadableStream,
        outputIsString: typeof output === 'string',
        outputIsObject: typeof output === 'object',
        outputConstructor: output ? output.constructor.name : 'null',
        outputKeys: output && typeof output === 'object' ? Object.keys(output) : 'N/A'
      });
      
      if (output instanceof ReadableStream) {
        console.log(`[${requestId}] 🔄 STEP 6A: Processing ReadableStream binary data...`);
        
        const chunks = [];
        const reader = output.getReader();
        let chunkCount = 0;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          chunkCount++;
          console.log(`[${requestId}] 📦 Chunk ${chunkCount}: ${value.length} bytes`);
        }
        
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        console.log(`[${requestId}] 📊 Total chunks: ${chunkCount}, Total bytes: ${totalLength}`);
        
        if (totalLength === 0) {
          console.error(`[${requestId}] ❌ STEP 6A FAILED: ReadableStream was empty`);
          throw new Error('ReadableStream was empty - no image data');
        }
        
        const imageBuffer = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          imageBuffer.set(chunk, offset);
          offset += chunk.length;
        }
        
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        enhancedImageUrl = `data:image/jpeg;base64,${base64Image}`;
        
        console.log(`[${requestId}] ✅ STEP 6A SUCCESS: Converted ReadableStream to base64`, {
          totalBytes: totalLength,
          base64Length: base64Image.length,
          finalUrlLength: enhancedImageUrl.length
        });
      } else if (Array.isArray(output) && output.length > 0) {
        console.log(`[${requestId}] 📋 STEP 6B: Processing array output...`, {
          arrayLength: output.length,
          firstItem: output[0],
          firstItemType: typeof output[0]
        });
        enhancedImageUrl = output[0];
        console.log(`[${requestId}] ✅ STEP 6B SUCCESS: Got URL from array:`, enhancedImageUrl);
      } else if (typeof output === 'string' && output.startsWith('https://')) {
        console.log(`[${requestId}] 🔗 STEP 6C: Processing direct URL string...`);
        enhancedImageUrl = output;
        console.log(`[${requestId}] ✅ STEP 6C SUCCESS: Got direct URL:`, enhancedImageUrl);
      } else if (output && output.url && typeof output.url === 'function') {
        console.log(`[${requestId}] 🔧 STEP 6D: Processing Replicate object with url() method...`);
        const urlObject = output.url();
        enhancedImageUrl = urlObject.toString();
        console.log(`[${requestId}] ✅ STEP 6D SUCCESS: Got URL from method:`, enhancedImageUrl);
      } else {
        console.error(`[${requestId}] ❌ STEP 6 FAILED: Completely unexpected output format`, {
          type: typeof output,
          value: output,
          isArray: Array.isArray(output),
          isStream: output instanceof ReadableStream,
          keys: output && typeof output === 'object' ? Object.keys(output) : 'N/A'
        });
        throw new Error(`Unexpected output format: ${typeof output} - Value: ${JSON.stringify(output)}`);
      }
      
      // Validate the final URL
      if (!enhancedImageUrl) {
        console.error(`[${requestId}] ❌ STEP 6 VALIDATION FAILED: No enhanced URL generated`);
        throw new Error('Failed to extract enhanced image URL from Replicate output');
      }
      
      console.log(`[${requestId}] ✅ STEP 6 VALIDATION SUCCESS: Enhanced URL generated`, {
        urlType: enhancedImageUrl.startsWith('data:') ? 'base64' : 'external',
        urlLength: enhancedImageUrl.length,
        urlPreview: enhancedImageUrl.substring(0, 100) + '...'
      });
      
      // Return success response
      const response = {
        success: true,
        output: enhancedImageUrl,
        processingTime: processingTime,
        estimatedCost: 0.0025,
        requestId: requestId
      };

      console.log(`[${requestId}] 🔄 STEP 7: Backend sending URL back to frontend...`);
      console.log(`[${requestId}] ✅ SUCCESS: Complete pipeline working!`, {
        outputUrlType: enhancedImageUrl.startsWith('data:') ? 'base64' : 'external',
        outputLength: enhancedImageUrl.length,
        processingTime: processingTime + 'ms'
      });
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