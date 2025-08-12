import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyDfn9UCBn4G-Ih-JXu4IkiDLa1ZKUYYo2A",
  authDomain: "iyf-orlando-dashboard.firebaseapp.com",
  projectId: "iyf-orlando-dashboard",
  storageBucket: "iyf-orlando-dashboard.firebasestorage.app",
  messagingSenderId: "952607915936",
  appId: "1:952607915936:web:6c57139dff534e19446ec5",
  measurementId: "G-1JYJLVRM78"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)