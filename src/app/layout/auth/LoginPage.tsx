import { useState } from 'react'
import { Box, Paper, Typography, Button, Stack, useTheme, Avatar, TextField, Divider, Alert } from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import LoginIcon from '@mui/icons-material/Login'
import { motion } from 'framer-motion'
import iyfLogo from '../../../assets/logo/IYF_logo.png'
import { supabase } from '../../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'

export default function LoginPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const navigate = useNavigate()
  const { signInWithGoogle } = useAuth()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error
      // Supabase auth state listener in AuthContext will handle redirect
      navigate('/') 
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
        await signInWithGoogle()
    } catch (err: any) {
        setError(err.message)
    }
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'grid', 
      placeItems: 'center', 
      p: 2,
      position: 'relative',
      overflow: 'hidden',
      background: isDark 
        ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' 
        : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
    }}>
      {/* Background blobs */}
      <Box
        component={motion.div}
        animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, -30, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        sx={{
          position: 'absolute', top: '10%', left: '15%', width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0) 70%)',
          filter: 'blur(60px)', zIndex: 0
        }}
      />
      
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        sx={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 5,
            borderRadius: 6,
            background: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.4)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            textAlign: 'center'
          }}
        >
          <Stack spacing={4} alignItems="center">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            >
              <Avatar
                src={iyfLogo}
                sx={{ width: 80, height: 80, mb: 1, filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1))' }}
              />
            </motion.div>

            <Box>
              <Typography variant="h4" fontWeight={900} sx={{ 
                letterSpacing: -1, mb: 1,
                background: 'linear-gradient(45deg, #0ea5e9 30%, #6366f1 90%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
              }}>
                Admin Portal
              </Typography>
              <Typography variant="body1" color="text.secondary" fontWeight={500}>
                IYF Orlando — Sign In
              </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}

            <Box component="form" onSubmit={handleLogin} sx={{ width: '100%' }}>
                <Stack spacing={2}>
                    <TextField 
                        label="Email" 
                        fullWidth 
                        variant="outlined" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <TextField 
                        label="Password" 
                        type="password" 
                        fullWidth 
                        variant="outlined" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={loading}
                        startIcon={<LoginIcon />}
                        sx={{
                            py: 1.5, borderRadius: 3, textTransform: 'none', fontSize: '1.05rem', fontWeight: 700,
                            background: 'linear-gradient(45deg, #0ea5e9 30%, #6366f1 90%)',
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </Stack>
            </Box>

            <Divider flexItem sx={{ typography: 'body2', color: 'text.secondary' }}>OR</Divider>

            <Button
              onClick={handleGoogleLogin}
              fullWidth
              startIcon={<GoogleIcon />}
              variant="outlined"
              size="large"
              sx={{ py: 1.5, borderRadius: 3, textTransform: 'none' }}
            >
              Sign In with Google
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Box>
  )
}
