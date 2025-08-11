import * as React from 'react'
import { onSnapshot, doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { notifyError } from '../../../lib/alerts'
import type { PricingDoc, PricingItem, LunchPricing } from '../types'

const DOC_PATH = ['settings', 'pricing'] as const

const DEFAULT_DOC: PricingDoc = {
  items: [],
  lunch: { semester: 40, single: 4 },
  currency: 'USD',
}

export function usePricing() {
  const [docData, setDocData] = React.useState<PricingDoc>(DEFAULT_DOC)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const ref = doc(db, ...DOC_PATH)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const d = snap.data() as PricingDoc
          setDocData({
            items: Array.isArray(d.items) ? d.items : [],
            lunch: d.lunch || DEFAULT_DOC.lunch,
            currency: d.currency || 'USD',
            updatedAt: d.updatedAt,
          })
        } else {
          // create a default doc lazily (no rules change needed; will require write perms)
          setDoc(ref, { ...DEFAULT_DOC, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {})
          setDocData(DEFAULT_DOC)
        }
        setLoading(false)
      },
      (e) => {
        setError(e.message)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  const upsertItem = async (item: PricingItem) => {
    try {
      const ref = doc(db, ...DOC_PATH)
      const snap = await getDoc(ref)
      const current = (snap.exists() ? (snap.data() as PricingDoc) : DEFAULT_DOC).items || []
      const id = item.id || crypto.randomUUID()
      const next = [...current.filter((x) => x.id !== id), { ...item, id }]
      await updateDoc(ref, { items: next, updatedAt: serverTimestamp() })
      return id
    } catch (e: any) {
      notifyError('Save failed', e?.message)
      throw e
    }
  }

  const deleteItem = async (id: string) => {
    try {
      const ref = doc(db, ...DOC_PATH)
      const snap = await getDoc(ref)
      if (!snap.exists()) return
      const current = (snap.data() as PricingDoc).items || []
      const next = current.filter((x) => x.id !== id)
      await updateDoc(ref, { items: next, updatedAt: serverTimestamp() })
    } catch (e: any) {
      notifyError('Delete failed', e?.message)
      throw e
    }
  }

  const saveLunch = async (lunch: LunchPricing) => {
    try {
      const ref = doc(db, ...DOC_PATH)
      await updateDoc(ref, { lunch, updatedAt: serverTimestamp() })
    } catch (e: any) {
      notifyError('Update failed', e?.message)
      throw e
    }
  }

  return {
    data: docData,
    loading,
    error,
    upsertItem,
    deleteItem,
    saveLunch,
  }
}
