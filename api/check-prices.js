const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    
    const priceIds = [
      'price_1RveeGHUii3yXltrohFUcH0U', // Basic Monthly
      'price_1RveewHUii3yXltr3t1YMzaT', // Basic Yearly
      'price_1RvefxHUii3yXltrTsTN5iQg', // Pro Monthly
      'price_1RvegXHUii3yXltrGWxpvpZi', // Pro Yearly
      'price_1RvehMHUii3yXltrkzeexWpn', // Premium Monthly
      'price_1RvehtHUii3yXltrSSyM6wr3'  // Premium Yearly
    ];

    const priceDetails = {};
    
    for (const priceId of priceIds) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        priceDetails[priceId] = {
          amount: price.unit_amount / 100, // Convert from cents
          currency: price.currency,
          interval: price.recurring?.interval,
          active: price.active,
          product: price.product
        };
      } catch (error) {
        priceDetails[priceId] = { error: error.message };
      }
    }

    return res.status(200).json({
      success: true,
      expectedPrices: {
        'Basic Monthly': '$19',
        'Basic Yearly': '$190', 
        'Pro Monthly': '$37',
        'Pro Yearly': '$370',
        'Premium Monthly': '$90',
        'Premium Yearly': '$900'
      },
      actualPrices: priceDetails
    });

  } catch (error) {
    return res.status(500).json({
      error: 'Failed to check prices',
      message: error.message
    });
  }
}