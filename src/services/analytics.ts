import posthog from 'posthog-js';

// Initialize PostHog
const initializePostHog = () => {
  try {
    const apiKey = import.meta.env.VITE_POSTHOG_API_KEY;
    const host = import.meta.env.VITE_POSTHOG_HOST;

    if (apiKey && host) {
      posthog.init(apiKey, {
        api_host: host,
        capture_pageview: false, // We'll handle this manually
        capture_pageleave: true,
        loaded: (posthog) => {
          console.log('PostHog loaded successfully');
        }
      });
    } else {
      console.log('PostHog not initialized - missing API key or host');
    }
  } catch (error) {
    console.error('PostHog initialization failed:', error);
  }
};

// Track events
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (posthog.__loaded) {
    posthog.capture(eventName, properties);
  }
};

// Track page views
export const trackPageView = (pageName: string, properties?: Record<string, any>) => {
  trackEvent('$pageview', {
    $current_url: window.location.href,
    page: pageName,
    ...properties
  });
};

// User identification
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  if (posthog.__loaded) {
    posthog.identify(userId, properties);
  }
};

// Track user signup
export const trackUserSignup = (method: 'email' | 'google', planId?: string) => {
  trackEvent('user_signup', {
    signup_method: method,
    plan_id: planId,
    timestamp: new Date().toISOString()
  });
};

// Track user login
export const trackUserLogin = (method: 'email' | 'google') => {
  trackEvent('user_login', {
    login_method: method,
    timestamp: new Date().toISOString()
  });
};

// Track subscription events
export const trackSubscriptionEvent = (
  event: 'subscription_started' | 'subscription_upgraded' | 'subscription_cancelled',
  planId: string,
  billingCycle: 'monthly' | 'yearly',
  amount?: number
) => {
  trackEvent(event, {
    plan_id: planId,
    billing_cycle: billingCycle,
    amount,
    timestamp: new Date().toISOString()
  });
};

// Track payment events
export const trackPaymentEvent = (
  event: 'payment_started' | 'payment_succeeded' | 'payment_failed',
  planId: string,
  amount: number,
  currency: string = 'EUR'
) => {
  trackEvent(event, {
    plan_id: planId,
    amount,
    currency,
    timestamp: new Date().toISOString()
  });
};

// Track image enhancement events
export const trackImageEnhancement = (
  quality: 'basic' | 'premium' | 'ultra',
  scale: number,
  fileSizeMB: number,
  processingTimeMs: number,
  success: boolean,
  errorMessage?: string
) => {
  trackEvent('image_enhanced', {
    quality,
    scale,
    file_size_mb: fileSizeMB,
    processing_time_ms: processingTimeMs,
    success,
    error_message: errorMessage,
    timestamp: new Date().toISOString()
  });
};

// Track API costs
export const trackApiCost = (
  quality: 'basic' | 'premium' | 'ultra',
  cost: number,
  currency: string = 'EUR'
) => {
  trackEvent('api_cost_incurred', {
    quality,
    cost,
    currency,
    timestamp: new Date().toISOString()
  });
};

// Track feature usage
export const trackFeatureUsage = (feature: string, properties?: Record<string, any>) => {
  trackEvent('feature_used', {
    feature_name: feature,
    ...properties,
    timestamp: new Date().toISOString()
  });
};

// Track conversion funnel
export const trackConversionStep = (
  step: 'landing' | 'pricing_viewed' | 'checkout_started' | 'payment_completed',
  planId?: string
) => {
  trackEvent('conversion_step', {
    funnel_step: step,
    plan_id: planId,
    timestamp: new Date().toISOString()
  });
};

// Track user retention
export const trackUserRetention = (daysActive: number, totalSessions: number) => {
  trackEvent('user_retention', {
    days_active: daysActive,
    total_sessions: totalSessions,
    timestamp: new Date().toISOString()
  });
};

// Initialize PostHog when the module loads
initializePostHog();

export default {
  trackEvent,
  trackPageView,
  identifyUser,
  trackUserSignup,
  trackUserLogin,
  trackSubscriptionEvent,
  trackPaymentEvent,
  trackImageEnhancement,
  trackApiCost,
  trackFeatureUsage,
  trackConversionStep,
  trackUserRetention
};