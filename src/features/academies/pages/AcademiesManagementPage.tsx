import * as React from 'react'
import {
  Box, Card, Button, TextField, Dialog, 
  DialogTitle, DialogContent, DialogActions, FormControlLabel, Switch, 
  Stack, Typography, IconButton, Chip, InputAdornment, Alert
} from '@mui/material'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { Plus, Edit, Trash, Save, X, School } from 'lucide-react'
import { useAcademies } from '../hooks/useAcademies'
import type { Academy, AcademyInput, AcademyLevel } from '../hooks/useAcademies'

// Initial state for form
const INITIAL_FORM_STATE: AcademyInput = {
  name: '',
  price: 50,
  schedule: '',
  hasLevels: false,
  levels: [],
  order: 99,
  enabled: true,
  description: '',
  teacher: undefined,
  // Additional fields
  active: true,
  image: '',
  tag: '',
  catchPhrase: '',
  goal: [],
  age: '',
  equipment: '',
  requirements: [],
  gallery: [],
  desc1: '',
  desc2: '',
  desc3: '',
  linkName: ''
}

export default function AcademiesManagementPage() {
  const { academies, loading, error, addAcademy, updateAcademy, deleteAcademy } = useAcademies()
  
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState<AcademyInput>(INITIAL_FORM_STATE)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  // Handle Edit Click
  const handleEditClick = (academy: Academy) => {
    setEditingId(academy.id)
    setFormData({
      name: academy.name,
      price: academy.price,
      schedule: academy.schedule,
      hasLevels: academy.hasLevels,
      levels: academy.levels ? [...academy.levels] : [],
      order: academy.order,
      enabled: academy.enabled,
      description: academy.description,
      teacher: academy.teacher ? { ...academy.teacher } : undefined,
      // Additional fields
      active: academy.active ?? true,
      image: academy.image || '',
      tag: academy.tag || '',
      catchPhrase: academy.catchPhrase || '',
      goal: academy.goal ? [...academy.goal] : [],
      age: academy.age || '',
      equipment: academy.equipment || '',
      requirements: academy.requirements ? [...academy.requirements] : [],
      gallery: academy.gallery ? [...academy.gallery] : [],
      desc1: academy.desc1 || '',
      desc2: academy.desc2 || '',
      desc3: academy.desc3 || '',
      linkName: academy.linkName || ''
    })
    setDialogOpen(true)
  }

  // Handle Create Click
  const handleCreateClick = () => {
    setEditingId(null)
    setFormData({ ...INITIAL_FORM_STATE, order: academies.length + 1 })
    setDialogOpen(true)
  }

  // Handle Delete Click
  const handleDeleteClick = (id: string) => {
    setDeleteId(id)
    setDeleteConfirmOpen(true)
  }

  // Handle Save
  const handleSave = async () => {
    if (!formData.name) {
      setFormError('Academy name is required')
      return
    }

    try {
      if (editingId) {
        await updateAcademy(editingId, formData)
      } else {
        await addAcademy(formData)
      }
      setDialogOpen(false)
      setFormError(null)
    } catch {
      setFormError('Failed to save academy. Please try again.')
    }
  }

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (deleteId) {
      await deleteAcademy(deleteId)
      setDeleteConfirmOpen(false)
      setDeleteId(null)
    }
  }

  // --- Levels Management ---
  const handleAddLevel = () => {
    const newLevel: AcademyLevel = {
      name: '',
      schedule: '',
      order: (formData.levels?.length || 0) + 1
    }
    setFormData({
      ...formData,
      levels: [...(formData.levels || []), newLevel]
    })
  }

  const handleLevelChange = (index: number, field: keyof AcademyLevel, value: string | number) => {
    const updatedLevels = [...(formData.levels || [])]
    updatedLevels[index] = { ...updatedLevels[index], [field]: value }
    setFormData({ ...formData, levels: updatedLevels })
  }

  const handleRemoveLevel = (index: number) => {
    const updatedLevels = [...(formData.levels || [])]
    updatedLevels.splice(index, 1)
    setFormData({ ...formData, levels: updatedLevels })
  }


  // --- Columns ---
  const columns: GridColDef[] = [
    { field: 'order', headerName: 'Order', width: 70, type: 'number' },
    { 
      field: 'name', 
      headerName: 'Name', 
      flex: 1, 
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" alignItems="center" spacing={1}>
          <School size={16} />
          <Typography variant="body2">{params.value}</Typography>
        </Stack>
      )
    },
    { 
      field: 'price', 
      headerName: 'Price', 
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight={500}>
          ${params.value}
        </Typography>
      )
    },
    { field: 'schedule', headerName: 'Schedule', flex: 1, minWidth: 200 },
    { 
      field: 'hasLevels', 
      headerName: 'Levels', 
      width: 100, 
      type: 'boolean',
      renderCell: (params: GridRenderCellParams) => (
        params.value ? <Chip label="Yes" size="small" color="info" variant="outlined" /> : <span />
      )
    },
    { 
      field: 'enabled', 
      headerName: 'Status', 
      width: 100, 
      type: 'boolean',
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value ? 'Active' : 'Disabled'} 
          size="small" 
          color={params.value ? 'success' : 'default'} 
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Stack direction="row" spacing={1}>
          <IconButton size="small" onClick={() => handleEditClick(params.row)} color="primary">
            <Edit size={18} />
          </IconButton>
          <IconButton size="small" onClick={() => handleDeleteClick(params.row.id)} color="error">
            <Trash size={18} />
          </IconButton>
        </Stack>
      )
    }
  ]

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Academy Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage available academies, prices, and schedules
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Plus size={18} />}
          onClick={handleCreateClick}
          sx={{ borderRadius: 2 }}
        >
          Add Academy
        </Button>
      </Stack>

      <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={academies}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            slots={{ toolbar: GridToolbar }}
            initialState={{
              sorting: {
                sortModel: [{ field: 'order', sort: 'asc' }],
              },
            }}
          />
        </Box>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingId ? 'Edit Academy' : 'New Academy'}
        </DialogTitle>
        <DialogContent dividers>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Academy Name"
                fullWidth
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <TextField
                label="Price ($)"
                type="number"
                required
                sx={{ width: { sm: 150 } }}
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
              <TextField
                label="Order"
                type="number"
                sx={{ width: { sm: 100 } }}
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
              />
            </Stack>

            <TextField
              label="Schedule"
              fullWidth
              placeholder="e.g. 10:00 AM - 11:30 AM"
              value={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
              helperText="For academies without levels"
            />

            {/* Tag and Link Name */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Tag"
                fullWidth
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                helperText="Category tag"
              />
              <TextField
                label="Link Name"
                fullWidth
                value={formData.linkName}
                onChange={(e) => setFormData({ ...formData, linkName: e.target.value })}
                helperText="URL slug (e.g., 'art')"
              />
            </Stack>

            {/* Description and Catch Phrase */}
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />

            <TextField
              label="Catch Phrase"
              fullWidth
              value={formData.catchPhrase}
              onChange={(e) => setFormData({ ...formData, catchPhrase: e.target.value })}
              placeholder="e.g., Unleash your inner artist!"
            />

            {/* Detailed Descriptions */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 1 }}>
              Detailed Descriptions
            </Typography>
            <TextField
              label="Description 1"
              fullWidth
              multiline
              rows={2}
              value={formData.desc1}
              onChange={(e) => setFormData({ ...formData, desc1: e.target.value })}
            />
            <TextField
              label="Description 2"
              fullWidth
              multiline
              rows={2}
              value={formData.desc2}
              onChange={(e) => setFormData({ ...formData, desc2: e.target.value })}
            />
            <TextField
              label="Description 3"
              fullWidth
              multiline
              rows={2}
              value={formData.desc3}
              onChange={(e) => setFormData({ ...formData, desc3: e.target.value })}
            />

            {/* Media */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2 }}>
              Media
            </Typography>
            <TextField
              label="Image URL"
              fullWidth
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://..."
            />

            {/* Details */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2 }}>
              Academy Details
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Age Range"
                fullWidth
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="e.g., 7 yrs to adult"
              />
              <TextField
                label="Equipment"
                fullWidth
                value={formData.equipment}
                onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                placeholder="e.g., Sketchbook, pencils"
              />
            </Stack>

            {/* Teacher Information */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2 }}>
              Teacher Information
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Teacher Name"
                fullWidth
                value={formData.teacher?.name || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  teacher: { ...(formData.teacher || { name: '', email: '', phone: '' }), name: e.target.value }
                })}
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Teacher Email"
                  type="email"
                  fullWidth
                  value={formData.teacher?.email || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    teacher: { ...(formData.teacher || { name: '', email: '', phone: '' }), email: e.target.value }
                  })}
                />
                <TextField
                  label="Teacher Phone"
                  fullWidth
                  value={formData.teacher?.phone || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    teacher: { ...(formData.teacher || { name: '', email: '', phone: '' }), phone: e.target.value }
                  })}
                />
              </Stack>
              <TextField
                label="Teacher Credentials"
                fullWidth
                multiline
                rows={2}
                value={formData.teacher?.credentials || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  teacher: { ...(formData.teacher || { name: '', email: '', phone: '' }), credentials: e.target.value }
                })}
              />
            </Stack>

            {/* Status Toggles */}
            <Stack direction="row" spacing={3} alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.enabled}
                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  />
                }
                label="Enabled (Visible)"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.hasLevels}
                    onChange={(e) => setFormData({ ...formData, hasLevels: e.target.checked })}
                  />
                }
                label="Has Levels (e.g. Kotlin, English)"
              />
            </Stack>

            {/* Levels Editor */}
            {formData.hasLevels && (
              <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Levels / Sub-classes
                  </Typography>
                  <Button size="small" startIcon={<Plus size={16} />} onClick={handleAddLevel}>
                    Add Level
                  </Button>
                </Stack>
                
                {formData.levels?.length === 0 && (
                  <Typography variant="caption" color="text.secondary">No levels added yet.</Typography>
                )}

                <Stack spacing={2}>
                  {formData.levels?.map((level, index) => (
                    <Stack key={index} direction="row" spacing={2} alignItems="center">
                      <TextField
                        size="small"
                        placeholder="Level Name"
                        value={level.name}
                        onChange={(e) => handleLevelChange(index, 'name', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        placeholder="Schedule"
                        value={level.schedule}
                        onChange={(e) => handleLevelChange(index, 'schedule', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        type="number"
                        placeholder="Ord"
                        value={level.order}
                        onChange={(e) => handleLevelChange(index, 'order', Number(e.target.value))}
                        sx={{ width: 80 }}
                      />
                      <IconButton size="small" color="error" onClick={() => handleRemoveLevel(index)}>
                        <X size={16} />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            )}

          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave} startIcon={<Save size={18} />}>
            Save Academy
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Academy?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this academy? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
