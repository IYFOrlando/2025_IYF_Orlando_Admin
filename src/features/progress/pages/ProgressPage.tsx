// src/features/progress/pages/ProgressPage.tsx
import * as React from 'react'
import {
  CardContent, Stack, Button, Tooltip, Box, Alert,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Typography, Autocomplete, 
  CircularProgress
} from '@mui/material'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import InsightsIcon from '@mui/icons-material/Insights'
import SearchIcon from '@mui/icons-material/Search'

import { db, auth } from '../../../lib/firebase'
import { PROGRESS_COLLECTION, REG_COLLECTION } from '../../../lib/config'
import {
  addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc, getDocs, where, limit
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Alert as SAlert, confirmDelete, notifyError, notifySuccess } from '../../../lib/alerts'
import { GlassCard } from '../../../components/GlassCard'
import { useTeacherContext } from '../../auth/context/TeacherContext'
import { useTeacherNotifications } from '../../dashboard/hooks/useTeacherNotifications'

type Prog = {
  id:string; date:string; registrationId:string; studentName:string;
  academy?:string; level?:string; score?:number; note?:string
}

// Keep in sync with Firestore rules isAdmin() allowlist
const ADMIN_EMAILS = ['jodlouis.dev@gmail.com']

export default function ProgressPage() {
  const { isTeacher, teacherProfile, isAdmin: contextIsAdmin } = useTeacherContext()

  // Admin detection (for UI enable/disable)
  const [userEmail, setUserEmail] = React.useState<string | null>(auth.currentUser?.email || null)
  React.useEffect(() => onAuthStateChanged(auth, u => setUserEmail(u?.email || null)), [])
  
  const isSuperAdmin = !!(userEmail && ADMIN_EMAILS.includes(userEmail)) || contextIsAdmin
  const canEdit = isSuperAdmin || isTeacher

  const [rows, setRows] = React.useState<Prog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string|null>(null)
  const [selection, setSelection] = React.useState<string[]>([])
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Prog | null>(null)

  React.useEffect(()=>{
    let q = query(collection(db, PROGRESS_COLLECTION), orderBy('date','desc'))
    
    // If teacher, filter by their assigned academies
    if (isTeacher && teacherProfile?.academies) {
      const assigned = teacherProfile.academies.map(a => a.academyName)
      if (assigned.length > 0) {
        // Firebase 'in' is limited to 10. For now assuming teachers have < 10.
        q = query(collection(db, PROGRESS_COLLECTION), where('academy', 'in', assigned), orderBy('date','desc'))
      } else {
        // Teacher with no classes = no progress data
        setRows([]); setLoading(false); return
      }
    }

    const unsub = onSnapshot(q,
      snap => { setRows(snap.docs.map(d => ({ id:d.id, ...(d.data() as any) }))); setLoading(false) },
      err  => { 
        console.error(err)
        setError(err.message.includes('index') ? 'Missing index for scoped query. Check console.' : (err.message||'Failed'))
        setLoading(false) 
      }
    )
    return () => unsub()
  },[isTeacher, teacherProfile])

  const cols = React.useMemo<GridColDef[]>(()=>[
    { field:'date', headerName:'Date', width:130 },
    // Removed Period Column
    { field:'studentName', headerName:'Student', minWidth:200, flex:1 },
    { field:'academy', headerName:'Academy', minWidth:160, flex:1 },
    { field:'level', headerName:'Level', minWidth:140, flex:1 },
    { field:'score', headerName:'Score', width:90 },
    { field:'note', headerName:'Note', minWidth:240, flex:1 },
    {
      field: 'actions', headerName: 'Actions', width: 100, sortable:false, filterable:false,
      renderCell: (p) => (
        <Tooltip title={canEdit ? 'Edit' : 'Read-only'}>
          <span>
            <IconButton size="small" onClick={() => canEdit && setEditing(p.row as Prog)} disabled={!canEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )
    }
  ],[canEdit])

  const handleDelete = async () => {
    if (!isSuperAdmin) return SAlert.fire({ title:'Super Admin Only', text:'Only admins can delete record(s).', icon:'info' })
    if (!selection.length) return SAlert.fire({ title:'No rows selected', icon:'info', timer:1200, showConfirmButton:false })
    const res = await confirmDelete('Delete progress?', `You are about to delete ${selection.length} record(s).`)
    if (!res.isConfirmed) return
    try {
      await Promise.all(selection.map(id => deleteDoc(doc(db, PROGRESS_COLLECTION, id))))
      notifySuccess('Deleted', `${selection.length} progress record(s) removed`)
      setSelection([])
    } catch (e:any) {
      notifyError('Delete failed', e?.message)
    }
  }

  return (
    <Box>
      {/* Header with Gradient */}
      <Box sx={{ 
        mb: 4,
        background: 'linear-gradient(135deg, #009688 0%, #006064 100%)', // Teal/Cyan gradient
        borderRadius: 3,
        p: 3,
        color: 'white',
        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.14), 0 7px 10px -5px rgba(0, 150, 136, 0.4)'
      }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <InsightsIcon sx={{ fontSize: 40, color: 'white' }} />
          <Box>
            <Typography variant="h4" fontWeight={800} color="white">
              Student Progress
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5, color: 'white' }}>
              {isSuperAdmin ? 'Full admin visibility' : isTeacher ? 'Scoping by assigned classes' : 'View progress (read-only)'}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <GlassCard>
        <CardContent>
          {!canEdit && <Alert severity="info" sx={{ mb:2, borderRadius: 2 }}>You can view progress. Only admins or teachers can add/edit records.</Alert>}

          <Stack direction="row" spacing={1} sx={{ mb:2 }}>
            <Button 
              startIcon={<AddIcon />} 
              variant="contained" 
              onClick={()=>{ setEditing(null); setOpen(true) }} 
              disabled={!canEdit}
              sx={{ 
                borderRadius: 2, 
                background: 'linear-gradient(45deg, #009688 30%, #00BCD4 90%)',
                boxShadow: '0 3px 5px 2px rgba(0, 188, 212, .3)'
              }}
            >
              New Record
            </Button>
            <Tooltip title={isSuperAdmin ? 'Delete selected' : 'Super Admin only'}>
              <span><Button color="error" startIcon={<DeleteIcon />} onClick={handleDelete} disabled={!isSuperAdmin || !selection.length} sx={{ borderRadius: 2 }}>Delete</Button></span>
            </Tooltip>
          </Stack>

          {error && <Alert severity="error" sx={{ mb:1, borderRadius: 2 }}>{error}</Alert>}

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={cols}
              loading={loading}
              checkboxSelection={isSuperAdmin}
              disableRowSelectionOnClick
              onRowSelectionModelChange={(m)=>setSelection(m as string[])}
              rowSelectionModel={selection}
              onRowDoubleClick={(p)=> canEdit && setEditing(p.row as Prog)}
              getRowId={(r)=>r.id}
              slots={{ toolbar: GridToolbar }}
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(224, 224, 224, 0.4)' },
                '& .MuiDataGrid-columnHeaders': { 
                  bgcolor: 'rgba(0, 150, 136, 0.08)', 
                  fontWeight: 700 
                },
              }}
            />
          </Box>

          <ProgressDialog
            open={open || !!editing}
            onClose={()=>{ setOpen(false); setEditing(null) }}
            editing={editing}
            canEdit={canEdit}
            isTeacher={isTeacher}
            teacherProfile={teacherProfile}
          />
        </CardContent>
      </GlassCard>
    </Box>
  )
}

