import * as React from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { logger } from '../../../lib/logger'

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
          // The document ID might be the teacherKey (e.g., "Korean Cooking")
          // If academy field is missing, try to infer from document ID
          let academy = data.academy || ''
          if (!academy && doc.id) {
            // Try to extract academy from document ID (format: "Academy_Level" or just "Academy")
            const parts = doc.id.split('_')
            if (parts.length > 1) {
              // Has level: reconstruct academy name
              academy = parts.slice(0, -1).join('_')
            } else {
              // No level: document ID is the academy
              academy = doc.id
            }
          }
          
          instructorsData.push({
            id: doc.id,
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            academy: academy,
            level: data.level || null,
            credentials: data.credentials || '',
            updatedAt: data.updatedAt
          })
        })
        
        // Helper to normalize (local function for use in this effect)
        const normalize = (str: string) => (str || '').trim().toLowerCase()
        
        // Debug: Log all instructors, especially Korean Cooking
        const koreanCookingInstructors = instructorsData.filter(i => {
          const normalized = normalize(i.academy)
          return normalized.includes('korean') && normalized.includes('cooking')
        })
        if (koreanCookingInstructors.length > 0) {
          logger.debug('Found Korean Cooking instructors in database', {
            count: koreanCookingInstructors.length,
            instructors: koreanCookingInstructors.map(i => ({
              id: i.id,
              academy: i.academy,
              normalized: normalize(i.academy),
              name: i.name,
              level: i.level
            }))
          })
        } else {
          logger.warn('NO Korean Cooking instructors found in database', {
            totalInstructors: instructorsData.length,
            allAcademies: instructorsData.map(i => i.academy),
            allInstructorIds: instructorsData.map(i => i.id)
          })
        }
        
        setInstructors(instructorsData)
        setLoading(false)
        setError(null)
        
        // EXPOSE to window for debugging in console (only once)
        if (typeof window !== 'undefined' && !(window as any).INSTRUCTORS_DEBUG) {
          (window as any).INSTRUCTORS_DEBUG = {
            getAll: () => {
              const table = instructorsData.map(i => ({
                id: i.id,
                academy: i.academy || '(empty)',
                level: i.level || '(none)',
                name: i.name || '(empty)',
                email: i.email || '(none)',
                phone: i.phone || '(none)',
                credentials: i.credentials || '(none)'
              }))
              console.table(table)
              console.log('Full data:', instructorsData)
              return instructorsData
            },
            findByAcademy: (academy: string) => {
              const normalized = (academy || '').trim().toLowerCase()
              const found = instructorsData.filter(i => {
                const instAcademy = (i.academy || '').trim().toLowerCase()
                const instId = (i.id || '').trim().toLowerCase()
                return instAcademy.includes(normalized) || instId.includes(normalized)
              })
              console.log(`Found ${found.length} instructor(s) for "${academy}":`, found)
              console.table(found.map(i => ({
                id: i.id,
                academy: i.academy || '(empty)',
                level: i.level || '(none)',
                name: i.name || '(empty)',
                email: i.email || '(none)',
                phone: i.phone || '(none)',
                credentials: i.credentials || '(none)'
              })))
              return found
            },
            findKoreanCooking: () => {
              const found = instructorsData.filter(i => {
                const academy = (i.academy || '').toLowerCase()
                const id = (i.id || '').toLowerCase()
                return (academy.includes('korean') && academy.includes('cooking')) ||
                       (id.includes('korean') && id.includes('cooking'))
              })
              console.log(`Found ${found.length} Korean Cooking instructor(s):`, found)
              console.table(found.map(i => ({
                id: i.id,
                academy: i.academy || '(empty)',
                level: i.level || '(none)',
                name: i.name || '(empty)',
                email: i.email || '(none)',
                phone: i.phone || '(none)',
                credentials: i.credentials || '(none)'
              })))
              return found
            }
          }
        }
        
        // Auto-log Korean Cooking instructors (only once per load)
        if (typeof window !== 'undefined') {
          const kcInstructors = instructorsData.filter(i => {
            const academy = (i.academy || '').toLowerCase()
            const id = (i.id || '').toLowerCase()
            return (academy.includes('korean') && academy.includes('cooking')) ||
                   (id.includes('korean') && id.includes('cooking'))
          })
          
          // Log Korean Cooking instructors for debugging (only in development)
          if (kcInstructors.length > 0) {
            logger.debug('Korean Cooking instructors loaded', {
              count: kcInstructors.length,
              instructors: kcInstructors.map(i => ({
                id: i.id,
                academy: i.academy,
                name: i.name
              }))
            })
          } else {
            logger.debug('No Korean Cooking instructors found in database', {
              totalInstructors: instructorsData.length
            })
          }
        }
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
    const normalizedAcademy = normalizeAcademyName(academy)
    
    // Debug logging for Korean Language
    const isKoreanLanguage = normalizedAcademy.includes('korean') && normalizedAcademy.includes('language')
    
    if (level) {
      // For academies with levels (like Korean Language), look for academy_level combination
      // Strategy 1: Match by academy and level exactly
      let instructor = instructors.find(inst => {
        const normalizedInstAcademy = normalizeAcademyName(inst.academy)
        return normalizedInstAcademy === normalizedAcademy && inst.level === level
      })
      
      if (isKoreanLanguage && !instructor) {
        logger.debug('Korean Language instructor lookup (Strategy 1 failed)', {
          academy,
          normalizedAcademy,
          level,
          availableInstructors: instructors
            .filter(i => normalizeAcademyName(i.academy).includes('korean') && normalizeAcademyName(i.academy).includes('language'))
            .map(i => ({ id: i.id, academy: i.academy, level: i.level, name: i.name, hasCredentials: !!i.credentials }))
        })
      }
      
      // Strategy 2: Match by document ID (format: "Academy_Level")
      if (!instructor) {
        const expectedId = `${academy}_${level}`
        instructor = instructors.find(inst => {
          const normalizedId = normalizeAcademyName(inst.id)
          return normalizedId === normalizeAcademyName(expectedId)
        })
      }
      
      // Strategy 3: Match by academy name in ID and level
      if (!instructor) {
        instructor = instructors.find(inst => {
          const normalizedId = normalizeAcademyName(inst.id)
          const normalizedAcademyInId = normalizedId.split('_')[0] || normalizedId
          return normalizedAcademyInId === normalizedAcademy && inst.level === level
        })
      }
      
      // Log when instructor is found for Korean Language
      if (isKoreanLanguage && instructor) {
        logger.debug('Korean Language instructor FOUND', {
          academy,
          normalizedAcademy,
          level,
          instructorId: instructor.id,
          instructorAcademy: instructor.academy,
          instructorLevel: instructor.level,
          instructorName: instructor.name,
          hasCredentials: !!instructor.credentials,
          credentials: instructor.credentials || '(empty)'
        })
      }
      
      return instructor
    } else {
      // For academies without levels, try multiple strategies
      // Strategy 1: Exact match by academy field with no level
      let instructor = instructors.find(inst => {
        const normalizedInstAcademy = normalizeAcademyName(inst.academy)
        const hasNoLevel = !inst.level || inst.level === null || inst.level === ''
        return normalizedInstAcademy === normalizedAcademy && hasNoLevel
      })
      
      // Strategy 2: Match by document ID (document ID might be the academy name)
      if (!instructor) {
        instructor = instructors.find(inst => {
          const normalizedId = normalizeAcademyName(inst.id)
          return normalizedId === normalizedAcademy
        })
      }
      
      // Strategy 3: Match any instructor for this academy (ignore level)
      if (!instructor) {
        instructor = instructors.find(inst => {
          const normalizedInstAcademy = normalizeAcademyName(inst.academy)
          return normalizedInstAcademy === normalizedAcademy
        })
      }
      
      // Strategy 4: Match by academy name in document ID (extract academy from ID)
      if (!instructor) {
        instructor = instructors.find(inst => {
          const normalizedId = normalizeAcademyName(inst.id)
          // Extract academy from ID (e.g., "Korean Cooking" from "Korean Cooking" or "Academy_Level" -> "Academy")
          const parts = normalizedId.split('_')
          const academyFromId = parts.length > 1 ? parts.slice(0, -1).join('_') : normalizedId
          return academyFromId === normalizedAcademy
        })
      }
      
      return instructor
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
