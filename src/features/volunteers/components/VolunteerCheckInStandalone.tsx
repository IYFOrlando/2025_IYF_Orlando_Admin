import * as React from 'react'
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack,
  Alert, Paper, Container, Avatar, Divider
} from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import QrCodeIcon from '@mui/icons-material/QrCode'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import { useVolunteerAttendance } from '../../events/hooks/useVolunteerAttendance'
import { useVolunteerApplications } from '../hooks/useVolunteerApplications'
import { useGeolocation } from '../hooks/useGeolocation'
import Swal from 'sweetalert2'

export default function VolunteerCheckInStandalone() {
  const { data: attendance, checkIn, checkOut } = useVolunteerAttendance()
  const { data: volunteers } = useVolunteerApplications()
  const { getCurrentLocation, location } = useGeolocation()
  const [volunteerCode, setVolunteerCode] = React.useState('')
  const [loading, setLoading] = React.useState(false)

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

    // Get current location
    let currentLocation = null
    try {
      currentLocation = await getCurrentLocation()
    } catch (error) {
      console.warn('Could not get location:', error)
      // Continue without location - don't block the check-in/out process
    }

    try {
      // Find volunteer by code (search in ALL volunteers, not just approved ones)
      const volunteer = volunteers.find(v => v.volunteerCode === volunteerCode.trim().toUpperCase())
      
      if (!volunteer) {
        const result = await Swal.fire({
          icon: 'error',
          title: '❌ Volunteer Code Not Found',
          html: `
            <div style="text-align: left;">
              <p><strong>Volunteer Code "${volunteerCode}"</strong> was not found in our system.</p>
              <p>This could mean:</p>
              <ul>
                <li>• The code was entered incorrectly</li>
                <li>• Your volunteer application is still being processed</li>
                <li>• You haven't registered as a volunteer yet</li>
              </ul>
              <p>What would you like to do?</p>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: '🔄 Try Again',
          cancelButtonText: '📞 Contact Us',
          confirmButtonColor: '#d33',
          cancelButtonColor: '#6c757d',
          showCloseButton: true
        })

        if (result.dismiss === Swal.DismissReason.cancel) {
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

      // Check volunteer status
      if (volunteer.status === 'rejected') {
        Swal.fire({
          icon: 'error',
          title: '❌ Volunteer Application Rejected',
          html: `
            <div style="text-align: left;">
              <p><strong>${volunteer.firstName} ${volunteer.lastName}</strong>, your volunteer application has been rejected.</p>
              <p>You cannot participate in the Taste of Korea event at this time.</p>
              <p>If you believe this is an error, please contact us.</p>
            </div>
          `,
          confirmButtonText: '📞 Contact Us',
          confirmButtonColor: '#d33',
          showCloseButton: true
        }).then((result) => {
          if (result.isConfirmed) {
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
        })
        setVolunteerCode('')
        return
      }

      if (volunteer.status === 'inactive') {
        Swal.fire({
          icon: 'warning',
          title: '⚠️ Volunteer Account Inactive',
          html: `
            <div style="text-align: left;">
              <p><strong>${volunteer.firstName} ${volunteer.lastName}</strong>, your volunteer account is currently inactive.</p>
              <p>You cannot check in until your account is reactivated.</p>
              <p>Please contact us to reactivate your account.</p>
            </div>
          `,
          confirmButtonText: '📞 Contact Us',
          confirmButtonColor: '#ffc107',
          showCloseButton: true
        }).then((result) => {
          if (result.isConfirmed) {
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
        })
        setVolunteerCode('')
        return
      }

      if (volunteer.status === 'pending') {
        Swal.fire({
          icon: 'info',
          title: '⏳ Application Under Review',
          html: `
            <div style="text-align: left;">
              <p><strong>${volunteer.firstName} ${volunteer.lastName}</strong>, your volunteer application is still under review.</p>
              <p>You cannot check in until your application is approved.</p>
              <p>Please wait for approval or contact us if you have questions.</p>
            </div>
          `,
          confirmButtonText: '📞 Contact Us',
          confirmButtonColor: '#17a2b8',
          showCloseButton: true
        }).then((result) => {
          if (result.isConfirmed) {
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
          title: '📅 No Volunteer Hours Scheduled',
          html: `
            <div style="text-align: left;">
              <p><strong>${volunteer.firstName} ${volunteer.lastName}</strong> doesn't have any scheduled volunteer hours yet.</p>
              <p>To participate in the Taste of Korea event, you need to schedule your volunteer hours first.</p>
              <p>What would you like to do?</p>
              <ul>
                <li>• <strong>View Schedule</strong> - See available time slots</li>
                <li>• <strong>Contact Us</strong> - Get help scheduling your hours</li>
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

      // Check if volunteer has hours scheduled for today
      const todayDate = new Date()
      const todayString = todayDate.toISOString().split('T')[0]
      
      // Helper function to normalize date strings
      const normalizeDate = (dateStr: string): string => {
        try {
          // Handle different date formats
          if (dateStr.includes('/')) {
            // MM/DD/YYYY or DD/MM/YYYY format
            const parts = dateStr.split('/')
            if (parts.length === 3) {
              const month = parts[0].padStart(2, '0')
              const day = parts[1].padStart(2, '0')
              const year = parts[2]
              return `${year}-${month}-${day}`
            }
          } else if (dateStr.includes('-')) {
            // Already in YYYY-MM-DD format or similar
            return dateStr.split(' ')[0] // Take only the date part
          }
          return dateStr
        } catch (error) {
          console.error('Error normalizing date:', dateStr, error)
          return dateStr
        }
      }
      
      console.log('🔍 Debugging schedule check for:', volunteer.firstName, volunteer.lastName)
      console.log('📅 Today string:', todayString)
      console.log('📊 Schedule snapshot size:', scheduleSnapshot.size)
      
      let hasTodaySchedule = false
      let debugInfo = []
      
      scheduleSnapshot.forEach(doc => {
        const scheduleData = doc.data()
        console.log('📋 Schedule document:', doc.id, scheduleData)
        
        if (scheduleData.selectedSlots && Array.isArray(scheduleData.selectedSlots)) {
          console.log('⏰ SelectedSlots found:', scheduleData.selectedSlots.length, 'slots')
          
          scheduleData.selectedSlots.forEach((slot: any, index: number) => {
            console.log(`🎯 Slot ${index}:`, slot, 'Type:', typeof slot)
            
            if (typeof slot === 'object' && slot.date) {
              const normalizedSlotDate = normalizeDate(slot.date)
              const matches = normalizedSlotDate === todayString
              
              console.log(`📅 Slot ${index} date:`, slot.date, 'Normalized:', normalizedSlotDate, 'vs Today:', todayString, 'Match:', matches)
              
              debugInfo.push({
                slotIndex: index,
                slotDate: slot.date,
                normalizedSlotDate: normalizedSlotDate,
                todayString: todayString,
                matches: matches,
                slotData: slot
              })
              
              if (matches) {
                hasTodaySchedule = true
                console.log('✅ Found matching schedule for today!')
              }
            } else if (typeof slot === 'string') {
              console.log(`📅 Slot ${index} is string:`, slot)
              debugInfo.push({
                slotIndex: index,
                slotString: slot,
                isString: true
              })
            }
          })
        } else {
          console.log('❌ No selectedSlots or not an array:', scheduleData.selectedSlots)
        }
      })
      
      console.log('🔍 Debug info:', debugInfo)
      console.log('✅ Has today schedule:', hasTodaySchedule)
      
      if (!hasTodaySchedule) {
        // Create debug information for the user
        const debugText = debugInfo.length > 0 
          ? `<br><br><strong>Debug Info:</strong><br>Today: ${todayString}<br>Found ${debugInfo.length} slots:<br>${debugInfo.map(info => 
              info.isString 
                ? `- Slot ${info.slotIndex}: "${info.slotString}" (string format)`
                : `- Slot ${info.slotIndex}: ${info.slotDate} → ${info.normalizedSlotDate} ${info.matches ? '✅' : '❌'}`
            ).join('<br>')}`
          : '<br><br><strong>Debug Info:</strong><br>No slots found in schedule data.'

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
              ${debugText}
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
          'Taste of Korea - Pre-Event Preparation Period',
          currentLocation || undefined
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
        await checkOut(todayAttendance.id, currentLocation || undefined)
        
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

                {/* Location Status */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <LocationOnIcon color={location ? 'success' : 'disabled'} />
                  <Typography variant="body2" color={location ? 'success.main' : 'text.secondary'}>
                    {location ? `📍 Location: ${location.address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}` : '📍 Location will be captured automatically'}
                  </Typography>
                </Box>
                
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
