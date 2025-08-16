# 🚀 Quick Replicate Setup Guide

## Step 1: Get Replicate API Token (5 minutes)

1. Go to [replicate.com](https://replicate.com)
2. Sign up for free account
3. Go to Account Settings → API Tokens
4. Create new token
5. Add to your `.env.local`:

```bash
VITE_REPLICATE_API_TOKEN=r8_your_token_here
```

## Step 2: Optional - Cloudinary for Image Upload (5 minutes)

1. Sign up at [cloudinary.com](https://cloudinary.com) (free)
2. Get your cloud name from dashboard
3. Create upload preset:
   - Go to Settings → Upload
   - Add upload preset named `enhpix_uploads`
   - Set to "Unsigned"
4. Add to `.env.local`:

```bash
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

## Step 3: Test the Integration (2 minutes)

1. Restart your development server
2. Go to dashboard and upload an image
3. Should now use real AI processing instead of demo mode!

## What Happens When You Add Replicate Token:

✅ **Before (Demo Mode)**:
- "Demo processing" messages
- Same image returned as "enhanced"
- Instant results

✅ **After (Real AI)**:
- Real AI upscaling with progress bars
- Actual image enhancement 
- 20-60 second processing time
- Multiple AI models based on plan

## Cost Estimates:
- ~$0.02-0.05 per image processed
- Your current pricing gives plenty of profit margin
- Free Replicate credit to start testing

## Model Quality by Plan:
- **Trial**: Basic Real-ESRGAN (4x upscale)
- **Basic**: Real-ESRGAN + Waifu2x (4x upscale) 
- **Pro**: + GFPGAN face enhancement (8x upscale)
- **Premium**: + All models, batch processing (16x upscale)

That's it! Your app will automatically switch from demo mode to real AI processing once you add the API token.