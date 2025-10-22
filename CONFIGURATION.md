# IYF Orlando Dashboard - Configuration

## Shared Configuration

The dashboard now uses a shared configuration system that syncs with the frontend application.

### Files Created:
- `src/config/shared.js` - Shared configuration for both frontend and dashboard
- `dashboard-config.js` - PowerShell script for automated deployment

### Configuration Structure:

#### Firebase Configuration
```javascript
firebase: {
  apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
  authDomain: "iyf-orlando-academy.firebaseapp.com",
  projectId: "iyf-orlando-academy",
  storageBucket: "iyf-orlando-academy.appspot.com",
  messagingSenderId: "321117265409",
  appId: "1:321117265409:web:27dc40234503505a3eaa00",
  measurementId: "G-H4FJCX8JT0",
}
```

#### Firestore Collections
```javascript
collections: {
  fallAcademy: "fall_academy_2025",
  volunteerApplications: "volunteer_applications",
  tripToKorea: "trip_to_korea_applications",
  cookingClass: "cooking_class_applications",
  kdrama: "kdrama_applications",
  newsletter: "newsletter_subscribers",
  contact: "contact_messages",
  events: "events",
  volunteerHours: "volunteer_hours",
  volunteerCodes: "volunteer_codes",
  academyInvoices: "academy_invoices",
  academyPayments: "academy_payments",
  academyAttendance: "academy_attendance",
  academyProgress: "academy_progress",
  academyClasses: "academy_classes",
  academyPricing: "academy_pricing",
  settings: "settings",
}
```

#### Contact Information
```javascript
contact: {
  email: "orlando@iyfusa.org",
  phone: "(407) 900-3442",
  address: "320 S Park Ave, Sanford, FL 32771",
  website: "https://www.iyforlando.org",
}
```

### Updated Files:
- `src/lib/firebase.ts` - Now uses shared Firebase configuration
- `src/lib/config.ts` - Now uses shared collections configuration
- All hooks updated to use centralized collection names

### Deployment:
Use the PowerShell script for automated deployment:
```powershell
.\dashboard-config.js "Your commit message"
```

This script will:
1. Build the project
2. Deploy Firestore rules
3. Commit and push changes to Git

### Environment Variables:
The system falls back to environment variables if shared config is not available:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- etc.

### Benefits:
- ✅ Consistent configuration between frontend and dashboard
- ✅ Centralized collection names
- ✅ Easy deployment process
- ✅ Fallback to environment variables
- ✅ Type-safe configuration
