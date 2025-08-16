# 🚀 Replicate API Integration Plan for AI Image Upscaling

## Overview
This plan outlines how to integrate Replicate API for real AI image upscaling in your Enhpix application, replacing the current demo functionality with actual AI-powered image enhancement.

## Phase 1: API Setup & Configuration ⚙️

### 1.1 Get Replicate Access
```bash
# Sign up at https://replicate.com
# Get API token from dashboard
# Add to .env.local:
VITE_REPLICATE_API_TOKEN=your_token_here
```

### 1.2 Choose Best Upscaling Models
- **Real-ESRGAN** (`nightmareai/real-esrgan`) - Best for photos (4x upscaling)
- **ESRGAN** (`xinntao/realesrgan`) - General purpose upscaler  
- **Waifu2x** (`cjwbw/waifu2x`) - Excellent for anime/artwork
- **GFPGAN** (`tencentarc/gfpgan`) - Face restoration + upscaling
- **SwinIR** (`jingyunliang/swinir`) - High quality general upscaling

### 1.3 Model Mapping by Plan
```javascript
const MODEL_MAPPING = {
  trial: ['nightmareai/real-esrgan'], // Basic model only
  basic: ['nightmareai/real-esrgan', 'cjwbw/waifu2x'], 
  pro: ['nightmareai/real-esrgan', 'cjwbw/waifu2x', 'tencentarc/gfpgan', 'xinntao/realesrgan'],
  premium: ['ALL_MODELS'] // Access to all available models
};
```

## Phase 2: Backend API Integration 🔧

### 2.1 Create Image Processing Service
```typescript
// src/lib/replicate.ts
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: import.meta.env.VITE_REPLICATE_API_TOKEN,
});

export interface UpscaleOptions {
  model: string;
  scale: number;
  face_enhance?: boolean;
  codeformer_fidelity?: number;
}

export const upscaleImage = async (
  imageUrl: string, 
  options: UpscaleOptions,
  onProgress?: (progress: number) => void
) => {
  const prediction = await replicate.predictions.create({
    version: getModelVersion(options.model),
    input: {
      image: imageUrl,
      scale: options.scale,
      face_enhance: options.face_enhance || false,
      codeformer_fidelity: options.codeformer_fidelity || 0.7
    }
  });

  // Poll for completion
  return await pollPrediction(prediction.id, onProgress);
};

const pollPrediction = async (id: string, onProgress?: (progress: number) => void) => {
  let prediction = await replicate.predictions.get(id);
  
  while (prediction.status === 'starting' || prediction.status === 'processing') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    prediction = await replicate.predictions.get(id);
    
    // Estimate progress based on status
    const progress = prediction.status === 'starting' ? 10 : 50;
    onProgress?.(progress);
  }

  if (prediction.status === 'succeeded') {
    return prediction.output;
  } else {
    throw new Error(`Prediction failed: ${prediction.error}`);
  }
};
```

### 2.2 Image Upload to Cloud Storage
```typescript
// src/lib/cloudinary.ts (or AWS S3)
export const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'enhpix_uploads');
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
  
  const data = await response.json();
  return data.secure_url;
};
```

## Phase 3: Frontend Integration 🎨

### 3.1 Enhanced Image Processing Hook
```typescript
// src/hooks/useImageProcessing.ts
import { useState } from 'react';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { upscaleImage } from '@/lib/replicate';

export const useImageProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const processImage = async (
    file: File,
    model: string,
    scale: number,
    userPlan: string
  ) => {
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Upload original image
      setProgress(20);
      const imageUrl = await uploadToCloudinary(file);

      // Step 2: Process with Replicate
      setProgress(30);
      const enhancedUrl = await upscaleImage(
        imageUrl,
        { model, scale },
        (replicateProgress) => {
          setProgress(30 + (replicateProgress * 0.6)); // 30-90%
        }
      );

      setProgress(100);
      return { originalUrl: imageUrl, enhancedUrl };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return { processImage, isProcessing, progress, error };
};
```

### 3.2 Update Dashboard Processing Logic
```typescript
// In Dashboard.tsx - replace handleImageUpload
const { processImage, isProcessing, progress, error } = useImageProcessing();

const handleImageUpload = async (file: File) => {
  if (!user || availableImages <= 0) return;

  try {
    const planDetails = getPlanDetails(user.plan);
    const selectedModel = getModelForPlan(user.plan, selectedTool);
    const scale = getScaleForPlan(user.plan);

    const result = await processImage(file, selectedModel, scale, user.plan);
    
    // Update UI with results
    setPreviewUrl(result.originalUrl);
    setEnhancedUrl(result.enhancedUrl);
    setAppState('results');
    
    // Update usage
    updateUsageCount();
    
  } catch (error) {
    toast({
      title: 'Processing Failed',
      description: error.message,
      variant: 'destructive'
    });
  }
};
```

