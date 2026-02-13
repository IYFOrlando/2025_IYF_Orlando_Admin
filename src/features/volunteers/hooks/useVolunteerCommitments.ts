import * as React from 'react'
import { supabase } from '../../../lib/supabase'
import { logger } from '../../../lib/logger'

export interface VolunteerCommitment {
  id: string
  volunteerId?: string
  volunteerName?: string
  volunteerEmail?: string
  email?: string
  commitmentResponse: string
  createdAt?: any
  updatedAt?: any
}

export function useVolunteerCommitments() {
  const [data, setData] = React.useState<VolunteerCommitment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const fetch = async () => {
      try {
        const { data: rows, error: fetchError } = await supabase
          .from('volunteer_commitments')
          .select('*')

        if (fetchError) throw fetchError

        setData((rows || []).map(r => ({ id: r.id, ...r } as VolunteerCommitment)))
        setError(null)
      } catch (err: any) {
        logger.error('Error fetching volunteer commitments', err)
        setError(err)
        setData([])
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const getCommitmentByVolunteerId = React.useCallback((volunteerId: string) => {
    return data.find(commitment => commitment.volunteerId === volunteerId)
  }, [data])

  const getCommitmentByVolunteerEmail = React.useCallback((volunteerEmail: string) => {
    return data.find(commitment =>
      commitment.email === volunteerEmail || commitment.volunteerEmail === volunteerEmail
    )
  }, [data])

  return { data, loading, error, getCommitmentByVolunteerId, getCommitmentByVolunteerEmail }
}
