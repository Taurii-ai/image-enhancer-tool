# 🔑 Replicate API Setup Guide

## Step 1: Get Your API Key

1. **Sign up**: Visit https://replicate.com/signin
2. **Add billing**: Go to https://replicate.com/account/billing and add payment method
3. **Generate API key**: Visit https://replicate.com/account/api-tokens
4. **Click "Create token"** and copy the token (starts with `r8_`)

## Step 2: Add to Your Environment

### For Local Development:
Add to your `.env` file:
```
VITE_REPLICATE_API_TOKEN=r8_your_actual_token_here
```

### For Vercel Deployment:
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add new variable:
   - **Name**: `VITE_REPLICATE_API_TOKEN`
   - **Value**: `r8_your_actual_token_here`
   - **Environment**: Production (and Preview if you want)

## Step 3: Test It Works

1. Deploy your changes to Vercel
2. Upload an image to your app
3. Look for console messages like:
   - `🔍 REAL API: Starting Real-ESRGAN processing...`
   - `✅ REAL API: Enhancement successful!`
   - `💰 API Cost: ~$0.0025 for 4x upscaling`

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