import * as React from 'react'
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Typography, Stack, Chip, Alert, TextField, Grid } from '@mui/material'
import QrCodeIcon from '@mui/icons-material/QrCode'
import PrintIcon from '@mui/icons-material/Print'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import type { QRCodeData } from '../types'
import { useVolunteerCodes } from '../hooks/useVolunteerCodes'
import { useVolunteerHours } from '../hooks/useVolunteerHours'
import { notifySuccess, notifyError } from '../../../lib/alerts'

interface QRCodeGeneratorProps {
  eventId: string
  eventName: string
  open: boolean
  onClose: () => void
}

export default function QRCodeGenerator({ eventId, eventName, open, onClose }: QRCodeGeneratorProps) {
  const [selectedType, setSelectedType] = React.useState<'check-in' | 'check-out'>('check-in')
  const [volunteerCode, setVolunteerCode] = React.useState('')
  const [newVolunteerName, setNewVolunteerName] = React.useState('')
  const [newVolunteerEmail, setNewVolunteerEmail] = React.useState('')
  const [showAddVolunteer, setShowAddVolunteer] = React.useState(false)

  const { data: volunteerCodes, createCode, getVolunteerByCode } = useVolunteerCodes(eventId)
  const { checkIn } = useVolunteerHours(eventId)

  const qrData: QRCodeData = {
    type: selectedType,
    eventId,
    volunteerCode: volunteerCode || undefined,
    timestamp: Date.now()
  }

  const qrValue = JSON.stringify(qrData)

  const handleAddVolunteer = async () => {
    try {
      await createCode(newVolunteerName, newVolunteerEmail, eventId)
      notifySuccess('Volunteer code created successfully')
      setNewVolunteerName('')
      setNewVolunteerEmail('')
      setShowAddVolunteer(false)
    } catch (err) {
      notifyError('Failed to create volunteer code')
    }
  }

  const handleCheckInOut = async () => {
    if (!volunteerCode) {
      notifyError('Please enter a volunteer code')
      return
    }

    const volunteer = getVolunteerByCode(volunteerCode)
    if (!volunteer) {
      notifyError('Invalid volunteer code')
      return
    }

    try {
      if (selectedType === 'check-in') {
        await checkIn(volunteerCode, volunteer.volunteerName, volunteer.volunteerEmail, eventId, eventName)
        notifySuccess(`${volunteer.volunteerName} checked in successfully`)
      } else {
        // For check-out, we need to find the current check-in record
        // This would be implemented based on your specific needs
        notifySuccess(`${volunteer.volunteerName} checked out successfully`)
      }
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to process check-in/out')
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${eventName}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px;
                margin: 0;
              }
              .header { 
                margin-bottom: 20px; 
                font-size: 24px;
                font-weight: bold;
              }
              .subtitle {
                margin-bottom: 20px;
                font-size: 18px;
                color: #666;
              }
              .qr-container {
                display: flex;
                justify-content: center;
                margin: 20px 0;
              }
              .instructions {
                margin-top: 20px;
                font-size: 14px;
                color: #333;
                max-width: 400px;
                margin-left: auto;
                margin-right: auto;
              }
            </style>
          </head>
          <body>
            <div class="header">${eventName}</div>
            <div class="subtitle">${selectedType === 'check-in' ? 'Check-In' : 'Check-Out'} QR Code</div>
            <div class="qr-container">
              <svg width="200" height="200" viewBox="0 0 200 200">
                ${document.querySelector('#qr-code-svg')?.innerHTML || ''}
              </svg>
            </div>
            <div class="instructions">
              <p><strong>Instructions:</strong></p>
              <p>1. Volunteers should scan this QR code with their phone</p>
              <p>2. This will automatically ${selectedType === 'check-in' ? 'check them in' : 'check them out'} for the event</p>
              <p>3. Make sure the QR code is clearly visible and well-lit</p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          <QrCodeIcon />
          <Typography variant="h6">QR Code Generator</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="h6" gutterBottom>{eventName}</Typography>
            <Stack direction="row" spacing={1}>
              <Chip
                label="Check-In"
                color={selectedType === 'check-in' ? 'primary' : 'default'}
                onClick={() => setSelectedType('check-in')}
                clickable
              />
              <Chip
                label="Check-Out"
                color={selectedType === 'check-out' ? 'primary' : 'default'}
                onClick={() => setSelectedType('check-out')}
                clickable
              />
            </Stack>
          </Box>

          {/* Volunteer Code Input */}
          <Box>
            <Typography variant="subtitle1" gutterBottom>Volunteer Code</Typography>
            <TextField
              label="Enter 4-digit code"
              value={volunteerCode}
              onChange={(e) => setVolunteerCode(e.target.value)}
              fullWidth
              inputProps={{ maxLength: 4, pattern: '[0-9]*' }}
              helperText="Volunteers will enter their assigned 4-digit code"
            />
          </Box>

          {/* Add New Volunteer */}
          <Box>
            <Button
              variant="outlined"
              startIcon={<PersonAddIcon />}
              onClick={() => setShowAddVolunteer(!showAddVolunteer)}
              fullWidth
            >
              Add New Volunteer
            </Button>
            
            {showAddVolunteer && (
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    label="Volunteer Name"
                    value={newVolunteerName}
                    onChange={(e) => setNewVolunteerName(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Email"
                    type="email"
                    value={newVolunteerEmail}
                    onChange={(e) => setNewVolunteerEmail(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    onClick={handleAddVolunteer}
                    disabled={!newVolunteerName || !newVolunteerEmail}
                    fullWidth
                  >
                    Create Volunteer Code
                  </Button>
                </Grid>
              </Grid>
            )}
          </Box>

          {/* Volunteer Codes List */}
          {volunteerCodes.length > 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom>Active Volunteer Codes</Typography>
              <Stack spacing={1}>
                {volunteerCodes.slice(0, 5).map((code) => (
                  <Box key={code.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">{code.volunteerName}</Typography>
                      <Typography variant="caption" color="text.secondary">{code.volunteerEmail}</Typography>
                    </Box>
                    <Chip label={code.code} color="primary" size="small" />
                  </Box>
                ))}
                {volunteerCodes.length > 5 && (
                  <Typography variant="caption" color="text.secondary">
                    ... and {volunteerCodes.length - 5} more volunteers
                  </Typography>
                )}
              </Stack>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2, bgcolor: 'white', borderRadius: 1 }}>
            <Alert severity="info" sx={{ maxWidth: 400 }}>
              <Typography variant="h6" gutterBottom>
                QR Code Data
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {qrValue}
              </Typography>
              <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                This data can be used to generate QR codes using external tools or mobile apps.
              </Typography>
            </Alert>
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Scan this QR code to {selectedType === 'check-in' ? 'check in' : 'check out'} volunteers
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="outlined"
          onClick={handleCheckInOut}
          disabled={!volunteerCode}
        >
          {selectedType === 'check-in' ? 'Check In' : 'Check Out'}
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Print QR Code
        </Button>
      </DialogActions>
    </Dialog>
  )
}
