
import * as React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, FormControl, InputLabel, Select, MenuItem,
  Typography, Divider, Box, Autocomplete, Chip
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
  const { instructors, getInstructorByAcademy } = useInstructors()
  
  const [formData, setFormData] = React.useState<Partial<InvoiceLine>>({
    academy: academy || '',
    level: level || null,
    period: 1,
    unitPrice: 0,
    qty: 1,
    amount: 0,
    instructor: {
      name: '',
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

  // Auto-populate instructor when academy/level changes
  React.useEffect(() => {
    if (academy) {
      const instructor = getInstructorByAcademy(academy, level)
      if (instructor) {
        setFormData(prev => ({
          ...prev,
          instructor: {
            name: instructor.name,
            email: instructor.email || '',
            phone: instructor.phone || '',
            credentials: instructor.credentials || ''
          }
        }))
      }
    }
  }, [academy, level, getInstructorByAcademy])

  // Calculate amount when unitPrice or qty changes
  React.useEffect(() => {
    const amount = (formData.unitPrice || 0) * (formData.qty || 0)
    setFormData(prev => ({ ...prev, amount }))
  }, [formData.unitPrice, formData.qty])

  const handleSave = () => {
    if (!formData.academy || !formData.unitPrice || !formData.qty) {
      return
    }

    const line: InvoiceLine = {
      academy: formData.academy,
      period: formData.period || 1,
      level: formData.level,
      unitPrice: formData.unitPrice,
      qty: formData.qty,
      amount: formData.amount || 0,
      instructor: formData.instructor?.name ? formData.instructor : undefined,
      instructionDates: formData.instructionDates?.startDate ? formData.instructionDates : undefined,
      serviceRate: formData.serviceRate || undefined
    }

    onSave(line)
    onClose()
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleInstructorChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      instructor: {
        ...prev.instructor,
        [field]: value
      }
    }))
  }

  const handleInstructionDatesChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      instructionDates: {
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
                label="Instructor Name"
                value={formData.instructor?.name || ''}
                onChange={(e) => handleInstructorChange('name', e.target.value)}
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
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Credentials"
                value={formData.instructor?.credentials || ''}
                onChange={(e) => handleInstructorChange('credentials', e.target.value)}
                placeholder="e.g., Certified Teacher, Master's Degree"
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
                label="Start Date"
                type="date"
                value={formData.instructionDates?.startDate || ''}
                onChange={(e) => handleInstructionDatesChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={formData.instructionDates?.endDate || ''}
                onChange={(e) => handleInstructionDatesChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Total Hours"
                type="number"
                value={formData.instructionDates?.totalHours || 0}
                onChange={(e) => handleInstructionDatesChange('totalHours', parseFloat(e.target.value) || 0)}
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
            disabled={!formData.academy || !formData.unitPrice || !formData.qty}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
  )
}
