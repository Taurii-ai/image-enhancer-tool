-- Fix existing customers: add stripe_customer_id to profiles based on subscriptions
UPDATE profiles 
SET stripe_customer_id = (
  SELECT DISTINCT s.stripe_customer_id 
  FROM subscriptions s 
  WHERE s.user_id = profiles.id 
  LIMIT 1
)
WHERE profiles.id IN (
  SELECT DISTINCT user_id 
  FROM subscriptions 
  WHERE stripe_customer_id IS NOT NULL
);

-- Verify the update
SELECT 
  p.id,
  p.email, 
  p.stripe_customer_id,
  s.stripe_customer_id as sub_customer_id,
  s.plan_name
FROM profiles p
LEFT JOIN subscriptions s ON p.id = s.user_id
WHERE p.stripe_customer_id IS NOT NULL
ORDER BY p.created_at DESC;