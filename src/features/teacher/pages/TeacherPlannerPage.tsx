import * as React from 'react'
import { 
  Box, Grid, Typography, IconButton, 
  Stack, Checkbox, TextField, Divider, Chip, CircularProgress 
} from '@mui/material'
import { 
  Calendar as CalendarIcon, 
  CheckCircle, Plus, Trash2, Clock, Edit2 
} from 'lucide-react'
import { format } from 'date-fns'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { db } from '../../../lib/firebase'
import { useAuth } from '../../../context/AuthContext'
import { useTeacherContext } from '../../auth/context/TeacherContext'
import { GlassCard } from '../../../components/GlassCard'
import { notifyError, notifySuccess } from '../../../lib/alerts'
import { useTeacherPlan, Task, TeacherEvent } from '../hooks/useTeacherPlan'

// DayCell removed in favor of FullCalendar

export default function TeacherPlannerPage() {
  const { teacherProfile } = useTeacherContext()
  const { currentUser } = useAuth()
  const [selectedDate, setSelectedDate] = React.useState(new Date())
  
  const { 
    plan, allPlans, loading, userEmail, docId,
    addTask, toggleTask, updateTask, deleteTask,
    addEvent, updateEvent, deleteEvent
  } = useTeacherPlan(selectedDate)

  // Inputs
  const [newTask, setNewTask] = React.useState('')
  const [newEventTime, setNewEventTime] = React.useState('09:00')
  const [newEventTitle, setNewEventTitle] = React.useState('')

  // Editing State
  const [editingTaskId, setEditingTaskId] = React.useState<string | null>(null)
  const [editingTaskText, setEditingTaskText] = React.useState('')
  const [editingEventId, setEditingEventId] = React.useState<string | null>(null)
  const [editingEventTitle, setEditingEventTitle] = React.useState('')
  const [editingEventTime, setEditingEventTime] = React.useState('')

  React.useEffect(() => {
    console.log('Planner Auth Debug:', {
      currentUserEmail: currentUser?.email,
      teacherProfileEmail: teacherProfile?.email,
      resolvedUserEmail: userEmail,
      docId
    })
  }, [userEmail, docId, currentUser, teacherProfile])

  const calendarEvents = React.useMemo(() => {
    const evs: any[] = []
    allPlans.forEach(p => {
      const [mm, dd, yyyy] = p.date.split('-')
      const isoDate = `${yyyy}-${mm}-${dd}`
      p.events.forEach(e => {
        evs.push({
          id: e.id,
          title: e.title,
          start: `${isoDate}T${e.time}:00`,
          extendedProps: { ...e, date: p.date }
        })
      })
      if (p.tasks.length > 0) {
        const completed = p.tasks.filter(t => t.completed).length
        evs.push({
          id: `tasks_${p.date}`,
          title: `📋 ${completed}/${p.tasks.length} Tasks`,
          start: isoDate,
          allDay: true,
          display: 'list-item',
          color: completed === p.tasks.length ? '#4caf50' : '#ff9800'
        })
      }
    })
    return evs
  }, [allPlans])

  const handleEventDrop = async (info: { event: any; oldEvent: any; revert: () => void }) => {
    const { event, oldEvent } = info
    if (event.id.startsWith('tasks_')) {
      info.revert()
      return
    }

    const oldDate = oldEvent.extendedProps.date
    const newDate = format(event.start, 'MM-dd-yyyy')
    const eventId = event.id

    if (oldDate === newDate) {
      // Just time changed
      const oldDocId = `${teacherProfile?.email}_${oldDate}`
      const newTime = format(event.start, 'HH:mm')
      const targetDoc = allPlans.find(p => p.date === oldDate)
      if (!targetDoc) return
      const updatedEvents = targetDoc.events.map(e => 
        e.id === eventId ? { ...e, time: newTime } : e
      )
      await updateDoc(doc(db, 'teacher_plans', oldDocId), { events: updatedEvents })
      return
    }

    // Date changed: Move between documents
    const oldDocId = `${teacherProfile?.email}_${oldDate}`
    const newDocId = `${teacherProfile?.email}_${newDate}`
    
    const eventData = oldEvent.extendedProps
    const eventToMove: Event = { id: eventId, title: event.title, time: format(event.start, 'HH:mm') }

    try {
      // Remove from old
      await updateDoc(doc(db, 'teacher_plans', oldDocId), {
        events: arrayRemove({ id: eventData.id, title: eventData.title, time: eventData.time })
      })

      // Add to new
      const newDocSnap = await getDoc(doc(db, 'teacher_plans', newDocId))
      if (newDocSnap.exists()) {
        await updateDoc(doc(db, 'teacher_plans', newDocId), {
          events: arrayUnion(eventToMove),
          updatedAt: serverTimestamp()
        })
      } else {
        await setDoc(doc(db, 'teacher_plans', newDocId), {
          date: newDate,
          teacherEmail: teacherProfile?.email,
          tasks: [],
          events: [eventToMove],
          updatedAt: serverTimestamp()
        })
      }
      notifySuccess('Event moved')
    } catch (e) {
      console.error(e)
      notifyError('Failed to move event', e instanceof Error ? e.message : 'Unknown error')
      info.revert()
    }
  }

  // Actions
  const handleAddTask = async () => {
    if (!newTask.trim()) return
    await addTask(newTask)
    setNewTask('')
  }

  const handleToggleTask = async (task: Task) => {
    await toggleTask(task)
  }

  const handleDeleteTask = async (task: Task) => {
    await deleteTask(task)
  }

  const handleUpdateTask = async () => {
    if (!editingTaskId) return
    await updateTask(editingTaskId, editingTaskText)
    setEditingTaskId(null)
  }

  const handleUpdateEvent = async () => {
    if (!editingEventId) return
    await updateEvent(editingEventId, editingEventTitle, editingEventTime)
    setEditingEventId(null)
  }

  const handleAddEvent = async () => {
    if (!newEventTitle.trim()) return
    await addEvent(newEventTitle, newEventTime)
    setNewEventTitle('')
  }

  const handleDeleteEvent = async (event: TeacherEvent) => {
    await deleteEvent(event)
    notifySuccess('Event deleted')
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header with Gradient */}
      <Box sx={{ 
        mb: 4,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Purple/Blue gradient
        borderRadius: 3,
        p: 3,
        color: 'white',
        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.14), 0 7px 10px -5px rgba(118, 75, 162, 0.4)'
      }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ display: 'flex', color: 'white' }}>
            <CalendarIcon size={40} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800} color="white">
              My Planner
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5, color: 'white' }}>
              Manage your schedule and daily tasks
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ height: 'calc(100vh - 280px)' }}>
        <Grid item xs={12} md={8} sx={{ height: '100%' }}>
          <GlassCard sx={{ height: '100%', p: 2, '& .fc': { height: '100%', fontFamily: 'inherit' } }}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
              }}
              height="100%"
              selectable={true}
              editable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              initialDate={selectedDate}
              dateClick={(info: any) => setSelectedDate(info.date)}
              events={calendarEvents}
              eventDrop={handleEventDrop}
              eventResize={(info: any) => handleEventDrop(info)} // Reuse move logic for time changes
              eventClick={(info: any) => {
                setSelectedDate(info.event.start || new Date())
              }}
              eventBackgroundColor="#3f51b5"
              eventBorderColor="#3f51b5"
              themeSystem="standard"
              eventContent={(eventInfo: any) => (
                <Box sx={{ 
                  p: '2px 4px', 
                  overflow: 'hidden', 
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  bgcolor: eventInfo.event.id.startsWith('tasks_') ? 'secondary.main' : 'primary.main',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}>
                  {eventInfo.event.title}
                </Box>
              )}
            />
          </GlassCard>
        </Grid>

        {/* Details Column */}
        <Grid item xs={12} md={4} sx={{ height: '100%' }}>
          <GlassCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <Typography variant="overline" sx={{ opacity: 0.8 }}>Selected Date</Typography>
              <Typography variant="h4" fontWeight={800}>{format(selectedDate, 'EEEE, MMM do')}</Typography>
            </Box>

            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 3 }}>
              {loading ? (
                <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
              ) : (
                <Stack spacing={4}>
                   {/* Schedule Section */}
                   <Box>
                     <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                       <Clock size={20} /> Schedule
                     </Typography>
                     <Stack spacing={2}>
                         {(plan?.events || [])
                          .sort((a,b) => a.time.localeCompare(b.time))
                          .map(event => (
                          <GlassCard key={event.id} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                             {editingEventId === event.id ? (
                               <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
                                 <TextField 
                                   type="time" size="small" sx={{ width: 120 }}
                                   value={editingEventTime} 
                                   onChange={e => setEditingEventTime(e.target.value)} 
                                 />
                                 <TextField 
                                   size="small" fullWidth autoFocus
                                   value={editingEventTitle} 
                                   onChange={e => setEditingEventTitle(e.target.value)}
                                   onKeyDown={e => {
                                     if (e.key === 'Enter') handleUpdateEvent()
                                     if (e.key === 'Escape') setEditingEventId(null)
                                   }}
                                 />
                                 <IconButton size="small" color="primary" onClick={handleUpdateEvent}><CheckCircle size={18} /></IconButton>
                               </Stack>
                             ) : (
                               <>
                                 <Chip label={event.time} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                                 <Typography sx={{ flex: 1, fontWeight: 500 }}>{event.title}</Typography>
                                 <IconButton size="small" onClick={() => {
                                   setEditingEventId(event.id)
                                   setEditingEventTitle(event.title)
                                   setEditingEventTime(event.time)
                                 }}><Edit2 size={16} opacity={0.5} /></IconButton>
                                 <IconButton size="small" color="error" onClick={() => handleDeleteEvent(event)}><Trash2 size={16} /></IconButton>
                               </>
                             )}
                          </GlassCard>
                        ))}
                        {(!plan?.events || plan.events.length === 0) && (
                          <Typography variant="body2" color="text.secondary" fontStyle="italic">No events planned.</Typography>
                        )}
                        
                        {/* Add Event */}
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                           <TextField 
                             type="time" size="small" 
                             value={newEventTime} onChange={e => setNewEventTime(e.target.value)} 
                           />
                           <TextField 
                             placeholder="New Event..." size="small" fullWidth
                             value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)}
                           />
                           <IconButton color="primary" onClick={handleAddEvent} disabled={!newEventTitle}><Plus /></IconButton>
                        </Stack>
                     </Stack>
                   </Box>

                   <Divider />

                   {/* Tasks Section */}
                   <Box>
                     <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                       <CheckCircle size={20} /> Checklist
                     </Typography>
                     <Stack spacing={1}>
                        {(plan?.tasks || []).map(task => (
                          <Box key={task.id} sx={{ display: 'flex', alignItems: 'center', p: 1, borderRadius: 1, bgcolor: task.completed ? 'action.selected' : 'transparent' }}>
                             <Checkbox 
                                checked={task.completed} 
                                onChange={() => handleToggleTask(task)}
                                color="success"
                             />
                             {editingTaskId === task.id ? (
                               <TextField 
                                 size="small" fullWidth autoFocus
                                 value={editingTaskText}
                                 onChange={e => setEditingTaskText(e.target.value)}
                                 onBlur={handleUpdateTask}
                                 onKeyDown={e => {
                                   if (e.key === 'Enter') handleUpdateTask()
                                   if (e.key === 'Escape') setEditingTaskId(null)
                                 }}
                                 sx={{ mr: 1 }}
                               />
                             ) : (
                               <Typography 
                                 onClick={() => {
                                   setEditingTaskId(task.id)
                                   setEditingTaskText(task.text)
                                 }}
                                 sx={{ 
                                   flex: 1, 
                                   textDecoration: task.completed ? 'line-through' : 'none', 
                                   color: task.completed ? 'text.secondary' : 'text.primary',
                                   cursor: 'pointer',
                                   '&:hover': { bgcolor: 'action.hover' }
                                 }}
                               >
                                 {task.text}
                               </Typography>
                             )}
                             <IconButton size="small" onClick={() => handleDeleteTask(task)}><Trash2 size={16} opacity={0.5} /></IconButton>
                          </Box>
                        ))}

                        {/* Add Task */}
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                           <TextField 
                             placeholder="Add a task..." size="small" fullWidth
                             value={newTask} onChange={e => setNewTask(e.target.value)}
                             onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                           />
                           <IconButton color="primary" onClick={handleAddTask} disabled={!newTask}><Plus /></IconButton>
                        </Stack>
                     </Stack>
                   </Box>
                </Stack>
              )}
            </Box>
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  )
}
