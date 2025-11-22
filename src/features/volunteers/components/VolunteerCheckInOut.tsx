import * as React from 'react'
import {
  Card, CardHeader, CardContent, Stack, Box, Typography, Chip,
  Grid, Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField
} from '@mui/material'
import { DataGrid, GridToolbar, type GridColDef } from '@mui/x-data-grid'
import PersonIcon from '@mui/icons-material/Person'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import QrCodeIcon from '@mui/icons-material/QrCode'
import RefreshIcon from '@mui/icons-material/Refresh'
import LogoutIcon from '@mui/icons-material/Logout'
import EditIcon from '@mui/icons-material/Edit'
import { useVolunteerAttendance } from '../../events/hooks/useVolunteerAttendance'
import { useVolunteerApplications } from '../hooks/useVolunteerApplications'
import { notifySuccess, notifyError } from '../../../lib/alerts'
import type { VolunteerHours } from '../../events/types'

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

export default function VolunteerCheckInOut() {
  const { data: attendance, loading, getAttendanceStats, checkOut, updateHours } = useVolunteerAttendance()
  const { data: volunteers } = useVolunteerApplications()
  
  const [currentTime, setCurrentTime] = React.useState(new Date())
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [selectedHours, setSelectedHours] = React.useState<VolunteerHours | null>(null)
  const [manualCheckOutTime, setManualCheckOutTime] = React.useState('')
  
  const handleCheckOut = React.useCallback(async (hoursId: string) => {
    try {
      await checkOut(hoursId)
      notifySuccess('Volunteer checked out successfully')
    } catch (err: any) {
      notifyError(err.message || 'Failed to check out volunteer')
    }
  }, [checkOut])

  const handleEditClick = React.useCallback((hours: VolunteerHours) => {
    setSelectedHours(hours)
    // If there's already a check-out time, use it; otherwise set default to end of check-in day
    if (hours.checkOutTime) {
      const checkOutDate = new Date(hours.checkOutTime.seconds * 1000)
      setManualCheckOutTime(checkOutDate.toISOString().slice(0, 16))
    } else if (hours.checkInTime) {
      const checkInDate = new Date(hours.checkInTime.seconds * 1000)
      // Set to end of that day (23:59)
      checkInDate.setHours(23, 59, 0, 0)
      setManualCheckOutTime(checkInDate.toISOString().slice(0, 16))
    } else {
      setManualCheckOutTime('')
    }
    setEditDialogOpen(true)
  }, [])

  const handleSaveManualCheckOut = React.useCallback(async () => {
    if (!selectedHours || !manualCheckOutTime) return

    try {
      const checkOutDate = new Date(manualCheckOutTime)
      const checkOutSeconds = Math.floor(checkOutDate.getTime() / 1000)

      // Calculate total hours
      let totalHours = 0
      if (selectedHours.checkInTime) {
        const checkInTime = selectedHours.checkInTime.seconds * 1000
        const checkOutTime = checkOutDate.getTime()
        totalHours = Math.round((checkOutTime - checkInTime) / (1000 * 60 * 60) * 100) / 100
      }

      await updateHours(selectedHours.id, {
        checkOutTime: {
          seconds: checkOutSeconds,
          nanoseconds: 0
        },
        totalHours,
        status: 'checked-out'
      })

      notifySuccess('Check-out time updated successfully')
      setEditDialogOpen(false)
      setSelectedHours(null)
      setManualCheckOutTime('')
    } catch (err: any) {
      notifyError(err.message || 'Failed to update check-out time')
    }
  }, [selectedHours, manualCheckOutTime, updateHours])

  // Filter volunteers for check-in (include all statuses for testing)
  const approvedVolunteers = React.useMemo(() => {
    return volunteers.filter(v => v.status === 'approved' || v.status === 'active' || v.status === 'pending')
  }, [volunteers])

  const stats = getAttendanceStats()

  // Update current time every second for real-time elapsed time display
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Function to calculate elapsed time
  const getElapsedTime = (checkInTime: { seconds: number }) => {
    const checkInDate = new Date(checkInTime.seconds * 1000)
    const elapsed = currentTime.getTime() - checkInDate.getTime()
    const hours = Math.floor(elapsed / (1000 * 60 * 60))
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const attendanceColumns: GridColDef[] = [
    {
      field: 'volunteerName',
      headerName: 'Volunteer',
      width: 200,
      renderCell: (params) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <PersonIcon fontSize="small" color="action" />
          <Typography variant="body2">{params.value}</Typography>
        </Stack>
      )
    },
    {
      field: 'volunteerId',
      headerName: 'Code',
      width: 120,
      renderCell: (params) => (
        <Chip 
          label={params.value} 
          size="small" 
          color="primary" 
          variant="outlined"
        />
      )
    },
    {
      field: 'eventName',
      headerName: 'Event',
      width: 200,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'checkInTime',
      headerName: 'Check-in Date & Time',
      width: 200,
      renderCell: (params) => {
        if (!params.value) return '-'
        const date = new Date(params.value.seconds * 1000)
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <AccessTimeIcon fontSize="small" color="action" />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {date.toLocaleDateString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {date.toLocaleTimeString()}
              </Typography>
            </Box>
          </Stack>
        )
      }
    },
    {
      field: 'checkOutTime',
      headerName: 'Check-out Date & Time',
      width: 200,
      renderCell: (params) => {
        if (!params.value) return '-'
        const date = new Date(params.value.seconds * 1000)
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckCircleIcon fontSize="small" color="action" />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {date.toLocaleDateString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {date.toLocaleTimeString()}
              </Typography>
            </Box>
          </Stack>
        )
      }
    },
    {
      field: 'totalHours',
      headerName: 'Total Hours Worked',
      width: 150,
      renderCell: (params) => {
        if (!params.value) return '-'
        const hours = Math.floor(params.value)
        const minutes = Math.round((params.value - hours) * 60)
        const formattedHours = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
        
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <AccessTimeIcon fontSize="small" color="success" />
            <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'success.main' }}>
              {formattedHours}
            </Typography>
          </Stack>
        )
      }
    },
    {
      field: 'elapsedTime',
      headerName: 'Currently Working',
      width: 150,
      renderCell: (params) => {
        if (!params.row.checkInTime || params.row.checkOutTime) return '-'
        return (
          <Chip 
            label={getElapsedTime(params.row.checkInTime)} 
            size="small" 
            color="warning" 
            variant="outlined"
            icon={<AccessTimeIcon />}
          />
        )
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          icon={STATUS_ICONS[params.value as keyof typeof STATUS_ICONS]}
          label={params.value}
          color={STATUS_COLORS[params.value as keyof typeof STATUS_COLORS]}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 250,
      sortable: false,
      renderCell: (params) => {
        const hasCheckIn = params.row.status === 'checked-in' && !params.row.checkOutTime
        const hasCheckOut = params.row.checkOutTime && params.row.checkInTime
        
        // Check if hours are unrealistic (more than 24 hours)
        let hasUnrealisticHours = false
        if (hasCheckOut) {
          const checkInTime = params.row.checkInTime.seconds * 1000
          const checkOutTime = params.row.checkOutTime.seconds * 1000
          const totalHours = (checkOutTime - checkInTime) / (1000 * 60 * 60)
          hasUnrealisticHours = totalHours > 24
        } else if (params.row.checkInTime) {
          const checkInDate = new Date(params.row.checkInTime.seconds * 1000)
          const hoursElapsed = (currentTime.getTime() - checkInDate.getTime()) / (1000 * 60 * 60)
          hasUnrealisticHours = hoursElapsed > 24
        }

        const needsManualCheckOut = hasUnrealisticHours && !params.row.checkOutTime

        return (
          <Stack direction="row" spacing={1}>
            {hasCheckIn && (
              <>
                {needsManualCheckOut ? (
                  <Button
                    size="small"
                    variant="contained"
                    color="error"
                    startIcon={<EditIcon />}
                    onClick={() => handleEditClick(params.row)}
                  >
                    Set Check-out Time
                  </Button>
                ) : (
                  <Button
                    size="small"
                    variant="contained"
                    color="warning"
                    startIcon={<LogoutIcon />}
                    onClick={() => handleCheckOut(params.row.id)}
                  >
                    Check Out
                  </Button>
                )}
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  startIcon={<EditIcon />}
                  onClick={() => handleEditClick(params.row)}
                >
                  Edit
                </Button>
              </>
            )}
            {hasUnrealisticHours && hasCheckOut && (
              <Button
                size="small"
                variant="contained"
                color="error"
                startIcon={<EditIcon />}
                onClick={() => handleEditClick(params.row)}
              >
                Fix Hours
              </Button>
            )}
          </Stack>
        )
      }
    }
  ]

  return (
    <Box>
      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <PersonIcon color="primary" />
                <Box>
                  <Typography variant="h6">{stats.total}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Today
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <AccessTimeIcon color="warning" />
                <Box>
                  <Typography variant="h6">{stats.checkedIn}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Checked In
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <CheckCircleIcon color="success" />
                <Box>
                  <Typography variant="h6">{stats.checkedOut}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <AccessTimeIcon color="primary" />
                <Box>
                  <Typography variant="h6" color="primary.main">
                    {(() => {
                      const hours = Math.floor(stats.totalHours)
                      const minutes = Math.round((stats.totalHours - hours) * 60)
                      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
                    })()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Hours Worked
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <QrCodeIcon color="info" />
                <Box>
                  <Typography variant="h6">{approvedVolunteers.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Approved Volunteers
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Check-in Actions */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Check-in/Check-out Actions" />
        <CardContent>
          <Stack spacing={2}>
            <Alert severity="info">
              <Typography variant="h6" gutterBottom>
                📱 Instructions:
              </Typography>
              <Typography variant="body2" gutterBottom>
                • Use the <strong>Standalone Check-in Page</strong> for the best experience
              </Typography>
              <Typography variant="body2" gutterBottom>
                • Volunteers can scan QR codes or enter their volunteer code manually
              </Typography>
              <Typography variant="body2">
                • The system automatically detects check-in vs check-out
              </Typography>
            </Alert>
            
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<QrCodeIcon />}
                onClick={() => window.open('/checkin', '_blank')}
                fullWidth
              >
                Open Standalone Check-in Page
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>


      {/* Warning for volunteers who forgot to check out */}
      {(() => {
        const longTimeCheckedIn = attendance.filter(att => {
          if (!att.checkInTime || att.checkOutTime || att.status !== 'checked-in') return false
          const checkInTime = new Date(att.checkInTime.seconds * 1000)
          const hoursElapsed = (currentTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60)
          return hoursElapsed > 12 // More than 12 hours
        })
        
        if (longTimeCheckedIn.length > 0) {
          return (
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                ⚠️ Volunteers Need Check-out
              </Typography>
              <Typography variant="body2" gutterBottom>
                There are <strong>{longTimeCheckedIn.length}</strong> volunteer(s) who have been checked-in for more than 12 hours and likely forgot to check out.
              </Typography>
              <Typography variant="body2">
                Use the <strong>"Check Out"</strong> button in the table to manually check them out.
              </Typography>
            </Alert>
          )
        }
        return null
      })()}

      {/* Today's Attendance */}
      <Card>
        <CardHeader 
          title="Today's Attendance" 
          action={
            <Button
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
              size="small"
            >
              Refresh
            </Button>
          }
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
            sx={{ height: 400 }}
          />
        </CardContent>
      </Card>

      {/* Manual Check-out Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <EditIcon />
            <Typography variant="h6">
              {selectedHours?.checkOutTime ? 'Edit Check-out Time' : 'Set Check-out Time'} {selectedHours && `- ${selectedHours.volunteerName}`}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            {selectedHours && selectedHours.checkInTime && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Check-in Time
                </Typography>
                <Typography variant="body1">
                  {new Date(selectedHours.checkInTime.seconds * 1000).toLocaleString()}
                </Typography>
              </Box>
            )}
            
            {selectedHours?.checkOutTime && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Current Check-out Time
                </Typography>
                <Typography variant="body1" color="warning.main">
                  {new Date(selectedHours.checkOutTime.seconds * 1000).toLocaleString()}
                  {selectedHours.totalHours && (
                    <span> ({Math.floor(selectedHours.totalHours)}h {Math.round((selectedHours.totalHours - Math.floor(selectedHours.totalHours)) * 60)}m)</span>
                  )}
                </Typography>
              </Box>
            )}
            
            <TextField
              fullWidth
              label="Check-out Time"
              type="datetime-local"
              value={manualCheckOutTime}
              onChange={(e) => setManualCheckOutTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Set the check-out time (can be in the past)"
            />

            {selectedHours && selectedHours.checkInTime && manualCheckOutTime && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Calculated Hours
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {(() => {
                    const checkInTime = selectedHours.checkInTime!.seconds * 1000
                    const checkOutTime = new Date(manualCheckOutTime).getTime()
                    const totalHours = Math.round((checkOutTime - checkInTime) / (1000 * 60 * 60) * 100) / 100
                    const hours = Math.floor(totalHours)
                    const minutes = Math.round((totalHours - hours) * 60)
                    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
                  })()}
                </Typography>
              </Box>
            )}

            <Alert severity="info">
              <Typography variant="body2">
                This will set the check-out time and calculate total hours. The volunteer will be marked as checked-out.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveManualCheckOut}
            variant="contained"
            disabled={!manualCheckOutTime}
            startIcon={<CheckCircleIcon />}
          >
            Save Check-out Time
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
