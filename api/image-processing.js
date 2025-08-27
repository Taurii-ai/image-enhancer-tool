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

    // Model mapping
    const models = {
      'general': '660d922d33153019e8c263a3bba265de882e7f4f70396546b6c9c8f9d47a021a',
      'faces': 'cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2',
      'anime': '1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56'
    };
    
    const versionId = models[model] || models.general;
    console.log("✅ Using model version:", versionId);

    // Create prediction with model-specific input parameters
    console.log("🤖 Creating Replicate prediction...");
    
    let inputParams;
    if (model === 'anime') {
      // Real-ESRGAN model needs specific parameters
      inputParams = {
        image: image,
        scale: 4,
        face_enhance: false
      };
    } else {
      // SwinIR (general) and CodeFormer (faces) use simple image input
      inputParams = { image };
    }
    
    console.log("🎯 Input params for", model, ":", Object.keys(inputParams));
    
    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        version: versionId,
        input: inputParams
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