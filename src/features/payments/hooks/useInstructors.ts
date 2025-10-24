import * as React from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../../../lib/firebase'

export type Instructor = {
  id: string
  name: string
  email?: string
  phone?: string
  academy: string
  level?: string | null
  credentials?: string
  updatedAt?: any
}

export function useInstructors() {
  const [instructors, setInstructors] = React.useState<Instructor[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const instructorsRef = collection(db, 'teachers')
    const q = query(instructorsRef, orderBy('name'))
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const instructorsData: Instructor[] = []
        
        snapshot.forEach((doc) => {
          const data = doc.data()
          instructorsData.push({
            id: doc.id,
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            academy: data.academy || '',
            level: data.level || null,
            credentials: data.credentials || '',
            updatedAt: data.updatedAt
          })
        })
        
        setInstructors(instructorsData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error loading instructors:', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  // Helper function to get instructor by academy and level
  const getInstructorByAcademy = React.useCallback((academy: string, level?: string | null): Instructor | undefined => {
    if (level) {
      // For Korean language, look for academy_level combination
      return instructors.find(inst => 
        inst.academy === academy && inst.level === level
      )
    } else {
      // For other academies, just match academy
      return instructors.find(inst => 
        inst.academy === academy && !inst.level
      )
    }
  }, [instructors])

  // Helper function to get all instructors for an academy
  const getInstructorsByAcademy = React.useCallback((academy: string): Instructor[] => {
    return instructors.filter(inst => inst.academy === academy)
  }, [instructors])

  return {
    instructors,
    loading,
    error,
    getInstructorByAcademy,
    getInstructorsByAcademy
  }
}
