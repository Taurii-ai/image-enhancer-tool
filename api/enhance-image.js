import Replicate from "replicate";

// Initialize Replicate following official documentation
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export default async function handler(req, res) {
  // Enable CORS
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
    const { imageData, scale = 4, userEmail } = req.body;

    console.log('🔍 PRODUCTION API: Starting image enhancement...');
    console.log('Scale:', scale);
    console.log('User:', userEmail);
    console.log('Has API token:', !!process.env.REPLICATE_API_TOKEN);

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
      if (output instanceof ReadableStream) {
        console.log('🔄 Processing ReadableStream from Replicate...');
        const reader = output.getReader();
        const decoder = new TextDecoder();
        let result = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
        
        // The stream should contain the URL
        enhancedUrl = result.trim();
        console.log('✅ Got URL from ReadableStream:', enhancedUrl);
        
      } else if (typeof output === 'string' && output.startsWith('https://')) {
        enhancedUrl = output;
        console.log('✅ Got direct URL from Real-ESRGAN:', enhancedUrl);
      } else {
        console.log('🚨 Unexpected output format from Real-ESRGAN');
        console.log('🔍 Output type:', typeof output);
        console.log('🔍 Output:', output);
        throw new Error(`Real-ESRGAN returned unexpected format: ${typeof output}`);
      }
      
      console.log(`🎯 Enhanced URL: ${enhancedUrl}`);

      // Fetch the image and convert to base64 for reliable delivery
      console.log('🔄 Fetching enhanced image for base64 conversion...');
      const imageResponse = await fetch(enhancedUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = `data:image/jpeg;base64,${Buffer.from(imageBuffer).toString('base64')}`;
      
      console.log(`✅ Converted to base64, size: ${base64Image.length} chars`);

      // Return success response with base64 image
      return res.status(200).json({
        success: true,
        enhancedImageUrl: base64Image,
        originalReplicateUrl: enhancedUrl,
        processingTime: processingTime,
        estimatedCost: 0.0025,
        modelUsed: 'xinntao/realesrgan'
      });

    } catch (replicateError) {
      console.error('🚨 Replicate API Error:', replicateError);
      return res.status(500).json({ 
        error: 'Model processing failed',
        details: replicateError.message,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('🚨 Unexpected error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}