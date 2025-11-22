import * as React from 'react'
import {
  Card, CardHeader, CardContent, Stack, Box, Alert, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Typography, Chip,
  Grid, MenuItem, FormControl, InputLabel, Select, Tabs, Tab,
  IconButton, Tooltip, Paper
} from '@mui/material'
import { DataGrid, GridToolbar, type GridColDef } from '@mui/x-data-grid'
import EventIcon from '@mui/icons-material/Event'
import AddIcon from '@mui/icons-material/Add'
import QrCodeIcon from '@mui/icons-material/QrCode'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonIcon from '@mui/icons-material/Person'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PendingIcon from '@mui/icons-material/Pending'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import RestaurantIcon from '@mui/icons-material/Restaurant'

import { useEvents } from '../hooks/useEvents'
import { useVolunteerHours } from '../hooks/useVolunteerHours'
import QRCodeGenerator from '../components/QRCodeGenerator'
import VolunteerAttendanceTracker from '../components/VolunteerAttendanceTracker'
import { logger } from '../../../lib/logger'
import type { Event, EventStatus, HoursStatus } from '../types'
import { notifySuccess, notifyError } from '../../../lib/alerts'
import FirebaseErrorBoundary from '../../../app/components/FirebaseErrorBoundary'
import Swal from 'sweetalert2'

const STATUS_COLORS = {
  upcoming: 'info',
  active: 'success',
  completed: 'default',
  cancelled: 'error'
} as const

const STATUS_ICONS = {
  upcoming: <PendingIcon />,
  active: <PlayCircleIcon />,
  completed: <CheckCircleIcon />,
  cancelled: <CancelIcon />
}

const HOURS_STATUS_COLORS = {
  'checked-in': 'warning',
  'checked-out': 'info',
  'completed': 'success'
} as const

