import { useState } from 'react';
import { enhanceImage, isReplicateAvailable, MODEL_CONFIGS } from '@/lib/replicate';

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
    formData.append('upload_preset', 'enhpix_uploads'); // You'll need to create this in Cloudinary
    
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

  const getScaleForPlan = (plan: string): number => {
    const config = MODEL_CONFIGS[plan as keyof typeof MODEL_CONFIGS];
    return Math.min(config?.maxScale || 4, 4); // Start with 4x for all plans
  };

  const processImage = async (
    file: File,
    options: ProcessingOptions
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Upload image (or create blob URL for development)
      setProgress(20);
      const imageUrl = await uploadToCloudinary(file);

      // Step 2: Check if Replicate is available
      if (!isReplicateAvailable()) {
        // Demo mode - simulate processing
        setProgress(50);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
        setProgress(100);
        
        return {
          success: true,
          originalUrl: imageUrl,
          enhancedUrl: imageUrl, // In demo, enhanced is same as original
          processingTime: 2000,
          model: 'demo',
          isDemoMode: true
        };
      }

      // Step 3: Process with Replicate
      setProgress(30);
      const scale = getScaleForPlan(options.userPlan);
      
      const result = await enhanceImage(
        imageUrl,
        {
          scale,
          model: options.quality,
          imageType: options.imageType,
          userPlan: options.userPlan
        },
        (replicateProgress) => {
          setProgress(30 + (replicateProgress * 0.7)); // 30-100%
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Processing failed');
      }

      return {
        ...result,
        isDemoMode: false
      };

    } catch (err: any) {
      const errorMessage = err.message || 'Image processing failed';
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
    isReplicateAvailable: isReplicateAvailable() 
  };
};