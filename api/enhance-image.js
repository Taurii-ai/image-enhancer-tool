import Replicate from "replicate";

// Initialize Replicate following official documentation
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req, res) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  console.log(`[${requestId}] 🔥 API REQUEST RECEIVED`, {
    method: req.method,
    headers: Object.keys(req.headers),
    timestamp: new Date().toISOString()
  });

  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] ✅ CORS PREFLIGHT HANDLED`);
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.log(`[${requestId}] ❌ INVALID METHOD:`, req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageData, scale = 4, userEmail } = req.body;

    console.log(`[${requestId}] 📋 REQUEST PARAMETERS:`, {
      hasImageData: !!imageData,
      imageDataLength: imageData?.length,
      imageDataType: typeof imageData,
      imageDataStart: imageData?.substring(0, 50),
      scale: scale,
      userEmail: userEmail,
      hasApiToken: !!process.env.REPLICATE_API_TOKEN,
      apiTokenLength: process.env.REPLICATE_API_TOKEN?.length
    });

    // Validate inputs
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return res.status(500).json({ 
        error: 'API configuration error',
        details: 'REPLICATE_API_TOKEN not configured'
      });
    }

    const startTime = Date.now();
    
    try {
      // Use replicate.run() method following official documentation
      console.log('🔄 Running Real-ESRGAN model on Replicate...');
      
      const output = await replicate.run(
        "xinntao/realesrgan:1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56",
        {
          input: {
            img: imageData,
            scale: scale,
            version: "General - v3",
            face_enhance: false,
            tile: 0
          }
        }
      );
      
      console.log('✅ Real-ESRGAN processing completed successfully');
      
      if (!output) {
        throw new Error('No output received from Real-ESRGAN');
      }
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Processing completed in ${processingTime}ms`);
      
      // Handle ReadableStream from newer Replicate SDK
      let enhancedUrl;
      
      console.log(`[${requestId}] 🔍 OUTPUT TYPE:`, typeof output);
      console.log(`[${requestId}] 🔍 OUTPUT INSTANCE:`, output instanceof ReadableStream);
      
      if (output instanceof ReadableStream) {
        console.log(`[${requestId}] 🔄 Processing ReadableStream from Replicate...`);
        
        // For Real-ESRGAN, the ReadableStream contains binary image data, not a URL
        // We need to convert the stream to a buffer and then to base64
        const chunks = [];
        const reader = output.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        
        // Combine all chunks into a single buffer
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const imageBuffer = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
          imageBuffer.set(chunk, offset);
          offset += chunk.length;
        }
        
        // Convert to base64
        const base64Image = Buffer.from(imageBuffer).toString('base64');
        enhancedUrl = `data:image/jpeg;base64,${base64Image}`;
        
        console.log(`[${requestId}] ✅ Converted ReadableStream to base64:`, {
          totalBytes: totalLength,
          base64Length: base64Image.length
        });
        
      } else if (typeof output === 'string' && output.startsWith('https://')) {
        enhancedUrl = output;
        console.log(`[${requestId}] ✅ Got direct URL from Real-ESRGAN:`, enhancedUrl);
      } else {
        console.log(`[${requestId}] 🚨 Unexpected output format from Real-ESRGAN`);
        console.log(`[${requestId}] 🔍 Output type:`, typeof output);
        console.log(`[${requestId}] 🔍 Output:`, output);
        throw new Error(`Real-ESRGAN returned unexpected format: ${typeof output}`);
      }
      
      console.log(`[${requestId}] 🎯 Final Enhanced URL:`, {
        type: typeof enhancedUrl,
        length: enhancedUrl?.length,
        isDataUrl: enhancedUrl?.startsWith('data:'),
        isHttpUrl: enhancedUrl?.startsWith('https://')
      });

      // Return success response with the enhanced image
      const finalResponse = {
        success: true,
        enhancedImageUrl: enhancedUrl,
        processingTime: processingTime,
        estimatedCost: 0.0025,
        modelUsed: 'xinntao/realesrgan',
        requestId: requestId
      };

      console.log(`[${requestId}] ✅ RETURNING SUCCESS RESPONSE`);
      return res.status(200).json(finalResponse);

    } catch (replicateError) {
      console.error(`[${requestId}] 🚨 Replicate API Error:`, replicateError);
      return res.status(500).json({ 
        error: 'Model processing failed',
        details: replicateError.message,
        requestId: requestId,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error(`[${requestId}] 🚨 Unexpected error:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      requestId: requestId,
      timestamp: new Date().toISOString()
    });
  }
}