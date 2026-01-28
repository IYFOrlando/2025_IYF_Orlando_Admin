import { useState } from 'react'
import { 
  Box, 
  Typography, 
  Stack, 
  CardContent, 
  TextField, 
  MenuItem, 
  Grid
} from '@mui/material'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import { History } from 'lucide-react'
import { Timestamp } from 'firebase/firestore'
import { GlassCard } from '../../../components/GlassCard'
import { useActivityLog } from '../hooks/useActivityLog'
import { useTeacherContext } from '../../auth/context/TeacherContext'
import { AccessDenied } from '../../../components/AccessDenied'

export default function ActivityLogPage() {
  const { isAdmin } = useTeacherContext()
  
  if (!isAdmin) {
    return <AccessDenied />
  }

  const { logs, loading } = useActivityLog(isAdmin)
  const [filterText, setFilterText] = useState('')
  const [actionFilter, setActionFilter] = useState('All')

  const columns: GridColDef[] = [
    { 
      field: 'createdAt', 
      headerName: 'Timestamp', 
      width: 180,
      valueGetter: (params: { value: Timestamp }) => params.value?.toDate() || new Date(),
      valueFormatter: (params: { value: Date }) => params.value.toLocaleString()
    },
    { field: 'teacherName', headerName: 'Teacher', width: 150 },
    { field: 'action', headerName: 'Action', width: 150 },
    { field: 'academy', headerName: 'Academy', width: 180 },
    { field: 'details', headerName: 'Details', flex: 1, minWidth: 200 },
  ]

  const filteredLogs = logs.filter(log => {
    const matchesText = 
      log.teacherName.toLowerCase().includes(filterText.toLowerCase()) ||
      (log.details || '').toLowerCase().includes(filterText.toLowerCase()) ||
      log.academy.toLowerCase().includes(filterText.toLowerCase())
    
    const matchesAction = actionFilter === 'All' || log.action.includes(actionFilter)
    
    return matchesText && matchesAction
  })

  // Derive unique actions for the filter dropdown
  const actionTypes = ['All', ...new Set(logs.map(l => l.action.split(' ')[0]))]

  return (
    <Box>
      <Box sx={{ 
        mb: 4,
        background: 'linear-gradient(135deg, #455a64 0%, #263238 100%)', // Blue Gray gradient
        borderRadius: 3,
        p: 3,
        color: 'white',
        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.14)'
      }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <History size={40} color="white" />
          <Box>
            <Typography variant="h4" fontWeight={800} color="white">
              Teacher Activity Audit Log
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5, color: 'white' }}>
              Historical record of all teacher actions for oversight and compliance.
            </Typography>
          </Box>
        </Stack>
      </Box>

      <GlassCard sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="Search by Teacher, Academy, or Details"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Action Type"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                {actionTypes.map(type => (
                  <MenuItem key={type} value={type}>{type}</MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </GlassCard>

      <GlassCard>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={filteredLogs}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            slots={{ toolbar: GridToolbar }}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(224, 224, 224, 0.4)' },
              '& .MuiDataGrid-columnHeaders': { 
                bgcolor: 'rgba(69, 90, 100, 0.08)', 
                fontWeight: 700 
              },
            }}
          />
        </Box>
      </GlassCard>
    </Box>
  )
}
