const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role for full permissions
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    user_id, 
    email, 
    plan_name, 
    stripe_subscription_id, 
    credits_remaining 
  } = req.body;

  if (!user_id || !email) {
    return res.status(400).json({ error: 'Missing required fields: user_id and email' });
  }

  try {
    console.log('📝 API: Adding user to cancelled_users table...', {
      user_id,
      email,
      plan_name,
      credits_remaining
    });

    // Insert into cancelled_users table with service role permissions
    const { data, error } = await supabase
      .from('cancelled_users')
      .insert({
        user_id,
        email,
        plan_name: plan_name || 'Unknown',
        cancellation_date: new Date().toISOString(),
        stripe_subscription_id: stripe_subscription_id || null,
        credits_remaining: credits_remaining || 0,
        cancellation_reason: 'User initiated cancellation via settings'
      })
      .select();

    if (error) {
      console.error('❌ API: Error inserting into cancelled_users:', error);
      throw error;
    }

    console.log('✅ API: Successfully added to cancelled_users table:', data);

    return res.status(200).json({
      success: true,
      message: 'User added to cancelled_users table',
      data: data
    });

  } catch (error) {
    console.error('❌ API: Failed to add cancelled user:', error);
    return res.status(500).json({ 
      error: 'Failed to add cancelled user',
      details: error.message 
    });
  }
};