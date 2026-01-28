import { Box, Typography, Button } from '@mui/material'
import { ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function AccessDenied() {
  const navigate = useNavigate()

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '60vh',
        gap: 3,
        textAlign: 'center',
        px: 3
      }}
    >
      <Box 
        sx={{ 
          p: 3, 
          borderRadius: '50%', 
          bgcolor: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444'
        }}
      >
        <ShieldAlert size={64} />
      </Box>
      
      <Box>
        <Typography variant="h4" fontWeight={800} gutterBottom>
          Access Restricted
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
          You don't have the required permissions to view this page. If you believe this is an error, please contact the administrator.
        </Typography>
      </Box>

      <Button 
        variant="contained" 
        size="large"
        onClick={() => navigate('/dashboard')}
        sx={{ 
          borderRadius: '12px',
          px: 4,
          background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
          textTransform: 'none',
          fontSize: '1rem',
          fontWeight: 600
        }}
      >
        Return to Dashboard
      </Button>
    </Box>
  )
}
