import { Box, Paper, Typography, Button, Stack, TextField, Alert, Divider } from '@mui/material'
import { useState } from 'react'
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { Alert as SAlert } from '../../../lib/alerts'

export default function PublicAccessPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const auth = getAuth()
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e: any) {
      setError(e?.message || 'Login failed. Please check your credentials.')
      SAlert.fire({
        title: 'Access Denied',
        text: 'Invalid credentials. Please contact the administrator for access.',
        icon: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

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
            This is a restricted administrative portal. Please enter your credentials to continue.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: '100%' }}>
              {error}
            </Alert>
          )}

          {/* Google Login */}
          <Button
            variant="outlined"
            size="large"
            onClick={handleGoogleLogin}
            disabled={loading}
            fullWidth
            sx={{ mb: 2 }}
          >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </Button>

          <Divider sx={{ width: '100%' }}>
            <Typography variant="body2" color="textSecondary">
              OR
            </Typography>
          </Divider>

          {/* Email/Password Login */}
          <Box component="form" onSubmit={handleEmailLogin} sx={{ width: '100%' }}>
            <Stack spacing={2}>
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                disabled={loading}
              />
              
              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                disabled={loading}
              />

              <Button 
                type="submit"
                variant="contained" 
                size="large" 
                disabled={loading}
                sx={{ mt: 2 }}
              >
                {loading ? 'Signing in...' : 'Sign In with Email'}
              </Button>
            </Stack>
          </Box>

          <Typography variant="caption" color="text.secondary" align="center">
            Need access? Contact the administrator at{' '}
            <a href="mailto:admin@iyfusa.org" style={{ color: 'inherit' }}>
              admin@iyfusa.org
            </a>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
}
