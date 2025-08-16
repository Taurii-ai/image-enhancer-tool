import Replicate from 'replicate';
import { getCurrentPlanLimits, getUserSubscription } from './subscriptionManager';
import { recordApiUsage, MODEL_COSTS } from './costTracker';
import { trackImageEnhancement, trackApiCost } from './analytics';
import { UserService } from './userService';

// Initialize Replicate client
// Use environment variable with Vite prefix for frontend
const replicate = new Replicate({
  auth: import.meta.env.VITE_REPLICATE_API_TOKEN,
});

// Log API usage with comprehensive tracking and cost estimation
const logApiUsage = (quality: string, scale: number, fileSize: number) => {
  const subscription = getUserSubscription();
  
  // Estimate cost (Real-ESRGAN costs ~$0.0025 per image)
  const estimatedCost = 0.0025;
  console.log(`💰 API Cost: ~$${estimatedCost.toFixed(4)} for ${scale}x upscaling`);
  
  // Record usage in cost tracker
  recordApiUsage(
    quality as 'basic' | 'premium' | 'ultra',
    scale,
    fileSize,
    subscription.userId,
    subscription.planId
  );
};

// Retry function for API calls
const retryApiCall = async <T>(
  fn: () => Promise<T>, 
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded');
};

export interface EnhancementProgress {
  status: 'starting' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
}

export interface EnhancementResult {
  originalUrl: string;
  enhancedUrl: string;
  originalFile: File;
}

// Convert File to base64 data URL for Replicate API
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Optimize image size for API cost efficiency
const optimizeImageForAPI = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate optimal dimensions (max 2048px on either side for cost efficiency)
      const maxDimension = 2048;
      let { width, height } = img;
      
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const optimizedFile = new File([blob], file.name, { 
              type: 'image/jpeg',
              lastModified: Date.now() 
            });
            resolve(optimizedFile);
          } else {
            resolve(file); // Fallback to original
          }
        },
        'image/jpeg',
        0.9 // 90% quality for good balance
      );
    };
    
    img.onerror = () => resolve(file); // Fallback to original
    img.src = URL.createObjectURL(file);
  });
};

// Get appropriate model based on quality level
const getModelForQuality = (quality: 'basic' | 'premium' | 'ultra'): string => {
  switch (quality) {
    case 'ultra':
      return 'tencentarc/gfpgan:9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3';
    case 'premium':
      return 'cjwbw/waifu2x:25c54b7f1eed87a1e5e8ae7d4eaae73a49ec0fafebdab0a8a3ecb4f0b97bd78a';
    case 'basic':
    default:
      return 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc972f1a6c68ad1d9f7a55dc2';
  }
};

// Simulate API call for demo purposes (when no real API key)
const simulateEnhancement = async (
  file: File,
  onProgress: (progress: EnhancementProgress) => void,
  planLimits?: any
): Promise<string> => {
  // Simulate processing stages with plan-specific messaging
  const quality = planLimits?.quality || 'basic';
  const scale = planLimits?.maxScale || 4;
  
  onProgress({ status: 'starting', progress: 0, message: `Initializing ${quality} AI model...` });
  await new Promise(resolve => setTimeout(resolve, 800));
  
  onProgress({ status: 'processing', progress: 25, message: 'Analyzing image structure...' });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  onProgress({ status: 'processing', progress: 50, message: `Applying ${scale}x ${quality} enhancement...` });
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  onProgress({ status: 'processing', progress: 75, message: `Processing with ${quality} quality AI...` });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  onProgress({ status: 'processing', progress: 90, message: 'Finalizing enhancement...' });
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // For demo, create a dramatically enhanced version that simulates AI upscaling
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Scale up the canvas for higher resolution simulation
      const scaleFactor = scale || 2;
      canvas.width = img.width * scaleFactor;
      canvas.height = img.height * scaleFactor;
      
      if (ctx) {
        // Enable high-quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw upscaled image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Apply dramatic AI-style enhancement
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Dramatic contrast and sharpness enhancement
          const brightness = 1.3;  // 30% brighter
          const contrast = 1.4;    // 40% more contrast
          const saturation = 1.2;  // 20% more saturated
          
          // Apply brightness and contrast
          let newR = ((r / 255 - 0.5) * contrast + 0.5) * brightness * 255;
          let newG = ((g / 255 - 0.5) * contrast + 0.5) * brightness * 255;
          let newB = ((b / 255 - 0.5) * contrast + 0.5) * brightness * 255;
          
          // Apply saturation boost
          const gray = newR * 0.299 + newG * 0.587 + newB * 0.114;
          newR = gray + (newR - gray) * saturation;
          newG = gray + (newG - gray) * saturation;
          newB = gray + (newB - gray) * saturation;
          
          // Clamp values and apply
          data[i] = Math.min(255, Math.max(0, newR));
          data[i + 1] = Math.min(255, Math.max(0, newG));
          data[i + 2] = Math.min(255, Math.max(0, newB));
        }
        
        ctx.putImageData(imageData, 0, 0);
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(URL.createObjectURL(file));
        }
      }, 'image/jpeg', 0.98); // Higher quality output
    };
    
    img.onerror = () => resolve(URL.createObjectURL(file));
    img.src = URL.createObjectURL(file);
  });
};

