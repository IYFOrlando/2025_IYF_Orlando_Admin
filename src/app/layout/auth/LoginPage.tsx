import { Box, Paper, Typography, Button, Stack, useTheme, Avatar } from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { Alert as SAlert } from '../../../lib/alerts' // reuse SweetAlert for errors
import { motion } from 'framer-motion'
import iyfLogo from '../../../assets/logo/IYF_logo.png'

export default function LoginPage() {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

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
      {/* Background blobs for premium feel */}
      <Box
        component={motion.div}
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, -30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        sx={{
          position: 'absolute',
          top: '10%',
          left: '15%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(14, 165, 233, 0) 70%)',
          filter: 'blur(60px)',
          zIndex: 0
        }}
      />
      <Box
        component={motion.div}
        animate={{
          scale: [1.2, 1, 1.2],
          x: [0, -40, 0],
          y: [0, 40, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear"
        }}
        sx={{
          position: 'absolute',
          bottom: '10%',
          right: '15%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0) 70%)',
          filter: 'blur(80px)',
          zIndex: 0
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
                sx={{
                  width: 100,
                  height: 100,
                  mb: 1,
                  filter: 'drop-shadow(0 10px 15px rgba(0, 0, 0, 0.1))'
                }}
              />
            </motion.div>

            <Box>
              <Typography variant="h4" fontWeight={900} sx={{ 
                letterSpacing: -1, 
                mb: 1,
                background: 'linear-gradient(45deg, #0ea5e9 30%, #6366f1 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                Admin Portal
              </Typography>
              <Typography variant="body1" color="text.secondary" fontWeight={500}>
                IYF Orlando — Academy Management
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 280, opacity: 0.8 }}>
              Please use your authorized Google account to access the administrative dashboard.
            </Typography>

            <Button
              onClick={handleGoogle}
              fullWidth
              startIcon={<GoogleIcon />}
              variant="contained"
              size="large"
              sx={{
                py: 1.8,
                borderRadius: 3,
                textTransform: 'none',
                fontSize: '1.1rem',
                fontWeight: 700,
                background: 'linear-gradient(45deg, #0ea5e9 30%, #6366f1 90%)',
                boxShadow: '0 10px 15px -3px rgba(14, 165, 233, 0.3)',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 20px 25px -5px rgba(14, 165, 233, 0.4)',
                  filter: 'brightness(1.1)'
                }
              }}
            >
              Sign In with Google
            </Button>
            
            <Typography variant="caption" color="text.disabled" sx={{ mt: 2 }}>
              © {new Date().getFullYear()} International Youth Fellowship
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </Box>
  )
}
