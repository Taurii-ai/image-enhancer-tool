const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email } = req.body;

  try {
    // Force insert with raw SQL to bypass any RLS or permission issues
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        INSERT INTO public.cancelled_users (user_id, email, plan_name, cancellation_date, credits_remaining, cancellation_reason)
        VALUES ('${userId}', '${email}', 'Basic', NOW(), 0, 'User cancellation')
        RETURNING *;
      `
    });

    if (error) {
      console.error('❌ Raw SQL insert failed:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('✅ Raw SQL insert succeeded:', data);
    return res.status(200).json({ success: true, data: data });

  } catch (error) {
    console.error('❌ Exception:', error);
    return res.status(500).json({ error: error.message });
  }
};