import * as React from 'react'
import { onAuthStateChanged, getAuth, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { Box, CircularProgress, Stack, Typography, Button } from '@mui/material'
import LoginPage from './LoginPage'
import { ADMIN_EMAILS } from '../../../lib/admin'

type Props = { children: React.ReactNode }

export default function AuthGate({ children }: Props) {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const auth = getAuth()
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!user) return <LoginPage />

  // UI allowlist (real security is in Firestore rules)
  const allowed =
    ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(user.email || '')

  if (!allowed) {
    return (
      <Stack
        sx={{ minHeight: '70vh', alignItems: 'center', justifyContent: 'center', p: 3 }}
        spacing={2}
      >
        <Typography variant="h6">Not authorized</Typography>
        <Typography variant="body2" color="text.secondary">
          This account ({user.email}) is not on the admin list.
        </Typography>
        <Button onClick={() => signOut(getAuth())} variant="contained">
          Sign out
        </Button>
      </Stack>
    )
  }

  return <>{children}</>
}
