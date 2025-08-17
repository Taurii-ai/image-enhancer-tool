import Replicate from 'replicate'

const replicate = new Replicate({
  auth: import.meta.env.VITE_REPLICATE_API_TOKEN || '',
})

export interface EnhancementOptions {
  scale: number // 2, 4, 8, 16
  model: 'basic' | 'premium' | 'ultra'
  imageType?: 'universal' | 'photo' | 'artwork' | 'logo'
  userPlan?: 'trial' | 'basic' | 'pro' | 'premium'
}

export interface ProcessingResult {
  success: boolean
  enhancedUrl?: string
  originalUrl?: string
  processingTime?: number
  model?: string
  error?: string
}

// Model configurations for different plans
export const MODEL_CONFIGS = {
  trial: {
    models: ['xinntao/realesrgan'],
    maxScale: 4,
    priority: 'low'
  },
  basic: {
    models: ['xinntao/realesrgan'],
    maxScale: 4,
    priority: 'low'
  },
  pro: {
    models: ['xinntao/realesrgan'],
    maxScale: 8,
    priority: 'medium'
  },
  premium: {
    models: ['xinntao/realesrgan'],
    maxScale: 16,
    priority: 'high'
  }
}

// Enhanced image processing with progress tracking
export const enhanceImage = async (
  imageUrl: string, 
  options: EnhancementOptions,
  onProgress?: (progress: number) => void
): Promise<ProcessingResult> => {
  const startTime = Date.now()
  
  try {
    onProgress?.(10) // Starting
    
    // Get optimal model for image type and plan
    const modelName = getOptimalModel(options.imageType || 'universal', options.userPlan || 'trial')
    const modelVersion = getModelVersion(modelName)
    
    onProgress?.(20) // Model selected
    
    // Create prediction with progress tracking
    const input = modelName === 'xinntao/realesrgan' ? {
      img: imageUrl,
      scale: options.scale,
      version: options.imageType === 'artwork' ? 'Anime - anime6B' : 'General - v3',
      face_enhance: options.imageType === 'photo'
    } : {
      image: imageUrl,
      scale: options.scale,
    }
    
    const prediction = await replicate.predictions.create({
      version: modelVersion,
      input
    })

    onProgress?.(30) // Prediction created

    // Poll for completion with progress updates
    const result = await pollPrediction(prediction.id, (progress) => {
      onProgress?.(30 + (progress * 0.6)) // 30-90%
    })

    onProgress?.(100) // Complete
    
    const processingTime = Date.now() - startTime
    
    return {
      success: true,
      enhancedUrl: Array.isArray(result) ? result[0] : result,
      originalUrl: imageUrl,
      processingTime,
      model: modelName
    }
  } catch (error) {
    console.error('Replicate enhancement failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      originalUrl: imageUrl
    }
  }
}

// Get optimal model based on image type and user plan
const getOptimalModel = (imageType: string, userPlan: string): string => {
  // Always use xinntao/realesrgan as it's the official implementation
  return 'xinntao/realesrgan'
}

// Poll prediction status with progress tracking
const pollPrediction = async (id: string, onProgress?: (progress: number) => void): Promise<any> => {
  let prediction = await replicate.predictions.get(id)
  let attempts = 0
  
  while (prediction.status === 'starting' || prediction.status === 'processing') {
    await new Promise(resolve => setTimeout(resolve, 1000))
    prediction = await replicate.predictions.get(id)
    attempts++
    
    // Estimate progress based on status and time elapsed
    const progress = prediction.status === 'starting' ? 
      Math.min(10 + attempts * 2, 30) : // 10-30% for starting
      Math.min(30 + attempts * 3, 90)   // 30-90% for processing
    
    onProgress?.(progress)
    
    // Timeout after 5 minutes
    if (attempts > 300) {
      throw new Error('Processing timeout - please try again')
    }
  }

  if (prediction.status === 'succeeded') {
    return prediction.output
  } else {
    throw new Error(`Prediction failed: ${prediction.error || 'Unknown error'}`)
  }
}

// Batch processing for Pro/Premium users
export const processBatchImages = async (
  imageUrls: string[],
  options: EnhancementOptions,
  onProgress?: (fileIndex: number, progress: number) => void
): Promise<ProcessingResult[]> => {
  const results: ProcessingResult[] = []
  
  for (let i = 0; i < imageUrls.length; i++) {
    try {
      const result = await enhanceImage(
        imageUrls[i],
        options,
        (progress) => onProgress?.(i, progress)
      )
      results.push(result)
    } catch (error) {
      console.error(`Failed to process image ${i + 1}:`, error)
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        originalUrl: imageUrls[i]
      })
    }
  }
  
  return results
}

// Model version mapping (updated with actual Replicate model versions)
function getModelVersion(modelName: string): string {
  const versions = {
    'nightmareai/real-esrgan': '42fed1c4974146d4d2414e2be2c5277c7fcf05fcc972f1a6c68ad1d9f7a55dc2',
    'xinntao/realesrgan': '1f94cf24571d33eff56cacaa0e74f12a74e3f0ae03d7af22c7d5f72b6d0f5937',
    'cjwbw/waifu2x': '25c54b7f1eed87a1e5e8ae7d4eaae73a49ec0fafebdab0a8a3ecb4f0b97bd78a',
    'tencentarc/gfpgan': '9283608cc6b7be6b65a8e44983db012355fde4132009bf99d976b2f0896856a3'
  }
  
  return versions[modelName as keyof typeof versions] || versions['nightmareai/real-esrgan']
}

// Legacy function for backward compatibility
export const enhanceImageLegacy = async (imageUrl: string, options: EnhancementOptions) => {
  return enhanceImage(imageUrl, options)
}

// Check if Replicate is available and configured
export const isReplicateAvailable = (): boolean => {
  return !!import.meta.env.VITE_REPLICATE_API_TOKEN
}

// Estimate processing cost (for internal tracking)
export const estimateProcessingCost = (imageCount: number, model: string): number => {
  // xinntao/realesrgan official model cost
  return imageCount * 0.03
}

export default replicate