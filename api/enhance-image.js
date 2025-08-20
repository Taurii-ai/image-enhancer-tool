export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Missing imageBase64' });

    console.log('🔄 Starting Real-ESRGAN...');

    // Direct API call to Replicate
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
        input: {
          image: imageBase64,
          scale: 4,
          face_enhance: true
        }
      })
    });

    const prediction = await response.json();
    console.log('✅ Prediction created:', prediction.id);

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        error: prediction.detail || 'Prediction failed',
        prediction
      });
    }

    // Poll for completion
    let result = prediction;
    let attempts = 0;
    while (result.status === 'starting' || result.status === 'processing') {
      if (attempts > 60) break; // 5 minute timeout
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const pollResponse = await fetch(result.urls.get, {
        headers: {
          'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        }
      });
      
      result = await pollResponse.json();
      attempts++;
      console.log(`⏳ Status: ${result.status} (attempt ${attempts})`);
    }

    if (result.status === 'succeeded' && result.output) {
      console.log('🎉 Real-ESRGAN completed!');
      return res.status(200).json({
        success: true,
        output: result.output,
        estimatedCost: 0.0025
      });
    } else {
      console.log('❌ Real-ESRGAN failed:', result);
      return res.status(500).json({
        success: false,
        error: result.error || 'Processing failed',
        status: result.status
      });
    }

  } catch (error) {
    console.error('💥 Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}