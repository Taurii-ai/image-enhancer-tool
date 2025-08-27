export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("🚀 Image processing API called");
    
    const { image, model = 'general' } = req.body || {};
    
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    console.log("✅ Image received, length:", image.length);
    console.log("✅ Model:", model);
    
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
    
    if (!REPLICATE_API_TOKEN) {
      console.error("❌ No REPLICATE_API_TOKEN");
      return res.status(500).json({ error: 'API token not configured' });
    }
    
    console.log("✅ Token exists, length:", REPLICATE_API_TOKEN.length);

    // Model mapping - using known working Real-ESRGAN model for anime
    const models = {
      'general': '660d922d33153019e8c263a3bba265de882e7f4f70396546b6c9c8f9d47a021a',
      'faces': 'cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2',
      'anime': 'f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa'
    };
    
    const versionId = models[model] || models.general;
    console.log("✅ Using model version:", versionId);

    // Create prediction - all models use same input pattern
    console.log("🤖 Creating Replicate prediction...");
    
    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: versionId,
        input: { image }
      })
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.text();
      console.error("❌ Replicate create failed:", createResponse.status, errorData);
      return res.status(500).json({ 
        error: `Replicate create failed: ${createResponse.status}`,
        details: errorData
      });
    }

    const prediction = await createResponse.json();
    console.log("✅ Prediction created:", prediction.id);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes
    let currentPrediction = prediction;
    
    while (
      currentPrediction.status !== 'succeeded' && 
      currentPrediction.status !== 'failed' && 
      attempts < maxAttempts
    ) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`
        }
      });
      
      if (!pollResponse.ok) {
        console.error("❌ Polling failed:", pollResponse.status);
        break;
      }
      
      currentPrediction = await pollResponse.json();
      attempts++;
      console.log(`🔄 Poll ${attempts}/${maxAttempts}: ${currentPrediction.status}`);
    }

    if (currentPrediction.status !== 'succeeded') {
      console.error("❌ Prediction failed:", currentPrediction.status);
      return res.status(500).json({ 
        error: `Prediction ${currentPrediction.status}`,
        logs: currentPrediction.logs
      });
    }

    // Extract URL
    const output = currentPrediction.output;
    console.log("🔍 Raw output:", output);
    
    let enhancedUrl = null;
    
    if (typeof output === 'string' && output.startsWith('https://')) {
      enhancedUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      enhancedUrl = output[0];
    }
    
    if (!enhancedUrl) {
      console.error("❌ No URL found in output:", output);
      return res.status(500).json({ 
        error: 'No enhanced image URL returned',
        output: output
      });
    }

    console.log("✅ Success! Enhanced URL:", enhancedUrl);
    
    return res.status(200).json({ 
      enhancedUrl,
      predictionId: prediction.id,
      model
    });

  } catch (error) {
    console.error("❌ API Error:", error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      stack: error.stack
    });
  }
}