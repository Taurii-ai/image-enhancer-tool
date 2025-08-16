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

    // Use the latest Real-ESRGAN model
    const modelVersion = 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc972f1a6c68ad1d9f7a55dc2';
    
    console.log('🚀 Calling Replicate API...');
    
    // Call Real-ESRGAN with retry logic
    const startTime = Date.now();
    let output;
    
    try {
      output = await replicate.run(modelVersion, {
        input: {
          image: imageData,
          scale: parseInt(scale),
          face_enhance: false, // Keep false for general images
        }
      });
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Real-ESRGAN completed in ${processingTime}ms`);
      console.log('Output URL:', output);
      
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
      console.error('🚨 No output received from Real-ESRGAN');
      return res.status(500).json({ 
        error: 'No output from AI model',
        details: 'Real-ESRGAN returned empty response'
      });
    }

    // Log cost information
    const estimatedCost = 0.0025;
    console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)}`);

    // Return success response
    res.status(200).json({
      success: true,
      enhancedImageUrl: output,
      processingTime: Date.now() - startTime,
      estimatedCost,
      modelUsed: 'Real-ESRGAN',
      scale: parseInt(scale)
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