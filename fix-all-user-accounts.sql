-- Fix all user accounts that have stripe_customer_id but are stuck on 'free' plan
-- This fixes users who paid but the webhook didn't update their plan correctly

-- First, let's see which users need fixing
SELECT 
    email, 
    plan, 
    credits_remaining, 
    stripe_customer_id,
    created_at
FROM profiles 
WHERE stripe_customer_id IS NOT NULL 
AND plan = 'free';

-- Now fix all these users - set them to basic plan with correct credits
UPDATE profiles 
SET 
    plan = 'basic',
    credits_remaining = CASE 
        -- If they have more than 150 credits, keep what they have (shouldn't happen but safety check)
        WHEN credits_remaining > 150 THEN credits_remaining
        -- If they have some credits but less than 150, give them the full 150 they paid for
        ELSE 150
    END,
    updated_at = NOW()
WHERE 
    stripe_customer_id IS NOT NULL 
    AND plan = 'free';

-- Also ensure their usage tracking is correct for September 2025
INSERT INTO usage_tracking (user_id, month, year, images_processed, images_limit)
SELECT 
    p.id,
    9, -- September
    2025,
    0, -- Start with 0 processed (will be updated by actual usage)
    150 -- Basic plan limit
FROM profiles p
WHERE 
    p.stripe_customer_id IS NOT NULL 
    AND p.plan = 'basic'
ON CONFLICT (user_id, month, year) 
DO UPDATE SET 
    images_limit = 150;

-- Show the results after fixing
SELECT 
    email, 
    plan, 
    credits_remaining, 
    stripe_customer_id,
    updated_at
FROM profiles 
WHERE stripe_customer_id IS NOT NULL 
ORDER BY updated_at DESC;