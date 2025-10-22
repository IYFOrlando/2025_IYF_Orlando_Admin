import * as React from 'react'
import {
  Box, Typography, Card, CardHeader, CardContent, Stack, Chip, Paper, Grid,
  Alert, Button, Avatar, Divider
} from '@mui/material'
import { DataGrid, GridToolbar, type GridColDef } from '@mui/x-data-grid'
import PersonIcon from '@mui/icons-material/Person'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import EventIcon from '@mui/icons-material/Event'
import AddIcon from '@mui/icons-material/Add'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ScheduleIcon from '@mui/icons-material/Schedule'
import PeopleIcon from '@mui/icons-material/People'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import { useVolunteerSchedule } from '../hooks/useVolunteerSchedule'
import { useVolunteerAttendance } from '../../events/hooks/useVolunteerAttendance'
import type { VolunteerSchedule } from '../types'

const STATUS_COLORS = {
  'scheduled': 'warning',
  'confirmed': 'info',
  'completed': 'success',
  'cancelled': 'error'
} as const

const STATUS_ICONS = {
  'scheduled': <AccessTimeIcon />,
  'confirmed': <CheckCircleIcon />,
  'completed': <CheckCircleIcon />,
  'cancelled': <CancelIcon />
}

const ATTENDANCE_ICONS = {
  'not-checked-in': <LoginIcon />,
  'checked-in': <LogoutIcon />,
  'completed': <DoneAllIcon />,
  'unknown': <CheckCircleIcon />
}

