import { useState, useEffect } from 'react'
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  type Timestamp
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { TEACHER_ACTIVITY_LOG_COLLECTION } from '../../../lib/config'

export interface ActivityLogEntry {
  id: string
  teacherName: string
  teacherId: string
  action: string
  academy: string
  details?: string
  createdAt: Timestamp
}

export function useActivityLog(isAdmin: boolean) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin || !TEACHER_ACTIVITY_LOG_COLLECTION) {
      setLoading(false)
      return
    }

    try {
      const q = query(
        collection(db, TEACHER_ACTIVITY_LOG_COLLECTION),
        orderBy('createdAt', 'desc')
      )

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as ActivityLogEntry[]
        
        setLogs(docs)
        setLoading(false)
      }, (error) => {
        if (error.code === 'permission-denied') {
          setLoading(false)
          return
        }
        setLoading(false)
      })

      return () => unsubscribe()
    } catch (err) {
      setLoading(false)
    }
  }, [isAdmin])

  const logActivity = async (data: Omit<ActivityLogEntry, 'id' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, TEACHER_ACTIVITY_LOG_COLLECTION), {
        ...data,
        createdAt: serverTimestamp()
      })
    } catch (error) {
      // Silently fail - activity logging is non-critical
    }
  }

  return {
    logs,
    loading,
    logActivity
  }
}
