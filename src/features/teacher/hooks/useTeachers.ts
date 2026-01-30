
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
      
      // Deduplicate by email (primary key)
      // Keep the first occurrence of each unique email
      const uniqueTeachers = teachersData.reduce((acc, teacher) => {
        const existing = acc.find(t => t.email.toLowerCase() === teacher.email.toLowerCase())
        if (!existing) {
          acc.push(teacher)
        }
        return acc
      }, [] as Teacher[])
      
      setTeachers(uniqueTeachers)
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
