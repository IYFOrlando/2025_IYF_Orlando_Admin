import * as React from 'react'
import {
  Card, CardHeader, CardContent, Stack, Box, Typography, Chip,
  Grid, Button, Alert, Paper
} from '@mui/material'
import { DataGrid, GridToolbar, type GridColDef } from '@mui/x-data-grid'
import PersonIcon from '@mui/icons-material/Person'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import QrCodeIcon from '@mui/icons-material/QrCode'
import RefreshIcon from '@mui/icons-material/Refresh'
import { useVolunteerAttendance } from '../../events/hooks/useVolunteerAttendance'
import { useVolunteerApplications } from '../hooks/useVolunteerApplications'

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
  const { data: attendance, loading, getAttendanceStats } = useVolunteerAttendance()
  const { data: volunteers } = useVolunteerApplications()
  
  const [currentTime, setCurrentTime] = React.useState(new Date())

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
      field: 'checkInTime',
      headerName: 'Check-in Time',
      width: 180,
      renderCell: (params) => {
        if (!params.value) return '-'
        const date = new Date(params.value.seconds * 1000)
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <AccessTimeIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {date.toLocaleTimeString()}
            </Typography>
          </Stack>
        )
      }
    },
    {
      field: 'checkOutTime',
      headerName: 'Check-out Time',
      width: 180,
      renderCell: (params) => {
        if (!params.value) return '-'
        const date = new Date(params.value.seconds * 1000)
        return (
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckCircleIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {date.toLocaleTimeString()}
            </Typography>
          </Stack>
        )
      }
    },
    {
      field: 'elapsedTime',
      headerName: 'Elapsed Time',
      width: 120,
      renderCell: (params) => {
        if (!params.row.checkInTime || params.row.checkOutTime) return '-'
        return (
          <Chip 
            label={getElapsedTime(params.row.checkInTime)} 
            size="small" 
            color="warning" 
            variant="outlined"
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
                <QrCodeIcon color="info" />
                <Box>
                  <Typography variant="h6">{approvedVolunteers.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Available Volunteers
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

      {/* Available Volunteers */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Available Volunteers" />
        <CardContent>
          <Grid container spacing={2}>
            {approvedVolunteers.slice(0, 12).map((volunteer) => (
              <Grid item xs={12} sm={6} md={4} key={volunteer.id}>
                <Paper sx={{ p: 2, border: 1, borderColor: 'grey.300' }}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {volunteer.firstName} {volunteer.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ID: {volunteer.volunteerCode}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {volunteer.email}
                    </Typography>
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

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
    </Box>
  )
}
