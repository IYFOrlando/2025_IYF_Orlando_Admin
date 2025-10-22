import * as React from 'react'
import {
  Card, CardHeader, CardContent, Stack, Box, Typography, Chip,
  Grid, Button, TextField, Alert, Divider, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material'
import { DataGrid, GridToolbar, type GridColDef } from '@mui/x-data-grid'
import PersonIcon from '@mui/icons-material/Person'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import QrCodeIcon from '@mui/icons-material/QrCode'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useVolunteerAttendance } from '../hooks/useVolunteerAttendance'
import { useVolunteerApplications } from '../../volunteers/hooks/useVolunteerApplications'
import type { Event, HoursStatus } from '../types'
import { notifySuccess, notifyError } from '../../../lib/alerts'
import Swal from 'sweetalert2'

const STATUS_COLORS = {
  'checked-in': 'warning',
  'checked-out': 'info',
  'completed': 'success'
} as const

const STATUS_ICONS = {
  'checked-in': <AccessTimeIcon />,
  'checked-out': <CheckCircleIcon />,
  'completed': <CheckCircleIcon />
}

interface Props {
  event: Event
}

export default function VolunteerAttendanceTracker({ event }: Props) {
  const { data: attendance, loading, checkIn, checkOut, getAttendanceStats } = useVolunteerAttendance(event.id)
  const { data: volunteers } = useVolunteerApplications()
  
  const [checkInDialogOpen, setCheckInDialogOpen] = React.useState(false)
  const [volunteerCode, setVolunteerCode] = React.useState('')
  const [volunteerName, setVolunteerName] = React.useState('')
  const [volunteerEmail, setVolunteerEmail] = React.useState('')
  const [qrDialogOpen, setQrDialogOpen] = React.useState(false)

  // Filter approved volunteers for this event
  const approvedVolunteers = React.useMemo(() => {
    return volunteers.filter(v => v.status === 'approved' || v.status === 'active')
  }, [volunteers])

  const stats = getAttendanceStats()

  const handleCheckIn = async () => {
    try {
      if (!volunteerCode || !volunteerName || !volunteerEmail) {
        notifyError('Please fill in all fields')
        return
      }

      await checkIn(volunteerCode, volunteerName, volunteerEmail, event.id, event.name)
      notifySuccess(`${volunteerName} checked in successfully`)
      
      // Ask if they want to add more slots
      const result = await Swal.fire({
        title: 'Check-in Successful!',
        text: `${volunteerName} has been checked in. Do you want to add more volunteers?`,
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: 'Add More',
        cancelButtonText: 'Finish',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#6c757d'
      })

      if (result.isConfirmed) {
        // Keep dialog open and clear fields for next volunteer
        setVolunteerCode('')
        setVolunteerName('')
        setVolunteerEmail('')
      } else {
        // Close dialog and reset
        setCheckInDialogOpen(false)
        setVolunteerCode('')
        setVolunteerName('')
        setVolunteerEmail('')
      }
    } catch (err: any) {
      notifyError(err.message || 'Failed to check in volunteer')
    }
  }

  const handleCheckOut = async (hoursId: string) => {
    try {
      await checkOut(hoursId)
      notifySuccess('Volunteer checked out successfully')
    } catch (err: any) {
      notifyError(err.message || 'Failed to check out volunteer')
    }
  }

  const handleQRCheckIn = async (volunteerCode: string) => {
    const volunteer = approvedVolunteers.find(v => 
      v.firstName.toLowerCase().includes(volunteerCode.toLowerCase()) ||
      v.lastName.toLowerCase().includes(volunteerCode.toLowerCase()) ||
      v.email.toLowerCase().includes(volunteerCode.toLowerCase())
    )

    if (volunteer) {
      try {
        await checkIn(volunteerCode, `${volunteer.firstName} ${volunteer.lastName}`, volunteer.email, event.id, event.name)
        notifySuccess(`${volunteer.firstName} ${volunteer.lastName} checked in successfully`)
        
        // Ask if they want to add more slots
        const result = await Swal.fire({
          title: 'Check-in Successful!',
          text: `${volunteer.firstName} ${volunteer.lastName} has been checked in. Do you want to add more volunteers?`,
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Add More',
          cancelButtonText: 'Finish',
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#6c757d'
        })

        if (result.isConfirmed) {
          // Keep dialog open and clear fields for next volunteer
          setVolunteerCode('')
        } else {
          // Close dialog and reset
          setQrDialogOpen(false)
          setVolunteerCode('')
        }
      } catch (err: any) {
        notifyError(err.message || 'Failed to check in volunteer')
      }
    } else {
      notifyError('Volunteer not found')
    }
  }

  const attendanceColumns: GridColDef[] = [
    {
      field: 'volunteerName',
      headerName: 'Volunteer',
      width: 200,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <PersonIcon fontSize="small" color="action" />
          <Typography variant="body2">{params.value}</Typography>
        </Stack>
      )
    },
    {
      field: 'volunteerEmail',
      headerName: 'Email',
      width: 250
    },
    {
      field: 'checkInTime',
      headerName: 'Check-In',
      width: 150,
      renderCell: (params) => {
        if (!params.value) return 'Not checked in'
        const date = new Date(params.value.seconds * 1000)
        return (
          <Stack>
            <Typography variant="body2">{date.toLocaleDateString()}</Typography>
            <Typography variant="caption" color="text.secondary">
              {date.toLocaleTimeString()}
            </Typography>
          </Stack>
        )
      }
    },
    {
      field: 'checkOutTime',
      headerName: 'Check-Out',
      width: 150,
      renderCell: (params) => {
        if (!params.value) return 'Not checked out'
        const date = new Date(params.value.seconds * 1000)
        return (
          <Stack>
            <Typography variant="body2">{date.toLocaleDateString()}</Typography>
            <Typography variant="caption" color="text.secondary">
              {date.toLocaleTimeString()}
            </Typography>
          </Stack>
        )
      }
    },
    {
      field: 'totalHours',
      headerName: 'Hours Worked',
      width: 120,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <AccessTimeIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {params.value ? `${params.value}h` : 'N/A'}
          </Typography>
        </Stack>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          icon={STATUS_ICONS[params.value as HoursStatus]}
          label={params.value}
          color={STATUS_COLORS[params.value as HoursStatus]}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="medium"
          variant="contained"
          color="warning"
          disabled={params.row.status !== 'checked-in'}
          onClick={() => handleCheckOut(params.row.id)}
        >
          Check Out
        </Button>
      )
    }
  ]

  return (
    <Box>
      {/* Event Info */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h6">{event.name}</Typography>
              <Chip label={event.status} color="primary" size="small" />
            </Stack>
          }
          subheader={
            <Stack spacing={1}>
              <Typography variant="body2">
                📅 {new Date(event.date).toLocaleDateString()} | 
                🕐 {event.startTime} - {event.endTime}
              </Typography>
              <Typography variant="body2">📍 {event.location}</Typography>
              {event.name.toLowerCase().includes('preparation') && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    <strong>Pre-Event Preparation Period:</strong> October 27 - November 7, 2025
                  </Typography>
                  <Typography variant="body2">
                    Volunteers can check in/out daily during this preparation period
                  </Typography>
                </Alert>
              )}
            </Stack>
          }
        />
      </Card>

      {/* Statistics */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
            <Typography variant="h4" color="primary" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>{stats.total}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Total Volunteers</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>{stats.checkedIn}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Currently Working</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>{stats.checkedOut}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Completed</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>{stats.totalHours}h</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Total Hours</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Volunteer Schedule Info */}
      {event.name.toLowerCase().includes('preparation') && (
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title="Volunteer Availability Schedule"
            subheader="Pre-Event Preparation Period: October 27 - November 7, 2025"
          />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Weekdays (Mon-Fri)</Typography>
                <Typography variant="body2" color="text.secondary">
                  🕘 9:00 AM - 5:00 PM
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>Weekends</Typography>
                <Typography variant="body2" color="text.secondary">
                  🕙 Saturday: 10:00 AM - 4:00 PM<br/>
                  🕛 Sunday: 12:00 PM - 6:00 PM
                </Typography>
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Preparation Tasks:</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {[
                "Event Setup", "Food Preparation", "Volunteer Coordination", 
                "Equipment Setup", "Marketing Materials", "Guest Registration", "Safety Preparation"
              ].map((task) => (
                <Chip key={task} label={task} size="small" variant="outlined" />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={2} 
            alignItems="center"
            sx={{ width: '100%' }}
          >
            <Button
              variant="contained"
              startIcon={<PersonIcon />}
              onClick={() => setCheckInDialogOpen(true)}
              color="primary"
              size="large"
              fullWidth
            >
              Manual Check-In
            </Button>
            <Button
              variant="contained"
              startIcon={<QrCodeIcon />}
              onClick={() => setQrDialogOpen(true)}
              color="secondary"
              size="large"
              fullWidth
            >
              QR Code Check-In
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
              size="large"
              fullWidth
            >
              Refresh
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader
          title="Volunteer Attendance"
          subheader={`Real-time tracking for ${event.name}`}
        />
        <CardContent>
          <DataGrid
            rows={attendance}
            columns={attendanceColumns}
            loading={loading}
            slots={{ toolbar: GridToolbar }}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 }
              }
            }}
            getRowId={(row) => row.id}
            sx={{ 
              height: { xs: 400, sm: 500 },
              '& .MuiDataGrid-cell': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              },
              '& .MuiDataGrid-columnHeader': {
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Manual Check-In Dialog */}
      <Dialog open={checkInDialogOpen} onClose={() => setCheckInDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manual Check-In</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Volunteer Code"
              value={volunteerCode}
              onChange={(e) => setVolunteerCode(e.target.value)}
              fullWidth
              placeholder="Enter volunteer code or name"
            />
            <TextField
              label="Volunteer Name"
              value={volunteerName}
              onChange={(e) => setVolunteerName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={volunteerEmail}
              onChange={(e) => setVolunteerEmail(e.target.value)}
              fullWidth
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCheckInDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCheckIn}
            color="primary"
            size="large"
            disabled={!volunteerName || !volunteerEmail}
          >
            Check In Volunteer
          </Button>
        </DialogActions>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onClose={() => setQrDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>QR Code Check-In</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              Scan QR code or enter volunteer code manually
            </Alert>
            <TextField
              label="Volunteer Code"
              value={volunteerCode}
              onChange={(e) => setVolunteerCode(e.target.value)}
              fullWidth
              placeholder="Enter volunteer code from QR scan"
              helperText={volunteerCode ? "✅ Ready to check in" : "⚠️ Enter volunteer code to continue"}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQrDialogOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={() => handleQRCheckIn(volunteerCode)}
            disabled={!volunteerCode}
            color="primary"
            size="large"
          >
            Check In Volunteer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
