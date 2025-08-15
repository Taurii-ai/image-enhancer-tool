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
    const priceId = req.query.price_id || 'price_1RwLAvHUii3yXltrKu9aReLj';
    
    console.log('🔍 Verifying price ID:', priceId);
    
    // Try to get the price
    const price = await stripe.prices.retrieve(priceId);
    
    return res.status(200).json({
      success: true,
      price: {
        id: price.id,
        amount: price.unit_amount / 100,
        currency: price.currency,
        active: price.active,
        recurring: price.recurring,
        product: price.product
      },
      message: 'Price exists and is valid'
    });

  } catch (error) {
    console.error('Price verification failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      type: error.type,
      code: error.code,
      priceId: req.query.price_id || 'price_1RwLAvHUii3yXltrKu9aReLj'
    });
  }
}