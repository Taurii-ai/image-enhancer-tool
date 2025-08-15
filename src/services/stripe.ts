import { loadStripe } from '@stripe/stripe-js';
import { trackPaymentEvent, trackConversionStep, trackSubscriptionEvent } from './analytics';

// Environment detection
const isProduction = import.meta.env.NODE_ENV === 'production';
const hasStripeKeys = !!(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY && 
                          import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY !== 'pk_live_your-stripe-key');

// Use real Stripe if keys are provided, otherwise demo mode
export const isRealStripe = hasStripeKeys;

// Initialize Stripe with publishable key
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
export const stripePromise = isRealStripe ? loadStripe(stripePublishableKey) : null;

export interface PricingPlan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  features: string[];
  imageLimit: number;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    priceMonthly: 19,
    priceYearly: 190,
    stripePriceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_BASIC_MONTHLY || 'price_basic_monthly',
    stripePriceIdYearly: import.meta.env.VITE_STRIPE_PRICE_BASIC_YEARLY || 'price_basic_yearly',
    imageLimit: 150,
    features: [
      '150 images/month',
      '4x upscaling resolution', 
      'Basic quality enhancement',
      'Email support',
      'Standard processing speed'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 37,
    priceYearly: 370,
    stripePriceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    stripePriceIdYearly: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY || 'price_pro_yearly', 
    imageLimit: 400,
    features: [
      '400 images/month',
      '8x upscaling resolution',
      'Premium quality enhancement', 
      'Priority support',
      'Batch processing'
    ]
  },
  {
    id: 'premium',
    name: 'Premium', 
    priceMonthly: 90,
    priceYearly: 900,
    stripePriceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY || 'price_premium_monthly',
    stripePriceIdYearly: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_YEARLY || 'price_premium_yearly',
    imageLimit: 1300,
    features: [
      '1,300 images/month',
      '16x upscaling resolution',
      'Ultra quality enhancement',
      '24/7 priority support', 
      'API access & integrations'
    ]
  }
];

export interface CheckoutData {
  planId: string;
  billing: 'monthly' | 'yearly';
  customerEmail?: string;
  customerName?: string;
}

// Create Stripe checkout session
export const createCheckoutSession = async (data: CheckoutData) => {
  try {
    // Find the selected plan
    const plan = PRICING_PLANS.find(p => p.id === data.planId);
    if (!plan) {
      throw new Error('Invalid plan selected');
    }

    // Get the correct price ID based on billing cycle
    const priceId = data.billing === 'yearly' 
      ? plan.stripePriceIdYearly 
      : plan.stripePriceIdMonthly;

    if (!priceId) {
      throw new Error('Price ID not configured for this plan');
    }

    if (isRealStripe) {
      // Real Stripe integration - call backend API
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const session = await response.json();
      return session;
    } else {
      // Demo mode - redirect to demo payment page to show the plan details
      const demoSessionId = 'cs_demo_' + Math.random().toString(36).substr(2, 9);
      const checkoutSession = {
        id: demoSessionId,
        url: `${window.location.origin}/demo-payment?plan=${data.planId}&billing=${data.billing}&name=${encodeURIComponent(data.customerName || '')}&email=${encodeURIComponent(data.customerEmail || '')}`,
        customer_email: data.customerEmail,
        success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/pricing`,
        mode: 'subscription',
        line_items: [{
          price: priceId,
          quantity: 1
        }]
      };

      return checkoutSession;
    }

  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new Error('Failed to create checkout session');
  }
};

// Redirect to Stripe Checkout
export const redirectToCheckout = async (checkoutData: CheckoutData) => {
  // Track checkout started
  trackConversionStep('checkout_started', checkoutData.planId);
  
  // Get plan to track amount
  const plan = getPlanById(checkoutData.planId);
  const amount = plan ? (checkoutData.billing === 'yearly' ? plan.priceYearly : plan.priceMonthly) : 0;
  trackPaymentEvent('payment_started', checkoutData.planId, amount);

  try {
    // Create checkout session
    const session = await createCheckoutSession(checkoutData);
    
    if (!isRealStripe) {
      // Demo mode - redirect to demo payment page
      window.location.href = session.url;
      return;
    }

    // Real Stripe mode - redirect directly to checkout URL  
    if (session.url) {
      window.location.href = session.url;
      return;
    }

    // Fallback: use Stripe.js redirect (if session.url not available)
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe failed to initialize');
    }

    const { error } = await stripe.redirectToCheckout({
      sessionId: session.id
    });

    if (error) {
      throw new Error(error.message);
    }

  } catch (error) {
    console.error('Checkout redirect failed:', error);
    throw error;
  }
};

// Verify payment session (for success page)
export const verifyPaymentSession = async (sessionId: string) => {
  try {
    // Demo mode - simulate successful verification
    if (sessionId.startsWith('cs_demo_') || !isRealStripe) {
      return {
        id: sessionId,
        payment_status: 'paid',
        customer: {
          email: 'demo@enhpix.com',
          name: 'Demo Customer'
        },
        subscription: {
          id: 'sub_demo_' + Math.random().toString(36).substr(2, 9),
          status: 'active'
        }
      };
    }

    // Real Stripe mode - call backend to verify session
    const response = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId })
    });

    if (!response.ok) {
      throw new Error('Payment verification failed');
    }

    return response.json();

  } catch (error) {
    console.error('Payment verification error:', error);
    throw error;
  }
};

export const getPlanById = (planId: string): PricingPlan | undefined => {
  return PRICING_PLANS.find(plan => plan.id === planId);
};