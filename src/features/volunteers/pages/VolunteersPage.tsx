import * as React from 'react'
import {
  CardContent, Box, Alert, Button, Typography, Tabs, Tab
} from '@mui/material'
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism'

import { useVolunteerApplications } from '../hooks/useVolunteerApplications'
import PreEventVolunteerSchedule from '../components/VolunteerTimeSlots'
import VolunteerCheckInOut from '../components/VolunteerCheckInOut'
import SimpleVolunteerTable from '../components/SimpleVolunteerTable'
import VolunteerForm from '../components/VolunteerForm'
import VolunteerReports from '../components/VolunteerReports'
import type { VolunteerApplication } from '../types'
import { notifySuccess, notifyError } from '../../../lib/alerts'
import { logger } from '../../../lib/logger'
import FirebaseErrorBoundary from '../../../app/components/FirebaseErrorBoundary'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`volunteer-tabpanel-${index}`}
      aria-labelledby={`volunteer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

function VolunteersPageContent() {
  const { data: applications, loading, error, createVolunteer, updateVolunteer, deleteVolunteer } = useVolunteerApplications()
  const [selectedApplication, setSelectedApplication] = React.useState<VolunteerApplication | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [tabValue, setTabValue] = React.useState(0)

  // Handle hash-based tab navigation
  React.useEffect(() => {
    const hash = window.location.hash
    if (hash === '#schedule') {
      setTabValue(1) // Switch to "Pre-Event Volunteer Schedule" tab
    }
  }, [])

  const handleCreateVolunteer = async (volunteerData: Partial<VolunteerApplication>) => {
    try {
      await createVolunteer(volunteerData as Omit<VolunteerApplication, 'id' | 'createdAt' | 'updatedAt'>)
      notifySuccess('Volunteer created successfully!')
      setCreateDialogOpen(false)
    } catch (error) {
      logger.error('Error creating volunteer', error)
      notifyError('Failed to create volunteer')
    }
  }

  const handleEditVolunteer = async (volunteerData: Partial<VolunteerApplication>) => {
    if (!selectedApplication) return
    
    try {
      await updateVolunteer(selectedApplication.id, volunteerData)
      notifySuccess('Volunteer updated successfully!')
      setEditDialogOpen(false)
      setSelectedApplication(null)
    } catch (error) {
      logger.error('Error updating volunteer', error)
      notifyError('Failed to update volunteer')
    }
  }

  const handleDeleteVolunteer = async (id: string) => {
    try {
      await deleteVolunteer(id)
      notifySuccess('Volunteer deleted successfully!')
    } catch (error) {
      logger.error('Error deleting volunteer', error)
      notifyError('Failed to delete volunteer')
    }
  }

  const handleViewVolunteer = (volunteer: VolunteerApplication) => {
    setSelectedApplication(volunteer)
    setEditDialogOpen(true)
  }

  const handleEditVolunteerClick = (volunteer: VolunteerApplication) => {
    setSelectedApplication(volunteer)
    setEditDialogOpen(true)
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  // Debug logging
  React.useEffect(() => {
    // Debug logging removed - use logger.debug() if needed in development
  }, [loading, error, applications])

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Error loading volunteers: {error.message}
          </Alert>
          <Button onClick={() => window.location.reload()} variant="contained">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography>Loading volunteers...</Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Header with Gradient */}
      <Box sx={{ 
        mb: 4,
        background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)', // Blue gradient
        borderRadius: 4,
        p: { xs: 3, md: 4 },
        color: 'white',
        boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3), 0 8px 10px -6px rgba(30, 64, 175, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background element */}
        <Box sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          filter: 'blur(30px)'
        }} />
        
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={3}>
          <Box sx={{ 
            display: 'flex', 
            p: 2, 
            borderRadius: 3, 
            bgcolor: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            <VolunteerActivismIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: '1.75rem', md: '2.5rem' }, color: 'white' }}>
              Volunteer Hub
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5, color: 'white' }}>
              Manage applications, schedules, and operations
            </Typography>
          </Box>
        </Stack>
      </Box>

      <GlassCard sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.01)' }}>
          <Tabs
            value={tabValue}
            onChange={(_event, newValue) => setTabValue(newValue)}
            aria-label="volunteer management tabs"
            variant="scrollable"
            scrollButtons="auto"
            sx={{ 
              px: { xs: 1, md: 3 },
              '& .MuiTab-root': { py: 2, fontWeight: 600, minHeight: 64 }
            }}
          >
            <Tab label="Applications" id="volunteer-tab-0" aria-controls="volunteer-tabpanel-0" />
            <Tab label="Pre-Event Schedule" id="volunteer-tab-1" aria-controls="volunteer-tabpanel-1" />
            <Tab label="Check-in/Check-out" id="volunteer-tab-2" aria-controls="volunteer-tabpanel-2" />
            <Tab label="Analytics" id="volunteer-tab-3" aria-controls="volunteer-tabpanel-3" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <SimpleVolunteerTable
            volunteers={applications}
            loading={loading}
            error={error}
            onEdit={handleEditVolunteerClick}
            onDelete={handleDeleteVolunteer}
            onView={handleViewVolunteer}
            onCreateNew={() => setCreateDialogOpen(true)}
            onRefresh={handleRefresh}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <PreEventVolunteerSchedule />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <VolunteerCheckInOut />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <VolunteerReports 
            volunteers={applications}
            loading={loading}
          />
        </TabPanel>
      </GlassCard>

      {/* Create Volunteer Dialog */}
      <VolunteerForm
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateVolunteer}
        mode="create"
      />

      {/* Edit Volunteer Dialog */}
      <VolunteerForm
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false)
          setSelectedApplication(null)
        }}
        onSubmit={handleEditVolunteer}
        volunteer={selectedApplication}
        mode="edit"
      />
    </Box>
  )
}

export default function VolunteersPage() {
  return (
    <FirebaseErrorBoundary>
      <VolunteersPageContent />
    </FirebaseErrorBoundary>
  )
}