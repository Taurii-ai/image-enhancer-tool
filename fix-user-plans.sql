-- Quick fix to update paying customers to correct plans
-- Run this in Supabase SQL Editor to fix existing customers

-- First, let's see current state
SELECT id, email, plan, stripe_customer_id, credits_remaining 
FROM profiles 
WHERE stripe_customer_id IS NOT NULL;

-- Update users who have stripe_customer_id but are still on 'free' plan to 'basic'
-- (These are users who paid but webhook didn't update them properly)
UPDATE profiles 
SET 
  plan = 'basic',
  credits_remaining = 150,
  updated_at = NOW()
WHERE 
  stripe_customer_id IS NOT NULL 
  AND plan = 'free';

-- Show updated results
SELECT id, email, plan, stripe_customer_id, credits_remaining 
FROM profiles 
WHERE stripe_customer_id IS NOT NULL;