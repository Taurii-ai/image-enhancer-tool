const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing cancelled_users table...');

    // Try to insert a test record
    const { data, error } = await supabase
      .from('cancelled_users')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // test UUID
        email: 'test@example.com',
        plan_name: 'Pro',
        cancellation_date: new Date().toISOString(),
        stripe_subscription_id: 'sub_test123',
        credits_remaining: 350,
        cancellation_reason: 'API test insertion'
      })
      .select();

    if (error) {
      throw error;
    }

    console.log('✅ Test record inserted:', data);

    return res.status(200).json({
      success: true,
      message: 'Test record inserted successfully',
      data: data
    });

  } catch (error) {
    console.error('❌ Error testing cancelled_users table:', error);
    return res.status(500).json({ 
      error: 'Failed to test table',
      details: error.message 
    });
  }
};