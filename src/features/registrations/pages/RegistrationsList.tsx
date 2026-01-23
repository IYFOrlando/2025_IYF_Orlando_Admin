import * as React from 'react'
import {
  Box, Card, Alert, IconButton, Chip, Stack, Button,
  Dialog, DialogTitle, DialogContent, TextField, MenuItem, Grid, Typography, useTheme
} from '@mui/material'
import {
  DataGrid, GridToolbar, type GridColDef,
  gridClasses
} from '@mui/x-data-grid'
import {
  collection, onSnapshot, doc, deleteDoc, updateDoc, serverTimestamp
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { db, auth } from '../../../lib/firebase'
import { useRegistrations, REG_COLLECTION } from '../hooks/useRegistrations'
import { useInvoices } from '../../payments/hooks/useInvoices'
import { usePayments } from '../../payments/hooks/usePayments'
import { COLLECTIONS_CONFIG } from '../../../config/shared.js'
import type { Registration } from '../types'
import { usd } from '../../../lib/query'
import { Alert as SAlert, confirmDelete, notifyError, notifySuccess } from '../../../lib/alerts'
import { computeAge } from '../../../lib/validations'
import * as XLSX from 'xlsx'
import { motion } from 'framer-motion'
import { 
  Download, Trash2, Edit2, ShieldAlert 
} from 'lucide-react'

// --- Types & Helpers ---
type BillingAgg = { total:number; paid:number; balance:number; status:'unpaid'|'partial'|'paid'|'exonerated' }

function useInvoiceAggByStudent() {
  const [map, setMap] = React.useState<Map<string, BillingAgg>>(new Map())
  React.useEffect(() => {
    const unsub = onSnapshot(collection(db, COLLECTIONS_CONFIG.academyInvoices), (snap) => {
      const agg = new Map<string, BillingAgg>()
      for (const d of snap.docs) {
        const inv: any = d.data()
        const id = String(inv.studentId || '')
        if (!id) continue
        const cur = agg.get(id) || { total:0, paid:0, balance:0, status:'unpaid' as const }
        cur.total += Number(inv.total || 0)
        cur.paid  += Number(inv.paid || 0)
        cur.balance = Math.max(cur.total - cur.paid, 0)
        if (inv.status === 'exonerated') cur.status = 'exonerated'
        else cur.status = cur.paid <= 0 ? 'unpaid' : (cur.balance > 0 ? 'partial' : 'paid')
        agg.set(id, cur)
      }
      setMap(agg)
    })
    return () => unsub()
  }, [])
  return map
}

const STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho',
  'Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi',
  'Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio',
  'Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia',
  'Washington','West Virginia','Wisconsin','Wyoming'
]

// --- Animations ---
const containerVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }

// --- Styling ---
const GlassCard = ({ children, sx = {}, ...props }: any) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  return (
    <Card
      elevation={0}
      sx={{
        background: isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        borderRadius: 4,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        height: '100%',
        display: 'flex', 
        flexDirection: 'column',
        ...sx
      }}
      {...props}
    >
      {children}
    </Card>
  )
}

