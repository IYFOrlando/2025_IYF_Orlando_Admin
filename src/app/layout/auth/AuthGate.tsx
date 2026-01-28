import * as React from 'react'
import { getAuth, signOut } from 'firebase/auth'
import { Box, CircularProgress, Stack, Typography, Button } from '@mui/material'
import PublicAccessPage from './PublicAccessPage'
import { ADMIN_EMAILS } from '../../../lib/admin'
import { useAuth } from '../../../context/AuthContext'
import { useTeacherContext } from '../../../features/auth/context/TeacherContext'

type Props = { children: React.ReactNode }

export default function AuthGate({ children }: Props) {
  const { currentUser } = useAuth()
  const { isTeacher, loading: teacherLoading } = useTeacherContext()

  // 1. If no user, show public access (Login)
  if (!currentUser) return <PublicAccessPage />

  // 2. If teacher profile is still loading, show spinner
  // (We know user is logged in, but we need to know if they are a teacher to Authorize)
  if (teacherLoading) {
    return (
      <Box sx={{ minHeight: '70vh', flexDirection: 'column', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <CircularProgress />
        <Typography>Loading Profile...</Typography>
      </Box>
    )
  }

  // 3. Permission Check
  const email = currentUser.email || ''
  const isAdmin = ADMIN_EMAILS.includes(email)
  const hasGmailAccess = email.endsWith('@gmail.com')

  // If not Admin, not Gmail viewer, AND not Teacher -> Block
  if (!isAdmin && !hasGmailAccess && !isTeacher) {
    return (
      <Stack
        sx={{ minHeight: '70vh', alignItems: 'center', justifyContent: 'center', p: 3 }}
        spacing={2}
      >
        <Typography variant="h6">Not authorized</Typography>
        <Typography variant="body2" color="text.secondary">
          This account ({email}) is not authorized.
        </Typography>
        <Button onClick={() => signOut(getAuth())} variant="contained">
          Sign out
        </Button>
      </Stack>
    )
  }

  // 4. Pass props to children
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { isAdmin, hasGmailAccess } as any)
    }
    return child
  })

  return <>{childrenWithProps}</>
}
