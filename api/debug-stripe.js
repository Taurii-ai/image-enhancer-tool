module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test Stripe initialization
    const Stripe = require('stripe');
    
    const debug = {
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyLength: process.env.STRIPE_SECRET_KEY?.length || 0,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 15) || 'NOT_SET',
      nodeVersion: process.version,
      availableEnvVars: Object.keys(process.env).filter(key => key.includes('STRIPE')),
      timestamp: new Date().toISOString()
    };

    // Try to initialize Stripe
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
        debug.stripeInitialized = true;
        
        // Test a simple API call
        const prices = await stripe.prices.list({ limit: 1 });
        debug.stripeAPIWorking = true;
        debug.priceCount = prices.data.length;
      } catch (stripeError) {
        debug.stripeInitialized = false;
        debug.stripeError = stripeError.message;
      }
    } else {
      debug.stripeInitialized = false;
      debug.error = 'STRIPE_SECRET_KEY not found in environment';
    }

    return res.status(200).json(debug);
  } catch (error) {
    return res.status(500).json({
      error: 'Debug endpoint failed',
      message: error.message
    });
  }
};