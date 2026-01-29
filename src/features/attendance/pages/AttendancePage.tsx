import * as React from 'react'
import {
  CardContent, Stack, Button, Tooltip, Box, Alert,
  TextField, MenuItem, Chip, Switch, Autocomplete, Grid, Typography
} from '@mui/material'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import CloseIcon from '@mui/icons-material/Close'
import ChecklistIcon from '@mui/icons-material/Checklist'
import {
  addDoc, collection, deleteDoc, doc, query,
  serverTimestamp, updateDoc, where, getDocs
} from 'firebase/firestore'
import type { QueryConstraint } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

import { db, auth } from '../../../lib/firebase'
import { ATTENDANCE_COLLECTION } from '../../../lib/config'
import { Alert as SAlert, confirmDelete, notifyError, notifySuccess } from '../../../lib/alerts'
import { useRegistrations } from '../../registrations/hooks/useRegistrations'
import type { Registration } from '../../registrations/types'
import { GlassCard } from '../../../components/GlassCard'
import { useTeacherContext } from '../../auth/context/TeacherContext'
import { useInstructors } from '../../payments/hooks/useInstructors'
import { useTeacherNotifications } from '../../dashboard/hooks/useTeacherNotifications'

const KOREAN = 'Korean Language'
const KOREAN_LEVELS = ['Alphabet', 'Beginner', 'Intermediate', 'K-Movie Conversation'] as const

// Keep in sync with Firestore rules isAdmin() allowlist
const ADMIN_EMAILS = ['jodlouis.dev@gmail.com']

type Row = {
  id: string
  registrationId: string
  studentName: string
  present: boolean
  reason?: string
  percent?: number
}

interface AttendanceDoc {
  registrationId: string
  studentName: string
  present: boolean
  reason?: string
  date: string
  academy: string
  level?: string
  teacherName?: string
  teacherNote?: string
  updatedAt?: any
}

