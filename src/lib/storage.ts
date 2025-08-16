import { supabase } from './supabase'

export const uploadToStorage = async (file: File, userId: string): Promise<string | null> => {
  try {
    const fileName = `${userId}/${Date.now()}-${file.name}`
    
    const { data, error } = await supabase.storage
      .from('images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return null
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  } catch (error) {
    console.error('Storage upload failed:', error)
    return null
  }
}

export const deleteFromStorage = async (filePath: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage
      .from('images')
      .remove([filePath])

    return !error
  } catch (error) {
    console.error('Delete failed:', error)
    return false
  }
}