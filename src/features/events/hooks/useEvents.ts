import * as React from 'react'
import { collection, onSnapshot, query, orderBy, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { Event, EventStatus } from '../types'

const EVENTS_COLLECTION = 'events'

export function useEvents() {
  const [data, setData] = React.useState<Event[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    const q = query(
      collection(db, EVENTS_COLLECTION),
      orderBy('date', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const events = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Event[]
        setData(events)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error fetching events:', err)
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const createEvent = React.useCallback(async (eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
        ...eventData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      return docRef.id
    } catch (err) {
      console.error('Error creating event:', err)
      throw err
    }
  }, [])

  const updateEvent = React.useCallback(async (id: string, updates: Partial<Event>) => {
    try {
      const docRef = doc(db, EVENTS_COLLECTION, id)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
      return true
    } catch (err) {
      console.error('Error updating event:', err)
      throw err
    }
  }, [])

  const updateEventStatus = React.useCallback(async (id: string, status: EventStatus) => {
    try {
      const docRef = doc(db, EVENTS_COLLECTION, id)
      await updateDoc(docRef, {
        status,
        updatedAt: serverTimestamp()
      })
      return true
    } catch (err) {
      console.error('Error updating event status:', err)
      throw err
    }
  }, [])

  return {
    data,
    loading,
    error,
    createEvent,
    updateEvent,
    updateEventStatus
  }
}
