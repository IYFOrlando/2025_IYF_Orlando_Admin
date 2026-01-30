import { Box, Grid, Typography } from '@mui/material'
import { TrendingUp, BarChart3, Users, DollarSign } from 'lucide-react'
import { GlassCard } from '../../../components/GlassCard'
import { PageHeader } from '../../../components/PageHeader'
import { PageHeaderColors } from '../../../components/pageHeaderColors'

/**
 * Analytics Page - Overview of key metrics and insights
 */
export default function AnalyticsPage() {
  return (
    <Box>
      <PageHeader
        icon={<TrendingUp size={40} />}
        title="Analytics"
        subtitle="Insights and metrics across all academies"
        {...PageHeaderColors.analytics}
      />

      <Grid container spacing={3}>
        {/* Placeholder Cards */}
        <Grid item xs={12} md={6} lg={3}>
          <GlassCard sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ color: 'primary.main', mb: 2, display: 'flex', justifyContent: 'center' }}>
              <Users size={48} />
            </Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Coming Soon
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Students
            </Typography>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <GlassCard sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ color: 'success.main', mb: 2, display: 'flex', justifyContent: 'center' }}>
              <DollarSign size={48} />
            </Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Coming Soon
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Revenue
            </Typography>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <GlassCard sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ color: 'warning.main', mb: 2, display: 'flex', justifyContent: 'center' }}>
              <BarChart3 size={48} />
            </Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Coming Soon
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Attendance Rate
            </Typography>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <GlassCard sx={{ p: 3, textAlign: 'center' }}>
            <Box sx={{ color: 'info.main', mb: 2, display: 'flex', justifyContent: 'center' }}>
              <TrendingUp size={48} />
            </Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Coming Soon
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Growth
            </Typography>
          </GlassCard>
        </Grid>

        {/* Main Content Area */}
        <Grid item xs={12}>
          <GlassCard sx={{ p: 4, textAlign: 'center', minHeight: 400 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              📊 Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
              Detailed analytics and reporting features will be available here soon.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              This section will include:
            </Typography>
            <Box sx={{ mt: 3, textAlign: 'left', maxWidth: 600, mx: 'auto' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                • Student enrollment trends
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                • Revenue and payment analytics
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                • Attendance patterns
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                • Performance metrics
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                • Custom reports and exports
              </Typography>
            </Box>
          </GlassCard>
        </Grid>
      </Grid>
    </Box>
  )
}