const RegistrationsList = React.memo(function RegistrationsList({ isAdmin = false, hasGmailAccess = false }: { isAdmin?: boolean; hasGmailAccess?: boolean }) {
  const [_userEmail, setUserEmail] = React.useState<string | null>(auth.currentUser?.email || null)
  React.useEffect(() => onAuthStateChanged(auth, u => setUserEmail(u?.email || null)), [])
  
  const forceIsAdmin = React.useMemo(() => 
    ['orlando@iyfusa.org', 'jodlouis.dev@gmail.com', 'michellemoralespradis@gmail.com'].includes(_userEmail || ''), 
  [_userEmail])
  
  const effectiveIsAdmin = isAdmin || forceIsAdmin
  const { data, loading } = useRegistrations()
  const { data: invoices } = useInvoices()
  const { data: payments } = usePayments()
  const rows = data ?? []
  const byStudent = useInvoiceAggByStudent()
  const [selection, setSelection] = React.useState<string[]>([])
  const [editOpen, setEditOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Registration | null>(null)
  

  // Export Logic Map
  const paymentDataMap = React.useMemo(() => {
    const map = new Map<string, any>()
    invoices?.forEach(inv => {
      const id = String(inv.studentId)
      const ex = map.get(id) || { totalFee:0, paid:0, balance:0, lastPaymentDate:'', paymentMethod:'' }
      ex.totalFee += Number(inv.total||0); ex.paid += Number(inv.paid||0); ex.balance += Number(inv.balance||0);
      map.set(id, ex)
    })
    payments?.forEach(p => {
        const id = String(p.studentId)
        const ex = map.get(id)
        if(ex) {
            const date = p.createdAt?.seconds ? new Date(p.createdAt.seconds*1000).toLocaleDateString() : new Date().toLocaleDateString()
            if(!ex.lastPaymentDate || date > ex.lastPaymentDate) { ex.lastPaymentDate = date; ex.paymentMethod = p.method||'' }
        }
    })
    return map
  }, [invoices, payments])

  // --- Actions ---
  const handleBulkDelete = async () => {
    if (!effectiveIsAdmin) return
    if (!selection.length) return SAlert.fire({ title:'Nothing selected', icon:'info', timer:1200, showConfirmButton:false })
    const res = await confirmDelete('Delete selected?', `You are about to delete ${selection.length} registration(s).`)
    if (!res.isConfirmed) return
    try {
      await Promise.all(selection.map(id => deleteDoc(doc(db, REG_COLLECTION, String(id)))))
      notifySuccess('Deleted', `${selection.length} registration(s) removed`)
      setSelection([])
    } catch (e:any) { notifyError('Delete failed', e?.message) }
  }

  const handleExportExcel = () => {
    try {
      const exportData = rows.map((row: any, index: number) => {
        const pData = paymentDataMap.get(String(row.id)) || { totalFee: 0, paid: 0, balance: 0, lastPaymentDate: '', paymentMethod: '' }
        return {
          '#': index + 1,
          'First': row.firstName||'', 'Last': row.lastName||'', 'Email': row.email||'', 
          'Age': computeAge(row.birthday)||'', 'Phone': row.cellNumber||'',
          'Academies': (row.selectedAcademies||[]).map((a:any)=>`${a.academy||''}${a.level?` (${a.level})`:''}`).join(' | '),
          'City': row.city||'', 'State': row.state||'', 'Zip': row.zipCode||'',
          'Created': row.createdAt?.seconds ? new Date(row.createdAt.seconds*1000).toLocaleString() : '',
          'Fee': usd(pData.totalFee), 'Paid': usd(pData.paid), 'Balance': usd(pData.balance),
          'Status': byStudent.get(String(row.id))?.status?.toUpperCase() || 'UNPAID'
        }
      })
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Registrations')
      XLSX.writeFile(wb, `IYF_Registrations_${new Date().toISOString().slice(0,10)}.xlsx`)
      notifySuccess('Exported', `${exportData.length} rows`)
    } catch (e:any) { notifyError('Export Failed', e.message) }
  }

  // --- Columns ---
  const columns = React.useMemo<GridColDef[]>(() => [
    { field: 'id', headerName: '#', width: 60, align:'center', headerAlign:'center', valueGetter: (p) => p.api.getSortedRowIds().indexOf(p.id)+1 },
    { field: 'firstName', headerName: 'First Name', minWidth: 120, flex: 1 },
    { field: 'lastName', headerName: 'Last Name', minWidth: 120, flex: 1 },
    { field: 'email', headerName: 'Email', minWidth: 200, flex: 1.2 },
    { field: 'cellNumber', headerName: 'Phone', width: 130 },
    { 
      field: 'academies', headerName: 'Academies', minWidth: 250, flex: 1.5,
      valueGetter: (p) => {
        const r = p.row as any
        if(r.selectedAcademies?.length) return r.selectedAcademies.map((a:any)=>a.academy).join(', ')
        return [r.firstPeriod?.academy, r.secondPeriod?.academy].filter(Boolean).join(', ')
      },
      renderCell: (p) => {
        const r = p.row as any
        const list = r.selectedAcademies?.length ? r.selectedAcademies : [r.firstPeriod, r.secondPeriod].filter((x:any)=>x?.academy)
        return (
          <Box sx={{ py: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {list.map((a:any, i:number) => (
              <Chip key={i} label={a.academy} size="small" variant="outlined" sx={{ borderRadius: 1.5, borderColor: 'divider' }} />
            ))}
          </Box>
        )
      }
    },
    { 
      field: 'paymentStatus', headerName: 'Status', width: 140,
      renderCell: (p) => {
        const s = byStudent.get(String(p.id)) || { status:'unpaid', balance:0 }
        const color = s.status === 'paid' ? '#4CAF50' : s.status === 'partial' ? '#FF9800' : '#F44336'
        const label = s.status === 'exonerated' ? 'Exonerated' : s.status.charAt(0).toUpperCase() + s.status.slice(1)
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1 }}>{label}</Typography>
              <Typography variant="caption" color="text.secondary">{usd(s.balance)} due</Typography>
            </Box>
          </Stack>
        )
      }
    },
    {
      field: 'actions', headerName: '', width: 100, sortable: false,
      renderCell: (p) => (
        <Stack direction="row">
          <IconButton size="small" onClick={() => { if(effectiveIsAdmin) { setEditing(p.row as Registration); setEditOpen(true) }}} disabled={!effectiveIsAdmin}>
            <Edit2 size={16} />
          </IconButton>
          <IconButton size="small" color="error" onClick={() => { if(effectiveIsAdmin) { setSelection([String(p.id)]); handleBulkDelete(); }}} disabled={!effectiveIsAdmin}>
            <Trash2 size={16} />
          </IconButton>
        </Stack>
      )
    }
  ], [effectiveIsAdmin, byStudent])

  return (
    <Box component={motion.div} variants={containerVariants} initial="hidden" animate="visible" sx={{ height: 'calc(100vh - 120px)', pb: 2 }}>
      <GlassCard>
        {/* Header */}
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ 
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' 
            }}>
              Registrations
            </Typography>
            <Typography variant="body2" color="text.secondary">{effectiveIsAdmin ? 'Manage student capabilities' : 'View only mode'}</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {(effectiveIsAdmin || hasGmailAccess) && (
              <Button variant="outlined" startIcon={<Download size={16} />} onClick={handleExportExcel} sx={{ borderRadius: 2 }}>
                Export
              </Button>
            )}
            {effectiveIsAdmin && selection.length > 0 && (
              <Button variant="contained" color="error" startIcon={<Trash2 size={16} />} onClick={handleBulkDelete} sx={{ borderRadius: 2 }}>
                Delete ({selection.length})
              </Button>
            )}
          </Stack>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, width: '100%', overflow: 'hidden' }}>
          <DataGrid
            rows={rows} columns={columns} loading={loading}
            checkboxSelection={effectiveIsAdmin}
            onRowSelectionModelChange={(m) => effectiveIsAdmin && setSelection(m as string[])}
            rowSelectionModel={selection}
            disableRowSelectionOnClick
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500, variant: 'outlined', size: 'small' },
                printOptions: { disableToolbarButton: true },
                csvOptions: { disableToolbarButton: true } // We have custom export
              }
            }}
            sx={{
              border: 'none',
              [`& .${gridClasses.columnHeaders}`]: { bgcolor: 'transparent', borderBottom: '1px solid', borderColor: 'divider' },
              [`& .${gridClasses.row}:hover`]: { bgcolor: 'action.hover' },
              [`& .${gridClasses.cell}`]: { borderBottom: '1px solid', borderColor: 'divider', py: 1 },
            }}
            getRowHeight={() => 'auto'}
          />
        </Box>
      </GlassCard>

      <EditRegistrationDialog 
        open={editOpen} onClose={() => { setEditOpen(false); setEditing(null) }} 
        row={editing} isAdmin={effectiveIsAdmin} 
      />
    </Box>
  )
})

