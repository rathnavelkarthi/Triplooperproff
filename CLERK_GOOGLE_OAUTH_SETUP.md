# Complete Clerk Google OAuth Setup Guide

## Current Status:
✅ DNS configured correctly: `clerk.esaystay.com` → Clerk Cloudflare
✅ Live Clerk key with custom domain: `pk_live_Y2xlcmsuZXNheXN0YXkuY29tJA==`
✅ Application code updated for production
❌ Google OAuth not configured in Clerk Dashboard

## Steps to Enable Google OAuth:

### Step 1: Configure Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select your project
3. Go to "APIs & Services" → "Credentials"
4. Create OAuth 2.0 Client ID (Web application)
5. Add authorized redirect URIs:
   ```
   https://clerk.esaystay.com/v1/oauth_callback
   https://esaystay.com/sso-callback
   ```
6. Copy Client ID and Client Secret

### Step 2: Configure Clerk Dashboard
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Go to "Social Connections" → "Google"
4. Enable Google OAuth
5. Enter Google Client ID and Client Secret
6. Save configuration

### Step 3: Update Redirect URLs in Clerk
1. In Clerk Dashboard, go to "Redirects"
2. Add the following URLs:
   ```
   https://esaystay.com/sso-callback
   https://esaystay.com/admin/dashboard
   https://www.esaystay.com/sso-callback
   https://www.esaystay.com/admin/dashboard
   ```

### Step 4: Test Google OAuth
1. Deploy updated code to Vercel
2. Visit `https://esaystay.com/admin/login`
3. Click "Continue with Google"
4. Should redirect to Google login

## Environment Configuration:

### Development (.env):
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_bW9kZWwtY2hlZXRhaC04MC5jbGVyay5hY2NvdW50cy5kZXYk
```

### Production (Vercel Environment Variables):
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_Y2xlcmsuZXNheXN0YXkuY29tJA==
```

## Application Code Updates Made:

1. **Dynamic Clerk Configuration** in `src/App.tsx`:
   - Auto-detects live vs test keys
   - Configures custom domain for live keys
   - Sets proper redirect URLs

2. **Production Environment File** `.env.production`:
   - Contains live key configuration
   - Ready for Vercel deployment

3. **Debugging Enhanced** in login components:
   - Detailed logging for OAuth flow
   - Error handling improvements

## Testing Checklist:
- [ ] Google OAuth enabled in Clerk Dashboard
- [ ] Google Cloud OAuth credentials configured
- [ ] Redirect URLs added to Clerk
- [ ] Live key set in Vercel environment
- [ ] Application deployed to Vercel
- [ ] Google login button works
- [ ] Callback redirects properly

## Troubleshooting:

### Issue: "Failed to load Clerk JS"
**Solution:** Ensure `clerk.esaystay.com` DNS is properly configured (CNAME to `c.clerk.com`)

### Issue: Google OAuth not redirecting
**Solution:** Check authorized redirect URIs in Google Cloud Console

### Issue: Session not persisting
**Solution:** Verify domain configuration in ClerkProvider matches your domain

## Future-Proofing:
- Separate environment configs (dev/test/prod)
- Proper error handling for OAuth failures
- Monitoring for authentication issues
- Regular testing of all auth flows