import * as React from 'react'
import { 
  collection, doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, 
  serverTimestamp, query, where 
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { format } from 'date-fns'
import { useTeacherContext } from '../../auth/context/TeacherContext'
import { useAuth } from '../../../context/AuthContext'
import { notifyError, notifySuccess } from '../../../lib/alerts'

export interface Task {
  id: string
  text: string
  completed: boolean
}

export interface TeacherEvent {
  id: string
  time: string
  title: string
}

export interface PlanDoc {
  date: string
  teacherEmail: string
  tasks: Task[]
  events: TeacherEvent[]
}

export function useTeacherPlan(targetDate: Date = new Date()) {
  const { teacherProfile } = useTeacherContext()
  const { currentUser } = useAuth()
  
  const [plan, setPlan] = React.useState<PlanDoc | null>(null)
  const [allPlans, setAllPlans] = React.useState<PlanDoc[]>([])
  const [loading, setLoading] = React.useState(true)

  const userEmail = teacherProfile?.email || (currentUser?.email ? currentUser.email.toLowerCase().trim() : null)
  
  const dateStr = format(targetDate, 'MM-dd-yyyy')
  const docId = userEmail ? `${userEmail}_${dateStr}` : null

  // Single day listener
  React.useEffect(() => {
    if (!docId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const unsub = onSnapshot(doc(db, 'teacher_plans', docId), (docSnap) => {
      if (docSnap.exists()) {
        setPlan(docSnap.data() as PlanDoc)
      } else {
        setPlan(null)
      }
      setLoading(false)
    }, () => {
      // Silently handle permission errors (expected for users without access)
      setLoading(false)
    })
    return () => unsub()
  }, [docId])

  // All plans listener (for calendar)
  React.useEffect(() => {
    if (!userEmail) return
    const q = query(
      collection(db, 'teacher_plans'),
      where('teacherEmail', '==', userEmail)
    )
    const unsub = onSnapshot(q, (snap) => {
      setAllPlans(snap.docs.map(d => d.data() as PlanDoc))
    }, () => {
      // Silently handle errors
    })
    return () => unsub()
  }, [userEmail])

  const addTask = async (text: string) => {
    if (!text.trim() || !docId || !userEmail) return
    const task: Task = { id: crypto.randomUUID(), text: text.trim(), completed: false }
    try {
      if (!plan) {
         await setDoc(doc(db, 'teacher_plans', docId), {
            date: dateStr,
            teacherEmail: userEmail,
            tasks: [task],
            events: [],
            updatedAt: serverTimestamp()
         })
      } else {
         await updateDoc(doc(db, 'teacher_plans', docId), {
            tasks: arrayUnion(task),
            updatedAt: serverTimestamp()
         })
      }
      notifySuccess('Task added')
    } catch (e) {
      notifyError('Failed to add task', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  const toggleTask = async (task: Task) => {
    if (!plan || !docId) return
    const newTasks = plan.tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t)
    await updateDoc(doc(db, 'teacher_plans', docId), { tasks: newTasks })
  }

  const updateTask = async (taskId: string, newText: string) => {
    if (!plan || !docId) return
    const newTasks = plan.tasks.map(t => t.id === taskId ? { ...t, text: newText.trim() } : t)
    await updateDoc(doc(db, 'teacher_plans', docId), { tasks: newTasks })
  }

  const deleteTask = async (task: Task) => {
    if (!docId) return
    await updateDoc(doc(db, 'teacher_plans', docId), { tasks: arrayRemove(task) })
  }

  const addEvent = async (title: string, time: string) => {
    if (!title.trim() || !docId || !userEmail) return
    const event: TeacherEvent = { id: crypto.randomUUID(), time, title: title.trim() }
    try {
      if (!plan) {
         await setDoc(doc(db, 'teacher_plans', docId), {
            date: dateStr,
            teacherEmail: userEmail,
            tasks: [],
            events: [event],
            updatedAt: serverTimestamp()
         })
      } else {
         await updateDoc(doc(db, 'teacher_plans', docId), {
            events: arrayUnion(event),
            updatedAt: serverTimestamp()
         })
      }
      notifySuccess('Event added')
    } catch (e) {
      notifyError('Failed to add event', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  const updateEvent = async (eventId: string, newTitle: string, newTime: string) => {
    if (!plan || !docId) return
    const newEvents = plan.events.map(e => e.id === eventId ? { ...e, title: newTitle.trim(), time: newTime } : e)
    await updateDoc(doc(db, 'teacher_plans', docId), { events: newEvents })
  }

  const deleteEvent = async (event: TeacherEvent) => {
    if (!docId) return
    await updateDoc(doc(db, 'teacher_plans', docId), { events: arrayRemove(event) })
  }

  return {
    plan,
    allPlans,
    loading,
    userEmail,
    docId,
    addTask,
    toggleTask,
    updateTask,
    deleteTask,
    addEvent,
    updateEvent,
    deleteEvent
  }
}
