import * as React from 'react'
import { collection, onSnapshot, query, orderBy, where, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { VolunteerHours, HoursStatus } from '../types'

const HOURS_COLLECTION = 'volunteer_hours'

export function useVolunteerHours(eventId?: string) {
  const [data, setData] = React.useState<VolunteerHours[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    let q
    if (eventId) {
      q = query(
        collection(db, HOURS_COLLECTION),
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc')
      )
    } else {
      q = query(
        collection(db, HOURS_COLLECTION),
        orderBy('createdAt', 'desc')
      )
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const hours = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VolunteerHours[]
        setData(hours)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching volunteer hours:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [eventId])

  const checkIn = React.useCallback(async (
    volunteerCode: string,
    volunteerName: string,
    volunteerEmail: string,
    eventId: string,
    eventName: string
  ) => {
    try {
      // Check if volunteer is already checked in today
      const today = new Date().toDateString()
      const existingHours = data.find(h => 
        h.volunteerId === volunteerCode && 
        h.eventId === eventId && 
        h.status === 'checked-in' &&
        new Date(h.checkInTime?.seconds * 1000).toDateString() === today
      )

      if (existingHours) {
        throw new Error('Volunteer is already checked in today')
      }

      const docRef = await addDoc(collection(db, HOURS_COLLECTION), {
        volunteerId: volunteerCode,
        volunteerName,
        volunteerEmail,
        eventId,
        eventName,
        checkInTime: serverTimestamp(),
        status: 'checked-in',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      return docRef.id
    } catch (err) {
      console.error('Error checking in volunteer:', err)
      throw err
    }
  }, [data])

  const checkOut = React.useCallback(async (hoursId: string) => {
    try {
      const docRef = doc(db, HOURS_COLLECTION, hoursId)
      const checkOutTime = serverTimestamp()
      
      await updateDoc(docRef, {
        checkOutTime,
        status: 'checked-out',
        updatedAt: serverTimestamp()
      })

      // Calculate total hours
      const hoursRecord = data.find(h => h.id === hoursId)
      if (hoursRecord?.checkInTime) {
        const checkInTime = new Date(hoursRecord.checkInTime.seconds * 1000)
        const totalHours = (Date.now() - checkInTime.getTime()) / (1000 * 60 * 60) // Convert to hours
        
        await updateDoc(docRef, {
          totalHours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
          status: 'completed'
        })
      }

      return true
    } catch (err) {
      console.error('Error checking out volunteer:', err)
      throw err
    }
  }, [data])

  const updateHours = React.useCallback(async (id: string, updates: Partial<VolunteerHours>) => {
    try {
      const docRef = doc(db, HOURS_COLLECTION, id)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      return true
    } catch (err) {
      console.error('Error updating volunteer hours:', err)
      throw err
    }
  }, [])

  return {
    data,
    loading,
    error,
    checkIn,
    checkOut,
    updateHours
  }
}
