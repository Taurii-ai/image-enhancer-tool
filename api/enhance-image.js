import Replicate from "replicate";

const replicate = new Replicate();

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
    
    // EXACT guide pattern with array destructuring
    const [output] = await replicate.run(
      "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
      {
        input: {
          image: imageBase64,
          scale: 4,
          face_enhance: true
        }
      }
    );
    
    console.log("Image saved as output");
    
    return res.status(200).json({
      success: true,
      output: output,
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