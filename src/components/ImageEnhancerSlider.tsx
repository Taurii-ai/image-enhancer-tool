import { useState } from "react";
import ReactCompareImage from "react-compare-image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ImageEnhancerSlider() {
  const [original, setOriginal] = useState<string | null>(null);
  const [enhanced, setEnhanced] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOriginal(URL.createObjectURL(file));
    setLoading(true);
    setEnhanced(null);

    try {
      const res = await fetch("/api/enhance-image", {
        method: "POST",
        body: file, // direct stream
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('API Response:', data);

      if (data?.output) {
        const outputUrl = Array.isArray(data.output) ? data.output[data.output.length - 1] : data.output;
        setEnhanced(outputUrl);
      } else if (data.status === 'failed') {
        throw new Error(data.error || 'Enhancement failed');
      } else {
        // Handle case where we got a prediction ID but no output yet
        console.log('Got prediction response, might need polling:', data);
        throw new Error('Enhancement not yet complete');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Upload failed:', error);
      setLoading(false);
    }
  };

  const handleReset = () => {
    setOriginal(null);
    setEnhanced(null);
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">
          AI Image Enhancer with Before/After Slider
        </h1>
        
        <div className="mb-6">
          <input 
            type="file" 
            accept="image/*"
            onChange={handleUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={loading}
          />
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg">Enhancing your image...</p>
            <p className="text-sm text-gray-600 mt-2">
              This may take 30-60 seconds
            </p>
          </div>
        )}

        {original && enhanced && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Drag the slider to compare original vs enhanced
            </h3>
            <div className="border rounded-lg overflow-hidden shadow-lg">
              <ReactCompareImage
                leftImage={original}
                rightImage={enhanced}
                sliderLineWidth={4}
                sliderPositionPercentage={0.5}
                leftImageLabel="Original"
                rightImageLabel="Enhanced"
                hover={true}
              />
            </div>
            <div className="mt-4 text-center">
              <Button onClick={handleReset} variant="outline">
                Upload Another Image
              </Button>
            </div>
          </div>
        )}

        {original && !enhanced && !loading && (
          <div className="mt-6 text-center">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <img 
                src={original} 
                alt="Original" 
                className="max-w-full max-h-96 mx-auto rounded-lg"
              />
              <p className="mt-4 text-gray-600">
                Original image uploaded. Click "Upload" to enhance it!
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}