# Environment Variables Required

## Firebase Configuration
**Note:** The Firebase configuration is now hardcoded in `src/lib/firebase.ts` for the new project `iyf-orlando-dashboard`.

### Current Configuration:
- **Project ID:** `iyf-orlando-dashboard`
- **Auth Domain:** `iyf-orlando-dashboard.firebaseapp.com`
- **Storage Bucket:** `iyf-orlando-dashboard.firebasestorage.app`

### Admin Access:
- **Admin Emails:** `orlando@iyfusa.org`, `jodlouis.dev@gmail.com`, `michellemoralespradis@gmail.com`
- **Gmail Users:** Read-only access to registrations, invoices, and pricing

### Authentication:
The application uses Google OAuth authentication for secure access control.

## Firestore Security Rules:
Security rules have been deployed to ensure:
- **Admins:** Full read/write access
- **Gmail users:** Read-only access
- **Others:** No access

## If you need to use environment variables instead:

### Required Variables:
- `VITE_FIREBASE_API_KEY` - Your Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Your Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Your Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Your Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Your Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Your Firebase app ID
- `VITE_FIREBASE_MEASUREMENT_ID` - Your Firebase measurement ID (optional)

### Example:
```
VITE_FIREBASE_API_KEY=AIzaSyDfn9UCBn4G-Ih-JXu4IkiDLa1ZKUYYo2A
VITE_FIREBASE_AUTH_DOMAIN=iyf-orlando-dashboard.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=iyf-orlando-dashboard
VITE_FIREBASE_STORAGE_BUCKET=iyf-orlando-dashboard.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=952607915936
VITE_FIREBASE_APP_ID=1:952607915936:web:6c57139dff534e19446ec5
VITE_FIREBASE_MEASUREMENT_ID=G-1JYJLVRM78
VITE_ADMIN_EMAILS=orlando@iyfusa.org,jodlouis.dev@gmail.com,michellemoralespradis@gmail.com
```