const HOURS_STATUS_ICONS = {
  'checked-in': <AccessTimeIcon />,
  'checked-out': <CheckCircleIcon />,
  'completed': <CheckCircleIcon />
}

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
      id={`events-tabpanel-${index}`}
      aria-labelledby={`events-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

function EventsPageContent() {
  const { data: events, loading: eventsLoading, error: eventsError, createEvent, updateEvent } = useEvents()
  const { data: allHours, loading: hoursLoading, error: hoursError, checkOut } = useVolunteerHours()
  
  const [tabValue, setTabValue] = React.useState(0)
  const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null)
  const [qrDialogOpen, setQrDialogOpen] = React.useState(false)
  const [eventDialogOpen, setEventDialogOpen] = React.useState(false)
  const [editingEvent, setEditingEvent] = React.useState<Event | null>(null)
  const [newEvent, setNewEvent] = React.useState({
    name: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    status: 'upcoming' as EventStatus
  })

  // Filter events for Taste of Korea
  const tasteOfKoreaEvents = React.useMemo(() => {
    return events.filter(event => 
      event.name.toLowerCase().includes('taste of korea') ||
      event.name.toLowerCase().includes('taste of korean')
    )
  }, [events])

  // Get hours for Taste of Korea events
  const tasteOfKoreaHours = React.useMemo(() => {
    const eventIds = tasteOfKoreaEvents.map(e => e.id)
    return allHours.filter(hours => eventIds.includes(hours.eventId))
  }, [allHours, tasteOfKoreaEvents])

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleCreateEvent = async () => {
    try {
      if (!newEvent.name || !newEvent.date || !newEvent.startTime || !newEvent.endTime || !newEvent.location) {
        notifyError('Please fill in all required fields')
        return
      }

      await createEvent({
        name: newEvent.name,
        description: newEvent.description,
        date: newEvent.date,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        location: newEvent.location,
        status: newEvent.status
      })
      
      notifySuccess('Event created successfully')
      setEventDialogOpen(false)
      setNewEvent({
        name: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        status: 'upcoming'
      })
    } catch (err) {
      logger.error('Error creating event', err)
      notifyError('Failed to create event')
    }
  }

  const handleCheckOut = async (hoursId: string) => {
    try {
      await checkOut(hoursId)
      notifySuccess('Volunteer checked out successfully')
    } catch (err) {
      notifyError('Failed to check out volunteer')
    }
  }

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event)
    setNewEvent({
      name: event.name,
      description: event.description || '',
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      status: event.status
    })
    setEventDialogOpen(true)
  }

  const handleUpdateEvent = async () => {
    if (!editingEvent) return
    
    try {
      if (!newEvent.name || !newEvent.date || !newEvent.startTime || !newEvent.endTime || !newEvent.location) {
        notifyError('Please fill in all required fields')
        return
      }

      await updateEvent(editingEvent.id, {
        name: newEvent.name,
        description: newEvent.description,
        date: newEvent.date,
        startTime: newEvent.startTime,
        endTime: newEvent.endTime,
        location: newEvent.location,
        status: newEvent.status
      })
      
      notifySuccess('Event updated successfully')
      setEventDialogOpen(false)
      setEditingEvent(null)
      setNewEvent({
        name: '',
        description: '',
        date: '',
        startTime: '',
        endTime: '',
        location: '',
        status: 'upcoming'
      })
    } catch (err) {
      logger.error('Error updating event', err)
      notifyError('Failed to update event')
    }
  }

  const handleDeleteEvent = async (event: Event) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete "${event.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    })

    if (result.isConfirmed) {
      try {
        await updateEvent(event.id, { status: 'cancelled' })
        notifySuccess('Event cancelled successfully')
      } catch (err) {
        logger.error('Error deleting event', err)
        notifyError('Failed to delete event')
      }
    }
  }


  const eventColumns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'Event Name',
      width: 250,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <EventIcon fontSize="small" color="action" />
          <Typography variant="body2">{params.value}</Typography>
        </Stack>
      )
    },
    {
      field: 'date',
      headerName: 'Date',
      width: 120,
      renderCell: (params) => new Date(params.value).toLocaleDateString()
    },
    {
      field: 'startTime',
      headerName: 'Start Time',
      width: 120
    },
    {
      field: 'endTime',
      headerName: 'End Time',
      width: 120
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 200
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          icon={STATUS_ICONS[params.value as EventStatus]}
          label={params.value}
          color={STATUS_COLORS[params.value as EventStatus]}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Generate QR Code">
            <IconButton
              size="small"
              onClick={() => {
                setSelectedEvent(params.row)
                setQrDialogOpen(true)
              }}
            >
              <QrCodeIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Event">
            <IconButton 
              size="small"
              onClick={() => handleEditEvent(params.row)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Event">
            <IconButton 
              size="small"
              onClick={() => handleDeleteEvent(params.row)}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ]

  // Helper function to format hours as hours and minutes
  const formatHours = (totalHours: number) => {
    if (!totalHours) return 'N/A'
    const hours = Math.floor(totalHours)
    const minutes = Math.round((totalHours - hours) * 60)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  const hoursColumns: GridColDef[] = [
    {
      field: 'volunteerName',
      headerName: 'Volunteer',
      width: 200,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <PersonIcon fontSize="small" color="action" />
          <Typography variant="body2">{params.value}</Typography>
        </Stack>
      )
    },
    {
      field: 'eventName',
      headerName: 'Event',
      width: 200
    },
    {
      field: 'checkInTime',
      headerName: 'Check-In',
      width: 150,
      renderCell: (params) => {
        if (!params.value) return 'Not checked in'
        const date = new Date(params.value.seconds * 1000)
        return date.toLocaleTimeString()
      }
    },
    {
      field: 'checkOutTime',
      headerName: 'Check-Out',
      width: 150,
      renderCell: (params) => {
        if (!params.value) return 'Not checked out'
        const date = new Date(params.value.seconds * 1000)
        return date.toLocaleTimeString()
      }
    },
    {
      field: 'totalHours',
      headerName: 'Hours',
      width: 100,
      renderCell: (params) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <AccessTimeIcon fontSize="small" color="action" />
          <Typography variant="body2">
            {formatHours(params.value)}
          </Typography>
        </Stack>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <Chip
          icon={HOURS_STATUS_ICONS[params.value as HoursStatus]}
          label={params.value}
          color={HOURS_STATUS_COLORS[params.value as HoursStatus]}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Button
          size="small"
          variant="outlined"
          disabled={params.row.status !== 'checked-in'}
          onClick={() => handleCheckOut(params.row.id)}
        >
          Check Out
        </Button>
      )
    }
  ]

  if (eventsError || hoursError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Error loading data: {eventsError?.message || hoursError?.message}
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardHeader
          title={
            <Stack direction="row" alignItems="center" spacing={2}>
              <EventIcon color="primary" />
              <Typography variant="h5">Events Management</Typography>
            </Stack>
          }
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setEventDialogOpen(true)}
            >
              Create Event
            </Button>
          }
        />
        <CardContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab 
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <RestaurantIcon />
                    <span>Taste of Korea</span>
                  </Stack>
                } 
              />
              <Tab label="Volunteer Tracking" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Stack spacing={3}>
              {/* Taste of Korea Events */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Taste of Korea Events
                </Typography>
                <DataGrid
                  rows={tasteOfKoreaEvents}
                  columns={eventColumns}
                  loading={eventsLoading}
                  slots={{ toolbar: GridToolbar }}
                  slotProps={{
                    toolbar: {
                      showQuickFilter: true,
                      quickFilterProps: { debounceMs: 500 }
                    }
                  }}
                  getRowId={(row) => row.id}
                  sx={{ height: 300 }}
                />
              </Paper>

              {/* Volunteer Hours */}
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Volunteer Hours Management
                </Typography>
                <DataGrid
                  rows={tasteOfKoreaHours}
                  columns={hoursColumns}
                  loading={hoursLoading}
                  slots={{ toolbar: GridToolbar }}
                  slotProps={{
                    toolbar: {
                      showQuickFilter: true,
                      quickFilterProps: { debounceMs: 500 }
                    }
                  }}
                  getRowId={(row) => row.id}
                  sx={{ height: 400 }}
                />
              </Paper>
            </Stack>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Stack spacing={3}>
              {tasteOfKoreaEvents.length > 0 ? (
                tasteOfKoreaEvents.map((event) => (
                  <VolunteerAttendanceTracker key={event.id} event={event} />
                ))
              ) : (
                <Card>
                  <CardContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="h6" gutterBottom>
                        No Taste of Korea events found
                      </Typography>
                      <Typography variant="body2">
                        Create the "Taste of Korea - Pre-Event Preparation Period" event first to track volunteer attendance.
                      </Typography>
                    </Alert>
                    
                    <Typography variant="h6" gutterBottom>
                      📋 Instructions to Create the Preparation Period Event:
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2">
                        1. Click "Create Event" button above
                      </Typography>
                      <Typography variant="body2">
                        2. Use these details:
                      </Typography>
                      <Box sx={{ ml: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="body2"><strong>Event Name:</strong> Taste of Korea - Pre-Event Preparation Period</Typography>
                        <Typography variant="body2"><strong>Date:</strong> 2025-10-27</Typography>
                        <Typography variant="body2"><strong>Start Time:</strong> 09:00</Typography>
                        <Typography variant="body2"><strong>End Time:</strong> 17:00</Typography>
                        <Typography variant="body2"><strong>Location:</strong> IYF Orlando Center - 320 S Park Ave, Sanford, FL 32771</Typography>
                        <Typography variant="body2"><strong>Description:</strong> Volunteer preparation period for Taste of Korea event. Volunteers will help with setup, preparation, and organization tasks from October 27 to November 7, 2025.</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </TabPanel>
        </CardContent>
      </Card>

      {/* QR Code Generator Dialog */}
      {selectedEvent && (
        <QRCodeGenerator
          eventId={selectedEvent.id}
          eventName={selectedEvent.name}
          open={qrDialogOpen}
          onClose={() => setQrDialogOpen(false)}
        />
      )}

      {/* Create/Edit Event Dialog */}
      <Dialog open={eventDialogOpen} onClose={() => {
        setEventDialogOpen(false)
        setEditingEvent(null)
        setNewEvent({
          name: '',
          description: '',
          date: '',
          startTime: '',
          endTime: '',
          location: '',
          status: 'upcoming'
        })
      }} maxWidth="md" fullWidth>
        <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Event Name"
                value={newEvent.name}
                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description"
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Date"
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="Start Time"
                type="time"
                value={newEvent.startTime}
                onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                label="End Time"
                type="time"
                value={newEvent.endTime}
                onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Location"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={newEvent.status}
                  label="Status"
                  onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value as EventStatus })}
                >
                  <MenuItem value="upcoming">Upcoming</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEventDialogOpen(false)
            setEditingEvent(null)
            setNewEvent({
              name: '',
              description: '',
              date: '',
              startTime: '',
              endTime: '',
              location: '',
              status: 'upcoming'
            })
          }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={editingEvent ? handleUpdateEvent : handleCreateEvent}
          >
            {editingEvent ? 'Update Event' : 'Create Event'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default function EventsPage() {
  return (
    <FirebaseErrorBoundary>
      <EventsPageContent />
    </FirebaseErrorBoundary>
  )
}
