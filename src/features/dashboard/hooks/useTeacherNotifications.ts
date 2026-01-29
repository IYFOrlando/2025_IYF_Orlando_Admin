import { useState, useEffect } from 'react'
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  type Timestamp
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { TEACHER_NOTIFICATIONS_COLLECTION, TEACHER_ACTIVITY_LOG_COLLECTION } from '../../../lib/config'

export interface TeacherNotification {
  id: string
  teacherName: string
  teacherId: string
  action: string
  academy: string
  details?: string
  isRead: boolean
  createdAt: Timestamp
}

export function useTeacherNotifications(listenForNotifications: boolean = true) {
  const [notifications, setNotifications] = useState<TeacherNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only listen if explicitly enabled (for admins)
    // Teachers can still call addNotification but won't listen
    if (!listenForNotifications || !TEACHER_NOTIFICATIONS_COLLECTION) {
      setLoading(false)
      return
    }

    try {
      const q = query(
        collection(db, TEACHER_NOTIFICATIONS_COLLECTION),
        orderBy('createdAt', 'desc')
      )

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as TeacherNotification[]
        
        setNotifications(docs)
        setUnreadCount(docs.filter(n => !n.isRead).length)
        setLoading(false)
      }, (error) => {
        // Silently handle permission errors (expected for non-admin users)
        if (error.code === 'permission-denied') {
          setLoading(false)
          return
        }
        console.error("Firestore Listen Error (Notifications):", error)
        setLoading(false)
      })

      return () => unsubscribe()
    } catch (err) {
      console.error("Error setting up Notifications listener:", err)
      setLoading(false)
    }
  }, [listenForNotifications])

  const addNotification = async (data: Omit<TeacherNotification, 'id' | 'createdAt' | 'isRead'>) => {
    try {
      // Teachers can create notifications (for admins to see)
      if (TEACHER_NOTIFICATIONS_COLLECTION) {
        await addDoc(collection(db, TEACHER_NOTIFICATIONS_COLLECTION), {
          ...data,
          isRead: false,
          createdAt: serverTimestamp()
        })
      }

      // Also log permanently to Audit Log
      if (TEACHER_ACTIVITY_LOG_COLLECTION) {
        await addDoc(collection(db, TEACHER_ACTIVITY_LOG_COLLECTION), {
          ...data,
          createdAt: serverTimestamp()
        })
      }
    } catch (error) {
      console.error('Error adding notification:', error)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, TEACHER_NOTIFICATIONS_COLLECTION, id), {
        isRead: true
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.isRead)
      await Promise.all(unread.map(n => markAsRead(n.id)))
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    addNotification,
    markAsRead,
    markAllAsRead
  }
}
