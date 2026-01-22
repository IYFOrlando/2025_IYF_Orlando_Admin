import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Chip,
  Box,
  Typography,
  IconButton,
  Autocomplete,
  FormGroup,
  FormLabel,
  RadioGroup,
  Radio,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material'
import {
  Close as CloseIcon,
  Person as PersonIcon,
  ContactPhone as ContactIcon,
  Work as WorkIcon,
  Security as SecurityIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material'
import type { VolunteerApplication } from '../types'
import { generateVolunteerCode } from '../../../lib/volunteerCodes'
import { logger } from '../../../lib/logger'
import { isValidEmail, isRequired } from '../../../lib/validations'
import {
  GENDER_OPTIONS,
  TSHIRT_SIZES,
  VOLUNTEER_STATUS_OPTIONS,
  SKILL_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
  COMMITMENT_OPTIONS
} from '../../../lib/constants'

interface VolunteerFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (volunteer: Partial<VolunteerApplication>) => Promise<void>
  volunteer?: VolunteerApplication | null
  mode: 'create' | 'edit'
}

export default function VolunteerForm({ open, onClose, onSubmit, volunteer, mode }: VolunteerFormProps) {
  const [formData, setFormData] = useState<Partial<VolunteerApplication>>({
    firstName: '',
    lastName: '',
    email: '',
    gender: '',
    tshirtSize: '',
    emergencyContact: '',
    emergencyPhone: '',
    volunteerCode: '',
    source: 'admin',
    eventInfoAccepted: true,
    termsAccepted: true,
    status: 'pending',
    age: 18,
    phone: '',
    city: '',
    state: 'FL',
    country: 'USA',
    availability: {
      days: [],
      times: [],
      commitment: 'one-time',
      flexible: false,
      maxHoursPerDay: 8
    },
    interests: [],
    skills: [],
    languages: ['English'],
    backgroundCheckCompleted: false,
    trainingCompleted: false,
    orientationAttended: false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (volunteer && mode === 'edit') {
      setFormData({
        ...volunteer,
        availability: volunteer.availability || {
          days: [],
          times: [],
          commitment: 'one-time',
          flexible: false,
          maxHoursPerDay: 8
        },
        interests: volunteer.interests || [],
        skills: volunteer.skills || [],
        languages: volunteer.languages || ['English'],
      })
    } else if (mode === 'create') {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        gender: '',
        tshirtSize: '',
        emergencyContact: '',
        emergencyPhone: '',
        volunteerCode: generateVolunteerCode(6),
        source: 'admin',
        eventInfoAccepted: true,
        termsAccepted: true,
        status: 'pending',
        age: 18,
        phone: '',
        city: '',
        state: 'FL',
        country: 'USA',
        availability: {
          days: [],
          times: [],
          commitment: 'one-time',
          flexible: false,
          maxHoursPerDay: 8
        },
        interests: [],
        skills: [],
        languages: ['English'],
        backgroundCheckCompleted: false,
        trainingCompleted: false,
        orientationAttended: false
      })
    }
    setErrors({})
  }, [volunteer, mode, open])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!isRequired(formData.firstName)) newErrors.firstName = 'First name is required'
    if (!isRequired(formData.lastName)) newErrors.lastName = 'Last name is required'
    if (!isRequired(formData.email)) newErrors.email = 'Email is required'
    else if (!isValidEmail(formData.email || '')) newErrors.email = 'Invalid email format'
    if (!formData.gender) newErrors.gender = 'Gender is required'
    if (!formData.tshirtSize) newErrors.tshirtSize = 'T-shirt size is required'
    if (!isRequired(formData.emergencyContact)) newErrors.emergencyContact = 'Emergency contact is required'
    if (!isRequired(formData.emergencyPhone)) newErrors.emergencyPhone = 'Emergency phone is required'
    if (!isRequired(formData.volunteerCode)) newErrors.volunteerCode = 'Volunteer code is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      logger.error('Error submitting volunteer form', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleArrayChange = (field: string, value: string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleAvailabilityChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability!,
        [field]: value
      }
    }))
  }


  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon />
          <Typography variant="h6">
            {mode === 'create' ? 'Add New Volunteer' : 'Edit Volunteer'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          {/* Personal Information */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon color="primary" />
                <Typography variant="h6">Personal Information</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="First Name *"
                    value={formData.firstName || ''}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    error={!!errors.firstName}
                    helperText={errors.firstName}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Last Name *"
                    value={formData.lastName || ''}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    error={!!errors.lastName}
                    helperText={errors.lastName}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email *"
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    error={!!errors.email}
                    helperText={errors.email}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={formData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth error={!!errors.gender}>
                    <InputLabel>Gender *</InputLabel>
                    <Select
                      value={formData.gender || ''}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      label="Gender *"
                    >
                      {GENDER_OPTIONS.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Age"
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 18)}
                    inputProps={{ min: 16, max: 100 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth error={!!errors.tshirtSize}>
                    <InputLabel>T-shirt Size *</InputLabel>
                    <Select
                      value={formData.tshirtSize || ''}
                      onChange={(e) => handleInputChange('tshirtSize', e.target.value)}
                      label="T-shirt Size *"
                    >
                      {TSHIRT_SIZES.map(size => (
                        <MenuItem key={size} value={size}>{size}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="City"
                    value={formData.city || ''}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="State"
                    value={formData.state || ''}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Emergency Contact */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ContactIcon color="primary" />
                <Typography variant="h6">Emergency Contact</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Emergency Contact Name *"
                    value={formData.emergencyContact || ''}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    error={!!errors.emergencyContact}
                    helperText={errors.emergencyContact}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Emergency Contact Phone *"
                    value={formData.emergencyPhone || ''}
                    onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
                    error={!!errors.emergencyPhone}
                    helperText={errors.emergencyPhone}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Skills & Interests */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WorkIcon color="primary" />
                <Typography variant="h6">Skills & Interests</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={SKILL_OPTIONS}
                    value={formData.skills || []}
                    onChange={(_, value) => handleArrayChange('skills', value)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Skills" placeholder="Select skills" />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={INTEREST_OPTIONS}
                    value={formData.interests || []}
                    onChange={(_, value) => handleArrayChange('interests', value)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Interests" placeholder="Select interests" />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    multiple
                    options={LANGUAGE_OPTIONS}
                    value={formData.languages || []}
                    onChange={(_, value) => handleArrayChange('languages', value)}
                    renderTags={(value, getTagProps) =>
                      value.map((option, index) => (
                        <Chip variant="outlined" label={option} {...getTagProps({ index })} />
                      ))
                    }
                    renderInput={(params) => (
                      <TextField {...params} label="Languages" placeholder="Select languages" />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Availability Commitment</FormLabel>
                    <RadioGroup
                      value={formData.availability?.commitment || 'one-time'}
                      onChange={(e) => handleAvailabilityChange('commitment', e.target.value)}
                    >
                      {COMMITMENT_OPTIONS.map(option => (
                        <FormControlLabel
                          key={option.value}
                          value={option.value}
                          control={<Radio />}
                          label={option.label}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* References - Not available in current data structure */}

          {/* Compliance & Status */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon color="primary" />
                <Typography variant="h6">Compliance & Status</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Volunteer Code *"
                    value={formData.volunteerCode || ''}
                    onChange={(e) => handleInputChange('volunteerCode', e.target.value.toUpperCase())}
                    error={!!errors.volunteerCode}
                    helperText={errors.volunteerCode}
                    InputProps={{
                      readOnly: mode === 'edit'
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status || 'pending'}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      label="Status"
                    >
                      {VOLUNTEER_STATUS_OPTIONS.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: option.color
                              }}
                            />
                            {option.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <FormGroup>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.backgroundCheckCompleted || false}
                          onChange={(e) => handleInputChange('backgroundCheckCompleted', e.target.checked)}
                        />
                      }
                      label="Background Check Completed"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.trainingCompleted || false}
                          onChange={(e) => handleInputChange('trainingCompleted', e.target.checked)}
                        />
                      }
                      label="Training Completed"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.orientationAttended || false}
                          onChange={(e) => handleInputChange('orientationAttended', e.target.checked)}
                        />
                      }
                      label="Orientation Attended"
                    />
                  </FormGroup>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    multiline
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Internal notes about this volunteer..."
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, background: '#f5f5f5' }}>
        <Button
          onClick={onClose}
          startIcon={<CancelIcon />}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={loading}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
            }
          }}
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Volunteer' : 'Update Volunteer'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
