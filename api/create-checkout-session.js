const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  // Initialize Stripe inside the function to avoid import issues
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 API DEBUG - Request body:', req.body);
    console.log('🔍 API DEBUG - Environment check:', {
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      keyPrefix: process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 8) + '...' : 'MISSING'
    });
    
    const { priceId, customerEmail, customerName, successUrl, cancelUrl } = req.body;

    if (!priceId) {
      console.error('🚨 API ERROR - No price ID provided');
      return res.status(400).json({ error: 'Price ID is required' });
    }

    console.log('🔍 API DEBUG - Creating Stripe session with:', {
      priceId,
      customerEmail,
      customerName,
      successUrl,
      cancelUrl
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl || 'https://enhpix.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl || 'https://enhpix.com/pricing',
      customer_email: customerEmail,
      metadata: { customerName: customerName || '' },
    });

    console.log('✅ API DEBUG - Stripe session created successfully:', {
      sessionId: session.id,
      url: session.url
    });

    return res.status(200).json({
      id: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error('🚨 STRIPE ERROR DETAILS:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
      statusCode: error.statusCode,
      requestId: error.requestId,
      stack: error.stack
    });
    
    return res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message,
      type: error.type || 'unknown',
      code: error.code || 'unknown',
      param: error.param || 'unknown'
    });
  }
}