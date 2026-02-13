// src/app/layout/AuthMenu.tsx
import * as React from 'react'
import {
  IconButton, Menu, MenuItem, ListItemIcon, ListItemText,
  Avatar, Tooltip, Chip, Stack
} from '@mui/material'
import Logout from '@mui/icons-material/Logout'
import Login from '@mui/icons-material/Login'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface AuthMenuProps {
  isAdmin?: boolean
  hasGmailAccess?: boolean
}

export default function AuthMenu({ isAdmin = false, hasGmailAccess = false }: AuthMenuProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const { currentUser, signOut } = useAuth()
  const navigate = useNavigate()
  const open = Boolean(anchorEl)

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleClose = () => setAnchorEl(null)

  const signIn = async () => {
    handleClose()
    navigate('/login')
  }

  const doSignOut = async () => {
    await signOut()
    handleClose()
  }

  if (!currentUser) {
    return (
      <Tooltip title="Sign in">
        <IconButton onClick={signIn} color="inherit" size="small" aria-label="sign in">
          <Login fontSize="small" />
        </IconButton>
      </Tooltip>
    )
  }

  const initials =
    (currentUser.email?.split('@')[0].substring(0, 2).toUpperCase() || 'U')

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center">
        {isAdmin && (
          <Chip
            icon={<AdminPanelSettingsIcon />}
            label="Admin"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 24 }}
          />
        )}
        {!isAdmin && hasGmailAccess && (
          <Chip
            icon={<VisibilityIcon />}
            label="Read-only"
            size="small"
            color="default"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 24 }}
          />
        )}
        <Tooltip title={currentUser.email || 'Account'}>
          <IconButton onClick={handleOpen} color="inherit" size="small" aria-label="account menu">
            <Avatar sx={{ width: 28, height: 28 }}>{initials}</Avatar>
          </IconButton>
        </Tooltip>
      </Stack>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        <MenuItem disabled>
          <ListItemIcon><ManageAccountsIcon fontSize="small" /></ListItemIcon>
          <ListItemText
            primary={currentUser.email}
            secondary={currentUser.email || ''}
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
