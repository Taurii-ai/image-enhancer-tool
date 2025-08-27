import { getCurrentPlanLimits, getUserSubscription } from './subscriptionManager';
import { recordApiUsage, MODEL_COSTS } from './costTracker';
import { trackImageEnhancement, trackApiCost } from './analytics';
import { UserService } from './userService';
import { normalizeUrl } from '@/utils/normalizeUrl';

type EnhanceResponse = { url?: string; enhancedUrl?: string } & Record<string, any>;

// Standalone function for clean API calls
export async function enhanceImageAPI(imageBase64: string, model: string): Promise<string> {
  const res = await fetch("/api/image-processing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, model }),
  });

  const ct = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!ct.includes("application/json")) {
    throw new Error(`Server returned non-JSON response: ${text || res.statusText}`);
  }

  let data: EnhanceResponse;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from server: ${text.slice(0, 140)}`);
  }

  if (!res.ok) {
    throw new Error(`Backend API failed: ${res.status} - ${data?.error || "Unknown error"}`);
  }

  console.log("🧪 Enhanced image result ::", data);
  console.log("🧪 Typeof data.url:", typeof data.url);
  console.log("🧪 Typeof data.enhancedUrl:", typeof data.enhancedUrl);

  // ✅ Robust URL validation like your working code
  if (!data?.url || typeof data.url !== "string") {
    console.error("❌ Invalid URL from backend:", data);
    throw new Error("No valid enhanced image URL returned from API");
  }

  const raw = data.url;

  // ✅ NUCLEAR DEBUG: Track where function contamination happens
  console.log("🔍 BEFORE NORMALIZE - Raw value:", typeof raw, raw);
  
  const finalUrl = normalizeUrl(raw);
  
  console.log("🔍 AFTER NORMALIZE - Final URL:", typeof finalUrl, finalUrl);
  console.log("🟢 Final usable URL:", finalUrl);
  return finalUrl;
}

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


// Model mapping with CORRECT slugs
const MODEL_MAP = {
  'general': 'jingyunliang/swinir:660d922d33153019e8c263a3bba265de882e7f4f70396546b6c9c8f9d47a021a',
  'faces': 'sczhou/codeformer:cc4956dd26fa5a7185d5660cc9100fab1b8070a1d1654a8bb5eb6d443b020bb2', 
  'anime': 'xinntao/realesrgan:1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56'
};

export const enhanceImage = async (
  file: File,
  onProgress: (progress: EnhancementProgress) => void,
  userEmail?: string,
  category: string = 'general'
): Promise<EnhancementResult> => {
  const startTime = Date.now();
  
  try {
    onProgress({ status: 'starting', progress: 0, message: 'Starting enhancement...' });
    
    let enhancedUrl: string;
    
    try {
      onProgress({ status: 'processing', progress: 10, message: 'Converting image...' });
      
      // Convert file to data URL - SIMPLE APPROACH
      const imageDataUrl = await fileToDataURL(file);
      console.log('📷 Image converted to data URL, size:', imageDataUrl.length);

      onProgress({ status: 'processing', progress: 30, message: 'Sending to enhancement model...' });
      
      // Get the model slug for the selected category
      const modelSlug = MODEL_MAP[category as keyof typeof MODEL_MAP] || MODEL_MAP.general;
      
      console.log("🔍 TESTING: Processing image for user:", "test@enhpix.com");
      console.log("📷 Image converted to data URL, size:", imageDataUrl.length);
      console.log("🤖 Using model:", modelSlug);

      onProgress({ status: 'processing', progress: 60, message: 'Real-ESRGAN processing...' });

      // Use the clean API function that always returns a normalized string
      enhancedUrl = await enhanceImageAPI(imageDataUrl, modelSlug);
      
      console.log('✅ Enhanced image URL received:', enhancedUrl);
      
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