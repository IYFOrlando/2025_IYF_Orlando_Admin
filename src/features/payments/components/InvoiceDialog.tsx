
import * as React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, FormControl, InputLabel, Select, MenuItem,
  Typography, Divider, Box
} from '@mui/material'
import { useInstructors } from '../hooks/useInstructors'
import type { InvoiceLine } from '../types'

type Props = {
  open: boolean
  editing?: InvoiceLine | null
  onClose: () => void
  onSave: (line: InvoiceLine) => void
  academy?: string
  level?: string | null
}

export default function InvoiceDialog({ open, editing, onClose, onSave, academy, level }: Props) {
  const { getInstructorByAcademy } = useInstructors()
  
  const [formData, setFormData] = React.useState<Partial<InvoiceLine>>({
    academy: academy || '',
    level: level || null,
    period: 1,
    unitPrice: 0,
    qty: 1,
    amount: 0,
    instructor: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      credentials: ''
    },
    instructionDates: {
      startDate: '',
      endDate: '',
      totalHours: 0,
      schedule: ''
    },
    serviceRate: 0
  })

  // Initialize form when editing or props change
  React.useEffect(() => {
    if (editing) {
      // Handle migration from old format (name) to new format (firstName/lastName)
      const instructor = editing.instructor
      let firstName = ''
      let lastName = ''
      
      if (instructor) {
        if ('name' in instructor && typeof instructor.name === 'string') {
          // Old format: split name into first and last
          const nameParts = instructor.name.trim().split(' ')
          firstName = nameParts[0] || ''
          lastName = nameParts.slice(1).join(' ') || ''
        } else {
          // New format
          firstName = instructor.firstName || ''
          lastName = instructor.lastName || ''
        }
      }
      
      setFormData({
        academy: editing.academy,
        level: editing.level,
        period: editing.period,
        unitPrice: editing.unitPrice,
        qty: editing.qty,
        amount: editing.amount,
        instructor: editing.instructor ? {
          firstName,
          lastName,
          email: instructor.email || '',
          phone: instructor.phone || '',
          credentials: instructor.credentials || ''
        } : {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          credentials: ''
        },
        instructionDates: editing.instructionDates || {
          startDate: '',
          endDate: '',
          totalHours: 0,
          schedule: ''
        },
        serviceRate: editing.serviceRate || 0
      })
      setErrors({})
    } else if (academy) {
      setFormData(prev => ({
        ...prev,
        academy: academy || '',
        level: level || null
      }))
    }
  }, [editing, academy, level])

  // Auto-populate instructor when academy/level changes (only when not editing)
  React.useEffect(() => {
    if (academy && !editing) {
      const instructor = getInstructorByAcademy(academy, level)
      if (instructor) {
        // Split instructor name into first and last name
        const nameParts = (instructor.name || '').trim().split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        setFormData(prev => ({
          ...prev,
          instructor: {
            firstName,
            lastName,
            email: instructor.email || '',
            phone: instructor.phone || '',
            credentials: instructor.credentials || ''
          }
        }))
      }
    }
  }, [academy, level, getInstructorByAcademy, editing])

  // Calculate amount when unitPrice or qty changes
  React.useEffect(() => {
    const amount = (formData.unitPrice || 0) * (formData.qty || 0)
    setFormData(prev => ({ ...prev, amount }))
  }, [formData.unitPrice, formData.qty])

  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    const isElectiveCourse = (formData.serviceRate || 0) > 0

    if (!formData.academy || formData.academy.trim() === '') {
      newErrors.academy = 'Academy is required'
    }
    if (!formData.unitPrice || formData.unitPrice <= 0) {
      newErrors.unitPrice = 'Unit price must be greater than 0'
    }
    if (!formData.qty || formData.qty <= 0) {
      newErrors.qty = 'Quantity must be greater than 0'
    }
    
    // Instructor validation
    if (formData.instructor) {
      if (!formData.instructor.firstName || formData.instructor.firstName.trim() === '') {
        newErrors.instructorFirstName = "Instructor's first name is required"
      }
      if (!formData.instructor.lastName || formData.instructor.lastName.trim() === '') {
        newErrors.instructorLastName = "Instructor's last name is required"
      }
      // Credentials required for elective courses
      if (isElectiveCourse && (!formData.instructor.credentials || formData.instructor.credentials.trim() === '')) {
        newErrors.instructorCredentials = 'Instructor credentials are required for elective courses'
      }
    }
    
    // Dates and hours validation
    if (formData.instructionDates?.startDate && formData.instructionDates?.endDate) {
      const start = new Date(formData.instructionDates.startDate)
      const end = new Date(formData.instructionDates.endDate)
      
      // Ensure dates include year (check if date is valid and has year)
      if (isNaN(start.getTime())) {
        newErrors.startDate = 'Start date must include year (YYYY-MM-DD)'
      }
      if (isNaN(end.getTime())) {
        newErrors.endDate = 'End date must include year (YYYY-MM-DD)'
      }
      
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        if (end < start) {
          newErrors.endDate = 'End date must be after start date'
        }
        // Check if year is present (should be a valid year)
        const startYear = start.getFullYear()
        const endYear = end.getFullYear()
        if (startYear < 1900 || startYear > 2100) {
          newErrors.startDate = 'Start date must include a valid year'
        }
        if (endYear < 1900 || endYear > 2100) {
          newErrors.endDate = 'End date must include a valid year'
        }
      }
      
      // Total hours validation
      if (!formData.instructionDates.totalHours || formData.instructionDates.totalHours <= 0) {
        newErrors.totalHours = 'Total hours of instruction must be greater than 0'
      }
    }
    
    // Service rate validation for elective courses
    if (isElectiveCourse) {
      if (!formData.serviceRate || formData.serviceRate <= 0) {
        newErrors.serviceRate = 'Service rate is required and must be greater than 0 for elective courses'
      }
    } else if (formData.serviceRate && formData.serviceRate < 0) {
      newErrors.serviceRate = 'Service rate cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = () => {
    if (!validateForm()) {
      return
    }

    const line: InvoiceLine = {
      academy: formData.academy!,
      period: formData.period || 1,
      level: formData.level,
      unitPrice: formData.unitPrice!,
      qty: formData.qty!,
      amount: formData.amount || 0,
      instructor: (formData.instructor?.firstName && formData.instructor?.lastName) ? {
        firstName: formData.instructor.firstName.trim(),
        lastName: formData.instructor.lastName.trim(),
        email: formData.instructor.email?.trim() || undefined,
        phone: formData.instructor.phone?.trim() || undefined,
        credentials: formData.instructor.credentials?.trim() || undefined
      } : undefined,
      instructionDates: formData.instructionDates?.startDate && formData.instructionDates?.endDate ? {
        startDate: formData.instructionDates.startDate,
        endDate: formData.instructionDates.endDate,
        totalHours: formData.instructionDates.totalHours || 0,
        schedule: formData.instructionDates.schedule?.trim() || undefined
      } : undefined,
      serviceRate: formData.serviceRate && formData.serviceRate > 0 ? formData.serviceRate : undefined
    }

    onSave(line)
    onClose()
    setErrors({})
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

  const handleInstructorChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      instructor: {
        firstName: prev.instructor?.firstName || '',
        lastName: prev.instructor?.lastName || '',
        email: prev.instructor?.email || '',
        phone: prev.instructor?.phone || '',
        credentials: prev.instructor?.credentials || '',
        ...prev.instructor,
        [field]: value
      }
    }))
  }

  const handleInstructionDatesChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      instructionDates: {
        startDate: prev.instructionDates?.startDate || '',
        endDate: prev.instructionDates?.endDate || '',
        totalHours: prev.instructionDates?.totalHours || 0,
        schedule: prev.instructionDates?.schedule || '',
        ...prev.instructionDates,
        [field]: value
      }
    }))
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editing ? 'Edit Invoice Line' : 'Add Invoice Line'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Basic Information
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Academy"
                value={formData.academy}
                onChange={(e) => handleInputChange('academy', e.target.value)}
                required
                error={!!errors.academy}
                helperText={errors.academy}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Level"
                value={formData.level || ''}
                onChange={(e) => handleInputChange('level', e.target.value || null)}
              />
            </Grid>
            
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>Period</InputLabel>
                <Select
                  value={formData.period}
                  onChange={(e) => handleInputChange('period', e.target.value)}
                >
                  <MenuItem value={1}>Period 1</MenuItem>
                  <MenuItem value={2}>Period 2</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Unit Price"
                type="number"
                value={formData.unitPrice}
                onChange={(e) => handleInputChange('unitPrice', parseFloat(e.target.value) || 0)}
                required
                error={!!errors.unitPrice}
                helperText={errors.unitPrice}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Quantity"
                type="number"
                value={formData.qty}
                onChange={(e) => handleInputChange('qty', parseInt(e.target.value) || 0)}
                required
                error={!!errors.qty}
                helperText={errors.qty}
                inputProps={{ min: 1 }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Instructor Information
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Instructor First Name"
                value={formData.instructor?.firstName || ''}
                onChange={(e) => handleInstructorChange('firstName', e.target.value)}
                required
                error={!!errors.instructorFirstName}
                helperText={errors.instructorFirstName}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Instructor Last Name"
                value={formData.instructor?.lastName || ''}
                onChange={(e) => handleInstructorChange('lastName', e.target.value)}
                required
                error={!!errors.instructorLastName}
                helperText={errors.instructorLastName}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.instructor?.email || ''}
                onChange={(e) => handleInstructorChange('email', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.instructor?.phone || ''}
                onChange={(e) => handleInstructorChange('phone', e.target.value)}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Credentials"
                value={formData.instructor?.credentials || ''}
                onChange={(e) => handleInstructorChange('credentials', e.target.value)}
                placeholder="e.g., Certified Teacher, Master's Degree"
                required={!!formData.serviceRate && formData.serviceRate > 0}
                error={!!errors.instructorCredentials}
                helperText={errors.instructorCredentials || (formData.serviceRate && formData.serviceRate > 0 ? 'Required for elective courses' : '')}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Instruction Schedule & Hours
              </Typography>
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Start Date (with year)"
                type="date"
                value={formData.instructionDates?.startDate || ''}
                onChange={(e) => handleInstructionDatesChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                error={!!errors.startDate}
                helperText={errors.startDate || 'Must include year (YYYY-MM-DD)'}
                required
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="End Date (with year)"
                type="date"
                value={formData.instructionDates?.endDate || ''}
                onChange={(e) => handleInstructionDatesChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                error={!!errors.endDate}
                helperText={errors.endDate || 'Must include year (YYYY-MM-DD)'}
                required
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Total Hours of Instruction"
                type="number"
                value={formData.instructionDates?.totalHours || 0}
                onChange={(e) => handleInstructionDatesChange('totalHours', parseFloat(e.target.value) || 0)}
                inputProps={{ min: 0, step: 0.5 }}
                error={!!errors.totalHours}
                helperText={errors.totalHours || 'Total hours of instruction including the year'}
                required
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Schedule"
                value={formData.instructionDates?.schedule || ''}
                onChange={(e) => handleInstructionDatesChange('schedule', e.target.value)}
                placeholder="e.g., Saturdays 10:00 AM - 12:00 PM"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Service Rate (per hour)"
                type="number"
                value={formData.serviceRate || 0}
                onChange={(e) => handleInputChange('serviceRate', parseFloat(e.target.value) || 0)}
                helperText="Rate per hour for elective courses"
                error={!!errors.serviceRate}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Amount Display */}
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="h6">
                  Total Amount: ${formData.amount?.toFixed(2) || '0.00'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={!formData.academy || !formData.unitPrice || formData.unitPrice <= 0 || !formData.qty || formData.qty <= 0}
          >
            {editing ? 'Update' : 'Add'} Line
          </Button>
        </DialogActions>
      </Dialog>
  )
}
