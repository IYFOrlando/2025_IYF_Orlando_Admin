import * as React from 'react'
import {
  Card, CardHeader, CardContent, Stack, Box, Alert, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Typography, Chip,
  Grid, MenuItem, FormControl, InputLabel, Select, Divider
} from '@mui/material'
import { DataGrid, GridToolbar, type GridColDef } from '@mui/x-data-grid'
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism'
import PersonIcon from '@mui/icons-material/Person'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PendingIcon from '@mui/icons-material/Pending'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import PauseCircleIcon from '@mui/icons-material/PauseCircle'
import EditIcon from '@mui/icons-material/Edit'
import VisibilityIcon from '@mui/icons-material/Visibility'

import { useVolunteerApplications } from '../hooks/useVolunteerApplications'
import type { VolunteerApplication, VolunteerStatus } from '../types'
import { notifySuccess, notifyError } from '../../../lib/alerts'
import Swal from 'sweetalert2'

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

export default function VolunteersPage() {
  const { data: applications, loading, error, updateStatus } = useVolunteerApplications()
  const [selectedApplication, setSelectedApplication] = React.useState<VolunteerApplication | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false)
  const [newStatus, setNewStatus] = React.useState<VolunteerStatus>('pending')
  const [notes, setNotes] = React.useState('')
  const [filterStatus, setFilterStatus] = React.useState<VolunteerStatus | 'all'>('all')

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
      field: 'phone',
      headerName: 'Phone',
      width: 150,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <PhoneIcon fontSize="small" color="action" />
          <Typography variant="body2">{params.value || 'N/A'}</Typography>
        </Stack>
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
      width: 120,
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
              openStatusDialog(params.row)
            }}
          >
            Edit
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
          }
        />
        <CardContent>
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
                      label="Phone"
                      value={selectedApplication.phone || 'N/A'}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Date of Birth"
                      value={selectedApplication.dateOfBirth || 'N/A'}
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
              {selectedApplication.emergencyContact && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>Emergency Contact</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <TextField
                        label="Name"
                        value={selectedApplication.emergencyContact.name}
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="Phone"
                        value={selectedApplication.emergencyContact.phone}
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="Relationship"
                        value={selectedApplication.emergencyContact.relationship}
                        fullWidth
                        InputProps={{ readOnly: true }}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              )}

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
    </Box>
  )
}
