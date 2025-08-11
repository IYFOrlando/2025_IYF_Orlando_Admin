
import { Box, Paper, Typography, Button, Stack } from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { Alert as SAlert } from '../../../lib/alerts' // reuse SweetAlert for errors

export default function LoginPage() {
  const handleGoogle = async () => {
    try {
      const auth = getAuth()
      const provider = new GoogleAuthProvider()
      
      // Check if Firebase is properly configured
      if (!import.meta.env.VITE_FIREBASE_API_KEY) {
        throw new Error('Firebase API key not configured. Please check environment variables.')
      }
      
      await signInWithPopup(auth, provider)
    } catch (e: any) {
      SAlert.fire({ 
        title: 'Login failed', 
        text: e?.message || 'Unknown error occurred', 
        icon: 'error' 
      })
    }
  }

  return (
    <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 3, maxWidth: 420, width: '100%' }}>
        <Stack spacing={2} alignItems="center">
          <Typography variant="h5" fontWeight={800}>IYF Orlando — Admin</Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Please sign in with your admin Google account.
          </Typography>
          <Button onClick={handleGoogle} startIcon={<GoogleIcon />} variant="contained" size="large" sx={{ mt: 1 }}>
            Continue with Google
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
