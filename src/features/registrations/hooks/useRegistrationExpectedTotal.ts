import * as React from 'react'
import { getAcademyPriceMap } from '../../../lib/supabaseRegistrations'
import type { Registration } from '../types'

const norm = (s?: string) => (s || '').trim().toLowerCase()

/** Find price key for an academy name; registration may use "Kids" while DB has "Kids Academy". */
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
 * Expected total in CENTS from registration's academies × Supabase prices.
 * Single source of truth: Supabase academies table.
 * Handles name variants (e.g. "Kids" → "Kids Academy").
 */
export function useRegistrationExpectedTotal(registration: Registration | null): {
  expectedTotalCents: number
  loading: boolean
} {
  const [priceMap, setPriceMap] = React.useState<Record<string, number>>({})
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    getAcademyPriceMap()
      .then((map) => setPriceMap(map))
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
    getAcademyPriceMap()
      .then((map) => setPriceMap(map))
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
