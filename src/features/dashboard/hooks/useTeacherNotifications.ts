import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

export interface TeacherNotification {
  id: string
  teacherName: string
  teacherId?: string // Auth ID or Profile ID
  action: string
  academy: string
  details?: string
  isRead: boolean
  createdAt: string // ISO string
}

export function useTeacherNotifications(listenForNotifications: boolean = true) {
  const [notifications, setNotifications] = useState<TeacherNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Fetch initial
  const fetchNotifications = async () => {
      try {
          const { data, error } = await supabase
            .from('admin_notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
          
          if (error) throw error
          
          if (data) {
              const mapped: TeacherNotification[] = data.map((n: any) => ({
                  id: n.id,
                  teacherName: n.teacher_name,
                  teacherId: n.teacher_profile_id, // Map profile ID used in logic
                  action: n.action,
                  academy: n.academy,
                  details: n.details,
                  isRead: n.is_read,
                  createdAt: n.created_at
              }))
              setNotifications(mapped)
              setUnreadCount(mapped.filter(n => !n.isRead).length)
          }
      } catch (e) {
          console.error('Error fetching notifications:', e)
      } finally {
          setLoading(false)
      }
  }

  useEffect(() => {
    if (!listenForNotifications) {
        setLoading(false)
        return
    }
    
    void fetchNotifications()

    // Realtime Subscription
    const channel = supabase
      .channel('admin_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Insert, Update, Delete
          schema: 'public',
          table: 'admin_notifications'
        },
        (payload) => {
          // Handle Insert
          if (payload.eventType === 'INSERT') {
             const newNotif = payload.new as any
             const mapped: TeacherNotification = {
                  id: newNotif.id,
                  teacherName: newNotif.teacher_name,
                  teacherId: newNotif.teacher_profile_id,
                  action: newNotif.action,
                  academy: newNotif.academy,
                  details: newNotif.details,
                  isRead: newNotif.is_read,
                  createdAt: newNotif.created_at
             }
             setNotifications(prev => [mapped, ...prev])
             setUnreadCount(prev => prev + 1)
          }
          // Handle Update (Read status)
          else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as any
              setNotifications(prev => prev.map(n => n.id === updated.id ? { ...n, isRead: updated.is_read } : n))
              // Re-calc unread is simpler or diff?
              // Just re-calc from state is tricky inside callback without full state.
              // We can rely on refetching or functional updates if we tracked logic perfectly.
              // For simplicity, let's just update the list.
              // Updating unread count properly requires knowing if it changed from false->true or true->false.
              // But effectively we only mark as read (false -> true).
              if (payload.old && (payload.old as any).is_read === false && updated.is_read === true) {
                  setUnreadCount(prev => Math.max(0, prev - 1))
              }
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [listenForNotifications])

  const addNotification = async (data: { teacherId: string, teacherName: string, action: string, academy: string, details?: string }) => {
    try {
        // We insert to 'admin_notifications'
        // teacherId here is likely the Profile ID (since it comes from teacherProfile.id)
        
        await supabase.from('admin_notifications').insert({
            teacher_profile_id: data.teacherId, // assuming profile ID
            teacher_name: data.teacherName,
            action: data.action,
            academy: data.academy,
            details: data.details,
            is_read: false
        })
    } catch (e) {
        console.error('Failed to add notification', e)
    }
  }

  const markAsRead = async (id: string) => {
    try {
        // Optimistic
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))

        await supabase.from('admin_notifications').update({ is_read: true }).eq('id', id)
    } catch (e) {
        console.error('Failed to mark read', e)
    }
  }

  const markAllAsRead = async () => {
    try {
        // Optimistic
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)

        // Supabase doesn't support bulk update without WHERE easily in client if restricted?
        // We can update where is_read = false
        await supabase.from('admin_notifications').update({ is_read: true }).eq('is_read', false)
    } catch (e) {
        console.error('Failed to mark all read', e)
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
