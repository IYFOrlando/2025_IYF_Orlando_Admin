import * as React from 'react'
import { collection, onSnapshot, query, orderBy, doc, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { VOLUNTEER_APPLICATIONS_COLLECTION } from '../../../lib/config'
import { generateVolunteerCode } from '../../../lib/volunteerCodes'
import type { VolunteerApplication, VolunteerStatus } from '../types'

export function useVolunteerApplications() {
  const [data, setData] = React.useState<VolunteerApplication[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const q = query(
      collection(db, VOLUNTEER_APPLICATIONS_COLLECTION),
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
        // Handle permissions error gracefully
        if (err.code === 'permission-denied' || err.message.includes('permissions')) {
          // User doesn't have permissions to read volunteer applications - use empty array
          setData([])
          setError(null)
          setLoading(false)
          return
        }
        
        // For other errors, still log but don't show to user unless critical
        console.error('Error fetching volunteer applications:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const createVolunteer = React.useCallback(async (volunteerData: Omit<VolunteerApplication, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Generate volunteer code if not provided
      const volunteerCode = volunteerData.volunteerCode || generateVolunteerCode(6)
      
      const docRef = await addDoc(collection(db, VOLUNTEER_APPLICATIONS_COLLECTION), {
        ...volunteerData,
        volunteerCode,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      return docRef.id
    } catch (err) {
      console.error('Error creating volunteer application:', err)
      throw err
    }
  }, [])

  const updateVolunteer = React.useCallback(async (id: string, updates: Partial<VolunteerApplication>) => {
    try {
      const docRef = doc(db, VOLUNTEER_APPLICATIONS_COLLECTION, id)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      return true
    } catch (err) {
      console.error('Error updating volunteer application:', err)
      throw err
    }
  }, [])

  const updateStatus = React.useCallback(async (
    id: string, 
    status: VolunteerStatus, 
    notes?: string,
    updatedBy?: string
  ) => {
    try {
      const docRef = doc(db, VOLUNTEER_APPLICATIONS_COLLECTION, id)
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

  const deleteVolunteer = React.useCallback(async (id: string) => {
    try {
      const docRef = doc(db, VOLUNTEER_APPLICATIONS_COLLECTION, id)
      await deleteDoc(docRef)
      return true
    } catch (err) {
      console.error('Error deleting volunteer application:', err)
      throw err
    }
  }, [])

  return {
    data,
    loading,
    error,
    createVolunteer,
    updateVolunteer,
    updateStatus,
    deleteVolunteer
  }
}
