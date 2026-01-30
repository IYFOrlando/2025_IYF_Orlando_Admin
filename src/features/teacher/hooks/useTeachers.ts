
import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../../lib/firebase'

export interface Teacher {
  id: string
  name: string
  email: string
  phone: string
  credentials?: string
  photoURL?: string
  bio?: string
  subjects?: string[]
}

export const useTeachers = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'teachers'), orderBy('name', 'asc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teachersData: Teacher[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        teachersData.push({
          id: doc.id,
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          credentials: data.credentials || data.instructorBio || '',
          photoURL: data.photoURL || '',
          bio: data.bio || '',
          subjects: data.subjects || [],
          // Normalize legacy fields if present
          ...data
        } as Teacher)
      })
      setTeachers(teachersData)
      setLoading(false)
    }, (err) => {
      console.error('Error fetching teachers:', err)
      setError('Failed to fetch teachers')
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return { teachers, loading, error }
}
