const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { subscriptionId, userId } = req.body;

  if (!subscriptionId || !userId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    console.log('🚫 Attempting to cancel subscription:', subscriptionId, 'for user:', userId);

    // Cancel the subscription at the end of the current period
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });

    console.log('✅ Stripe subscription cancelled at period end:', subscription.id);

    // Update user_plans table to reflect cancelled status but keep it active until period ends
    const { error: updateError } = await supabase
      .from('user_plans')
      .update({
        status: 'cancelled',
        cancellation_date: new Date().toISOString(),
        will_cancel_at: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ Error updating user_plans:', updateError);
      return res.status(500).json({ error: 'Failed to update user plan status' });
    }

    // Also update profiles for backwards compatibility
    await supabase
      .from('profiles')
      .update({
        plan: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    return res.status(200).json({
      success: true,
      message: 'Subscription cancelled successfully',
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: subscription.current_period_end
    });

  } catch (error) {
    console.error('❌ Error cancelling subscription:', error);
    
    if (error.code === 'resource_missing') {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    return res.status(500).json({ 
      error: 'Failed to cancel subscription',
      details: error.message 
    });
  }
};