import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId, customerEmail, customerName } = req.body;

    console.log('Creating checkout session for:', { priceId, customerEmail, customerName });

    // Check if user already exists in our database
    let existingUser = null;
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('email', customerEmail)
        .single();
      existingUser = userData;
    } catch (error) {
      // User doesn't exist yet, which is fine
      console.log('User not found in database, will create during webhook');
    }

    // Create or get Stripe customer
    let customer;
    if (existingUser?.stripe_customer_id) {
      // Get existing customer
      customer = await stripe.customers.retrieve(existingUser.stripe_customer_id);
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: customerEmail,
        name: customerName,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing`,
      customer: customer.id,
      metadata: {
        customerName: customerName || '',
        priceId: priceId,
      },
    });

    console.log('Checkout session created:', session.id);
    res.status(200).json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: err.message });
  }
}