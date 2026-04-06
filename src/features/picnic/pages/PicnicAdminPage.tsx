import React from 'react'
import { 
  Box, Typography, Tabs, Tab, 
  Dialog, DialogTitle, DialogContent, 
  DialogActions, Button, Grid, Chip, 
  Divider, Stack, Paper, IconButton
} from '@mui/material'
import { 
  Calendar, 
  Users, 
  Utensils, 
  X,
  Mail,
  Phone,
  Clock,
  ChevronRight
} from 'lucide-react'
import { PageHeader } from '../../../components/PageHeader'
import PicnicStats from '../components/PicnicStats'
import PicnicTable from '../components/PicnicTable'
import PotluckSummary from '../components/PotluckSummary'
import { getPicnicSignups, getPicnicStats, deletePicnicSignup, type PicnicSignup, type PicnicStats as StatsType } from '../api/picnicApi'
import { notifySuccess, notifyError, confirmDelete } from '../../../lib/alerts'

export default function PicnicAdminPage() {
  const [tabValue, setTabValue] = React.useState(0)
  const [signups, setSignups] = React.useState<PicnicSignup[]>([])
  const [stats, setStats] = React.useState<StatsType>({ totalRegistrations: 0, totalGuests: 0, totalPotluckItems: 0 })
  const [loading, setLoading] = React.useState(true)
  
  // Detail Dialog State
  const [selectedSignup, setSelectedSignup] = React.useState<PicnicSignup | null>(null)
  const [detailsOpen, setDetailsOpen] = React.useState(false)

  const fetchData = React.useCallback(async () => {
    setLoading(true)
    try {
      const [data, statsData] = await Promise.all([
        getPicnicSignups(),
        getPicnicStats()
      ])
      setSignups(data)
      setStats(statsData)
    } catch (err) {
      notifyError('Failed to fetch picnic data')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: number) => {
    const res = await confirmDelete('Delete Registration?', 'This action cannot be undone.')
    if (res.isConfirmed) {
      try {
        await deletePicnicSignup(id)
        notifySuccess('Registration deleted successfully')
        fetchData()
      } catch (err) {
        notifyError('Failed to delete registration')
      }
    }
  }

  const handleViewDetails = (signup: PicnicSignup) => {
    setSelectedSignup(signup)
    setDetailsOpen(true)
  }

  return (
    <Box>
      <PageHeader
        title="2026 IYF Academy Picnic"
        subtitle="Administrator Dashboard for Guest Management & Potluck Logistics"
        icon={<Calendar size={40} />}
        color="#0a192f" // Navy Blue
        gradientEnd="#1e293b"
      />

      <PicnicStats 
        totalRegistrations={stats.totalRegistrations} 
        totalGuests={stats.totalGuests} 
        totalPotluckItems={stats.totalPotluckItems} 
        loading={loading} 
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(_, val) => setTabValue(val)} 
          sx={{
            '& .MuiTabs-indicator': { bgcolor: '#de4f25', height: 3 },
            '& .MuiTab-root': { fontWeight: 700, fontSize: '0.9rem', textTransform: 'none', px: 4 }
          }}
        >
          <Tab 
            icon={<Users size={18} />} 
            iconPosition="start" 
            label="Registrations" 
          />
          <Tab 
            icon={<Utensils size={18} />} 
            iconPosition="start" 
            label="Potluck Summary" 
          />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <PicnicTable 
          rows={signups} 
          loading={loading} 
          onViewDetails={handleViewDetails} 
          onDelete={handleDelete} 
        />
      )}

      {tabValue === 1 && (
        <PotluckSummary 
          items={signups.flatMap(s => s.items_claimed || [])} 
          loading={loading} 
        />
      )}

      {/* Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={() => setDetailsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
      >
        {selectedSignup && (
          <>
            <DialogTitle sx={{ bgcolor: '#0a192f', color: 'white', py: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="h6" fontWeight={800}>Registration Details</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>ID: #{selectedSignup.id}</Typography>
              </Box>
              <IconButton onClick={() => setDetailsOpen(false)} sx={{ color: 'white' }}>
                <X size={20} />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 4 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="caption" fontWeight={800} color="text.disabled" sx={{ letterSpacing: 0.5, display: 'block', mb: 1 }}>
                    PERSONAL INFORMATION
                  </Typography>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Paper sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(10, 25, 47, 0.05)', color: '#0a192f' }}>
                        <Users size={18} />
                      </Paper>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{selectedSignup.first_name} {selectedSignup.last_name}</Typography>
                        <Typography variant="caption" color="text.secondary">Full Name</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Paper sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(10, 25, 47, 0.05)', color: '#0a192f' }}>
                        <Mail size={18} />
                      </Paper>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{selectedSignup.email}</Typography>
                        <Typography variant="caption" color="text.secondary">Email Address</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Paper sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(10, 25, 47, 0.05)', color: '#0a192f' }}>
                        <Phone size={18} />
                      </Paper>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{selectedSignup.phone || 'No phone provided'}</Typography>
                        <Typography variant="caption" color="text.secondary">Phone Number</Typography>
                      </Box>
                    </Box>
                  </Stack>
                </Grid>

                <Grid item xs={12}>
                  <Divider />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" fontWeight={800} color="text.disabled" sx={{ letterSpacing: 0.5, display: 'block', mb: 1 }}>
                    ATTENDANCE & LOGISTICS
                  </Typography>
                  <Stack direction="row" spacing={4}>
                    <Box>
                      <Typography variant="h6" fontWeight={800} color="#de4f25">{selectedSignup.guests}</Typography>
                      <Typography variant="caption" color="text.secondary">Additional Guests</Typography>
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={800} color="#0a192f">{selectedSignup.items_claimed?.length || 0}</Typography>
                      <Typography variant="caption" color="text.secondary">Items Claimed</Typography>
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={700} sx={{ mt: 1 }}>
                        {new Date(selectedSignup.created_at).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Registration Date</Typography>
                    </Box>
                  </Stack>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" fontWeight={800} color="text.disabled" sx={{ letterSpacing: 0.5, display: 'block', mb: 1 }}>
                    POTLUCK CONTRIBUTIONS
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {(selectedSignup.items_claimed || []).map((item, i) => (
                      <Chip 
                        key={i} 
                        label={item} 
                        variant="outlined" 
                        size="small"
                        sx={{ borderRadius: 1.5, borderColor: '#de4f2530', bgcolor: 'rgba(222, 79, 37, 0.02)', fontWeight: 600 }}
                      />
                    ))}
                    {(selectedSignup.items_claimed || []).length === 0 && (
                      <Typography variant="body2" color="text.disabled italic">No items claimed.</Typography>
                    )}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 3, bgcolor: '#f8f9fa' }}>
              <Button onClick={() => setDetailsOpen(false)} variant="contained" sx={{ bgcolor: '#0a192f', textTransform: 'none', borderRadius: 2 }}>
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}
