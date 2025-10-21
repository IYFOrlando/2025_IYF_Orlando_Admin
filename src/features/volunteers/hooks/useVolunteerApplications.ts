import * as React from 'react'
import { collection, onSnapshot, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { VolunteerApplication, VolunteerStatus } from '../types'

const COLLECTION = 'volunteer_applications'

export function useVolunteerApplications() {
  const [data, setData] = React.useState<VolunteerApplication[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const q = query(
      collection(db, COLLECTION),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const applications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VolunteerApplication[]
        setData(applications)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching volunteer applications:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const updateStatus = React.useCallback(async (
    id: string, 
    status: VolunteerStatus, 
    notes?: string,
    updatedBy?: string
  ) => {
    try {
      const docRef = doc(db, COLLECTION, id)
      await updateDoc(docRef, {
        status,
        notes: notes || null,
        updatedAt: serverTimestamp(),
        updatedBy: updatedBy || null
      })
      return true
    } catch (err) {
      console.error('Error updating volunteer application status:', err)
      throw err
    }
  }, [])

  return {
    data,
    loading,
    error,
    updateStatus
  }
}
