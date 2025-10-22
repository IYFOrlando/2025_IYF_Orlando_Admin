import * as React from 'react'
import {
  Card, CardHeader, CardContent, Stack, Box, Alert, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Typography, Chip,
  Grid, MenuItem, FormControl, InputLabel, Select, Tabs, Tab
} from '@mui/material'
import { DataGrid, GridToolbar, type GridColDef } from '@mui/x-data-grid'
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism'
import PersonIcon from '@mui/icons-material/Person'
import EmailIcon from '@mui/icons-material/Email'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PendingIcon from '@mui/icons-material/Pending'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import PauseCircleIcon from '@mui/icons-material/PauseCircle'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'
import AddIcon from '@mui/icons-material/Add'

import { useVolunteerApplications } from '../hooks/useVolunteerApplications'
import VolunteerStats from '../components/VolunteerStats'
import VolunteerExport from '../components/VolunteerExport'
import PreEventVolunteerSchedule from '../components/VolunteerTimeSlots'
import VolunteerCheckInOut from '../components/VolunteerCheckInOut'
import type { VolunteerApplication, VolunteerStatus } from '../types'
import { notifySuccess, notifyError } from '../../../lib/alerts'
import Swal from 'sweetalert2'
import FirebaseErrorBoundary from '../../../app/components/FirebaseErrorBoundary'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`volunteer-tabpanel-${index}`}
      aria-labelledby={`volunteer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const STATUS_COLORS = {
  pending: 'warning',
  approved: 'info',
  rejected: 'error',
  active: 'success',
  inactive: 'default'
} as const

const STATUS_ICONS = {
  pending: <PendingIcon />,
  approved: <CheckCircleIcon />,
  rejected: <CancelIcon />,
  active: <PlayCircleIcon />,
  inactive: <PauseCircleIcon />
}

function VolunteersPageContent() {
  const { data: applications, loading, error, createVolunteer, updateVolunteer, updateStatus, deleteVolunteer } = useVolunteerApplications()
  const [selectedApplication, setSelectedApplication] = React.useState<VolunteerApplication | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [newStatus, setNewStatus] = React.useState<VolunteerStatus>('pending')
  const [notes, setNotes] = React.useState('')
  const [filterStatus, setFilterStatus] = React.useState<VolunteerStatus | 'all'>('all')
  const [tabValue, setTabValue] = React.useState(0)

  // Handle hash-based tab navigation
  React.useEffect(() => {
    const hash = window.location.hash
    if (hash === '#schedule') {
      setTabValue(1) // Switch to "Pre-Event Volunteer Schedule" tab
    }
  }, [])
  const [newVolunteer, setNewVolunteer] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    gender: '',
    tshirtSize: '',
    emergencyContact: '',
    emergencyPhone: '',
    volunteerCode: '',
    source: 'website',
    eventInfoAccepted: true,
    termsAccepted: true,
    status: 'pending' as VolunteerStatus,
    // Additional optional fields
    age: 18,
    phone: '',
    confirmEmail: '',
    city: ''
  })

  const filteredApplications = React.useMemo(() => {
    if (filterStatus === 'all') return applications
    return applications.filter(app => app.status === filterStatus)
  }, [applications, filterStatus])

  const handleRowClick = React.useCallback((params: { row: VolunteerApplication }) => {
    setSelectedApplication(params.row)
    setDetailsOpen(true)
  }, [])

  const handleStatusUpdate = React.useCallback(async () => {
    if (!selectedApplication) return

    try {
      await updateStatus(selectedApplication.id, newStatus, notes)
      notifySuccess(`Volunteer application status updated to ${newStatus}`)
      setStatusDialogOpen(false)
      setNotes('')
    } catch (err) {
      notifyError('Failed to update volunteer application status')
      console.error(err)
    }
  }, [selectedApplication, newStatus, notes, updateStatus])

  const openStatusDialog = React.useCallback((application: VolunteerApplication) => {
    setSelectedApplication(application)
    setNewStatus(application.status)
    setNotes(application.notes || '')
    setStatusDialogOpen(true)
  }, [])

  const handleCreateVolunteer = React.useCallback(async () => {
    try {
      if (!newVolunteer.firstName || !newVolunteer.lastName || !newVolunteer.email || !newVolunteer.phone) {
        notifyError('Please fill in all required fields')
        return
      }

      if (newVolunteer.email !== newVolunteer.confirmEmail) {
        notifyError('Email and confirm email do not match')
        return
      }

      await createVolunteer(newVolunteer)
      
      notifySuccess('Volunteer application created successfully')
      setCreateDialogOpen(false)
      setNewVolunteer({
        firstName: '',
        lastName: '',
        email: '',
        gender: '',
        tshirtSize: '',
        emergencyContact: '',
        emergencyPhone: '',
        volunteerCode: '',
        source: 'website',
        eventInfoAccepted: true,
        termsAccepted: true,
        status: 'pending' as VolunteerStatus,
        age: 18,
        phone: '',
        confirmEmail: '',
        city: ''
      })
    } catch (err) {
      console.error('Error creating volunteer:', err)
      notifyError('Failed to create volunteer application')
    }
  }, [newVolunteer, createVolunteer])

  const handleEditVolunteer = React.useCallback((application: VolunteerApplication) => {
    setSelectedApplication(application)
    setNewVolunteer({
      firstName: application.firstName,
      lastName: application.lastName,
      email: application.email,
      gender: application.gender,
      tshirtSize: application.tshirtSize,
      emergencyContact: application.emergencyContact,
      emergencyPhone: application.emergencyPhone,
      volunteerCode: application.volunteerCode || '',
      source: application.source || 'website',
      eventInfoAccepted: application.eventInfoAccepted || true,
      termsAccepted: application.termsAccepted || true,
      status: application.status,
      age: application.age || 18,
      phone: application.phone || '',
      confirmEmail: application.email,
      city: application.city || ''
    })
    setEditDialogOpen(true)
  }, [])

  const handleUpdateVolunteer = React.useCallback(async () => {
    if (!selectedApplication) return
    
    try {
      if (!newVolunteer.firstName || !newVolunteer.lastName || !newVolunteer.email || !newVolunteer.phone) {
        notifyError('Please fill in all required fields')
        return
      }

      await updateVolunteer(selectedApplication.id, {
        ...newVolunteer,
        updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 }
      })
      
      notifySuccess('Volunteer application updated successfully')
      setEditDialogOpen(false)
      setSelectedApplication(null)
      setNewVolunteer({
        firstName: '',
        lastName: '',
        email: '',
        gender: '',
        tshirtSize: '',
        emergencyContact: '',
        emergencyPhone: '',
        volunteerCode: '',
        source: 'website',
        eventInfoAccepted: true,
        termsAccepted: true,
        status: 'pending' as VolunteerStatus,
        age: 18,
        phone: '',
        confirmEmail: '',
        city: ''
      })
    } catch (err) {
      console.error('Error updating volunteer:', err)
      notifyError('Failed to update volunteer application')
    }
  }, [selectedApplication, newVolunteer, updateVolunteer])

  const handleDeleteVolunteer = React.useCallback(async (application: VolunteerApplication) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete ${application.firstName} ${application.lastName}'s application?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    })

    if (result.isConfirmed) {
      try {
        await deleteVolunteer(application.id)
        notifySuccess('Volunteer application deleted successfully')
      } catch (err) {
        console.error('Error deleting volunteer:', err)
        notifyError('Failed to delete volunteer application')
      }
    }
  }, [deleteVolunteer])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const columns: GridColDef[] = [
    {
      field: 'firstName',
      headerName: 'Name',
      width: 200,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <PersonIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {params.row.firstName} {params.row.lastName}
          </Typography>
        </Stack>
      )
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 250,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <EmailIcon fontSize="small" color="action" />
          <Typography variant="body2">{params.value}</Typography>
        </Stack>
      )
    },
    {
      field: 'volunteerCode',
      headerName: 'Volunteer Code',
      width: 150,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'N/A'} 
          size="small" 
          variant="outlined" 
          color={params.value ? 'primary' : 'default'}
        />
      )
    },
    {
      field: 'gender',
      headerName: 'Gender',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value || 'N/A'} size="small" variant="outlined" />
      )
    },
    {
      field: 'emergencyContact',
      headerName: 'Emergency Contact',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2">{params.value || 'N/A'}</Typography>
      )
    },
    {
      field: 'source',
      headerName: 'Source',
      width: 100,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'N/A'} 
          size="small" 
          variant="outlined"
          color={params.value === 'website' ? 'success' : 'default'}
        />
      )
    },
    {
      field: 'tshirtSize',
      headerName: 'T-Shirt',
      width: 100,
      renderCell: (params) => (
        <Chip label={params.value || 'N/A'} size="small" variant="outlined" />
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          icon={STATUS_ICONS[params.value as VolunteerStatus]}
          label={params.value}
          color={STATUS_COLORS[params.value as VolunteerStatus]}
          size="small"
        />
      )
    },
    {
      field: 'createdAt',
      headerName: 'Applied',
      width: 120,
      renderCell: (params) => {
        const date = new Date(params.value.seconds * 1000)
        return date.toLocaleDateString()
      }
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedApplication(params.row)
              setDetailsOpen(true)
            }}
          >
            View
          </Button>
          <Button
            size="small"
            startIcon={<EditIcon />}
            onClick={(e) => {
              e.stopPropagation()
              handleEditVolunteer(params.row)
            }}
          >
            Edit
          </Button>
          <Button
            size="small"
            startIcon={<EditIcon />}
            onClick={(e) => {
              e.stopPropagation()
              openStatusDialog(params.row)
            }}
          >
            Status
          </Button>
          <Button
            size="small"
            startIcon={<CancelIcon />}
            color="error"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteVolunteer(params.row)
            }}
          >
            Delete
          </Button>
        </Stack>
      )
    }
  ]

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading volunteer applications: {error.message}
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={2}>
              <VolunteerActivismIcon color="primary" />
              <Typography variant="h5">Volunteer Applications</Typography>
            </Stack>
          }
          subheader={`${filteredApplications.length} applications`}
          action={
            <Stack direction="row" spacing={2} alignItems="center">
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Volunteer
              </Button>
              <VolunteerExport applications={applications} />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Filter Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Filter Status"
                  onChange={(e) => setFilterStatus(e.target.value as VolunteerStatus | 'all')}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          }
        />
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Volunteer Applications" />
              <Tab label="Pre-Event Volunteer Schedule" />
              <Tab label="Check-in/Check-out" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            {/* Statistics */}
            <VolunteerStats applications={applications} />
            
            <Box sx={{ mt: 3 }}>
              <DataGrid
                rows={filteredApplications}
                columns={columns}
                loading={loading}
                onRowClick={handleRowClick}
                slots={{ toolbar: GridToolbar }}
                slotProps={{
                  toolbar: {
                    showQuickFilter: true,
                    quickFilterProps: { debounceMs: 500 }
                  }
                }}
                getRowId={(row) => row.id}
                sx={{ height: 600 }}
              />
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <PreEventVolunteerSchedule />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <VolunteerCheckInOut />
          </TabPanel>
        </CardContent>
      </Card>

      {/* Application Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <PersonIcon />
            <Typography variant="h6">
              {selectedApplication?.firstName} {selectedApplication?.lastName}
            </Typography>
            {selectedApplication && (
              <Chip
                icon={STATUS_ICONS[selectedApplication.status]}
                label={selectedApplication.status}
                color={STATUS_COLORS[selectedApplication.status]}
              />
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedApplication && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Personal Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Personal Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="First Name"
                      value={selectedApplication.firstName}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Last Name"
                      value={selectedApplication.lastName}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Email"
                      value={selectedApplication.email}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Volunteer Code"
                      value={selectedApplication.volunteerCode || 'N/A'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      label="Gender"
                      value={selectedApplication.gender || 'N/A'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      label="T-Shirt Size"
                      value={selectedApplication.tshirtSize || 'N/A'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Source"
                      value={selectedApplication.source || 'N/A'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Status"
                      value={selectedApplication.status || 'N/A'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Emergency Contact */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Emergency Contact</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Emergency Contact Name"
                      value={selectedApplication.emergencyContact || 'N/A'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Emergency Phone"
                      value={selectedApplication.emergencyPhone || 'N/A'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Additional Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Additional Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Event Info Accepted"
                      value={selectedApplication.eventInfoAccepted ? 'Yes' : 'No'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Terms Accepted"
                      value={selectedApplication.termsAccepted ? 'Yes' : 'No'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Address */}
              {selectedApplication.address && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Address</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Address"
                        value={selectedApplication.address}
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="City"
                        value={selectedApplication.city || 'N/A'}
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="State"
                        value={selectedApplication.state || 'N/A'}
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="ZIP Code"
                        value={selectedApplication.zipCode || 'N/A'}
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              )}

              {/* Emergency Contact */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Emergency Contact</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Emergency Contact Name"
                      value={selectedApplication.emergencyContact || 'N/A'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Emergency Contact Phone"
                      value={selectedApplication.emergencyPhone || 'N/A'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Availability */}
              {selectedApplication.availability && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Availability</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="Days Available"
                        value={selectedApplication.availability.days?.join(', ') || 'N/A'}
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Times Available"
                        value={selectedApplication.availability.times?.join(', ') || 'N/A'}
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Commitment Level"
                        value={selectedApplication.availability.commitment || 'N/A'}
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              )}

              {/* Interests & Skills */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Interests & Skills</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      label="Interests"
                      value={selectedApplication.interests?.join(', ') || 'N/A'}
                      fullWidth
                      multiline
                      rows={2}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label="Skills"
                      value={selectedApplication.skills?.join(', ') || 'N/A'}
                      fullWidth
                      multiline
                      rows={2}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Experience & Motivation */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Experience & Motivation</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Experience"
                      value={selectedApplication.experience || 'N/A'}
                      fullWidth
                      multiline
                      rows={3}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Motivation"
                      value={selectedApplication.motivation || 'N/A'}
                      fullWidth
                      multiline
                      rows={3}
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Notes */}
              {selectedApplication.notes && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Notes</Typography>
                  <TextField
                    value={selectedApplication.notes}
                    fullWidth
                    multiline
                    rows={3}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => {
              setDetailsOpen(false)
              openStatusDialog(selectedApplication!)
            }}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Update Volunteer Status</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={newStatus}
                label="Status"
                onChange={(e) => setNewStatus(e.target.value as VolunteerStatus)}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              rows={3}
              placeholder="Add any notes about this volunteer application..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusUpdate}>
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Volunteer Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Volunteer Application</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                value={newVolunteer.firstName}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, firstName: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                value={newVolunteer.lastName}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, lastName: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Age"
                type="number"
                value={newVolunteer.age}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, age: parseInt(e.target.value) || 18 })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={newVolunteer.gender}
                  label="Gender"
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, gender: e.target.value })}
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone Number"
                value={newVolunteer.phone}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, phone: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email Address"
                type="email"
                value={newVolunteer.email}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, email: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Confirm Email"
                type="email"
                value={newVolunteer.confirmEmail}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, confirmEmail: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="City"
                value={newVolunteer.city}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, city: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Emergency Contact Name"
                value={newVolunteer.emergencyContact}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, emergencyContact: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Emergency Contact Phone"
                value={newVolunteer.emergencyPhone}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, emergencyPhone: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>T-Shirt Size</InputLabel>
                <Select
                  value={newVolunteer.tshirtSize}
                  label="T-Shirt Size"
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, tshirtSize: e.target.value })}
                >
                  <MenuItem value="XS">XS</MenuItem>
                  <MenuItem value="S">S</MenuItem>
                  <MenuItem value="M">M</MenuItem>
                  <MenuItem value="L">L</MenuItem>
                  <MenuItem value="XL">XL</MenuItem>
                  <MenuItem value="XXL">XXL</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newVolunteer.status}
                  label="Status"
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, status: e.target.value as VolunteerStatus })}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateVolunteer}>
            Create Volunteer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Volunteer Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Volunteer Application</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="First Name"
                value={newVolunteer.firstName}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, firstName: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Last Name"
                value={newVolunteer.lastName}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, lastName: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Age"
                type="number"
                value={newVolunteer.age}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, age: parseInt(e.target.value) || 18 })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={newVolunteer.gender}
                  label="Gender"
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, gender: e.target.value })}
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone Number"
                value={newVolunteer.phone}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, phone: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Email Address"
                type="email"
                value={newVolunteer.email}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, email: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="City"
                value={newVolunteer.city}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, city: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Emergency Contact Name"
                value={newVolunteer.emergencyContact}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, emergencyContact: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Emergency Contact Phone"
                value={newVolunteer.emergencyPhone}
                onChange={(e) => setNewVolunteer({ ...newVolunteer, emergencyPhone: e.target.value })}
                fullWidth
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>T-Shirt Size</InputLabel>
                <Select
                  value={newVolunteer.tshirtSize}
                  label="T-Shirt Size"
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, tshirtSize: e.target.value })}
                >
                  <MenuItem value="XS">XS</MenuItem>
                  <MenuItem value="S">S</MenuItem>
                  <MenuItem value="M">M</MenuItem>
                  <MenuItem value="L">L</MenuItem>
                  <MenuItem value="XL">XL</MenuItem>
                  <MenuItem value="XXL">XXL</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newVolunteer.status}
                  label="Status"
                  onChange={(e) => setNewVolunteer({ ...newVolunteer, status: e.target.value as VolunteerStatus })}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleUpdateVolunteer}>
            Update Volunteer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default function VolunteersPage() {
  return (
    <FirebaseErrorBoundary>
      <VolunteersPageContent />
    </FirebaseErrorBoundary>
  )
}
