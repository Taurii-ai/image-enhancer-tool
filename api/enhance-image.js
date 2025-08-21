export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64' });
    }

    console.log("Running Real-ESRGAN model...");
    console.log("API Token available:", !!process.env.REPLICATE_API_TOKEN);
    
    // Make direct API call to Replicate with correct Token auth
    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: "1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56",
        input: {
          img: imageBase64,
          scale: 4,
          version: "General - v3",
          face_enhance: false,
          tile: 0
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Replicate API Error:", response.status, errorData);
      return res.status(500).json({
        success: false,
        error: `Replicate API failed: ${response.status}`,
        details: errorData
      });
    }

    const prediction = await response.json();
    console.log("Prediction created:", prediction.id);

    // Poll for completion
    let result = prediction;
    let attempts = 0;
    while (result.status === 'starting' || result.status === 'processing') {
      if (attempts > 60) break; // 5 minute timeout
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const pollResponse = await fetch(result.urls.get, {
        headers: {
          "Authorization": `Token ${process.env.REPLICATE_API_TOKEN}`,
        }
      });
      
      if (!pollResponse.ok) {
        console.error("Polling failed:", pollResponse.status);
        break;
      }
      
      result = await pollResponse.json();
      attempts++;
      console.log(`Status: ${result.status} (attempt ${attempts})`);
    }

    if (result.status === 'succeeded' && result.output) {
      console.log("Real-ESRGAN completed successfully!");
      return res.status(200).json({
        success: true,
        output: result.output,
        estimatedCost: 0.0025
      });
    } else {
      console.error("Real-ESRGAN failed:", result);
      return res.status(500).json({
        success: false,
        error: result.error || 'Processing failed',
        status: result.status
      });
    }

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Real-ESRGAN processing failed'
    });
  }
}