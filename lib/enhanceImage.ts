export async function enhanceImage(base64Image: string): Promise<string | null> {
  try {
    console.log("🔄 Starting image enhancement...");
    console.log("📷 Image converted to base64, length:", base64Image.length);
    
    // POST to the API endpoint
    const response = await fetch("/api/image-processing", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: base64Image }),
    });
    
    console.log("📡 API Response status:", response.status, response.statusText);
    
    // Parse the JSON response
    const data = await response.json();
    console.log("🎯 API Response data:", data);
    
    // Check if the response is successful
    if (!response.ok) {
      console.error("❌ API Error:", data.error || "Unknown error");
      throw new Error(data.error || `API failed with status ${response.status}`);
    }
    
    // Check if we got an enhanced URL
    if (!data.enhancedUrl || typeof data.enhancedUrl !== "string") {
      console.error("❌ No valid enhanced URL in response");
      throw new Error("No enhanced image URL returned from API");
    }
    
    console.log("✅ Enhanced image URL received:", data.enhancedUrl);
    return data.enhancedUrl;
    
  } catch (error: any) {
    console.error("❌ enhanceImage failed:", error.message || error);
    return null;
  }
}