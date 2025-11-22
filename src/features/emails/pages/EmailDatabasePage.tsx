import * as React from 'react'
import {
  Card, CardHeader, CardContent, Grid, Stack, Button, Chip,
  TextField, Autocomplete, Typography, Box, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, FormControl, InputLabel, Select, MenuItem,
  FormControlLabel, Switch, Divider
} from '@mui/material'
import {
  DataGrid, GridToolbar, type GridColDef
} from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import DownloadIcon from '@mui/icons-material/Download'
import UploadIcon from '@mui/icons-material/Upload'
import EmailIcon from '@mui/icons-material/Email'
import PersonIcon from '@mui/icons-material/Person'
import SchoolIcon from '@mui/icons-material/School'
import PaymentIcon from '@mui/icons-material/Payment'
import GroupIcon from '@mui/icons-material/Group'
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism'
import EventIcon from '@mui/icons-material/Event'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import BlockIcon from '@mui/icons-material/Block'

import { useEmailDatabase } from '../hooks/useEmailDatabase'
import type { EmailRecord, EmailSource } from '../types'
import { notifySuccess, notifyError } from '../../../lib/alerts'
import Swal from 'sweetalert2'

const EmailDatabasePage = React.memo(() => {
  const {
    emails,
    loading,
    addEmail,
    updateEmail,
    deleteEmail,
    importEmailsFromSource,
    importFromCSV,
    autoImportAll,
    importFromPastedEmails,
    importFromPayments,
    importFromTeachers,
    importFromSpringAcademy,
    importFromKDrama,
    importFromTripToKorea,
    importFromVolunteers,
    importFromSubscribers,
    importFromEventbrite,
    exportEventbriteEmails,
    markEmailsAsBounced
  } = useEmailDatabase()

  const [mainTabValue, setMainTabValue] = React.useState(0)
  const [importTabValue, setImportTabValue] = React.useState(0)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [selectedSource, setSelectedSource] = React.useState<EmailSource | 'all'>('all')
  const [selectedTag, setSelectedTag] = React.useState<string>('all')
  const [showOnlyActive, setShowOnlyActive] = React.useState(true)
  
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [selectedEmail, setSelectedEmail] = React.useState<EmailRecord | null>(null)
  const [importDialogOpen, setImportDialogOpen] = React.useState(false)
  const [bouncedDialogOpen, setBouncedDialogOpen] = React.useState(false)
  const [csvFile, setCsvFile] = React.useState<File | null>(null)
  const [pastedEmails, setPastedEmails] = React.useState('')
  const [eventbriteEmails, setEventbriteEmails] = React.useState('')
  const [bouncedEmails, setBouncedEmails] = React.useState('')

  // Form states
  const [formData, setFormData] = React.useState({
    email: '',
    firstName: '',
    lastName: '',
    source: 'manual' as EmailSource,
    tags: [] as string[],
    notes: '',
    isActive: true
  })

  // Memoize search term to avoid unnecessary recalculations
  const searchTermLower = React.useMemo(() => searchTerm.toLowerCase(), [searchTerm])
  
  // Filter emails based on current filters
  const filteredEmails = React.useMemo(() => {
    if (!emails || emails.length === 0) return []
    let filtered = emails

    // Exclude staff, volunteer, and eventbrite emails from main list
    filtered = filtered.filter(email => 
      email.source !== 'staff' && 
      !email.tags?.includes('staff') &&
      !email.tags?.includes('teacher') &&
      !email.tags?.includes('volunteer') &&
      email.source !== 'eventbrite' &&
      !email.tags?.includes('eventbrite')
    )

    // Search filter (apply early)
    if (searchTermLower) {
      filtered = filtered.filter(email => 
        email.email.toLowerCase().includes(searchTermLower) ||
        (email.firstName && email.firstName.toLowerCase().includes(searchTermLower)) ||
        (email.lastName && email.lastName.toLowerCase().includes(searchTermLower)) ||
        email.source.toLowerCase().includes(searchTermLower) ||
        (email.tags && email.tags.some(tag => tag.toLowerCase().includes(searchTermLower)))
      )
    }

    // Source filter
    if (selectedSource !== 'all') {
      filtered = filtered.filter(email => email.source === selectedSource)
    }

    // Tag filter
    if (selectedTag !== 'all') {
      filtered = filtered.filter(email => email.tags?.includes(selectedTag))
    }

    // Active filter
    if (showOnlyActive) {
      filtered = filtered.filter(email => email.isActive)
    }

    // Remove duplicates (keep first occurrence) - apply last
    const seenEmails = new Set<string>()
    filtered = filtered.filter(email => {
      const emailKey = email.email.toLowerCase().trim()
      if (seenEmails.has(emailKey)) {
        return false // Skip duplicate
      }
      seenEmails.add(emailKey)
      return true
    })

    return filtered
  }, [emails, searchTermLower, selectedSource, selectedTag, showOnlyActive])

  // Filter staff emails
  const filteredStaffEmails = React.useMemo(() => {
    let filtered = emails

    // Only include staff emails
    filtered = filtered.filter(email => 
      email.source === 'staff' || 
      email.tags?.includes('staff') ||
      email.tags?.includes('teacher')
    )

    // Search filter (apply early)
    if (searchTermLower) {
      filtered = filtered.filter(email => 
        email.email.toLowerCase().includes(searchTermLower) ||
        (email.firstName && email.firstName.toLowerCase().includes(searchTermLower)) ||
        (email.lastName && email.lastName.toLowerCase().includes(searchTermLower)) ||
        email.source.toLowerCase().includes(searchTermLower) ||
        (email.tags && email.tags.some(tag => tag.toLowerCase().includes(searchTermLower)))
      )
    }

    // Source filter
    if (selectedSource !== 'all') {
      filtered = filtered.filter(email => email.source === selectedSource)
    }

    // Tag filter
    if (selectedTag !== 'all') {
      filtered = filtered.filter(email => email.tags?.includes(selectedTag))
    }

    // Active filter
    if (showOnlyActive) {
      filtered = filtered.filter(email => email.isActive)
    }

    // Remove duplicates (keep first occurrence) - apply last
    const seenEmails = new Set<string>()
    filtered = filtered.filter(email => {
      const emailKey = email.email.toLowerCase().trim()
      if (seenEmails.has(emailKey)) {
        return false // Skip duplicate
      }
      seenEmails.add(emailKey)
      return true
    })

    return filtered
  }, [emails, searchTermLower, selectedSource, selectedTag, showOnlyActive])

  // Filter volunteer emails
  const filteredVolunteerEmails = React.useMemo(() => {
    let filtered = emails

    // Only include volunteer emails
    filtered = filtered.filter(email => 
      email.tags?.includes('volunteer')
    )

    // Search filter (apply early)
    if (searchTermLower) {
      filtered = filtered.filter(email => 
        email.email.toLowerCase().includes(searchTermLower) ||
        (email.firstName && email.firstName.toLowerCase().includes(searchTermLower)) ||
        (email.lastName && email.lastName.toLowerCase().includes(searchTermLower)) ||
        email.source.toLowerCase().includes(searchTermLower) ||
        (email.tags && email.tags.some(tag => tag.toLowerCase().includes(searchTermLower)))
      )
    }

    // Source filter
    if (selectedSource !== 'all') {
      filtered = filtered.filter(email => email.source === selectedSource)
    }

    // Tag filter
    if (selectedTag !== 'all') {
      filtered = filtered.filter(email => email.tags?.includes(selectedTag))
    }

    // Active filter
    if (showOnlyActive) {
      filtered = filtered.filter(email => email.isActive)
    }

    // Remove duplicates (keep first occurrence) - apply last
    const seenEmails = new Set<string>()
    filtered = filtered.filter(email => {
      const emailKey = email.email.toLowerCase().trim()
      if (seenEmails.has(emailKey)) {
        return false // Skip duplicate
      }
      seenEmails.add(emailKey)
      return true
    })

    return filtered
  }, [emails, searchTermLower, selectedSource, selectedTag, showOnlyActive])

  // Filter eventbrite emails
  const filteredEventbriteEmails = React.useMemo(() => {
    let filtered = emails

    // Only include eventbrite emails
    filtered = filtered.filter(email => 
      email.source === 'eventbrite' || 
      email.tags?.includes('eventbrite')
    )

    // Search filter (apply early)
    if (searchTermLower) {
      filtered = filtered.filter(email => 
        email.email.toLowerCase().includes(searchTermLower) ||
        (email.firstName && email.firstName.toLowerCase().includes(searchTermLower)) ||
        (email.lastName && email.lastName.toLowerCase().includes(searchTermLower)) ||
        email.source.toLowerCase().includes(searchTermLower) ||
        (email.tags && email.tags.some(tag => tag.toLowerCase().includes(searchTermLower)))
      )
    }

    // Source filter
    if (selectedSource !== 'all') {
      filtered = filtered.filter(email => email.source === selectedSource)
    }

    // Tag filter
    if (selectedTag !== 'all') {
      filtered = filtered.filter(email => email.tags?.includes(selectedTag))
    }

    // Active filter
    if (showOnlyActive) {
      filtered = filtered.filter(email => email.isActive)
    }

    // Remove duplicates (keep first occurrence) - apply last
    const seenEmails = new Set<string>()
    filtered = filtered.filter(email => {
      const emailKey = email.email.toLowerCase().trim()
      if (seenEmails.has(emailKey)) {
        return false // Skip duplicate
      }
      seenEmails.add(emailKey)
      return true
    })

    return filtered
  }, [emails, searchTermLower, selectedSource, selectedTag, showOnlyActive])

  // Get unique tags
  const availableTags = React.useMemo(() => {
    const tags = new Set<string>()
    emails.forEach(email => {
      email.tags?.forEach(tag => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [emails])

  // Calculate total unique emails
  const totalUniqueEmails = React.useMemo(() => {
    const seenEmails = new Set<string>()
    emails.forEach(email => {
      const emailKey = email.email.toLowerCase().trim()
      seenEmails.add(emailKey)
    })
    return seenEmails.size
  }, [emails])

  // Get unique sources
  const availableSources = React.useMemo(() => {
    const sources = new Set<EmailSource>()
    emails.forEach(email => sources.add(email.source))
    return Array.from(sources).sort()
  }, [emails])

  // Handle import from source
  const handleImportFromSource = async (source: EmailSource) => {
    try {
      const count = await importEmailsFromSource(source)
      notifySuccess(`Imported ${count} emails from ${source}`)
    } catch (err) {
      notifyError(`Failed to import emails from ${source}`)
    }
  }

  // Handle import from payments
  const handleImportFromPayments = async () => {
    try {
      const count = await importFromPayments()
      notifySuccess(`Imported ${count} emails from payments`)
    } catch (err) {
      notifyError('Failed to import emails from payments')
    }
  }

  // Handle import from teachers
  const handleImportFromTeachers = async () => {
    try {
      const count = await importFromTeachers()
      notifySuccess(`Imported ${count} emails from teachers`)
    } catch (err) {
      notifyError('Failed to import emails from teachers')
    }
  }

  // Handle import from spring academy
  const handleImportFromSpringAcademy = async () => {
    try {
      const count = await importFromSpringAcademy()
      notifySuccess(`Imported ${count} emails from spring academy`)
    } catch (err) {
      notifyError('Failed to import emails from spring academy')
    }
  }

  // Handle import from k-drama
  const handleImportFromKDrama = async () => {
    try {
      const count = await importFromKDrama()
      notifySuccess(`Imported ${count} emails from k-drama`)
    } catch (err) {
      notifyError('Failed to import emails from k-drama')
    }
  }

  // Handle import from trip to korea
  const handleImportFromTripToKorea = async () => {
    try {
      const count = await importFromTripToKorea()
      notifySuccess(`Imported ${count} emails from trip to korea`)
    } catch (err) {
      notifyError('Failed to import emails from trip to korea')
    }
  }

  // Handle import from volunteers
  const handleImportFromVolunteers = async () => {
    try {
      const count = await importFromVolunteers()
      notifySuccess(`Imported ${count} emails from volunteers`)
    } catch (err) {
      notifyError('Failed to import emails from volunteers')
    }
  }

  // Handle import from subscribers
  const handleImportFromSubscribers = async () => {
    try {
      const count = await importFromSubscribers()
      notifySuccess(`Imported ${count} emails from subscribers`)
    } catch (err) {
      notifyError('Failed to import emails from subscribers')
    }
  }

  // Handle import from Eventbrite
  const handleImportFromEventbrite = async () => {
    try {
      if (!eventbriteEmails.trim()) {
        notifyError('Please paste the Eventbrite emails first')
        return
      }

      // Parse the pasted emails
      const emails = eventbriteEmails
        .split(/[\n\r\t,;]+/)
        .map(email => email.trim())
        .filter(email => email && email.includes('@'))

      const count = await importFromEventbrite(emails)
      notifySuccess(`Imported ${count} emails from Eventbrite`)
      setEventbriteEmails('')
    } catch (err) {
      notifyError('Failed to import emails from Eventbrite')
    }
  }

  // Handle export Eventbrite emails
  const handleExportEventbriteEmails = () => {
    try {
      exportEventbriteEmails()
      notifySuccess('Eventbrite emails exported successfully')
    } catch (err) {
      notifyError('Failed to export Eventbrite emails')
    }
  }

  // Handle mark emails as bounced
  const handleMarkAsBounced = async () => {
    if (!bouncedEmails.trim()) {
      notifyError('Please paste the bounced emails first')
      return
    }

    try {
      // Parse the pasted emails
      const emails = bouncedEmails
        .split(/[\n\r\t,;]+/)
        .map(email => email.trim())
        .filter(email => email && email.includes('@'))

      if (emails.length === 0) {
        notifyError('No valid emails found in the pasted text')
        return
      }

      const result = await Swal.fire({
        title: 'Mark Emails as Bounced?',
        html: `
          <p>This will mark <strong>${emails.length}</strong> email(s) as inactive (bounced).</p>
          <p>They will be excluded from future email campaigns.</p>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, Mark as Bounced',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#d33'
      })

      if (result.isConfirmed) {
        const { updatedCount, notFoundCount } = await markEmailsAsBounced(emails)
        
        let message = `Marked ${updatedCount} email(s) as bounced.`
        if (notFoundCount > 0) {
          message += ` ${notFoundCount} email(s) were not found in the database.`
        }
        
        notifySuccess(message)
        setBouncedEmails('')
        setBouncedDialogOpen(false)
      }
    } catch (err) {
      notifyError('Failed to mark emails as bounced')
    }
  }

  // Handle auto-import all sources
  const handleAutoImportAll = async () => {
    try {
      const count = await autoImportAll()
      notifySuccess(`Auto-imported ${count} emails from all sources`)
    } catch (err) {
      notifyError('Failed to auto-import emails')
    }
  }


  // Handle CSV file selection
  const handleCsvFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
    } else {
      notifyError('Please select a valid CSV file')
    }
  }

  // Handle CSV import
  const handleCsvImport = async () => {
    if (!csvFile) {
      notifyError('Please select a CSV file first')
      return
    }

    try {
      const content = await csvFile.text()
      const count = await importFromCSV(content, csvFile.name)
      notifySuccess(`Imported ${count} emails from CSV file`)
      setCsvFile(null)
      setImportDialogOpen(false)
    } catch (err) {
      notifyError('Failed to import CSV file')
    }
  }

  // Handle pasted emails import
  const handlePastedEmailsImport = async () => {
    if (!pastedEmails.trim()) {
      notifyError('Please paste some emails first')
      return
    }

    try {
      const count = await importFromPastedEmails(pastedEmails)
      notifySuccess(`Imported ${count} emails from pasted text`)
      setPastedEmails('')
      setImportDialogOpen(false)
    } catch (err) {
      notifyError('Failed to import pasted emails')
    }
  }

  // Handle add email
  const handleAddEmail = async () => {
    if (!formData.email) {
      notifyError('Email is required')
      return
    }

    try {
      await addEmail(formData)
      setAddDialogOpen(false)
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        source: 'manual',
        tags: [],
        notes: '',
        isActive: true
      })
      notifySuccess('Email added successfully')
    } catch (err) {
      notifyError('Failed to add email')
    }
  }

  // Handle edit email
  const handleEditEmail = async () => {
    if (!selectedEmail) return

    try {
      await updateEmail(selectedEmail.id, formData)
      setEditDialogOpen(false)
      setSelectedEmail(null)
      notifySuccess('Email updated successfully')
    } catch (err) {
      notifyError('Failed to update email')
    }
  }

  // Handle delete email
  const handleDeleteEmail = async (email: EmailRecord) => {
    const result = await Swal.fire({
      title: 'Delete Email',
      text: `Are you sure you want to delete ${email.email}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        await deleteEmail(email.id)
        notifySuccess('Email deleted successfully')
      } catch (err) {
        notifyError('Failed to delete email')
      }
    }
  }

  // Handle export emails
  const handleExportEmails = () => {
    const csvContent = [
      ['Email', 'First Name', 'Last Name', 'Source', 'Tags', 'Active', 'Notes'],
      ...filteredEmails.map(email => [
        email.email,
        email.firstName || '',
        email.lastName || '',
        email.source,
        email.tags?.join(', ') || '',
        email.isActive ? 'Yes' : 'No',
        email.notes || ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `email-database-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Grid columns
  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: '#',
      width: 60,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => {
        const currentEmails = 
          mainTabValue === 0 ? filteredEmails : 
          mainTabValue === 1 ? filteredStaffEmails : 
          mainTabValue === 2 ? filteredVolunteerEmails :
          filteredEventbriteEmails
        const rowIndex = currentEmails.findIndex(email => email.id === params.row.id) + 1
        return (
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {rowIndex}
          </Typography>
        )
      }
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 250,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon fontSize="small" color="primary" />
          {params.value}
        </Box>
      )
    },
    {
      field: 'name',
      headerName: 'Name',
      width: 200,
      valueGetter: (params) => {
        const firstName = params.row.firstName || ''
        const lastName = params.row.lastName || ''
        return `${firstName} ${lastName}`.trim() || 'N/A'
      }
    },
    {
      field: 'isActive',
      headerName: 'Active',
      width: 80,
      type: 'boolean',
      renderCell: (params) => (
        <Chip 
          size="small" 
          label={params.value ? 'Yes' : 'No'} 
          color={params.value ? 'success' : 'default'}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Edit">
            <IconButton 
              size="small" 
              onClick={() => {
                setSelectedEmail(params.row)
                setFormData({
                  email: params.row.email,
                  firstName: params.row.firstName || '',
                  lastName: params.row.lastName || '',
                  source: params.row.source,
                  tags: params.row.tags || [],
                  notes: params.row.notes || '',
                  isActive: params.row.isActive
                })
                setEditDialogOpen(true)
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton 
              size="small" 
              onClick={() => handleDeleteEmail(params.row)}
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ]

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Email Database
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Manage email addresses collected from all system tables for invitation campaigns
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <EmailIcon color="primary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{totalUniqueEmails}</Typography>
                  <Typography color="text.secondary">Total Emails</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PersonIcon color="success" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{filteredEmails.length}</Typography>
                  <Typography color="text.secondary">Students & Others</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <GroupIcon color="info" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{filteredStaffEmails.length}</Typography>
                  <Typography color="text.secondary">Staff</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <VolunteerActivismIcon color="warning" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{filteredVolunteerEmails.length}</Typography>
                  <Typography color="text.secondary">Volunteers</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <EventIcon color="secondary" sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4">{filteredEventbriteEmails.length}</Typography>
                  <Typography color="text.secondary">Eventbrite</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Card>
        <CardHeader
          title="Email Management"
          action={
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={handleAutoImportAll}
                color="success"
              >
                Auto Import All
              </Button>
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                onClick={() => setImportDialogOpen(true)}
              >
                Import
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportEmails}
              >
                Export
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<BlockIcon />}
                onClick={() => setBouncedDialogOpen(true)}
              >
                Mark as Bounced
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddDialogOpen(true)}
              >
                Add Email
              </Button>
            </Stack>
          }
        />
        <Tabs value={mainTabValue} onChange={(_, newValue) => setMainTabValue(newValue)} sx={{ px: 2 }}>
          <Tab label="Students & Others" />
          <Tab label="Staff" />
          <Tab label="Volunteers" />
          <Tab label="Eventbrite" />
        </Tabs>
        <CardContent>
          {/* Filters */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search emails..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Source</InputLabel>
                <Select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value as EmailSource | 'all')}
                >
                  <MenuItem value="all">All Sources</MenuItem>
                  {availableSources.map(source => (
                    <MenuItem key={source} value={source}>{source}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tag</InputLabel>
                <Select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                >
                  <MenuItem value="all">All Tags</MenuItem>
                  {availableTags.map(tag => (
                    <MenuItem key={tag} value={tag}>{tag}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showOnlyActive}
                    onChange={(e) => setShowOnlyActive(e.target.checked)}
                  />
                }
                label="Active Only"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  setSearchTerm('')
                  setSelectedSource('all')
                  setSelectedTag('all')
                  setShowOnlyActive(true)
                }}
              >
                Reset
              </Button>
            </Grid>
          </Grid>

          {/* Data Grid */}
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={
                mainTabValue === 0 ? filteredEmails : 
                mainTabValue === 1 ? filteredStaffEmails : 
                mainTabValue === 2 ? filteredVolunteerEmails :
                filteredEventbriteEmails
              }
              columns={columns}
              loading={loading}
              pageSizeOptions={[100, 200, 500]}
              initialState={{
                pagination: { paginationModel: { pageSize: 100 } }
              }}
              slots={{ toolbar: GridToolbar }}
              getRowId={(row) => row.id}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Add Email Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Email</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={['student', 'parent', 'staff', 'teacher', 'admin']}
                value={formData.tags}
                onChange={(_, value) => setFormData(prev => ({ ...prev, tags: value }))}
                renderInput={(params) => (
                  <TextField {...params} label="Tags" placeholder="Select tags" />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddEmail}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Email Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Email</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={['student', 'parent', 'staff', 'teacher', 'admin']}
                value={formData.tags}
                onChange={(_, value) => setFormData(prev => ({ ...prev, tags: value }))}
                renderInput={(params) => (
                  <TextField {...params} label="Tags" placeholder="Select tags" />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                }
                label="Active"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleEditEmail}>Update</Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Emails</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Import email addresses from system tables or CSV files. Duplicates will be automatically avoided.
          </Typography>
          
          <Tabs value={importTabValue} onChange={(_, newValue) => setImportTabValue(newValue)} sx={{ mb: 2 }}>
            <Tab label="Students & Others" />
            <Tab label="Staff" />
          </Tabs>
          
          {/* Tab Content */}
          {importTabValue === 0 && (
            <Box>
              {/* Paste Emails Section */}
              <Box sx={{ mb: 3, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>Paste Emails (Ctrl+V)</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Paste emails copied from Excel, separated by commas, semicolons, or new lines
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="email1@example.com, email2@example.com&#10;email3@example.com&#10;email4@example.com"
                  value={pastedEmails}
                  onChange={(e) => setPastedEmails(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={handlePastedEmailsImport}
                  disabled={!pastedEmails.trim()}
                  fullWidth
                >
                  Import Pasted Emails
                </Button>
              </Box>

              {/* CSV Import Section */}
              <Box sx={{ mb: 3, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>Import from CSV File</Typography>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileSelect}
                  style={{ marginBottom: 16 }}
                />
                {csvFile && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="success.main">
                      Selected: {csvFile.name}
                    </Typography>
                  </Box>
                )}
                <Button
                  variant="contained"
                  onClick={handleCsvImport}
                  disabled={!csvFile}
                  fullWidth
                >
                  Import CSV
                </Button>
              </Box>

              {/* Eventbrite Import Section */}
              <Box sx={{ mb: 3, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>Import from Eventbrite</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Paste the "Buyer email" list from Eventbrite
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  placeholder="elisao01@yahoo.com&#10;aldamarcondes12@gmail.com&#10;varona40@yahoo.com&#10;..."
                  value={eventbriteEmails}
                  onChange={(e) => setEventbriteEmails(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleImportFromEventbrite}
                  disabled={!eventbriteEmails.trim()}
                  fullWidth
                >
                  Import Eventbrite Emails
                </Button>
                
                {/* Export Eventbrite Emails Button */}
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportEventbriteEmails}
                  disabled={filteredEventbriteEmails.length === 0}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  Download Eventbrite Emails ({filteredEventbriteEmails.length})
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Students & Others Tables */}
              <Typography variant="h6" gutterBottom>Import from System Tables</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Available tables: 1. registrations, 2. payments, 3. teachers, 4. spring_academy_2025, 5. k_drama_with_friends_registration, 6. trip_to_korea_registration, 7. volunteer_applications, 8. subscribers
              </Typography>
              <Stack spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<PersonIcon />}
                  onClick={() => handleImportFromSource('registrations')}
                  fullWidth
                >
                  1. Import from Registrations
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PaymentIcon />}
                  onClick={handleImportFromPayments}
                  fullWidth
                >
                  2. Import from Payments
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<SchoolIcon />}
                  onClick={handleImportFromTeachers}
                  fullWidth
                >
                  3. Import from Teachers
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PersonIcon />}
                  onClick={handleImportFromSpringAcademy}
                  fullWidth
                >
                  4. Import from Spring Academy 2025
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PersonIcon />}
                  onClick={handleImportFromKDrama}
                  fullWidth
                >
                  5. Import from K-Drama Registration
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PersonIcon />}
                  onClick={handleImportFromTripToKorea}
                  fullWidth
                >
                  6. Import from Trip to Korea Registration
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<GroupIcon />}
                  onClick={handleImportFromVolunteers}
                  fullWidth
                >
                  7. Import from Volunteer Applications
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PersonIcon />}
                  onClick={handleImportFromSubscribers}
                  fullWidth
                >
                  8. Import from Subscribers
                </Button>
              </Stack>
            </Box>
          )}

          {importTabValue === 1 && (
            <Box>
              {/* Staff Tables */}
              <Typography variant="h6" gutterBottom>Import from Staff Tables</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Staff-related tables: 1. staff, 2. staff_profiles
              </Typography>
              <Stack spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<GroupIcon />}
                  onClick={() => handleImportFromSource('staff')}
                  fullWidth
                >
                  1. Import from Staff
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<GroupIcon />}
                  onClick={() => handleImportFromSource('staff_profiles')}
                  fullWidth
                >
                  2. Import from Staff Profiles
                </Button>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Mark as Bounced Dialog */}
      <Dialog open={bouncedDialogOpen} onClose={() => setBouncedDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Mark Emails as Bounced</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Paste the list of bounced email addresses below. Each email will be marked as inactive and excluded from future campaigns.
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={12}
            label="Bounced Emails"
            placeholder="Paste emails here, one per line or separated by commas/semicolons..."
            value={bouncedEmails}
            onChange={(e) => setBouncedEmails(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Typography variant="caption" color="text.secondary">
            You can paste emails separated by newlines, commas, or semicolons. Invalid emails will be automatically filtered out.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setBouncedDialogOpen(false)
            setBouncedEmails('')
          }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleMarkAsBounced}
            disabled={!bouncedEmails.trim()}
          >
            Mark as Bounced
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
})

export default EmailDatabasePage
