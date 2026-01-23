import * as React from 'react'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { COLLECTIONS_CONFIG } from '../../../config/shared.js'
import type { Registration } from '../types'

export const REG_COLLECTION = COLLECTIONS_CONFIG.fallAcademy

export function useRegistrations() {
  const [data, setData] = React.useState<Registration[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    // SECURITY: Only log in development - never expose sensitive data in production
    const isDev = process.env.NODE_ENV === 'development'
    if (isDev) {
      console.log('🔍 useRegistrations: Setting up listener for collection:', REG_COLLECTION)
    }
    
    // Query without orderBy to include all registrations, even those without createdAt
    // We'll sort in the client to handle missing createdAt fields
    const q = query(collection(db, REG_COLLECTION))
    const unsub = onSnapshot(q, 
      (snap) => {
        // SECURITY: Only log count, never personal data (names, emails, addresses)
        if (isDev) {
          console.log('📊 useRegistrations: Received snapshot with', snap.docs.length, 'documents')
        }
        
        const registrations = snap.docs.map(d => {
          // SECURITY: NEVER log personal data - this is a security risk
          // Only return the data, don't log firstName, lastName, email, etc.
          return { id: d.id, ...(d.data() as any) }
        })
        
        // Sort in client: newest first, registrations without createdAt go to the end
        registrations.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?._seconds * 1000 || a.createdAt || 0
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?._seconds * 1000 || b.createdAt || 0
          return bTime - aTime
        })
        
        if (isDev) {
          console.log('✅ useRegistrations: Setting', registrations.length, 'registrations')
        }
        
        setData(registrations)
        setLoading(false)
      }, 
      (e) => { 
        // SECURITY: Log errors but sanitize - don't expose internal details in production
        console.error('❌ useRegistrations: Error fetching registrations')
        if (isDev) {
          console.error('Error details:', e.code, e.message)
        }
        // Generic error message for users - don't expose internal errors
        setError('Failed to load registrations. Please refresh the page.'); 
        setLoading(false) 
      }
    )
    return () => {
      if (isDev) {
        console.log('🔌 useRegistrations: Unsubscribing from listener')
      }
      unsub()
    }
  }, [])

  return { data, loading, error }
}
