import Replicate from 'replicate';
import { getCurrentPlanLimits, getUserSubscription } from './subscriptionManager';
import { recordApiUsage, MODEL_COSTS } from './costTracker';
import { trackImageEnhancement, trackApiCost } from './analytics';
import { UserService } from './userService';

// Initialize Replicate client
// Use environment variable with Vite prefix for frontend
const replicate = new Replicate({
  auth: import.meta.env.VITE_REPLICATE_API_TOKEN || 'r8_demo_key',
});

// Log API usage with comprehensive tracking
const logApiUsage = (quality: string, scale: number, fileSize: number) => {
  const subscription = getUserSubscription();
  
  // Record usage in cost tracker
  recordApiUsage(
    quality as 'basic' | 'premium' | 'ultra',
    scale,
    fileSize,
    subscription.userId,
    subscription.planId
  );
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
  
  // For demo, create a slightly enhanced version by increasing brightness/contrast
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx?.drawImage(img, 0, 0);
      
      // Apply slight enhancement effect for demo
      if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Slight brightness and contrast enhancement
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * 1.1 + 10);     // Red
          data[i + 1] = Math.min(255, data[i + 1] * 1.1 + 10); // Green  
          data[i + 2] = Math.min(255, data[i + 2] * 1.1 + 10); // Blue
        }
        
        ctx.putImageData(imageData, 0, 0);
      }
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(URL.createObjectURL(blob));
        } else {
          resolve(URL.createObjectURL(file));
        }
      }, 'image/jpeg', 0.95);
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
    
    // Check if we have a real API key
    const hasRealKey = import.meta.env.VITE_REPLICATE_API_TOKEN && 
                      import.meta.env.VITE_REPLICATE_API_TOKEN !== 'r8_demo_key';
    
    let enhancedUrl: string;
    
    if (hasRealKey) {
      // Real Replicate API implementation
      onProgress({ status: 'processing', progress: 10, message: 'Preparing image for AI processing...' });
      
      // Optimize image size for cost efficiency (max 5MB)
      const optimizedFile = await optimizeImageForAPI(file);
      const imageDataUrl = await fileToDataURL(optimizedFile);
      
      onProgress({ status: 'processing', progress: 25, message: 'Uploading to AI model...' });
      
      // Choose model and scale based on plan
      const modelVersion = getModelForQuality(planLimits.quality);
      const scale = Math.min(4, planLimits.maxScale); // Cap at 4x for most models
      
      // Log usage for cost tracking
      logApiUsage(planLimits.quality, scale, optimizedFile.size);
      
      onProgress({ status: 'processing', progress: 40, message: `Applying ${planLimits.quality} quality enhancement...` });
      
      try {
        const output = await replicate.run(modelVersion, {
          input: {
            image: imageDataUrl,
            scale: scale,
          }
        }) as string;
        
        if (!output) {
          throw new Error('No output received from AI model');
        }
        
        enhancedUrl = output;
        onProgress({ status: 'processing', progress: 90, message: 'Processing complete, downloading result...' });
        
      } catch (apiError: any) {
        console.error('Replicate API error:', apiError);
        
        // Fallback to demo mode if API fails
        console.log('API failed, falling back to demo mode');
        onProgress({ status: 'processing', progress: 60, message: 'API unavailable, using demo processing...' });
        enhancedUrl = await simulateEnhancement(file, onProgress, planLimits);
      }
      
    } else {
      // Demo mode - simulate the process with plan-specific messaging
      console.log(`Running in demo mode - ${planLimits.quality} quality simulation`);
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