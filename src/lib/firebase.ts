import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { FIREBASE_CONFIG } from '../config/shared.js'

// Use shared configuration or fallback to environment variables
const firebaseConfig = {
  apiKey: FIREBASE_CONFIG.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: FIREBASE_CONFIG.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: FIREBASE_CONFIG.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: FIREBASE_CONFIG.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: FIREBASE_CONFIG.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_CONFIG.appId || import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: FIREBASE_CONFIG.measurementId || import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)