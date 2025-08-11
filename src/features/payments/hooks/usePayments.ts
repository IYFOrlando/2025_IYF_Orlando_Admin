import * as React from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { PAY_COLLECTION } from '../../../lib/config'
import type { Payment } from '../types'

export function usePayments() {
  const [data, setData] = React.useState<Payment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const q = query(collection(db, PAY_COLLECTION), orderBy('createdAt', 'desc'))
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
