# Environment Variables Required

## Firebase Configuration
You need to configure these environment variables in Cloudflare Pages:

### Required Variables:
- `VITE_FIREBASE_API_KEY` - Your Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Your Firebase auth domain (e.g., your-project.firebaseapp.com)
- `VITE_FIREBASE_PROJECT_ID` - Your Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Your Firebase storage bucket (e.g., your-project.appspot.com)
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Your Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Your Firebase app ID
- `VITE_FIREBASE_MEASUREMENT_ID` - Your Firebase measurement ID (optional)

### Admin Access:
- `VITE_ADMIN_EMAILS` - Comma-separated list of admin email addresses

## How to Configure in Cloudflare Pages:

1. Go to your Cloudflare Pages dashboard
2. Select your project
3. Go to "Settings" > "Environment variables"
4. Add each variable with its corresponding value
5. Make sure to set them for "Production" environment

## Example:
```
VITE_FIREBASE_API_KEY=AIzaSyC...
VITE_FIREBASE_AUTH_DOMAIN=iyf-orlando.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=iyf-orlando
VITE_FIREBASE_STORAGE_BUCKET=iyf-orlando.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
VITE_ADMIN_EMAILS=admin@iyfusa.org,orlando@iyfusa.org
```
