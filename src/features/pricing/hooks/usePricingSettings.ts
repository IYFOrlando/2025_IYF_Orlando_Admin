import * as React from 'react'
import { onSnapshot, doc, setDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { PricingDoc } from '../../payments/types'

const PATH = ['settings', 'pricing'] as const

export function usePricingSettings() {
  const [data, setData] = React.useState<PricingDoc>({
    academyPrices: {},
    lunch: { semester: 40, single: 4 },
  })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const ref = doc(db, ...PATH)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data() as any
          setData({
            academyPrices: raw.academyPrices || {},
            lunch: raw.lunch || { semester: 40, single: 4 },
            updatedAt: raw.updatedAt,
          })
        } else {
          setData({ academyPrices: {}, lunch: { semester: 40, single: 4 } })
        }
        setLoading(false)
      },
      (e) => { setError(e.message); setLoading(false) },
    )
    return () => unsub()
  }, [])

  async function savePricing(next: PricingDoc) {
    // NOTE: we write the whole academyPrices map to avoid dot-notation issues with keys that have spaces
    await setDoc(
      doc(db, ...PATH),
      {
        academyPrices: next.academyPrices || {},
        lunch: next.lunch || { semester: 40, single: 4 },
        updatedAt: new Date(),
      },
      { merge: true },
    )
  }

  return { data, loading, error, savePricing }
}