import * as React from 'react'
import {
  Card, CardHeader, CardContent, Stack, Button, Tooltip, Box, Alert,
  TextField, MenuItem, Chip, Switch, Autocomplete
} from '@mui/material'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import CloseIcon from '@mui/icons-material/Close'
import {
  addDoc, collection, deleteDoc, doc, orderBy, query,
  serverTimestamp, updateDoc, where, getDocs
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

import { db, auth } from '../../../lib/firebase'
import { ATTENDANCE_COLLECTION } from '../../../lib/config'
import { Alert as SAlert, confirmDelete, notifyError, notifySuccess } from '../../../lib/alerts'
import { useRegistrations } from '../../registrations/hooks/useRegistrations'
import type { Registration } from '../../registrations/types'

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

export default function AttendancePage() {
  const { data: regs } = useRegistrations()

  // Who is signed in (to flip admin vs read-only)
  const [userEmail, setUserEmail] = React.useState<string | null>(auth.currentUser?.email || null)
  React.useEffect(() => onAuthStateChanged(auth, u => setUserEmail(u?.email || null)), [])
  const isAdmin = !!(userEmail && ADMIN_EMAILS.includes(userEmail))

  // Filters
  const [date, setDate] = React.useState<string>(new Date().toISOString().slice(0, 10))
  const [period, setPeriod] = React.useState<1 | 2>(1)
  const [academy, setAcademy] = React.useState<string>('')
  const [level, setLevel] = React.useState<string>('')
  const [teacherName, setTeacherName] = React.useState<string>('')
  const [teacherNote, setTeacherNote] = React.useState<string>('')

  // Academies from registrations (no N/A)
  const academies = React.useMemo(() => {
    const set = new Set<string>()
    regs.forEach(r => {
      const a1 = (r?.firstPeriod?.academy || '').trim()
      const a2 = (r?.secondPeriod?.academy || '').trim()
      if (a1 && a1.toLowerCase() !== 'n/a') set.add(a1)
      if (a2 && a2.toLowerCase() !== 'n/a') set.add(a2)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [regs])

  // Roster for selected class
  const roster = React.useMemo(() => {
    if (!academy) return []
    const isK = academy === KOREAN
    const list: { id: string; name: string }[] = []
    regs.forEach((r: Registration) => {
      const first = (r?.firstPeriod?.academy || '').trim()
      const second = (r?.secondPeriod?.academy || '').trim()
      const firstLvl = (r?.firstPeriod?.level || '').trim()
      const secondLvl = (r?.secondPeriod?.level || '').trim()
      const fullName = `${r.firstName || ''} ${r.lastName || ''}`.trim()

      if (period === 1 && first === academy) {
        if (!isK || !level || firstLvl === level) list.push({ id: r.id, name: fullName })
      }
      if (period === 2 && second === academy) {
        if (!isK || !level || secondLvl === level) list.push({ id: r.id, name: fullName })
      }
    })
    // unique + sorted
    const m = new Map(list.map(s => [s.id, s]))
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [regs, academy, period, level])

  // History for this class (to compute %)
  const [classHistory, setClassHistory] = React.useState<any[]>([])
  React.useEffect(() => {
    if (!academy) { setClassHistory([]); return }
    const cons: any[] = [ where('academy','==',academy), where('period','==',period) ]
    if (academy === KOREAN) cons.push(where('level','==', level || ''))
    const qAll = query(collection(db, ATTENDANCE_COLLECTION), ...cons)
    getDocs(qAll).then(snap => {
      setClassHistory(snap.docs.map(d => ({ id:d.id, ...(d.data() as any) })))
    })
  }, [academy, period, level])

  // Grid rows
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string|null>(null)
  const [selection, setSelection] = React.useState<string[]>([])

  const loadClassForDate = React.useCallback(async () => {
    try {
      setLoading(true); setError(null)
      if (!academy) { setRows([]); setLoading(false); return }

      const cons: any[] = [ where('date','==',date), where('academy','==',academy), where('period','==',period) ]
      if (academy === KOREAN) cons.push(where('level','==', level || ''))
      // Requires the composite index (create once in console)
      const qDay = query(collection(db, ATTENDANCE_COLLECTION), ...cons, orderBy('studentName'))
      const snap = await getDocs(qDay)
      const byReg = new Map<string, any>()
      snap.forEach(d => byReg.set((d.data() as any).registrationId, { id:d.id, ...(d.data() as any) }))

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
          registrationId: s.id,
          studentName: s.name,
          present: ex ? !!ex.present : true,
          reason: ex?.reason || '',
          percent
        }
      })
      setRows(base); setLoading(false)
    } catch (e:any) {
      setError(e?.message || 'Failed to load'); setLoading(false)
    }
  }, [academy, period, level, date, roster, classHistory])

  React.useEffect(()=>{ void loadClassForDate() }, [loadClassForDate])

  // Columns — IMPORTANT: no valueGetter accessing params.row
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
          disabled={!isAdmin}
        />
      )
    },
    {
      field:'reason', headerName:'Reason (if absent)', minWidth:260, flex:1.2, sortable:false, filterable:false,
      renderCell:(p)=>(
        <TextField
          size="small" fullWidth placeholder="Illness, travel, family…"
          value={p.row.reason || ''}
          disabled={p.row.present || !isAdmin}
          onChange={(e)=> setRows(prev=>prev.map(r=>r.id===p.row.id?{...r,reason:e.target.value}:r))}
        />
      )
    },
    {
      field:'percent', headerName:'Attendance %', width:140,
      // No valueGetter — render safely from row
      renderCell:(p)=>{
        const pct = typeof p.row.percent === 'number' ? p.row.percent : undefined
        return (
          pct !== undefined
            ? <Chip size="small" color={pct>=90?'success':pct>=75?'warning':'default'} label={`${pct}%`} />
            : <Chip size="small" variant="outlined" label="—" />
        )
      }
    }
  ], [isAdmin])

  // Admin-only helpers
  const markAll = (val:boolean)=> setRows(prev=>prev.map(r=>({...r,present:val,reason: val? '' : r.reason})))

  const saveAll = async ()=>{
    if (!isAdmin) return SAlert.fire({ title:'Read-only', text:'Only admins can save.', icon:'info' })
    if (!academy) return SAlert.fire({ title:'Select an academy', icon:'warning' })
    try{
      const cons:any[] = [ where('date','==',date), where('academy','==',academy), where('period','==',period) ]
      if (academy===KOREAN) cons.push(where('level','==', level || ''))
      const qDay = query(collection(db, ATTENDANCE_COLLECTION), ...cons)
      const snap = await getDocs(qDay)
      const existingByReg = new Map<string,{id:string}>()
      snap.forEach(d=> existingByReg.set((d.data() as any).registrationId, { id:d.id }))

      const base:any = {
        date, period, academy, level: academy===KOREAN ? (level||'') : '',
        teacherName: teacherName || '',
        teacherNote: teacherNote || '',
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
      void loadClassForDate()
    }catch(e:any){
      notifyError('Save failed', e?.message)
    }
  }

  const handleDelete = async ()=>{
    if (!isAdmin) return SAlert.fire({ title:'Read-only', text:'Only admins can delete.', icon:'info' })
    if (!selection.length) return SAlert.fire({ title:'No rows selected', icon:'info', timer:1200, showConfirmButton:false })
    try{
      const cons:any[] = [ where('date','==',date), where('academy','==',academy), where('period','==',period) ]
      if (academy===KOREAN) cons.push(where('level','==', level || ''))
      const qDay = query(collection(db, ATTENDANCE_COLLECTION), ...cons)
      const snap = await getDocs(qDay)
      const toDel:string[]=[]
      snap.forEach(d=>{
        const data:any = d.data()
        if (selection.includes(data.registrationId)) toDel.push(d.id)
      })
      if (!toDel.length) return
      const res = await confirmDelete('Delete attendance?', `You are about to delete ${toDel.length} record(s) for ${date}.`)
      if (!res.isConfirmed) return
      await Promise.all(toDel.map(id=> deleteDoc(doc(db, ATTENDANCE_COLLECTION, id))))
      notifySuccess('Deleted', `${toDel.length} record(s) removed`)
      setSelection([])
      void loadClassForDate()
    }catch(e:any){
      notifyError('Delete failed', e?.message)
    }
  }

  return (
    <Card elevation={0} sx={{ borderRadius:3 }}>
      <CardHeader
        title="Attendance by Class"
        subheader={isAdmin ? 'Admin mode (full edit)' : 'Viewer mode (read-only)'}
      />
      <CardContent>
        {!isAdmin && (
          <Alert severity="info" sx={{ mb:2 }}>
            You can view rosters and attendance, but only admins can modify.
          </Alert>
        )}

        {/* Filters */}
        <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb:2 }}>
          <TextField label="Date" type="date" InputLabelProps={{ shrink:true }} value={date} onChange={e=>setDate(e.target.value)} sx={{ minWidth:170 }} />
          <TextField select label="Period" value={period} onChange={e=>setPeriod(Number(e.target.value) as 1|2)} sx={{ minWidth:130 }}>
            <MenuItem value={1}>1</MenuItem><MenuItem value={2}>2</MenuItem>
          </TextField>
          <Autocomplete
            options={academies}
            value={academy || null}
            onChange={(_,v)=>{ setAcademy(v||''); if ((v||'')!==KOREAN) setLevel('') }}
            renderInput={(p)=> <TextField {...p} label="Academy" placeholder="Select academy…" />}
            sx={{ minWidth:260 }}
          />
          {academy===KOREAN && (
            <TextField select label="Korean Level" value={level} onChange={e=>setLevel(e.target.value)} sx={{ minWidth:220 }}>
              {KOREAN_LEVELS.map(l=> <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>
          )}
        </Stack>

        {/* Teacher info (stored with docs; editable only for admins) */}
        <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb:2 }}>
          <TextField label="Teacher Name" value={teacherName} onChange={e=>setTeacherName(e.target.value)} sx={{ minWidth:240 }} disabled={!isAdmin} />
          <TextField label="Teacher Note" value={teacherNote} onChange={e=>setTeacherNote(e.target.value)} fullWidth disabled={!isAdmin} />
        </Stack>

        {/* Actions */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb:1 }}>
          <Tooltip title="Load/refresh roster for this date & class">
            <span><Button startIcon={<AddIcon />} onClick={loadClassForDate} disabled={!academy}>Load Class</Button></span>
          </Tooltip>
          <Tooltip title={isAdmin ? 'Mark everyone present' : 'Admin only'}>
            <span><Button startIcon={<DoneAllIcon />} onClick={()=>markAll(true)} disabled={!rows.length || !isAdmin}>All Present</Button></span>
          </Tooltip>
          <Tooltip title={isAdmin ? 'Mark everyone absent' : 'Admin only'}>
            <span><Button startIcon={<CloseIcon />} onClick={()=>markAll(false)} disabled={!rows.length || !isAdmin}>All Absent</Button></span>
          </Tooltip>
          <Tooltip title={isAdmin ? 'Delete selected rows for this date' : 'Admin only'}>
            <span><Button color="error" startIcon={<DeleteIcon />} onClick={handleDelete} disabled={!selection.length || !isAdmin}>Delete</Button></span>
          </Tooltip>
          <Stack direction="row" spacing={1} sx={{ ml:'auto' }}>
            <Chip size="small" label={`${rows.length} students`} />
            <Button variant="contained" startIcon={<SaveIcon />} onClick={saveAll} disabled={!rows.length || !isAdmin}>
              Save Attendance
            </Button>
          </Stack>
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
            getRowId={(r) => r.id}
            slots={{ toolbar: GridToolbar }}
          />
        </Box>
      </CardContent>
    </Card>
  )
}
