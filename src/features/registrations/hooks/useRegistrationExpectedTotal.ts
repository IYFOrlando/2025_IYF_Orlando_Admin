import * as React from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { COLLECTIONS_CONFIG } from '../../../config/shared.js'
import type { Registration } from '../types'

const norm = (s?: string) => (s || '').trim().toLowerCase()

/** Find price key for an academy name; registration may use "Kids" while Firestore has "Kids Academy". */
function resolvePriceKey(academyName: string, priceMap: Record<string, number>): string | null {
  const n = norm(academyName)
  if (!n || n === 'n/a') return null
  if (priceMap[n] != null) return n
  const keys = Object.keys(priceMap)
  const match = keys.find(
    (k) => k === n || k.includes(n) || n.includes(k) || norm(k).replace(/\s+/g, '') === n.replace(/\s+/g, '')
  )
  return match ?? null
}

/**
 * Expected total in CENTS from registration's academies × Firestore prices.
 * Single source of truth: academies_2026_spring (same as autoInvoice).
 * Handles name variants (e.g. "Kids" → "Kids Academy").
 */
export function useRegistrationExpectedTotal(registration: Registration | null): {
  expectedTotalCents: number
  loading: boolean
} {
  const [priceMap, setPriceMap] = React.useState<Record<string, number>>({})
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const coll = COLLECTIONS_CONFIG.academies2026Spring || 'academies_2026_spring'
    getDocs(query(collection(db, coll), orderBy('order', 'asc')))
      .then((snap) => {
        const map: Record<string, number> = {}
        snap.docs.forEach((d) => {
          const a = d.data()
          if (a?.name && typeof a.price === 'number') {
            map[norm(a.name)] = Math.round(a.price * 100) // store cents
          }
        })
        setPriceMap(map)
      })
      .catch(() => setPriceMap({}))
      .finally(() => setLoading(false))
  }, [])

  const expectedTotalCents = React.useMemo(() => {
    if (!registration) return 0
    const reg = registration as any
    let total = 0
    if (Array.isArray(reg.selectedAcademies)) {
      reg.selectedAcademies.forEach((ac: { academy?: string }) => {
        const key = resolvePriceKey(ac?.academy ?? '', priceMap)
        if (key && priceMap[key] != null) total += priceMap[key]
      })
    } else {
      const key1 = resolvePriceKey(reg.firstPeriod?.academy ?? '', priceMap)
      const key2 = resolvePriceKey(reg.secondPeriod?.academy ?? '', priceMap)
      if (key1 && priceMap[key1] != null) total += priceMap[key1]
      if (key2 && key2 !== key1 && priceMap[key2] != null) total += priceMap[key2]
    }
    return total
  }, [registration, priceMap])

  return { expectedTotalCents, loading }
}

/** Expected total in CENTS per registration id. Use in list so status matches the drawer (academies × prices). */
export function useRegistrationsExpectedTotals(registrations: Registration[]): {
  expectedByRegId: Map<string, number>
  loading: boolean
} {
  const [priceMap, setPriceMap] = React.useState<Record<string, number>>({})
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const coll = COLLECTIONS_CONFIG.academies2026Spring || 'academies_2026_spring'
    getDocs(query(collection(db, coll), orderBy('order', 'asc')))
      .then((snap) => {
        const map: Record<string, number> = {}
        snap.docs.forEach((d) => {
          const a = d.data()
          if (a?.name && typeof a.price === 'number') {
            map[norm(a.name)] = Math.round(a.price * 100)
          }
        })
        setPriceMap(map)
      })
      .catch(() => setPriceMap({}))
      .finally(() => setLoading(false))
  }, [])

  const expectedByRegId = React.useMemo(() => {
    const out = new Map<string, number>()
    registrations.forEach((registration) => {
      const reg = registration as any
      let total = 0
      if (Array.isArray(reg.selectedAcademies)) {
        reg.selectedAcademies.forEach((ac: { academy?: string }) => {
          const key = resolvePriceKey(ac?.academy ?? '', priceMap)
          if (key && priceMap[key] != null) total += priceMap[key]
        })
      } else {
        const key1 = resolvePriceKey(reg.firstPeriod?.academy ?? '', priceMap)
        const key2 = resolvePriceKey(reg.secondPeriod?.academy ?? '', priceMap)
        if (key1 && priceMap[key1] != null) total += priceMap[key1]
        if (key2 && key2 !== key1 && priceMap[key2] != null) total += priceMap[key2]
      }
      out.set(registration.id, total)
    })
    return out
  }, [registrations, priceMap])

  return { expectedByRegId, loading }
}
