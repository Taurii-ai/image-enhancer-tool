import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription']
    });

    res.status(200).json({
      id: session.id,
      payment_status: session.payment_status,
      customer: session.customer,
      subscription: session.subscription
    });
  } catch (err) {
    console.error('Payment verification error:', err);
    res.status(500).json({ error: err.message });
  }
}