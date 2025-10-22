import { Box, Typography, Paper } from '@mui/material'

interface QRCodeVisualProps {
  url: string
  size?: number
}

export default function QRCodeVisual({ url, size = 200 }: QRCodeVisualProps) {
  // Generate a simple QR code representation using CSS
  const generateQRPattern = (url: string) => {
    // Simple pattern generation based on URL hash
    const hash = url.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    
    const pattern = []
    for (let i = 0; i < 25; i++) {
      pattern.push((hash + i) % 2 === 0)
    }
    return pattern
  }

  const pattern = generateQRPattern(url)

  return (
    <Paper 
      sx={{ 
        p: 2, 
        display: 'inline-block',
        bgcolor: 'white',
        border: 2,
        borderColor: 'grey.300'
      }}
    >
      <Box
        sx={{
          width: size,
          height: size,
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 0.5,
          bgcolor: 'white'
        }}
      >
        {pattern.map((isBlack, index) => (
          <Box
            key={index}
            sx={{
              bgcolor: isBlack ? 'black' : 'white',
              border: '1px solid #ccc',
              minHeight: size / 5 - 2
            }}
          />
        ))}
      </Box>
      <Typography 
        variant="caption" 
        sx={{ 
          display: 'block', 
          textAlign: 'center', 
          mt: 1,
          fontFamily: 'monospace',
          fontSize: '0.7rem',
          wordBreak: 'break-all'
        }}
      >
        {url}
      </Typography>
    </Paper>
  )
}
