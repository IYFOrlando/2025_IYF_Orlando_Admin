import * as React from 'react'
import { 
  Box, Typography, List, ListItemButton, ListItemText, 
  ListItemIcon, Divider, Button, Badge, Popover,
  IconButton, CircularProgress
} from '@mui/material'
import { Bell, ClipboardCheck, TrendingUp, Clock } from 'lucide-react'
import { useTeacherNotifications } from '../hooks/useTeacherNotifications'

interface TeacherNotificationsPanelProps {
  isAdmin: boolean
}

export default function TeacherNotificationsPanel({ isAdmin }: TeacherNotificationsPanelProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead 
  } = useTeacherNotifications(isAdmin)

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const getIcon = (action: string) => {
    if (action.toLowerCase().includes('attendance')) return <ClipboardCheck size={18} color="#2196F3" />
    if (action.toLowerCase().includes('progress')) return <TrendingUp size={18} color="#009688" />
    return <Clock size={18} color="#757575" />
  }

  const formatTime = (timestamp: any) => {
    if (!timestamp) return ''
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <>
      <IconButton 
        onClick={handleOpen}
        sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 1.2 }}
      >
        <Badge badgeContent={unreadCount} color="error" overlap="circular">
          <Bell size={18} />
        </Badge>
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ 
          sx: { 
            width: 360, 
            mt: 1.5, 
            borderRadius: 3, 
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          } 
        }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle1" fontWeight={700}>Activity Stream</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={markAllAsRead} sx={{ fontSize: '0.75rem' }}>
              Mark all as read
            </Button>
          )}
        </Box>

        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">No recent activity</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((n) => (
                <ListItemButton 
                  key={n.id} 
                  onClick={() => markAsRead(n.id)}
                  sx={{ 
                    bgcolor: n.isRead ? 'transparent' : 'action.hover',
                    borderLeft: n.isRead ? 'none' : '4px solid #2196F3',
                    py: 1.5
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getIcon(n.action)}
                  </ListItemIcon>
                  <ListItemText 
                    primary={
                      <Typography variant="body2" fontWeight={n.isRead ? 500 : 700}>
                        {n.teacherName} {n.action.toLowerCase()}
                      </Typography>
                    }
                    secondary={
                      <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {n.academy} • {formatTime(n.createdAt)}
                        </Typography>
                        {n.details && (
                          <Typography variant="caption" color="text.primary" sx={{ fontStyle: 'italic' }}>
                            "{n.details}"
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  {!n.isRead && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2196F3', ml: 1 }} />}
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
        
        <Divider />
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Real-time teacher activity monitoring
          </Typography>
        </Box>
      </Popover>
    </>
  )
}
