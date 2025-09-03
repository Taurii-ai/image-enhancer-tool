const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role - maximum permissions
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ error: 'Missing userId or email' });
  }

  try {
    console.log('🎯 TRACK-CANCELLATION: Attempting to insert:', { userId, email });

    // Direct insert with minimal data - just what we need
    const { data, error } = await supabase
      .from('cancelled_users')
      .insert([
        {
          user_id: userId,
          email: email,
          plan_name: 'Basic',
          cancellation_date: new Date().toISOString(),
          credits_remaining: 0,
          cancellation_reason: 'User cancellation'
        }
      ])
      .select();

    if (error) {
      console.error('❌ TRACK-CANCELLATION: Insert failed:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message,
        details: error
      });
    }

    console.log('✅ TRACK-CANCELLATION: Successfully inserted:', data);
    return res.status(200).json({ 
      success: true, 
      message: 'User added to cancelled_users table',
      data: data 
    });

  } catch (error) {
    console.error('❌ TRACK-CANCELLATION: Exception:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error',
      details: error.message 
    });
  }
};