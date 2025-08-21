import { useState } from 'react';

export interface ProcessingOptions {
  imageType: 'universal' | 'photo' | 'artwork' | 'logo';
  userPlan: 'trial' | 'basic' | 'pro' | 'premium';
  quality: 'basic' | 'premium' | 'ultra';
}

export const useImageProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'enhpix_uploads');
    
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      // Fallback: create a local blob URL for development
      console.warn('Cloudinary upload failed, using local blob URL:', error);
      return URL.createObjectURL(file);
    }
  };

  // Upload file to get public URL for Replicate
  const uploadImageToPublicStorage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/image-processing?action=upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Failed to upload image to public storage');
    }

    const result = await response.json();
    return result.url;
  };

  // Convert File to base64 for backend API (fallback)
  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processImage = async (
    file: File,
    options: ProcessingOptions
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Upload image to get public URL
      setProgress(10);
      const publicImageUrl = await uploadImageToPublicStorage(file);
      console.log('📤 UPLOADED IMAGE URL:', publicImageUrl);

      // Step 2: Call backend API with public URL
      setProgress(30);
      const response = await fetch('/api/image-processing?action=enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: publicImageUrl })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Backend API failed: ${response.status}`);
      }

      setProgress(60);
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.output) {
        throw new Error('No enhanced image URL in response');
      }

      setProgress(100);

      // Handle array output (Replicate returns array)
      const enhancedUrl = Array.isArray(result.output) ? result.output[0] : result.output;

      return {
        success: true,
        originalUrl: URL.createObjectURL(file),
        enhancedUrl: enhancedUrl,
        processingTime: 5000, // Estimate
        model: 'Real-ESRGAN',
        isDemoMode: false
      };

    } catch (err: unknown) {
      const errorMessage = (err instanceof Error ? err.message : 'Image processing failed');
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetProcessing = () => {
    setIsProcessing(false);
    setProgress(0);
    setError(null);
  };

  return { 
    processImage, 
    isProcessing, 
    progress, 
    error, 
    resetProcessing,
    isReplicateAvailable: true // Always true since backend handles it
  };
};