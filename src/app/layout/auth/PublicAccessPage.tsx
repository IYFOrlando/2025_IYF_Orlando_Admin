import { Box, Paper, Typography, Button, Stack, Alert } from '@mui/material'
import { useState } from 'react'
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { Alert as SAlert } from '../../../lib/alerts'

export default function PublicAccessPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const auth = getAuth()
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (e: any) {
      setError(e?.message || 'Google login failed.')
      SAlert.fire({
        title: 'Login Failed',
        text: 'Google authentication failed. Please try again.',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'grid', 
      placeItems: 'center', 
      p: 2,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Paper elevation={8} sx={{ p: 4, borderRadius: 3, maxWidth: 420, width: '100%' }}>
        <Stack spacing={3} alignItems="center">
          <Typography variant="h4" fontWeight={800} color="primary">
            IYF Orlando — Admin Portal
          </Typography>
          
          <Typography variant="body1" color="text.secondary" align="center">
            This is a restricted administrative portal. Please sign in with your Google account to continue.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={handleGoogleLogin}
            disabled={loading}
            fullWidth
            sx={{ 
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 600
            }}
          >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </Button>

          <Typography variant="caption" color="text.secondary" align="center">
            Need access? Contact the administrator at{' '}
            <a href="mailto:orlando@iyfusa.org" style={{ color: 'inherit' }}>
              orlando@iyfusa.org
            </a>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
}
