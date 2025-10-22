import * as React from 'react'
import {
  Box, Typography, Card, CardContent, Container, Stack,
  Alert, Button, Grid, Paper, Avatar, Chip, Divider
} from '@mui/material'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import ScheduleIcon from '@mui/icons-material/Schedule'
import PeopleIcon from '@mui/icons-material/People'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import { useVolunteerSchedule } from '../hooks/useVolunteerSchedule'
import { useVolunteerApplications } from '../hooks/useVolunteerApplications'

export default function PublicVolunteerSchedulePage() {
  const { data: schedule, loading, getPreEventSchedule } = useVolunteerSchedule()
  const { data: volunteers } = useVolunteerApplications()
  
  const preEventSlots = getPreEventSchedule()

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
            
            dayMap.get(dateKey).volunteers.push({
              name: volunteer.volunteerName,
              code: volunteer.volunteerCode,
              email: volunteer.volunteerEmail,
              startTime: slot.startTime,
              endTime: slot.endTime,
              hours: slot.hours,
              status: volunteer.status
            })
          }
        })
      }
    })
    
    return Array.from(dayMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [preEventSlots])

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'grey.50',
      py: 4
    }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar sx={{ 
            bgcolor: '#2170b1', 
            width: 80, 
            height: 80, 
            mx: 'auto', 
            mb: 2,
            fontSize: '2rem',
            fontWeight: 'bold'
          }}>
            IYF
          </Avatar>
          <Typography variant="h3" component="h1" gutterBottom color="primary" fontWeight="bold">
            🍽️ Taste of Korea
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Pre-Event Preparation Period
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Volunteer Schedule
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
            IYF Orlando - Volunteer Information
          </Typography>
        </Box>

        {/* Instructions */}
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            📅 Volunteer Schedule Information:
          </Typography>
          <Typography variant="body2" gutterBottom>
            • View all scheduled volunteer hours for the Taste of Korea Pre-Event
          </Typography>
          <Typography variant="body2" gutterBottom>
            • If you need to schedule or modify your hours, please contact us
          </Typography>
          <Typography variant="body2">
            • Use the check-in page to record your attendance
          </Typography>
        </Alert>

        {/* Contact Information */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📞 Need to Schedule or Modify Hours?
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>📧 Email:</strong> <a href="mailto:orlando@iyfusa.org">orlando@iyfusa.org</a>
                  </Typography>
                  <Typography variant="body2">
                    <strong>📞 Phone:</strong> <a href="tel:+14079003442">(407) 900-3442</a>
                  </Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>📍 Address:</strong> 320 S Park Ave, Sanford, FL 32771
                  </Typography>
                  <Typography variant="body2">
                    <strong>🌐 Website:</strong> <a href="https://www.iyforlando.org" target="_blank">iyforlando.org</a>
                  </Typography>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Schedule Calendar */}
        <Card>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              📅 Volunteer Schedule Calendar
            </Typography>
            
            {loading ? (
              <Typography>Loading schedule...</Typography>
            ) : calendarData.length === 0 ? (
              <Alert severity="info">
                <Typography variant="h6" gutterBottom>
                  No volunteer schedules found
                </Typography>
                <Typography variant="body2">
                  The volunteer schedule is currently empty. Contact us to schedule your volunteer hours.
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
                    <CardContent sx={{ 
                      bgcolor: 'primary.50',
                      borderBottom: 1,
                      borderColor: 'primary.200'
                    }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <CalendarTodayIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" color="primary">
                            {dayData.date}
                          </Typography>
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
                        </Box>
                      </Stack>
                    </CardContent>
                    
                    <CardContent>
                      <Grid container spacing={2}>
                        {dayData.volunteers.map((volunteer, volIndex) => (
                          <Grid item xs={12} sm={6} md={4} key={volIndex}>
                            <Paper sx={{ 
                              p: 2, 
                              border: 1, 
                              borderColor: 'grey.300',
                              borderRadius: 2
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
                                
                                {/* Status */}
                                <Chip
                                  label={volunteer.status}
                                  color={volunteer.status === 'confirmed' ? 'success' : 'default'}
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

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            IYF Orlando - 320 S Park Ave, Sanford, FL 32771
          </Typography>
          <Typography variant="body2" color="text.secondary">
            📞 (407) 900-3442 | ✉️ orlando@iyfusa.org
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}
