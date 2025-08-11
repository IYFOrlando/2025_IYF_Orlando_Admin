import * as React from 'react'
import {
  Box, Card, CardHeader, CardContent, Alert, IconButton, Chip, Stack, Tooltip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Grid
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import {
  DataGrid, GridToolbar, type GridColDef, type GridRenderCellParams
} from '@mui/x-data-grid'
import {
  collection, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth } from '../../../lib/firebase'
import { useRegistrations } from '../hooks/useRegistrations'
import { migrateKoreanToKoreanLanguage } from '../../../lib/migration'
import type { Registration } from '../types'
import { usd } from '../../../lib/query'
import { Alert as SAlert, confirmDelete, notifyError, notifySuccess } from '../../../lib/alerts'

/** Admin allowlist (keep consistent with Firestore rules) */
const ADMIN_EMAILS = ['jodlouis.dev@gmail.com', 'orlando@iyfusa.org', 'admin@iyfusa.org']

/** Live billing aggregation per student (for Payment status chip) */
type BillingAgg = { total:number; paid:number; balance:number; status:'unpaid'|'partial'|'paid' }
function useInvoiceAggByStudent() {
  const [map, setMap] = React.useState<Map<string, BillingAgg>>(new Map())
  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, 'academy_invoices'), (snap) => {
      const agg = new Map<string, BillingAgg>()
      for (const d of snap.docs) {
        const inv: any = d.data()
        const id = String(inv.studentId || '')
        if (!id) continue
        const cur = agg.get(id) || { total:0, paid:0, balance:0, status:'unpaid' as const }
        cur.total += Number(inv.total || 0)
        cur.paid  += Number(inv.paid || 0)
        cur.balance = Math.max(cur.total - cur.paid, 0)
        cur.status = cur.paid <= 0 ? 'unpaid' : (cur.balance > 0 ? 'partial' : 'paid')
        agg.set(id, cur)
      }
      setMap(agg)
    })
    return () => unsub()
  }, [])
  return map
}

/** Helpers / options */
const STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho',
  'Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia',
  'Washington','West Virginia','Wisconsin','Wyoming'
]
const ACADEMIES = [
  'N/A','Art','DIY','Korean Language','Korean Cooking','Piano','Pickleball','Senior','Soccer','Stretch and Strengthen','Kids'
]
const KOREAN_LEVELS = ['N/A','Alphabet','Beginner','Intermediate','K-Movie Conversation']

function computeAge(birthday?: string | null): number | '' {
  if (!birthday) return ''
  const bd = new Date(birthday)
  if (isNaN(bd.getTime())) return ''
  const today = new Date()
  let age = today.getFullYear() - bd.getFullYear()
  const m = today.getMonth() - bd.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--
  return age < 0 ? '' : age
}

