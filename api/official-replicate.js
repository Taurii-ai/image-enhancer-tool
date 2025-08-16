import Replicate from "replicate";

export default async function handler(req, res) {
  console.log('🔥 OFFICIAL REPLICATE API called');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { imageUrl } = req.body;
  console.log('📸 Image URL received:', imageUrl ? 'Yes' : 'No');

  if (!imageUrl) {
    return res.status(400).json({ error: 'Image URL is required' });
  }

  console.log('🔑 REPLICATE_API_TOKEN exists:', !!process.env.REPLICATE_API_TOKEN);
  console.log('🔑 Token prefix:', process.env.REPLICATE_API_TOKEN?.substring(0, 3));

  // Step 1: Test authentication first
  const replicate = new Replicate();
  
  try {
    console.log('🔍 Testing authentication with account endpoint...');
    
    // Test auth using the official method from guide
    const account = await replicate.request('https://api.replicate.com/v1/account');
    console.log('✅ Authentication successful:', account.username);
    
  } catch (authError) {
    console.error('🚨 Authentication failed:', authError.message);
    return res.status(401).json({ 
      error: 'Authentication failed',
      details: authError.message 
    });
  }

  try {
    console.log('🚀 Starting Real-ESRGAN with OFFICIAL method...');
    
    // Use the EXACT format from the official guide
    const input = {
      img: imageUrl,
      version: "Anime - anime6B"
    };

    console.log('📤 Input being sent to model:', input);
    
    // Use the exact model version and method from guide
    const output = await replicate.run(
      "xinntao/realesrgan:1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56", 
      { input }
    );

    console.log('📥 Raw output received:', output);
    console.log('📥 Output type:', typeof output);

    // Use the official method to get URL
    const resultUrl = output.url();
    console.log('🎯 Final URL from output.url():', resultUrl);

    res.status(200).json({ 
      success: true,
      upscaledUrl: resultUrl,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🚨 Model Error:', error.message);
    console.error('🚨 Full error:', error);
    
    res.status(500).json({ 
      error: 'Model processing failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}