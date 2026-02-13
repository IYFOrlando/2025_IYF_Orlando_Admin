import * as React from 'react'
import { supabase } from '../../../lib/supabase'
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

  // ─── helpers ─────────────────────────────────────────
  const rowToPlan = (row: any): PlanDoc => ({
    date: row.date,
    teacherEmail: row.teacher_email,
    tasks: (row.tasks || []) as Task[],
    events: (row.events || []) as TeacherEvent[],
  })

  // ─── fetch single day ───────────────────────────────
  React.useEffect(() => {
    if (!docId) {
      setLoading(false)
      return
    }
    setLoading(true)

    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from('teacher_plans')
          .select('*')
          .eq('id', docId)
          .maybeSingle()

        if (error) throw error
        setPlan(data ? rowToPlan(data) : null)
      } catch {
        setPlan(null)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [docId])

  // ─── fetch all plans (for calendar) ─────────────────
  React.useEffect(() => {
    if (!userEmail) return

    const fetch = async () => {
      try {
        const { data, error } = await supabase
          .from('teacher_plans')
          .select('*')
          .eq('teacher_email', userEmail)

        if (error) throw error
        setAllPlans((data || []).map(rowToPlan))
      } catch {
        // silently handle
      }
    }
    fetch()
  }, [userEmail])

  // ─── upsert helper ──────────────────────────────────
  const upsertPlan = async (id: string, date: string, email: string, tasks: Task[], events: TeacherEvent[]) => {
    const { error } = await supabase
      .from('teacher_plans')
      .upsert({
        id,
        date,
        teacher_email: email,
        tasks: JSON.parse(JSON.stringify(tasks)),
        events: JSON.parse(JSON.stringify(events)),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
    if (error) throw error

    // Update local state
    const newPlan: PlanDoc = { date, teacherEmail: email, tasks, events }
    if (id === docId) setPlan(newPlan)
    setAllPlans(prev => {
      const idx = prev.findIndex(p => p.date === date && p.teacherEmail === email)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = newPlan
        return copy
      }
      return [...prev, newPlan]
    })
  }

  // ─── tasks ──────────────────────────────────────────
  const addTask = async (text: string) => {
    if (!text.trim() || !docId || !userEmail) return
    const task: Task = { id: crypto.randomUUID(), text: text.trim(), completed: false }
    try {
      const tasks = [...(plan?.tasks || []), task]
      const events = plan?.events || []
      await upsertPlan(docId, dateStr, userEmail, tasks, events)
      notifySuccess('Task added')
    } catch (e) {
      notifyError('Failed to add task', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  const toggleTask = async (task: Task) => {
    if (!plan || !docId || !userEmail) return
    const newTasks = plan.tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t)
    await upsertPlan(docId, dateStr, userEmail, newTasks, plan.events)
  }

  const updateTask = async (taskId: string, newText: string) => {
    if (!plan || !docId || !userEmail) return
    const newTasks = plan.tasks.map(t => t.id === taskId ? { ...t, text: newText.trim() } : t)
    await upsertPlan(docId, dateStr, userEmail, newTasks, plan.events)
  }

  const deleteTask = async (task: Task) => {
    if (!plan || !docId || !userEmail) return
    const newTasks = plan.tasks.filter(t => t.id !== task.id)
    await upsertPlan(docId, dateStr, userEmail, newTasks, plan.events)
  }

  // ─── events ─────────────────────────────────────────
  const addEvent = async (title: string, time: string) => {
    if (!title.trim() || !docId || !userEmail) return
    const event: TeacherEvent = { id: crypto.randomUUID(), time, title: title.trim() }
    try {
      const events = [...(plan?.events || []), event]
      const tasks = plan?.tasks || []
      await upsertPlan(docId, dateStr, userEmail, tasks, events)
      notifySuccess('Event added')
    } catch (e) {
      notifyError('Failed to add event', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  const updateEvent = async (eventId: string, newTitle: string, newTime: string) => {
    if (!plan || !docId || !userEmail) return
    const newEvents = plan.events.map(e => e.id === eventId ? { ...e, title: newTitle.trim(), time: newTime } : e)
    await upsertPlan(docId, dateStr, userEmail, plan.tasks, newEvents)
  }

  const deleteEvent = async (event: TeacherEvent) => {
    if (!plan || !docId || !userEmail) return
    const newEvents = plan.events.filter(e => e.id !== event.id)
    await upsertPlan(docId, dateStr, userEmail, plan.tasks, newEvents)
  }

  // ─── move event between days (calendar drag) ────────
  const moveEventToDate = async (eventId: string, oldDate: string, newDate: string, newTime: string) => {
    if (!userEmail) return

    const oldDocId = `${userEmail}_${oldDate}`
    const newDocId = `${userEmail}_${newDate}`

    // Find event in source plan
    const sourcePlan = allPlans.find(p => p.date === oldDate && p.teacherEmail === userEmail)
    if (!sourcePlan) return

    const eventToMove = sourcePlan.events.find(e => e.id === eventId)
    if (!eventToMove) return

    const movedEvent: TeacherEvent = { ...eventToMove, time: newTime }

    // Remove from old date
    const oldEvents = sourcePlan.events.filter(e => e.id !== eventId)
    await upsertPlan(oldDocId, oldDate, userEmail, sourcePlan.tasks, oldEvents)

    // Add to new date
    const targetPlan = allPlans.find(p => p.date === newDate && p.teacherEmail === userEmail)
    const newEvents = [...(targetPlan?.events || []), movedEvent]
    const newTasks = targetPlan?.tasks || []
    await upsertPlan(newDocId, newDate, userEmail, newTasks, newEvents)
  }

  // ─── update event time (same day) ──────────────────
  const updateEventTime = async (eventId: string, date: string, newTime: string) => {
    if (!userEmail) return
    const targetDocId = `${userEmail}_${date}`
    const targetPlan = allPlans.find(p => p.date === date && p.teacherEmail === userEmail)
    if (!targetPlan) return

    const newEvents = targetPlan.events.map(e => e.id === eventId ? { ...e, time: newTime } : e)
    await upsertPlan(targetDocId, date, userEmail, targetPlan.tasks, newEvents)
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
    deleteEvent,
    moveEventToDate,
    updateEventTime,
  }
}
