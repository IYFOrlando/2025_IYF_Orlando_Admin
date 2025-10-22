import * as React from 'react'
import { collection, onSnapshot, query, orderBy, where, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { VOLUNTEER_HOURS_COLLECTION } from '../../../lib/config'
import type { VolunteerHours, HoursStatus } from '../types'

export function useVolunteerAttendance(eventId?: string) {
  const [data, setData] = React.useState<VolunteerHours[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    let q
    if (eventId) {
      q = query(
        collection(db, VOLUNTEER_HOURS_COLLECTION),
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc')
      )
    } else {
      q = query(
        collection(db, VOLUNTEER_HOURS_COLLECTION),
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
        // Handle permissions error gracefully
        if (err.code === 'permission-denied' || err.message.includes('permissions')) {
          // User doesn't have permissions to read volunteer hours - use empty array
          setData([])
          setError(null)
          setLoading(false)
          return
        }
        
        // For other errors, still log but don't show to user unless critical
        console.error('Error fetching volunteer attendance:', err)
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
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = Math.floor(today.getTime() / 1000)
      const todayEnd = todayStart + 86400 // 24 hours

      const existingHours = data.find(hours => 
        hours.volunteerId === volunteerCode &&
        hours.eventId === eventId &&
        hours.checkInTime &&
        hours.checkInTime.seconds >= todayStart &&
        hours.checkInTime.seconds < todayEnd
      )

      if (existingHours) {
        throw new Error('Volunteer is already checked in today')
      }

      const docRef = await addDoc(collection(db, VOLUNTEER_HOURS_COLLECTION), {
        volunteerId: volunteerCode,
        volunteerName,
        volunteerEmail,
        eventId,
        eventName,
        checkInTime: serverTimestamp(),
        status: 'checked-in' as HoursStatus,
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
      const docRef = doc(db, VOLUNTEER_HOURS_COLLECTION, hoursId)
      const checkOutTime = serverTimestamp()
      
      // Get the current document to calculate total hours
      const currentDoc = data.find(h => h.id === hoursId)
      if (!currentDoc || !currentDoc.checkInTime) {
        throw new Error('Check-in time not found')
      }

      const checkInTime = currentDoc.checkInTime.seconds * 1000
      const checkOutTimeMs = Date.now()
      const totalHours = Math.round((checkOutTimeMs - checkInTime) / (1000 * 60 * 60) * 100) / 100

      await updateDoc(docRef, {
        checkOutTime,
        totalHours,
        status: 'checked-out' as HoursStatus,
        updatedAt: serverTimestamp()
      })

      return true
    } catch (err) {
      console.error('Error checking out volunteer:', err)
      throw err
    }
  }, [data])

  const getAttendanceStats = React.useCallback(() => {
    const total = data.length
    const checkedIn = data.filter(h => h.status === 'checked-in').length
    const checkedOut = data.filter(h => h.status === 'checked-out').length
    const totalHours = data.reduce((sum, h) => sum + (h.totalHours || 0), 0)

    return {
      total,
      checkedIn,
      checkedOut,
      totalHours: Math.round(totalHours * 100) / 100
    }
  }, [data])

  return {
    data,
    loading,
    error,
    checkIn,
    checkOut,
    getAttendanceStats
  }
}
