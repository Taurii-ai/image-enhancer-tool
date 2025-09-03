-- Manual SQL to insert cancelled user data
-- Run this in Supabase SQL Editor when someone cancels

-- Insert specific user who cancelled
INSERT INTO cancelled_users (user_id, email, plan_name, cancellation_date, credits_remaining, cancellation_reason)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'sreeraj@algovaultai.com'),
  'sreeraj@algovaultai.com',
  'Basic',
  NOW(),
  146,
  'Manual insertion - user cancelled subscription'
);

-- OR if you know the exact user_id, use this:
-- INSERT INTO cancelled_users (user_id, email, plan_name, cancellation_date, credits_remaining, cancellation_reason)
-- VALUES (
--   'REPLACE_WITH_ACTUAL_USER_ID',
--   'sreeraj@algovaultai.com', 
--   'Basic',
--   NOW(),
--   146,
--   'Manual insertion - user cancelled subscription'
-- );

-- Check if it worked
SELECT * FROM cancelled_users WHERE email = 'sreeraj@algovaultai.com';