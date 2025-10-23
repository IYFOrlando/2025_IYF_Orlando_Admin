import React, { useState, useMemo } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Avatar,
  Badge,
  Alert,
  Skeleton,
  Stack,
  Divider
} from '@mui/material'
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  PlayCircle as PlayCircleIcon,
  PauseCircle as PauseCircleIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Group as GroupIcon
} from '@mui/icons-material'
import { DataGrid, GridColDef, GridActionsCellItem, GridRowParams } from '@mui/x-data-grid'
import type { VolunteerApplication, VolunteerStatus } from '../types'

interface VolunteerTableProps {
  volunteers: VolunteerApplication[]
  loading: boolean
  error: Error | null
  onEdit: (volunteer: VolunteerApplication) => void
  onDelete: (id: string) => void
  onView: (volunteer: VolunteerApplication) => void
  onStatusChange: (id: string, status: VolunteerStatus) => void
  onCreateNew: () => void
  onRefresh: () => void
}

const STATUS_CONFIG = {
  pending: { 
    label: 'Pending', 
    color: '#ff9800', 
    icon: <PendingIcon />,
    bgColor: '#fff3e0'
  },
  approved: { 
    label: 'Approved', 
    color: '#2196f3', 
    icon: <CheckCircleIcon />,
    bgColor: '#e3f2fd'
  },
  active: { 
    label: 'Active', 
    color: '#4caf50', 
    icon: <PlayCircleIcon />,
    bgColor: '#e8f5e8'
  },
  rejected: { 
    label: 'Rejected', 
    color: '#f44336', 
    icon: <CancelIcon />,
    bgColor: '#ffebee'
  },
  inactive: { 
    label: 'Inactive', 
    color: '#9e9e9e', 
    icon: <PauseCircleIcon />,
    bgColor: '#f5f5f5'
  }
}

