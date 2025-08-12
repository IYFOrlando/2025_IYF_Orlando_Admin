import * as React from 'react'
import { onAuthStateChanged, getAuth, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { Box, CircularProgress, Stack, Typography, Button } from '@mui/material'
import PublicAccessPage from './PublicAccessPage'
import { ADMIN_EMAILS } from '../../../lib/admin'

type Props = { children: React.ReactNode }

export default function AuthGate({ children }: Props) {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [firebaseError, setFirebaseError] = React.useState<string | null>(null)

  React.useEffect(() => {
    // Check if Firebase is configured
    if (!import.meta.env.VITE_FIREBASE_API_KEY) {
      setFirebaseError('Firebase not configured. Please check environment variables.')
      setLoading(false)
      return
    }

    try {
      const auth = getAuth()
      return onAuthStateChanged(auth, (u) => {
        setUser(u)
        setLoading(false)
      }, (error) => {
        setFirebaseError('Firebase authentication error: ' + error.message)
        setLoading(false)
      })
    } catch (error: any) {
      setFirebaseError('Firebase initialization error: ' + error.message)
      setLoading(false)
    }
  }, [])

  if (loading) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (firebaseError) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'grid', 
        placeItems: 'center', 
        p: 2,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Stack spacing={2} alignItems="center" sx={{ maxWidth: 500, textAlign: 'center' }}>
          <Typography variant="h5" color="white" fontWeight={800}>
            Configuration Error
          </Typography>
          <Typography variant="body1" color="white">
            {firebaseError}
          </Typography>
          <Typography variant="body2" color="white" sx={{ opacity: 0.8 }}>
            Please contact the administrator to fix this issue.
          </Typography>
        </Stack>
      </Box>
    )
  }

  if (!user) return <PublicAccessPage />

    // Check if user is admin or has Gmail access
  const isAdmin = ADMIN_EMAILS.includes(user.email || '')
  const hasGmailAccess = user.email?.endsWith('@gmail.com') || false
  
  // Debug: Log the authorization logic
  console.log('🔐 AuthGate Debug:', {
    userEmail: user.email,
    isAdmin,
    hasGmailAccess,
    adminEmails: ADMIN_EMAILS,
    timestamp: new Date().toISOString()
  })

  if (!isAdmin && !hasGmailAccess) {
    return (
      <Stack
        sx={{ minHeight: '70vh', alignItems: 'center', justifyContent: 'center', p: 3 }}
        spacing={2}
      >
        <Typography variant="h6">Not authorized</Typography>
        <Typography variant="body2" color="text.secondary">
          This account ({user.email}) is not authorized. Only Gmail accounts are allowed for read-only access.
        </Typography>
        <Button onClick={() => signOut(getAuth())} variant="contained">
          Sign out
        </Button>
      </Stack>
    )
  }

  // Pass admin status to children (Gmail users get read-only access)
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { isAdmin, hasGmailAccess } as any)
    }
    return child
  })

  return <>{childrenWithProps}</>
}
