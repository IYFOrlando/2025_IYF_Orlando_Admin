import * as React from 'react'
import {
  Grid, Card, CardContent, Typography, Box, Button, useTheme, Chip, Stack
} from '@mui/material'
import { useRegistrations } from '../../registrations/hooks/useRegistrations'
import { useInvoices } from '../../payments/hooks/useInvoices'
import { latestInvoicePerStudent } from '../../payments/utils'
import { useAutoInvoice } from '../../registrations/hooks/useAutoInvoice'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { displayYMD } from '../../../lib/date'
import { normalizeAcademy, normalizeLevel } from '../../../lib/normalization'
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import { motion } from 'framer-motion'
import { 
  Download, Users, School, TrendingUp, DollarSign, Clock,
  Plus, CreditCard, FileText, AlertCircle, CheckCircle, XCircle
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// --- Types ---
type CountRow = { academy: string; count: number }
type KoreanLevelRow = { level: string; count: number }

// --- Animation ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
}
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 100 } }
}

// --- Components ---
const GlassCard = ({ children, sx = {}, ...props }: any) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  return (
    <Card
      component={motion.div}
      variants={itemVariants}
      elevation={0}
      sx={{
        background: isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(12px)',
        borderRadius: 4,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.4)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        height: '100%',
        overflow: 'visible',
        ...sx
      }}
      {...props}
    >
      {children}
    </Card>
  )
}