/** ---------- Page ---------- */
export default function RegistrationsList() {
  // Admin vs viewer
  const [userEmail, setUserEmail] = React.useState<string | null>(auth.currentUser?.email || null)
  React.useEffect(() => onAuthStateChanged(auth, u => setUserEmail(u?.email || null)), [])
  const isAdmin = !!(userEmail && ADMIN_EMAILS.includes(userEmail))
  
  // Debug info
  console.log('Debug - userEmail:', userEmail)
  console.log('Debug - isAdmin:', isAdmin)
  console.log('Debug - ADMIN_EMAILS:', ADMIN_EMAILS)

  const { data, loading, error } = useRegistrations()
  const rows = data ?? []
  const byStudent = useInvoiceAggByStudent()
  const [selection, setSelection] = React.useState<string[]>([])

  const [editOpen, setEditOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Registration | null>(null)

  const statusWeight: Record<'unpaid'|'partial'|'paid', number> = { unpaid: 0, partial: 1, paid: 2 }

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: 'rownum', headerName: '#', width: 72, sortable:false, filterable:false, align:'center', headerAlign:'center',
        renderCell: (p) => {
          const api: any = p.api
          const idx = typeof api?.getRowIndexRelativeToVisibleRows === 'function'
            ? api.getRowIndexRelativeToVisibleRows(p.id)
            : api?.getRowIndex?.(p.id) ?? 0
          return <span style={{ opacity:.7 }}>{(idx ?? 0) + 1}</span>
        }
      },
      { field: 'firstName', headerName: 'First', minWidth: 130, flex: 1 },
      { field: 'lastName',  headerName: 'Last',  minWidth: 130, flex: 1 },
      { field: 'email',     headerName: 'Email', minWidth: 220, flex: 1.2 },

      {
        field: 'age', headerName: 'Age', width: 90, align:'center', headerAlign:'center',
        valueGetter: (params) => computeAge((params.row as any).birthday)
      },
      { field: 'birthday', headerName: 'Birthday', width: 130 },

      { field: 'cellNumber', headerName: 'Phone', minWidth: 140 },

      // Period 1 (display only; edit via modal)
      {
        field: 'p1Academy', headerName: 'P1 Academy', minWidth: 180, flex: 1,
        valueGetter: (params) => params.row?.firstPeriod?.academy || ''
      },
      {
        field: 'p1Level', headerName: 'P1 Level', minWidth: 170, flex: 1,
        valueGetter: (params) => params.row?.firstPeriod?.level || ''
      },

      // Period 2
      {
        field: 'p2Academy', headerName: 'P2 Academy', minWidth: 180, flex: 1,
        valueGetter: (params) => params.row?.secondPeriod?.academy || ''
      },
      {
        field: 'p2Level', headerName: 'P2 Level', minWidth: 170, flex: 1,
        valueGetter: (params) => params.row?.secondPeriod?.level || ''
      },

      { field: 'city', headerName: 'City', minWidth: 140 },
      { field: 'state', headerName: 'State', width: 120 },
      { field: 'zipCode', headerName: 'Zip', width: 110 },

      {
        field: 'createdAt',
        headerName: 'Created',
        width: 170,
        valueGetter: (params) => {
          const ts: any = (params.row as any).createdAt
          const ms = ts?.seconds ? ts.seconds * 1000 : (typeof ts === 'number' ? ts : Date.now())
          const d = new Date(ms)
          const pad = (n:number)=>String(n).padStart(2,'0')
          return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
        }
      },

      {
        field: 'paymentStatus',
        headerName: 'Payment',
        width: 170,
        sortable: true,
        valueGetter: (params) => (byStudent.get(String(params.row.id))?.status ?? 'unpaid'),
        sortComparator: (v1, v2) => statusWeight[v1 as keyof typeof statusWeight] - statusWeight[v2 as keyof typeof statusWeight],
        renderCell: (p: GridRenderCellParams) => {
          const id = String(p.id)
          const agg = byStudent.get(id)
          const status = (agg?.status || 'unpaid') as 'unpaid'|'partial'|'paid'
          const color: 'default' | 'warning' | 'success' =
            status === 'paid' ? 'success' : status === 'partial' ? 'warning' : 'default'
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={status.toUpperCase()} color={color} size="small" />
              <Tooltip title={`Paid ${usd(agg?.paid || 0)} / Total ${usd(agg?.total || 0)} • Bal ${usd(agg?.balance || 0)}`}>
                <span style={{ fontSize: 12, color: '#667085' }}>{usd(agg?.balance || 0)}</span>
              </Tooltip>
            </Stack>
          )
        }
      },

      {
        field: 'actions', headerName: '', width: 96, sortable:false, filterable:false,
        renderCell: (p) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title={isAdmin ? 'Edit' : 'Admin only'}>
              <span>
                <IconButton size="small" onClick={()=>{ if(!isAdmin) return; setEditing(p.row as Registration); setEditOpen(true) }} disabled={!isAdmin}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={isAdmin ? 'Delete registration' : 'Admin only'}>
              <span>
                <IconButton
                  size="small"
                  onClick={async ()=>{
                    if (!isAdmin) return
                    const res = await confirmDelete('Delete registration?', 'This will permanently remove this record.')
                    if (!res.isConfirmed) return
                    try {
                      await deleteDoc(doc(db,'fall_academy_2025', String(p.id)))
                      notifySuccess('Deleted', 'Registration removed')
                    } catch (e:any) {
                      notifyError('Delete failed', e?.message)
                    }
                  }}
                  disabled={!isAdmin}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        )
      }
    ],
    [byStudent, isAdmin]
  )

  const handleBulkDelete = async () => {
    if (!isAdmin) return
    if (!selection.length) return SAlert.fire({ title:'Nothing selected', icon:'info', timer:1200, showConfirmButton:false })
    const res = await confirmDelete('Delete selected?', `You are about to delete ${selection.length} registration(s).`)
    if (!res.isConfirmed) return
    try {
      await Promise.all(selection.map(id => deleteDoc(doc(db, 'fall_academy_2025', String(id)))))
      notifySuccess('Deleted', `${selection.length} registration(s) removed`)
      setSelection([])
    } catch (e:any) {
      notifyError('Delete failed', e?.message)
    }
  }

  return (
    <Card elevation={0} sx={{ borderRadius: 3 }}>
      <CardHeader
        title="Registrations"
        subheader={isAdmin ? 'Full access: Edit, delete, export, and manage registrations' : 'Viewer mode (read-only)'}
        action={
          <Stack direction="row" spacing={1}>
            {isAdmin ? (
              <>
                <Button
                  size="medium"
                  color="warning"
                  variant="contained"
                  onClick={migrateKoreanToKoreanLanguage}
                  sx={{ fontWeight: 'bold' }}
                >
                  🔄 Migrate Korean → Korean Language
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={handleBulkDelete}
                  disabled={!selection.length}
                >
                  Delete Selected
                </Button>
              </>
            ) : (
              <Alert severity="info" sx={{ p: 1 }}>
                Admin: {userEmail || 'Not logged in'} | IsAdmin: {isAdmin ? 'Yes' : 'No'}
              </Alert>
            )}
          </Stack>
        }
      />
      <CardContent>
        {!isAdmin && (
          <Alert severity="info" sx={{ mb:2 }}>
            You can view and export. Only admins can edit or delete.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box sx={{ height: 720, width: '100%' }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            checkboxSelection={isAdmin}
            onRowSelectionModelChange={(m)=> isAdmin && setSelection(m as string[])}
            rowSelectionModel={isAdmin ? selection : []}
            disableRowSelectionOnClick
            density="compact"
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 300 },
                printOptions: { disableToolbarButton: true }
              }
            }}
            sortingOrder={['desc','asc']}
            initialState={{
              pagination: { paginationModel: { page: 0, pageSize: 25 } },
              columns: { columnVisibilityModel: { address:false, gender:false } }
            }}
            pageSizeOptions={[10,25,50,100]}
            getRowClassName={(params) => {
              const st = byStudent.get(String(params.id))?.status || 'unpaid'
              return st === 'paid' ? 'row-paid' : (st === 'partial' ? 'row-partial' : '')
            }}
          />
        </Box>
      </CardContent>

      {/* Edit dialog */}
      <EditRegistrationDialog
        open={editOpen}
        onClose={()=>{ setEditOpen(false); setEditing(null) }}
        row={editing}
        isAdmin={isAdmin}
      />
    </Card>
  )
}

