export async function enhanceImage(base64Image: string): Promise<string | null> {
  try {
    const res = await fetch("/api/image-processing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }), // ✅ FIXED
    });

    const data = await res.json();
    console.log("🎯 enhanceImage response:", data);

    if (!res.ok) throw new Error(data.error || "Backend error");
    if (!data.enhancedUrl) throw new Error("Enhancement completed but no URL was returned");

    return data.enhancedUrl;
  } catch (err) {
    console.error("❌ enhanceImage failed:", err);
    return null;
  }
}