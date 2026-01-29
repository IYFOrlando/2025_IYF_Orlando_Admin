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
import { useTeacherContext } from '../../auth/context/TeacherContext'
import { GlassCard } from '../../../components/GlassCard'
import { notifyError, notifySuccess } from '../../../lib/alerts'
import { useTeacherPlan, type Task, type TeacherEvent } from '../hooks/useTeacherPlan'
import { 
  doc, updateDoc, getDoc, setDoc, 
  arrayRemove, arrayUnion, serverTimestamp 
} from 'firebase/firestore'

// DayCell removed in favor of FullCalendar

export default function TeacherPlannerPage() {
  const { teacherProfile } = useTeacherContext()
  const [selectedDate, setSelectedDate] = React.useState(new Date())
  
  const { 
    plan, allPlans, loading,
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
    const eventToMove: TeacherEvent = { 
      id: eventId, 
      title: event.title, 
      time: format(event.start, 'HH:mm') 
    }

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
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', // More vibrant Indigo/Purple
        borderRadius: 4,
        p: { xs: 3, md: 4 },
        color: 'white',
        boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.3), 0 8px 10px -6px rgba(124, 58, 237, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background element */}
        <Box sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          filter: 'blur(30px)'
        }} />
        
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={3}>
          <Box sx={{ 
            display: 'flex', 
            p: 2, 
            borderRadius: 3, 
            bgcolor: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            <CalendarIcon size={32} />
          </Box>
          <Box>
            <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, color: 'white' }}>
              Planner Hub
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5, color: 'white' }}>
              Organize your academic journey for {new Date().getFullYear()}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* Calendar Side */}
        <Grid item xs={12} lg={8}>
          <GlassCard sx={{ 
            p: { xs: 1, md: 3 }, 
            height: { xs: 'auto', lg: '800px' },
            minHeight: '600px',
            '& .fc': { 
              height: '100%', 
              fontFamily: 'inherit',
              '--fc-border-color': 'rgba(0,0,0,0.05)',
              '--fc-button-bg-color': '#4f46e5',
              '--fc-button-border-color': '#4f46e5',
              '--fc-button-hover-bg-color': '#4338ca',
              '--fc-button-active-bg-color': '#3730a3',
              '--fc-today-bg-color': 'rgba(79, 70, 229, 0.05)',
            },
            '& .fc-toolbar-title': {
              fontSize: { xs: '1.2rem', md: '1.5rem' },
              fontWeight: 700,
              color: 'text.primary'
            },
            '& .fc-button': {
              textTransform: 'capitalize',
              boxShadow: 'none !important',
              fontWeight: 600,
              px: 2
            },
            '& .fc-col-header-cell': {
              py: 1.5,
              bgcolor: 'rgba(0,0,0,0.02)',
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: '0.875rem'
            },
            '& .fc-daygrid-day-number': {
              p: 1,
              fontWeight: 500,
              opacity: 0.8
            }
          }}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
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
              eventResize={(info: any) => handleEventDrop(info)}
              eventClick={(info: any) => {
                setSelectedDate(info.event.start || new Date())
              }}
              eventContent={(eventInfo: any) => (
                <Box sx={{ 
                  p: '4px 8px', 
                  m: '1px',
                  borderRadius: '6px',
                  bgcolor: eventInfo.event.id.startsWith('tasks_') ? '#8b5cf6' : '#4f46e5',
                  color: 'white',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {eventInfo.event.title}
                </Box>
              )}
            />
          </GlassCard>
        </Grid>

        {/* Details Column */}
        <Grid item xs={12} lg={4}>
          <Stack spacing={3} sx={{ position: { lg: 'sticky' }, top: 24 }}>
            {/* Date Header Card */}
            <GlassCard sx={{ 
              p: 3, 
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: 'white'
            }}>
              <Typography variant="overline" sx={{ opacity: 0.6, letterSpacing: 1.5 }}>Schedule For</Typography>
              <Typography variant="h4" fontWeight={800}>{format(selectedDate, 'MMM do, yyyy')}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>{format(selectedDate, 'EEEE')}</Typography>
            </GlassCard>

            <GlassCard sx={{ p: 0, display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1}><CircularProgress /></Box>
              ) : (
                <Box sx={{ p: 3 }}>
                  <Stack spacing={4}>
                    {/* Schedule Section */}
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Clock size={20} className="text-indigo-500" /> Daily Events
                        </Typography>
                        <Chip label={`${(plan?.events || []).length}`} size="small" variant="outlined" />
                      </Stack>
                      
                      <Stack spacing={1.5}>
                          {(plan?.events || [])
                           .sort((a,b) => a.time.localeCompare(b.time))
                           .map(event => (
                           <Box key={event.id} sx={{ 
                             p: 2, 
                             borderRadius: 2, 
                             bgcolor: 'rgba(0,0,0,0.02)',
                             border: '1px solid rgba(0,0,0,0.05)',
                             display: 'flex', 
                             alignItems: 'center', 
                             gap: 2,
                             transition: 'all 0.2s',
                             '&:hover': { bgcolor: 'rgba(0,0,0,0.04)', transform: 'translateY(-1px)' }
                           }}>
                              {editingEventId === event.id ? (
                                <Stack direction="row" spacing={1} sx={{ flex: 1 }}>
                                  <TextField 
                                    type="time" size="small" sx={{ width: 110 }}
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
                                  <Box sx={{ textAlign: 'center', minWidth: 50 }}>
                                    <Typography variant="caption" fontWeight={700} color="primary" sx={{ display: 'block' }}>
                                      {event.time}
                                    </Typography>
                                  </Box>
                                  <Typography sx={{ flex: 1, fontWeight: 500, fontSize: '0.95rem' }}>{event.title}</Typography>
                                  <IconButton size="small" onClick={() => {
                                    setEditingEventId(event.id)
                                    setEditingEventTitle(event.title)
                                    setEditingEventTime(event.time)
                                  }} className="action-btn"><Edit2 size={14} /></IconButton>
                                  <IconButton size="small" color="error" onClick={() => handleDeleteEvent(event)} className="action-btn"><Trash2 size={14} /></IconButton>
                                </>
                              )}
                           </Box>
                         ))}
                         {(!plan?.events || plan.events.length === 0) && (
                           <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ textAlign: 'center', py: 2 }}>
                             Tranquilo, no hay eventos hoy.
                           </Typography>
                         )}
                         
                         {/* Add Event Input group */}
                         <Box sx={{ 
                           mt: 1, 
                           p: 1.5, 
                           borderRadius: 2, 
                           border: '1px dashed', 
                           borderColor: 'divider',
                           bgcolor: 'rgba(79, 70, 229, 0.02)'
                         }}>
                           <Stack direction="row" spacing={1}>
                                <TextField 
                                  type="time" size="small" sx={{ width: 130 }}
                                value={newEventTime} onChange={e => setNewEventTime(e.target.value)} 
                              />
                              <TextField 
                                placeholder="Nuevo evento..." size="small" fullWidth
                                value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                              />
                              <IconButton size="small" sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }} onClick={handleAddEvent} disabled={!newEventTitle}><Plus size={20} /></IconButton>
                           </Stack>
                         </Box>
                      </Stack>
                    </Box>

                    <Divider />

                    {/* Tasks Section */}
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircle size={20} className="text-emerald-500" /> Checklist
                        </Typography>
                        {(plan?.tasks?.length ?? 0) > 0 && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {plan?.tasks?.filter(t => t.completed).length}/{plan?.tasks?.length} done
                          </Typography>
                        )}
                      </Stack>
                      
                      <Stack spacing={1}>
                         {(plan?.tasks || []).map(task => (
                           <Box key={task.id} sx={{ 
                             display: 'flex', 
                             alignItems: 'center', 
                             p: 0.5, 
                             borderRadius: 2, 
                             transition: 'all 0.2s',
                             '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }
                           }}>
                              <Checkbox 
                                 checked={task.completed} 
                                 onChange={() => handleToggleTask(task)}
                                 color="success"
                                 sx={{ '& .MuiSvgIcon-root': { fontSize: 22 } }}
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
                                    fontSize: '0.95rem',
                                    textDecoration: task.completed ? 'line-through' : 'none', 
                                    color: task.completed ? 'text.secondary' : 'text.primary',
                                    cursor: 'pointer',
                                    py: 1
                                  }}
                                >
                                  {task.text}
                                </Typography>
                              )}
                              <IconButton size="small" onClick={() => handleDeleteTask(task)} sx={{ opacity: 0.3, '&:hover': { opacity: 1 } }}><Trash2 size={16} /></IconButton>
                           </Box>
                         ))}

                         {/* Add Task Input group */}
                         <Box sx={{ mt: 1 }}>
                            <TextField 
                              placeholder="Agregar tarea..." 
                              size="small" 
                              fullWidth
                              value={newTask} 
                              onChange={e => setNewTask(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                              InputProps={{
                                endAdornment: (
                                  <IconButton size="small" color="primary" onClick={handleAddTask} disabled={!newTask}>
                                    <Plus size={18} />
                                  </IconButton>
                                )
                              }}
                              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                         </Box>
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              )}
            </GlassCard>
          </Stack>
        </Grid>
      </Grid>

    </Box>
  )
}