export default function PreEventVolunteerSchedule() {
  // Force cache refresh - timestamp: 1761137000000
  const { data: schedule, loading, getScheduleStats, getScheduleByDate, getPreEventSchedule } = useVolunteerSchedule()
  const { data: attendanceData } = useVolunteerAttendance()
  
  const stats = getScheduleStats()
  const scheduleByDate = getScheduleByDate()
  const preEventSlots = getPreEventSchedule()

  
  // Function to get check-in/check-out status for a volunteer on a specific date
  const getAttendanceStatus = React.useCallback((volunteerCode: string, slotDate: string) => {
    // Convert slot date to timestamp range for that specific date
    const slotDateObj = new Date(slotDate)
    slotDateObj.setHours(0, 0, 0, 0)
    const slotDateStart = Math.floor(slotDateObj.getTime() / 1000)
    const slotDateEnd = slotDateStart + 86400 // 24 hours
    
    
    // Find attendance for the specific slot date (not just today)
    const dayAttendance = attendanceData.find(att => {
      if (att.volunteerId !== volunteerCode) return false
      if (att.eventId !== 'taste-of-korea-preparation') return false
      if (!att.checkInTime) return false
      // Check if check-in was on the specific slot date
      return att.checkInTime.seconds >= slotDateStart && att.checkInTime.seconds < slotDateEnd
    })
    
    if (!dayAttendance) {
      return { status: 'not-checked-in', label: 'No Check-in', color: 'default' as const }
    }
    
    if (dayAttendance.checkInTime && !dayAttendance.checkOutTime) {
      return { status: 'checked-in', label: 'Checked In', color: 'warning' as const }
    }
    
    if (dayAttendance.checkInTime && dayAttendance.checkOutTime) {
      return { status: 'completed', label: 'Completed', color: 'success' as const }
    }
    
    return { status: 'unknown', label: 'Unknown', color: 'default' as const }
  }, [attendanceData])

  // Process data for modern calendar view
  const calendarData = React.useMemo(() => {
    const dayMap = new Map()
    
    preEventSlots.forEach(volunteer => {
      if (volunteer.selectedSlots && Array.isArray(volunteer.selectedSlots)) {
        volunteer.selectedSlots.forEach(slot => {
          if (typeof slot === 'object' && slot.date) {
            const dateKey = slot.date
            if (!dayMap.has(dateKey)) {
              dayMap.set(dateKey, {
                date: slot.date,
                volunteers: []
              })
            }
            
            const attendanceStatus = getAttendanceStatus(volunteer.volunteerCode, slot.date)
            
            dayMap.get(dateKey).volunteers.push({
              name: volunteer.volunteerName,
              code: volunteer.volunteerCode,
              email: volunteer.volunteerEmail,
              startTime: slot.startTime,
              endTime: slot.endTime,
              hours: slot.hours,
              status: volunteer.status,
              attendanceStatus: attendanceStatus
            })
          }
        })
      }
    })
    
    return Array.from(dayMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [preEventSlots, getAttendanceStatus])

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 PreEventVolunteerSchedule Debug:')
    console.log('- Loading:', loading)
    console.log('- Schedule data:', schedule)
    console.log('- PreEvent slots:', preEventSlots)
    console.log('- Stats:', stats)
    console.log('- Calendar data:', calendarData)
  }, [loading, schedule, preEventSlots, stats, calendarData])

  const preEventStats = React.useMemo(() => {
    const total = preEventSlots.length
    const confirmed = preEventSlots.filter(slot => slot.status === 'confirmed' || slot.status === 'completed').length
    const pending = preEventSlots.filter(slot => slot.status === 'scheduled').length
    const cancelled = preEventSlots.filter(slot => slot.status === 'cancelled').length

    return {
      total,
      confirmed,
      pending,
      cancelled
    }
  }, [preEventSlots])

  const preEventSlotsByDate = React.useMemo(() => {
    const grouped = preEventSlots.reduce((acc, slot) => {
      if (slot.date) {
        const date = new Date(slot.date).toLocaleDateString()
        if (!acc[date]) {
          acc[date] = []
        }
        acc[date].push(slot)
      }
      return acc
    }, {} as Record<string, typeof preEventSlots>)

    return grouped
  }, [preEventSlots])

  const scheduleColumns: GridColDef[] = [
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
      field: 'volunteerCode',
      headerName: 'Volunteer Code',
      width: 150,
      renderCell: (params) => (
        <Chip 
          label={params.value || 'N/A'} 
          size="small" 
          variant="outlined" 
          color="primary"
        />
      )
    },
    {
      field: 'volunteerEmail',
      headerName: 'Email',
      width: 250,
      renderCell: (params) => (
        <Typography variant="body2">{params.value || 'N/A'}</Typography>
      )
    },
    {
      field: 'selectedSlots',
      headerName: 'Scheduled Slots',
      width: 200,
      renderCell: (params) => {
        const slots = params.value || []
        const slotCount = Array.isArray(slots) ? slots.length : 0
        return (
          <Stack direction="row" alignItems="center" spacing={1}>
            <EventIcon fontSize="small" color="action" />
            <Typography variant="body2">{slotCount} slots</Typography>
          </Stack>
        )
      }
    },
    {
      field: 'totalHours',
      headerName: 'Total Hours',
      width: 120,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <AccessTimeIcon fontSize="small" color="action" />
          <Typography variant="body2">{params.value || 0}h</Typography>
        </Stack>
      )
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

  if (loading) {
    return <Alert severity="info">Loading volunteer schedule...</Alert>
  }

  return (
    <Box>
      {/* Pre-Event Preparation Period Info */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="🍽️ Taste of Korea - Pre-Event Preparation Period"
          subheader="October 27 - November 7, 2025 | Volunteer Schedule Overview"
        />
        <CardContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Preparation Period:</strong> October 27 - November 7, 2025<br/>
              <strong>Daily Schedule:</strong> Weekdays 9:00 AM - 5:00 PM | Weekends: Sat 10:00 AM - 4:00 PM, Sun 12:00 PM - 6:00 PM<br/>
              <strong>Total Volunteers Scheduled:</strong> {preEventStats.total}
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
            <Typography variant="h4" color="primary" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>{preEventStats.total}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Total Slots</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>{preEventStats.confirmed}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Confirmed</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>{preEventStats.pending}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Pending</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
            <Typography variant="h4" color="error.main" sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}>{preEventStats.cancelled}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Cancelled</Typography>
          </Paper>
        </Grid>
      </Grid>


      {/* Modern Calendar View */}
      <Card>
        <CardHeader
          title="📅 Volunteer Schedule Calendar"
          subheader="Modern view of volunteer schedules by day and time"
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                // TODO: Implement schedule creation dialog
                alert('Schedule creation feature coming soon!')
              }}
              size="small"
            >
              Add Schedule
            </Button>
          }
        />
        <CardContent>

          {calendarData.length === 0 ? (
            <Alert severity="warning">
              <Typography variant="h6" gutterBottom>
                No volunteer schedules found
              </Typography>
              <Typography variant="body2">
                The volunteer_schedule collection is empty. Add volunteer schedules to see them here.
              </Typography>
            </Alert>
          ) : (
            <Stack spacing={3}>
              {calendarData.map((dayData, index) => (
                <Card key={index} sx={{ 
                  border: 1, 
                  borderColor: 'primary.main',
                  borderRadius: 2,
                  overflow: 'hidden'
                }}>
                  <CardHeader
                    avatar={
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <CalendarTodayIcon />
                      </Avatar>
                    }
                    title={
                      <Typography variant="h6" color="primary">
                        {dayData.date}
                      </Typography>
                    }
                    subheader={
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Chip 
                          icon={<PeopleIcon />}
                          label={`${dayData.volunteers.length} volunteers`}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                        <Chip 
                          icon={<ScheduleIcon />}
                          label={`${dayData.volunteers.reduce((total, v) => total + (v.hours || 0), 0)} total hours`}
                          color="secondary"
                          variant="outlined"
                          size="small"
                        />
                      </Stack>
                    }
                    sx={{ 
                      bgcolor: 'primary.50',
                      borderBottom: 1,
                      borderColor: 'primary.200'
                    }}
                  />
                  <CardContent>
                    <Grid container spacing={2}>
                      {dayData.volunteers.map((volunteer, volIndex) => (
                        <Grid item xs={12} sm={6} md={4} key={volIndex}>
                          <Paper sx={{ 
                            p: 2, 
                            border: 1, 
                            borderColor: 'grey.300',
                            borderRadius: 2,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              boxShadow: 3,
                              borderColor: 'primary.main',
                              transform: 'translateY(-2px)'
                            }
                          }}>
                            <Stack spacing={2}>
                              {/* Volunteer Info */}
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ 
                                  bgcolor: 'secondary.main',
                                  width: 40,
                                  height: 40
                                }}>
                                  {volunteer.name.split(' ').map(n => n[0]).join('')}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {volunteer.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {volunteer.code}
                                  </Typography>
                                </Box>
                              </Stack>
                              
                              <Divider />
                              
                              {/* Time Info */}
                              <Stack spacing={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <AccessTimeIcon fontSize="small" color="action" />
                                  <Typography variant="body2" fontWeight="medium">
                                    {volunteer.startTime} - {volunteer.endTime}
                                  </Typography>
                                </Stack>
                                
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <ScheduleIcon fontSize="small" color="primary" />
                                  <Typography variant="body2" color="primary" fontWeight="bold">
                                    {volunteer.hours} hours
                                  </Typography>
                                </Stack>
                              </Stack>
                              
                              {/* Attendance Status */}
                              <Chip
                                icon={ATTENDANCE_ICONS[volunteer.attendanceStatus?.status as keyof typeof ATTENDANCE_ICONS] || <CheckCircleIcon />}
                                label={volunteer.attendanceStatus?.label || 'Unknown'}
                                color={volunteer.attendanceStatus?.color || 'default'}
                                size="small"
                                sx={{ alignSelf: 'flex-start' }}
                              />
                            </Stack>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

    </Box>
  )
}