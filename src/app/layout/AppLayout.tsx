import * as React from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar, Toolbar, Typography, Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  IconButton, Stack, useMediaQuery, useTheme, InputBase, Avatar,
  Dialog, Tooltip, CircularProgress
} from '@mui/material'
import { 
  Menu as MenuIcon, 
  LayoutDashboard, Users, CreditCard, 
  ClipboardCheck, TrendingUp, 
  HeartHandshake, Mail, FileText, AlertTriangle,
  Search, ChevronRight, Command,
  UserPlus,
  History,
  Settings,
  School
} from 'lucide-react'

import AuthMenu from './AuthMenu'
import iyfLogo from '../../assets/logo/IYF_logo.png'
import { useTeacherContext } from '../../features/auth/context/TeacherContext'
import TeacherLayout from '../../features/teacher/components/TeacherLayout'
import TeacherNotificationsPanel from '../../features/dashboard/components/TeacherNotificationsPanel'

const DRAWER_WIDTH = 280

type Item = { to: string; label: string; icon: React.ReactNode; adminOnly?: boolean }

const overviewItems: Item[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/analytics', label: 'Analytics', icon: <TrendingUp size={20} /> },
]

const academicItems: Item[] = [
  { to: '/classes', label: 'Classes', icon: <School size={20} /> },
  { to: '/academies-management', label: 'Academy Settings', icon: <Settings size={20} />, adminOnly: true },
  { to: '/progress', label: 'Progress', icon: <TrendingUp size={20} /> },
  { to: '/attendance', label: 'Attendance', icon: <ClipboardCheck size={20} /> },
]

const peopleItems: Item[] = [
  { to: '/registrations', label: 'Registrations', icon: <Users size={20} /> },
  { to: '/payments', label: 'Payments', icon: <CreditCard size={20} /> },
  { to: '/volunteers', label: 'Volunteers', icon: <HeartHandshake size={20} /> },
  { to: '/teachers', label: 'Teachers', icon: <UserPlus size={20} />, adminOnly: true },
  { to: '/emails', label: 'Email Database', icon: <Mail size={20} /> },
]

const systemItems: Item[] = [
  { to: '/reports', label: 'Reports', icon: <FileText size={20} /> },
  { to: '/dashboard/activity-log', label: 'Audit Log', icon: <History size={20} />, adminOnly: true },
  { to: '/reports/invalid-academies', label: 'Data Issues', icon: <AlertTriangle size={20} /> },
]

const allItems = [...overviewItems, ...academicItems, ...peopleItems, ...systemItems]

interface NavItemProps extends Item {
  onNavClick?: () => void
}

