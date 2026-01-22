import * as React from 'react'
import {
  Box, Card, CardHeader, CardContent, Alert, IconButton, Chip, Stack, Tooltip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Grid, Typography
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import {
  DataGrid, GridToolbar, type GridColDef, type GridRenderCellParams
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

/** Live billing aggregation per student (for Payment status chip) */
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
        // For exonerated invoices, keep the status as 'exonerated'
        if (inv.status === 'exonerated') {
          cur.status = 'exonerated'
        } else {
          cur.status = cur.paid <= 0 ? 'unpaid' : (cur.balance > 0 ? 'partial' : 'paid')
        }
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

// computeAge is now imported from validations utility

/** ---------- Page ---------- */
const RegistrationsList = React.memo(function RegistrationsList({ isAdmin = false, hasGmailAccess = false }: { isAdmin?: boolean; hasGmailAccess?: boolean }) {
  // Get user email for display purposes
  const [_userEmail, setUserEmail] = React.useState<string | null>(auth.currentUser?.email || null)
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUserEmail(u?.email || null)
    })
    return unsubscribe
  }, [])
  

  
  // Force admin check based on email - this should be more reliable
  const forceIsAdmin = React.useMemo(() => {
    const adminEmails = ['orlando@iyfusa.org', 'jodlouis.dev@gmail.com', 'michellemoralespradis@gmail.com']
    return adminEmails.includes(_userEmail || '')
  }, [_userEmail])
  
  // Use the forced admin check if the prop is inconsistent
  const effectiveIsAdmin = isAdmin || forceIsAdmin

  const { data, loading, error } = useRegistrations()
  const { data: invoices } = useInvoices()
  const { data: payments } = usePayments()
  const rows = data ?? []
  const byStudent = useInvoiceAggByStudent()
  const [selection, setSelection] = React.useState<string[]>([])

  const [editOpen, setEditOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Registration | null>(null)

  const statusWeight: Record<'unpaid'|'partial'|'paid'|'exonerated', number> = { unpaid: 0, partial: 1, paid: 2, exonerated: 3 }

  // Create payment data map for export
  const paymentDataMap = React.useMemo(() => {
    const map = new Map<string, {
      totalFee: number
      paid: number
      balance: number
      lastPaymentDate: string
      paymentMethod: string
    }>()
    
    // Process invoices
    invoices?.forEach(inv => {
      const studentId = String(inv.studentId)
      const existing = map.get(studentId) || { totalFee: 0, paid: 0, balance: 0, lastPaymentDate: '', paymentMethod: '' }
      existing.totalFee += Number(inv.total || 0)
      existing.paid += Number(inv.paid || 0)
      existing.balance += Number(inv.balance || 0)
      map.set(studentId, existing)
    })
    
    // Process payments to get last payment date and method
    payments?.forEach(payment => {
      const studentId = String(payment.studentId)
      const existing = map.get(studentId)
      if (existing) {
        const paymentDate = payment.createdAt?.seconds 
          ? new Date(payment.createdAt.seconds * 1000).toLocaleDateString()
          : new Date().toLocaleDateString()
        
        if (!existing.lastPaymentDate || paymentDate > existing.lastPaymentDate) {
          existing.lastPaymentDate = paymentDate
          existing.paymentMethod = payment.method || ''
        }
      }
    })
    
    return map
  }, [invoices, payments])

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: 'id', headerName: '#', width: 72, sortable: false, filterable: false, align: 'center', headerAlign: 'center',
        valueGetter: (params) => {
          // Use a stable index based on the row ID
          const allRows = params.api.getSortedRowIds()
          const index = allRows.indexOf(params.id)
          return index + 1
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

      // 2026 Structure: Selected Academies (new)
      {
        field: 'selectedAcademies',
        headerName: 'Academies',
        minWidth: 300,
        flex: 2,
        sortable: false,
        valueGetter: (params) => {
          const reg = params.row as any
          // Check for new 2026 structure first
          if (reg.selectedAcademies && Array.isArray(reg.selectedAcademies) && reg.selectedAcademies.length > 0) {
            return reg.selectedAcademies
              .map((a: any) => {
                const parts = [a.academy || '']
                if (a.level && a.level !== 'N/A') parts.push(a.level)
                if (a.schedule) parts.push(`(${a.schedule})`)
                return parts.filter(Boolean).join(' - ')
              })
              .join(' | ')
          }
          // Fallback to legacy structure for old registrations
          const p1 = reg.firstPeriod?.academy ? `${reg.firstPeriod.academy}${reg.firstPeriod.level ? ` (${reg.firstPeriod.level})` : ''}` : ''
          const p2 = reg.secondPeriod?.academy ? `${reg.secondPeriod.academy}${reg.secondPeriod.level ? ` (${reg.secondPeriod.level})` : ''}` : ''
          const parts = [p1, p2].filter(Boolean)
          return parts.length > 0 ? parts.join(' | ') : ''
        },
        renderCell: (params: GridRenderCellParams) => {
          const reg = params.row as any
          // Check for new 2026 structure first
          if (reg.selectedAcademies && Array.isArray(reg.selectedAcademies) && reg.selectedAcademies.length > 0) {
            return (
              <Box sx={{ py: 0.5 }}>
                {reg.selectedAcademies.map((academy: any, idx: number) => (
                  <Chip
                    key={idx}
                    label={`${academy.academy || 'N/A'}${academy.level && academy.level !== 'N/A' ? ` - ${academy.level}` : ''}`}
                    size="small"
                    sx={{ mr: 0.5, mb: 0.5 }}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            )
          }
          // Fallback to legacy structure
          const chips = []
          if (reg.firstPeriod?.academy) {
            chips.push(
              <Chip
                key="p1"
                label={`P1: ${reg.firstPeriod.academy}${reg.firstPeriod.level ? ` (${reg.firstPeriod.level})` : ''}`}
                size="small"
                sx={{ mr: 0.5, mb: 0.5 }}
                color="default"
                variant="outlined"
              />
            )
          }
          if (reg.secondPeriod?.academy) {
            chips.push(
              <Chip
                key="p2"
                label={`P2: ${reg.secondPeriod.academy}${reg.secondPeriod.level ? ` (${reg.secondPeriod.level})` : ''}`}
                size="small"
                sx={{ mr: 0.5, mb: 0.5 }}
                color="default"
                variant="outlined"
              />
            )
          }
          return chips.length > 0 ? <Box sx={{ py: 0.5 }}>{chips}</Box> : <span style={{ color: '#999' }}>No academies</span>
        }
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
        field: 'isDuplicate',
        headerName: 'Duplicate',
        width: 110,
        sortable: true,
        filterable: true,
        renderCell: (p: GridRenderCellParams) => {
          if (p.row.isDuplicate) {
            return (
              <Tooltip title="This registration was flagged as a duplicate when created">
                <Chip label="Duplicate" color="warning" size="small" />
              </Tooltip>
            )
          }
          return null
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
          const status = (agg?.status || 'unpaid') as 'unpaid'|'partial'|'paid'|'exonerated'
                      const color: 'default' | 'warning' | 'success' =
              status === 'paid' ? 'success' : status === 'exonerated' ? 'success' : status === 'partial' ? 'warning' : 'default'
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
        renderCell: (p) => {
          
          return (
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={effectiveIsAdmin ? 'Edit' : 'Admin only'}>
                <span>
                  <IconButton size="small" onClick={()=>{ if(!effectiveIsAdmin) return; setEditing(p.row as Registration); setEditOpen(true) }} disabled={!effectiveIsAdmin}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={effectiveIsAdmin ? 'Delete registration' : 'Admin only'}>
                <span>
                  <IconButton
                    size="small"
                    onClick={async ()=>{
                      if (!effectiveIsAdmin) return
                      const res = await confirmDelete('Delete registration?', 'This will permanently remove this record.')
                      if (!res.isConfirmed) return
                      try {
                        await deleteDoc(doc(db, REG_COLLECTION, String(p.id)))
                        notifySuccess('Deleted', 'Registration removed')
                      } catch (e:any) {
                        notifyError('Delete failed', e?.message)
                      }
                    }}
                    disabled={!effectiveIsAdmin}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          )
        }
      }
    ],
    [byStudent, effectiveIsAdmin]
  )





  const handleBulkDelete = async () => {
    if (!effectiveIsAdmin) return
    if (!selection.length) return SAlert.fire({ title:'Nothing selected', icon:'info', timer:1200, showConfirmButton:false })
    const res = await confirmDelete('Delete selected?', `You are about to delete ${selection.length} registration(s).`)
    if (!res.isConfirmed) return
    try {
      await Promise.all(selection.map(id => deleteDoc(doc(db, REG_COLLECTION, String(id)))))
      notifySuccess('Deleted', `${selection.length} registration(s) removed`)
      setSelection([])
    } catch (e:any) {
      notifyError('Delete failed', e?.message)
    }
  }

  const handleExportExcel = () => {
    try {
      // Use the current rows data directly
      const exportData = rows.map((row: any, index: number) => {
        const paymentData = paymentDataMap.get(String(row.id)) || {
          totalFee: 0, paid: 0, balance: 0, lastPaymentDate: '', paymentMethod: ''
        }
        
        const rowData: any = {
          '#': index + 1,
          'First Name': row.firstName || '',
          'Last Name': row.lastName || '',
          'Email': row.email || '',
          'Age': computeAge(row.birthday) || '',
          'Birthday': row.birthday || '',
          'Phone': row.cellNumber || '',
          // 2026: Selected Academies (new structure)
          'Academies': (row as any).selectedAcademies && Array.isArray((row as any).selectedAcademies) 
            ? (row as any).selectedAcademies.map((a: any) => {
                const parts = [a.academy || '']
                if (a.level && a.level !== 'N/A') parts.push(a.level)
                if (a.schedule) parts.push(`(${a.schedule})`)
                return parts.filter(Boolean).join(' - ')
              }).join(' | ')
            : '',
          // Legacy: Period 1 & 2 (for old registrations)
          'P1 Academy': row.firstPeriod?.academy || '',
          'P1 Level': row.firstPeriod?.level || '',
          'P2 Academy': row.secondPeriod?.academy || '',
          'P2 Level': row.secondPeriod?.level || '',
          'City': row.city || '',
          'State': row.state || '',
          'Zip': row.zipCode || '',
          'Created': row.createdAt?.seconds 
            ? new Date(row.createdAt.seconds * 1000).toLocaleString()
            : new Date().toLocaleString(),
          'Total Fee': usd(paymentData.totalFee),
          'Paid': usd(paymentData.paid),
          'Balance': usd(paymentData.balance),
          'Last Payment Date': paymentData.lastPaymentDate,
          'Payment Method': paymentData.paymentMethod,
          'Payment Status': (() => {
            const status = byStudent.get(String(row.id))?.status || 'unpaid'
            return status === 'exonerated' ? 'EXONERADO' : status.toUpperCase()
          })()
        }
        
        return rowData
      })
      

      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      
      // Set column widths
      const colWidths = [
        { wch: 5 },   // #
        { wch: 15 },  // First Name
        { wch: 15 },  // Last Name
        { wch: 25 },  // Email
        { wch: 8 },   // Age
        { wch: 12 },  // Birthday
        { wch: 15 },  // Phone
        { wch: 20 },  // P1 Academy
        { wch: 15 },  // P1 Level
        { wch: 20 },  // P2 Academy
        { wch: 15 },  // P2 Level
        { wch: 15 },  // City
        { wch: 12 },  // State
        { wch: 10 },  // Zip
        { wch: 20 },  // Created
        { wch: 12 },  // Total Fee
        { wch: 12 },  // Paid
        { wch: 12 },  // Balance
        { wch: 15 },  // Last Payment Date
        { wch: 15 },  // Payment Method
        { wch: 15 }   // Payment Status
      ]
      
      ws['!cols'] = colWidths
      
      // Add styling for payment status and balance
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const rowData = exportData[R - 1]
        const status = rowData['Payment Status']
        const balance = rowData['Balance']
        
        // Find payment status column dynamically
        const statusColIndex = Object.keys(rowData).indexOf('Payment Status')
        if (statusColIndex !== -1) {
          const statusCell = XLSX.utils.encode_cell({ r: R, c: statusColIndex })
          if (ws[statusCell]) {
            // Add cell styling based on payment status
            if (status === 'PAID') {
              ws[statusCell].s = {
                fill: { fgColor: { rgb: 'C6EFCE' } }, // Light green
                font: { color: { rgb: '006100' }, bold: true }
              }
            } else if (status === 'PARTIAL') {
              ws[statusCell].s = {
                fill: { fgColor: { rgb: 'FFEB9C' } }, // Light yellow
                font: { color: { rgb: '9C5700' }, bold: true }
              }
            } else {
              ws[statusCell].s = {
                fill: { fgColor: { rgb: 'FFC7CE' } }, // Light red
                font: { color: { rgb: '9C0006' }, bold: true }
              }
            }
          }
        }
        
        // Find balance column dynamically
        const balanceColIndex = Object.keys(rowData).indexOf('Balance')
        if (balanceColIndex !== -1 && balance !== '$0.00') {
          const balanceCell = XLSX.utils.encode_cell({ r: R, c: balanceColIndex })
          if (ws[balanceCell]) {
            ws[balanceCell].s = {
              fill: { fgColor: { rgb: 'FFC7CE' } }, // Light red for outstanding balance
              font: { color: { rgb: '9C0006' }, bold: true }
            }
          }
        }
      }
      
      // Add header styling
      const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: C })
        if (ws[headerCell]) {
          ws[headerCell].s = {
            fill: { fgColor: { rgb: '4472C4' } }, // Blue header
            font: { color: { rgb: 'FFFFFF' }, bold: true }
          }
        }
      }
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Registrations')
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const filename = `IYF_Registrations_${timestamp}.xlsx`
      
      // Save file
      XLSX.writeFile(wb, filename)
      
      notifySuccess('Export Successful', `Exported ${exportData.length} registrations to ${filename}`)
    } catch (error: any) {
      notifyError('Export Failed', error?.message || 'Failed to export data')
    }
  }

  return (
    <Card elevation={0} sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title="Registrations"
        subheader={
        effectiveIsAdmin 
          ? 'Full access: Edit, delete, export, and manage registrations' 
          : hasGmailAccess 
            ? 'Read-only access: View and export registrations' 
            : 'No access'
      }
                     action={
         <Stack direction="row" spacing={1}>
           {(effectiveIsAdmin || hasGmailAccess) && (
             <Button
               size="small"
               color="primary"
               startIcon={<FileDownloadIcon />}
               onClick={handleExportExcel}
             >
               Export Excel
             </Button>
           )}
           {effectiveIsAdmin && (
             <Button
               size="small"
               color="error"
               startIcon={<DeleteIcon />}
               onClick={handleBulkDelete}
               disabled={!selection.length}
             >
               Delete Selected
             </Button>
           )}
         </Stack>
       }
      />
      <CardContent sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {!effectiveIsAdmin && hasGmailAccess && (
          <Alert severity="info" sx={{ mb:2 }}>
            You have read-only access. You can view and export registrations, but only admins can edit or delete.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        
        
                 <Box sx={{ flex: 1, width: '100%', overflow: 'hidden', position: 'relative', minHeight: 0 }}>
           <DataGrid
             rows={rows}
             columns={columns}
             loading={loading}
             getRowId={(row) => row.id}
             checkboxSelection={effectiveIsAdmin}
             onRowSelectionModelChange={(m)=> effectiveIsAdmin && setSelection(m as string[])}
             rowSelectionModel={effectiveIsAdmin ? selection : []}
             disableRowSelectionOnClick
             density="compact"
             slots={{ toolbar: GridToolbar }}
             slotProps={{
               toolbar: {
                 showQuickFilter: true,
                 quickFilterProps: { debounceMs: 500 },
                 printOptions: { disableToolbarButton: true },
                 csvOptions: { disableToolbarButton: false }
               }
             }}

                           sortingOrder={['desc','asc']}
              initialState={{
                columns: { columnVisibilityModel: { address:false, gender:false, isDuplicate:false } },
                sorting: {
                  sortModel: [{ field: 'createdAt', sort: 'desc' }]
                }
              }}
              paginationMode="client"
              pageSizeOptions={[]}
             getRowClassName={(params) => {
               const st = byStudent.get(String(params.id))?.status || 'unpaid'
               const isDup = params.row.isDuplicate === true
               const statusClass = st === 'paid' ? 'row-paid' : (st === 'partial' ? 'row-partial' : '')
               return isDup ? `${statusClass} row-duplicate`.trim() : statusClass
             }}
                           sx={{
                border: 'none',
                '& .MuiDataGrid-root': {
                  border: 'none'
                },
                '& .MuiDataGrid-main': {
                  border: 'none'
                },
                '& .row-duplicate': {
                  backgroundColor: '#fff3cd !important',
                  '&:hover': {
                    backgroundColor: '#ffe69c !important'
                  }
                },
                '& .MuiDataGrid-virtualScroller': {
                  overflow: 'auto !important'
                },
                '& .MuiDataGrid-virtualScrollerContent': {
                  height: '100% !important',
                  width: '100% !important'
                },
                '& .MuiDataGrid-row': {
                  cursor: 'default',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                    transition: 'background-color 0.2s ease'
                  }
                },
                '& .MuiDataGrid-cell': {
                  borderBottom: '1px solid #e0e0e0'
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: '#f5f5f5',
                  borderBottom: '2px solid #e0e0e0'
                },
                '& .MuiDataGrid-footerContainer': {
                  borderTop: '1px solid #e0e0e0'
                },
                '& .MuiDataGrid-toolbarContainer': {
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  padding: '8px 16px',
                  flexDirection: 'row'
                },
                '& .MuiDataGrid-quickFilter': {
                  order: -1,
                  marginLeft: 0,
                  marginRight: 'auto',
                  flexShrink: 0
                },
                '& .MuiDataGrid-toolbarContainer > *:not(.MuiDataGrid-quickFilter)': {
                  marginLeft: 'auto'
                }
              }}
           />
         </Box>
      </CardContent>

      {/* Edit dialog */}
      <EditRegistrationDialog
        open={editOpen}
        onClose={()=>{ setEditOpen(false); setEditing(null) }}
        row={editing}
        isAdmin={effectiveIsAdmin}
      />
    </Card>
  )
})

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
    // For 2026: selectedAcademies takes precedence, but keep period support for legacy data
    if ((row as any).selectedAcademies && Array.isArray((row as any).selectedAcademies)) {
      // New 2026 structure - don't populate period fields
      setP1Academy('')
      setP1Level('N/A')
      setP2Academy('')
      setP2Level('N/A')
    } else {
      // Legacy structure
      setP1Academy(row.firstPeriod?.academy || '')
      setP1Level(row.firstPeriod?.level || 'N/A')
      setP2Academy(row.secondPeriod?.academy || '')
      setP2Level(row.secondPeriod?.level || 'N/A')
    }
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
        updatedAt: serverTimestamp()
      }
      
      // Only update periods if this is a legacy registration (not 2026 structure)
      if (!(row as any)?.selectedAcademies || !Array.isArray((row as any).selectedAcademies)) {
        payload.firstPeriod = { academy: p1Academy || '', level: p1Academy === 'Korean Language' ? p1Level : 'N/A' }
        payload.secondPeriod = { academy: p2Academy || '', level: p2Academy === 'Korean Language' ? p2Level : 'N/A' }
      }
      // Note: For 2026 registrations with selectedAcademies, we don't modify the academies here
      // as they should be managed through the frontend registration form
      await updateDoc(doc(db, REG_COLLECTION, row.id), payload)
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

          {/* Show selectedAcademies for 2026 registrations (read-only) */}
          {(row as any)?.selectedAcademies && Array.isArray((row as any).selectedAcademies) && (row as any).selectedAcademies.length > 0 ? (
            <>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>Selected Academies (2026)</Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  This registration uses the new 2026 structure. Academies cannot be edited here. Use the frontend registration form to update.
                </Alert>
                <Stack spacing={1}>
                  {(row as any).selectedAcademies.map((academy: any, idx: number) => (
                    <Box key={idx} sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      <Typography variant="body2"><strong>Academy:</strong> {academy.academy || 'N/A'}</Typography>
                      {academy.level && academy.level !== 'N/A' && (
                        <Typography variant="body2"><strong>Level:</strong> {academy.level}</Typography>
                      )}
                      {academy.schedule && (
                        <Typography variant="body2"><strong>Schedule:</strong> {academy.schedule}</Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </>
          ) : (
            <>
              {/* Legacy structure: Period 1 & 2 */}
              <Grid item xs={12}><strong>Period 1</strong></Grid>
              <Grid item xs={12} md={6}>{academySelect('P1 Academy', p1Academy, setP1Academy)}</Grid>
              <Grid item xs={12} md={6}>{levelSelect('P1 Level', p1Academy, p1Level, setP1Level)}</Grid>

              <Grid item xs={12}><strong>Period 2</strong></Grid>
              <Grid item xs={12} md={6}>{academySelect('P2 Academy', p2Academy, setP2Academy)}</Grid>
              <Grid item xs={12} md={6}>{levelSelect('P2 Level', p2Academy, p2Level, setP2Level)}</Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={handleSave} disabled={!isAdmin}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}

export default RegistrationsList