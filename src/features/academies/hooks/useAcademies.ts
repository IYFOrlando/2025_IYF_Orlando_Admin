import { useState, useEffect, useCallback } from 'react'
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { COLLECTIONS_CONFIG } from '../../../config/shared'

export type AcademyLevel = {
  name: string
  schedule: string
  order: number
  teacher?: {
    name: string
    email: string
    phone: string
    credentials?: string
  }
}

export type Academy = {
  id: string
  name: string
  price: number
  schedule: string
  hasLevels: boolean
  levels?: AcademyLevel[]
  order: number
  enabled: boolean
  description: string
  teacher?: {
    name: string
    email: string
    phone: string
    credentials?: string
  }
  // Additional fields from Firebase
  active?: boolean // Note: might be duplicate of enabled
  image?: string
  tag?: string
  catchPhrase?: string
  goal?: string[]
  age?: string
  equipment?: string
  requirements?: string[]
  gallery?: string[]
  desc1?: string
  desc2?: string
  desc3?: string
  linkName?: string
  // Legacy frontend compatibility
  instructor?: string
  instructorBio?: string
}

export type AcademyInput = Omit<Academy, 'id'>

export function useAcademies() {
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use the configuration from shared.js
  const collectionName = COLLECTIONS_CONFIG.academies2026Spring || 'academies_2026_spring'

  // Fetch academies
  useEffect(() => {
    setLoading(true)
    const academiesRef = collection(db, collectionName)
    const q = query(academiesRef, orderBy('order', 'asc'))

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const academiesData: Academy[] = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          academiesData.push({
            id: doc.id,
            name: data.name || '',
            price: data.price || 0,
            schedule: data.schedule || '',
            hasLevels: data.hasLevels || false,
            levels: data.levels || [],
            order: data.order || 999,
            enabled: data.enabled !== false,
            description: data.description || '',
            teacher: data.teacher || undefined,
            // Additional fields
            active: data.active,
            image: data.image,
            tag: data.tag,
            catchPhrase: data.catchPhrase,
            goal: data.goal || [],
            age: data.age,
            equipment: data.equipment,
            requirements: data.requirements || [],
            gallery: data.gallery || [],
            desc1: data.desc1,
            desc2: data.desc2,
            desc3: data.desc3,
            linkName: data.linkName,
          })
        })
        setAcademies(academiesData)
        setLoading(false)
        setError(null)
      }, 
      (err) => {
        console.error('Error fetching academies:', err)
        setError('Failed to load academies. Please try again.')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [collectionName])

  // Create new academy
  const addAcademy = useCallback(async (academyData: AcademyInput) => {
    try {
      // Create a normalized ID from the name like the seed script does
      const docId = academyData.name.toLowerCase().replace(/\s+/g, '_')
      const docRef = doc(db, collectionName, docId)
      
      await setDoc(docRef, {
        ...academyData,
        // Sync legacy fields
        instructor: academyData.teacher?.name || '',
        instructorBio: academyData.teacher?.credentials || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      return docId
    } catch (err) {
      console.error('Error adding academy:', err)
      throw new Error('Failed to add academy')
    }
  }, [collectionName])

  // Update existing academy
  const updateAcademy = useCallback(async (id: string, academyData: Partial<AcademyInput>) => {
    try {
      const docRef = doc(db, collectionName, id)
      
      const updateData: any = {
        ...academyData,
        updatedAt: serverTimestamp()
      }
      
      if (academyData.teacher) {
        updateData.instructor = academyData.teacher.name || ''
        updateData.instructorBio = academyData.teacher.credentials || ''
      }

      await setDoc(docRef, updateData, { merge: true })
    } catch (err) {
      console.error('Error updating academy:', err)
      throw new Error('Failed to update academy')
    }
  }, [collectionName])

  // Delete academy
  const deleteAcademy = useCallback(async (id: string) => {
    try {
      const docRef = doc(db, collectionName, id)
      await deleteDoc(docRef)
    } catch (err) {
      console.error('Error deleting academy:', err)
      throw new Error('Failed to delete academy')
    }
  }, [collectionName])

  return {
    academies,
    loading,
    error,
    addAcademy,
    updateAcademy,
    deleteAcademy
  }
}
