// Simplified analytics stubs to prevent import errors

export const trackPaymentEvent = (event: string, planId: string, amount: number) => {
  console.log('Payment event:', event, planId, amount);
};

export const trackConversionStep = (step: string, planId: string) => {
  console.log('Conversion step:', step, planId);
};

export const trackSubscriptionEvent = (event: string, data: any) => {
  console.log('Subscription event:', event, data);
};

export const initializePostHog = () => {
  console.log('Analytics initialized (stub)');
};