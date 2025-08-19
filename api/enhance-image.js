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

    console.log('🔍 FIXED API: Starting image enhancement...');
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
      // Use the original working Real-ESRGAN approach with prediction polling
      console.log('🔄 Running Real-ESRGAN with predictions...');
      
      const prediction = await replicate.predictions.create({
        version: "1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56",
        input: {
          img: imageData,
          scale: scale,
          version: "General - RealESRGANplus",
          face_enhance: false
        }
      });
      
      console.log('🔄 Prediction created:', prediction.id);
      
      // Poll for completion
      let result = prediction;
      while (result.status !== "succeeded" && result.status !== "failed") {
        await new Promise(resolve => setTimeout(resolve, 1000));
        result = await replicate.predictions.get(prediction.id);
        console.log('🔄 Prediction status:', result.status);
      }
      
      if (result.status === "failed") {
        throw new Error(`Prediction failed: ${result.error}`);
      }
      
      if (!result.output) {
        throw new Error('No output received from Real-ESRGAN');
      }
      
      const output = result.output;
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Processing completed in ${processingTime}ms`);
      console.log('🔍 Raw output:', JSON.stringify(output));
      
      if (!output) {
        throw new Error('No output received from model');
      }

      // Handle different output formats
      let enhancedUrl;
      if (Array.isArray(output)) {
        enhancedUrl = output[0];
      } else if (typeof output === 'string') {
        enhancedUrl = output;
      } else {
        enhancedUrl = output;
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