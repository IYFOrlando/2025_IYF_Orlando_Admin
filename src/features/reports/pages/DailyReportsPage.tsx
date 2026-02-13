import * as React from 'react'
import {
  Box, Card, CardContent, Typography, Grid, Stack, Chip, Divider, useTheme
} from '@mui/material'
import { motion } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Users, DollarSign, Calendar,
  CheckCircle, AlertCircle, School
} from 'lucide-react'
import { useSupabaseRegistrations } from '../../registrations/hooks/useSupabaseRegistrations'
import { useSupabaseInvoices } from '../../payments/hooks/useSupabaseInvoices'
import { useSupabasePayments } from '../../payments/hooks/useSupabasePayments'
import { latestInvoicePerStudent } from '../../payments/utils'
import { usd } from '../../../lib/query'
import { displayYMD } from '../../../lib/date'

// Glass Card Component
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
        borderRadius: 3,
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

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }: any) => (
  <GlassCard>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 1, mb: 0.5 }}>
            {value}
          </Typography>
          {trend && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              {trend === 'up' ? (
                <TrendingUp size={16} color="#4CAF50" />
              ) : (
                <TrendingDown size={16} color="#F44336" />
              )}
              <Typography variant="caption" color={trend === 'up' ? 'success.main' : 'error.main'}>
                {trendValue}
              </Typography>
            </Stack>
          )}
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: `${color}20`,
            color: color,
            display: 'flex'
          }}
        >
          <Icon size={24} />
        </Box>
      </Stack>
    </CardContent>
  </GlassCard>
)

