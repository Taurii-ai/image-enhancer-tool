import Replicate from "replicate";

export default async function handler(req, res) {
  console.log('🚀 REAL-ESRGAN API called with method:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { imageUrl } = req.body;
  console.log('📸 Image URL received:', imageUrl ? 'Yes' : 'No');

  if (!imageUrl) {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  // Check environment variables
  console.log('🔑 Has REPLICATE_API_TOKEN:', !!process.env.REPLICATE_API_TOKEN);
  console.log('🔑 Token prefix:', process.env.REPLICATE_API_TOKEN?.substring(0, 3));

  if (!process.env.REPLICATE_API_TOKEN) {
    return res.status(500).json({ error: 'REPLICATE_API_TOKEN not configured' });
  }

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  try {
    console.log('🔥 Starting Real-ESRGAN with correct model...');
    
    // Use the CORRECT model identifier you provided
    const output = await replicate.run(
      "xinntao/realesrgan:1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56",
      {
        input: {
          image: imageUrl
        }
      }
    );

    console.log('✅ Real-ESRGAN completed successfully!');
    console.log('📤 Output type:', typeof output);
    console.log('📤 Output value:', output);

    // Handle the output properly
    const resultUrl = Array.isArray(output) ? output[0] : output;
    
    if (!resultUrl) {
      throw new Error('No valid output URL received');
    }

    console.log('🎯 Final result URL:', resultUrl);

    res.status(200).json({ 
      success: true,
      upscaledUrl: resultUrl,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🚨 Real-ESRGAN Error:', error.message);
    console.error('🚨 Full error:', error);
    
    res.status(500).json({ 
      error: 'Real-ESRGAN processing failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}