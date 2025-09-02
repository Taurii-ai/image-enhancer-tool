-- Create cancelled_users table to track subscription cancellations
CREATE TABLE IF NOT EXISTS cancelled_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  email TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  cancellation_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancellation_reason TEXT,
  stripe_subscription_id TEXT,
  credits_remaining INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_cancelled_users_user_id ON cancelled_users(user_id);
CREATE INDEX IF NOT EXISTS idx_cancelled_users_email ON cancelled_users(email);
CREATE INDEX IF NOT EXISTS idx_cancelled_users_date ON cancelled_users(cancellation_date);

-- Enable RLS
ALTER TABLE cancelled_users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own cancellations" ON cancelled_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all cancellations" ON cancelled_users
  FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON cancelled_users TO service_role;
GRANT SELECT ON cancelled_users TO authenticated;