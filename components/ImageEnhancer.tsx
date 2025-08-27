"use client";

import { useState } from "react";
import { enhanceImage } from "@/lib/enhanceImage";

export default function ImageEnhancer() {
  const [original, setOriginal] = useState<string | null>(null);
  const [enhanced, setEnhanced] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("📁 File selected:", file.name, file.size, "bytes");
    
    setError(null);
    setEnhanced(null);
    setLoading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        setOriginal(base64String);
        
        console.log("🔄 Converting to base64 complete");
        
        // Enhance the image
        const enhancedUrl = await enhanceImage(base64String);
        
        if (enhancedUrl) {
          setEnhanced(enhancedUrl);
          console.log("🎉 Enhancement successful!");
        } else {
          setError("Enhancement failed - please try again");
          setEnhanced(base64String); // Fallback to original
          console.log("⚠️ Enhancement failed, showing original");
        }
        
        setLoading(false);
      };
      
      reader.onerror = () => {
        setError("Failed to read file");
        setLoading(false);
      };
      
      reader.readAsDataURL(file);
      
    } catch (err: any) {
      console.error("❌ File handling error:", err);
      setError("Failed to process file");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Image Enhancer Test</h1>
        <p className="text-gray-600 mb-6">
          Upload an image to test the Replicate SwinIR enhancement
        </p>
      </div>

      {/* File Input */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="mb-4"
          disabled={loading}
        />
        {loading && (
          <p className="text-blue-600 font-medium">
            🔄 Enhancing image with AI... This may take 30-60 seconds.
          </p>
        )}
        {error && (
          <p className="text-red-600 font-medium">❌ {error}</p>
        )}
      </div>

      {/* Image Display */}
      {original && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Original Image</h3>
            <img
              src={original}
              alt="Original"
              className="w-full h-auto border border-gray-200 rounded-lg"
            />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              {loading ? "Processing..." : "Enhanced Image"}
            </h3>
            {enhanced ? (
              <img
                src={enhanced}
                alt="Enhanced"
                className="w-full h-auto border border-gray-200 rounded-lg"
                onError={() => {
                  console.log("⚠️ Enhanced image failed to load, using original");
                  setEnhanced(original);
                }}
              />
            ) : loading ? (
              <div className="w-full h-64 bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">AI Enhancement in Progress...</p>
                </div>
              </div>
            ) : (
              <div className="w-full h-64 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">Enhanced image will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="bg-gray-50 p-4 rounded-lg text-sm">
        <h4 className="font-semibold mb-2">Debug Info:</h4>
        <p>• Original: {original ? "✅ Loaded" : "❌ None"}</p>
        <p>• Enhanced: {enhanced ? "✅ Loaded" : "❌ None"}</p>
        <p>• Status: {loading ? "🔄 Processing" : "✅ Ready"}</p>
        <p>• Check browser console for detailed logs</p>
      </div>
    </div>
  );
}