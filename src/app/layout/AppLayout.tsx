import * as React from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  AppBar, Toolbar, Typography, Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  IconButton, Divider, useMediaQuery, Stack
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import QueryStatsIcon from '@mui/icons-material/QueryStats'
import WarningIcon from '@mui/icons-material/Warning'

import ClassIcon from '@mui/icons-material/Class'
import ChecklistIcon from '@mui/icons-material/Checklist'
import InsightsIcon from '@mui/icons-material/Insights'
import AuthMenu from './AuthMenu'
import iyfLogo from '../../assets/logo/IYF_logo.png'

const DRAWER_WIDTH = 240

type Item = { to: string; label: string; icon: React.ReactNode }

const mainItems: Item[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/registrations', label: 'Registrations', icon: <PeopleAltIcon /> },
  { to: '/payments', label: 'Payments', icon: <ReceiptLongIcon /> },
  { to: '/attendance', label: 'Attendance', icon: <ChecklistIcon /> },
  { to: '/progress', label: 'Progress', icon: <InsightsIcon /> },
  { to: '/classes', label: 'Academies', icon: <ClassIcon /> },
]

const reportItems: Item[] = [
  { to: '/reports', label: 'Reports', icon: <QueryStatsIcon /> },
  { to: '/reports/invalid-academies', label: 'Invalid Academies', icon: <WarningIcon /> },
  // { to: '/reports/payments', label: 'Payments Report', icon: <AssessmentIcon /> },
  // { to: '/reports/registrations', label: 'Registrations Report', icon: <AssessmentIcon /> },
]

function NavItem({ to, label, icon }: Item) {
  const location = useLocation()
  const active = location.pathname === to
  return (
    <ListItemButton
      component={NavLink}
      to={to}
      sx={{
        borderRadius: 2,
        mx: 1,
        my: 0.5,
        '&.active, &[aria-current="page"], &:hover': { bgcolor: 'action.hover' },
      }}
      className={active ? 'active' : undefined}
    >
      <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
      <ListItemText primary={label} />
    </ListItemButton>
  )
}

interface AppLayoutProps {
  isAdmin?: boolean
  hasGmailAccess?: boolean
}

export default function AppLayout({ isAdmin = false, hasGmailAccess = false }: AppLayoutProps) {
  const [open, setOpen] = React.useState(false)
  const isMdUp = useMediaQuery('(min-width:900px)')

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 2 }}>
        <img src={iyfLogo} alt="IYF Logo" style={{ height: 32, width: 32, marginRight: 8 }} />
        <Typography variant="h6">IYF Admin</Typography>
        {!isMdUp && (
          <IconButton 
            onClick={() => setOpen(false)} 
            sx={{ ml: 'auto' }}
            size="small"
          >
            <MenuIcon />
          </IconButton>
        )}
      </Box>
      <Divider />
      <List sx={{ px: 0.5 }}>
        {mainItems.map(it => <NavItem key={it.to} {...it} />)}
      </List>
      <Divider sx={{ my: 1 }} />
      <Typography variant="overline" sx={{ px: 2, color: 'text.secondary' }}>Reports</Typography>
      <List sx={{ px: 0.5 }}>
        {reportItems.map(it => <NavItem key={it.to} {...it} />)}
      </List>
      <Box sx={{ flex: 1 }} />
      <Box sx={{ p: 2, fontSize: 12, color: 'text.secondary' }}>
        
        <b>IYF Orlando</b><br />
        📞 407-900-3442<br />
        📍 320 S Park Ave, Sanford, FL 32771<br />
        📧 orlando@iyfusa.org<br />
        🌐 www.iyforlando.org
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="fixed" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          {!isMdUp && (
            <IconButton edge="start" onClick={() => setOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <img src={iyfLogo} alt="IYF Logo" style={{ height: 40, width: 40, marginRight: 12 }} />
            <Typography variant="h6" noWrap>IYF Orlando — Admin</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <AuthMenu isAdmin={isAdmin} hasGmailAccess={hasGmailAccess} />
          </Stack>
        </Toolbar>
      </AppBar>

      {isMdUp ? (
        <Drawer
          variant="permanent"
          open
          PaperProps={{ sx: { width: DRAWER_WIDTH, borderRight: 1, borderColor: 'divider' } }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="temporary"
          open={open}
          onClose={() => setOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{ sx: { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
      )}

      <Box component="main" sx={{ flex: 1, pt: 8, px: 2, ...(isMdUp && { ml: `${DRAWER_WIDTH}px` }) }}>
        <Outlet />
      </Box>
    </Box>
  )
}
