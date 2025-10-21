import * as React from 'react'
import {
  Card, CardHeader, CardContent, Stack, Box, Alert, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, Typography, Chip,
  Grid, MenuItem, FormControl, InputLabel, Select, Divider, Tabs, Tab,
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
import PauseCircleIcon from '@mui/icons-material/PauseCircle'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import RestaurantIcon from '@mui/icons-material/Restaurant'

import { useEvents } from '../hooks/useEvents'
import { useVolunteerHours } from '../hooks/useVolunteerHours'
import QRCodeGenerator from '../components/QRCodeGenerator'
import type { Event, VolunteerHours, EventStatus, HoursStatus } from '../types'
import { notifySuccess, notifyError } from '../../../lib/alerts'
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

export default function EventsPage() {
  const { data: events, loading: eventsLoading, error: eventsError, updateEventStatus } = useEvents()
  const { data: allHours, loading: hoursLoading, error: hoursError, checkOut } = useVolunteerHours()
  
  const [tabValue, setTabValue] = React.useState(0)
  const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null)
  const [qrDialogOpen, setQrDialogOpen] = React.useState(false)
  const [eventDialogOpen, setEventDialogOpen] = React.useState(false)
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

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleCreateEvent = async () => {
    try {
      // This would be implemented with the createEvent function
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
      width: 150,
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
            <IconButton size="small">
              <EditIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      )
    }
  ]

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
            {params.value ? `${params.value}h` : 'N/A'}
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
              <Tab label="All Events" />
              <Tab 
                label={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <RestaurantIcon />
                    <span>Taste of Korea</span>
                  </Stack>
                } 
              />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <DataGrid
              rows={events}
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
              sx={{ height: 600 }}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
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

      {/* Create Event Dialog */}
      <Dialog open={eventDialogOpen} onClose={() => setEventDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Event</DialogTitle>
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
          <Button onClick={() => setEventDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateEvent}>
            Create Event
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
