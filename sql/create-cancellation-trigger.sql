-- SQL TRIGGER: Automatically detect when user_plans status changes to 'cancelled'
-- Run this in Supabase SQL Editor - it will auto-populate cancelled_users table

-- First ensure cancelled_users table exists
CREATE TABLE IF NOT EXISTS cancelled_users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text NOT NULL,
  plan_name text NOT NULL,
  cancellation_date timestamp with time zone DEFAULT now(),
  cancellation_reason text,
  stripe_subscription_id text,
  credits_remaining integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create trigger function that runs when user_plans is updated to 'cancelled'
CREATE OR REPLACE FUNCTION track_cancelled_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes TO 'cancelled' 
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    
    -- Get user email from auth.users
    INSERT INTO cancelled_users (
      user_id,
      email,
      plan_name,
      cancellation_date,
      stripe_subscription_id,
      credits_remaining,
      cancellation_reason
    )
    SELECT 
      NEW.user_id,
      COALESCE(au.email, 'unknown'),
      NEW.plan_name,
      NEW.cancellation_date,
      NEW.stripe_subscription_id,
      NEW.credits_remaining,
      'Auto-detected cancellation via trigger'
    FROM auth.users au 
    WHERE au.id = NEW.user_id
    ON CONFLICT (user_id) DO UPDATE SET
      cancellation_date = EXCLUDED.cancellation_date,
      cancellation_reason = EXCLUDED.cancellation_reason;
      
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on user_plans table
DROP TRIGGER IF EXISTS user_plans_cancellation_trigger ON user_plans;
CREATE TRIGGER user_plans_cancellation_trigger
  AFTER UPDATE ON user_plans
  FOR EACH ROW
  EXECUTE FUNCTION track_cancelled_user();

-- Test: Update a user to cancelled status (replace with real user_id)
-- UPDATE user_plans SET status = 'cancelled', cancellation_date = NOW() WHERE user_id = 'REPLACE_WITH_REAL_USER_ID';

-- Check if trigger worked
SELECT * FROM cancelled_users;