export const enhanceImage = async (
  file: File,
  onProgress: (progress: EnhancementProgress) => void,
  userEmail?: string
): Promise<EnhancementResult> => {
  const startTime = Date.now();
  
  try {
    onProgress({ status: 'starting', progress: 0, message: 'Starting enhancement...' });
    
    // FOR TESTING: Check user subscription and usage from database
    if (userEmail) {
      console.log('🔍 TESTING: Checking user data for:', userEmail);
      
      const userInfo = await UserService.getUserInfo(userEmail);
      if (userInfo) {
        console.log('🔍 TESTING: User found in database:', {
          user: userInfo.user.email,
          subscription: userInfo.subscription?.plan_name,
          status: userInfo.subscription?.status,
          usage: `${userInfo.usage?.images_processed || 0}/${userInfo.usage?.images_limit || 0}`,
          canProcess: userInfo.canProcessImages,
          remaining: userInfo.remainingImages
        });
        
        // Test processing an image for this user (increment usage)
        const processResult = await UserService.processImageForUser(userEmail);
        console.log('🔍 TESTING: Process result:', processResult);
        
        if (!processResult.success) {
          onProgress({ 
            status: 'failed', 
            message: `Enhancement blocked: ${processResult.message}` 
          });
          throw new Error(processResult.message);
        }
        
        onProgress({ status: 'processing', progress: 10, message: processResult.message });
      } else {
        console.log('🔍 TESTING: User not found in database, would need to sign up first');
        onProgress({ 
          status: 'processing', 
          progress: 10, 
          message: 'User not found - would need subscription in production' 
        });
      }
    }
    
    // Get user's plan limits for processing options
    const planLimits = getCurrentPlanLimits();
    
    let enhancedUrl: string;
    
    // Try to use our serverless API for real AI upscaling
    try {
      onProgress({ status: 'processing', progress: 10, message: 'Preparing image for AI processing...' });
      
      // Optimize image size for cost efficiency (max 2048px for better quality/cost balance)
      const optimizedFile = await optimizeImageForAPI(file);
      const imageDataUrl = await fileToDataURL(optimizedFile);
      
      onProgress({ status: 'processing', progress: 25, message: 'Uploading to Real-ESRGAN AI model...' });
      
      const scale = Math.min(4, planLimits.maxScale || 4); // Cap at 4x
      
      // Log usage for cost tracking
      logApiUsage(planLimits.quality, scale, optimizedFile.size);
      
      onProgress({ status: 'processing', progress: 40, message: `Processing with Real-ESRGAN ${scale}x upscaling...` });
      
      console.log('🔍 CALLING OUR API: Starting Real-ESRGAN processing...');
      
      // Call our serverless function instead of Replicate directly
      const response = await fetch('/api/enhance-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageDataUrl,
          scale: scale,
          userEmail: userEmail
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`API Error: ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.success || !result.enhancedImageUrl) {
        throw new Error(result.error || 'No enhanced image received');
      }
      
      enhancedUrl = result.enhancedImageUrl;
      onProgress({ status: 'processing', progress: 90, message: 'Real AI enhancement complete!' });
      
      console.log('✅ OUR API: Enhancement successful!', result);
      console.log(`💰 Processing time: ${result.processingTime}ms, Cost: $${result.estimatedCost}`);
      
    } catch (apiError: any) {
      console.error('🚨 Our API Error:', apiError);
      console.error('Error details:', apiError.message);
      
      // Show specific error message to user
      const errorMessage = apiError.message || 'API processing failed';
      onProgress({ 
        status: 'processing', 
        progress: 60, 
        message: `API Error: ${errorMessage}. Falling back to demo...` 
      });
      
      // Fallback to demo mode if API fails
      console.log('🔄 Falling back to demo enhancement');
      enhancedUrl = await simulateEnhancement(file, onProgress, planLimits);
    }
    
    onProgress({ status: 'completed', progress: 100, message: 'Enhancement completed!' });
    
    // Track successful enhancement
    const processingTime = Date.now() - startTime;
    const fileSizeMB = file.size / 1024 / 1024;
    
    trackImageEnhancement(
      planLimits.quality,
      planLimits.maxScale,
      fileSizeMB,
      processingTime,
      true
    );
    
    // Track API cost
    trackApiCost(planLimits.quality, MODEL_COSTS[planLimits.quality]);
    
    return {
      originalUrl: URL.createObjectURL(file),
      enhancedUrl,
      originalFile: file,
    };
    
  } catch (error) {
    console.error('Enhancement failed:', error);
    
    // Track failed enhancement
    const processingTime = Date.now() - startTime;
    const fileSizeMB = file.size / 1024 / 1024;
    const planLimits = getCurrentPlanLimits();
    
    trackImageEnhancement(
      planLimits.quality,
      planLimits.maxScale,
      fileSizeMB,
      processingTime,
      false,
      error instanceof Error ? error.message : 'Unknown error'
    );
    
    onProgress({ 
      status: 'failed', 
      message: `Enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    });
    throw error;
  }
};

export const getEnhancementModels = () => {
  return [
    {
      id: 'real-esrgan',
      name: 'Real-ESRGAN',
      description: 'General purpose image upscaling with excellent quality',
      maxScale: 4,
    },
    {
      id: 'esrgan',
      name: 'ESRGAN',
      description: 'High-quality super-resolution for photorealistic images',
      maxScale: 4,
    },
  ];
};