import * as React from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { COLLECTIONS_CONFIG } from '../../../config/shared.js'
import { norm } from '../../../lib/query'

/**
 * Hook to get academy prices from academies_2026_spring collection
 * This is the single source of truth for academy prices (same as autoInvoice)
 * Prices are stored in cents (converted from dollars in Firestore)
 */
export function useAcademyPricing() {
  const [academyPrices, setAcademyPrices] = React.useState<Record<string, number>>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const academyCollectionName = COLLECTIONS_CONFIG.academies2026Spring || 'academies_2026_spring'
    const academiesRef = collection(db, academyCollectionName)
    const q = query(academiesRef, orderBy('order', 'asc'))
    
    const unsub = onSnapshot(
      q,
      (snap) => {
        const prices: Record<string, number> = {}
        snap.docs.forEach((docSnap) => {
          const academy = docSnap.data()
          if (academy.name && typeof academy.price === 'number') {
            // Store in cents (academy.price is in dollars, convert to cents)
            const normalized = norm(academy.name)
            prices[normalized] = academy.price * 100
          }
        })
        setAcademyPrices(prices)
        setLoading(false)
        setError(null)
      },
      (e) => {
        setError(e.message)
        setLoading(false)
      }
    )
    
    return () => unsub()
  }, [])

  return { academyPrices, loading, error }
}
