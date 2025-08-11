import * as React from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { INV_COLLECTION } from '../../../lib/config'
import type { Invoice } from '../types'

export function useInvoices() {
  const [data, setData] = React.useState<Invoice[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const q = query(collection(db, INV_COLLECTION), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q,
      (snap) => {
        setData(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
        setLoading(false)
      },
      (err) => { setError(err.message || 'Failed to load'); setLoading(false) }
    )
    return () => unsub()
  }, [])

  return { data, loading, error }
}
