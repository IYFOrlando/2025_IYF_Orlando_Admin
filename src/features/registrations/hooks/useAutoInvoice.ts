/**
 * Hook to automatically create invoices for new registrations
 */

import * as React from 'react'
import { collection, query, onSnapshot, where, getDocs } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { COLLECTIONS_CONFIG } from '../../../config/shared.js'
import { createAutoInvoice } from '../../../lib/autoInvoice'
import { logger } from '../../../lib/logger'
import type { Registration } from '../types'

/**
 * Hook that listens for new registrations and automatically creates invoices
 * @param enabled - Whether auto-invoice creation is enabled
 */
export function useAutoInvoice(enabled: boolean = true) {
  const [processing, setProcessing] = React.useState(false)
  const processedIds = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    if (!enabled) return

    // Check for existing registrations without invoices
    const checkExisting = async () => {
      try {
        setProcessing(true)
        const registrationsRef = collection(db, COLLECTIONS_CONFIG.fallAcademy)
        const registrationsSnapshot = await getDocs(registrationsRef)

        for (const docSnap of registrationsSnapshot.docs) {
          const registration = { id: docSnap.id, ...docSnap.data() } as Registration
          
          // Skip if already processed
          if (processedIds.current.has(registration.id)) continue
          
          // Check if invoice exists
          const invoicesRef = collection(db, COLLECTIONS_CONFIG.academyInvoices)
          const invoiceQuery = query(
            invoicesRef,
            where('studentId', '==', registration.id)
          )
          const invoiceSnapshot = await getDocs(invoiceQuery)
          
          // If no invoice exists, create one
          if (invoiceSnapshot.empty) {
            try {
              await createAutoInvoice(registration)
              processedIds.current.add(registration.id)
              logger.info(`Auto-created invoice for registration ${registration.id}`)
            } catch (error) {
              logger.error(`Error creating invoice for ${registration.id}`, error)
            }
          } else {
            processedIds.current.add(registration.id)
          }
        }
      } catch (error) {
        logger.error('Error checking existing registrations', error)
      } finally {
        setProcessing(false)
      }
    }

    // Listen for new registrations
    const registrationsRef = collection(db, COLLECTIONS_CONFIG.fallAcademy)
    const unsubscribe = onSnapshot(
      registrationsRef,
      async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const registration = { id: change.doc.id, ...change.doc.data() } as Registration
            
            // Skip if already processed
            if (processedIds.current.has(registration.id)) return
            
            try {
              await createAutoInvoice(registration)
              processedIds.current.add(registration.id)
              logger.info(`Auto-created invoice for new registration ${registration.id}`)
            } catch (error) {
              logger.error(`Error creating invoice for new registration ${registration.id}`, error)
            }
          }
        })
      },
      (error) => {
        logger.error('Error listening to registrations', error)
      }
    )

    // Check existing on mount
    checkExisting()

    return () => {
      unsubscribe()
    }
  }, [enabled])

  return { processing }
}
