import * as React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'
import PublicAccessPage from './PublicAccessPage'
import { useAuth } from '../../../context/AuthContext'
import { useTeacherContext } from '../../../features/auth/context/TeacherContext'
import { ADMIN_EMAILS } from '../../../lib/admin'

type Props = { children: React.ReactNode }

export default function AuthGate({ children }: Props) {
  const { currentUser } = useAuth()
  const { loading: teacherLoading } = useTeacherContext()

  // 1. If no user, show public access (Login)
  if (!currentUser) return <PublicAccessPage />

  // 2. If teacher profile is still loading, show spinner
  if (teacherLoading) {
    return (
      <Box sx={{ minHeight: '70vh', flexDirection: 'column', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <CircularProgress />
        <Typography>Loading Profile...</Typography>
      </Box>
    )
  }

  // 3. Pass props to children (Legacy support if needed, though Context is better)
  const email = currentUser.email || ''
  const isAdmin = ADMIN_EMAILS.includes(email)
  // hasGmailAccess removed - strict security enforced in AppLayout and Rules

  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { isAdmin } as any)
    }
    return child
  })

  return <>{childrenWithProps}</>
}
