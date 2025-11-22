# 🔐 Environment Variables Setup Guide

## ⚠️ IMPORTANT: Security Update

The application now uses **environment variables only** for Firebase configuration. The hardcoded credentials in `shared.js` are no longer used.

## Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your Firebase credentials** in the `.env` file

3. **Never commit `.env` to Git** - it's already in `.gitignore`

## Required Variables

All these variables are **required** for the application to work:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=iyf-orlando-academy.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=iyf-orlando-academy
VITE_FIREBASE_STORAGE_BUCKET=iyf-orlando-academy.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=321117265409
VITE_FIREBASE_APP_ID=1:321117265409:web:...
```

## Optional Variables

These are optional but recommended:

```env
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_ADMIN_EMAILS=admin@example.com
VITE_LUNCH_SEMESTER_CENTS=4000
VITE_LUNCH_SINGLE_CENTS=400
```

## Cloudflare Pages Setup

For Cloudflare Pages deployment:

1. Go to your Cloudflare Pages dashboard
2. Select your project
3. Navigate to **Settings** > **Environment variables**
4. Add each variable with its value
5. Make sure to set them for **Production** environment

## Local Development

For local development, create a `.env` file in the root directory with your variables.

**Note**: The `.env` file is already in `.gitignore` and will not be committed to the repository.

## Migration from shared.js

If you were using the old `shared.js` configuration:

1. Extract the values from `src/config/shared.js` (if you still have access)
2. Add them to your `.env` file
3. The application will automatically use the environment variables

## Verification

After setting up your environment variables, start the development server:

```bash
npm run dev
```

The application will:
- ✅ Validate that all required variables are present
- ✅ Show an error in development if any are missing
- ✅ Log a warning in production if any are missing

## Troubleshooting

### "Missing required Firebase environment variables"

This means one or more required variables are not set. Check:
- Your `.env` file exists and is in the root directory
- All variables start with `VITE_`
- No typos in variable names
- You've restarted the dev server after creating/updating `.env`

### Firebase connection fails

1. Verify your credentials are correct
2. Check that your Firebase project is active
3. Ensure your IP is not blocked by Firebase
4. Check browser console for specific error messages

