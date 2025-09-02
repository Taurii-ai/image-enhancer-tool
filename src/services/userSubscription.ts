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
    // Get user plan from user_plans table (primary source)
    const { data: userPlan, error: planError } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
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
      // User has active plan in user_plans table
      planName = userPlan.plan_name.charAt(0).toUpperCase() + userPlan.plan_name.slice(1);
      billing = userPlan.billing_cycle;
      features = PLAN_FEATURES[userPlan.plan_name as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.basic;
      imagesTotal = userPlan.credits_allocated || PLAN_LIMITS[userPlan.plan_name as keyof typeof PLAN_LIMITS] || 150;
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
      imagesRemaining = userPlan.credits_remaining || 0;
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
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // First get user profile to determine their plan limit
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return { success: false, remaining: 0, error: 'User profile not found' };
    }

    // Check if user's subscription is cancelled
    if (profile.plan === 'cancelled') {
      return { 
        success: false, 
        remaining: 0, 
        error: 'Subscription cancelled - Please choose a new plan to continue' 
      };
    }

    // Determine limit based on user's plan
    const userPlan = profile.plan || 'free';
    const planLimit = PLAN_LIMITS[userPlan as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;

    // Get current usage
    const { data: usage, error: getError } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .single();

    // If no usage record exists, create one
    if (getError && getError.code === 'PGRST116') {
      // No usage record for this month, create initial record
      const { error: createError } = await supabase
        .from('usage_tracking')
        .insert({
          user_id: userId,
          month,
          year,
          images_processed: 1,
          images_limit: planLimit
        });

      if (createError) {
        return { success: false, remaining: 0, error: 'Failed to create usage record' };
      }

      return {
        success: true,
        remaining: planLimit - 1
      };
    }

    if (getError) {
      return { success: false, remaining: 0, error: 'Failed to check usage' };
    }

    const currentUsage = usage?.images_processed || 0;
    const limit = usage?.images_limit || planLimit;

    if (currentUsage >= limit) {
      return { 
        success: false, 
        remaining: 0, 
        error: 'Monthly limit reached' 
      };
    }

    // Update usage
    const { error: updateError } = await supabase
      .from('usage_tracking')
      .upsert({
        user_id: userId,
        month,
        year,
        images_processed: currentUsage + 1,
        images_limit: limit
      }, {
        onConflict: 'user_id,month,year'
      });

    if (updateError) {
      return { success: false, remaining: 0, error: 'Failed to update usage' };
    }

    return {
      success: true,
      remaining: limit - (currentUsage + 1)
    };

  } catch (error) {
    console.error('Error consuming image credit:', error);
    return { success: false, remaining: 0, error: 'Unexpected error' };
  }
};