import Replicate from "replicate";

// Following the exact Replicate Node.js guide
const replicate = new Replicate();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log("Running the model...");
    
    // Exactly like the guide example
    const [output] = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: "An astronaut riding a rainbow unicorn, cinematic, dramatic",
        },
      }
    );
    
    console.log("Model completed. Output:", output);
    
    return res.status(200).json({
      success: true,
      output: output,
      message: "Guide example working"
    });
    
  } catch (error) {
    console.error("Test failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}