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

    console.log('🔍 ENHANCE API: Starting Real-ESRGAN processing...');
    console.log('Scale:', scale);
    console.log('User:', userEmail);
    console.log('Has API token:', !!process.env.REPLICATE_API_TOKEN);
    console.log('API token prefix:', process.env.REPLICATE_API_TOKEN?.substring(0, 3));

    // Validate inputs
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('🚨 No REPLICATE_API_TOKEN found in environment');
      return res.status(500).json({ 
        error: 'API configuration error',
        details: 'REPLICATE_API_TOKEN not configured'
      });
    }

    // Validate API token format
    if (!process.env.REPLICATE_API_TOKEN.startsWith('r8_')) {
      console.error('🚨 Invalid API token format:', process.env.REPLICATE_API_TOKEN.substring(0, 10));
      return res.status(500).json({ 
        error: 'Invalid API token format',
        details: 'Token should start with r8_'
      });
    }

    console.log('✅ API token validation passed');

    console.log('🚀 Starting Real-ESRGAN enhancement...');
    
    const startTime = Date.now();
    
    try {
      // Use proper replicate.run() without destructuring - Real-ESRGAN returns a single URL
      const output = await replicate.run(
        "xinntao/realesrgan:1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56",
        {
          input: {
            img: imageData,
            scale: 4,
            version: "General - RealESRGANplus",
            face_enhance: false
          }
        }
      );
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Real-ESRGAN completed in ${processingTime}ms`);
      console.log('Raw output:', output);
      console.log('Output type:', typeof output);
      console.log('Is array:', Array.isArray(output));
      
      if (!output) {
        throw new Error('No output received from Real-ESRGAN');
      }

      // Handle different output formats - Real-ESRGAN can return URL directly or in array
      const upscaledUrl = Array.isArray(output) ? output[0] : output;
      
      // Log cost information
      const estimatedCost = 0.0025;
      console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)}`);
      console.log(`🎯 Final upscaled URL: ${upscaledUrl}`);

      // Return success response
      return res.status(200).json({
        success: true,
        enhancedImageUrl: upscaledUrl,
        processingTime: processingTime,
        estimatedCost,
        modelUsed: 'xinntao/realesrgan',
        scale: 4,
        version: 'General - RealESRGANplus'
      });

    } catch (replicateError) {
      console.error('🚨 Replicate API Error:', replicateError);
      return res.status(500).json({ 
        error: 'Replicate API failed',
        details: replicateError.message,
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('🚨 Unexpected error in enhance-image API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}