import { supabase } from './supabase'
import { uploadToStorage } from './storage'
import { deductCredits, getUserCredits } from './credits'
import type { Upload } from './supabase'

export interface ProcessImageRequest {
  file: File
  userId: string
  plan: string
}

export interface ProcessImageResponse {
  success: boolean
  uploadId?: string
  enhancedUrl?: string
  error?: string
}

export const processImage = async (request: ProcessImageRequest): Promise<ProcessImageResponse> => {
  const { file, userId, plan } = request

  try {
    // 1. Check if user has credits
    const credits = await getUserCredits(userId)
    if (credits <= 0) {
      return {
        success: false,
        error: 'No credits remaining. Please upgrade your plan.'
      }
    }

    // 2. Upload original image to storage
    const originalUrl = await uploadToStorage(file, userId)
    if (!originalUrl) {
      return {
        success: false,
        error: 'Failed to upload image to storage'
      }
    }

    // 3. Create upload record
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        user_id: userId,
        original_filename: file.name,
        original_url: originalUrl,
        status: 'processing'
      })
      .select()
      .single()

    if (uploadError || !upload) {
      return {
        success: false,
        error: 'Failed to create upload record'
      }
    }

    // 4. Deduct credits immediately
    const creditDeducted = await deductCredits(userId)
    if (!creditDeducted) {
      return {
        success: false,
        error: 'Failed to deduct credits'
      }
    }

    // 5. Enhance image via backend API (never call Replicate directly)
    const response = await fetch('/api/enhance-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: originalUrl })
    });

    if (!response.ok) {
      // Update status to failed
      await supabase
        .from('uploads')
        .update({ status: 'failed' })
        .eq('id', upload.id)

      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || 'Image enhancement failed'
      }
    }

    const result = await response.json();
    
    if (result.error || !result.output) {
      // Update status to failed
      await supabase
        .from('uploads')
        .update({ status: 'failed' })
        .eq('id', upload.id)

      return {
        success: false,
        error: result.error || 'Image enhancement failed'
      }
    }

    const enhancedUrl = Array.isArray(result.output) ? result.output[0] : result.output;

    // 6. Update upload record with enhanced URL
    await supabase
      .from('uploads')
      .update({ 
        enhanced_url: enhancedUrl,
        status: 'completed'
      })
      .eq('id', upload.id)

    return {
      success: true,
      uploadId: upload.id,
      enhancedUrl: enhancedUrl
    }

  } catch (error) {
    console.error('Process image error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export const getUserUploads = async (userId: string): Promise<Upload[]> => {
  try {
    const { data, error } = await supabase
      .from('uploads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching uploads:', error)
    return []
  }
}

function getScaleForPlan(plan: string): number {
  switch (plan) {
    case 'premium': return 16
    case 'pro': return 8
    case 'basic': return 4
    default: return 4
  }
}

function getModelForPlan(plan: string): 'basic' | 'premium' | 'ultra' {
  switch (plan) {
    case 'premium': return 'ultra'
    case 'pro': return 'premium'
    default: return 'basic'
  }
}