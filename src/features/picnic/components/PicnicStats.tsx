import { Box, Card, Typography, Grid, useTheme, Avatar } from '@mui/material'
import { Users, UserCheck, Utensils } from 'lucide-react'

interface PicnicStatsProps {
  totalRegistrations: number
  totalGuests: number
  totalPotluckItems: number
  loading: boolean
}

export default function PicnicStats({ totalRegistrations, totalGuests, totalPotluckItems, loading }: PicnicStatsProps) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const stats = [
    {
      label: 'Toal Registrations',
      value: totalRegistrations,
      icon: <UserCheck size={24} />,
      color: '#0a192f', // Navy Blue
      bg: 'rgba(10, 25, 47, 0.05)'
    },
    {
      label: 'Total Attendees',
      value: totalGuests,
      icon: <Users size={24} />,
      color: '#de4f25', // Orange / Gold Accent
      bg: 'rgba(222, 79, 37, 0.05)'
    },
    {
      label: 'Potluck Items',
      value: totalPotluckItems,
      icon: <Utensils size={24} />,
      color: '#475569', // Slate Gray
      bg: 'rgba(71, 85, 105, 0.05)'
    },
  ]

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {stats.map((stat, idx) => (
        <Grid item xs={12} md={4} key={idx}>
          <Card
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 4,
              border: '1px solid',
              borderColor: 'divider',
              background: isDark ? 'rgba(255,255,255,0.02)' : 'white',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.06)'
              }
            }}
          >
            <Avatar 
              sx={{ 
                bgcolor: stat.bg, 
                color: stat.color, 
                width: 56, 
                height: 56,
                border: '1px solid',
                borderColor: `${stat.color}20`
              }}
            >
              {stat.icon}
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ letterSpacing: 1, textTransform: 'uppercase' }}>
                {stat.label}
              </Typography>
              <Typography variant="h4" fontWeight={800} color={stat.color}>
                {loading ? '...' : stat.value}
              </Typography>
            </Box>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}
