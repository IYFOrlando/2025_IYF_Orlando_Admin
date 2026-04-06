import * as React from 'react'
import { supabase } from '../../../lib/supabase'
import { logger } from '../../../lib/logger'
import { generateVolunteerCode } from '../../../lib/volunteerCodes'
import type { VolunteerApplication, VolunteerStatus } from '../types'

export function useVolunteerApplications() {
  const [data, setData] = React.useState<VolunteerApplication[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  // Map lowercase DB columns to camelCase for UI
  const mapRow = (r: any): VolunteerApplication => ({
    id: r.id,
    firstName: r.firstname || '',
    lastName: r.lastname || '',
    email: r.email || '',
    gender: r.gender || '',
    tshirtSize: r.tshirtsize || '',
    emergencyContact: r.emergencycontact || '',
    emergencyPhone: r.emergencyphone || '',
    volunteerCode: r.volunteercode || '',
    source: r.source || '',
    eventInfoAccepted: r.eventinfoaccepted || false,
    termsAccepted: r.termsaccepted || false,
    age: r.age,
    phone: r.cellnumber || '',
    city: r.city || '',
    availability: r.availability,
    interests: r.interests,
    skills: r.skills,
    languages: r.languages,
    status: r.status || 'pending',
    notes: r.notes || '',
    createdAt: r.createdat,
    updatedAt: r.updatedat,
  })

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true)
      const { data: rows, error: fetchError } = await supabase
        .from('volunteer_applications')
        .select('*')
        .order('createdat', { ascending: false })

      if (fetchError) throw fetchError

      setData((rows || []).map(mapRow))
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

      // Map camelCase fields to lowercase DB column names
      const dbData: Record<string, any> = {}
      for (const [key, val] of Object.entries(volunteerData)) {
        dbData[key.toLowerCase()] = val
      }
      dbData.volunteercode = volunteerCode
      dbData.createdat = now
      dbData.updatedat = now

      const { data: row, error } = await supabase
        .from('volunteer_applications')
        .insert(dbData)
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
      // Map camelCase fields to lowercase DB column names
      const dbUpdates: Record<string, any> = {}
      for (const [key, val] of Object.entries(updates)) {
        if (key === 'id') continue
        dbUpdates[key.toLowerCase()] = val
      }
      dbUpdates.updatedat = new Date().toISOString()

      const { error } = await supabase
        .from('volunteer_applications')
        .update(dbUpdates)
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
          updatedby: updatedBy || null,
          updatedat: new Date().toISOString(),
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
