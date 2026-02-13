import * as React from 'react'
import { supabase } from '../../../lib/supabase'
import { logger } from '../../../lib/logger'
import type { VolunteerSchedule } from '../types'

export function useVolunteerSchedule() {
  const [data, setData] = React.useState<VolunteerSchedule[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      const { data: rows, error: fetchError } = await supabase
        .from('volunteer_schedule')
        .select('*')

      if (fetchError) throw fetchError

      setData((rows || []).map(r => ({ id: r.id, ...r } as VolunteerSchedule)))
      setError(null)
    } catch (err: any) {
      logger.error('Error fetching volunteer schedule', err)
      setError(err)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { fetchData() }, [fetchData])

  const getScheduleStats = React.useCallback(() => {
    const total = data.length
    const confirmed = data.filter(slot => slot.status === 'confirmed' || slot.status === 'completed').length
    const pending = data.filter(slot => slot.status === 'scheduled').length
    const cancelled = data.filter(slot => slot.status === 'cancelled').length
    return { total, confirmed, pending, cancelled }
  }, [data])

  const getScheduleByDate = React.useCallback(() => {
    return data.reduce((acc, slot) => {
      if (slot.date) {
        const date = new Date(slot.date).toLocaleDateString()
        if (!acc[date]) acc[date] = []
        acc[date].push(slot)
      }
      return acc
    }, {} as Record<string, VolunteerSchedule[]>)
  }, [data])

  const getPreEventSchedule = React.useCallback(() => data, [data])

  const deleteSchedule = React.useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('volunteer_schedule')
        .delete()
        .eq('id', id)
      if (error) throw error
      await fetchData()
      return true
    } catch (err) {
      logger.error('Error deleting volunteer schedule', err)
      throw err
    }
  }, [fetchData])

  const updateSchedule = React.useCallback(async (id: string, updates: Partial<VolunteerSchedule>) => {
    try {
      const { error } = await supabase
        .from('volunteer_schedule')
        .update({ ...updates, updatedAt: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      await fetchData()
      return true
    } catch (err) {
      logger.error('Error updating volunteer schedule', err)
      throw err
    }
  }, [fetchData])

  const cancelSchedule = React.useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('volunteer_schedule')
        .update({ status: 'cancelled', updatedAt: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      await fetchData()
      return true
    } catch (err) {
      logger.error('Error cancelling volunteer schedule', err)
      throw err
    }
  }, [fetchData])

  return { data, loading, error, getScheduleStats, getScheduleByDate, getPreEventSchedule, deleteSchedule, updateSchedule, cancelSchedule }
}
