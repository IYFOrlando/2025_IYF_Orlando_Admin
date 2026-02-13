import * as React from 'react'
import { supabase } from '../../../lib/supabase'
import { logger } from '../../../lib/logger'
import { generateVolunteerCode } from '../../../lib/volunteerCodes'
import type { VolunteerApplication, VolunteerStatus } from '../types'

export function useVolunteerApplications() {
  const [data, setData] = React.useState<VolunteerApplication[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      const { data: rows, error: fetchError } = await supabase
        .from('volunteer_applications')
        .select('*')
        .order('createdAt', { ascending: false })

      if (fetchError) throw fetchError

      setData((rows || []).map(r => ({ id: r.id, ...r } as VolunteerApplication)))
      setError(null)
    } catch (err: any) {
      logger.error('Error fetching volunteer applications', err)
      setError(err)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { fetchData() }, [fetchData])

  const createVolunteer = React.useCallback(async (volunteerData: Omit<VolunteerApplication, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const volunteerCode = volunteerData.volunteerCode || generateVolunteerCode(6)
      const now = new Date().toISOString()

      const { data: row, error } = await supabase
        .from('volunteer_applications')
        .insert({
          ...volunteerData,
          volunteerCode,
          createdAt: now,
          updatedAt: now,
        })
        .select('id')
        .single()

      if (error) throw error
      await fetchData()
      return row.id
    } catch (err) {
      logger.error('Error creating volunteer application', err)
      throw err
    }
  }, [fetchData])

  const updateVolunteer = React.useCallback(async (id: string, updates: Partial<VolunteerApplication>) => {
    try {
      const { error } = await supabase
        .from('volunteer_applications')
        .update({ ...updates, updatedAt: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      await fetchData()
      return true
    } catch (err) {
      logger.error('Error updating volunteer application', err)
      throw err
    }
  }, [fetchData])

  const updateStatus = React.useCallback(async (
    id: string,
    status: VolunteerStatus,
    notes?: string,
    updatedBy?: string
  ) => {
    try {
      const { error } = await supabase
        .from('volunteer_applications')
        .update({
          status,
          notes: notes || null,
          updatedBy: updatedBy || null,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', id)

      if (error) throw error
      await fetchData()
      return true
    } catch (err) {
      logger.error('Error updating volunteer application status', err)
      throw err
    }
  }, [fetchData])

  const deleteVolunteer = React.useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('volunteer_applications')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchData()
      return true
    } catch (err) {
      logger.error('Error deleting volunteer application', err)
      throw err
    }
  }, [fetchData])

  return { data, loading, error, createVolunteer, updateVolunteer, updateStatus, deleteVolunteer }
}
