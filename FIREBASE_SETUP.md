# Firebase Setup for Email/Password Authentication

## Enable Email/Password Authentication

1. Go to your [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to "Authentication" in the left sidebar
4. Click on "Sign-in method" tab
5. Enable "Email/Password" provider
6. Click "Save"

## Create Admin Users

### Option 1: Firebase Console
1. Go to "Authentication" > "Users"
2. Click "Add user"
3. Enter email and password
4. Click "Add user"

### Option 2: Programmatically (Recommended)
You can create users programmatically using Firebase Admin SDK or through your application.

## Required Admin Emails
Add these emails as admin users:
- `orlando@iyfusa.org` (Main admin - full access)

## Gmail Access
Any user with a Gmail account can sign in for read-only access to view registrations and reports.

## Security Rules

Make sure your Firestore security rules are properly configured:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Environment Variables

Make sure these are set in Cloudflare Pages:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

## Testing

1. Deploy your application
2. Try to access the admin portal
3. You should see the login page
4. Enter the credentials you created in Firebase
5. You should be redirected to the admin dashboard
