import * as React from 'react'
import { collection, onSnapshot, query, orderBy, where, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { VolunteerCode } from '../types'

const CODES_COLLECTION = 'volunteer_codes'

export function useVolunteerCodes(eventId?: string) {
  const [data, setData] = React.useState<VolunteerCode[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    let q
    if (eventId) {
      q = query(
        collection(db, CODES_COLLECTION),
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc')
      )
    } else {
      q = query(
        collection(db, CODES_COLLECTION),
        orderBy('createdAt', 'desc')
      )
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const codes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VolunteerCode[]
        setData(codes)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching volunteer codes:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [eventId])

  const createCode = React.useCallback(async (
    volunteerName: string,
    volunteerEmail: string,
    eventId: string
  ) => {
    try {
      // Generate a simple 4-digit code
      const code = Math.floor(1000 + Math.random() * 9000).toString()
      
      const docRef = await addDoc(collection(db, CODES_COLLECTION), {
        code,
        volunteerName,
        volunteerEmail,
        eventId,
        isActive: true,
        createdAt: serverTimestamp()
      })
      return docRef.id
    } catch (err) {
      console.error('Error creating volunteer code:', err)
      throw err
    }
  }, [])

  const updateCode = React.useCallback(async (id: string, updates: Partial<VolunteerCode>) => {
    try {
      const docRef = doc(db, CODES_COLLECTION, id)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      return true
    } catch (err) {
      console.error('Error updating volunteer code:', err)
      throw err
    }
  }, [])

  const getVolunteerByCode = React.useCallback((code: string) => {
    return data.find(volunteer => volunteer.code === code && volunteer.isActive)
  }, [data])

  return {
    data,
    loading,
    error,
    createCode,
    updateCode,
    getVolunteerByCode
  }
}
