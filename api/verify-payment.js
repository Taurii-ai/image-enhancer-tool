import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Return session data for frontend
    return res.status(200).json({
      id: session.id,
      payment_status: session.payment_status,
      customer: {
        id: session.customer?.id,
        email: session.customer?.email,
        name: session.customer?.name,
      },
      subscription: {
        id: session.subscription?.id,
        status: session.subscription?.status,
        current_period_end: session.subscription?.current_period_end,
        cancel_at_period_end: session.subscription?.cancel_at_period_end,
      },
      amount_total: session.amount_total,
      currency: session.currency,
    });

  } catch (error) {
    console.error('Payment verification failed:', error);
    return res.status(500).json({
      error: 'Failed to verify payment',
      message: error.message,
    });
  }
}