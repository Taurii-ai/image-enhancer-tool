// /lib/enhanceImage.ts
export async function enhanceImage(base64Image: string): Promise<string | null> {
  try {
    const res = await fetch("/api/image-processing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({} as any));
    console.log("🎯 enhanceImage response:", data);

    if (!res.ok) {
      throw new Error(data?.error || `Backend API failed: ${res.status}`);
    }

    if (!data?.enhancedUrl || typeof data.enhancedUrl !== "string") {
      throw new Error("No valid enhanced image URL returned from backend");
    }

    return data.enhancedUrl;
  } catch (err) {
    console.error("❌ enhanceImage failed:", err);
    return null; // Frontend can fallback to original
  }
}