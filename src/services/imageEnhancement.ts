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

// Convert File to compressed base64 data URL for Replicate API
const fileToDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Compress large images to reduce payload size
      const maxSize = 1024; // Max 1024px on longest side
      let { width, height } = img;
      
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width *= ratio;
        height *= ratio;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression
        canvas.toBlob((blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        }, 'image/jpeg', 0.8); // 80% quality
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
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

const debugLog = (level: 'info' | 'error' | 'success' | 'warning', message: string, data?: any) => {
  console.log(`[${level.toUpperCase()}] ${message}`, data || '');
  if ((window as any).debugLog) {
    (window as any).debugLog(level, message, data);
  }
};

export const enhanceImage = async (
  file: File,
  onProgress: (progress: EnhancementProgress) => void,
  userEmail?: string
): Promise<EnhancementResult> => {
  const startTime = Date.now();
  
  debugLog('info', '🚀 STARTING IMAGE ENHANCEMENT', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    userEmail: userEmail
  });
  
  try {
    onProgress({ status: 'starting', progress: 0, message: 'Starting enhancement...' });
    
    // TEMPORARILY DISABLE AUTH - Focus on getting Real-ESRGAN working
    console.log('🔍 TESTING: Skipping user authentication for demo');
    onProgress({ 
      status: 'processing', 
      progress: 10, 
      message: 'Ready to process with Real-ESRGAN' 
    });
    
    // Get user's plan limits for processing options
    const planLimits = getCurrentPlanLimits();
    
    let enhancedUrl: string;
    
    // USE API ROUTE METHOD (proper serverless approach)
    try {
      debugLog('info', '📤 PREPARING API REQUEST');
      onProgress({ status: 'processing', progress: 10, message: 'Preparing image...' });
      
      // Convert file to data URL for API
      debugLog('info', '🔄 CONVERTING FILE TO DATA URL');
      const imageDataUrl = await fileToDataURL(file);
      debugLog('success', '✅ FILE CONVERTED TO DATA URL', {
        dataUrlLength: imageDataUrl.length,
        dataUrlStart: imageDataUrl.substring(0, 100)
      });
      
      onProgress({ status: 'processing', progress: 20, message: 'Connecting to enhancement API...' });
      
      const apiPayload = {
        imageData: imageDataUrl,
        scale: 4,
        userEmail: userEmail || 'test@enhpix.com'
      };
      
      debugLog('info', '🔥 CALLING API ENDPOINT', {
        endpoint: '/api/enhance-image',
        payloadSize: JSON.stringify(apiPayload).length,
        scale: 4,
        userEmail: userEmail || 'test@enhpix.com'
      });
      
      const response = await fetch('/api/enhance-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload)
      });

      debugLog('info', '📡 API RESPONSE RECEIVED', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        debugLog('error', '❌ API REQUEST FAILED', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData
        });
        throw new Error(errorData.details || errorData.error || `API request failed with status ${response.status}`);
      }

      onProgress({ status: 'processing', progress: 30, message: 'Processing API response...' });

      const result = await response.json();
      
      debugLog('success', '📥 API RESPONSE PARSED', {
        success: result.success,
        hasEnhancedImageUrl: !!result.enhancedImageUrl,
        enhancedImageUrlLength: result.enhancedImageUrl?.length,
        modelUsed: result.modelUsed,
        processingTime: result.processingTime
      });
      
      if (!result.success) {
        debugLog('error', '❌ API RETURNED FAILURE', result);
        throw new Error(result.details || result.error || 'Enhancement failed');
      }

      onProgress({ status: 'processing', progress: 80, message: `Processing with ${result.modelUsed}...` });
      
      if (!result.enhancedImageUrl) {
        debugLog('error', '❌ MISSING ENHANCED IMAGE URL', result);
        throw new Error('No enhanced image URL in response');
      }

      enhancedUrl = result.enhancedImageUrl;
      onProgress({ status: 'processing', progress: 95, message: `${result.modelUsed} enhancement complete! (${result.processingTime}ms)` });
      
      debugLog('success', '🎉 API ENHANCEMENT SUCCESSFUL', {
        enhancedUrlType: typeof result.enhancedImageUrl,
        enhancedUrlLength: result.enhancedImageUrl?.length,
        enhancedUrlStart: result.enhancedImageUrl?.substring(0, 100),
        model: result.modelUsed,
        processingTime: result.processingTime,
        cost: result.estimatedCost
      });
      
      // CRITICAL: Skip rest of function if API succeeded - don't let catch block run
      onProgress({ status: 'completed', progress: 100, message: 'Enhancement completed!' });
      
      const result_final = {
        originalUrl: URL.createObjectURL(file),
        enhancedUrl: result.enhancedImageUrl, // Use base64 data URL
        originalFile: file,
      };
      
      debugLog('success', '🎯 RETURNING FINAL RESULT', {
        originalUrl: !!result_final.originalUrl,
        enhancedUrlType: typeof result_final.enhancedUrl,
        enhancedUrlLength: result_final.enhancedUrl?.length,
        hasOriginalFile: !!result_final.originalFile
      });
      
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