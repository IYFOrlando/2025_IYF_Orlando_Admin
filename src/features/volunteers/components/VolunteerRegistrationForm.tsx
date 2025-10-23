import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Checkbox,
  Grid,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Divider
} from '@mui/material'
import {
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material'

interface VolunteerRegistrationFormProps {
  onSubmit: (data: any) => void
}

const steps = [
  'Personal Information',
  'Event Commitment',
  'Availability',
  'Review & Submit'
]

export default function VolunteerRegistrationForm({ onSubmit }: VolunteerRegistrationFormProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    tshirtSize: '',
    
    // Emergency Contact
    emergencyContact: '',
    emergencyPhone: '',
    
    // Event Commitment
    fullDayCommitment: '',
    
    // Availability
    availableDays: [] as string[],
    availableTimes: [] as string[],
    
    // Agreements
    eventInfoAccepted: false,
    termsAccepted: false
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

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

  const handleArrayChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field as keyof typeof prev].includes(value)
        ? (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
        : [...(prev[field as keyof typeof prev] as string[]), value]
    }))
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (step === 0) {
      if (!formData.firstName.trim()) newErrors.firstName = 'First name is required'
      if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required'
      if (!formData.email.trim()) newErrors.email = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format'
      if (!formData.phone.trim()) newErrors.phone = 'Phone number is required'
      if (!formData.age) newErrors.age = 'Age is required'
      if (!formData.gender) newErrors.gender = 'Gender is required'
      if (!formData.tshirtSize) newErrors.tshirtSize = 'T-shirt size is required'
      if (!formData.emergencyContact.trim()) newErrors.emergencyContact = 'Emergency contact is required'
      if (!formData.emergencyPhone.trim()) newErrors.emergencyPhone = 'Emergency phone is required'
    }

    if (step === 1) {
      if (!formData.fullDayCommitment) newErrors.fullDayCommitment = 'Please select your commitment level'
    }

    if (step === 2) {
      if (formData.availableDays.length === 0) newErrors.availableDays = 'Please select at least one day'
      if (formData.availableTimes.length === 0) newErrors.availableTimes = 'Please select at least one time slot'
    }

    if (step === 3) {
      if (!formData.eventInfoAccepted) newErrors.eventInfoAccepted = 'You must accept the event information'
      if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept the terms and conditions'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    setActiveStep(prev => prev - 1)
  }

  const handleSubmit = () => {
    if (validateStep(activeStep)) {
      onSubmit(formData)
    }
  }

  const renderPersonalInformation = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <PersonIcon color="primary" />
        Personal Information
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="First Name *"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            error={!!errors.firstName}
            helperText={errors.firstName}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Last Name *"
            value={formData.lastName}
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
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            error={!!errors.email}
            helperText={errors.email}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone Number *"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            error={!!errors.phone}
            helperText={errors.phone}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Age *"
            type="number"
            value={formData.age}
            onChange={(e) => handleInputChange('age', e.target.value)}
            error={!!errors.age}
            helperText={errors.age}
            inputProps={{ min: 16, max: 100 }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth error={!!errors.gender}>
            <FormControlLabel
              control={
                <RadioGroup
                  row
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                >
                  <FormControlLabel value="male" control={<Radio />} label="Male" />
                  <FormControlLabel value="female" control={<Radio />} label="Female" />
                  <FormControlLabel value="other" control={<Radio />} label="Other" />
                </RadioGroup>
              }
              label="Gender *"
              labelPlacement="top"
            />
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth error={!!errors.tshirtSize}>
            <FormControlLabel
              control={
                <RadioGroup
                  row
                  value={formData.tshirtSize}
                  onChange={(e) => handleInputChange('tshirtSize', e.target.value)}
                >
                  <FormControlLabel value="S" control={<Radio />} label="S" />
                  <FormControlLabel value="M" control={<Radio />} label="M" />
                  <FormControlLabel value="L" control={<Radio />} label="L" />
                  <FormControlLabel value="XL" control={<Radio />} label="XL" />
                </RadioGroup>
              }
              label="T-shirt Size *"
              labelPlacement="top"
            />
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Emergency Contact Name *"
            value={formData.emergencyContact}
            onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
            error={!!errors.emergencyContact}
            helperText={errors.emergencyContact}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Emergency Contact Phone *"
            value={formData.emergencyPhone}
            onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
            error={!!errors.emergencyPhone}
            helperText={errors.emergencyPhone}
          />
        </Grid>
      </Grid>
    </Box>
  )

  const renderEventCommitment = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <CalendarIcon color="primary" />
        Event Commitment
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)' }}>
        <Typography variant="h6" gutterBottom color="primary">
          Event Commitment
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Do you agree to participate as a volunteer for both days (11/8 Sat & 11/9 Sun) with full day commitment?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          If you cannot volunteer fully, please select "I need adjustment" and we can adjust volunteer hours accordingly.
        </Typography>
        
        <FormControl error={!!errors.fullDayCommitment}>
          <RadioGroup
            value={formData.fullDayCommitment}
            onChange={(e) => handleInputChange('fullDayCommitment', e.target.value)}
          >
            <FormControlLabel
              value="full-commitment"
              control={<Radio />}
              label="Yes, I can commit to both days with full day participation"
            />
            <FormControlLabel
              value="need-adjustment"
              control={<Radio />}
              label="I need adjustment - I cannot commit to full days"
            />
          </RadioGroup>
          {errors.fullDayCommitment && (
            <Typography variant="caption" color="error" sx={{ mt: 1 }}>
              {errors.fullDayCommitment}
            </Typography>
          )}
        </FormControl>
      </Paper>
    </Box>
  )

  const renderAvailability = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <CalendarIcon color="primary" />
        Next Step: Set Your Availability
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Select the days and times you're available to help (Oct 27 - Nov 7)
      </Alert>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Available Days
          </Typography>
          <FormControl error={!!errors.availableDays}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <FormControlLabel
                  key={day}
                  control={
                    <Checkbox
                      checked={formData.availableDays.includes(day)}
                      onChange={() => handleArrayChange('availableDays', day)}
                    />
                  }
                  label={day}
                />
              ))}
            </Box>
            {errors.availableDays && (
              <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                {errors.availableDays}
              </Typography>
            )}
          </FormControl>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>
            Available Time Slots
          </Typography>
          <FormControl error={!!errors.availableTimes}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {['Morning (8AM-12PM)', 'Afternoon (12PM-4PM)', 'Evening (4PM-8PM)', 'Full Day (8AM-8PM)'].map(time => (
                <FormControlLabel
                  key={time}
                  control={
                    <Checkbox
                      checked={formData.availableTimes.includes(time)}
                      onChange={() => handleArrayChange('availableTimes', time)}
                    />
                  }
                  label={time}
                />
              ))}
            </Box>
            {errors.availableTimes && (
              <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                {errors.availableTimes}
              </Typography>
            )}
          </FormControl>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, p: 2, background: '#f5f5f5', borderRadius: 1 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowForwardIcon />}
          onClick={() => window.open('/volunteer-schedule', '_blank')}
          sx={{ mb: 1 }}
        >
          Open Volunteer Schedule
        </Button>
        <Typography variant="caption" display="block" color="text.secondary">
          Click to view the detailed volunteer schedule and available time slots
        </Typography>
      </Box>
    </Box>
  )

  const renderReview = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <CheckCircleIcon color="primary" />
        Review & Submit
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Personal Information</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Name:</strong> {formData.firstName} {formData.lastName}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Email:</strong> {formData.email}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Phone:</strong> {formData.phone}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Age:</strong> {formData.age}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Gender:</strong> {formData.gender}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>T-shirt Size:</strong> {formData.tshirtSize}
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Emergency Contact:</strong> {formData.emergencyContact} ({formData.emergencyPhone})
        </Typography>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Event Commitment</Typography>
        <Typography variant="body2">
          {formData.fullDayCommitment === 'full-commitment' 
            ? 'Full commitment to both days (11/8 Sat & 11/9 Sun)'
            : 'Needs adjustment - cannot commit to full days'
          }
        </Typography>
      </Paper>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Availability</Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <strong>Available Days:</strong> {formData.availableDays.join(', ')}
        </Typography>
        <Typography variant="body2">
          <strong>Available Times:</strong> {formData.availableTimes.join(', ')}
        </Typography>
      </Paper>
      
      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.eventInfoAccepted}
              onChange={(e) => handleInputChange('eventInfoAccepted', e.target.checked)}
            />
          }
          label="I have read and understand the Taste of Korea event information"
        />
        {errors.eventInfoAccepted && (
          <Typography variant="caption" color="error" display="block">
            {errors.eventInfoAccepted}
          </Typography>
        )}
      </Box>
      
      <Box sx={{ mb: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.termsAccepted}
              onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
            />
          }
          label="I agree to the terms and conditions and volunteer agreement"
        />
        {errors.termsAccepted && (
          <Typography variant="caption" color="error" display="block">
            {errors.termsAccepted}
          </Typography>
        )}
      </Box>
    </Box>
  )

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderPersonalInformation()
      case 1:
        return renderEventCommitment()
      case 2:
        return renderAvailability()
      case 3:
        return renderReview()
      default:
        return null
    }
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
            🍽️ Be a Volunteer Registration Form
          </Typography>
          
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          <Box sx={{ mb: 4 }}>
            {renderStepContent()}
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              Back
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
                  }
                }}
              >
                Submit Registration
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowForwardIcon />}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
                  }
                }}
              >
                Next
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
