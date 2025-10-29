import * as React from 'react'
import {
  Box, Typography, Card, CardHeader, CardContent, Stack, Chip, Paper, Grid,
  Alert, Button, Avatar, Divider, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, DialogContentText
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import AddIcon from '@mui/icons-material/Add'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ScheduleIcon from '@mui/icons-material/Schedule'
import PeopleIcon from '@mui/icons-material/People'
import LoginIcon from '@mui/icons-material/Login'
import LogoutIcon from '@mui/icons-material/Logout'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import { useVolunteerSchedule } from '../hooks/useVolunteerSchedule'
import { useVolunteerAttendance } from '../../events/hooks/useVolunteerAttendance'
import { useVolunteerApplications } from '../hooks/useVolunteerApplications'
import EditScheduleDialog from './EditScheduleDialog'


const ATTENDANCE_ICONS = {
  'not-checked-in': <LoginIcon />,
  'checked-in': <LogoutIcon />,
  'completed': <DoneAllIcon />,
  'unknown': <CheckCircleIcon />
}

export default function PreEventVolunteerSchedule() {
  // Force cache refresh - timestamp: 1761137000000
  const { data: schedule, loading, getScheduleStats, getPreEventSchedule, deleteSchedule, updateSchedule } = useVolunteerSchedule()
  const { data: attendanceData } = useVolunteerAttendance()
  const { data: volunteers } = useVolunteerApplications()
  
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [scheduleToDelete, setScheduleToDelete] = React.useState<{ id: string; name: string } | null>(null)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [scheduleToEdit, setScheduleToEdit] = React.useState<any>(null)
  const [cleanupInProgress, setCleanupInProgress] = React.useState(false)
  
  const stats = getScheduleStats()
  const preEventSlots = getPreEventSchedule()

  // Function to check if a volunteer is active
  const isVolunteerActive = React.useCallback((volunteerCode: string) => {
    const volunteer = volunteers.find(v => v.volunteerCode === volunteerCode)
    if (!volunteer) {
      console.log('⚠️ Volunteer not found in applications:', volunteerCode)
      return false
    }
    
    const isActive = volunteer.status === 'active' || volunteer.status === 'approved' || volunteer.status === 'pending'
    console.log(`👤 Volunteer ${volunteerCode} (${volunteer.firstName} ${volunteer.lastName}) status: ${volunteer.status}, active: ${isActive}`)
    return isActive
  }, [volunteers])

  // Handle schedule deletion
  const handleDeleteClick = (scheduleId: string, volunteerName: string) => {
    setScheduleToDelete({ id: scheduleId, name: volunteerName })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!scheduleToDelete) return
    
    try {
      await deleteSchedule(scheduleToDelete.id)
      setDeleteDialogOpen(false)
      setScheduleToDelete(null)
      // You can add a success notification here if you have a notification system
      console.log('Schedule deleted successfully')
    } catch (error) {
      console.error('Error deleting schedule:', error)
      // You can add an error notification here
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setScheduleToDelete(null)
  }

  // Handle save schedule
  const handleSaveSchedule = async (scheduleId: string, updates: any) => {
    try {
      await updateSchedule(scheduleId, updates)
      setEditDialogOpen(false)
      setScheduleToEdit(null)
    } catch (error) {
      console.error('Error updating schedule:', error)
    }
  }

  // Handle edit schedule
  const handleEditSchedule = (scheduleId: string, _volunteerName: string) => {
    const scheduleData = schedule.find(s => s.id === scheduleId)
    if (scheduleData) {
      setScheduleToEdit(scheduleData)
      setEditDialogOpen(true)
    }
  }

  // Function to clean up schedules for inactive volunteers or volunteers with no valid slots
  const cleanupInactiveSchedules = React.useCallback(async () => {
    const schedulesToCleanup = preEventSlots.filter(schedule => {
      // Check if volunteer is inactive
      if (!isVolunteerActive(schedule.volunteerCode)) {
        return true
      }
      
      // Check if volunteer has no valid slots
      const hasValidSlots = (schedule.selectedSlots && Array.isArray(schedule.selectedSlots) && schedule.selectedSlots.length > 0)
      
      if (!hasValidSlots) {
        console.log(`🧹 Schedule for ${schedule.volunteerName} has no valid slots, marking for cleanup`)
        return true
      }
      
      return false
    })
    
    if (schedulesToCleanup.length > 0) {
      setCleanupInProgress(true)
      console.log(`🧹 Found ${schedulesToCleanup.length} schedules to clean up...`)
      
      for (const schedule of schedulesToCleanup) {
        try {
          await deleteSchedule(schedule.id)
          console.log(`✅ Deleted schedule: ${schedule.volunteerName} (${schedule.volunteerCode})`)
        } catch (error) {
          console.error(`❌ Error deleting schedule for ${schedule.volunteerName}:`, error)
        }
      }
      
      setCleanupInProgress(false)
    }
  }, [preEventSlots, isVolunteerActive, deleteSchedule])

  // Auto-cleanup when volunteers become inactive
  React.useEffect(() => {
    if (volunteers.length > 0 && preEventSlots.length > 0) {
      cleanupInactiveSchedules()
    }
  }, [volunteers, preEventSlots, cleanupInactiveSchedules])

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
    console.log('🔄 Processing calendar data from preEventSlots:', preEventSlots.length, 'slots')
    const dayMap = new Map()
    
    preEventSlots.forEach((volunteer, index) => {
      console.log(`📅 Processing volunteer ${index + 1}:`, volunteer.volunteerName, 'ID:', volunteer.id)
      
      // Check if volunteer is active first
      if (!isVolunteerActive(volunteer.volunteerCode)) {
        console.log(`❌ Skipping inactive volunteer: ${volunteer.volunteerName} (${volunteer.volunteerCode})`)
        return
      }
      
      // Check selectedSlots array
      const slotsToProcess = volunteer.selectedSlots && Array.isArray(volunteer.selectedSlots) && volunteer.selectedSlots.length > 0 
        ? volunteer.selectedSlots
        : []
      
      console.log(`📊 Processing ${slotsToProcess.length} slots for ${volunteer.volunteerName}`)
      
      // Skip volunteers with no valid slots
      if (slotsToProcess.length === 0) {
        console.log(`⚠️ Skipping volunteer with no valid slots: ${volunteer.volunteerName} (${volunteer.volunteerCode})`)
        return
      }
      
      if (slotsToProcess.length > 0) {
        slotsToProcess.forEach((slot: any) => {
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
              id: volunteer.id, // Add the schedule ID
              name: volunteer.volunteerName,
              code: volunteer.volunteerCode,
              email: volunteer.volunteerEmail,
              startTime: slot.startTime,
              endTime: slot.endTime,
              hours: slot.hours,
              status: volunteer.status,
              attendanceStatus: attendanceStatus
            })
            console.log(`✅ Added volunteer to ${dateKey}:`, volunteer.volunteerName)
          }
        })
      } else {
        console.log('⚠️ Volunteer has no slots or selectedSlots:', volunteer.volunteerName)
        console.log('   - selectedSlots:', volunteer.selectedSlots)
      }
    })
    
    const result = Array.from(dayMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    console.log('📊 Final calendar data:', result.length, 'days')
    return result
  }, [preEventSlots, getAttendanceStatus, isVolunteerActive])

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 PreEventVolunteerSchedule Debug:')
    console.log('- Loading:', loading)
    console.log('- Schedule data length:', schedule.length)
    console.log('- Schedule data:', schedule)
    console.log('- PreEvent slots length:', preEventSlots.length)
    console.log('- PreEvent slots:', preEventSlots)
    console.log('- Stats:', stats)
    console.log('- Calendar data length:', calendarData.length)
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

      {/* Cleanup Status */}
      {cleanupInProgress && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            🧹 Cleaning up schedules for inactive volunteers...
          </Typography>
        </Alert>
      )}

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
                          label={`${dayData.volunteers.reduce((total: number, v: any) => total + (v.hours || 0), 0)} total hours`}
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
                      {dayData.volunteers.map((volunteer: any, volIndex: number) => (
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
                                  {volunteer.name.split(' ').map((n: string) => n[0]).join('')}
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
                              
                              {/* Action Buttons */}
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Tooltip title="Edit Schedule">
                                  <IconButton 
                                    size="small" 
                                    color="primary"
                                    onClick={() => handleEditSchedule(volunteer.id, volunteer.name)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Schedule">
                                  <IconButton 
                                    size="small" 
                                    color="error"
                                    onClick={() => handleDeleteClick(volunteer.id, volunteer.name)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Confirmar Eliminación
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            ¿Estás seguro de que quieres eliminar el horario de <strong>{scheduleToDelete?.name}</strong>? 
            Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <EditScheduleDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false)
          setScheduleToEdit(null)
        }}
        schedule={scheduleToEdit}
        onSave={handleSaveSchedule}
      />

    </Box>
  )
}