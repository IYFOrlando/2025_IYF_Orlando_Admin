import * as React from 'react'
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { VOLUNTEER_SCHEDULE_COLLECTION } from '../../../lib/config'
import type { VolunteerSchedule } from '../types'

export function useVolunteerSchedule() {
  const [data, setData] = React.useState<VolunteerSchedule[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const q = query(
      collection(db, VOLUNTEER_SCHEDULE_COLLECTION)
      // Removed orderBy to avoid potential issues with missing createdAt field
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log('🔄 useVolunteerSchedule: Data updated, snapshot size:', snapshot.size)
        const schedule = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VolunteerSchedule[]
        console.log('📊 useVolunteerSchedule: Processed schedule data:', schedule.length, 'items')
        setData(schedule)
        setLoading(false)
        setError(null)
      },
      (err) => {
        // Handle permissions error gracefully
        if (err.code === 'permission-denied' || err.message.includes('permissions')) {
          // User doesn't have permissions to read volunteer schedule - use empty array
          setData([])
          setError(null)
          setLoading(false)
          return
        }
        
        // For other errors, still log but don't show to user unless critical
        console.error('Error fetching volunteer schedule:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const getScheduleStats = React.useCallback(() => {
    const total = data.length
    const confirmed = data.filter(slot => slot.status === 'confirmed' || slot.status === 'completed').length
    const pending = data.filter(slot => slot.status === 'scheduled').length
    const cancelled = data.filter(slot => slot.status === 'cancelled').length

    return {
      total,
      confirmed,
      pending,
      cancelled
    }
  }, [data])

  const getScheduleByDate = React.useCallback(() => {
    const grouped = data.reduce((acc, slot) => {
      if (slot.date) {
        const date = new Date(slot.date).toLocaleDateString()
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(slot)
      }
      return acc
    }, {} as Record<string, VolunteerSchedule[]>)

    return grouped
  }, [data])

  const getPreEventSchedule = React.useCallback(() => {
    // Since there's only one event (Taste of Korea Pre-Event), return all data
    return data
  }, [data])

  const deleteSchedule = React.useCallback(async (id: string) => {
    try {
      const docRef = doc(db, VOLUNTEER_SCHEDULE_COLLECTION, id)
      await deleteDoc(docRef)
      return true
    } catch (err) {
      console.error('Error deleting volunteer schedule:', err)
      throw err
    }
  }, [])

  const updateSchedule = React.useCallback(async (id: string, updates: Partial<VolunteerSchedule>) => {
    try {
      const docRef = doc(db, VOLUNTEER_SCHEDULE_COLLECTION, id)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      return true
    } catch (err) {
      console.error('Error updating volunteer schedule:', err)
      throw err
    }
  }, [])

  const cancelSchedule = React.useCallback(async (id: string) => {
    try {
      const docRef = doc(db, VOLUNTEER_SCHEDULE_COLLECTION, id)
      await updateDoc(docRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      })
      return true
    } catch (err) {
      console.error('Error cancelling volunteer schedule:', err)
      throw err
    }
  }, [])

  return {
    data,
    loading,
    error,
    getScheduleStats,
    getScheduleByDate,
    getPreEventSchedule,
    deleteSchedule,
    updateSchedule,
    cancelSchedule
  }
}