function NavItem({ to, label, icon, onNavClick }: NavItemProps) {
  const location = useLocation()
  const active = location.pathname === to
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'))
  
  return (
    <Tooltip title={label} placement="right" arrow disableHoverListener={isLgUp}>
      <ListItemButton
        component={NavLink}
        to={to}
        onClick={onNavClick}
        sx={{
          borderRadius: '16px',
          mx: 2,
          my: 0.5,
          px: 2,
          py: 1.2,
          transition: 'all 0.2s ease-in-out',
          color: active ? (isDark ? '#38bdf8' : '#0ea5e9') : 'text.secondary',
          background: active 
            ? (isDark ? 'rgba(56, 189, 248, 0.1)' : 'rgba(14, 165, 233, 0.08)') 
            : 'transparent',
          border: '1px solid',
          borderColor: active 
            ? (isDark ? 'rgba(56, 189, 248, 0.2)' : 'rgba(14, 165, 233, 0.1)') 
            : 'transparent',
          '&:hover': {
            background: active 
              ? (isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(14, 165, 233, 0.12)') 
              : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
            transform: 'translateX(3px)',
          },
        }}
      >
        <ListItemIcon 
          sx={{ 
            minWidth: 40,
            color: 'inherit',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText 
          primary={label} 
          primaryTypographyProps={{ 
            fontSize: 14, 
            fontWeight: active ? 600 : 500,
            fontFamily: '"Inter", sans-serif'
          }} 
        />
        {active && <ChevronRight size={16} style={{ opacity: 0.5 }} />}
      </ListItemButton>
    </Tooltip>
  )
}

interface AppLayoutProps {
  isAdmin?: boolean
  hasGmailAccess?: boolean
}

function AdminLayout({ isAdmin = false, hasGmailAccess = false }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const theme = useTheme()
  const isLgUp = useMediaQuery(theme.breakpoints.up('lg'))
  const isDark = theme.palette.mode === 'dark'
  const navigate = useNavigate()

  // Interaction States
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  // --- Search Logic ---
  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const term = searchQuery.toLowerCase()
      const found = allItems.find(i => i.label.toLowerCase().includes(term))
      if (found) {
        navigate(found.to)
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
  }

  const filteredItems = searchQuery 
    ? allItems.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  const drawerContent = (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      // Premium subtle gradient background
      background: isDark 
        ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)'
        : 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
    }}>
      {/* Brand */}
      <Box sx={{ px: 3, py: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
         <Avatar 
           src={iyfLogo} 
           sx={{ 
             width: 40, height: 40, 
             boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)' 
           }} 
         />
         <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ lineHeight: 1.1, letterSpacing: -0.2 }}>
              IYF ADMIN
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              Orlando Academy
            </Typography>
         </Box>
      </Box>

      {/* Nav */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 0, pb: 2 }}>
        
        {/* Overview */}
        <Box sx={{ px: 3, mb: 1, mt: 2 }}>
          <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ letterSpacing: 0.5 }}>
            OVERVIEW
          </Typography>
        </Box>
        <List disablePadding>
          {overviewItems.filter(it => !it.adminOnly || isAdmin).map(it => <NavItem key={it.to} {...it} onNavClick={!isLgUp ? handleDrawerToggle : undefined} />)}
        </List>

        {/* Academic */}
        <Box sx={{ px: 3, mb: 1, mt: 3 }}>
          <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ letterSpacing: 0.5 }}>
            ACADEMIC
          </Typography>
        </Box>
        <List disablePadding>
          {academicItems.filter(it => !it.adminOnly || isAdmin).map(it => <NavItem key={it.to} {...it} onNavClick={!isLgUp ? handleDrawerToggle : undefined} />)}
        </List>

        {/* People */}
        <Box sx={{ px: 3, mb: 1, mt: 3 }}>
          <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ letterSpacing: 0.5 }}>
            PEOPLE & OPS
          </Typography>
        </Box>
        <List disablePadding>
          {peopleItems.filter(it => !it.adminOnly || isAdmin).map(it => <NavItem key={it.to} {...it} onNavClick={!isLgUp ? handleDrawerToggle : undefined} />)}
        </List>

        {/* System */}
        <Box sx={{ px: 3, mb: 1, mt: 3 }}>
          <Typography variant="caption" fontWeight={700} color="text.disabled" sx={{ letterSpacing: 0.5 }}>
            SYSTEM
          </Typography>
        </Box>
         <List disablePadding>
           {systemItems.filter(it => !it.adminOnly || isAdmin).map(it => <NavItem key={it.to} {...it} onNavClick={!isLgUp ? handleDrawerToggle : undefined} />)}
         </List>
      </Box>

      {/* Footer / Support Info */}
      <Box sx={{ p: 2 }}>
        <Box 
          sx={{ 
            p: 2.5, 
            borderRadius: 3, 
            bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Stack spacing={1}>
             <Typography variant="subtitle2" fontWeight={800}>Need Assistance?</Typography>
             <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
               📞 407-900-3442
             </Typography>
             <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
               📧 orlando@iyfusa.org
             </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      
      {/* Header */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{
          // Only shift on Desktop
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { lg: `${DRAWER_WIDTH}px` },
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          height: 80,
          color: 'text.primary',
          transition: 'all 0.3s ease',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ height: '100%', px: { xs: 2, md: 4 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { lg: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* Search Bar - Opens Modal */}
          <Box 
            onClick={() => setSearchOpen(true)}
            sx={{ 
              display: { xs: 'none', md: 'flex' }, 
              alignItems: 'center',
              bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              borderRadius: '12px',
              px: 2,
              py: 1,
              width: 300,
              gap: 1.5,
              border: '1px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                 bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                 borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
              }
            }}
          >
            <Search size={18} opacity={0.5} />
            <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>Search pages...</Typography>
            <Box sx={{ 
              border: '1px solid', 
              borderColor: 'divider', 
              borderRadius: 1, 
              px: 0.8, py: 0.2, 
              fontSize: 10, 
              opacity: 0.6 
            }}>⌘K</Box>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          {/* Right Actions */}
          <Stack direction="row" spacing={1} alignItems="center">
            {/* Real-time Notifications */}
            <TeacherNotificationsPanel isAdmin={isAdmin} />

            {/* Auth User */}
            <Box sx={{ ml: 1 }}>
              <AuthMenu isAdmin={isAdmin} hasGmailAccess={hasGmailAccess} />
            </Box>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* --- Popovers & Dialogs --- */}




      {/* 3. Global Search Dialog */}
      <Dialog 
        open={searchOpen} 
        onClose={() => setSearchOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, bgcolor: 'background.paper' } }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Search size={24} color={theme.palette.text.secondary} />
          <InputBase 
            autoFocus
            fullWidth
            placeholder="Search pages..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            sx={{ fontSize: 18 }}
          />
          <Box sx={{ bgcolor: 'action.hover', px: 1, py: 0.5, borderRadius: 1 }}>
            <Typography variant="caption">ESC</Typography>
          </Box>
        </Box>
        <Box sx={{ p: 0, minHeight: 100 }}>
          {searchQuery && filteredItems.length > 0 && (
            <List>
               {filteredItems.map(item => (
                 <ListItemButton key={item.to} onClick={() => { navigate(item.to); setSearchOpen(false); }}>
                   <ListItemIcon>{item.icon}</ListItemIcon>
                   <ListItemText primary={item.label} secondary={`Go to ${item.label}`} />
                   <ChevronRight size={16} opacity={0.5} />
                 </ListItemButton>
               ))}
            </List>
          )}
          {searchQuery && filteredItems.length === 0 && (
             <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                <Typography variant="body2">No results found for "{searchQuery}"</Typography>
             </Box>
          )}
          {!searchQuery && (
             <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
               <Command size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
               <Typography variant="body2">Type to search across the admin panel</Typography>
             </Box>
          )}
        </Box>
      </Dialog>
      
      {/* -------------------- */}

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH, border: 'none' },
        }}
      >
        <Box sx={{ 
          height: '100%', 
          width: '100%',
          background: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)'
        }}>
          {drawerContent}
        </Box>
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: DRAWER_WIDTH, 
            borderRight: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            bgcolor: 'background.paper'
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          // FIX: Add left margin for desktop to prevent overlap
          ml: { lg: `${DRAWER_WIDTH}px` },
          width: { lg: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          bgcolor: isDark ? '#0f172a' : '#f8fafc'
        }}
      >
        <Toolbar sx={{ height: 80 }} />
        
        <Box sx={{ p: { xs: 2, md: 4, lg: 6 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}

export default function AppLayout(props: AppLayoutProps) {
  const { role, loading } = useTeacherContext()

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh', 
          gap: 2,
          bgcolor: 'background.default' 
        }}
      >
        <CircularProgress size={40} thickness={5} />
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          Loading Profile...
        </Typography>
      </Box>
    )
  }

  if (role === 'teacher') {
    return <TeacherLayout />
  }

  return <AdminLayout {...props} />
}
