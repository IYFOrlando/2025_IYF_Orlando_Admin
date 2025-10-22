import * as React from 'react'
import { Box, Typography, Container } from '@mui/material'
import VolunteerCheckInStandalone from '../components/VolunteerCheckInStandalone'

export default function CheckInPage() {
  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'grey.50',
      py: 2
    }}>
      <Container maxWidth="sm">
        <VolunteerCheckInStandalone />
      </Container>
    </Box>
  )
}
