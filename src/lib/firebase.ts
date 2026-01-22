/**
 * Firebase configuration and initialization
 * 
 * @module firebase
 * @description Configures and initializes Firebase services (Firestore and Auth)
 * using environment variables. Validates required variables on initialization.
 */

import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

/**
 * Validates required Firebase environment variables
 * Throws error in development if missing, logs warning in production
 */
// Validate required environment variables
const requiredEnvVars = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// Check for missing required variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key)

if (missingVars.length > 0) {
  const errorMessage = `Missing required Firebase environment variables: ${missingVars.join(', ')}. Please check your .env file or environment configuration.`
  
  // In development, throw error to catch early
  if (import.meta.env.DEV) {
    console.error('Firebase configuration error', { missingVars })
    throw new Error(errorMessage)
  }
  
  // In production, log but continue (may fail later)
  console.warn('Firebase may not work correctly due to missing configuration')
}

// Use only environment variables (no hardcoded values)
const firebaseConfig = {
  apiKey: requiredEnvVars.apiKey,
  authDomain: requiredEnvVars.authDomain,
  projectId: requiredEnvVars.projectId,
  storageBucket: requiredEnvVars.storageBucket,
  messagingSenderId: requiredEnvVars.messagingSenderId,
  appId: requiredEnvVars.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, // Optional
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

// Log initialization (only in development)
if (import.meta.env.DEV) {
  console.debug('Firebase initialized', { projectId: firebaseConfig.projectId })
}