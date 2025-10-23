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
  Avatar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material'
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  PlayCircle as PlayCircleIcon,
  PauseCircle as PauseCircleIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Group as GroupIcon
} from '@mui/icons-material'
import { useVolunteerCommitments } from '../hooks/useVolunteerCommitments'

// Define types locally to avoid import issues
interface VolunteerApplication {
  id: string
  firstName: string
  lastName: string
  email: string
  gender: string
  tshirtSize: string
  emergencyContact: string
  emergencyPhone: string
  volunteerCode?: string
  source?: string
  eventInfoAccepted?: boolean
  termsAccepted?: boolean
  age?: number
  phone?: string
  city?: string
  state?: string
  country?: string
  availability?: {
    days: string[]
    times: string[]
    commitment: string
    flexible?: boolean
    maxHoursPerDay?: number
  }
  interests?: string[]
  skills?: string[]
  languages?: string[]
  backgroundCheckCompleted?: boolean
  trainingCompleted?: boolean
  orientationAttended?: boolean
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'inactive'
  notes?: string
  createdAt: {
    seconds: number
    nanoseconds: number
  }
  updatedAt?: {
    seconds: number
    nanoseconds: number
  }
}

type VolunteerStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'inactive'

interface SimpleVolunteerTableProps {
  volunteers: VolunteerApplication[]
  loading: boolean
  error: Error | null
  onEdit: (volunteer: VolunteerApplication) => void
  onDelete: (id: string) => void
  onView: (volunteer: VolunteerApplication) => void
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

export default function SimpleVolunteerTable({
  volunteers,
  loading,
  error,
  onEdit,
  onDelete,
  onView,
  onCreateNew,
  onRefresh
}: SimpleVolunteerTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<VolunteerStatus | 'all'>('all')
  const [commitmentFilter, setCommitmentFilter] = useState<string>('all')
  const [skillFilter, setSkillFilter] = useState<string>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [sortField, setSortField] = useState<string>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const { data: commitments, getCommitmentByVolunteerEmail } = useVolunteerCommitments()

  // Get unique values for filters
  const uniqueCommitmentResponses = useMemo(() => {
    const responses = new Set<string>()
    commitments.forEach(commitment => {
      if (commitment.commitmentResponse) {
        responses.add(commitment.commitmentResponse)
      }
    })
    return Array.from(responses)
  }, [commitments])

  const uniqueSkills = useMemo(() => {
    const skills = new Set<string>()
    volunteers.forEach(volunteer => {
      if (volunteer.skills) {
        volunteer.skills.forEach(skill => skills.add(skill))
      }
    })
    return Array.from(skills)
  }, [volunteers])

  // Sort function
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filter and search volunteers
  const filteredVolunteers = useMemo(() => {
    let filtered = volunteers

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(volunteer => volunteer.status === statusFilter)
    }

    // Commitment filter
    if (commitmentFilter !== 'all') {
      filtered = filtered.filter(volunteer => {
        const commitment = getCommitmentByVolunteerEmail(volunteer.email)
        return commitment?.commitmentResponse === commitmentFilter
      })
    }

    // Skill filter
    if (skillFilter !== 'all') {
      filtered = filtered.filter(volunteer => 
        volunteer.skills?.includes(skillFilter)
      )
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

    // Sort
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: any
        let bValue: any

        switch (sortField) {
          case 'name':
            aValue = `${a.firstName} ${a.lastName}`.toLowerCase()
            bValue = `${b.firstName} ${b.lastName}`.toLowerCase()
            break
          case 'email':
            aValue = a.email?.toLowerCase() || ''
            bValue = b.email?.toLowerCase() || ''
            break
          case 'status':
            aValue = a.status
            bValue = b.status
            break
          case 'commitment':
            const aCommitment = getCommitmentByVolunteerEmail(a.email)
            const bCommitment = getCommitmentByVolunteerEmail(b.email)
            aValue = aCommitment?.commitmentResponse || 'No response'
            bValue = bCommitment?.commitmentResponse || 'No response'
            break
          case 'skills':
            aValue = a.skills?.join(', ') || ''
            bValue = b.skills?.join(', ') || ''
            break
          case 'createdAt':
            aValue = new Date(a.createdAt.seconds * 1000)
            bValue = new Date(b.createdAt.seconds * 1000)
            break
          default:
            return 0
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [volunteers, statusFilter, commitmentFilter, skillFilter, searchTerm, sortField, sortDirection, getCommitmentByVolunteerEmail])

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

  // Pagination
  const paginatedVolunteers = filteredVolunteers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  // Sortable header component
  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => {
    const isActive = sortField === field

    return (
      <TableCell
        sx={{
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
          fontWeight: isActive ? 'bold' : 'normal',
          color: isActive ? 'primary.main' : 'inherit',
          backgroundColor: isActive ? 'primary.50' : 'transparent'
        }}
        onClick={() => handleSort(field)}
      >
        {children}
      </TableCell>
    )
  }

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

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Commitment</InputLabel>
              <Select
                value={commitmentFilter}
                onChange={(e) => setCommitmentFilter(e.target.value)}
                label="Commitment"
              >
                <MenuItem value="all">All Commitments</MenuItem>
                {uniqueCommitmentResponses.map((response) => (
                  <MenuItem key={response} value={response}>
                    {response}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Skill</InputLabel>
              <Select
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                label="Skill"
              >
                <MenuItem value="all">All Skills</MenuItem>
                {uniqueSkills.map((skill) => (
                  <MenuItem key={skill} value={skill}>
                    {skill}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ flexGrow: 1 }} />

            <Button
              variant="outlined"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('all')
                setCommitmentFilter('all')
                setSkillFilter('all')
              }}
              sx={{ mr: 1 }}
            >
              Clear Filters
            </Button>

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

      {/* Table */}
      <Card>
        {/* Sort Indicator */}
        {sortField && (
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
            <Typography variant="caption" color="text.secondary">
              Ordenado por: <strong>{sortField}</strong> ({sortDirection === 'asc' ? 'Ascendente' : 'Descendente'})
            </Typography>
          </Box>
        )}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'primary.50' }}>
                <TableCell sx={{ width: 60, fontWeight: 'bold', color: 'primary.main' }}>#</TableCell>
                <SortableHeader field="name">Volunteer</SortableHeader>
                <SortableHeader field="email">Contact</SortableHeader>
                <SortableHeader field="status">Status</SortableHeader>
                <SortableHeader field="commitment">Availability</SortableHeader>
                <SortableHeader field="skills">Skills</SortableHeader>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>T-shirt Size</TableCell>
                <SortableHeader field="createdAt">Joined</SortableHeader>
                <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography>Loading volunteers...</Typography>
                  </TableCell>
                </TableRow>
              ) : paginatedVolunteers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography>No volunteers found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedVolunteers.map((volunteer) => {
                  const statusConfig = STATUS_CONFIG[volunteer.status]
                  const createdAt = new Date(volunteer.createdAt.seconds * 1000)

                  return (
                    <TableRow 
                      key={volunteer.id} 
                      hover
                      sx={{ 
                        '&:nth-of-type(odd)': { bgcolor: 'grey.50' },
                        '&:hover': { bgcolor: 'primary.50' }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 'bold', color: 'text.secondary', textAlign: 'center' }}>
                        {page * rowsPerPage + paginatedVolunteers.indexOf(volunteer) + 1}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            sx={{
                              bgcolor: statusConfig.color,
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
                            <Typography variant="caption" display="block" color="text.secondary">
                              Age: {volunteer.age || 'N/A'} • {volunteer.gender || 'N/A'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                            <EmailIcon fontSize="small" color="action" />
                            <Typography variant="caption" noWrap>
                              {volunteer.email}
                            </Typography>
                          </Box>
                          {volunteer.phone && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                              <PhoneIcon fontSize="small" color="action" />
                              <Typography variant="caption" noWrap>
                                {volunteer.phone}
                              </Typography>
                            </Box>
                          )}
                          {(volunteer.city || volunteer.state) && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <LocationIcon fontSize="small" color="action" />
                              <Typography variant="caption" noWrap>
                                {volunteer.city}, {volunteer.state}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={statusConfig.icon}
                          label={statusConfig.label}
                          size="small"
                          sx={{
                            backgroundColor: statusConfig.bgColor,
                            color: statusConfig.color,
                            fontWeight: 'bold',
                            '& .MuiChip-icon': {
                              color: statusConfig.color
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          {(() => {
                            const commitment = getCommitmentByVolunteerEmail(volunteer.email)
                            if (commitment?.commitmentResponse) {
                              return (
                                <Typography variant="caption" display="block" fontWeight="medium">
                                  {commitment.commitmentResponse}
                                </Typography>
                              )
                            }
                            return (
                              <Typography variant="caption" color="text.secondary" display="block">
                                No response
                              </Typography>
                            )
                          })()}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {volunteer.skills && volunteer.skills.slice(0, 2).map((skill, index) => (
                            <Chip
                              key={index}
                              label={skill}
                              size="small"
                              variant="outlined"
                              sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
                            />
                          ))}
                          {volunteer.skills && volunteer.skills.length > 2 && (
                            <Typography variant="caption" color="text.secondary">
                              +{volunteer.skills.length - 2} more
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" fontWeight="medium">
                          {volunteer.tshirtSize || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {createdAt.toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton size="small" onClick={() => onView(volunteer)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => onEdit(volunteer)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" onClick={() => onDelete(volunteer.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredVolunteers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          sx={{ 
            borderTop: 1, 
            borderColor: 'divider',
            bgcolor: 'grey.50'
          }}
        />
      </Card>
    </Box>
  )
}