function ProgressDialog({
  open, onClose, editing, canEdit, isTeacher, teacherProfile
}: { 
  open:boolean; onClose:()=>void; editing:Prog|null; 
  canEdit:boolean; isTeacher:boolean; teacherProfile: any
}) {
  const { addNotification } = useTeacherNotifications(false) // Trigger only
  const [date, setDate] = React.useState<string>(editing?.date || new Date().toISOString().slice(0,10))
  const [registrationId, setRegistrationId] = React.useState(editing?.registrationId || '')
  const [studentName, setStudentName] = React.useState(editing?.studentName || '')
  
  const [academy, setAcademy] = React.useState(editing?.academy || '')
  const [level, setLevel] = React.useState(editing?.level || '')
  const [score, setScore] = React.useState<number|''>(editing?.score ?? '')
  const [note, setNote] = React.useState(editing?.note || '')

  // Available options for this student
  const [availableAcademies, setAvailableAcademies] = React.useState<string[]>([])
  
  // Search state
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [searching, setSearching] = React.useState(false)

  React.useEffect(()=>{
    if (editing) {
      setDate(editing.date); setRegistrationId(editing.registrationId)
      setStudentName(editing.studentName); setAcademy(editing.academy || ''); setLevel(editing.level || '')
      setScore(editing.score ?? ''); setNote(editing.note || '')
      setAvailableAcademies([]) 
      void loadFromRegId(editing.registrationId) // Attempt to load Academies even on edit
    } else {
      setDate(new Date().toISOString().slice(0,10))
      setRegistrationId(''); setStudentName(''); setAcademy(''); setLevel(''); setScore(''); setNote('')
      setAvailableAcademies([])
    }
  },[editing])

  const loadFromRegId = async (rid: string) => {
    try {
      if (!rid) return
      const snap = await getDoc(doc(db, REG_COLLECTION, rid))
      if (snap.exists()) {
        const r:any = snap.data()
        setStudentName(`${r?.firstName||''} ${r?.lastName||''}`.trim())
        
        const options = new Set<string>()
        const p1 = (r.firstPeriod?.academy || '').trim()
        const p2 = (r.secondPeriod?.academy || '').trim()
        if (p1 && p1.toLowerCase()!=='n/a') options.add(p1)
        if (p2 && p2.toLowerCase()!=='n/a') options.add(p2)
        if (r.selectedAcademies && Array.isArray(r.selectedAcademies)) {
          r.selectedAcademies.forEach((sa:any) => {
            const a = (sa?.academy || '').trim()
            if (a && a.toLowerCase()!=='n/a') {
              // If teacher, only allow their own academies
              if (!isTeacher || teacherProfile?.academies?.some((ta:any) => ta.academyName === a)) {
                options.add(a)
              }
            }
          })
        }
        const list = Array.from(options).sort()
        setAvailableAcademies(list)
        if (list.length > 0 && !editing) {
           setAcademy(list[0])
           const found = r.selectedAcademies?.find((s:any) => (s.academy||'').trim() === list[0])
           if (found?.level) setLevel(found.level)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleManualLoad = async () => {
    if (!registrationId) return
    const snap = await getDoc(doc(db, REG_COLLECTION, registrationId))
    if (!snap.exists()) return SAlert.fire({ title:'Not found', icon:'warning' })
    await loadFromRegId(registrationId)
  }

  const handleSearch = async () => {
    if (!searchTerm || searchTerm.length < 2) return
    setSearching(true)
    try {
      const term = searchTerm.trim()
      // Prefix search for firstName and lastName
      const q1 = query(collection(db, REG_COLLECTION), where('firstName', '>=', term), where('firstName', '<=', term + '\uf8ff'), limit(25))
      const q2 = query(collection(db, REG_COLLECTION), where('lastName', '>=', term), where('lastName', '<=', term + '\uf8ff'), limit(25))
      
      const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)])
      
      const combined = new Map()
      s1.forEach(d => combined.set(d.id, { id:d.id, ...(d.data() as any) }))
      s2.forEach(d => combined.set(d.id, { id:d.id, ...(d.data() as any) }))
      
      setSearchResults(Array.from(combined.values()))
    } catch (e) {
      console.error(e)
    } finally {
      setSearching(false)
    }
  }

  const selectStudent = (s:any) => {
    setRegistrationId(s.id)
    setStudentName(`${s.firstName} ${s.lastName}`)
    setSearchOpen(false)
    void loadFromRegId(s.id)
  }

  const save = async () => {
    if (!canEdit) return SAlert.fire({ title:'Read-only', text:'Only admins or teachers can save.', icon:'info' })
    
    // Scoped validation for teachers
    if (isTeacher && teacherProfile) {
      const assigned = teacherProfile.academies?.map((a:any) => a.academyName) || []
      if (!assigned.includes(academy)) {
        return SAlert.fire({ title:'Permission Denied', text:`You are not assigned to ${academy}.`, icon:'error' })
      }
    }

    try {
      const payload:any = {
        date, registrationId, studentName, academy, level,
        score: score === '' ? null : Number(score),
        note: note || null,
        updatedAt: serverTimestamp()
      }
      if (editing?.id) {
        await updateDoc(doc(db, PROGRESS_COLLECTION, editing.id), payload)
      } else {
        await addDoc(collection(db, PROGRESS_COLLECTION), { ...payload, createdAt: serverTimestamp() })
      }
      onClose()
      notifySuccess('Saved', 'Progress saved successfully')

      // Real-time Notification for Admins
      if (isTeacher && teacherProfile) {
        void addNotification({
          teacherId: teacherProfile.id,
          teacherName: teacherProfile.name,
          action: 'Updated Progress',
          academy: academy,
          details: `Student: ${studentName}, Score: ${score || 'N/A'}`
        })
      }
    } catch (e:any) {
      SAlert.fire({ title:'Save failed', text:e?.message, icon:'error' })
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Progress' : 'New Progress'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt:1 }}>
            <TextField label="Date" type="date" InputLabelProps={{shrink:true}} value={date} onChange={e=>setDate(e.target.value)} />
            
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField 
                label="Registration ID" 
                value={registrationId} 
                onChange={e=>setRegistrationId(e.target.value)} 
                fullWidth 
                helperText="Enter ID or Search"
              />
              <Tooltip title="Search by Name">
                <IconButton onClick={()=>setSearchOpen(true)} color="primary" sx={{ border: '1px solid rgba(0,0,0,0.1)' }}>
                  <SearchIcon />
                </IconButton>
              </Tooltip>
              <Button onClick={handleManualLoad} variant="outlined" sx={{ minWidth: 80 }}>Load</Button>
            </Stack>

            <TextField label="Student Name" value={studentName} onChange={e=>setStudentName(e.target.value)} />
            
            <Autocomplete
              freeSolo
              options={availableAcademies}
              value={academy}
              onChange={(_, val) => setAcademy(val || '')}
              onInputChange={(_, val) => setAcademy(val)}
              renderInput={(params) => <TextField {...params} label="Academy" helperText={availableAcademies.length > 1 ? "Select from their enrolled academies" : "Type or auto-filled"} />}
            />
            
            <TextField label="Level" value={level} onChange={e=>setLevel(e.target.value)} />
            <TextField label="Score (0-100)" type="number" inputProps={{min:0,max:100}} value={score} onChange={e=>setScore(e.target.value === '' ? '' : Number(e.target.value))} />
            <TextField label="Note" value={note} onChange={e=>setNote(e.target.value)} multiline rows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={!canEdit}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Student Search Dialog */}
      <Dialog open={searchOpen} onClose={()=>setSearchOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Search Student</DialogTitle>
        <DialogContent>
           <Stack spacing={2} sx={{ mt: 1 }}>
             <Stack direction="row" spacing={1}>
                <TextField 
                  autoFocus
                  fullWidth 
                  placeholder="First or Last Name..." 
                  value={searchTerm} 
                  onChange={e=>setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <Button variant="contained" onClick={handleSearch} disabled={searching}>
                  {searching ? <CircularProgress size={20} color="inherit" /> : 'Go'}
                </Button>
             </Stack>
             <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {searchResults.map(s => (
                  <Box key={s.id} onClick={()=>selectStudent(s)} sx={{ p:1, borderBottom:'1px solid #eee', cursor:'pointer', '&:hover':{ bgcolor:'#f5f5f5' } }}>
                    <Typography variant="subtitle2">{s.firstName} {s.lastName}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.email} | {s.city}</Typography>
                  </Box>
                ))}
                {searchResults.length === 0 && !searching && searchTerm && (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>No matches found</Typography>
                )}
             </Box>
           </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setSearchOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
