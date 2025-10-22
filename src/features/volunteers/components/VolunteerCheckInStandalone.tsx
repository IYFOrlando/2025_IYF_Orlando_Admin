import * as React from 'react'
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack,
  Alert, Paper, Container, Avatar, Divider
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import QrCodeIcon from '@mui/icons-material/QrCode'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useVolunteerAttendance } from '../../events/hooks/useVolunteerAttendance'
import { useVolunteerApplications } from '../hooks/useVolunteerApplications'
import Swal from 'sweetalert2'

export default function VolunteerCheckInStandalone() {
  const { data: attendance, checkIn, checkOut } = useVolunteerAttendance()
  const { data: volunteers } = useVolunteerApplications()
  const [volunteerCode, setVolunteerCode] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  // Filter volunteers for check-in
  const approvedVolunteers = React.useMemo(() => {
    return volunteers.filter(v => v.status === 'approved' || v.status === 'active' || v.status === 'pending')
  }, [volunteers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!volunteerCode.trim()) {
      Swal.fire({
        icon: 'warning',
        title: '⚠️ Volunteer Code Required',
        text: 'Please enter your volunteer code to check in or out.',
        confirmButtonText: 'Got it!',
        confirmButtonColor: '#3085d6',
        showCloseButton: true,
        focusConfirm: false
      })
      return
    }

    setLoading(true)

    try {
      // Find volunteer by code
      const volunteer = approvedVolunteers.find(v => v.volunteerCode === volunteerCode.trim().toUpperCase())
      
      if (!volunteer) {
        Swal.fire({
          icon: 'error',
          title: '❌ Volunteer Not Found',
          text: `Volunteer Code "${volunteerCode}" not found. Please check your code and try again.`,
          confirmButtonText: 'Try Again',
          confirmButtonColor: '#d33',
          showCloseButton: true
        })
        setVolunteerCode('')
        return
      }

      // Check if volunteer has scheduled hours
      const { collection: firestoreCollection, query: firestoreQuery, where: firestoreWhere, getDocs } = await import('firebase/firestore')
      const { db } = await import('../../../lib/firebase')
      
      const scheduleQuery = firestoreQuery(
        firestoreCollection(db, 'volunteer_schedule'),
        firestoreWhere('volunteerCode', '==', volunteer.volunteerCode)
      )
      
      const scheduleSnapshot = await getDocs(scheduleQuery)
      
      if (scheduleSnapshot.empty) {
        const result = await Swal.fire({
          icon: 'info',
          title: '📅 No Scheduled Hours',
          html: `
            <div style="text-align: left;">
              <p><strong>${volunteer.firstName} ${volunteer.lastName}</strong> doesn't have any scheduled volunteer hours yet.</p>
              <p>You have two options:</p>
              <ul>
                <li><strong>Schedule your hours</strong> - Go to the volunteer schedule page</li>
                <li><strong>Contact us</strong> - Get help from our team</li>
              </ul>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: '📅 Schedule Hours',
          cancelButtonText: '📞 Contact Us',
          confirmButtonColor: '#2170b1',
          cancelButtonColor: '#6c757d',
          showCloseButton: true
        })

        if (result.isConfirmed) {
          // Redirect to public volunteer schedule page
          window.open('/volunteer-schedule', '_blank')
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          // Show contact information
          Swal.fire({
            icon: 'info',
            title: '📞 Contact Information',
            html: `
              <div style="text-align: left;">
                <p><strong>IYF Orlando Team</strong></p>
                <p>📧 Email: <a href="mailto:orlando@iyfusa.org">orlando@iyfusa.org</a></p>
                <p>📞 Phone: <a href="tel:+14079003442">(407) 900-3442</a></p>
                <p>📍 Address: 320 S Park Ave, Sanford, FL 32771</p>
                <p>🌐 Website: <a href="https://www.iyforlando.org" target="_blank">iyforlando.org</a></p>
              </div>
            `,
            confirmButtonText: 'Got it!',
            confirmButtonColor: '#2170b1',
            showCloseButton: true
          })
        }
        
        setVolunteerCode('')
        return
      }

      // Check if volunteer has hours scheduled for today
      const todayDate = new Date()
      const todayString = todayDate.toISOString().split('T')[0]
      
      let hasTodaySchedule = false
      scheduleSnapshot.forEach(doc => {
        const scheduleData = doc.data()
        if (scheduleData.selectedSlots && Array.isArray(scheduleData.selectedSlots)) {
          scheduleData.selectedSlots.forEach((slot: any) => {
            if (typeof slot === 'object' && slot.date === todayString) {
              hasTodaySchedule = true
            }
          })
        }
      })
      
      if (!hasTodaySchedule) {
        const result = await Swal.fire({
          icon: 'info',
          title: '📅 No Hours Scheduled for Today',
          html: `
            <div style="text-align: left;">
              <p><strong>${volunteer.firstName} ${volunteer.lastName}</strong> has no volunteer hours scheduled for today (${todayString}).</p>
              <p>You can:</p>
              <ul>
                <li><strong>Check your schedule</strong> - View all your scheduled hours</li>
                <li><strong>Contact us</strong> - Get help from our team</li>
              </ul>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: '📅 View Schedule',
          cancelButtonText: '📞 Contact Us',
          confirmButtonColor: '#2170b1',
          cancelButtonColor: '#6c757d',
          showCloseButton: true
        })

        if (result.isConfirmed) {
          // Redirect to public volunteer schedule page
          window.open('/volunteer-schedule', '_blank')
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          // Show contact information
          Swal.fire({
            icon: 'info',
            title: '📞 Contact Information',
            html: `
              <div style="text-align: left;">
                <p><strong>IYF Orlando Team</strong></p>
                <p>📧 Email: <a href="mailto:orlando@iyfusa.org">orlando@iyfusa.org</a></p>
                <p>📞 Phone: <a href="tel:+14079003442">(407) 900-3442</a></p>
                <p>📍 Address: 320 S Park Ave, Sanford, FL 32771</p>
                <p>🌐 Website: <a href="https://www.iyforlando.org" target="_blank">iyforlando.org</a></p>
              </div>
            `,
            confirmButtonText: 'Got it!',
            confirmButtonColor: '#2170b1',
            showCloseButton: true
          })
        }
        
        setVolunteerCode('')
        return
      }

      // Check current attendance status for today
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayStart = Math.floor(today.getTime() / 1000)
      const todayEnd = todayStart + 86400

      const todayAttendance = attendance.find(att => {
        if (att.volunteerId !== volunteer.volunteerCode) return false
        if (att.eventId !== 'taste-of-korea-preparation') return false
        if (!att.checkInTime) return false
        return att.checkInTime.seconds >= todayStart && att.checkInTime.seconds < todayEnd
      })

      if (!todayAttendance) {
        // No attendance today - do check-in
        await checkIn(
          volunteer.volunteerCode || '',
          volunteer.firstName,
          volunteer.email,
          'taste-of-korea-preparation',
          'Taste of Korea - Pre-Event Preparation Period'
        )
        
        Swal.fire({
          icon: 'success',
          title: '✅ Check-in Successful!',
          text: `${volunteer.firstName} ${volunteer.lastName} has been checked in successfully.`,
          confirmButtonText: 'Awesome!',
          confirmButtonColor: '#28a745',
          timer: 5000,
          timerProgressBar: true,
          showCloseButton: true
        })
      } else if (todayAttendance.checkInTime && !todayAttendance.checkOutTime) {
        // Has check-in but no check-out - do check-out
        await checkOut(todayAttendance.id)
        
        Swal.fire({
          icon: 'success',
          title: '✅ Check-out Successful!',
          text: `${volunteer.firstName} ${volunteer.lastName} has been checked out successfully.`,
          confirmButtonText: 'Perfect!',
          confirmButtonColor: '#28a745',
          timer: 5000,
          timerProgressBar: true,
          showCloseButton: true
        })
      } else if (todayAttendance.checkInTime && todayAttendance.checkOutTime) {
        // Already completed
        Swal.fire({
          icon: 'info',
          title: '✅ Shift Already Completed',
          text: `${volunteer.firstName} ${volunteer.lastName} has already completed their shift today.`,
          confirmButtonText: 'Understood',
          confirmButtonColor: '#17a2b8',
          showCloseButton: true
        })
      } else {
        Swal.fire({
          icon: 'warning',
          title: '⚠️ Status Unknown',
          text: 'Unable to determine attendance status. Please contact support.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#ffc107',
          showCloseButton: true
        })
      }

      setVolunteerCode('')
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: '❌ Processing Error',
        text: 'Error processing check-in/check-out. Please try again or contact support.',
        confirmButtonText: 'Try Again',
        confirmButtonColor: '#d33',
        showCloseButton: true
      })
      setVolunteerCode('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
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
          <Typography variant="h4" component="h1" gutterBottom color="primary" fontWeight="bold">
            🍽️ Taste of Korea
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Pre-Event Preparation Period
          </Typography>
        </Box>

        {/* Instructions */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            📱 Instructions:
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">
              • Enter your <strong>Volunteer Code</strong> (e.g: A1B2C3)
            </Typography>
            <Typography variant="body2">
              • The system will automatically detect if it's check-in or check-out
            </Typography>
            <Typography variant="body2">
              • You will receive confirmation of your action
            </Typography>
          </Stack>
        </Alert>

        {/* Form */}
        <Card variant="outlined">
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Stack spacing={3}>
                <TextField
                  label="Volunteer Code"
                  value={volunteerCode}
                  onChange={(e) => setVolunteerCode(e.target.value.toUpperCase())}
                  placeholder="Ej: A1B2C3"
                  fullWidth
                  autoComplete="off"
                  autoFocus
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'action.active' }} />
                  }}
                />
                
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  startIcon={loading ? <QrCodeIcon /> : <CheckCircleIcon />}
                  sx={{ 
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 'bold'
                  }}
                >
                  {loading ? 'Processing...' : 'Process Check-in/Check-out'}
                </Button>
              </Stack>
            </form>
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
      </Paper>
    </Container>
  )
}