export default function DailyReportsPage() {
  const { data: registrations = [] } = useSupabaseRegistrations()
  const { data: allInvoices = [] } = useSupabaseInvoices()
  const { data: payments = [] } = useSupabasePayments()
  
  const latestInvoices = React.useMemo(() => latestInvoicePerStudent(allInvoices), [allInvoices])

  // Calculate today's data
  const stats = React.useMemo(() => {
    const today = displayYMD(new Date())
    const yesterday = displayYMD(new Date(Date.now() - 86400000))
    
    // Registrations
    const todayRegs = registrations.filter(r => displayYMD(r.createdAt) === today)
    const yesterdayRegs = registrations.filter(r => displayYMD(r.createdAt) === yesterday)
    
    // Payments
    const todayPayments = payments.filter(p => displayYMD(p.createdAt) === today)
    const yesterdayPayments = payments.filter(p => displayYMD(p.createdAt) === yesterday)
    const todayRevenue = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const yesterdayRevenue = yesterdayPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    
    // Financial overview
    const totalRevenue = allInvoices.reduce((sum, inv) => sum + (inv.paid ?? 0), 0)
    const totalPending = latestInvoices.reduce((sum, inv) => sum + (inv.balance ?? 0), 0)
    const paidCount = latestInvoices.filter(inv => inv.status === 'paid').length
    const unpaidCount = latestInvoices.filter(inv => inv.status === 'unpaid').length
    
    // Academy breakdown (today)
    const academyMap = new Map<string, number>()
    todayRegs.forEach(r => {
      const academies = (r as any).selectedAcademies || [r.firstPeriod, r.secondPeriod].filter(Boolean)
      academies.forEach((a: any) => {
        if (a?.academy) {
          academyMap.set(a.academy, (academyMap.get(a.academy) || 0) + 1)
        }
      })
    })
    const academyStats = Array.from(academyMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    return {
      today: {
        registrations: todayRegs.length,
        payments: todayPayments.length,
        revenue: todayRevenue,
        newStudents: todayRegs
      },
      yesterday: {
        registrations: yesterdayRegs.length,
        revenue: yesterdayRevenue
      },
      overall: {
        totalRevenue,
        totalPending,
        paidCount,
        unpaidCount
      },
      academies: academyStats
    }
  }, [registrations, payments, allInvoices, latestInvoices])

  const regTrend = stats.today.registrations > stats.yesterday.registrations ? 'up' : stats.today.registrations < stats.yesterday.registrations ? 'down' : undefined
  const revTrend = stats.today.revenue > stats.yesterday.revenue ? 'up' : stats.today.revenue < stats.yesterday.revenue ? 'down' : undefined

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={800} sx={{
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 1
        }}>
          Daily Report
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Calendar size={18} />
          <Typography variant="body1" color="text.secondary">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Typography>
        </Stack>
      </Box>

      {/* Today's Stats */}
      <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
        📊 Today's Activity
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="New Registrations"
            value={stats.today.registrations}
            icon={Users}
            color="#2196F3"
            trend={regTrend}
            trendValue={regTrend ? `${Math.abs(stats.today.registrations - stats.yesterday.registrations)} vs yesterday` : 'Same as yesterday'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Payments Received"
            value={stats.today.payments}
            icon={DollarSign}
            color="#4CAF50"
            trend={undefined}
            trendValue={undefined}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Revenue Today"
            value={usd(stats.today.revenue)}
            icon={DollarSign}
            color="#FF9800"
            trend={revTrend}
            trendValue={revTrend ? `${usd(Math.abs(stats.today.revenue - stats.yesterday.revenue))} vs yesterday` : 'Same as yesterday'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Outstanding"
            value={usd(stats.overall.totalPending)}
            icon={AlertCircle}
            color="#F44336"
            trend={undefined}
            trendValue={`${stats.overall.unpaidCount} students`}
          />
        </Grid>
      </Grid>

      {/* Two Column Layout */}
      <Grid container spacing={3}>
        {/* Left Column: New Students */}
        <Grid item xs={12} md={6}>
          <GlassCard>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                🆕 New Students Today
              </Typography>
              {stats.today.newStudents.length > 0 ? (
                <Stack spacing={2} sx={{ mt: 2 }}>
                  {stats.today.newStudents.map((student, idx) => (
                    <Box
                      key={student.id}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(33, 150, 243, 0.05)',
                        border: '1px solid rgba(33, 150, 243, 0.1)'
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body1" fontWeight={600}>
                            {idx + 1}. {student.firstName} {student.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {student.email}
                          </Typography>
                        </Box>
                        <Chip
                          label={(student as any).selectedAcademies?.[0]?.academy || 'N/A'}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">No new registrations today</Typography>
                </Box>
              )}
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Right Column: Popular Academies + Payment Status */}
        <Grid item xs={12} md={6}>
          <Stack spacing={3}>
            {/* Popular Academies Today */}
            <GlassCard>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  🔥 Popular Academies Today
                </Typography>
                {stats.academies.length > 0 ? (
                  <Stack spacing={1.5} sx={{ mt: 2 }}>
                    {stats.academies.map((academy, idx) => (
                      <Stack key={academy.name} direction="row" alignItems="center" spacing={2}>
                        <Chip
                          label={idx + 1}
                          size="small"
                          sx={{
                            minWidth: 32,
                            bgcolor: '#2196F3',
                            color: 'white',
                            fontWeight: 700
                          }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" fontWeight={600}>
                              {academy.name}
                            </Typography>
                            <Typography variant="body2" fontWeight={700} color="primary">
                              {academy.count} student{academy.count > 1 ? 's' : ''}
                            </Typography>
                          </Stack>
                        </Box>
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Box sx={{ py: 2, textAlign: 'center' }}>
                    <Typography color="text.secondary">No academies selected today</Typography>
                  </Box>
                )}
              </CardContent>
            </GlassCard>

            {/* Payment Status Overview */}
            <GlassCard>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  💰 Overall Payment Status
                </Typography>
                <Stack spacing={2} sx={{ mt: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CheckCircle size={18} color="#4CAF50" />
                      <Typography variant="body2">Fully Paid</Typography>
                    </Stack>
                    <Typography variant="body2" fontWeight={700} color="success.main">
                      {stats.overall.paidCount} students
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <AlertCircle size={18} color="#F44336" />
                      <Typography variant="body2">Unpaid</Typography>
                    </Stack>
                    <Typography variant="body2" fontWeight={700} color="error.main">
                      {stats.overall.unpaidCount} students
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <School size={18} color="#2196F3" />
                      <Typography variant="body2">Total Students</Typography>
                    </Stack>
                    <Typography variant="body2" fontWeight={700}>
                      {registrations.length}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </GlassCard>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}
