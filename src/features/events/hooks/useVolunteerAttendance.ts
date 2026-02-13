import * as React from 'react'
import { supabase } from '../../../lib/supabase'
import { logger } from '../../../lib/logger'
import type { VolunteerHours, HoursStatus } from '../types'

export function useVolunteerAttendance(eventId?: string) {
  const [data, setData] = React.useState<VolunteerHours[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      let q = supabase
        .from('volunteer_hours')
        .select('*')
        .order('createdAt', { ascending: false })

      if (eventId) {
        q = q.eq('eventId', eventId)
      }

      const { data: rows, error: fetchError } = await q
      if (fetchError) throw fetchError

      setData((rows || []).map(r => ({ id: r.id, ...r } as VolunteerHours)))
      setError(null)
    } catch (err: any) {
      logger.error('Error fetching volunteer attendance', err)
      setError(err)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [eventId])

  React.useEffect(() => { fetchData() }, [fetchData])

  const checkIn = React.useCallback(async (
    volunteerCode: string,
    volunteerName: string,
    volunteerEmail: string,
    eventId: string,
    eventName: string,
    location?: { latitude: number; longitude: number; accuracy?: number; address?: string }
  ) => {
    try {
      // Check if volunteer is already checked in today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStr = today.toISOString()
      const tomorrowStr = new Date(today.getTime() + 86400000).toISOString()

      const { data: existing } = await supabase
        .from('volunteer_hours')
        .select('id')
        .eq('volunteerId', volunteerCode)
        .eq('eventId', eventId)
        .gte('checkInTime', todayStr)
        .lt('checkInTime', tomorrowStr)
        .limit(1)

      if (existing && existing.length > 0) {
        throw new Error('Volunteer is already checked in today')
      }

      const now = new Date().toISOString()
      const { data: row, error } = await supabase
        .from('volunteer_hours')
        .insert({
          volunteerId: volunteerCode,
          volunteerName,
          volunteerEmail,
          eventId,
          eventName,
          checkInTime: now,
          checkInLocation: location || null,
          status: 'checked-in' as HoursStatus,
          createdAt: now,
          updatedAt: now,
        })
        .select('id')
        .single()

      if (error) throw error
      await fetchData()
      return row.id
    } catch (err) {
      logger.error('Error checking in volunteer', err)
      throw err
    }
  }, [fetchData])

  const checkOut = React.useCallback(async (
    hoursId: string,
    location?: { latitude: number; longitude: number; accuracy?: number; address?: string }
  ) => {
    try {
      const currentDoc = data.find(h => h.id === hoursId)
      if (!currentDoc || !currentDoc.checkInTime) {
        throw new Error('Check-in time not found')
      }

      // Parse checkInTime - could be ISO string or Firebase timestamp object
      let checkInMs: number
      if (typeof currentDoc.checkInTime === 'string') {
        checkInMs = new Date(currentDoc.checkInTime).getTime()
      } else if (currentDoc.checkInTime?.seconds) {
        checkInMs = currentDoc.checkInTime.seconds * 1000
      } else {
        checkInMs = new Date(currentDoc.checkInTime as any).getTime()
      }

      const checkOutTimeMs = Date.now()
      const totalHours = Math.round((checkOutTimeMs - checkInMs) / (1000 * 60 * 60) * 100) / 100
      const now = new Date().toISOString()

      const { error } = await supabase
        .from('volunteer_hours')
        .update({
          checkOutTime: now,
          checkOutLocation: location || null,
          totalHours,
          status: 'checked-out' as HoursStatus,
          updatedAt: now,
        })
        .eq('id', hoursId)

      if (error) throw error
      await fetchData()
      return true
    } catch (err) {
      logger.error('Error checking out volunteer', err)
      throw err
    }
  }, [data, fetchData])

  const getAttendanceStats = React.useCallback(() => {
    const total = data.length
    const checkedIn = data.filter(h => h.status === 'checked-in').length
    const checkedOut = data.filter(h => h.status === 'checked-out').length
    const totalHours = data.reduce((sum, h) => sum + (h.totalHours || 0), 0)
    return { total, checkedIn, checkedOut, totalHours: Math.round(totalHours * 100) / 100 }
  }, [data])

  const updateHours = React.useCallback(async (id: string, updates: Partial<VolunteerHours>) => {
    try {
      const { error } = await supabase
        .from('volunteer_hours')
        .update({ ...updates, updatedAt: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      await fetchData()
      return true
    } catch (err) {
      logger.error('Error updating volunteer hours', err)
      throw err
    }
  }, [fetchData])

  const deleteHours = React.useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('volunteer_hours')
        .delete()
        .eq('id', id)
      if (error) throw error
      await fetchData()
      return true
    } catch (err) {
      logger.error('Error deleting volunteer hours', err)
      throw err
    }
  }, [fetchData])

  return { data, loading, error, checkIn, checkOut, getAttendanceStats, updateHours, deleteHours }
}
