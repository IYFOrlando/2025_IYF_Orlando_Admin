import * as React from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { COLLECTIONS_CONFIG } from '../../../config/shared.js'
import type { Registration } from '../types'

export const REG_COLLECTION = COLLECTIONS_CONFIG.fallAcademy

export function useRegistrations() {
  const [data, setData] = React.useState<Registration[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const q = query(collection(db, REG_COLLECTION), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
      setLoading(false)
    }, (e) => { setError(e.message); setLoading(false) })
    return () => unsub()
  }, [])

  return { data, loading, error }
}