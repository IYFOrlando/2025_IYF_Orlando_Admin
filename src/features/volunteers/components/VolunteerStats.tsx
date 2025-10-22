import * as React from 'react'
import { Card, CardContent, Typography, Grid, Box, Chip } from '@mui/material'
import PersonIcon from '@mui/icons-material/Person'
import GroupIcon from '@mui/icons-material/Group'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import PendingIcon from '@mui/icons-material/Pending'
import CancelIcon from '@mui/icons-material/Cancel'
import type { VolunteerApplication } from '../types'

interface VolunteerStatsProps {
  applications: VolunteerApplication[]
}

export default function VolunteerStats({ applications }: VolunteerStatsProps) {
  const stats = React.useMemo(() => {
    const total = applications.length
    const pending = applications.filter(app => app.status === 'pending').length
    const approved = applications.filter(app => app.status === 'approved').length
    const rejected = applications.filter(app => app.status === 'rejected').length
    const active = applications.filter(app => app.status === 'active').length
    const inactive = applications.filter(app => app.status === 'inactive').length

    // T-shirt size distribution
    const tshirtSizes = applications.reduce((acc, app) => {
      const size = app.tshirtSize || 'Unknown'
      acc[size] = (acc[size] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Age distribution
    const ageGroups = applications.reduce((acc, app) => {
      const age = app.age || 0
      let group = 'Unknown'
      if (age < 18) group = 'Under 18'
      else if (age >= 18 && age < 25) group = '18-24'
      else if (age >= 25 && age < 35) group = '25-34'
      else if (age >= 35 && age < 50) group = '35-49'
      else if (age >= 50) group = '50+'
      
      acc[group] = (acc[group] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Gender distribution
    const genderDistribution = applications.reduce((acc, app) => {
      const gender = app.gender || 'Unknown'
      acc[gender] = (acc[gender] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total,
      pending,
      approved,
      rejected,
      active,
      inactive,
      tshirtSizes,
      ageGroups,
      genderDistribution
    }
  }, [applications])

  return (
    <Grid container spacing={3}>
      {/* Status Overview */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <GroupIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Application Status
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="h4" color="primary">
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Applications
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1, color: 'white' }}>
                  <Typography variant="h4">
                    {stats.approved}
                  </Typography>
                  <Typography variant="body2">
                    Approved
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<PendingIcon />}
                label={`${stats.pending} Pending`}
                color="warning"
                size="small"
              />
              <Chip
                icon={<CheckCircleIcon />}
                label={`${stats.active} Active`}
                color="success"
                size="small"
              />
              <Chip
                icon={<CancelIcon />}
                label={`${stats.rejected} Rejected`}
                color="error"
                size="small"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Demographics */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <PersonIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Demographics
            </Typography>
            
            {/* Age Groups */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Age Groups</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(stats.ageGroups).map(([group, count]) => (
                  <Chip
                    key={group}
                    label={`${group}: ${count}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>

            {/* Gender Distribution */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Gender</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(stats.genderDistribution).map(([gender, count]) => (
                  <Chip
                    key={gender}
                    label={`${gender}: ${count}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>

            {/* T-Shirt Sizes */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>T-Shirt Sizes</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {Object.entries(stats.tshirtSizes).map(([size, count]) => (
                  <Chip
                    key={size}
                    label={`${size}: ${count}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
