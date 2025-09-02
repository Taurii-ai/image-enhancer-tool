-- Query to view all cancelled users with details
SELECT 
  cu.id,
  cu.email,
  cu.plan_name,
  cu.cancellation_date,
  cu.cancellation_reason,
  cu.credits_remaining,
  cu.stripe_subscription_id,
  up.plan_name as current_plan_name,
  up.status as current_status,
  up.credits_allocated,
  up.credits_remaining as current_credits_remaining
FROM cancelled_users cu
LEFT JOIN user_plans up ON cu.user_id = up.user_id AND up.status IN ('active', 'cancelled')
ORDER BY cu.cancellation_date DESC;

-- Count of cancellations by plan type
SELECT 
  plan_name,
  COUNT(*) as cancellation_count,
  AVG(credits_remaining) as avg_credits_remaining
FROM cancelled_users 
GROUP BY plan_name 
ORDER BY cancellation_count DESC;

-- Recent cancellations (last 30 days)
SELECT 
  email,
  plan_name,
  cancellation_date,
  credits_remaining,
  cancellation_reason
FROM cancelled_users 
WHERE cancellation_date >= NOW() - INTERVAL '30 days'
ORDER BY cancellation_date DESC;