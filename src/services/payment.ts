export interface PaymentData {
  planId: string;
  billing: 'monthly' | 'yearly';
  customerEmail: string;
  customerName: string;
}

export const PRICING_PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    priceMonthly: 19,
    priceYearly: 190,
    priceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_BASIC_MONTHLY,
    priceIdYearly: import.meta.env.VITE_STRIPE_PRICE_BASIC_YEARLY,
    features: [
      '150 images/month',
      '4x upscaling resolution',
      'Basic quality enhancement',
      'Email support',
      'Standard processing speed'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 37,
    priceYearly: 370,
    priceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY,
    priceIdYearly: import.meta.env.VITE_STRIPE_PRICE_PRO_YEARLY,
    features: [
      '400 images/month',
      '8x upscaling resolution',
      'Premium quality enhancement',
      'Priority support',
      'Batch processing'
    ]
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 90,
    priceYearly: 900,
    priceIdMonthly: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY,
    priceIdYearly: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_YEARLY,
    features: [
      '1,300 images/month',
      '16x upscaling resolution',
      'Ultra quality enhancement',
      '24/7 priority support',
      'API access & integrations'
    ]
  }
};

export const getPlan = (planId: string) => {
  return PRICING_PLANS[planId as keyof typeof PRICING_PLANS];
};

export const createCheckout = async (data: PaymentData) => {
  console.log('🔍 PAYMENT DEBUG - Starting checkout with data:', data);
  
  const plan = getPlan(data.planId);
  if (!plan) {
    console.error('🚨 PAYMENT ERROR - Invalid plan:', data.planId);
    throw new Error('Invalid plan');
  }
  
  console.log('🔍 PAYMENT DEBUG - Found plan:', plan);

  const priceId = data.billing === 'yearly' ? plan.priceIdYearly : plan.priceIdMonthly;
  if (!priceId) {
    console.error('🚨 PAYMENT ERROR - Price ID not configured for:', data.planId, data.billing);
    console.error('Available price IDs:', { monthly: plan.priceIdMonthly, yearly: plan.priceIdYearly });
    throw new Error('Price ID not configured');
  }
  
  console.log('🔍 PAYMENT DEBUG - Using price ID:', priceId);

  const payload = {
    priceId,
    customerEmail: data.customerEmail,
    customerName: data.customerName,
  };
  
  console.log('🔍 PAYMENT DEBUG - API payload:', payload);

  try {
    const response = await fetch('/api/stripe-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log('🔍 PAYMENT DEBUG - API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🚨 PAYMENT API ERROR:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Payment failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('🔍 PAYMENT DEBUG - API result:', result);

    if (!result.url) {
      console.error('🚨 PAYMENT ERROR - No checkout URL returned:', result);
      throw new Error('No checkout URL received');
    }

    console.log('✅ PAYMENT SUCCESS - Redirecting to:', result.url);
    window.location.href = result.url;
    
  } catch (error) {
    console.error('🚨 PAYMENT ERROR - Full error:', error);
    throw error;
  }
};