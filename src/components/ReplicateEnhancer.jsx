'use client';
import { useState } from 'react';


export default function ReplicateEnhancer() {
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Convert file to data URL for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target.result);
    };
    reader.readAsDataURL(file);

    setIsLoading(true);
    setError(null);
    setPrediction(null);

    try {
      // Convert file to data URL for API
      const imageDataUrl = await fileToDataURL(file);
      
      // Call the existing enhance-image API which works
      const response = await fetch('/api/enhance-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: imageDataUrl,
          scale: 4,
          face_enhance: true
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'Enhancement failed');
        setIsLoading(false);
        return;
      }

      if (result.success && result.output) {
        // Create a prediction-like object for compatibility
        const fakePrediction = {
          id: result.requestId,
          status: 'succeeded',
          output: result.output,
          created_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        };
        
        setPrediction(fakePrediction);
      } else {
        setError('No enhanced image received');
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Enhancement failed:', err);
      setError('Enhancement failed: ' + err.message);
      setIsLoading(false);
    }
  };

  const fileToDataURL = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-8">
        Real-ESRGAN Image Enhancer
      </h1>

      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Image to Enhance
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={isLoading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Enhancing image with Real-ESRGAN...</p>
        </div>
      )}

      {prediction && (
        <div className="mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {originalImage && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Original</h3>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={originalImage}
                    alt="Original"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

            {prediction.output && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Enhanced</h3>
                <div className="border rounded-lg overflow-hidden">
                  <img
                    src={prediction.output}
                    alt="Enhanced"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Status: {prediction.status}
            {prediction.status === 'succeeded' && (
              <span className="ml-2 text-green-600 font-semibold">
                ✓ Enhancement Complete!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}