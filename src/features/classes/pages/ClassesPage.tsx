import * as React from 'react'
import {
  Card, CardHeader, CardContent, Stack, Button, Tooltip, Box, Alert,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, Checkbox, FormControlLabel, IconButton
} from '@mui/material'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'

import { db, auth } from '../../../lib/firebase'
import { CLASSES_COLLECTION } from '../../../lib/config'
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Alert as SAlert, confirmDelete, notifyError, notifySuccess } from '../../../lib/alerts'

// Keep in sync with Firestore rules isAdmin() allowlist
const ADMIN_EMAILS = ['jodlouis.dev@gmail.com']

type ClassItem = {
  id: string
  name: string
  period1?: boolean
  period2?: boolean
  hasLevel?: boolean
  active?: boolean
}

export default function ClassesPage() {
  // Detect admin
  const [userEmail, setUserEmail] = React.useState<string | null>(auth.currentUser?.email || null)
  React.useEffect(() => onAuthStateChanged(auth, u => setUserEmail(u?.email || null)), [])
  const isAdmin = !!(userEmail && ADMIN_EMAILS.includes(userEmail))

  const [rows, setRows] = React.useState<ClassItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string|null>(null)
  const [selection, setSelection] = React.useState<string[]>([])
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ClassItem | null>(null)

  React.useEffect(()=>{
    const q = query(collection(db, CLASSES_COLLECTION), orderBy('name'))
    const unsub = onSnapshot(q,
      snap => { setRows(snap.docs.map(d => ({ id:d.id, ...(d.data() as any) }))); setLoading(false) },
      err  => { setError(err.message || 'Failed to load'); setLoading(false) }
    )
    return () => unsub()
  },[])

  const cols = React.useMemo<GridColDef[]>(()=>[
    { field:'name', headerName:'Class/Academy', minWidth:220, flex:1 },
    { field:'period1', headerName:'P1', width:80,
      valueFormatter: ({ value }) => value ? 'Yes' : '' },
    { field:'period2', headerName:'P2', width:80,
      valueFormatter: ({ value }) => value ? 'Yes' : '' },
    { field:'hasLevel', headerName:'Has Level', width:120,
      valueFormatter: ({ value }) => value ? 'Yes' : '' },
    { field:'active', headerName:'Active', width:90,
      valueFormatter: ({ value }) => value ? 'Yes' : '' },
    {
      field:'actions', headerName:'Actions', width:100, sortable:false, filterable:false,
      renderCell: (p) => (
        <Tooltip title={isAdmin ? 'Edit' : 'View only (admin to edit)'}>
          <span>
            <IconButton
              size="small"
              onClick={()=>{ if (isAdmin) { setEditing(p.row as ClassItem); setOpen(true) } }}
              disabled={!isAdmin}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )
    }
  ], [isAdmin])

  const handleDelete = async () => {
    if (!isAdmin) return SAlert.fire({ title:'Read-only', text:'Only admins can delete.', icon:'info' })
    if (!selection.length) return SAlert.fire({ title:'No rows selected', icon:'info', timer:1200, showConfirmButton:false })
    const res = await confirmDelete('Delete selected classes?', `You are about to delete ${selection.length} item(s).`)
    if (!res.isConfirmed) return
    try {
      await Promise.all(selection.map(id => deleteDoc(doc(db, CLASSES_COLLECTION, id))))
      notifySuccess('Deleted', `${selection.length} class(es) removed`)
      setSelection([])
    } catch (e:any) {
      notifyError('Delete failed', e?.message)
    }
  }

  return (
    <Card elevation={0} sx={{ borderRadius:3 }}>
      <CardHeader title="Classes" subheader={isAdmin ? 'Manage available classes per period' : 'View classes (read-only)'} />
      <CardContent>
        {!isAdmin && (
          <Alert severity="info" sx={{ mb:1 }}>
            You can view the list. Only admins can add, edit or delete classes.
          </Alert>
        )}

        <Stack direction="row" spacing={1} sx={{ mb:1 }}>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={()=>{ setEditing(null); setOpen(true) }}
            disabled={!isAdmin}
          >
            New
          </Button>
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
            onRowDoubleClick={(p)=>{ if (isAdmin) { setEditing(p.row as any); setOpen(true) } }}
            getRowId={(r)=>r.id}
            slots={{ toolbar: GridToolbar }}
          />
        </Box>

        <ClassDialog open={open} onClose={()=>setOpen(false)} editing={editing} isAdmin={isAdmin} />
      </CardContent>
    </Card>
  )
}

function ClassDialog({
  open, onClose, editing, isAdmin
}: { open:boolean; onClose:()=>void; editing:ClassItem|null; isAdmin:boolean }) {
  const [name, setName] = React.useState(editing?.name || '')
  const [p1, setP1] = React.useState<boolean>(!!editing?.period1)
  const [p2, setP2] = React.useState<boolean>(!!editing?.period2)
  const [hasLevel, setHasLevel] = React.useState<boolean>(!!editing?.hasLevel)
  const [active, setActive] = React.useState<boolean>(editing?.active ?? true)

  React.useEffect(()=>{
    if (editing) {
      setName(editing.name||''); setP1(!!editing.period1); setP2(!!editing.period2)
      setHasLevel(!!editing.hasLevel); setActive(editing.active ?? true)
    } else {
      setName(''); setP1(false); setP2(false); setHasLevel(false); setActive(true)
    }
  },[editing])

  const save = async () => {
    if (!isAdmin) return SAlert.fire({ title:'Read-only', text:'Only admins can save.', icon:'info' })
    if (!name.trim()) return SAlert.fire({ title:'Class name required', icon:'warning' })

    const payload:any = {
      name: name.trim(),
      period1: !!p1,
      period2: !!p2,
      hasLevel: !!hasLevel,
      active: !!active,
      updatedAt: serverTimestamp()
    }

    try {
      if (editing?.id) await updateDoc(doc(db, CLASSES_COLLECTION, editing.id), payload)
      else await addDoc(collection(db, CLASSES_COLLECTION), { ...payload, createdAt: serverTimestamp() })
      onClose()
      notifySuccess('Saved', 'Class saved successfully')
    } catch (e:any) {
      SAlert.fire({ title:'Save failed', text:e?.message, icon:'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? 'Edit Class' : 'New Class'}</DialogTitle>
      <DialogContent dividers>
        <TextField label="Class/Academy name" value={name} onChange={e=>setName(e.target.value)} fullWidth sx={{ mb:2 }} />
        <FormControlLabel control={<Checkbox checked={p1} onChange={e=>setP1(e.target.checked)} />} label="Available in Period 1" />
        <FormControlLabel control={<Checkbox checked={p2} onChange={e=>setP2(e.target.checked)} />} label="Available in Period 2" />
        <FormControlLabel control={<Checkbox checked={hasLevel} onChange={e=>setHasLevel(e.target.checked)} />} label="Has levels (e.g., Alphabet/Beginner…)" />
        <FormControlLabel control={<Checkbox checked={active} onChange={e=>setActive(e.target.checked)} />} label="Active" />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={!isAdmin}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}
