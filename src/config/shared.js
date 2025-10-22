// Shared Configuration for Frontend and Dashboard
// This file ensures both systems use the same configuration

export const SHARED_CONFIG = {
  // Firebase Configuration
  firebase: {
    apiKey: "AIzaSyBVBE2Cb5UFePdUOlTWVPPwGZCzH9lUtRQ",
    authDomain: "iyf-orlando-academy.firebaseapp.com",
    projectId: "iyf-orlando-academy",
    storageBucket: "iyf-orlando-academy.appspot.com",
    messagingSenderId: "321117265409",
    appId: "1:321117265409:web:27dc40234503505a3eaa00",
    measurementId: "G-H4FJCX8JT0",
  },
  
  // reCAPTCHA Configuration
  recaptcha: {
    siteKey: "6LeXChwqAAAAAAGlZ5G86_ZOVXKecHJyeOCSFjIM",
  },
  
  // Contact Information
  contact: {
    email: "orlando@iyfusa.org",
    phone: "(407) 900-3442",
    address: "320 S Park Ave, Sanford, FL 32771",
    website: "https://www.iyforlando.org",
  },
  
  // Firestore Collections
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
    volunteerSchedule: "volunteer_schedule",
    volunteerCodes: "volunteer_codes",
    academyInvoices: "academy_invoices",
    academyPayments: "academy_payments",
    academyAttendance: "academy_attendance",
    academyProgress: "academy_progress",
    academyClasses: "academy_classes",
    academyPricing: "academy_pricing",
    settings: "settings",
  },
  
  // API Endpoints (if using custom backend)
  api: {
    baseUrl: process.env.NODE_ENV === 'production' 
      ? 'https://your-dashboard-domain.com/api' 
      : 'http://localhost:3001/api',
    endpoints: {
      registrations: '/registrations',
      volunteers: '/volunteers',
      analytics: '/analytics',
    }
  },
  
  // Environment Configuration
  environment: {
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  }
};

// Export individual configurations for easier imports
export const FIREBASE_CONFIG = SHARED_CONFIG.firebase;
export const RECAPTCHA_CONFIG = SHARED_CONFIG.recaptcha;
export const CONTACT_CONFIG = SHARED_CONFIG.contact;
export const COLLECTIONS_CONFIG = SHARED_CONFIG.collections;
export const API_CONFIG = SHARED_CONFIG.api;
export const ENV_CONFIG = SHARED_CONFIG.environment;
