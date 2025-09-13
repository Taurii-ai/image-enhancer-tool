import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    console.log('🔧 USER_PLANS PASSWORD RESET: Checking for email:', email);

    // Check if user exists in user_plans
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim())
      .single();

    if (!userProfile) {
      return res.status(404).json({ error: 'No subscription account found' });
    }

    const { data: userPlan } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', userProfile.id)
      .single();

    if (!userPlan) {
      return res.status(403).json({ error: 'Only customers with active subscriptions can reset passwords' });
    }

    console.log('✅ USER_PLANS: Found user in user_plans, creating/updating auth account...');

    // Check if auth user exists
    const { data: existingAuthUser, error: authCheckError } = await supabase.auth.admin.getUserById(userProfile.id);

    let authUserId = userProfile.id;

    if (authCheckError || !existingAuthUser.user) {
      console.log('🔧 USER_PLANS: No auth account found, creating one...');
      
      // Create auth account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.trim(),
        password: Math.random().toString(36).slice(-12),
        email_confirm: true,
        user_metadata: {
          created_from_password_reset: true
        }
      });

      if (authError) {
        console.error('❌ Error creating auth user:', authError);
        return res.status(500).json({ error: 'Could not create auth account' });
      }

      authUserId = authData.user.id;

      // Update profile to use new auth user ID
      await supabase
        .from('profiles')
        .update({ id: authUserId })
        .eq('id', userProfile.id);

      // Update user_plans to use new auth user ID
      await supabase
        .from('user_plans')
        .update({ user_id: authUserId })
        .eq('user_id', userProfile.id);

      console.log('✅ USER_PLANS: Auth account created and linked:', authUserId);
    }

    // Send password reset email
    const { error: resetError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim(),
      options: {
        redirectTo: `${process.env.VITE_APP_URL || 'https://enhpix.com'}/reset-password`
      }
    });

    if (resetError) {
      console.error('❌ Error sending password reset email:', resetError);
      return res.status(500).json({ error: 'Could not send reset email' });
    }

    console.log('✅ USER_PLANS: Password reset email sent successfully');
    return res.status(200).json({ success: true, message: 'Password reset email sent' });

  } catch (error) {
    console.error('❌ USER_PLANS PASSWORD RESET ERROR:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}