## Phase 4: Advanced Features 🚀

### 4.1 Batch Processing (Pro/Premium)
```typescript
export const processBatchImages = async (
  files: File[],
  options: BatchProcessingOptions,
  onProgress: (fileIndex: number, progress: number) => void
) => {
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    const result = await upscaleImage(
      await uploadToCloudinary(files[i]),
      options,
      (progress) => onProgress(i, progress)
    );
    results.push(result);
  }
  
  return results;
};
```

### 4.2 Custom Presets (Premium)
```typescript
const PREMIUM_PRESETS = {
  'portrait-hd': {
    model: 'tencentarc/gfpgan',
    scale: 4,
    face_enhance: true,
    codeformer_fidelity: 0.9
  },
  'anime-ultra': {
    model: 'cjwbw/waifu2x',
    scale: 4,
    noise_level: 1
  },
  'photo-restore': {
    model: 'microsoft/bringing-old-photos-back-to-life',
    scale: 4,
    scratch: true
  }
};
```

### 4.3 Processing Queue & Priority
```typescript
// Premium users get priority queue
const processWithPriority = async (request: ProcessingRequest) => {
  const priority = user.plan === 'premium' ? 'high' : 
                  user.plan === 'pro' ? 'medium' : 'low';
  
  return await queueProcessor.add(request, { priority });
};
```

## Phase 5: Cost Optimization 💰

### 5.1 Image Optimization
```typescript
const optimizeForProcessing = (file: File): File => {
  // Compress images > 2MB for faster processing
  if (file.size > 2 * 1024 * 1024) {
    return compressImage(file, 0.8);
  }
  return file;
};
```

### 5.2 Caching Strategy
```typescript
// Cache results for 24 hours to avoid reprocessing identical images
const getCachedResult = async (imageHash: string) => {
  return await redis.get(`processed:${imageHash}`);
};

const cacheResult = async (imageHash: string, result: ProcessingResult) => {
  await redis.setex(`processed:${imageHash}`, 86400, JSON.stringify(result));
};
```

### 5.3 Usage Analytics
```typescript
const trackUsage = async (userId: string, processingCost: number) => {
  await database.usage.create({
    userId,
    cost: processingCost,
    timestamp: new Date(),
    model: selectedModel
  });
};
```

## Phase 6: Error Handling & Monitoring 📊

### 6.1 Retry Logic
```typescript
const processWithRetry = async (request: ProcessingRequest, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await upscaleImage(request);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### 6.2 Rate Limiting
```typescript
const rateLimiter = {
  trial: '3/hour',
  basic: '50/hour', 
  pro: '200/hour',
  premium: '1000/hour'
};
```

## Implementation Timeline 📅

### Week 1: Setup & Basic Integration
- [ ] Replicate API setup
- [ ] Basic model integration
- [ ] Simple upscaling functionality
- [ ] Error handling

### Week 2: Advanced Features
- [ ] Multiple model support
- [ ] Progress tracking
- [ ] Plan-based restrictions
- [ ] Image optimization

### Week 3: Premium Features
- [ ] Batch processing
- [ ] Custom presets
- [ ] Priority processing
- [ ] Advanced error handling

### Week 4: Testing & Optimization
- [ ] Load testing
- [ ] Cost optimization
- [ ] Performance monitoring
- [ ] User feedback integration

## Expected Costs 💸

### Replicate Pricing (Estimated)
- **Real-ESRGAN**: ~$0.01-0.03 per image
- **GFPGAN**: ~$0.02-0.05 per image  
- **Custom models**: ~$0.05-0.10 per image

### Monthly Cost Estimates
- **Trial users**: Free (you absorb 3 images × $0.02 = $0.06 per user)
- **Basic users**: 150 × $0.02 = $3/user (charge $19, profit $16)
- **Pro users**: 400 × $0.03 = $12/user (charge $37, profit $25)
- **Premium users**: 1300 × $0.03 = $39/user (charge $90, profit $51)

## Success Metrics 📈

- **Processing speed**: < 30 seconds average
- **Success rate**: > 98%
- **User satisfaction**: > 4.5/5 stars
- **Cost efficiency**: < 30% of revenue
- **Uptime**: > 99.5%

## Next Steps 🎯

1. **Start with Phase 1**: Get Replicate API access and test basic functionality
2. **Choose 2-3 core models** initially (Real-ESRGAN + Waifu2x)
3. **Implement basic processing** with progress tracking
4. **Add plan restrictions** and usage tracking
5. **Test thoroughly** before launching to users
6. **Monitor costs closely** in first month
7. **Gather user feedback** and iterate

This plan will transform your demo app into a production-ready AI image upscaling service that can handle real users and generate revenue!