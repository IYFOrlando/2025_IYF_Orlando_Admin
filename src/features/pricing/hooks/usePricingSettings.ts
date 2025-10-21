import * as React from 'react'
import { onSnapshot, doc, setDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { PricingDoc } from '../../payments/types'

const PATH = ['settings', 'pricing'] as const

export function usePricingSettings() {
  const [data, setData] = React.useState<PricingDoc>({
    academyPrices: {},
    items: [],
    lunch: { semester: 40, single: 4 },
  })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    // Try to access pricing data, but handle permissions gracefully
    const ref = doc(db, ...PATH)
    
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const raw = snap.data() as any
          setData({
            academyPrices: raw.academyPrices || {},
            items: raw.items || [],
            lunch: raw.lunch || { semester: 40, single: 4 },
            updatedAt: raw.updatedAt,
          })
        } else {
          setData({ academyPrices: {}, items: [], lunch: { semester: 40, single: 4 } })
        }
        setLoading(false)
      },
      (e) => { 
        // Handle permissions error silently - use default pricing
        if (e.code === 'permission-denied' || e.message.includes('permissions')) {
          // User doesn't have permissions to read pricing - use defaults
          setData({ academyPrices: {}, items: [], lunch: { semester: 40, single: 4 } })
          setError(null)
          setLoading(false)
          return
        }
        
        // For other errors, still use defaults but log the error
        setData({ academyPrices: {}, items: [], lunch: { semester: 40, single: 4 } })
        setError(null)
        setLoading(false)
      },
    )
    
    return () => unsub()
  }, [])

  async function savePricing(next: PricingDoc) {
    // NOTE: we write the whole academyPrices map to avoid dot-notation issues with keys that have spaces
    await setDoc(
      doc(db, ...PATH),
      {
        academyPrices: next.academyPrices || {},
        items: next.items || [],
        lunch: next.lunch || { semester: 40, single: 4 },
        updatedAt: new Date(),
      },
      { merge: true },
    )
  }

  return { data, loading, error, savePricing }
}