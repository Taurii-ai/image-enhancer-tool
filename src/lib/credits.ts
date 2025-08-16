import { supabase } from './supabase'
import type { Profile } from './supabase'

export const getUserCredits = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data?.credits_remaining || 0
  } catch (error) {
    console.error('Error fetching credits:', error)
    return 0
  }
}

export const deductCredits = async (userId: string, amount: number = 1): Promise<boolean> => {
  try {
    // Get current credits
    const currentCredits = await getUserCredits(userId)
    
    if (currentCredits < amount) {
      return false // Not enough credits
    }

    // Deduct credits
    const { error } = await supabase
      .from('profiles')
      .update({ 
        credits_remaining: currentCredits - amount,
        total_uploads: supabase.sql`total_uploads + 1`
      })
      .eq('id', userId)

    return !error
  } catch (error) {
    console.error('Error deducting credits:', error)
    return false
  }
}

export const addCredits = async (userId: string, amount: number): Promise<boolean> => {
  try {
    const currentCredits = await getUserCredits(userId)
    
    const { error } = await supabase
      .from('profiles')
      .update({ credits_remaining: currentCredits + amount })
      .eq('id', userId)

    return !error
  } catch (error) {
    console.error('Error adding credits:', error)
    return false
  }
}

export const getPlanCredits = (plan: string): number => {
  switch (plan) {
    case 'basic': return 150
    case 'pro': return 400
    case 'premium': return 1300
    default: return 3 // free plan
  }
}