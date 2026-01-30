
import * as React from 'react'
import {
  Box, Button, TextField, Dialog, 
  DialogTitle, DialogContent, DialogActions, FormControlLabel, Switch, 
  Stack, Typography, IconButton, Chip, InputAdornment, Alert,
  Grid, Card, CardMedia, CardContent, CardActionArea, CardActions,
  Avatar, Divider
} from '@mui/material'
import { Plus, Trash, Save, X, School, Clock, DollarSign } from 'lucide-react'
import { useAcademies } from '../hooks/useAcademies'
import { TeacherSelector } from '../../teacher/components/TeacherSelector'
import { useTeachers } from '../../teacher/hooks/useTeachers'
import type { Academy, AcademyInput, AcademyLevel } from '../hooks/useAcademies'
import { CircularProgress } from '@mui/material'

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
  const { teachers } = useTeachers() // To fetch premium teacher photos
  
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState<AcademyInput>(INITIAL_FORM_STATE)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const [deleteId, setDeleteId] = React.useState<string | null>(null)

  // Helper to get teacher photo
  const getTeacherPhoto = (teacherData: { name?: string; email?: string } | undefined) => {
    if (!teacherData?.email && !teacherData?.name) return undefined
    // Try to match by name or email
    const found = teachers.find(t => 
      (t.email && t.email === teacherData.email) || 
      t.name === teacherData.name
    )
    return found?.photoURL
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    )
  }

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
      // Additional fields (fallback to defaults if missing)
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
  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
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

  const handleLevelChange = (index: number, field: keyof AcademyLevel, value: string | number | AcademyLevel['teacher']) => {
    const updatedLevels = [...(formData.levels || [])]
    updatedLevels[index] = { ...updatedLevels[index], [field]: value }
    setFormData({ ...formData, levels: updatedLevels })
  }

  const handleRemoveLevel = (index: number) => {
    const updatedLevels = [...(formData.levels || [])]
    updatedLevels.splice(index, 1)
    setFormData({ ...formData, levels: updatedLevels })
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Academy Settings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage classes, schedules, and teachers
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Plus size={18} />}
          onClick={handleCreateClick}
          sx={{ borderRadius: 2, px: 3, py: 1 }}
        >
          New Academy
        </Button>
      </Stack>

      <Grid container spacing={3}>
        {academies.map((academy) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={academy.id}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 4, 
                border: '1px solid', 
                borderColor: 'divider',
                overflow: 'visible',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 12px 24px -10px rgba(0,0,0,0.1)',
                  borderColor: 'primary.main'
                }
              }}
            >
              <CardActionArea 
                onClick={() => handleEditClick(academy)}
                sx={{ borderRadius: 4, overflow: 'hidden' }}
              >
                {/* Cover Image */}
                <Box sx={{ position: 'relative', height: 160, width: '100%', bgcolor: 'action.hover' }}>
                  {academy.image ? (
                    <CardMedia
                      component="img"
                      height="160"
                      image={academy.image}
                      alt={academy.name}
                      sx={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <Box sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
                      color: 'white'
                    }}>
                      <School size={48} opacity={0.5} />
                    </Box>
                  )}
                  
                  {/* Status Badge */}
                  <Chip 
                    label={academy.enabled ? 'Active' : 'Disabled'} 
                    size="small"
                    color={academy.enabled ? 'success' : 'default'}
                    sx={{ 
                      position: 'absolute', 
                      top: 12, 
                      right: 12, 
                      bgcolor: academy.enabled ? 'rgba(34, 197, 94, 0.9)' : 'rgba(100, 116, 139, 0.9)',
                      color: 'white',
                      fontWeight: 600,
                      backdropFilter: 'blur(4px)'
                    }} 
                  />
                  
                  {/* Price Badge */}
                  <Chip 
                    icon={<DollarSign size={14} color="white" />}
                    label={academy.price}
                    size="small"
                    sx={{ 
                      position: 'absolute', 
                      bottom: 12, 
                      right: 12, 
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      backdropFilter: 'blur(4px)',
                      border: '1px solid rgba(255,255,255,0.2)'
                    }} 
                  />
                </Box>

                <CardContent sx={{ pb: 1 }}>
                  <Typography variant="h6" fontWeight={700} noWrap gutterBottom>
                    {academy.name}
                  </Typography>
                  
                  <Stack spacing={1.5} mt={2}>
                    {/* Teacher */}
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar 
                        src={getTeacherPhoto(academy.teacher)} 
                        sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.light' }}
                      >
                        {academy.teacher?.name?.[0] || 'T'}
                      </Avatar>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {academy.teacher?.name || 'No Teacher Assigned'}
                      </Typography>
                    </Stack>

                    {/* Schedule */}
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Clock size={16} color="#94a3b8" />
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {academy.hasLevels ? `${academy.levels?.length || 0} Levels` : (academy.schedule || 'TBD')}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </CardActionArea>
              
              <Divider sx={{ mt: 1, opacity: 0.5 }} />

              <CardActions sx={{ justifyContent: 'flex-end', px: 2, py: 1 }}>
                 <IconButton size="small" onClick={(e) => handleDeleteClick(e, academy.id)} color="error" sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}>
                   <Trash size={18} />
                 </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>


      {/* Create/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
          {editingId ? 'Edit Academy' : 'New Academy'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          
          <Stack spacing={3} mt={1}>
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

            {/* Teacher Information (Selector) */}
            <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2 }}>
              Teacher Assignment
            </Typography>
            
            <TeacherSelector 
              selectedTeacher={formData.teacher} 
              onTeacherChange={(newTeacher) => setFormData({ ...formData, teacher: newTeacher })} 
            />

            {/* Status Toggles */}
            <Stack direction="row" spacing={3} alignItems="center" sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
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
                label="Has Levels"
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
                    <Box key={index} sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                        <TextField
                          size="small"
                          label="Level Name"
                          placeholder="Level Name"
                          value={level.name}
                          onChange={(e) => handleLevelChange(index, 'name', e.target.value)}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          size="small"
                          label="Schedule"
                          placeholder="Schedule"
                          value={level.schedule}
                          onChange={(e) => handleLevelChange(index, 'schedule', e.target.value)}
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          size="small"
                          type="number"
                          label="Order"
                          value={level.order}
                          onChange={(e) => handleLevelChange(index, 'order', Number(e.target.value))}
                          sx={{ width: 80 }}
                        />
                        <IconButton size="small" color="error" onClick={() => handleRemoveLevel(index)}>
                          <X size={16} />
                        </IconButton>
                      </Stack>
                      
                      {/* Level Teacher */}
                       <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                          Level Teacher (Optional)
                        </Typography>
                       <TeacherSelector 
                          selectedTeacher={level.teacher} 
                          onTeacherChange={(newTeacher) => handleLevelChange(index, 'teacher', newTeacher)} 
                        />
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
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
