import { 
  Box, Grid, Typography, IconButton, 
  Stack, Checkbox, TextField, Divider, Chip, CircularProgress 
} from '@mui/material'
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  CheckCircle, Circle, Plus, Trash2, Clock 
} from 'lucide-react'
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  eachDayOfInterval, isSameMonth, isSameDay, isToday, 
  startOfWeek, endOfWeek 
} from 'date-fns'
import { 
  doc, onSnapshot, setDoc, updateDoc, arrayUnion, arrayRemove, 
  serverTimestamp 
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { useTeacherContext } from '../../auth/context/TeacherContext'
import { GlassCard } from '../../../components/GlassCard'
import { notifyError } from '../../../lib/alerts'

// --- Types ---
interface Task {
  id: string
  text: string
  completed: boolean
}

interface Event {
  id: string
  time: string
  title: string
}

interface PlanDoc {
  date: string
  teacherEmail: string
  tasks: Task[]
  events: Event[]
}

// --- Components ---
const DayCell = ({ date, isSelected, hasPlan, onClick }: any) => {
  const isCurrentMonth = isSameMonth(date, new Date()) // We'll pass currentMonth from parent if needed, simplistic for now
  
  return (
    <Box 
      onClick={() => onClick(date)}
      sx={{
        height: 100,
        border: '1px solid',
        borderColor: 'divider',
        p: 1,
        cursor: 'pointer',
        bgcolor: isSelected ? 'primary.light' : 'background.paper',
        opacity: isCurrentMonth ? 1 : 0.4,
        position: 'relative',
        transition: 'all 0.2s',
        '&:hover': { bgcolor: 'action.hover' }
      }}
    >
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="body2" fontWeight={isToday(date) ? 700 : 400} 
          color={isToday(date) ? 'primary.main' : 'text.primary'}
        >
          {format(date, 'd')}
        </Typography>
        {hasPlan && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'secondary.main' }} />}
      </Stack>
    </Box>
  )
}

export default function TeacherPlannerPage() {
  const { teacherProfile } = useTeacherContext()
  const [currentDate, setCurrentDate] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState(new Date())
  
  // Plan Data
  const [plan, setPlan] = React.useState<PlanDoc | null>(null)
  const [loading, setLoading] = React.useState(false)

  // Inputs
  const [newTask, setNewTask] = React.useState('')
  const [newEventTime, setNewEventTime] = React.useState('09:00')
  const [newEventTitle, setNewEventTitle] = React.useState('')

  const docId = React.useMemo(() => {
    if (!teacherProfile?.email) return null
    return `${teacherProfile.email}_${format(selectedDate, 'MM-dd-yyyy')}`
  }, [teacherProfile, selectedDate])

  // Real-time listener for selected date
  React.useEffect(() => {
    if (!docId) return
    setLoading(true)
    const unsub = onSnapshot(doc(db, 'teacher_plans', docId), (docSnap) => {
      if (docSnap.exists()) {
        setPlan(docSnap.data() as PlanDoc)
      } else {
        setPlan(null) // No plan yet for this day
      }
      setLoading(false)
    })
    return () => unsub()
  }, [docId])

  // Calendar Construction
  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [currentDate])

  // Actions
  const handleAddTask = async () => {
    if (!newTask.trim() || !docId || !teacherProfile) return
    
    const task: Task = { id: crypto.randomUUID(), text: newTask.trim(), completed: false }
    
    try {
      if (!plan) {
         // Create Doc
         await setDoc(doc(db, 'teacher_plans', docId), {
            date: format(selectedDate, 'MM-dd-yyyy'),
            teacherEmail: teacherProfile.email,
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
      setNewTask('')
    } catch (e:any) { notifyError('Failed to add task', e.message) }
  }

  const handleToggleTask = async (task: Task) => {
    if (!plan || !docId) return
    // Firestore array remove/union doesn't work well for updates, needed to replace whole array or use weird logic
    // Best way: Read modify write, or just replace array. Since we have real-time listener, `plan` is fresh.
    const newTasks = plan.tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t)
    await updateDoc(doc(db, 'teacher_plans', docId), { tasks: newTasks })
  }

  const handleDeleteTask = async (task: Task) => {
    if (!docId) return
    await updateDoc(doc(db, 'teacher_plans', docId), { tasks: arrayRemove(task) })
  }

  const handleAddEvent = async () => {
    if (!newEventTitle.trim() || !docId || !teacherProfile) return
    
    const event: Event = { id: crypto.randomUUID(), time: newEventTime, title: newEventTitle.trim() }
    
    try {
      if (!plan) {
         await setDoc(doc(db, 'teacher_plans', docId), {
            date: format(selectedDate, 'MM-dd-yyyy'),
            teacherEmail: teacherProfile.email,
            tasks: [],
            events: [event],
            updatedAt: serverTimestamp()
         })
      } else {
         // Sort events by time? Hard with arrayUnion. Just append and sort on render.
         // Actually better to read-modify-write if we want order, but simple append is fine for now.
         await updateDoc(doc(db, 'teacher_plans', docId), {
            events: arrayUnion(event),
            updatedAt: serverTimestamp()
         })
      }
      setNewEventTitle('')
    } catch (e:any) { notifyError('Failed to add event', e.message) }
  }

  const handleDeleteEvent = async (event: Event) => {
      if (!docId) return
      await updateDoc(doc(db, 'teacher_plans', docId), { events: arrayRemove(event) })
  }

  return (
    <Box sx={{ height: 'calc(100vh - 100px)' }}>
      <Grid container spacing={3} sx={{ height: '100%' }}>
        {/* Calendar Column */}
        <Grid item xs={12} md={8} sx={{ height: '100%' }}>
          <GlassCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
               <Stack direction="row" alignItems="center" spacing={1}>
                 <CalendarIcon />
                 <Typography variant="h6" fontWeight={700}>
                   {format(currentDate, 'MMMM yyyy')}
                 </Typography>
               </Stack>
               <Box>
                 <IconButton onClick={() => setCurrentDate(subMonths(currentDate, 1))}><ChevronLeft /></IconButton>
                 <IconButton onClick={() => setCurrentDate(new Date())}><Circle size={14} /></IconButton>
                 <IconButton onClick={() => setCurrentDate(addMonths(currentDate, 1))}><ChevronRight /></IconButton>
               </Box>
            </Box>
            
            {/* Days Header */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', py: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <Typography key={d} variant="caption" fontWeight={700}>{d}</Typography>
              ))}
            </Box>

            {/* Calendar Grid */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flexGrow: 1, overflowY: 'auto' }}>
              {calendarDays.map((day) => (
                <DayCell 
                  key={day.toISOString()} 
                  date={day} 
                  isSelected={isSameDay(day, selectedDate)}
                  hasPlan={false} // TODO: Could fetch monthly summary to show dots
                  onClick={setSelectedDate}
                />
              ))}
            </Box>
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
                             <Chip label={event.time} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                             <Typography sx={{ flex: 1, fontWeight: 500 }}>{event.title}</Typography>
                             <IconButton size="small" color="error" onClick={() => handleDeleteEvent(event)}><Trash2 size={16} /></IconButton>
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
                             <Typography sx={{ flex: 1, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'text.secondary' : 'text.primary' }}>
                               {task.text}
                             </Typography>
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
