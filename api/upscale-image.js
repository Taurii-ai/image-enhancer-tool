import Replicate from "replicate";

export default async function handler(req, res) {
  // Ensure the request method is POST
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Get the image URL from the request body
  const { imageUrl } = req.body;

  // Check if an image URL was provided
  if (!imageUrl) {
    return res.status(400).json({ message: 'Image URL is required' });
  }

  // Initialize the Replicate client with your API token from Vercel's environment variables
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  try {
    console.log("Starting image upscaling...");

    // Run the Real-ESRGAN model on the image
    const output = await replicate.run(
      "xinntao/realesrgan:a893322a36b856b3e34ae70020f935391d1e67c85854746f3286395e2f75a7c5",
      {
        input: {
          image: imageUrl
        }
      }
    );

    console.log("Upscaling finished. Output:", output);

    // Send the URL of the upscaled image back to the client
    res.status(200).json({ upscaledUrl: output[0] });

  } catch (error) {
    console.error("Upscaling error:", error);
    res.status(500).json({ message: 'Failed to upscale the image.' });
  }
}