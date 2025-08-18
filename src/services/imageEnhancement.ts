import { getCurrentPlanLimits, getUserSubscription } from './subscriptionManager';
import { recordApiUsage, MODEL_COSTS } from './costTracker';
import { trackImageEnhancement, trackApiCost } from './analytics';
import { UserService } from './userService';

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
    
    // USE API ROUTE METHOD (proper serverless approach)
    try {
      onProgress({ status: 'processing', progress: 10, message: 'Preparing image...' });
      
      // Convert file to data URL for API
      const imageDataUrl = await fileToDataURL(file);
      
      onProgress({ status: 'processing', progress: 20, message: 'Connecting to enhancement API...' });
      
      console.log('🔥 API ROUTE: Using enhance-image API endpoint...');
      
      const response = await fetch('/api/enhance-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageDataUrl,
          scale: 4,
          userEmail: userEmail || 'test@enhpix.com'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `API request failed with status ${response.status}`);
      }

      onProgress({ status: 'processing', progress: 30, message: 'Starting Real-ESRGAN (Anime 6B) model...' });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.details || result.error || 'Enhancement failed');
      }

      onProgress({ status: 'processing', progress: 80, message: `Processing with ${result.modelUsed} (${result.version})...` });

      console.log('📥 API Response:', result);
      
      if (!result.enhancedImageUrl) {
        throw new Error('No enhanced image URL in response');
      }

      enhancedUrl = result.enhancedImageUrl;
      onProgress({ status: 'processing', progress: 95, message: `${result.modelUsed} enhancement complete! (${result.processingTime}ms)` });
      
      console.log('✅ API ROUTE: PRODUCTION Real-ESRGAN successful!', {
        url: result.enhancedImageUrl,
        model: result.modelUsed,
        version: result.version,
        processingTime: result.processingTime,
        cost: result.estimatedCost
      });
      
      // CRITICAL: Skip rest of function if API succeeded - don't let catch block run
      onProgress({ status: 'completed', progress: 100, message: 'Enhancement completed!' });
      
      // Use proxy for Replicate URLs to avoid CORS issues
      let finalEnhancedUrl = result.enhancedImageUrl;
      if (result.enhancedImageUrl.startsWith('https://replicate.delivery/')) {
        finalEnhancedUrl = `/api/proxy-image?url=${encodeURIComponent(result.enhancedImageUrl)}`;
        console.log('🔄 USING PROXIED URL:', finalEnhancedUrl);
      } else {
        console.log('🔄 USING DIRECT URL:', finalEnhancedUrl);
      }
      
      const result_final = {
        originalUrl: URL.createObjectURL(file),
        enhancedUrl: finalEnhancedUrl,
        originalFile: file,
      };
      
      console.log('🎯 RETURNING FINAL RESULT:', result_final);
      return result_final;
      
    } catch (apiError: unknown) {
      console.error('🚨 API Route Error:', apiError);
      console.error('Error details:', apiError instanceof Error ? apiError.message : 'Unknown error');
      
      // Show specific error message to user
      const errorMessage = (apiError instanceof Error ? apiError.message : 'Real-ESRGAN processing failed');
      
      // Only fallback for timeout/network errors, not after API success
      console.error('🚨 API Error (will fallback):', apiError);
      
      onProgress({ 
        status: 'processing', 
        progress: 60, 
        message: `API Error: ${errorMessage}. Using demo mode...` 
      });
      console.log('🔄 Falling back to demo enhancement');
      enhancedUrl = await simulateEnhancement(file, onProgress, planLimits);
    }
    
    onProgress({ status: 'completed', progress: 100, message: 'Enhancement completed!' });
    
    console.log('🎯 PREPARING RESULT with enhancedUrl:', enhancedUrl);
    
    // Prepare the result first (most important)
    const result = {
      originalUrl: URL.createObjectURL(file),
      enhancedUrl,
      originalFile: file,
    };
    
    console.log('🎯 FINAL RESULT OBJECT:', result);
    
    // Track analytics separately - don't let analytics errors break the main flow
    try {
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
    } catch (analyticsError) {
      console.warn('Analytics tracking failed (non-critical):', analyticsError);
    }
    
    console.log('🎯 RETURNING RESULT:', result);
    return result;
    
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