/** ---------- Edit Modal (safe, no inline grid editing) ---------- */
function EditRegistrationDialog({
  open, onClose, row, isAdmin
}: { open:boolean; onClose:()=>void; row:Registration|null; isAdmin:boolean }) {

  // Form state
  const [firstName, setFirstName] = React.useState(row?.firstName || '')
  const [lastName,  setLastName]  = React.useState(row?.lastName || '')
  const [email,     setEmail]     = React.useState(row?.email || '')
  const [cell,      setCell]      = React.useState(row?.cellNumber || '')
  const [birthday,  setBirthday]  = React.useState(row?.birthday || '')
  const [city,      setCity]      = React.useState(row?.city || '')
  const [stateVal,  setStateVal]  = React.useState(row?.state || '')
  const [zip,       setZip]       = React.useState(row?.zipCode || '')

  const [p1Academy, setP1Academy] = React.useState(row?.firstPeriod?.academy || '')
  const [p1Level,   setP1Level]   = React.useState(row?.firstPeriod?.level || 'N/A')
  const [p2Academy, setP2Academy] = React.useState(row?.secondPeriod?.academy || '')
  const [p2Level,   setP2Level]   = React.useState(row?.secondPeriod?.level || 'N/A')

  React.useEffect(()=>{
    if (!row) return
    setFirstName(row.firstName || '')
    setLastName(row.lastName || '')
    setEmail(row.email || '')
    setCell(row.cellNumber || '')
    setBirthday(row.birthday || '')
    setCity(row.city || '')
    setStateVal(row.state || '')
    setZip(row.zipCode || '')
    setP1Academy(row.firstPeriod?.academy || '')
    setP1Level(row.firstPeriod?.level || 'N/A')
    setP2Academy(row.secondPeriod?.academy || '')
    setP2Level(row.secondPeriod?.level || 'N/A')
  },[row?.id])

  const age = computeAge(birthday)

  const handleSave = async () => {
    if (!row || !isAdmin) return
    if (!firstName.trim() || !lastName.trim()) {
      return SAlert.fire({ title:'First & Last required', icon:'warning' })
    }
    try {
      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        cellNumber: cell.trim(),
        birthday: birthday || null,
        city: city.trim(),
        state: stateVal,
        zipCode: zip.trim(),
        firstPeriod: { academy: p1Academy || '', level: p1Academy === 'Korean Language' ? p1Level : 'N/A' },
        secondPeriod: { academy: p2Academy || '', level: p2Academy === 'Korean Language' ? p2Level : 'N/A' },
        updatedAt: serverTimestamp()
      }
      await updateDoc(doc(db, 'fall_academy_2025', row.id), payload)
      notifySuccess('Saved', 'Registration updated')
      onClose()
    } catch (e:any) {
      notifyError('Update failed', e?.message)
    }
  }

  const academySelect = (label:string, value:string, setVal:(v:string)=>void) => (
    <TextField select label={label} value={value} onChange={e=>setVal(e.target.value)} fullWidth>
      {ACADEMIES.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
    </TextField>
  )
  const levelSelect = (label:string, academy:string, value:string, setVal:(v:string)=>void) => (
    <TextField select label={label} value={academy==='Korean Language' ? value : 'N/A'} onChange={e=>setVal(e.target.value)} fullWidth disabled={academy!=='Korean Language'}>
      {KOREAN_LEVELS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
    </TextField>
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Registration</DialogTitle>
      <DialogContent dividers>
        {!isAdmin && <Alert severity="info" sx={{ mb:2 }}>Viewer mode. Sign in as admin to edit.</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}><TextField label="First Name" value={firstName} onChange={e=>setFirstName(e.target.value)} fullWidth disabled={!isAdmin}/></Grid>
          <Grid item xs={12} md={6}><TextField label="Last Name"  value={lastName}  onChange={e=>setLastName(e.target.value)}  fullWidth disabled={!isAdmin}/></Grid>
          <Grid item xs={12} md={6}><TextField label="Email"      value={email}     onChange={e=>setEmail(e.target.value)}     fullWidth disabled={!isAdmin}/></Grid>
          <Grid item xs={12} md={6}><TextField label="Phone"      value={cell}      onChange={e=>setCell(e.target.value)}      fullWidth disabled={!isAdmin}/></Grid>

          <Grid item xs={12} md={4}><TextField label="Birthday" type="date" InputLabelProps={{shrink:true}} value={birthday||''} onChange={e=>setBirthday(e.target.value)} fullWidth disabled={!isAdmin}/></Grid>
          <Grid item xs={12} md={2}><TextField label="Age" value={age} fullWidth InputProps={{ readOnly: true }} /></Grid>
          <Grid item xs={12} md={3}><TextField label="City" value={city} onChange={e=>setCity(e.target.value)} fullWidth disabled={!isAdmin}/></Grid>
          <Grid item xs={12} md={3}>
            <TextField select label="State" value={stateVal} onChange={e=>setStateVal(e.target.value)} fullWidth disabled={!isAdmin}>
              {STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}><TextField label="Zip" value={zip} onChange={e=>setZip(e.target.value)} fullWidth disabled={!isAdmin}/></Grid>

          <Grid item xs={12}><strong>Period 1</strong></Grid>
          <Grid item xs={12} md={6}>{academySelect('P1 Academy', p1Academy, setP1Academy)}</Grid>
          <Grid item xs={12} md={6}>{levelSelect('P1 Level', p1Academy, p1Level, setP1Level)}</Grid>

          <Grid item xs={12}><strong>Period 2</strong></Grid>
          <Grid item xs={12} md={6}>{academySelect('P2 Academy', p2Academy, setP2Academy)}</Grid>
          <Grid item xs={12} md={6}>{levelSelect('P2 Level', p2Academy, p2Level, setP2Level)}</Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={handleSave} disabled={!isAdmin}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}