export default function VolunteerTable({
  volunteers,
  loading,
  error,
  onEdit,
  onDelete,
  onView,
  onStatusChange,
  onCreateNew,
  onRefresh
}: VolunteerTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<VolunteerStatus | 'all'>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [selectedRows, setSelectedRows] = useState<string[]>([])

  // Filter and search volunteers
  const filteredVolunteers = useMemo(() => {
    let filtered = volunteers

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(volunteer => volunteer.status === statusFilter)
    }

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(volunteer =>
        volunteer.firstName?.toLowerCase().includes(term) ||
        volunteer.lastName?.toLowerCase().includes(term) ||
        volunteer.email?.toLowerCase().includes(term) ||
        volunteer.volunteerCode?.toLowerCase().includes(term) ||
        volunteer.phone?.toLowerCase().includes(term) ||
        volunteer.city?.toLowerCase().includes(term)
      )
    }

    return filtered
  }, [volunteers, statusFilter, searchTerm])

  // Statistics
  const stats = useMemo(() => {
    const total = volunteers.length
    const pending = volunteers.filter(v => v.status === 'pending').length
    const approved = volunteers.filter(v => v.status === 'approved').length
    const active = volunteers.filter(v => v.status === 'active').length
    const rejected = volunteers.filter(v => v.status === 'rejected').length
    const inactive = volunteers.filter(v => v.status === 'inactive').length

    return { total, pending, approved, active, rejected, inactive }
  }, [volunteers])

  const columns: GridColDef[] = [
    {
      field: 'volunteer',
      headerName: 'Volunteer',
      width: 250,
      renderCell: (params) => {
        const volunteer = params.row as VolunteerApplication
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar
              sx={{
                bgcolor: STATUS_CONFIG[volunteer.status].color,
                width: 40,
                height: 40
              }}
            >
              {volunteer.firstName?.[0]}{volunteer.lastName?.[0]}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                {volunteer.firstName} {volunteer.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {volunteer.volunteerCode}
              </Typography>
            </Box>
          </Box>
        )
      }
    },
    {
      field: 'contact',
      headerName: 'Contact',
      width: 200,
      renderCell: (params) => {
        const volunteer = params.row as VolunteerApplication
        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
              <EmailIcon fontSize="small" color="action" />
              <Typography variant="caption" noWrap>
                {volunteer.email}
              </Typography>
            </Box>
            {volunteer.phone && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PhoneIcon fontSize="small" color="action" />
                <Typography variant="caption" noWrap>
                  {volunteer.phone}
                </Typography>
              </Box>
            )}
          </Box>
        )
      }
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 150,
      renderCell: (params) => {
        const volunteer = params.row as VolunteerApplication
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocationIcon fontSize="small" color="action" />
            <Typography variant="caption">
              {volunteer.city}, {volunteer.state}
            </Typography>
          </Box>
        )
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const volunteer = params.row as VolunteerApplication
        const config = STATUS_CONFIG[volunteer.status]
        return (
          <Chip
            icon={config.icon}
            label={config.label}
            size="small"
            sx={{
              backgroundColor: config.bgColor,
              color: config.color,
              fontWeight: 'bold',
              '& .MuiChip-icon': {
                color: config.color
              }
            }}
          />
        )
      }
    },
    {
      field: 'compliance',
      headerName: 'Compliance',
      width: 120,
      renderCell: (params) => {
        const volunteer = params.row as VolunteerApplication
        const completed = [
          volunteer.backgroundCheckCompleted,
          volunteer.trainingCompleted,
          volunteer.orientationAttended
        ].filter(Boolean).length

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <SecurityIcon fontSize="small" color={completed === 3 ? 'success' : 'warning'} />
            <Typography variant="caption">
              {completed}/3
            </Typography>
          </Box>
        )
      }
    },
    {
      field: 'skills',
      headerName: 'Skills',
      width: 150,
      renderCell: (params) => {
        const volunteer = params.row as VolunteerApplication
        const skills = volunteer.skills || []
        return (
          <Box>
            {skills.slice(0, 2).map((skill, index) => (
              <Chip
                key={index}
                label={skill}
                size="small"
                variant="outlined"
                sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
              />
            ))}
            {skills.length > 2 && (
              <Typography variant="caption" color="text.secondary">
                +{skills.length - 2} more
              </Typography>
            )}
          </Box>
        )
      }
    },
    {
      field: 'createdAt',
      headerName: 'Joined',
      width: 120,
      renderCell: (params) => {
        const volunteer = params.row as VolunteerApplication
        const date = new Date(volunteer.createdAt.seconds * 1000)
        return (
          <Typography variant="caption">
            {date.toLocaleDateString()}
          </Typography>
        )
      }
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 80,
      getActions: (params) => {
        const volunteer = params.row as VolunteerApplication
        return [
          <GridActionsCellItem
            icon={<ViewIcon />}
            label="View/Edit"
            onClick={() => onEdit(volunteer)}
          />,
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit"
            onClick={() => onEdit(volunteer)}
          />
        ]
      }
    }
  ]

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Error loading volunteers: {error.message}
          </Alert>
          <Button onClick={onRefresh} startIcon={<RefreshIcon />}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Box>
      {/* Statistics Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ minWidth: 120, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <GroupIcon sx={{ fontSize: 32, mb: 1 }} />
            <Typography variant="h4" fontWeight="bold">
              {stats.total}
            </Typography>
            <Typography variant="caption">Total Volunteers</Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 120, background: '#fff3e0' }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <PendingIcon sx={{ fontSize: 32, mb: 1, color: '#ff9800' }} />
            <Typography variant="h4" fontWeight="bold" color="#ff9800">
              {stats.pending}
            </Typography>
            <Typography variant="caption">Pending</Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 120, background: '#e8f5e8' }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <PlayCircleIcon sx={{ fontSize: 32, mb: 1, color: '#4caf50' }} />
            <Typography variant="h4" fontWeight="bold" color="#4caf50">
              {stats.active}
            </Typography>
            <Typography variant="caption">Active</Typography>
          </CardContent>
        </Card>
        
        <Card sx={{ minWidth: 120, background: '#e3f2fd' }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <CheckCircleIcon sx={{ fontSize: 32, mb: 1, color: '#2196f3' }} />
            <Typography variant="h4" fontWeight="bold" color="#2196f3">
              {stats.approved}
            </Typography>
            <Typography variant="caption">Approved</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Filters and Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search volunteers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              sx={{ minWidth: 250 }}
            />
            
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as VolunteerStatus | 'all')}
                label="Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {config.icon}
                      {config.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ flexGrow: 1 }} />

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onCreateNew}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
                }
              }}
            >
              Add Volunteer
            </Button>

            <Tooltip title="Refresh Data">
              <IconButton onClick={onRefresh}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Card>
        <DataGrid
          rows={filteredVolunteers}
          columns={columns}
          loading={loading}
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: {
              paginationModel: { page: 0, pageSize: 25 }
            }
          }}
          checkboxSelection
          disableRowSelectionOnClick
          onRowSelectionModelChange={(newSelection) => {
            setSelectedRows(newSelection as string[])
          }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-cell': {
              borderBottom: '1px solid #f0f0f0'
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f8f9fa',
              borderBottom: '2px solid #e0e0e0'
            },
            '& .MuiDataGrid-row:hover': {
              backgroundColor: '#f5f5f5'
            }
          }}
        />
      </Card>

      {/* Selected Actions */}
      {selectedRows.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="subtitle2">
                {selectedRows.length} volunteer(s) selected
              </Typography>
              <Button size="small" startIcon={<DownloadIcon />}>
                Export Selected
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
