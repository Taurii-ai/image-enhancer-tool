# 🔑 Replicate API Setup Guide - FIXED VERSION

## Step 1: Get Your API Key

1. **Sign up**: Visit https://replicate.com/signin
2. **Add billing**: Go to https://replicate.com/account/billing and add payment method
3. **Generate API key**: Visit https://replicate.com/account/api-tokens
4. **Click "Create token"** and copy the token (starts with `r8_`)

## Step 2: Add to Your Environment

### ⚠️ IMPORTANT: Use Different Variable Names for Different Purposes

### For Local Development:
Add to your `.env` file:
```
# For serverless functions (backend)
REPLICATE_API_TOKEN=r8_your_actual_token_here

# For client-side detection (optional)
VITE_REPLICATE_API_TOKEN=r8_your_actual_token_here
```

### For Vercel Deployment:
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add **BOTH** variables:

**Variable 1 (MOST IMPORTANT):**
   - **Name**: `REPLICATE_API_TOKEN` (no VITE_ prefix)
   - **Value**: `r8_your_actual_token_here`
   - **Environment**: Production, Preview, Development

**Variable 2 (Optional):**
   - **Name**: `VITE_REPLICATE_API_TOKEN` 
   - **Value**: `r8_your_actual_token_here`
   - **Environment**: Production, Preview, Development

### 🔄 **CRITICAL: Redeploy After Adding Variables**
After adding environment variables, you MUST trigger a new deployment!

## Step 3: Test It Works

1. Deploy your changes to Vercel (or redeploy if already deployed)
2. Upload an image to your app
3. Open browser console and look for messages like:
   - `🔍 CALLING OUR API: Starting Real-ESRGAN processing...`
   - `🔍 ENHANCE API: Starting Real-ESRGAN processing...`
   - `✅ OUR API: Enhancement successful!`
   - `💰 Processing time: Xms, Cost: $0.0025`

### 🔍 **Debugging Console Messages**

**If you see:**
- `API Error: API configuration error` → Missing `REPLICATE_API_TOKEN` in Vercel
- `Invalid API token format` → Token doesn't start with `r8_`
- `CORS error` → Likely a deployment issue, redeploy
- `Fallback to demo enhancement` → API call failed, check Vercel function logs

## 💰 Cost Breakdown

- **Real-ESRGAN**: ~$0.0025 per image (0.25 cents)
- **Your pricing vs costs**:
  - Basic ($19/month, 150 images): $0.375 cost = **98% profit**
  - Pro ($37/month, 400 images): $1.00 cost = **97% profit** 
  - Premium ($90/month, 1300 images): $3.25 cost = **96% profit**

## 🚀 What Changes

**Before (Demo)**: 
- Fake enhancement with brightness/contrast
- Instant processing
- No real AI upscaling

**After (Real API)**:
- Professional Real-ESRGAN AI upscaling
- 12-15 second processing time
- Genuine 4x resolution increase
- Dramatic quality improvements

## 🔧 Troubleshooting

**If you see "Demo mode" messages:**
- Check your API key starts with `r8_`
- Verify it's added to Vercel environment variables
- Redeploy after adding the key

**If processing fails:**
- Check your Replicate account has billing set up
- Monitor usage at https://replicate.com/account
- View error logs in Vercel function logs