const StatValue = ({ value, label, icon: Icon, color, subValue }: any) => (
  <Box>
    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
      <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}20`, color: color, display: 'flex' }}>
        <Icon size={20} />
      </Box>
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
    </Stack>
    <Typography variant="h3" fontWeight={800} sx={{ letterSpacing: -1 }}>
      {value}
    </Typography>
    {subValue && (
      <Typography variant="caption" color="text.secondary" fontWeight={500}>
        {subValue}
      </Typography>
    )}
  </Box>
)

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1']

import { useTeacherContext } from '../../auth/context/TeacherContext'
import TeacherDashboardPage from './TeacherDashboardPage'

// Old "DashboardPage" becomes "AdminDashboard"
function AdminDashboard() {
  const theme = useTheme()
  const navigate = useNavigate()
  // ... existing hooks
  const { data: registrations, loading: regLoading } = useRegistrations()
  const { data: invoices, loading: invLoading } = useInvoices()
  
  // Auto-invoice hook
  useAutoInvoice(true)

  // ... existing calculation logic ...
  const { totals, academyRows, koreanLevelRows, dailyStats, financialStats, unpaidCount, partialPaidCount } = React.useMemo(() => {
    // 1. Registration Stats
    const academies = new Map<string, number>()
    const koreanLevels = new Map<string, number>()
    const dailyCounts = new Map<string, number>()

    for (const r of registrations) {
      // Daily Trend
      if (r.createdAt) {
        const dateStr = displayYMD(r.createdAt)
        if (dateStr) {
          dailyCounts.set(dateStr, (dailyCounts.get(dateStr) || 0) + 1)
        }
      }

      // Academies
      if ((r as any).selectedAcademies && Array.isArray((r as any).selectedAcademies)) {
        (r as any).selectedAcademies.forEach((a: any) => {
          if (a.academy && normalizeAcademy(a.academy) !== 'n/a') {
            const key = normalizeAcademy(a.academy)
            academies.set(key, (academies.get(key) || 0) + 1)
            if (key === 'korean language' && a.level) {
              const lvl = normalizeLevel(a.level)
              koreanLevels.set(lvl, (koreanLevels.get(lvl) || 0) + 1)
            }
          }
        })
      } else {
        // Legacy
        const check = (a: any, l: any) => {
          if (a && normalizeAcademy(a) !== 'n/a') {
            const key = normalizeAcademy(a)
            academies.set(key, (academies.get(key) || 0) + 1)
            if (key === 'korean language' && l) {
              const lvl = normalizeLevel(l)
              koreanLevels.set(lvl, (koreanLevels.get(lvl) || 0) + 1)
            }
          }
        }
        check(r.firstPeriod?.academy, r.firstPeriod?.level)
        check(r.secondPeriod?.academy, r.secondPeriod?.level)
      }
    }

    const dailyStats = Array.from(dailyCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const academyRows: CountRow[] = Array.from(academies.entries())
      .map(([academy, count]) => ({ academy, count }))
      .sort((a, b) => b.count - a.count)
    
    const koreanLevelRows: KoreanLevelRow[] = Array.from(koreanLevels.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count)

    const totalAcademies = Array.from(academies.values()).reduce((a, b) => a + b, 0)

    // 2. Financial Stats — one invoice per student (the latest); older ones are history and don't count
    const latest = latestInvoicePerStudent(invoices)
    // Use only latest invoices for collected amount to avoid double-counting
    const totalCollected = latest.reduce((sum, inv) => sum + (inv.paid ?? 0), 0)
    const totalPending = latest.reduce((sum, inv) => sum + (inv.balance ?? 0), 0)
    const fullyPaidCount = latest.filter(inv => inv.status === 'paid').length
    const partialPaidCount = latest.filter(inv => inv.status === 'partial').length
    const unpaidCount = latest.filter(inv => inv.status === 'unpaid').length
    const withBalance = latest.filter(inv => (inv.balance ?? 0) > 0)
    const invoicesWithBalance = withBalance.length
    const studentsWithBalance = withBalance.length

    // Payment Status Breakdown for chart
    const paymentStatusData = [
      { status: 'Paid', count: fullyPaidCount, color: '#4CAF50' },
      { status: 'Partial', count: partialPaidCount, color: '#FF9800' },
      { status: 'Unpaid', count: unpaidCount, color: '#F44336' }
    ].filter(item => item.count > 0)

    // Today's Registrations
    const todayStr = displayYMD(new Date())
    const registrationsToday = dailyCounts.get(todayStr) || 0

    return {
      totals: {
        registrations: registrations.length,
        totalAcademies,
        registrationsToday
      },
      academyRows,
      koreanLevelRows,
      dailyStats,
      financialStats: {
        collected: totalCollected,
        pending: totalPending,
        paidInvoices: fullyPaidCount,
        paymentStatusData,
        invoicesWithBalance,
        studentsWithBalance
      },
      unpaidCount,
      partialPaidCount
    }
  }, [registrations, invoices])

  const loading = regLoading || invLoading

  // Setup PDF export
  const exportPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const marginX = 40
    doc.setFontSize(24).text('IYF Dashboard Report', marginX, 40)
    autoTable(doc, {
      startY: 60,
      head: [['Metric', 'Value']],
      body: [
        ['Total Registrations', String(totals.registrations)],
        ['Total Revenue (Collected)', formatCurrency(financialStats.collected)],
        ['Pending Revenue', formatCurrency(financialStats.pending)],
      ]
    })
    doc.save('dashboard-report.pdf')
  }

  // Formatting Currency
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val / 100)

  return (
    <Box 
      component={motion.div} 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      sx={{ pb: 8 }}
    >
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ 
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Live overview of Academy
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Download size={18} />}
          onClick={exportPDF}
          sx={{ borderRadius: 3, px: 3, background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)' }}
        >
          Export
        </Button>
      </Box>

      {/* KPI Cards Row 1: Users & Money */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <GlassCard>
            <CardContent>
              <StatValue 
                value={loading ? '...' : totals.registrations} 
                label="Total Registrations" 
                icon={Users} 
                color="#2196F3" 
              />
              <Chip 
                size="small" 
                icon={<TrendingUp size={14} />} 
                label={`+${totals.registrationsToday} Today`} 
                color="success" 
                variant="outlined" 
                sx={{ mt: 1, bgcolor: 'rgba(76, 175, 80, 0.1)', color: 'success.main', fontWeight: 600, border: 'none' }}
              />
            </CardContent>
          </GlassCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <GlassCard>
            <CardContent>
              <StatValue 
                value={loading ? '...' : formatCurrency(financialStats.collected)} 
                label="Total Revenue" 
                icon={DollarSign} 
                color="#4CAF50" 
                subValue={invoices.length === 0 ? "No invoices yet" : "Collected"}
              />
            </CardContent>
          </GlassCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <GlassCard>
            <CardContent>
              <StatValue 
                value={loading ? '...' : formatCurrency(financialStats.pending)} 
                label="Pending Payments" 
                icon={Clock} 
                color="#FF9800" 
                subValue={invoices.length === 0 ? "No invoices yet" : `${financialStats.studentsWithBalance} students with balance`}
              />
            </CardContent>
          </GlassCard>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <GlassCard>
            <CardContent>
              <StatValue 
                value={loading ? '...' : totals.totalAcademies} 
                label="Class Selections" 
                icon={School} 
                color="#9C27B0" 
              />
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Across {academyRows.length} Academies
              </Typography>
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>

      {/* Quick Actions & Alerts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Quick Actions */}
        <Grid item xs={12} md={7}>
          <GlassCard>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                🚀 Quick Actions
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6} sm={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Plus size={18} />}
                    onClick={() => navigate('/registrations')}
                    sx={{
                      borderRadius: 3,
                      py: 2,
                      borderColor: '#2196F3',
                      color: '#2196F3',
                      '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.08)', borderColor: '#2196F3' }
                    }}
                  >
                    New Student
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<CreditCard size={18} />}
                    onClick={() => navigate('/payments')}
                    sx={{
                      borderRadius: 3,
                      py: 2,
                      borderColor: '#4CAF50',
                      color: '#4CAF50',
                      '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.08)', borderColor: '#4CAF50' }
                    }}
                  >
                    Record Payment
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<FileText size={18} />}
                    onClick={() => navigate('/payments')}
                    sx={{
                      borderRadius: 3,
                      py: 2,
                      borderColor: '#FF9800',
                      color: '#FF9800',
                      '&:hover': { bgcolor: 'rgba(255, 152, 0, 0.08)', borderColor: '#FF9800' }
                    }}
                  >
                    View Invoices
                  </Button>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<Download size={18} />}
                    onClick={exportPDF}
                    sx={{
                      borderRadius: 3,
                      py: 2,
                      borderColor: '#9C27B0',
                      color: '#9C27B0',
                      '&:hover': { bgcolor: 'rgba(156, 39, 176, 0.08)', borderColor: '#9C27B0' }
                    }}
                  >
                    Export Data
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Alerts */}
        <Grid item xs={12} md={5}>
          <GlassCard>
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                ⚠️ Attention Needed
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {unpaidCount > 0 && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(244, 67, 54, 0.08)',
                      border: '1px solid rgba(244, 67, 54, 0.2)'
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <XCircle size={20} color="#F44336" />
                      <Typography variant="body2" fontWeight={600} color="error">
                        {unpaidCount} students with unpaid invoices
                      </Typography>
                    </Stack>
                  </Box>
                )}
                {partialPaidCount > 0 && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(255, 152, 0, 0.08)',
                      border: '1px solid rgba(255, 152, 0, 0.2)'
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <AlertCircle size={20} color="#FF9800" />
                      <Typography variant="body2" fontWeight={600} color="warning">
                        {partialPaidCount} students with partial payments
                      </Typography>
                    </Stack>
                  </Box>
                )}
                {totals.registrationsToday > 0 && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(33, 150, 243, 0.08)',
                      border: '1px solid rgba(33, 150, 243, 0.2)'
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <TrendingUp size={20} color="#2196F3" />
                      <Typography variant="body2" fontWeight={600} color="primary">
                        {totals.registrationsToday} new registrations today
                      </Typography>
                    </Stack>
                  </Box>
                )}
                {financialStats.paidInvoices > 0 && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(76, 175, 80, 0.08)',
                      border: '1px solid rgba(76, 175, 80, 0.2)'
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CheckCircle size={20} color="#4CAF50" />
                      <Typography variant="body2" fontWeight={600} color="success">
                        {financialStats.paidInvoices} students fully paid ✅
                      </Typography>
                    </Stack>
                  </Box>
                )}
                {unpaidCount === 0 && partialPaidCount === 0 && totals.registrationsToday === 0 && financialStats.paidInvoices === 0 && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: 'rgba(76, 175, 80, 0.08)',
                      border: '1px solid rgba(76, 175, 80, 0.2)'
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CheckCircle size={20} color="#4CAF50" />
                      <Typography variant="body2" fontWeight={600} color="success">
                        All clear! No issues to report. ✅
                      </Typography>
                    </Stack>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3}>
        {/* Main Trend Chart */}
        <Grid item xs={12} lg={8}>
          <GlassCard>
            <CardContent sx={{ height: 400 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Registration Trend</Typography>
              {dailyStats.length > 0 ? (
                <Box sx={{ width: '100%', height: 320, minWidth: 0, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyStats}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2196F3" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2196F3" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} 
                      dy={10}
                      minTickGap={30}
                    />
                    <YAxis 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fill: theme.palette.text.secondary, fontSize: 12 }} 
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        borderRadius: 12, 
                        border: 'none', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        backgroundColor: theme.palette.background.paper 
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#2196F3" 
                      fillOpacity={1} 
                      fill="url(#colorCount)" 
                      strokeWidth={3}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <Typography color="text.secondary">No trend data available yet.</Typography>
                </Box>
              )}
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Payment Status Breakdown */}
        <Grid item xs={12} lg={4}>
          <GlassCard>
            <CardContent sx={{ height: 400 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Payment Status</Typography>
              {financialStats.paymentStatusData.length > 0 ? (
                <Box sx={{ width: '100%', height: 320, minWidth: 0, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                      data={financialStats.paymentStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="status"
                    >
                      {financialStats.paymentStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: 8 }}
                      formatter={(value: number | undefined) => [`${value ?? 0} students`, 'Count']}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <Typography color="text.secondary">No payment data available.</Typography>
                </Box>
              )}
            </CardContent>
          </GlassCard>
        </Grid>

        {/* Korean Levels (moved to bottom) - Only show if there are Korean Language registrations */}
        {koreanLevelRows.length > 0 && (
          <Grid item xs={12} lg={4}>
            <GlassCard>
              <CardContent sx={{ height: 400 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>Korean Levels</Typography>
                <Box sx={{ width: '100%', height: 320, minWidth: 0, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                      data={koreanLevelRows}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="level"
                    >
                      {koreanLevelRows.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: 8 }} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </GlassCard>
          </Grid>
        )}

        {/* Bottom Bar Chart */}
        <Grid item xs={12}>
          <GlassCard>
            <CardContent sx={{ minHeight: 400 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Academy Distribution</Typography>
              {academyRows.length > 0 ? (
                <Box sx={{ width: '100%', height: 320, minWidth: 0, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={academyRows} layout="vertical" margin={{ left: 40, right: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.2} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="academy" 
                        type="category" 
                        width={120}
                        tick={{ fill: theme.palette.text.primary, fontWeight: 500, fontSize: 13 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: 8 }} />
                      <Bar dataKey="count" fill="#2196F3" radius={[0, 6, 6, 0]} barSize={24}>
                        {academyRows.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                 <Box display="flex" alignItems="center" justifyContent="center" height={200}>
                  <Typography color="text.secondary">No academies selected.</Typography>
                </Box>
              )}
            </CardContent>
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  )
}

export default function DashboardPage() {
  const { role } = useTeacherContext()

  if (role === 'teacher') {
    return <TeacherDashboardPage />
  }

  return <AdminDashboard />
}
