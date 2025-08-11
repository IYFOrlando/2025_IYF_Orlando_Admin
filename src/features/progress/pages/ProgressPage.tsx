// src/features/progress/pages/ProgressPage.tsx
import * as React from 'react'
import {
  Card, CardHeader, CardContent, Stack, Button, Tooltip, Box, Alert,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, IconButton
} from '@mui/material'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { db, auth } from '../../../lib/firebase'
import { PROGRESS_COLLECTION, REG_COLLECTION } from '../../../lib/config'
import {
  addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Alert as SAlert, confirmDelete, notifyError, notifySuccess } from '../../../lib/alerts'

type Prog = {
  id:string; date:string; period:1|2; registrationId:string; studentName:string;
  academy?:string; level?:string; score?:number; note?:string
}

// Keep in sync with Firestore rules isAdmin() allowlist
const ADMIN_EMAILS = ['jodlouis.dev@gmail.com']

export default function ProgressPage() {
  // Admin detection (for UI enable/disable)
  const [userEmail, setUserEmail] = React.useState<string | null>(auth.currentUser?.email || null)
  React.useEffect(() => onAuthStateChanged(auth, u => setUserEmail(u?.email || null)), [])
  const isAdmin = !!(userEmail && ADMIN_EMAILS.includes(userEmail))

  const [rows, setRows] = React.useState<Prog[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string|null>(null)
  const [selection, setSelection] = React.useState<string[]>([])
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Prog | null>(null)

  React.useEffect(()=>{
    const q = query(collection(db, PROGRESS_COLLECTION), orderBy('date','desc'))
    const unsub = onSnapshot(q,
      snap => { setRows(snap.docs.map(d => ({ id:d.id, ...(d.data() as any) }))); setLoading(false) },
      err  => { setError(err.message||'Failed'); setLoading(false) }
    )
    return () => unsub()
  },[])

  const cols = React.useMemo<GridColDef[]>(()=>[
    { field:'date', headerName:'Date', width:130 },
    { field:'period', headerName:'Period', width:90 },
    { field:'studentName', headerName:'Student', minWidth:200, flex:1 },
    { field:'academy', headerName:'Academy', minWidth:160, flex:1 },
    { field:'level', headerName:'Level', minWidth:140, flex:1 },
    { field:'score', headerName:'Score', width:90 },
    { field:'note', headerName:'Note', minWidth:240, flex:1 },
    {
      field: 'actions', headerName: 'Actions', width: 100, sortable:false, filterable:false,
      renderCell: (p) => (
        <Tooltip title={isAdmin ? 'Edit' : 'Admin only'}>
          <span>
            <IconButton size="small" onClick={() => isAdmin && setEditing(p.row as Prog)} disabled={!isAdmin}>
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )
    }
  ],[isAdmin])

  const handleDelete = async () => {
    if (!isAdmin) return SAlert.fire({ title:'Read-only', text:'Only admins can delete.', icon:'info' })
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
    <Card elevation={0} sx={{ borderRadius:3 }}>
      <CardHeader title="Progress" subheader={isAdmin ? 'Notes and scores by student/period' : 'View progress (read-only)'} />
      <CardContent>
        {!isAdmin && <Alert severity="info" sx={{ mb:1 }}>You can view progress. Only admins can add, edit, or delete records.</Alert>}

        <Stack direction="row" spacing={1} sx={{ mb:1 }}>
          <Button startIcon={<AddIcon />} variant="contained" onClick={()=>{ setEditing(null); setOpen(true) }} disabled={!isAdmin}>New</Button>
          <Tooltip title={isAdmin ? 'Delete selected' : 'Admin only'}>
            <span><Button color="error" startIcon={<DeleteIcon />} onClick={handleDelete} disabled={!isAdmin || !selection.length}>Delete</Button></span>
          </Tooltip>
        </Stack>

        {error && <Alert severity="error" sx={{ mb:1 }}>{error}</Alert>}

        <Box sx={{ height: 640 }}>
          <DataGrid
            rows={rows}
            columns={cols}
            loading={loading}
            checkboxSelection={isAdmin}
            disableRowSelectionOnClick
            onRowSelectionModelChange={(m)=>setSelection(m as string[])}
            rowSelectionModel={selection}
            onRowDoubleClick={(p)=> isAdmin && setEditing(p.row as Prog)}
            getRowId={(r)=>r.id}
            slots={{ toolbar: GridToolbar }}
          />
        </Box>

        <ProgressDialog
          open={open || !!editing}
          onClose={()=>{ setOpen(false); setEditing(null) }}
          editing={editing}
          isAdmin={isAdmin}
        />
      </CardContent>
    </Card>
  )
}

function ProgressDialog({
  open, onClose, editing, isAdmin
}: { open:boolean; onClose:()=>void; editing:Prog|null; isAdmin:boolean }) {
  const [date, setDate] = React.useState<string>(editing?.date || new Date().toISOString().slice(0,10))
  const [period, setPeriod] = React.useState<1|2>(editing?.period || 1)
  const [registrationId, setRegistrationId] = React.useState(editing?.registrationId || '')
  const [studentName, setStudentName] = React.useState(editing?.studentName || '')
  const [academy, setAcademy] = React.useState(editing?.academy || '')
  const [level, setLevel] = React.useState(editing?.level || '')
  const [score, setScore] = React.useState<number|''>(editing?.score ?? '')
  const [note, setNote] = React.useState(editing?.note || '')

  React.useEffect(()=>{
    if (editing) {
      setDate(editing.date); setPeriod(editing.period); setRegistrationId(editing.registrationId)
      setStudentName(editing.studentName); setAcademy(editing.academy || ''); setLevel(editing.level || '')
      setScore(editing.score ?? ''); setNote(editing.note || '')
    } else {
      setDate(new Date().toISOString().slice(0,10))
      setPeriod(1); setRegistrationId(''); setStudentName(''); setAcademy(''); setLevel(''); setScore(''); setNote('')
    }
  },[editing])

  const loadFromReg = async () => {
    try {
      if (!registrationId) return
      const snap = await getDoc(doc(db, REG_COLLECTION, registrationId))
      if (snap.exists()) {
        const r:any = snap.data()
        setStudentName(`${r?.firstName||''} ${r?.lastName||''}`.trim())
        const p = period === 1 ? r?.firstPeriod : r?.secondPeriod
        setAcademy(p?.academy || '')
        setLevel(p?.level || '')
      } else {
        SAlert.fire({ title:'Registration not found', icon:'warning' })
      }
    } catch (e:any) {
      SAlert.fire({ title:'Lookup failed', text:e?.message, icon:'error' })
    }
  }

  const save = async () => {
    if (!isAdmin) return SAlert.fire({ title:'Read-only', text:'Only admins can save.', icon:'info' })
    try {
      const payload:any = {
        date, period, registrationId, studentName, academy, level,
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
    } catch (e:any) {
      SAlert.fire({ title:'Save failed', text:e?.message, icon:'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? 'Edit Progress' : 'New Progress'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt:1 }}>
          <TextField label="Date" type="date" InputLabelProps={{shrink:true}} value={date} onChange={e=>setDate(e.target.value)} />
          <TextField select label="Period" value={period} onChange={e=>setPeriod(Number(e.target.value) as 1|2)}>
            <MenuItem value={1}>1</MenuItem><MenuItem value={2}>2</MenuItem>
          </TextField>
          <Stack direction="row" spacing={1}>
            <TextField label="Registration ID" value={registrationId} onChange={e=>setRegistrationId(e.target.value)} fullWidth />
            <Button onClick={loadFromReg} variant="outlined">Load</Button>
          </Stack>
          <TextField label="Student Name" value={studentName} onChange={e=>setStudentName(e.target.value)} />
          <TextField label="Academy" value={academy} onChange={e=>setAcademy(e.target.value)} />
          <TextField label="Level" value={level} onChange={e=>setLevel(e.target.value)} />
          <TextField label="Score (0-100)" type="number" inputProps={{min:0,max:100}} value={score} onChange={e=>setScore(e.target.value === '' ? '' : Number(e.target.value))} />
          <TextField label="Note" value={note} onChange={e=>setNote(e.target.value)} multiline rows={3} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!isAdmin}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}
