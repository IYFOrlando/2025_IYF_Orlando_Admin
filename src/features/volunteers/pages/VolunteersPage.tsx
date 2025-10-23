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
import type { VolunteerApplication, VolunteerStatus } from '../types'
import { notifySuccess, notifyError } from '../../../lib/alerts'
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
  const { data: applications, loading, error, createVolunteer, updateVolunteer, updateStatus, deleteVolunteer } = useVolunteerApplications()
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
      console.error('Error creating volunteer:', error)
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
      console.error('Error updating volunteer:', error)
      notifyError('Failed to update volunteer')
    }
  }

  const handleDeleteVolunteer = async (id: string) => {
    try {
      await deleteVolunteer(id)
      notifySuccess('Volunteer deleted successfully!')
    } catch (error) {
      console.error('Error deleting volunteer:', error)
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

  const handleStatusChange = async (id: string, status: VolunteerStatus) => {
    try {
      await updateStatus(id, status)
      notifySuccess('Volunteer status updated successfully!')
    } catch (error) {
      console.error('Error updating volunteer status:', error)
      notifyError('Failed to update volunteer status')
    }
  }

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
    // Update URL hash for direct navigation
    if (newValue === 1) {
      window.location.hash = '#schedule'
    } else {
      window.location.hash = ''
    }
  }

  // Debug logging
  React.useEffect(() => {
    console.log('VolunteersPage - Loading:', loading)
    console.log('VolunteersPage - Error:', error)
    console.log('VolunteersPage - Applications:', applications)
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
            onChange={(event, newValue) => setTabValue(newValue)}
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
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <SimpleVolunteerTable
              volunteers={applications}
              loading={loading}
              error={error}
              onEdit={handleEditVolunteerClick}
              onDelete={handleDeleteVolunteer}
              onView={handleViewVolunteer}
              onStatusChange={handleStatusChange}
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