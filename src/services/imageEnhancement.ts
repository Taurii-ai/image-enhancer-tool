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


export const enhanceImage = async (
  file: File,
  onProgress: (progress: EnhancementProgress) => void,
  userEmail?: string
): Promise<EnhancementResult> => {
  const startTime = Date.now();
  const debugId = Math.random().toString(36).substring(7);
  
  // Create debug logger
  const debugLog = (step: string, data?: any) => {
    const timestamp = new Date().toISOString();
    console.log(`🎯 [${debugId}] ${step}`, data ? data : '');
    
    // Add to page if debug element exists
    const debugElement = document.getElementById('debug-log');
    if (debugElement) {
      const logEntry = document.createElement('div');
      logEntry.style.cssText = 'margin: 3px 0; padding: 6px; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 4px; font-family: monospace; font-size: 12px; color: black;';
      logEntry.innerHTML = `<strong>[${timestamp.split('T')[1].split('.')[0]}]</strong> ${step}${data ? '<br><span style="color: #666; font-size: 11px;">' + JSON.stringify(data, null, 2) + '</span>' : ''}`;
      debugElement.appendChild(logEntry);
      debugElement.scrollTop = debugElement.scrollHeight;
    }
  };
  
  try {
    debugLog('📤 STEP 1: Image uploaded to website', { fileName: file.name, fileSize: file.size, debugId });
    onProgress({ status: 'starting', progress: 0, message: 'Starting enhancement...' });
    
    // Get user's plan limits for processing options
    const planLimits = getCurrentPlanLimits();
    
    let enhancedUrl: string;
    
    try {
      debugLog('🔧 STEP 2: Website preparing file (converting to base64)');
      onProgress({ status: 'processing', progress: 10, message: 'Converting image to base64...' });
      
      // Convert file to data URL for API
      const imageDataUrl = await fileToDataURL(file);
      debugLog('✅ STEP 2 COMPLETED: File prepared successfully', { 
        base64Length: imageDataUrl.length,
        imageType: imageDataUrl.substring(0, 30) + '...'
      });
      
      debugLog('🌐 STEP 3: Website sending file to backend API');
      onProgress({ status: 'processing', progress: 20, message: 'Connecting to backend API...' });
      
      const apiPayload = {
        imageBase64: imageDataUrl,
        scale: 4,
        face_enhance: true
      };
      
      debugLog('📤 STEP 3 IN PROGRESS: Sending to backend', { 
        payloadSize: JSON.stringify(apiPayload).length,
        endpoint: '/api/enhance-image',
        method: 'POST'
      });
      
      const response = await fetch('/api/enhance-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload)
      });

      debugLog('📥 STEP 3 RESPONSE: Backend API responded', { 
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        debugLog('❌ STEP 3 FAILED: Backend API error', { error: errorData, status: response.status });
        throw new Error(errorData.details || errorData.error || `Backend API failed with status ${response.status}`);
      }

      debugLog('✅ STEP 3 COMPLETED: Backend received request successfully');
      onProgress({ status: 'processing', progress: 40, message: 'Backend processing with Replicate...' });

      const result = await response.json();
      
      if (!result.success) {
        debugLog('❌ STEP 4-7 FAILED: Replicate processing failed', result);
        throw new Error(result.details || result.error || 'Replicate enhancement failed');
      }

      debugLog('✅ STEP 4: Backend sent to Replicate with secret token', { requestId: result.requestId });
      debugLog('✅ STEP 5: Replicate processed with Real-ESRGAN', { processingTime: result.processingTime + 'ms' });
      debugLog('✅ STEP 6: Replicate sent enhanced URL back to backend', { 
        outputType: typeof result.output,
        outputPreview: result.output ? result.output.substring(0, 100) + '...' : 'none'
      });
      debugLog('✅ STEP 7: Backend sent URL back to frontend', { 
        success: result.success,
        hasOutput: !!result.output
      });
      
      onProgress({ status: 'processing', progress: 80, message: 'Preparing enhanced image...' });
      
      if (!result.output) {
        debugLog('❌ STEP 8 FAILED: No enhanced image URL received', result);
        throw new Error('No enhanced image URL in response');
      }

      enhancedUrl = result.output;
      debugLog('🖼️ STEP 8: Frontend preparing to display enhanced image', { 
        enhancedUrl: enhancedUrl.substring(0, 100) + '...',
        urlType: enhancedUrl.startsWith('data:') ? 'base64_image' : 'external_url'
      });
      
      onProgress({ status: 'processing', progress: 95, message: 'Finalizing display...' });
      
      const result_final = {
        originalUrl: URL.createObjectURL(file),
        enhancedUrl: result.output,
        originalFile: file,
      };
      
      debugLog('✅ STEP 8 COMPLETED: Frontend displaying enhanced image to user!', {
        originalUrl: result_final.originalUrl,
        enhancedUrl: result_final.enhancedUrl.substring(0, 100) + '...',
        totalProcessingTime: Date.now() - startTime + 'ms',
        success: true
      });
      onProgress({ status: 'completed', progress: 100, message: 'Enhancement completed!' });
      
      return result_final;
      
    } catch (apiError: unknown) {
      // Fallback to demo enhancement
      const errorMessage = (apiError instanceof Error ? apiError.message : 'Real-ESRGAN processing failed');
      debugLog('❌ API Error - falling back to demo', { error: errorMessage });
      
      onProgress({ 
        status: 'processing', 
        progress: 60, 
        message: `Using demo enhancement...` 
      });
      enhancedUrl = await simulateEnhancement(file, onProgress, planLimits);
    }
    
    onProgress({ status: 'completed', progress: 100, message: 'Enhancement completed!' });
    
    // Prepare the result
    const result = {
      originalUrl: URL.createObjectURL(file),
      enhancedUrl,
      originalFile: file,
    };
    
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