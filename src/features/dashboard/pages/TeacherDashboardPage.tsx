import React from 'react'
import { 
  Box, Typography, Grid, Card, CardContent, Button, Chip, Stack, useTheme, alpha 
} from '@mui/material'
import { motion } from 'framer-motion'
import { 
  Users, CheckCircle, BookOpen, ChevronRight, Calendar
} from 'lucide-react'
import { useTeacherContext } from '../../auth/context/TeacherContext'
import { useNavigate } from 'react-router-dom'

// --- Components ---
const GlassCard = ({ children, sx = {}, ...props }: any) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  return (
    <Card
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      elevation={0}
      sx={{
        background: isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderRadius: 4,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.4)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        height: '100%',
        ...sx
      }}
      {...props}
    >
      {children}
    </Card>
  )
}

const StatCard = ({ label, value, icon: Icon, color, subtext }: any) => (
  <GlassCard>
    <CardContent>
      <Stack direction="row" alignItems="center" spacing={2} mb={2}>
        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(color, 0.15), color: color }}>
          <Icon size={24} />
        </Box>
        <Typography variant="h6" fontWeight={600} color="text.secondary">
          {label}
        </Typography>
      </Stack>
      <Typography variant="h3" fontWeight={800} sx={{ mb: 1 }}>
        {value}
      </Typography>
      {subtext && (
        <Typography variant="body2" color="text.secondary">
          {subtext}
        </Typography>
      )}
    </CardContent>
  </GlassCard>
)

export default function TeacherDashboardPage() {
  const { teacherProfile } = useTeacherContext()
  const navigate = useNavigate()
  const theme = useTheme()

  const classesCount = teacherProfile?.academies.length || 0
  const totalStudents = 0 // TODO: Calculate real student count
  
  // Get greeting based on time
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom sx={{ 
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {greeting}, {teacherProfile?.name.split(' ')[0]}! 👋
        </Typography>
        <Typography variant="h6" color="text.secondary" fontWeight={500}>
          Here's what's happening with your classes today.
        </Typography>
      </Box>

      {/* Stats Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            label="My Classes" 
            value={classesCount} 
            icon={BookOpen} 
            color={theme.palette.primary.main}
            subtext="Active courses assigned"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            label="Total Students" 
            value={totalStudents} 
            icon={Users} 
            color={theme.palette.success.main}
            subtext="Across all your classes"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard 
            label="Attendance Today" 
            value="0%" 
            icon={CheckCircle} 
            color={theme.palette.warning.main}
            subtext="Not taken yet"
          />
        </Grid>
      </Grid>

      {/* Class List Section */}
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>My Classes</Typography>
      <Grid container spacing={3}>
        {teacherProfile?.academies.map((cls, idx) => (
          <Grid key={idx} item xs={12} md={6}>
            <GlassCard sx={{ 
              transition: 'transform 0.2s', 
              '&:hover': { transform: 'translateY(-4px)' },
              cursor: 'pointer'
            }} onClick={() => navigate(`/attendance?class=${cls.academyId}`)}>
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="start">
                  <Box>
                    <Chip 
                      label={cls.level || 'Main Class'} 
                      size="small" 
                      color="primary" 
                      sx={{ mb: 1.5, fontWeight: 600 }} 
                    />
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                      {cls.academyName}
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                         <Users size={16} />
                         <Typography variant="body2" fontWeight={500}>-- Students</Typography>
                       </Box>
                       <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                         <Calendar size={16} />
                         <Typography variant="body2" fontWeight={500}>Spring 2026</Typography>
                       </Box>
                    </Stack>
                  </Box>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: '50%', 
                    bgcolor: 'action.hover',
                    display: 'flex'
                  }}>
                    <ChevronRight size={20} />
                  </Box>
                </Stack>

                <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                   <Button 
                    fullWidth 
                    variant="contained" 
                    startIcon={<CheckCircle size={18} />}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/attendance')
                    }}
                    sx={{ borderRadius: 2 }}
                   >
                     Take Attendance
                   </Button>
                </Box>
              </CardContent>
            </GlassCard>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
