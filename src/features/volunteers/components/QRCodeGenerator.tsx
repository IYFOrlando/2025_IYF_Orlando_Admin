import * as React from 'react'
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack,
  Alert, Divider, Paper, Grid
} from '@mui/material'
import QrCodeIcon from '@mui/icons-material/QrCode'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'

interface QRCodeGeneratorProps {
  volunteerId: string
  volunteerName: string
  volunteerCode: string
  onClose?: () => void
}

export default function QRCodeGenerator({ 
  volunteerId, 
  volunteerName, 
  volunteerCode, 
  onClose 
}: QRCodeGeneratorProps) {
  const [qrData, setQrData] = React.useState('')
  const [copied, setCopied] = React.useState(false)

  // Generate QR data when component mounts or volunteer changes
  React.useEffect(() => {
    const data = {
      type: 'volunteer_checkin',
      volunteerId: volunteerId,
      volunteerCode: volunteerCode,
      volunteerName: volunteerName,
      timestamp: new Date().toISOString(),
      eventId: 'taste-of-korea-preparation',
      eventName: 'Taste of Korea - Pre-Event Preparation Period'
    }
    
    const qrString = JSON.stringify(data)
    setQrData(qrString)
  }, [volunteerId, volunteerName, volunteerCode])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(qrData)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy QR data:', err)
    }
  }

  const handleDownload = () => {
    const element = document.createElement('a')
    const file = new Blob([qrData], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `qr-code-${volunteerCode}-${Date.now()}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <Card sx={{ maxWidth: 600, mx: 'auto' }}>
      <CardContent>
        <Stack spacing={3}>
          {/* Header */}
          <Box sx={{ textAlign: 'center' }}>
            <QrCodeIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h5" gutterBottom>
              QR Code para Check-in/Check-out
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generado para: <strong>{volunteerName}</strong> ({volunteerCode})
            </Typography>
          </Box>

          <Divider />

          {/* QR Code Display */}
          <Paper 
            sx={{ 
              p: 3, 
              textAlign: 'center',
              bgcolor: 'grey.50',
              border: 2,
              borderColor: 'grey.200',
              borderRadius: 2
            }}
          >
            <Typography variant="h6" gutterBottom color="primary">
              📱 QR Code Data
            </Typography>
            
            {/* Simple QR Code representation */}
            <Box sx={{ 
              display: 'inline-block',
              p: 2,
              bgcolor: 'white',
              border: 1,
              borderColor: 'grey.300',
              borderRadius: 1,
              mb: 2
            }}>
              <Typography variant="body2" sx={{ 
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                lineHeight: 1.2,
                wordBreak: 'break-all'
              }}>
                {qrData}
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Instrucciones:</strong><br/>
                1. Copia el texto QR Code Data<br/>
                2. Usa una app de QR Code para generar la imagen<br/>
                3. Escanea el código para check-in/check-out
              </Typography>
            </Alert>
          </Paper>

          {/* QR Data Field */}
          <TextField
            label="QR Code Data"
            multiline
            rows={4}
            value={qrData}
            onChange={(e) => setQrData(e.target.value)}
            fullWidth
            variant="outlined"
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }
            }}
          />

          {/* Action Buttons */}
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="outlined"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopy}
              color={copied ? 'success' : 'primary'}
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
            >
              Descargar
            </Button>
          </Stack>

          {/* Usage Instructions */}
          <Alert severity="success">
            <Typography variant="body2">
              <strong>¿Cómo usar este QR Code?</strong><br/>
              • El voluntario puede usar este código para check-in/check-out automático<br/>
              • El código contiene toda la información necesaria<br/>
              • Se puede escanear desde cualquier dispositivo móvil
            </Typography>
          </Alert>

          {/* Close Button */}
          {onClose && (
            <Box sx={{ textAlign: 'center' }}>
              <Button variant="contained" onClick={onClose}>
                Cerrar
              </Button>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}
