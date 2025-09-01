-- INTELLIGENT PLAN DETECTION AND CORRECTION
-- This detects what users actually paid for from their Stripe subscription
-- and gives them the correct plan (basic/pro/premium) with correct credits (150/400/1300)

-- First, let's see all users with stripe_customer_id and their current status
SELECT 
    p.email, 
    p.plan as current_plan, 
    p.credits_remaining as current_credits, 
    p.stripe_customer_id,
    s.plan_name as subscription_plan,
    s.stripe_price_id,
    s.status as subscription_status
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id AND s.status = 'active'
WHERE p.stripe_customer_id IS NOT NULL
ORDER BY p.email;

-- Now fix users according to their actual Stripe subscription
-- Update profiles to match their actual paid subscription plan
UPDATE profiles 
SET 
    plan = CASE 
        -- Match subscription plan_name to correct plan
        WHEN s.plan_name = 'basic' THEN 'basic'
        WHEN s.plan_name = 'pro' THEN 'pro' 
        WHEN s.plan_name = 'premium' THEN 'premium'
        -- Fallback: detect by price ID if plan_name is missing
        WHEN s.stripe_price_id IN ('price_1RwL8qHUii3yXltr3wWqsPNo', 'price_1RwL9PHUii3yXltrLvMcLtWe') THEN 'basic'
        WHEN s.stripe_price_id IN ('price_1RwLAvHUii3yXltrKu9aReLj', 'price_1RwLByHUii3yXltrLgjEyTLH') THEN 'pro'
        WHEN s.stripe_price_id IN ('price_1RwLDhHUii3yXltrWdHdqqOB', 'price_1RwLEHHUii3yXltrdCIWUMZa') THEN 'premium'
        -- If no active subscription found, default to basic (they paid something)
        ELSE 'basic'
    END,
    credits_remaining = CASE 
        -- Assign correct credits for each plan
        WHEN s.plan_name = 'basic' OR s.stripe_price_id IN ('price_1RwL8qHUii3yXltr3wWqsPNo', 'price_1RwL9PHUii3yXltrLvMcLtWe') THEN 150
        WHEN s.plan_name = 'pro' OR s.stripe_price_id IN ('price_1RwLAvHUii3yXltrKu9aReLj', 'price_1RwLByHUii3yXltrLgjEyTLH') THEN 400
        WHEN s.plan_name = 'premium' OR s.stripe_price_id IN ('price_1RwLDhHUii3yXltrWdHdqqOB', 'price_1RwLEHHUii3yXltrdCIWUMZa') THEN 1300
        -- Default to basic credits
        ELSE 150
    END,
    updated_at = NOW()
FROM subscriptions s
WHERE profiles.id = s.user_id 
AND s.status = 'active'
AND profiles.stripe_customer_id IS NOT NULL;

-- For users with stripe_customer_id but NO active subscription record 
-- (they paid but subscription wasn't created properly) - default to basic
UPDATE profiles 
SET 
    plan = 'basic',
    credits_remaining = 150,
    updated_at = NOW()
WHERE 
    stripe_customer_id IS NOT NULL 
    AND plan = 'free'
    AND id NOT IN (
        SELECT user_id FROM subscriptions WHERE status = 'active'
    );

-- Update usage tracking with correct limits for ALL paid users
INSERT INTO usage_tracking (user_id, month, year, images_processed, images_limit)
SELECT 
    p.id,
    9, -- September
    2025,
    COALESCE(ut.images_processed, 0), -- Keep existing usage
    CASE p.plan
        WHEN 'basic' THEN 150
        WHEN 'pro' THEN 400  
        WHEN 'premium' THEN 1300
        ELSE 150
    END
FROM profiles p
LEFT JOIN usage_tracking ut ON p.id = ut.user_id AND ut.month = 9 AND ut.year = 2025
WHERE p.stripe_customer_id IS NOT NULL
ON CONFLICT (user_id, month, year) 
DO UPDATE SET 
    images_limit = CASE 
        WHEN EXCLUDED.images_limit = 150 THEN 150  -- basic
        WHEN EXCLUDED.images_limit = 400 THEN 400  -- pro
        WHEN EXCLUDED.images_limit = 1300 THEN 1300 -- premium
        ELSE 150
    END;

-- VERIFICATION: Show final results for all paid users
SELECT 
    p.email, 
    p.plan, 
    p.credits_remaining, 
    p.stripe_customer_id,
    s.plan_name as stripe_plan,
    s.stripe_price_id,
    ut.images_limit as usage_limit,
    ut.images_processed as images_used,
    p.updated_at
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id AND s.status = 'active'
LEFT JOIN usage_tracking ut ON p.id = ut.user_id AND ut.month = 9 AND ut.year = 2025
WHERE p.stripe_customer_id IS NOT NULL
ORDER BY p.plan, p.email;

-- SUMMARY: Count users by plan
SELECT 
    plan,
    COUNT(*) as user_count,
    AVG(credits_remaining) as avg_credits
FROM profiles 
WHERE stripe_customer_id IS NOT NULL 
GROUP BY plan
ORDER BY plan;