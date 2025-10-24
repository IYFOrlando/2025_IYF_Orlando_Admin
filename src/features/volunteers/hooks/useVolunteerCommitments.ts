import * as React from 'react'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { VOLUNTEER_COMMITMENTS_COLLECTION } from '../../../lib/config'

export interface VolunteerCommitment {
  id: string
  volunteerId?: string
  volunteerName?: string
  volunteerEmail?: string
  email?: string  // The actual field name in the database
  commitmentResponse: string
  createdAt?: {
    seconds: number
    nanoseconds: number
  }
  updatedAt?: {
    seconds: number
    nanoseconds: number
  }
}

export function useVolunteerCommitments() {
  const [data, setData] = React.useState<VolunteerCommitment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const q = query(
      collection(db, VOLUNTEER_COMMITMENTS_COLLECTION)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const commitments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VolunteerCommitment[]
        setData(commitments)
        setLoading(false)
        setError(null)
      },
      (err) => {
        // Handle permissions error gracefully
        if (err.code === 'permission-denied' || err.message.includes('permissions')) {
          // User doesn't have permissions to read volunteer commitments - use empty array
          setData([])
          setError(null)
          setLoading(false)
          return
        }
        
        // For other errors, still log but don't show to user unless critical
        console.error('Error fetching volunteer commitments:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const getCommitmentByVolunteerId = React.useCallback((volunteerId: string) => {
    return data.find(commitment => commitment.volunteerId === volunteerId)
  }, [data])

  const getCommitmentByVolunteerEmail = React.useCallback((volunteerEmail: string) => {
    return data.find(commitment => 
      commitment.email === volunteerEmail || commitment.volunteerEmail === volunteerEmail
    )
  }, [data])

  return {
    data,
    loading,
    error,
    getCommitmentByVolunteerId,
    getCommitmentByVolunteerEmail
  }
}
