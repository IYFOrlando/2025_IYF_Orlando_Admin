// src/app/layout/AuthMenu.tsx
import * as React from 'react'
import {
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText,
  Avatar, Tooltip
} from '@mui/material'
import Logout from '@mui/icons-material/Logout'
import Login from '@mui/icons-material/Login'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import { auth } from '../../lib/firebase'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'

export default function AuthMenu() {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [user, setUser] = React.useState<any>(auth.currentUser || null)
  const open = Boolean(anchorEl)

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u))
    return () => unsub()
  }, [])

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleClose = () => setAnchorEl(null)

  const signIn = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
    handleClose()
  }

  const doSignOut = async () => {
    await signOut(auth)
    handleClose()
  }

  if (!user) {
    return (
      <Tooltip title="Sign in">
        <IconButton onClick={signIn} color="inherit" size="small" aria-label="sign in">
          <Login fontSize="small" />
        </IconButton>
      </Tooltip>
    )
  }

  const initials =
    (user.displayName?.split(' ').map((p: string) => p[0]).slice(0, 2).join('') || 'U').toUpperCase()

  return (
    <>
      <Tooltip title={user.email || 'Account'}>
        <IconButton onClick={handleOpen} color="inherit" size="small" aria-label="account menu">
          <Avatar sx={{ width: 28, height: 28 }}>{initials}</Avatar>
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem disabled>
          <ListItemIcon><ManageAccountsIcon fontSize="small" /></ListItemIcon>
          <ListItemText
            primary={user.displayName || user.email}
            secondary={user.email || ''}
          />
        </MenuItem>
        <MenuItem onClick={doSignOut}>
          <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
          <ListItemText primary="Sign out" />
        </MenuItem>
      </Menu>
    </>
  )
}
