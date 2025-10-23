import React from 'react'
import { Box, Container, Typography, Alert } from '@mui/material'
import VolunteerRegistrationForm from '../components/VolunteerRegistrationForm'
import { useVolunteerApplications } from '../hooks/useVolunteerApplications'
import { generateVolunteerCode } from '../../../lib/volunteerCodes'
import Swal from 'sweetalert2'

export default function VolunteerRegistrationPage() {
  const { createVolunteer } = useVolunteerApplications()

  const handleSubmit = async (formData: any) => {
    try {
      // Generate volunteer code
      const volunteerCode = generateVolunteerCode(6)
      
      // Prepare volunteer data
      const volunteerData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        age: parseInt(formData.age),
        gender: formData.gender,
        tshirtSize: formData.tshirtSize,
        emergencyContact: formData.emergencyContact,
        emergencyPhone: formData.emergencyPhone,
        volunteerCode,
        source: 'website',
        eventInfoAccepted: formData.eventInfoAccepted,
        termsAccepted: formData.termsAccepted,
        status: 'pending' as const,
        availability: {
          days: formData.availableDays,
          times: formData.availableTimes,
          commitment: formData.fullDayCommitment,
          flexible: formData.fullDayCommitment === 'need-adjustment'
        }
      }

      await createVolunteer(volunteerData)
      
      await Swal.fire({
        icon: 'success',
        title: 'Registration Successful!',
        html: `
          <div style="text-align: left;">
            <p><strong>Thank you for registering as a volunteer!</strong></p>
            <p>Your volunteer code is: <strong>${volunteerCode}</strong></p>
            <p>Please save this code - you'll need it for check-in/check-out during the event.</p>
            <p>We'll review your application and contact you soon with more details.</p>
          </div>
        `,
        confirmButtonText: 'Got it!',
        confirmButtonColor: '#2170b1'
      })
      
      // Reset form or redirect
      window.location.reload()
      
    } catch (error) {
      console.error('Error submitting volunteer registration:', error)
      
      await Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: 'There was an error submitting your registration. Please try again or contact us for assistance.',
        confirmButtonText: 'Try Again',
        confirmButtonColor: '#d33'
      })
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          🍽️ Taste of Korea
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          Volunteer Registration
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Join us as a volunteer for the Taste of Korea event on November 8-9, 2025
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>Event Details:</strong> The Taste of Korea event will take place on November 8-9, 2025. 
          We're looking for dedicated volunteers to help make this cultural celebration a success!
        </Typography>
      </Alert>

      <VolunteerRegistrationForm onSubmit={handleSubmit} />
    </Container>
  )
}
