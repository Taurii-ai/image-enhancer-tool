-- UPGRADED TRIGGER: Maps Stripe price IDs to correct plans and credits
-- Reads actual Stripe price ID to determine exact plan and credit allocation

CREATE OR REPLACE FUNCTION create_plan_from_stripe_price()
RETURNS TRIGGER AS $$
DECLARE
  user_has_stripe boolean := false;
  subscription_record RECORD;
  plan_credits INTEGER := 150;
  plan_type TEXT := 'basic';
  billing_type TEXT := 'monthly';
BEGIN
  -- Check if user has a Stripe customer ID (indicating they've paid)
  user_has_stripe := NEW.stripe_customer_id IS NOT NULL AND NEW.stripe_customer_id != '';
  
  -- Only create user_plan if user has paid (has stripe_customer_id)
  IF user_has_stripe THEN
    -- Check if user_plan already exists to avoid duplicates
    IF NOT EXISTS (
      SELECT 1 FROM user_plans WHERE user_id = NEW.id
    ) THEN
      
      -- Get the actual subscription with Stripe price ID
      SELECT * INTO subscription_record 
      FROM subscriptions 
      WHERE user_id = NEW.id 
      AND status IN ('active', 'trialing')
      ORDER BY created_at DESC 
      LIMIT 1;
      
      -- If we found a subscription, map price ID to plan and credits
      IF FOUND THEN
        -- Map Stripe price IDs to plans and credits
        CASE subscription_record.stripe_price_id
          -- Basic Plans - LIVE KEYS
          WHEN 'price_1RveeGHUii3yXltrohFUcH0U' THEN 
            plan_type := 'basic';
            plan_credits := 150;
            billing_type := 'monthly';
          WHEN 'price_1RveewHUii3yXltr3t1YMzaT' THEN 
            plan_type := 'basic';
            plan_credits := 150;
            billing_type := 'yearly';
            
          -- Pro Plans - LIVE KEYS
          WHEN 'price_1RvefxHUii3yXltrTsTN5iQg' THEN 
            plan_type := 'pro';
            plan_credits := 400;
            billing_type := 'monthly';
          WHEN 'price_1RvegXHUii3yXltrGWxpvpZi' THEN 
            plan_type := 'pro';
            plan_credits := 400;
            billing_type := 'yearly';
            
          -- Premium Plans - LIVE KEYS
          WHEN 'price_1RvehMHUii3yXltrkzeexWpn' THEN 
            plan_type := 'premium';
            plan_credits := 1300;
            billing_type := 'monthly';
          WHEN 'price_1RvehtHUii3yXltrSSyM6wr3' THEN 
            plan_type := 'premium';
            plan_credits := 1300;
            billing_type := 'yearly';
            
          -- Fallback for unknown price IDs
          ELSE 
            plan_type := 'basic';
            plan_credits := 150;
            billing_type := 'monthly';
            RAISE NOTICE 'Unknown price ID: %, defaulting to basic', subscription_record.stripe_price_id;
        END CASE;
        
        RAISE NOTICE 'Mapped price ID % to % plan with % credits (%)', 
                     subscription_record.stripe_price_id, plan_type, plan_credits, billing_type;
      ELSE
        -- No subscription found - this shouldn't happen for paid users
        RAISE NOTICE 'No subscription found for user with stripe_customer_id, defaulting to basic';
        plan_type := 'basic';
        plan_credits := 150;
        billing_type := 'monthly';
      END IF;
      
      -- Create user_plan with exact plan details from Stripe
      INSERT INTO user_plans (
        user_id,
        plan_name,
        status, 
        credits_allocated,
        credits_remaining,
        billing_cycle,
        stripe_subscription_id,
        stripe_price_id,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        plan_type,
        'active',
        plan_credits,
        plan_credits,
        billing_type,
        COALESCE(subscription_record.stripe_subscription_id, NULL),
        COALESCE(subscription_record.stripe_price_id, NULL),
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'SUCCESS: Created % user_plan with % credits for %', plan_type, plan_credits, NEW.email;
    ELSE
      RAISE NOTICE 'User_plan already exists for user: %', NEW.email;
    END IF;
  ELSE
    RAISE NOTICE 'Skipping user_plan creation - no stripe_customer_id for: %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace existing trigger with price ID based one
DROP TRIGGER IF EXISTS create_user_plan_trigger ON profiles;
CREATE TRIGGER create_user_plan_trigger
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_plan_from_stripe_price();

-- Test query to verify correct mapping
SELECT 
  p.email,
  p.stripe_customer_id,
  s.stripe_price_id,
  s.plan_name as subscription_plan,
  up.plan_name as user_plan,
  up.credits_allocated,
  up.billing_cycle
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id AND s.status = 'active'
LEFT JOIN user_plans up ON p.id = up.user_id
WHERE p.stripe_customer_id IS NOT NULL
ORDER BY p.created_at DESC;