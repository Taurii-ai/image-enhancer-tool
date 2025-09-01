const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerId } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: 'Customer ID is required' });
  }

  try {
    console.log('Verifying customer plan for:', customerId);

    // Get customer's active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 10
    });

    if (subscriptions.data.length === 0) {
      // No active subscriptions - check if customer exists and has made purchases
      try {
        const customer = await stripe.customers.retrieve(customerId);
        console.log('Customer exists but no active subscriptions:', customer.email);
        
        // Return basic plan for customers who exist but have no active subscriptions
        // (They might have cancelled or subscription ended)
        return res.status(200).json({
          plan: 'basic',
          credits: 150,
          billing: 'monthly',
          status: 'inactive',
          note: 'Customer exists but no active subscription'
        });
      } catch (customerError) {
        console.error('Customer not found:', customerError);
        return res.status(404).json({ error: 'Customer not found in Stripe' });
      }
    }

    // Get the most recent active subscription
    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price?.id;

    if (!priceId) {
      return res.status(200).json({
        plan: 'basic',
        credits: 150,
        billing: 'monthly',
        error: 'No price ID found in subscription'
      });
    }

    // Get plan details from plan_mappings table
    const { data: planInfo, error: planError } = await supabase
      .from('plan_mappings')
      .select('*')
      .eq('stripe_price_id', priceId)
      .single();
    
    if (planError || !planInfo) {
      console.error('Unknown price ID or plan mapping error:', priceId, 'Error:', planError);
      return res.status(200).json({
        plan: 'basic',
        credits: 150,
        billing: 'monthly',
        error: 'Unknown price ID'
      });
    }

    console.log(`Customer ${customerId} verified: ${planInfo.plan_name} (${planInfo.billing_cycle})`);

    return res.status(200).json({
      plan: planInfo.plan_name,
      credits: planInfo.credits,
      billing: planInfo.billing_cycle,
      status: subscription.status,
      subscriptionId: subscription.id
    });

  } catch (error) {
    console.error('Error verifying customer plan:', error);
    return res.status(500).json({ 
      error: 'Failed to verify plan',
      details: error.message 
    });
  }
}