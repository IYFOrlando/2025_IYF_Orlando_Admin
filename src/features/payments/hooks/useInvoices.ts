import * as React from 'react'
import { collection, onSnapshot, orderBy, query, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { logger } from '../../../lib/logger'
import { isFirebasePermissionError } from '../../../lib/errors'
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
        setData(snap.docs.map(d => ({ 
          id: d.id, 
          ...(d.data() as Invoice) 
        } as Invoice)))
        setLoading(false)
        setError(null)
      },
      (err) => {
        // Handle permissions error gracefully
        if (isFirebasePermissionError(err)) {
          setData([])
          setError(null)
          setLoading(false)
          return
        }
        
        logger.error('Error fetching invoices', err)
        setError(err.message || 'Failed to load invoices')
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  /**
   * Create a new invoice
   */
  const createInvoice = React.useCallback(async (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = await addDoc(collection(db, INV_COLLECTION), {
        ...invoiceData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      return docRef.id
    } catch (err) {
      logger.error('Error creating invoice', err)
      throw err
    }
  }, [])

  /**
   * Update an existing invoice
   */
  const updateInvoice = React.useCallback(async (id: string, updates: Partial<Invoice>) => {
    try {
      const docRef = doc(db, INV_COLLECTION, id)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      return true
    } catch (err) {
      logger.error('Error updating invoice', err)
      throw err
    }
  }, [])

  /**
   * Delete an invoice
   */
  const deleteInvoice = React.useCallback(async (id: string) => {
    try {
      const docRef = doc(db, INV_COLLECTION, id)
      await deleteDoc(docRef)
      return true
    } catch (err) {
      logger.error('Error deleting invoice', err)
      throw err
    }
  }, [])

  /**
   * Get invoice by ID
   */
  const getInvoiceById = React.useCallback((id: string): Invoice | undefined => {
    return data.find(inv => inv.id === id)
  }, [data])

  /**
   * Get invoices for a specific student
   */
  const getInvoicesByStudentId = React.useCallback((studentId: string): Invoice[] => {
    return data.filter(inv => inv.studentId === studentId)
  }, [data])

  return { 
    data, 
    loading, 
    error,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    getInvoiceById,
    getInvoicesByStudentId
  }
}
