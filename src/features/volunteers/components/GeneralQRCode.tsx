import * as React from 'react'
import {
  Box, Typography, Card, CardContent, TextField, Button, Stack,
  Alert, Divider, Paper, Chip, Link
} from '@mui/material'
import QrCodeIcon from '@mui/icons-material/QrCode'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DownloadIcon from '@mui/icons-material/Download'
import CheckInIcon from '@mui/icons-material/Login'
import CheckOutIcon from '@mui/icons-material/Logout'
import QRCodeVisual from './QRCodeVisual'

export default function GeneralQRCode() {
  const [qrData, setQrData] = React.useState('')
  const [copied, setCopied] = React.useState(false)

  // Generate general QR data for all volunteers
  React.useEffect(() => {
    // URL to the check-in page
    const checkinUrl = `${window.location.origin}/qr-checkin-simple.html`
    
    // Use the URL directly for QR code (simpler and more reliable)
    setQrData(checkinUrl)
  }, [])

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
    element.download = `general-qr-code-${Date.now()}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto' }}>
      <CardContent>
        <Stack spacing={3}>
          {/* Header */}
          <Box sx={{ textAlign: 'center' }}>
            <QrCodeIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom color="primary">
              QR Code General para Check-in/Check-out
            </Typography>
            <Typography variant="h6" color="text.secondary">
              🍽️ Taste of Korea - Pre-Event Preparation Period
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Todos los voluntarios usan este mismo código
            </Typography>
          </Box>

          <Divider />

          {/* How it works */}
          <Alert severity="info" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              📱 ¿Cómo Funciona?
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                • <strong>Un solo QR Code</strong> para todos los voluntarios
              </Typography>
              <Typography variant="body2">
                • <strong>Escaneo:</strong> Abre una página web donde ingresan su Volunteer Code
              </Typography>
              <Typography variant="body2">
                • <strong>Check-in:</strong> Si el voluntario no ha hecho check-in hoy
              </Typography>
              <Typography variant="body2">
                • <strong>Check-out:</strong> Si el voluntario ya hizo check-in pero no check-out
              </Typography>
              <Typography variant="body2">
                • <strong>Automático:</strong> El sistema detecta qué acción realizar
              </Typography>
            </Stack>
          </Alert>

          {/* QR Code Display */}
          <Paper 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              bgcolor: 'grey.50',
              border: 3,
              borderColor: 'primary.main',
              borderRadius: 3
            }}
          >
            <Typography variant="h5" gutterBottom color="primary">
              📱 QR Code Visual
            </Typography>
            
            {/* QR Code Visual */}
            <Box sx={{ mb: 3 }}>
              <QRCodeVisual url={qrData} size={250} />
            </Box>
            
            {/* QR Code URL */}
            <Box sx={{ 
              display: 'inline-block',
              p: 2,
              bgcolor: 'white',
              border: 1,
              borderColor: 'grey.300',
              borderRadius: 1,
              mb: 2,
              maxWidth: '100%',
              overflow: 'auto'
            }}>
              <Link 
                href={qrData} 
                target="_blank" 
                rel="noopener noreferrer"
                sx={{ 
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  wordBreak: 'break-all',
                  textDecoration: 'none',
                  color: 'primary.main',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                }}
              >
                {qrData}
              </Link>
            </Box>

            {/* Instructions for QR generation */}
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Para generar el QR Code visual:</strong><br/>
                1. Copia la URL de arriba<br/>
                2. Ve a <Link href="https://www.qr-code-generator.com/" target="_blank" rel="noopener noreferrer">qr-code-generator.com</Link><br/>
                3. Pega la URL y genera el QR Code<br/>
                4. Descarga e imprime el QR Code
              </Typography>
            </Alert>

            {/* Status indicators */}
            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 2 }}>
              <Chip 
                icon={<CheckInIcon />}
                label="Check-in"
                color="success"
                variant="outlined"
              />
              <Chip 
                icon={<CheckOutIcon />}
                label="Check-out"
                color="warning"
                variant="outlined"
              />
            </Stack>
          </Paper>

          {/* QR Data Field */}
          <TextField
            label="QR Code Data (Editable)"
            multiline
            rows={6}
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
              variant="contained"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopy}
              color={copied ? 'success' : 'primary'}
              size="large"
            >
              {copied ? '¡Copiado!' : 'Copiar Código'}
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              size="large"
            >
              Descargar
            </Button>
          </Stack>

          {/* Usage Instructions */}
          <Alert severity="success" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              🎯 Instrucciones de Uso
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>1. Generar QR Visual:</strong> Copia el código y úsalo en cualquier app de QR
              </Typography>
              <Typography variant="body2">
                <strong>2. Colocar en Sede:</strong> Imprime y coloca el QR en un lugar visible
              </Typography>
              <Typography variant="body2">
                <strong>3. Voluntarios Escanean:</strong> Cada voluntario escanea el mismo código
              </Typography>
              <Typography variant="body2">
                <strong>4. Ingresan Código:</strong> En la página web ingresan su Volunteer Code
              </Typography>
              <Typography variant="body2">
                <strong>5. Sistema Automático:</strong> Detecta si es check-in o check-out
              </Typography>
            </Stack>
          </Alert>

          {/* Technical Details */}
          <Alert severity="warning" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              ⚙️ Detalles Técnicos
            </Typography>
            <Typography variant="body2">
              El sistema detecta automáticamente la acción basándose en:
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              <Typography variant="body2">
                • <strong>Check-in:</strong> Si no hay registro de check-in para hoy
              </Typography>
              <Typography variant="body2">
                • <strong>Check-out:</strong> Si ya hay check-in pero no check-out
              </Typography>
              <Typography variant="body2">
                • <strong>Error:</strong> Si ya completó el ciclo (check-in + check-out)
              </Typography>
            </Stack>
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  )
}
