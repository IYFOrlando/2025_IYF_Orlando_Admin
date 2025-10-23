import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Badge,
  Paper,
  Stack
} from '@mui/material'
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  Security as SecurityIcon,
  ContactPhone as ContactPhoneIcon,
  Language as LanguageIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  PlayCircle as PlayCircleIcon,
  PauseCircle as PauseCircleIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Print as PrintIcon
} from '@mui/icons-material'
import type { VolunteerApplication, VolunteerStatus } from '../types'

interface VolunteerDetailsProps {
  open: boolean
  onClose: () => void
  volunteer: VolunteerApplication | null
  onEdit: (volunteer: VolunteerApplication) => void
}

const STATUS_CONFIG = {
  pending: { 
    label: 'Pending Review', 
    color: '#ff9800', 
    icon: <PendingIcon />,
    bgColor: '#fff3e0'
  },
  approved: { 
    label: 'Approved', 
    color: '#2196f3', 
    icon: <CheckCircleIcon />,
    bgColor: '#e3f2fd'
  },
  active: { 
    label: 'Active', 
    color: '#4caf50', 
    icon: <PlayCircleIcon />,
    bgColor: '#e8f5e8'
  },
  rejected: { 
    label: 'Rejected', 
    color: '#f44336', 
    icon: <CancelIcon />,
    bgColor: '#ffebee'
  },
  inactive: { 
    label: 'Inactive', 
    color: '#9e9e9e', 
    icon: <PauseCircleIcon />,
    bgColor: '#f5f5f5'
  }
}

export default function VolunteerDetails({ open, onClose, volunteer, onEdit }: VolunteerDetailsProps) {
  if (!volunteer) return null

  const statusConfig = STATUS_CONFIG[volunteer.status]
  const createdAt = new Date(volunteer.createdAt.seconds * 1000)
  const updatedAt = volunteer.updatedAt ? new Date(volunteer.updatedAt.seconds * 1000) : null

  const complianceItems = [
    {
      label: 'Background Check',
      completed: volunteer.backgroundCheckCompleted,
      date: volunteer.backgroundCheckDate
    },
    {
      label: 'Training',
      completed: volunteer.trainingCompleted,
      date: volunteer.trainingDate
    },
    {
      label: 'Orientation',
      completed: volunteer.orientationAttended,
      date: volunteer.orientationDate
    }
  ]

  const completedCompliance = complianceItems.filter(item => item.completed).length

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              width: 48,
              height: 48
            }}
          >
            {volunteer.firstName?.[0]}{volunteer.lastName?.[0]}
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              {volunteer.firstName} {volunteer.lastName}
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              {volunteer.volunteerCode}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => onEdit(volunteer)} sx={{ color: 'white' }}>
            <EditIcon />
          </IconButton>
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Status and Basic Info */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Chip
                        icon={statusConfig.icon}
                        label={statusConfig.label}
                        sx={{
                          backgroundColor: statusConfig.bgColor,
                          color: statusConfig.color,
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          height: 32,
                          '& .MuiChip-icon': {
                            color: statusConfig.color
                          }
                        }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        Joined {createdAt.toLocaleDateString()}
                      </Typography>
                      {updatedAt && (
                        <Typography variant="body2" color="text.secondary">
                          • Updated {updatedAt.toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton size="small">
                        <DownloadIcon />
                      </IconButton>
                      <IconButton size="small">
                        <PrintIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Personal Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon color="primary" />
                      <Typography variant="h6">Personal Information</Typography>
                    </Box>
                  }
                />
                <CardContent>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <EmailIcon color="action" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Email" 
                        secondary={volunteer.email}
                      />
                    </ListItem>
                    {volunteer.phone && (
                      <ListItem>
                        <ListItemIcon>
                          <PhoneIcon color="action" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Phone" 
                          secondary={volunteer.phone}
                        />
                      </ListItem>
                    )}
                    <ListItem>
                      <ListItemIcon>
                        <PersonIcon color="action" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Gender" 
                        secondary={volunteer.gender}
                      />
                    </ListItem>
                    {volunteer.age && (
                      <ListItem>
                        <ListItemIcon>
                          <PersonIcon color="action" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Age" 
                          secondary={volunteer.age}
                        />
                      </ListItem>
                    )}
                    <ListItem>
                      <ListItemIcon>
                        <WorkIcon color="action" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="T-shirt Size" 
                        secondary={volunteer.tshirtSize}
                      />
                    </ListItem>
                    {(volunteer.city || volunteer.state) && (
                      <ListItem>
                        <ListItemIcon>
                          <LocationIcon color="action" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Location" 
                          secondary={`${volunteer.city || ''}, ${volunteer.state || ''}`}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Emergency Contact */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ContactPhoneIcon color="primary" />
                      <Typography variant="h6">Emergency Contact</Typography>
                    </Box>
                  }
                />
                <CardContent>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <PersonIcon color="action" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Contact Name" 
                        secondary={volunteer.emergencyContact}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <PhoneIcon color="action" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Contact Phone" 
                        secondary={volunteer.emergencyPhone}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Skills & Interests */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WorkIcon color="primary" />
                      <Typography variant="h6">Skills & Interests</Typography>
                    </Box>
                  }
                />
                <CardContent>
                  {volunteer.skills && volunteer.skills.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Skills
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {volunteer.skills.map((skill, index) => (
                          <Chip
                            key={index}
                            label={skill}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  
                  {volunteer.interests && volunteer.interests.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Interests
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {volunteer.interests.map((interest, index) => (
                          <Chip
                            key={index}
                            label={interest}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {volunteer.languages && volunteer.languages.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Languages
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {volunteer.languages.map((language, index) => (
                          <Chip
                            key={index}
                            label={language}
                            size="small"
                            variant="outlined"
                            color="default"
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Compliance Status */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SecurityIcon color="primary" />
                      <Typography variant="h6">Compliance Status</Typography>
                      <Badge 
                        badgeContent={`${completedCompliance}/3`} 
                        color={completedCompliance === 3 ? 'success' : 'warning'}
                      />
                    </Box>
                  }
                />
                <CardContent>
                  <List dense>
                    {complianceItems.map((item, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          {item.completed ? (
                            <CheckCircleIcon color="success" />
                          ) : (
                            <CancelIcon color="error" />
                          )}
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.label}
                          secondary={item.completed ? `Completed ${item.date || ''}` : 'Not completed'}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* References */}
            {volunteer.references && volunteer.references.length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardHeader
                    title={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ContactPhoneIcon color="primary" />
                        <Typography variant="h6">References</Typography>
                      </Box>
                    }
                  />
                  <CardContent>
                    <Grid container spacing={2}>
                      {volunteer.references.map((ref, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              {ref.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {ref.relationship}
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              📞 {ref.phone}
                            </Typography>
                            {ref.email && (
                              <Typography variant="body2">
                                📧 {ref.email}
                              </Typography>
                            )}
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Notes */}
            {volunteer.notes && (
              <Grid item xs={12}>
                <Card>
                  <CardHeader
                    title={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StarIcon color="primary" />
                        <Typography variant="h6">Notes</Typography>
                      </Box>
                    }
                  />
                  <CardContent>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {volunteer.notes}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, background: '#f5f5f5' }}>
        <Button onClick={onClose}>
          Close
        </Button>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => onEdit(volunteer)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
            }
          }}
        >
          Edit Volunteer
        </Button>
      </DialogActions>
    </Dialog>
  )
}
