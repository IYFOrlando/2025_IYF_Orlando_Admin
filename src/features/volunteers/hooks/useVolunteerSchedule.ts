import * as React from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { VOLUNTEER_SCHEDULE_COLLECTION } from '../../../lib/config'
import type { VolunteerSchedule } from '../types'

export function useVolunteerSchedule() {
  const [data, setData] = React.useState<VolunteerSchedule[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const q = query(
      collection(db, VOLUNTEER_SCHEDULE_COLLECTION),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const schedule = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VolunteerSchedule[]
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

  return {
    data,
    loading,
    error,
    getScheduleStats,
    getScheduleByDate,
    getPreEventSchedule
  }
}
