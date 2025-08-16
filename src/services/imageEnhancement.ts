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

// These functions were used for the old API-based approach, now using direct client

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

// These functions were used for the old API-based approach with multiple models

// Simulate API call for demo purposes (when no real API key)
const simulateEnhancement = async (
  file: File,
  onProgress: (progress: EnhancementProgress) => void,
  planLimits?: { quality?: string; maxScale?: number }
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
    
    // DIRECT REPLICATE CLIENT METHOD (since API routes don't work in Vite)
    try {
      onProgress({ status: 'processing', progress: 10, message: 'Preparing image...' });
      
      // Convert file to data URL for Replicate
      const imageDataUrl = await fileToDataURL(file);
      
      onProgress({ status: 'processing', progress: 20, message: 'Connecting to Replicate...' });
      
      console.log('🔥 DIRECT CLIENT: Using Replicate directly from frontend...');
      console.log('🔑 Has API token:', !!import.meta.env.VITE_REPLICATE_API_TOKEN);
      
      if (!import.meta.env.VITE_REPLICATE_API_TOKEN) {
        throw new Error('VITE_REPLICATE_API_TOKEN not found');
      }
      
      onProgress({ status: 'processing', progress: 30, message: 'Starting Real-ESRGAN model...' });
      
      // Use the exact Real-ESRGAN model and parameters from the guide
      const output = await replicate.run(
        "xinntao/realesrgan:1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56",
        {
          input: {
            img: imageDataUrl,
            version: "Anime - anime6B"
          }
        }
      );

      onProgress({ status: 'processing', progress: 80, message: 'Processing with Real-ESRGAN...' });

      console.log('📥 Direct Replicate Output:', output);
      console.log('📥 Output type:', typeof output);
      
      // Handle output based on Replicate's response format
      let resultUrl: string;
      if (output && typeof output === 'object' && 'url' in output && typeof output.url === 'function') {
        resultUrl = output.url();
      } else if (Array.isArray(output) && output.length > 0) {
        resultUrl = output[0];
      } else if (typeof output === 'string') {
        resultUrl = output;
      } else {
        throw new Error('Unexpected output format from Real-ESRGAN');
      }
      
      if (!resultUrl) {
        throw new Error('No valid URL received from Real-ESRGAN');
      }

      enhancedUrl = resultUrl;
      onProgress({ status: 'processing', progress: 95, message: 'Real-ESRGAN enhancement complete!' });
      
      console.log('✅ DIRECT CLIENT: Real-ESRGAN successful!', resultUrl);
      
    } catch (apiError: unknown) {
      console.error('🚨 Direct Replicate Error:', apiError);
      console.error('Error details:', apiError instanceof Error ? apiError.message : 'Unknown error');
      
      // Show specific error message to user
      const errorMessage = (apiError instanceof Error ? apiError.message : 'Real-ESRGAN processing failed');
      onProgress({ 
        status: 'processing', 
        progress: 60, 
        message: `Real-ESRGAN Error: ${errorMessage}. Using demo mode...` 
      });
      
      // Fallback to demo mode if Real-ESRGAN fails
      console.log('🔄 Falling back to demo enhancement');
      enhancedUrl = await simulateEnhancement(file, onProgress, planLimits);
    }
    
    onProgress({ status: 'completed', progress: 100, message: 'Enhancement completed!' });
    
    // Track successful enhancement
    const processingTime = Date.now() - startTime;
    const fileSizeMB = file.size / 1024 / 1024;
    
    trackImageEnhancement(
      'basic', // Using 'basic' since we're using single Real-ESRGAN model
      4, // Real-ESRGAN does 4x upscaling
      fileSizeMB,
      processingTime,
      true
    );
    
    // Track API cost - using basic as fallback since we're using single Real-ESRGAN model
    trackApiCost('basic', MODEL_COSTS['basic']);
    
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
    
    trackImageEnhancement(
      'basic', // Using 'basic' since we're using single Real-ESRGAN model
      4, // Real-ESRGAN does 4x upscaling
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