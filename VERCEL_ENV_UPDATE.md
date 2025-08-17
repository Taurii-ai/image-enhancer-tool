# Vercel Environment Variables Update Required

## Action Needed: Add Server-side Replicate API Token

Since you mentioned you changed the Replicate API token, you need to add the server-side environment variable to Vercel:

### Step 1: Go to Vercel Dashboard
1. Visit https://vercel.com/dashboard
2. Select your `pixel-shine-studio` project
3. Go to Settings → Environment Variables

### Step 2: Add Required Environment Variable
Add this new environment variable:

```
Name: REPLICATE_API_TOKEN
Value: [your new Replicate API token - starts with r8_]
Environments: Production, Preview, Development (select all)
```

### Step 3: Redeploy
After adding the environment variable, trigger a new deployment by:
1. Going to the Deployments tab
2. Click the three dots on the latest deployment
3. Select "Redeploy"

## Why This is Needed
The enhancer was refactored to use API routes (serverless functions) instead of frontend client calls. The API routes need the `REPLICATE_API_TOKEN` environment variable (without the `VITE_` prefix) to authenticate with Replicate.

## Current Environment Variables Needed
- `VITE_REPLICATE_API_TOKEN` - For frontend (existing)
- `REPLICATE_API_TOKEN` - For API routes (NEW - needs to be added)

Both should have the same value (your new Replicate API token).