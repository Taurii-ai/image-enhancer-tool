// Simple test following the exact Replicate guide
import Replicate from "replicate";
import { readFileSync } from "fs";

const replicate = new Replicate();

console.log("Testing Replicate connection...");
console.log("API Token set:", !!process.env.REPLICATE_API_TOKEN);
console.log("Token length:", process.env.REPLICATE_API_TOKEN?.length || 0);

try {
  // Test with a simple text-to-image model first (less complex than Real-ESRGAN)
  console.log("Running simple test model...");
  
  const output = await replicate.run(
    "stability-ai/stable-diffusion:27b93a2413e7f36cd83da926f3656280b2931564ff050bf9575f1fdf9bcd7478",
    {
      input: {
        prompt: "a simple test image"
      }
    }
  );
  
  console.log("Test successful! Output:", output);
  
} catch (error) {
  console.error("Test failed:", {
    message: error.message,
    name: error.name,
    stack: error.stack,
    cause: error.cause
  });
}