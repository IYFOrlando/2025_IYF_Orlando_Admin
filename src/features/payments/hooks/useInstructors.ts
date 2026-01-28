import * as React from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { logger } from '../../../lib/logger'
import { COLLECTIONS_CONFIG } from '../../../config/shared.js'
import { norm } from '../../../lib/query'

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
    // Read from academies_2026_spring (single source of truth for teachers)
    const academyCollectionName = COLLECTIONS_CONFIG.academies2026Spring || 'academies_2026_spring'
    const academiesRef = collection(db, academyCollectionName)
    const q = query(academiesRef, orderBy('order', 'asc'))
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const instructorsData: Instructor[] = []
        
        snapshot.forEach((doc) => {
          const academyData = doc.data()
          const academyName = academyData.name || ''
          
          // Get teacher data from academy document
          // Structure: academy.teacher can be an object with { name, email, phone, credentials }
          // or for Korean Language, academy.levels[].teacher
          if (academyData.teacher) {
            // Single teacher for the academy
            const teacher = academyData.teacher
            instructorsData.push({
              id: `${academyName}_main`,
              name: teacher.name || '',
              email: teacher.email || '',
              phone: teacher.phone || '',
              academy: academyName,
              level: null,
              credentials: teacher.credentials || '',
              updatedAt: academyData.updatedAt
            })
          }
          
          // For academies with levels (like Korean Language), check each level
          if (academyData.levels && Array.isArray(academyData.levels)) {
            academyData.levels.forEach((levelData: any) => {
              if (levelData.teacher) {
                const teacher = levelData.teacher
                instructorsData.push({
                  id: `${academyName}_${levelData.name || ''}`,
                  name: teacher.name || '',
                  email: teacher.email || '',
                  phone: teacher.phone || '',
                  academy: academyName,
                  level: levelData.name || null,
                  credentials: teacher.credentials || '',
                  updatedAt: academyData.updatedAt
                })
              }
            })
          }
        })
        
        setInstructors(instructorsData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        logger.error('Error loading instructors', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  // Helper function to normalize academy names for matching
  const normalizeAcademyName = React.useCallback((academy: string): string => {
    if (!academy) return ''
    return academy.trim().toLowerCase()
  }, [])

  // Helper function to get instructor by academy and level
  const getInstructorByAcademy = React.useCallback((academy: string, level?: string | null): Instructor | undefined => {
    if (!academy) return undefined
    
    const normalizedAcademy = normalizeAcademyName(academy)
    const normalizedLevel = level ? level.trim() : null
    
    // For academies with levels (like Korean Language)
    if (normalizedLevel) {
      // Match by academy name and level exactly
      const instructor = instructors.find(inst => {
        const normalizedInstAcademy = normalizeAcademyName(inst.academy)
        return normalizedInstAcademy === normalizedAcademy && inst.level === normalizedLevel
      })
      return instructor
    } else {
      // For academies without levels, find instructor with no level or "_main" suffix
      // Strategy 1: Exact match by academy with no level
      let instructor = instructors.find(inst => {
        const normalizedInstAcademy = normalizeAcademyName(inst.academy)
        const hasNoLevel = !inst.level || inst.level === null || inst.level === ''
        return normalizedInstAcademy === normalizedAcademy && hasNoLevel
      })
      
      // Strategy 2: Match by ID format "AcademyName_main"
      if (!instructor) {
        instructor = instructors.find(inst => {
          const normalizedId = normalizeAcademyName(inst.id)
          return normalizedId === `${normalizedAcademy}_main` || normalizedId === normalizedAcademy
        })
      }
      
      // Strategy 3: Match any instructor for this academy (take first one)
      if (!instructor) {
        instructor = instructors.find(inst => {
          const normalizedInstAcademy = normalizeAcademyName(inst.academy)
          return normalizedInstAcademy === normalizedAcademy
        })
      }
      
      return instructor
    }
  }, [instructors, normalizeAcademyName])

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
