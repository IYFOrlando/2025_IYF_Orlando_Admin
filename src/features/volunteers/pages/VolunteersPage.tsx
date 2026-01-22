import * as React from 'react'
import {
  Card, CardHeader, CardContent, Box, Alert, Button, Typography, Tabs, Tab
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
    <Box>
      <Card>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <VolunteerActivismIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              <Typography variant="h4" component="h1">
                Volunteer Management
              </Typography>
            </Box>
          }
          subheader="Manage volunteer applications, schedules, and check-in/check-out"
        />
        <CardContent>
          <Tabs
            value={tabValue}
            onChange={(_event, newValue) => setTabValue(newValue)}
            aria-label="volunteer management tabs"
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
          >
            <Tab 
              label="Volunteer Applications" 
              id="volunteer-tab-0"
              aria-controls="volunteer-tabpanel-0"
            />
            <Tab 
              label="Pre-Event Volunteer Schedule" 
              id="volunteer-tab-1"
              aria-controls="volunteer-tabpanel-1"
            />
            <Tab 
              label="Check-in/Check-out" 
              id="volunteer-tab-2"
              aria-controls="volunteer-tabpanel-2"
            />
            <Tab 
              label="Reports" 
              id="volunteer-tab-3"
              aria-controls="volunteer-tabpanel-3"
            />
          </Tabs>

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
        </CardContent>
      </Card>

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