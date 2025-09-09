-- SMART TRIGGER: Creates correct plan based on Stripe subscription data
-- This reads the actual subscription to determine Basic/Pro/Premium and correct credits

CREATE OR REPLACE FUNCTION create_correct_user_plan()
RETURNS TRIGGER AS $$
DECLARE
  user_has_stripe boolean := false;
  subscription_record RECORD;
  plan_credits INTEGER := 150;
  plan_type TEXT := 'basic';
BEGIN
  -- Check if user has a Stripe customer ID (indicating they've paid)
  user_has_stripe := NEW.stripe_customer_id IS NOT NULL AND NEW.stripe_customer_id != '';
  
  -- Only create user_plan if user has paid (has stripe_customer_id)
  IF user_has_stripe THEN
    -- Check if user_plan already exists to avoid duplicates
    IF NOT EXISTS (
      SELECT 1 FROM user_plans WHERE user_id = NEW.id
    ) THEN
      
      -- Try to get the actual subscription details from subscriptions table
      SELECT * INTO subscription_record 
      FROM subscriptions 
      WHERE user_id = NEW.id 
      AND status = 'active' 
      ORDER BY created_at DESC 
      LIMIT 1;
      
      -- If we found a subscription, use its plan details
      IF FOUND THEN
        plan_type := subscription_record.plan_name;
        
        -- Set correct credits based on plan
        CASE subscription_record.plan_name
          WHEN 'basic' THEN plan_credits := 150;
          WHEN 'pro' THEN plan_credits := 400;
          WHEN 'premium' THEN plan_credits := 1300;
          ELSE plan_credits := 150; -- fallback
        END CASE;
        
        RAISE NOTICE 'Found subscription: % plan with % credits', plan_type, plan_credits;
      ELSE
        -- Fallback: try to determine from other sources or default to basic
        RAISE NOTICE 'No subscription found, defaulting to basic plan';
        plan_type := 'basic';
        plan_credits := 150;
      END IF;
      
      -- Create user_plan with correct details
      INSERT INTO user_plans (
        user_id,
        plan_name,
        status, 
        credits_allocated,
        credits_remaining,
        billing_cycle,
        stripe_subscription_id,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        plan_type,
        'active',
        plan_credits,
        plan_credits,
        COALESCE(subscription_record.billing_cycle, 'monthly'),
        COALESCE(subscription_record.stripe_subscription_id, NULL),
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Created % user_plan with % credits for user: %', plan_type, plan_credits, NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the old trigger with the smart one
DROP TRIGGER IF EXISTS create_user_plan_trigger ON profiles;
CREATE TRIGGER create_user_plan_trigger
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_correct_user_plan();