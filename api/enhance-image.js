import Replicate from "replicate";

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

    console.log("Running the model...");
    
    // Initialize Replicate with explicit auth token
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });
    
    // Call Real-ESRGAN model with correct parameters
    const output = await replicate.run(
      "xinntao/realesrgan:1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56",
      {
        input: {
          img: imageBase64,
          scale: 4,
          version: "General - v3",
          face_enhance: false,
          tile: 0
        }
      }
    );
    
    console.log("Real-ESRGAN completed. Output:", typeof output, output);
    
    // Handle different output formats
    let enhancedUrl = output;
    if (Array.isArray(output) && output.length > 0) {
      enhancedUrl = output[0];
    }
    
    return res.status(200).json({
      success: true,
      output: enhancedUrl,
      estimatedCost: 0.0025
    });

  } catch (error) {
    console.error("Real-ESRGAN failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Real-ESRGAN processing failed'
    });
  }
}