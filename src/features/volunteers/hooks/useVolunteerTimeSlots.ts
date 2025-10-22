import * as React from 'react'
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { VOLUNTEER_HOURS_COLLECTION } from '../../../lib/config'
import type { VolunteerHours } from '../../events/types'

export function useVolunteerTimeSlots() {
  const [data, setData] = React.useState<VolunteerHours[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const q = query(
      collection(db, VOLUNTEER_HOURS_COLLECTION),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const timeSlots = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VolunteerHours[]
        setData(timeSlots)
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
        console.error('Error fetching volunteer time slots:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const getTimeSlotsStats = React.useCallback(() => {
    const total = data.length
    const confirmed = data.filter(slot => slot.status === 'checked-in' || slot.status === 'checked-out').length
    const pending = data.filter(slot => slot.status === 'pending').length
    const totalHours = data.reduce((sum, slot) => sum + (slot.totalHours || 0), 0)

    return {
      total,
      confirmed,
      pending,
      totalHours: Math.round(totalHours * 100) / 100
    }
  }, [data])

  const getTimeSlotsByDate = React.useCallback(() => {
    const grouped = data.reduce((acc, slot) => {
      if (slot.checkInTime) {
        const date = new Date(slot.checkInTime.seconds * 1000).toLocaleDateString()
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(slot)
      }
      return acc
    }, {} as Record<string, VolunteerHours[]>)

    return grouped
  }, [data])

  return {
    data,
    loading,
    error,
    getTimeSlotsStats,
    getTimeSlotsByDate
  }
}
