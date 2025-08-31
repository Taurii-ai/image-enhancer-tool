// Subscription Management Service
// Handles user plans, limits, and subscription status

export interface UserSubscription {
  id: string;
  userId: string;
  planId: 'trial' | 'basic' | 'pro' | 'premium';
  planName: string;
  status: 'active' | 'canceled' | 'expired' | 'trial';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  imagesRemaining: number;
  imagesTotal: number;
  imagesUsed: number;
  stripeSubscriptionId?: string;
  billing: 'monthly' | 'yearly';
}

export interface PlanLimits {
  imagesPerMonth: number;
  maxScale: number; // 2, 4, 8, 16
  quality: 'basic' | 'premium' | 'ultra';
  features: string[];
  priority: 'low' | 'medium' | 'high';
}

// Plan configurations matching Stripe pricing
export const PLAN_LIMITS: Record<string, PlanLimits> = {
  trial: {
    imagesPerMonth: 3,
    maxScale: 4,
    quality: 'basic',
    features: ['3 images total', 'HD quality enhancement', 'All category models included'],
    priority: 'low'
  },
  basic: {
    imagesPerMonth: 150,
    maxScale: 4,
    quality: 'basic',
    features: ['150 images/month', 'HD quality enhancement', 'All category models included', 'Email support', 'Standard processing speed'],
    priority: 'low'
  },
  pro: {
    imagesPerMonth: 400,
    maxScale: 8,
    quality: 'premium',
    features: ['400 images/month', 'Ultra-HD quality enhancement', 'Advanced AI model selection', 'Priority support', 'Batch processing'],
    priority: 'medium'
  },
  premium: {
    imagesPerMonth: 1300,
    maxScale: 16,
    quality: 'ultra',
    features: ['1,300 images/month', 'Maximum quality enhancement', 'Fastest processing times', '24/7 priority support', 'API access & integrations'],
    priority: 'high'
  }
};

// Mock user storage (in production, this would be in a database)
let currentUserSubscription: UserSubscription = {
  id: 'sub_trial_123',
  userId: 'user_123',
  planId: 'trial',
  planName: 'Free Trial',
  status: 'trial',
  currentPeriodStart: new Date(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  imagesRemaining: 3,
  imagesTotal: 3,
  imagesUsed: 0,
  billing: 'monthly'
};

// Get current user subscription
export const getUserSubscription = (): UserSubscription => {
  return { ...currentUserSubscription };
};

// Update subscription after successful payment
export const updateSubscriptionAfterPayment = (
  planId: 'basic' | 'pro' | 'premium',
  billing: 'monthly' | 'yearly',
  stripeSubscriptionId: string
): UserSubscription => {
  const planLimits = PLAN_LIMITS[planId];
  const now = new Date();
  const periodEnd = billing === 'yearly' 
    ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
    : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  currentUserSubscription = {
    ...currentUserSubscription,
    planId,
    planName: planId.charAt(0).toUpperCase() + planId.slice(1),
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    imagesRemaining: planLimits.imagesPerMonth,
    imagesTotal: planLimits.imagesPerMonth,
    imagesUsed: 0,
    stripeSubscriptionId,
    billing
  };

  // Save to localStorage for persistence (in production, save to database)
  localStorage.setItem('userSubscription', JSON.stringify(currentUserSubscription));
  
  return { ...currentUserSubscription };
};

// Use an image (decrement counter)
export const consumeImageCredit = (): { success: boolean; remaining: number; error?: string } => {
  if (currentUserSubscription.imagesRemaining <= 0) {
    return {
      success: false,
      remaining: 0,
      error: 'No images remaining in current plan'
    };
  }

  currentUserSubscription.imagesRemaining -= 1;
  currentUserSubscription.imagesUsed += 1;

  // Save to localStorage
  localStorage.setItem('userSubscription', JSON.stringify(currentUserSubscription));

  return {
    success: true,
    remaining: currentUserSubscription.imagesRemaining
  };
};

// Get plan limits for current user
export const getCurrentPlanLimits = (): PlanLimits => {
  return PLAN_LIMITS[currentUserSubscription.planId];
};

// Check if user can use specific features
export const canUseFeature = (feature: 'batch_processing' | 'priority_support' | 'api_access'): boolean => {
  const plan = currentUserSubscription.planId;
  
  switch (feature) {
    case 'batch_processing':
      return ['pro', 'premium'].includes(plan);
    case 'priority_support':
      return ['pro', 'premium'].includes(plan);
    case 'api_access':
      return plan === 'premium';
    default:
      return false;
  }
};

// Reset monthly usage (would be called by cron job in production)
export const resetMonthlyUsage = (): void => {
  if (currentUserSubscription.status === 'active') {
    const planLimits = PLAN_LIMITS[currentUserSubscription.planId];
    currentUserSubscription.imagesRemaining = planLimits.imagesPerMonth;
    currentUserSubscription.imagesUsed = 0;
    
    // Save to localStorage
    localStorage.setItem('userSubscription', JSON.stringify(currentUserSubscription));
  }
};

// Load subscription from localStorage on app start
export const loadSubscriptionFromStorage = (): void => {
  const stored = localStorage.getItem('userSubscription');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      parsed.currentPeriodStart = new Date(parsed.currentPeriodStart);
      parsed.currentPeriodEnd = new Date(parsed.currentPeriodEnd);
      currentUserSubscription = parsed;
    } catch (error) {
      console.error('Failed to load subscription from storage:', error);
    }
  }
};

// Check if subscription is expired
export const isSubscriptionExpired = (): boolean => {
  return new Date() > currentUserSubscription.currentPeriodEnd;
};

// Get days remaining in current period
export const getDaysRemaining = (): number => {
  const now = new Date();
  const end = currentUserSubscription.currentPeriodEnd;
  const diffTime = Math.abs(end.getTime() - now.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Format subscription for display
export const formatSubscriptionInfo = () => {
  const sub = currentUserSubscription;
  const planLimits = getCurrentPlanLimits();
  
  return {
    planName: sub.planName,
    status: sub.status,
    imagesRemaining: sub.imagesRemaining,
    imagesTotal: sub.imagesTotal,
    usagePercentage: Math.round((sub.imagesUsed / sub.imagesTotal) * 100),
    daysRemaining: getDaysRemaining(),
    billing: sub.billing,
    maxScale: planLimits.maxScale,
    quality: planLimits.quality,
    features: planLimits.features,
    canUpgrade: sub.planId !== 'premium'
  };
};

// Initialize subscription management
loadSubscriptionFromStorage();