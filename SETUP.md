# 🚀 Enhpix Setup Guide - 15 Hour Launch

Follow these steps in order to get your AI image enhancement app live in 15 hours.

## Hour 0-2: Backend Setup ✅ COMPLETED

### 1. Supabase Setup (30 minutes)

1. Go to [supabase.com](https://supabase.com)
2. Create new project: "enhpix-prod"
3. Wait for database to initialize
4. Go to SQL Editor → New Query
5. Copy and paste all contents from `supabase-setup.sql`
6. Click "Run" to execute
7. Go to Settings → API → Copy your keys:
   - `Project URL`
   - `anon public key`
   - `service_role key` (keep secret!)

### 2. Replicate Setup (30 minutes)

1. Go to [replicate.com](https://replicate.com)
2. Sign up with GitHub
3. Go to Account → API Tokens
4. Create new token: "enhpix-prod"
5. Copy the token (starts with `r8_...`)

### 3. Environment Variables (15 minutes)

1. Copy `.env.example` to `.env.local`
2. Fill in your values:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Replicate
VITE_REPLICATE_API_TOKEN=r8_...

# Stripe (update in Hour 5-8)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (change to pk_live_ later)
STRIPE_SECRET_KEY=sk_test_... (change to sk_live_ later)
```

### 4. Install Dependencies (15 minutes)

```bash
npm install @supabase/supabase-js replicate
# OR
bun add @supabase/supabase-js replicate
```

## Hour 2-5: Core Backend Integration 🔄 IN PROGRESS

### Test the Integration

1. Start development server:
```bash
npm run dev
# OR
bun dev
```

2. Test signup flow:
   - Go to `/login`
   - Create account
   - Check Supabase dashboard → Authentication → Users
   - Check profiles table has new row

3. Test image upload:
   - Upload test image
   - Should process with Replicate
   - Check uploads table
   - Check storage bucket

## Hour 5-8: Payment Integration (NEXT)

### Stripe Production Setup
1. Go to Stripe dashboard
2. Switch to Live mode
3. Update environment variables
4. Test payment flows
5. Configure webhooks

## Hour 8-11: User System

### Dashboard Enhancement
- Usage analytics
- Credit management  
- Upload history

## Hour 11-13: Production Deployment

### Vercel Deployment
1. Connect GitHub repo
2. Add environment variables
3. Deploy
4. Test production

## Hour 13-15: Testing & Launch

### Final Checks
- End-to-end testing
- Performance optimization
- Go live! 🎉

---

## Current Status: Hour 2 ✅

**Completed:**
- ✅ Database schema created
- ✅ API functions built
- ✅ Auth system integrated  
- ✅ Image processing pipeline
- ✅ Credit system

**Next Steps:**
1. Test image upload flow
2. Fix any integration issues
3. Move to Hour 5-8: Payments

**Time Remaining: 13 hours**

Ready to make your first million? Let's keep building! 💪