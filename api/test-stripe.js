const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'STRIPE_SECRET_KEY not found' });
    }

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    
    // Test the connection by listing products
    const products = await stripe.products.list({ limit: 1 });
    
    return res.status(200).json({
      success: true,
      message: 'Stripe connection working',
      keyType: process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'live' : 'test',
      productsFound: products.data.length
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Stripe test failed',
      message: error.message,
      type: error.type,
      code: error.code
    });
  }
}