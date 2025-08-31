# Supabase Authentication Configuration

## Password Reset Link Issue Fix

If password reset links redirect to the home page instead of `/reset-password`, follow these steps:

### 1. Update Supabase Auth Settings

1. Go to your Supabase project dashboard
2. Navigate to **Authentication > URL Configuration**
3. Set the following URLs:

**Site URL:**
```
https://your-domain.com
```

**Redirect URLs:** (Add all of these)
```
https://your-domain.com/reset-password
https://your-domain.com/login
https://your-domain.com/
```

### 2. Email Template Configuration

1. Go to **Authentication > Email Templates**
2. Select **Reset Password** template
3. Update the confirmation URL to:
```
{{ .SiteURL }}/reset-password?access_token={{ .TokenHash }}&type=recovery
```

### 3. Alternative Solution (Already Implemented)

The app now includes an `AuthRedirectHandler` component that:
- Detects password reset tokens on ANY page (including home page)
- Automatically redirects users to `/reset-password` with proper tokens
- Works regardless of Supabase configuration issues

### 4. User Fallback Options

Users can also:
1. Click "Try direct reset" link on login page
2. Go directly to `/reset-password` URL
3. Use the password reset form even if email links don't work perfectly

## Testing Password Reset

1. Go to login page
2. Click "Forgot password?"
3. Enter email address
4. Check email for reset link
5. Click link - should go to reset password form
6. If it goes to home page, the `AuthRedirectHandler` will automatically redirect to the correct page

## Environment Variables

Make sure these are set correctly:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```