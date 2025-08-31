# Google OAuth Display Name Configuration

The Google OAuth consent screen showing the long Supabase URL instead of "Enhpix" requires configuration in Google Cloud Console.

## Steps to Fix:

### 1. Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one if needed)

### 2. Configure OAuth Consent Screen
1. Navigate to **APIs & Services > OAuth consent screen**
2. Update the following fields:
   - **Application name**: `Enhpix`
   - **Application logo**: Upload your Enhpix logo
   - **Authorized domains**: Add your domain (e.g., `enhpix.com`)

### 3. Update OAuth Client
1. Go to **APIs & Services > Credentials**
2. Find your OAuth 2.0 Client ID
3. Click **Edit**
4. Update:
   - **Name**: `Enhpix OAuth Client`
   - **Authorized JavaScript origins**: Add your production domain
   - **Authorized redirect URIs**: Make sure Supabase callback URL is included

### 4. Update Supabase Settings
1. Go to your Supabase project dashboard
2. Navigate to **Authentication > Settings**
3. In **Site URL**, set your production domain (e.g., `https://enhpix.com`)
4. In **Redirect URLs**, add your production domain

### 5. Verification (if required)
If your app is in testing mode:
1. Go to **OAuth consent screen**
2. Click **Publish App** to make it public
3. Or add test users in the **Test users** section

## Result
After these changes, the Google OAuth consent screen will show:
- Application name: "Enhpix" 
- Domain: Your actual domain instead of Supabase URL

## Note
Changes may take a few minutes to propagate. Clear browser cache if you don't see changes immediately.