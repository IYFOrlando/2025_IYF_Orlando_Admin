import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../../lib/firebase'

export interface InvoiceConfig {
  organizationName: string
  addressLine1: string
  addressLine2: string
  phone: string
  email: string
  currentSemester: string
  semesterStartDate?: string
  semesterEndDate?: string
}

const DEFAULT_CONFIG: InvoiceConfig = {
  organizationName: 'IYF Orlando',
  addressLine1: '320 S Park Ave',
  addressLine2: 'Sanford, FL 32771',
  phone: '407-900-3442',
  email: 'orlando@iyfusa.org',
  currentSemester: '2026 Spring Semester',
}

/**
 * Hook to get invoice configuration from Firestore
 * Falls back to defaults if document doesn't exist
 * Syncs in real-time with Firestore changes
 */
export function useInvoiceConfig() {
  const [config, setConfig] = useState<InvoiceConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const docRef = doc(db, 'settings', 'invoice_config')
    
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as InvoiceConfig
          setConfig({ ...DEFAULT_CONFIG, ...data })
        } else {
          // Log warning only in dev to avoid noise
          if (import.meta.env.DEV) {
             console.warn('Invoice config document not found, using defaults')
          }
          setConfig(DEFAULT_CONFIG)
        }
        setLoading(false)
      },
      (error) => {
        console.error('Error loading invoice config', error)
        setConfig(DEFAULT_CONFIG)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  return { config, loading }
}