export default function AttendancePage() {
  const { data: regs } = useRegistrations()
  const { getInstructorByAcademy } = useInstructors()
  
  // Teacher Context
  const { isTeacher, teacherProfile, isAdmin: contextIsAdmin } = useTeacherContext()
  const { addNotification } = useTeacherNotifications(false) // Trigger only, no need to listen here

  // Who is signed in (to flip admin vs read-only)
  // We keep the old local check for fallback, but prefer contextIsAdmin
  const [userEmail, setUserEmail] = React.useState<string | null>(auth.currentUser?.email || null)
  React.useEffect(() => onAuthStateChanged(auth, u => setUserEmail(u?.email || null)), [])
  
  const isSuperAdmin = !!(userEmail && ADMIN_EMAILS.includes(userEmail)) || contextIsAdmin
  const canEdit = isSuperAdmin || isTeacher

  // Filters
  // Determine initial date (nearest past Saturday or today if Saturday)
  const getInitialSaturday = () => {
    const d = new Date()
    const day = d.getDay()
    if (day !== 6) {
       // 0=Sun (1 ago), 1=Mon (2 ago), ... 5=Fri (6 ago)
       const diff = (day + 1) % 7
       d.setDate(d.getDate() - diff)
    }
    return d.toISOString().slice(0, 10)
  }

  const [date, setDate] = React.useState<string>(getInitialSaturday())

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (!val) return
    const d = new Date(val)
    // Use getUTCDay because input type="date" value is YYYY-MM-DD (UTC midnight)
    if (d.getUTCDay() !== 6) {
        notifyError('Only Saturdays allowed', 'Please select a Saturday.')
        return
    }
    setDate(val)
  }
  // Removed period state
  const [academy, setAcademy] = React.useState<string>('')
  const [level, setLevel] = React.useState<string>('')
  const [teacherName, setTeacherName] = React.useState<string>('')
  const [teacherNote, setTeacherNote] = React.useState<string>('')

  // Auto-fill teacher name when academy/level changes
  React.useEffect(() => {
    if (academy) {
      const instructor = getInstructorByAcademy(academy, level || null)
      if (instructor && instructor.name) {
        setTeacherName(instructor.name)
      }
    }
  }, [academy, level, getInstructorByAcademy])

  // Academies from registrations (all selected academies)
  const academies = React.useMemo(() => {
    // If teacher, only show their assigned academies
    if (isTeacher && teacherProfile) {
      return teacherProfile.academies.map(a => a.academyName).sort((a, b) => a.localeCompare(b))
    }

    const set = new Set<string>()
    regs.forEach(r => {
      // Check legacy period fields
      const a1 = (r?.firstPeriod?.academy || '').trim()
      const a2 = (r?.secondPeriod?.academy || '').trim()
      if (a1 && a1.toLowerCase() !== 'n/a') set.add(a1)
      if (a2 && a2.toLowerCase() !== 'n/a') set.add(a2)
      
      // Check new selectedAcademies array
      if (r.selectedAcademies && Array.isArray(r.selectedAcademies)) {
        r.selectedAcademies.forEach(sa => {
          const a = (sa?.academy || '').trim()
          if (a && a.toLowerCase() !== 'n/a') set.add(a)
        })
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [regs, isTeacher, teacherProfile])

  // Auto-select academy if only one available (for teachers)
  React.useEffect(() => {
    if (isTeacher && academies.length === 1 && !academy) {
      setAcademy(academies[0])
    }
  }, [isTeacher, academies, academy])

  // Roster for selected class (Dynamic)
  const roster = React.useMemo(() => {
    if (!academy) return []
    const isK = academy === KOREAN
    const list: { id: string; name: string }[] = []
    
    regs.forEach((r: Registration) => {
      // Consolidated check: is student enrolled in this academy?
      let isEnrolled = false
      let studentLevel = ''

      // 1. Check legacy periods
      const p1 = (r?.firstPeriod?.academy || '').trim()
      const p2 = (r?.secondPeriod?.academy || '').trim()
      
      if (p1 === academy) {
        isEnrolled = true
        studentLevel = (r?.firstPeriod?.level || '').trim()
      } else if (p2 === academy) {
        isEnrolled = true
        studentLevel = (r?.secondPeriod?.level || '').trim()
      }

      // 2. Check new selectedAcademies
      if (!isEnrolled && r.selectedAcademies) {
        const found = r.selectedAcademies.find(sa => (sa?.academy || '').trim() === academy)
        if (found) {
          isEnrolled = true
          studentLevel = (found.level || '').trim()
        }
      }

      if (isEnrolled) {
        // Filter by level if Korean
        if (!isK || !level || studentLevel === level) {
          const fullName = `${r.firstName || ''} ${r.lastName || ''}`.trim()
          list.push({ id: r.id, name: fullName })
        }
      }
    })

    // unique + sorted
    const m = new Map(list.map(s => [s.id, s]))
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [regs, academy, level])

  // History for this class (to compute %)
  const [classHistory, setClassHistory] = React.useState<any[]>([])
  React.useEffect(() => {
    if (!academy) { setClassHistory([]); return }
    // Query by academy only (ignore period)
    const cons: any[] = [ where('academy','==',academy) ]
    if (academy === KOREAN) cons.push(where('level','==', level || ''))
    
    const qAll = query(collection(db, ATTENDANCE_COLLECTION), ...cons)
    getDocs(qAll).then(snap => {
      setClassHistory(snap.docs.map(d => ({ id:d.id, ...(d.data() as AttendanceDoc) })))
    })
  }, [academy, level])

  // Grid rows
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string|null>(null)
  const [selection, setSelection] = React.useState<string[]>([])

  const loadClassForDate = React.useCallback(async () => {
    try {
      setLoading(true); setError(null)
      if (!academy) { setRows([]); setLoading(false); return }

      // Query by date + academy (ignore period)
      const cons: any[] = [ where('date','==',date), where('academy','==',academy) ]
      if (academy === KOREAN) cons.push(where('level','==', level || ''))
      
      const qDay = query(collection(db, ATTENDANCE_COLLECTION), ...cons)
      const snap = await getDocs(qDay)
      const byReg = new Map<string, any>()
      snap.forEach(d => byReg.set((d.data() as AttendanceDoc).registrationId, { id:d.id, ...(d.data() as AttendanceDoc) }))

      // compute % from history
      const totals = new Map<string,{present:number; total:number}>()
      classHistory.forEach(a => {
        const t = totals.get(a.registrationId) || { present:0, total:0 }
        t.total += 1; if (a.present) t.present += 1
        totals.set(a.registrationId, t)
      })

      const base: Row[] = roster.map(s => {
        const ex = byReg.get(s.id)
        const t = totals.get(s.id)
        const percent = t && t.total>0 ? Math.round((t.present/t.total)*100) : undefined
        return {
          id: s.id,
          registrationId: s.id, // Ensure this matches existing ID if any
          studentName: s.name,
          present: ex ? !!ex.present : true,
          reason: ex?.reason || '',
          percent
        }
      })
      setRows(base); setLoading(false)
    } catch (e) {
      console.error(e)
      const msg = e instanceof Error ? e.message : 'Unknown error'
      setError(msg.includes('index') 
        ? 'Missing index. Check console for link.' 
        : msg)
      setLoading(false)
    }
  }, [academy, level, date, roster, classHistory])

  React.useEffect(()=>{ void loadClassForDate() }, [loadClassForDate])

  // Columns
  const cols = React.useMemo<GridColDef[]>(() => [
    { field:'studentName', headerName:'Student', minWidth:220, flex:1 },
    {
      field:'present', headerName:'Present', width:120, sortable:false, filterable:false,
      renderCell:(p)=>(
        <Switch
          checked={!!p.row.present}
          onChange={(e)=>{
            const checked=e.target.checked
            setRows(prev=>prev.map(r=>r.id===p.row.id?{...r,present:checked,reason: checked? '' : r.reason}:r))
          }}
          disabled={!canEdit}
        />
      )
    },
    {
      field:'reason', headerName:'Reason (if absent)', minWidth:260, flex:1.2, sortable:false, filterable:false,
      renderCell:(p)=>(
        <TextField
          size="small" fullWidth placeholder="Illness, travel, family…"
          value={p.row.reason || ''}
          disabled={p.row.present || !canEdit}
          onChange={(e)=> setRows(prev=>prev.map(r=>r.id===p.row.id?{...r,reason:e.target.value}:r))}
        />
      )
    },
    {
      field:'percent', headerName:'Attendance %', width:140,
      renderCell:(p)=>{
        const pct = typeof p.row.percent === 'number' ? p.row.percent : undefined
        return (
          pct !== undefined
            ? <Chip size="small" color={pct>=90?'success':pct>=75?'warning':'default'} label={`${pct}%`} />
            : <Chip size="small" variant="outlined" label="—" />
        )
      }
    }
  ], [canEdit])

  // Admin-only helpers
  const markAll = (val:boolean)=> setRows(prev=>prev.map(r=>({...r,present:val,reason: val? '' : r.reason})))

  const saveAll = async ()=>{
    if (!canEdit) return SAlert.fire({ title:'Read-only', text:'Only admins or teachers can save.', icon:'info' })
    if (!academy) return SAlert.fire({ title:'Select an academy', icon:'warning' })
    try{
      // Check existing by date+academy (ignore period)
      const cons: QueryConstraint[] = [ where('date','==',date), where('academy','==',academy) ]
      if (academy===KOREAN) cons.push(where('level','==', level || ''))
      
      const qDay = query(collection(db, ATTENDANCE_COLLECTION), ...cons)
      const snap = await getDocs(qDay)
      const existingByReg = new Map<string,{id:string}>()
      snap.forEach(d=> existingByReg.set((d.data() as AttendanceDoc).registrationId, { id:d.id }))

      const base:any = {
        date, 
        academy, 
        level: academy===KOREAN ? (level||'') : '',
        teacherName: teacherName || '',
        teacherNote: teacherNote || '',
        period: 0 // Default to 0 for dynamic (or 1 if we want to default)
      }

      const ops:Promise<any>[]=[]
      rows.forEach(r=>{
        const exists = existingByReg.get(r.registrationId)
        const data = {
          ...base,
          registrationId: r.registrationId,
          studentName: r.studentName,
          present: !!r.present,
          reason: r.present ? '' : (r.reason || ''),
          updatedAt: serverTimestamp()
        }
        if (exists) ops.push(updateDoc(doc(db, ATTENDANCE_COLLECTION, exists.id), data))
        else ops.push(addDoc(collection(db, ATTENDANCE_COLLECTION), { ...data, createdAt: serverTimestamp() }))
      })

      await Promise.all(ops)
      notifySuccess('Attendance saved', `${rows.length} record(s) updated`)
      
      // Real-time Notification for Admins
      if (isTeacher && teacherProfile) {
        void addNotification({
          teacherId: teacherProfile.id,
          teacherName: teacherProfile.name,
          action: 'Updated Attendance',
          academy: academy,
          details: `Date: ${date}, ${rows.length} students`
        })
      }

      void loadClassForDate()
    }catch(e){
      notifyError('Save failed', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  const handleDelete = async ()=>{
    if (!isSuperAdmin) return SAlert.fire({ title:'Super Admin Only', text:'Only admins can delete attendance records.', icon:'info' })
    if (!selection.length) return SAlert.fire({ title:'No rows selected', icon:'info', timer:1200, showConfirmButton:false })
    try{
      const realDocIds:string[] = []
      
      const cons: QueryConstraint[] = [ where('date','==',date), where('academy','==',academy) ]
      if (academy===KOREAN) cons.push(where('level','==', level || ''))
      const qDay = query(collection(db, ATTENDANCE_COLLECTION), ...cons)
      const snap = await getDocs(qDay)
      
      snap.forEach(d => {
        const data = d.data() as AttendanceDoc
        // If the selection includes the Doc ID (saved row) OR the Registration ID (in case logic shifts)
        // We rely on doc.id primarily.
        if (selection.includes(d.id) || selection.includes(data.registrationId)) {
           realDocIds.push(d.id)
        }
      })

      if (!realDocIds.length) {
         setSelection([])
         return
      }

      const res = await confirmDelete('Delete attendance?', `You are about to delete ${realDocIds.length} record(s) for ${date}.`)
      if (!res.isConfirmed) return
      
      await Promise.all(realDocIds.map(id=> deleteDoc(doc(db, ATTENDANCE_COLLECTION, id))))
      notifySuccess('Deleted', `${realDocIds.length} record(s) removed`)
      setSelection([])
      void loadClassForDate()
    }catch(e){
      notifyError('Delete failed', e instanceof Error ? e.message : 'Unknown error')
    }
  }

  return (
    <Box>
      {/* Header with Gradient */}
      <Box sx={{ 
        mb: 4,
        background: 'linear-gradient(135deg, #3F51B5 0%, #1976D2 100%)',
        borderRadius: 3,
        p: { xs: 2.5, sm: 3 },
        color: 'white',
        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.14), 0 7px 10px -5px rgba(63, 81, 181, 0.4)'
      }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          alignItems={{ xs: 'flex-start', sm: 'center' }} 
          spacing={2}
        >
          <ChecklistIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: 'white' }} />
          <Box>
            <Typography variant="h4" fontWeight={800} color="white">
              Attendance Tracker
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5, color: 'white' }}>
              {isSuperAdmin ? 'Admin mode (full edit)' : isTeacher ? 'Teacher mode (scoped)' : 'Viewer mode (read-only)'}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <GlassCard>
        <CardContent>
          {!canEdit && (
            <Alert severity="info" sx={{ mb:2, borderRadius: 2 }}>
              You can view rosters and attendance, but only admins or teachers can modify.
            </Alert>
          )}

          {/* Filters */}
          <GlassCard sx={{ mb: 3, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'rgba(255,255,255,0.4)', boxShadow: 'none' }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box component="span" sx={{ width: 4, height: 24, bgcolor: 'primary.main', borderRadius: 1 }} />
                Filters & Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField 
                    label="Date" 
                    type="date" 
                    InputLabelProps={{ shrink:true }} 
                    value={date} 
                    onChange={handleDateChange} 
                    fullWidth 
                    size="small"
                    helperText="Saturdays only"
                  />
                </Grid>
                {/* Period Dropped */}
                <Grid item xs={12} md={5}>
                  <Autocomplete
                    options={academies}
                    value={academy || null}
                    onChange={(_,v)=>{ setAcademy(v||''); if ((v||'')!==KOREAN) setLevel('') }}
                    renderInput={(p)=> <TextField {...p} label="Academy" placeholder="Select academy…" size="small" />}
                    fullWidth
                  />
                </Grid>
                {academy===KOREAN && (
                  <Grid item xs={12} md={4}>
                    <TextField 
                      select 
                      label="Korean Level" 
                      value={level} 
                      onChange={e=>setLevel(e.target.value)} 
                      fullWidth 
                      size="small"
                    >
                      {KOREAN_LEVELS.map(l=> <MenuItem key={l} value={l}>{l}</MenuItem>)}
                    </TextField>
                  </Grid>
                )}
              </Grid>

              {/* Teacher info */}
              <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mt: 2 }}>
                <TextField 
                  label="Teacher Name" 
                  value={teacherName} 
                  onChange={e=>setTeacherName(e.target.value)} 
                  sx={{ minWidth:240 }} 
                  disabled={!canEdit} 
                  size="small"
                />
                <TextField 
                  label="Teacher Note" 
                  value={teacherNote} 
                  onChange={e=>setTeacherNote(e.target.value)} 
                  fullWidth 
                  disabled={!canEdit} 
                  size="small"
                />
              </Stack>
            </CardContent>
          </GlassCard>

          {/* Actions */}
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={1.5} 
            alignItems={{ xs: 'stretch', sm: 'center' }} 
            sx={{ mb: 3, flexWrap: 'wrap' }}
          >
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Tooltip title="Load/refresh roster for this date & class">
                <Button startIcon={<AddIcon />} variant="outlined" onClick={loadClassForDate} disabled={!academy} sx={{ borderRadius: 2, flex: { xs: 1, sm: 'none' } }}>Load Class</Button>
              </Tooltip>
              {canEdit && (
                <>
                  <Tooltip title="Mark everyone present">
                    <Button startIcon={<DoneAllIcon />} color="success" onClick={()=>markAll(true)} disabled={!rows.length} sx={{ minWidth: { xs: '45%', sm: 'auto' } }}>All Present</Button>
                  </Tooltip>
                  <Tooltip title="Mark everyone absent">
                    <Button startIcon={<CloseIcon />} color="warning" onClick={()=>markAll(false)} disabled={!rows.length} sx={{ minWidth: { xs: '45%', sm: 'auto' } }}>All Absent</Button>
                  </Tooltip>
                </>
              )}
            </Box>

            {isSuperAdmin && canEdit && selection.length > 0 && (
              <Tooltip title="Delete selected rows for this date">
                <Button color="error" startIcon={<DeleteIcon />} onClick={handleDelete} sx={{ borderRadius: 2 }}>Delete ({selection.length})</Button>
              </Tooltip>
            )}

            <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }} />
            
            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: 'space-between' }}>
              <Chip 
                label={`${rows.length} students`} 
                color="primary" 
                variant="outlined" 
                sx={{ borderRadius: 2, fontWeight: 600 }}
              />
              <Button 
                variant="contained" 
                startIcon={<SaveIcon />} 
                onClick={saveAll} 
                disabled={!rows.length || !canEdit}
                sx={{ 
                  borderRadius: 2, 
                  background: 'linear-gradient(45deg, #3F51B5 30%, #2196F3 90%)',
                  boxShadow: '0 3px 5px 2px rgba(33, 150, 243, .3)',
                  flex: { xs: 1, sm: 'none' }
                }}
              >
                Save Attendance
              </Button>
            </Stack>
          </Stack>

          {error && <Alert severity="error" sx={{ mb:1, borderRadius: 2 }}>{error}</Alert>}

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={cols}
              loading={loading}
              checkboxSelection={canEdit}
              disableRowSelectionOnClick
              onRowSelectionModelChange={(m)=>setSelection(m as string[])}
              rowSelectionModel={selection}
              getRowId={(r) => r.id}
              slots={{ toolbar: GridToolbar }}
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(224, 224, 224, 0.4)' },
                '& .MuiDataGrid-columnHeaders': { 
                  bgcolor: 'rgba(63, 81, 181, 0.08)', 
                  fontWeight: 700 
                },
              }}
            />
          </Box>
        </CardContent>
      </GlassCard>
    </Box>
  )
}
