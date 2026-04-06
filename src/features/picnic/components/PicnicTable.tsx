import { 
  Box, Card, Typography, IconButton, Chip, Stack, 
  Tooltip, Button,
  useTheme
} from '@mui/material'
import { 
  DataGrid, 
  GridToolbarContainer, 
  GridToolbarQuickFilter,
  type GridColDef
} from '@mui/x-data-grid'
import { 
  Download, 
  Eye, 
  Trash2
} from 'lucide-react'
import type { PicnicSignup } from '../api/picnicApi'
import * as XLSX from 'xlsx'

interface PicnicTableProps {
  rows: PicnicSignup[]
  loading: boolean
  onViewDetails: (signup: PicnicSignup) => void
  onDelete: (id: number) => void
}

export default function PicnicTable({ rows, loading, onViewDetails, onDelete }: PicnicTableProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const handleExport = () => {
    const exportData = rows.map(r => ({
      'First Name': r.first_name,
      'Last Name': r.last_name,
      'Email': r.email,
      'Phone': r.phone || 'N/A',
      'Additional Guests': r.guests,
      'Total Attendees': r.guests + 1,
      'Potluck Items': (r.items_claimed || []).join(', '),
      'Registered At': new Date(r.created_at).toLocaleString()
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Picnic Signups')
    XLSX.writeFile(wb, `Picnic_Signups_2026_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const columns: GridColDef[] = [
    { 
      field: 'name', 
      headerName: 'Guest Name', 
      minWidth: 180, 
      flex: 1,
      valueGetter: (params) => `${params.row.first_name} ${params.row.last_name}`,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight={700} color={isDark ? 'white' : '#0a192f'}>
            {params.row.first_name} {params.row.last_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.email}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'phone', 
      headerName: 'Phone', 
      width: 140,
      renderCell: (params) => (
        <Typography variant="body2">{params.row.phone || '-'}</Typography>
      )
    },
    { 
      field: 'guests', 
      headerName: 'Guests', 
      width: 100, 
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip 
          label={`+${params.row.guests}`} 
          size="small" 
          sx={{ 
            bgcolor: params.row.guests > 0 ? 'rgba(222, 79, 37, 0.1)' : 'transparent',
            color: params.row.guests > 0 ? '#de4f25' : 'text.disabled',
            fontWeight: 700,
            border: params.row.guests > 0 ? '1px solid #de4f25' : '1px solid divider'
          }} 
        />
      )
    },
    { 
      field: 'items_claimed', 
      headerName: 'Potluck Items', 
      minWidth: 220, 
      flex: 1.5,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5} sx={{ display: 'flex', flexWrap: 'wrap', py: 1 }}>
          {(params.row.items_claimed || []).slice(0, 2).map((item: string, i: number) => (
            <Chip 
              key={i} 
              label={item} 
              size="small" 
              variant="outlined" 
              sx={{ fontSize: '0.65rem', borderRadius: 1.5 }} 
            />
          ))}
          {(params.row.items_claimed || []).length > 2 && (
            <Chip 
              label={`+${(params.row.items_claimed || []).length - 2} more`} 
              size="small" 
              sx={{ fontSize: '0.65rem' }} 
            />
          )}
          {(params.row.items_claimed || []).length === 0 && (
            <Typography variant="caption" color="text.disabled">None</Typography>
          )}
        </Stack>
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Ver Detalles">
            <IconButton 
              size="small" 
              onClick={() => onViewDetails(params.row)}
              sx={{ 
                color: '#0a192f',
                '&:hover': { bgcolor: 'rgba(10, 25, 47, 0.05)' } 
              }}
            >
              <Eye size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton 
              size="small" 
              color="error"
              onClick={() => onDelete(params.row.id)}
            >
              <Trash2 size={18} />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ]

  const CustomToolbar = () => (
    <GridToolbarContainer sx={{ p: 2, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <GridToolbarQuickFilter 
           variant="outlined" 
           size="small" 
           placeholder="Search registrant..."
           sx={{ 
             width: 300,
             '& .MuiOutlinedInput-root': { borderRadius: 3 }
           }}
        />
      </Box>
      <Button 
        variant="contained" 
        startIcon={<Download size={16} />}
        onClick={handleExport}
        sx={{ 
          borderRadius: 3,
          bgcolor: '#0a192f',
          textTransform: 'none',
          px: 3,
          '&:hover': { bgcolor: '#1a2a3f' }
        }}
      >
        Export CSV
      </Button>
    </GridToolbarContainer>
  )

  return (
    <Card 
      elevation={0}
      sx={{ 
        borderRadius: 4, 
        border: '1px solid', 
        borderColor: 'divider',
        overflow: 'hidden',
        background: isDark ? 'rgba(255,255,255,0.02)' : 'white'
      }}
    >
      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          slots={{ toolbar: CustomToolbar }}
          getRowId={(row) => row.id}
          columnHeaderHeight={60}
          rowHeight={70}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: isDark ? 'rgba(255,255,255,0.02)' : '#f8f9fa',
              borderBottom: '1px solid',
              borderColor: 'divider',
              textTransform: 'uppercase',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: 1,
              color: 'text.secondary'
            },
            '& .MuiDataGrid-cell': {
              borderColor: 'divider'
            },
            '& .MuiDataGrid-virtualScroller': {
              bgcolor: 'transparent'
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid',
              borderColor: 'divider',
              bgcolor: isDark ? 'transparent' : '#f8f9fa'
            }
          }}
        />
      </Box>
    </Card>
  )
}
