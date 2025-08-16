import Replicate from 'replicate';

// Initialize Replicate with proper environment variable (no VITE_ prefix for serverless)
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

    // Use the correct Real-ESRGAN model from tutorial (xinntao/realesrgan)
    const modelVersion = 'xinntao/realesrgan:a893322a36b856b3e34ae70020f935391d1e67c85854746f3286395e2f75a7c5';
    
    console.log('🚀 Calling Replicate API with xinntao/realesrgan model...');
    
    // Call Real-ESRGAN with the exact format from tutorial
    const startTime = Date.now();
    let output;
    
    try {
      output = await replicate.run(modelVersion, {
        input: {
          image: imageData
          // Note: xinntao/realesrgan doesn't use scale or face_enhance parameters
        }
      });
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ xinntao/realesrgan completed in ${processingTime}ms`);
      console.log('Output:', output);
      console.log('Output type:', typeof output);
      console.log('Output array length:', Array.isArray(output) ? output.length : 'not array');
      
    } catch (replicateError) {
      console.error('🚨 Replicate API Error:', replicateError);
      console.error('Error details:', replicateError.message);
      console.error('Error stack:', replicateError.stack);
      
      return res.status(500).json({ 
        error: 'Replicate API failed',
        details: replicateError.message,
        timestamp: new Date().toISOString()
      });
    }

    if (!output) {
      console.error('🚨 No output received from xinntao/realesrgan');
      return res.status(500).json({ 
        error: 'No output from AI model',
        details: 'xinntao/realesrgan returned empty response'
      });
    }

    // Extract the upscaled image URL from the output array (as shown in tutorial)
    const upscaledUrl = Array.isArray(output) ? output[0] : output;
    
    if (!upscaledUrl) {
      console.error('🚨 No valid URL in output:', output);
      return res.status(500).json({ 
        error: 'Invalid output from AI model',
        details: 'Could not extract upscaled image URL'
      });
    }

    // Log cost information
    const estimatedCost = 0.0025;
    console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)}`);
    console.log(`🎯 Final upscaled URL: ${upscaledUrl}`);

    // Return success response
    res.status(200).json({
      success: true,
      enhancedImageUrl: upscaledUrl,
      processingTime: Date.now() - startTime,
      estimatedCost,
      modelUsed: 'xinntao/realesrgan',
      scale: 'auto' // xinntao model handles scaling automatically
    });

  } catch (error) {
    console.error('🚨 Unexpected error in enhance-image API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}