-- CRITICAL: Create user_plans entry when profiles are created
-- This ensures users can log in and access dashboard after payment

-- Function to create user_plan when profile is inserted
CREATE OR REPLACE FUNCTION create_user_plan_for_profile()
RETURNS TRIGGER AS $$
DECLARE
  user_has_stripe boolean := false;
BEGIN
  -- Check if user has a Stripe customer ID (indicating they've paid)
  user_has_stripe := NEW.stripe_customer_id IS NOT NULL AND NEW.stripe_customer_id != '';
  
  -- Only create user_plan if user has paid (has stripe_customer_id)
  IF user_has_stripe THEN
    -- Check if user_plan already exists to avoid duplicates
    IF NOT EXISTS (
      SELECT 1 FROM user_plans WHERE user_id = NEW.id
    ) THEN
      -- Create basic user_plan - will be updated by Stripe webhook with correct plan
      INSERT INTO user_plans (
        user_id,
        plan_name,
        status, 
        credits_allocated,
        credits_remaining,
        billing_cycle,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        'basic', -- Default, will be updated by webhook
        'active',
        150, -- Default, will be updated by webhook  
        150, -- Default, will be updated by webhook
        'monthly',
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Created user_plan for paid user: %', NEW.email;
    END IF;
  ELSE
    RAISE NOTICE 'Skipping user_plan creation for unpaid user: %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS create_user_plan_trigger ON profiles;
CREATE TRIGGER create_user_plan_trigger
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_plan_for_profile();

-- Test query to see current state
SELECT 
  p.email,
  p.stripe_customer_id,
  up.plan_name,
  up.status,
  up.credits_allocated
FROM profiles p
LEFT JOIN user_plans up ON p.id = up.user_id
ORDER BY p.created_at DESC
LIMIT 10;