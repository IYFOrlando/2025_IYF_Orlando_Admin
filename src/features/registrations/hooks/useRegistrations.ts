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
    // Query without orderBy to include all registrations, even those without createdAt
    // We'll sort in the client to handle missing createdAt fields
    const q = query(collection(db, REG_COLLECTION))
    const unsub = onSnapshot(q, 
      (snap) => {
        const registrations = snap.docs.map(d => {
          return { id: d.id, ...(d.data() as any) }
        })
        
        // Sort in client: newest first, registrations without createdAt go to the end
        registrations.sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() || a.createdAt?._seconds * 1000 || a.createdAt || 0
          const bTime = b.createdAt?.toMillis?.() || b.createdAt?._seconds * 1000 || b.createdAt || 0
          return bTime - aTime
        })
        
        setData(registrations)
        setLoading(false)
      }, 
      (e) => { 
        // Generic error message for users - don't expose internal errors
        setError('Failed to load registrations. Please refresh the page.'); 
        setLoading(false) 
      }
    )
    return () => {
      unsub()
    }
  }, [])

  return { data, loading, error }
}
