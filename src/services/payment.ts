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
  const plan = getPlan(data.planId);
  if (!plan) throw new Error('Invalid plan');

  const priceId = data.billing === 'yearly' ? plan.priceIdYearly : plan.priceIdMonthly;
  if (!priceId) throw new Error('Price ID not configured');

  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      priceId,
      customerEmail: data.customerEmail,
      customerName: data.customerName,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Payment failed');
  }

  const { url } = await response.json();
  window.location.href = url;
};