// --- Edit Dialog ---
function EditRegistrationDialog({ open, onClose, row, isAdmin }: { open:boolean, onClose:()=>void, row:Registration|null, isAdmin:boolean }) {
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [cell, setCell] = React.useState('')
  const [birthday, setBirthday] = React.useState('')
  const [city, setCity] = React.useState('')
  const [stateVal, setStateVal] = React.useState('')
  const [zip, setZip] = React.useState('')

  React.useEffect(() => {
    if(row) {
      setFirstName(row.firstName||'')
      setLastName(row.lastName||'')
      setEmail(row.email||'')
      setCell(row.cellNumber||'')
      setBirthday(row.birthday||'')
      setCity(row.city||'')
      setStateVal(row.state||'')
      setZip(row.zipCode||'')
    }
  }, [row])

  const handleSave = async () => {
    if(!row) return
    try {
      await updateDoc(doc(db, REG_COLLECTION, row.id), { 
        firstName, lastName, email, cellNumber: cell, birthday, city, state: stateVal, zipCode: zip,
        updatedAt: serverTimestamp() 
      })
      notifySuccess('Saved', 'Updated successfully')
      onClose()
    } catch(e:any) { notifyError('Error', e.message) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 700, borderBottom: '1px solid #eee' }}>Edit Registration</DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12} md={6}><TextField label="First Name" value={firstName} onChange={e=>setFirstName(e.target.value)} fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label="Last Name" value={lastName} onChange={e=>setLastName(e.target.value)} fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label="Email" value={email} onChange={e=>setEmail(e.target.value)} fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label="Phone" value={cell} onChange={e=>setCell(e.target.value)} fullWidth /></Grid>
          
          <Grid item xs={12} md={6}><TextField label="Birthday" type="date" InputLabelProps={{shrink:true}} value={birthday} onChange={e=>setBirthday(e.target.value)} fullWidth /></Grid>
          <Grid item xs={12} md={6}>
            <TextField select label="State" value={stateVal} onChange={e=>setStateVal(e.target.value)} fullWidth>
              {STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          
          <Grid item xs={12} md={6}><TextField label="City" value={city} onChange={e=>setCity(e.target.value)} fullWidth /></Grid>
          <Grid item xs={12} md={6}><TextField label="Zip Code" value={zip} onChange={e=>setZip(e.target.value)} fullWidth /></Grid>

          {/* Read Only Academies for reference */}
          <Grid item xs={12}>
             <Alert severity="info" icon={<ShieldAlert size={18}/>} sx={{ mt: 2 }}>
                Academies are managed via the registration form.
             </Alert>
          </Grid>
        </Grid>
      </DialogContent>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1, borderTop: '1px solid #eee' }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!isAdmin} sx={{ borderRadius: 2 }}>Save Changes</Button>
      </Box>
    </Dialog>
  )
}

export default RegistrationsList