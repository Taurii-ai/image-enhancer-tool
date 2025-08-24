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
  
  try {
    onProgress({ status: 'starting', progress: 0, message: 'Starting enhancement...' });
    
    let enhancedUrl: string;
    
    try {
      onProgress({ status: 'processing', progress: 10, message: 'Converting image to base64...' });
      
      // Convert file to data URL for API
      const imageDataUrl = await fileToDataURL(file);
      
      onProgress({ status: 'processing', progress: 20, message: 'Sending to Real-ESRGAN...' });
      
      // Send image URL to backend (exactly as specified)
      const response = await fetch('/api/image-processing?action=enhance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageDataUrl })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Backend API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData: errorData
        });
        throw new Error(errorData.details || errorData.error || `Backend API failed: ${response.status} ${response.statusText}`);
      }

      onProgress({ status: 'processing', progress: 60, message: 'Real-ESRGAN processing...' });

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error || 'Enhancement failed');
      }

      // Handle debug response with replicateRaw
      if (result.replicateRaw) {
        console.log('🔍 DEBUG: Raw Replicate response:', result.replicateRaw);
        console.log('🔍 DEBUG: Response type:', typeof result.replicateRaw);
        console.log('🔍 DEBUG: Is Array:', Array.isArray(result.replicateRaw));
        console.log('🔍 DEBUG: Object keys:', Object.keys(result.replicateRaw));
        console.log('🔍 DEBUG: Object values:', Object.values(result.replicateRaw));
        console.log('🔍 DEBUG: JSON stringify:', JSON.stringify(result.replicateRaw));
        
        // Deep inspection of the object
        const response = result.replicateRaw;
        
        // Try multiple extraction methods
        let possibleUrl = null;
        
        // Method 1: Check if it's an array
        if (Array.isArray(response) && response.length > 0) {
          possibleUrl = response[0];
          console.log('✅ DEBUG: Method 1 - Array[0]:', possibleUrl);
        }
        // Method 2: Check if it's a direct URL string
        else if (typeof response === "string" && response.startsWith("http")) {
          possibleUrl = response;
          console.log('✅ DEBUG: Method 2 - Direct URL:', possibleUrl);
        }
        // Method 3: Check for output property
        else if (response && response.output) {
          console.log('🔍 DEBUG: Found output property:', response.output);
          if (Array.isArray(response.output)) {
            possibleUrl = response.output[0];
            console.log('✅ DEBUG: Method 3 - output[0]:', possibleUrl);
          } else {
            possibleUrl = response.output;
            console.log('✅ DEBUG: Method 3 - direct output:', possibleUrl);
          }
        }
        // Method 4: Check if it's a wrapped String object
        else if (response && typeof response === 'object') {
          console.log('🔍 DEBUG: Checking for wrapped string object...');
          
          // Try converting to string (handles String objects)
          const stringValue = String(response);
          console.log('🔍 DEBUG: String conversion result:', stringValue);
          
          if (stringValue && stringValue.startsWith('http')) {
            possibleUrl = stringValue;
            console.log('✅ DEBUG: Method 4a - String conversion:', possibleUrl);
          }
          // Try valueOf method (for String objects)
          else if (response.valueOf && typeof response.valueOf === 'function') {
            const valueOfResult = response.valueOf();
            console.log('🔍 DEBUG: valueOf result:', valueOfResult);
            if (typeof valueOfResult === 'string' && valueOfResult.startsWith('http')) {
              possibleUrl = valueOfResult;
              console.log('✅ DEBUG: Method 4b - valueOf method:', possibleUrl);
            }
          }
          // Try toString method
          else if (response.toString && typeof response.toString === 'function') {
            const toStringResult = response.toString();
            console.log('🔍 DEBUG: toString result:', toStringResult);
            if (typeof toStringResult === 'string' && toStringResult.startsWith('http')) {
              possibleUrl = toStringResult;
              console.log('✅ DEBUG: Method 4c - toString method:', possibleUrl);
            }
          }
          // Original property search as fallback
          else {
            console.log('🔍 DEBUG: Searching object properties for URLs...');
            for (const [key, value] of Object.entries(response)) {
              console.log(`🔍 DEBUG: Checking ${key}:`, value);
              if (typeof value === 'string' && value.startsWith('http')) {
                possibleUrl = value;
                console.log(`✅ DEBUG: Method 4d - Found URL in ${key}:`, possibleUrl);
                break;
              } else if (Array.isArray(value)) {
                const urlInArray = value.find(item => typeof item === 'string' && item.startsWith('http'));
                if (urlInArray) {
                  possibleUrl = urlInArray;
                  console.log(`✅ DEBUG: Method 4e - Found URL in ${key} array:`, possibleUrl);
                  break;
                }
              }
            }
          }
        }
        
        if (possibleUrl) {
          enhancedUrl = possibleUrl;
          console.log('🎉 DEBUG: Successfully extracted URL:', enhancedUrl);
        } else {
          console.error('❌ DEBUG: Could not extract URL from:', result.replicateRaw);
          console.error('❌ DEBUG: Full response structure:', JSON.stringify(result.replicateRaw, null, 2));
          throw new Error('Could not extract enhanced image URL from debug response');
        }
      } else if (!result.output) {
        throw new Error('No enhanced image URL in response');
      } else {
        // Handle normal output (when not in debug mode)
        enhancedUrl = Array.isArray(result.output) ? result.output[0] : result.output;
      }
      
      onProgress({ status: 'processing', progress: 90, message: 'Finalizing...' });
      
      const result_final = {
        originalUrl: URL.createObjectURL(file),
        enhancedUrl: enhancedUrl,
        originalFile: file,
      };
      
      onProgress({ status: 'completed', progress: 100, message: 'Enhancement completed!' });
      
      return result_final;
      
    } catch (apiError: unknown) {
      // No fallback - force real Replicate to work
      console.error('Real-ESRGAN API failed:', apiError);
      throw apiError;
    }
    
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