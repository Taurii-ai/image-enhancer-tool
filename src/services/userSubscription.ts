import { supabase } from '@/lib/supabase';

export interface UserSubscriptionInfo {
  planName: string;
  status: string;
  imagesRemaining: number;
  imagesTotal: number;
  usagePercentage: number;
  daysRemaining: number;
  billing: string;
  features: string[];
  canUpgrade: boolean;
}

const PLAN_FEATURES = {
  free: [
    '150 images/month',
    'HD quality enhancement',
    'All category models included',
    'Email support',
    'Standard processing speed'
  ],
  basic: [
    '150 images/month',
    'HD quality enhancement',
    'All category models included',
    'Email support',
    'Standard processing speed'
  ],
  pro: [
    '400 images/month',
    'Ultra-HD quality enhancement',
    'Advanced AI model selection',
    'Priority support',
    'Batch processing'
  ],
  premium: [
    '1,300 images/month',
    'Maximum quality enhancement',
    'Fastest processing times',
    '24/7 priority support',
    'API access & integrations'
  ]
};

const PLAN_LIMITS = {
  free: 150, // For existing users with "free" plan
  basic: 150,
  pro: 400,
  premium: 1300
};

export const getUserSubscriptionInfo = async (userId: string): Promise<UserSubscriptionInfo> => {
  try {
    // Get user plan from user_plans table (primary source) - include both active and cancelled
    const { data: userPlan, error: planError } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get user profile as fallback
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Use user_plans data as primary source, fallback to profile
    let planName = 'Free';
    let billing = 'monthly';
    let features = PLAN_FEATURES.free;
    let imagesTotal = 150;

    if (userPlan) {
      // User has plan in user_plans table (active or cancelled)
      if (userPlan.status === 'cancelled') {
        planName = 'Cancelled';
        features = ['Subscription cancelled', 'Choose a new plan to continue'];
        imagesTotal = userPlan.credits_allocated || 0;
      } else {
        planName = userPlan.plan_name.charAt(0).toUpperCase() + userPlan.plan_name.slice(1);
        features = PLAN_FEATURES[userPlan.plan_name as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.basic;
        imagesTotal = userPlan.credits_allocated || PLAN_LIMITS[userPlan.plan_name as keyof typeof PLAN_LIMITS] || 150;
      }
      billing = userPlan.billing_cycle;
      console.log('📊 Using user_plans data:', userPlan);
    } else if (profile && !profileError) {
      // Fallback to profile data
      const userPlan = profile.plan || 'free';
      planName = userPlan.charAt(0).toUpperCase() + userPlan.slice(1);
      features = PLAN_FEATURES[userPlan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.free;
      imagesTotal = PLAN_LIMITS[userPlan as keyof typeof PLAN_LIMITS] || 150;
      console.log('📊 Using profile data as fallback:', profile);
      
      // For cancelled users, show they need to resubscribe
      if (userPlan === 'cancelled') {
        planName = 'Cancelled';
        features = ['Subscription cancelled', 'Choose a new plan to continue'];
        imagesTotal = 0;
      } else {
        features = PLAN_FEATURES[userPlan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.free;
        imagesTotal = PLAN_LIMITS[userPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
      }
    }

    // Get current usage
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .single();

    // Use credits_remaining from user_plans if available, otherwise calculate
    let imagesRemaining;
    if (userPlan) {
      // For cancelled users, they can use remaining credits but no more
      imagesRemaining = userPlan.status === 'cancelled' ? Math.max(0, userPlan.credits_remaining || 0) : (userPlan.credits_remaining || 0);
    } else {
      const imagesUsed = usage?.images_processed || 0;
      imagesRemaining = Math.max(0, imagesTotal - imagesUsed);
    }

    const usagePercentage = imagesTotal > 0 ? Math.round(((imagesTotal - imagesRemaining) / imagesTotal) * 100) : 0;

    // Calculate days remaining
    let daysRemaining = 30;
    if (userPlan && userPlan.subscription_end) {
      const endDate = new Date(userPlan.subscription_end);
      const diffTime = endDate.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return {
      planName,
      status: userPlan?.status || 'active',
      imagesRemaining,
      imagesTotal,
      usagePercentage,
      daysRemaining,
      billing,
      features,
      canUpgrade: planName !== 'Premium' && planName !== 'Cancelled'
    };

  } catch (error) {
    console.error('Error fetching user subscription info:', error);
    // Return default on error
    return {
      planName: 'Free',
      status: 'active',
      imagesRemaining: 150,
      imagesTotal: 150,
      usagePercentage: 0,
      daysRemaining: 30,
      billing: 'monthly',
      features: PLAN_FEATURES.free,
      canUpgrade: true
    };
  }
};

export const consumeImageCredit = async (userId: string): Promise<{ success: boolean; remaining: number; error?: string }> => {
  try {
    console.log('💳 CREDIT CONSUMPTION: Starting for user:', userId);
    
    // Get user plan from user_plans table (including cancelled plans with remaining credits)
    const { data: userPlan, error: planError } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['active', 'cancelled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    console.log('💳 CREDIT CONSUMPTION: User plan found:', userPlan);

    if (!userPlan) {
      return { 
        success: false, 
        remaining: 0, 
        error: 'No subscription found - Please choose a plan to continue' 
      };
    }

    // Check if user's subscription is cancelled but still has credits
    if (userPlan.status === 'cancelled') {
      const remainingCredits = userPlan.credits_remaining || 0;
      if (remainingCredits <= 0) {
        return { 
          success: false, 
          remaining: 0, 
          error: 'Subscription cancelled and no credits remaining - Please choose a new plan' 
        };
      }
    }

    // Check if user has remaining credits
    const currentCredits = userPlan.credits_remaining || 0;
    if (currentCredits <= 0) {
      return { 
        success: false, 
        remaining: 0, 
        error: 'No credits remaining - Your plan limit has been reached' 
      };
    }

    // Decrease credit count in user_plans table
    const newCreditsRemaining = currentCredits - 1;
    console.log(`💳 CREDIT CONSUMPTION: Updating ${currentCredits} -> ${newCreditsRemaining} for plan ID:`, userPlan.id);
    
    const { error: updateError } = await supabase
      .from('user_plans')
      .update({ 
        credits_remaining: newCreditsRemaining,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('id', userPlan.id);

    if (updateError) {
      console.error('💳 CREDIT CONSUMPTION ERROR: Failed to update user_plans credits:', updateError);
      return { success: false, remaining: currentCredits, error: 'Failed to update credits' };
    }
    
    console.log('💳 CREDIT CONSUMPTION: Successfully updated credits');

    // Also update usage_tracking table for reporting (optional - keeps historical data)
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .single();

    // Update or create usage tracking record
    await supabase
      .from('usage_tracking')
      .upsert({
        user_id: userId,
        month,
        year,
        images_processed: (usage?.images_processed || 0) + 1,
        images_limit: userPlan.credits_allocated
      }, {
        onConflict: 'user_id,month,year'
      });

    console.log(`💳 Credit consumed for user ${userId}: ${currentCredits} -> ${newCreditsRemaining}`);

    return {
      success: true,
      remaining: newCreditsRemaining
    };

  } catch (error) {
    console.error('Error consuming image credit:', error);
    return { success: false, remaining: 0, error: 'Unexpected error' };
  }
};