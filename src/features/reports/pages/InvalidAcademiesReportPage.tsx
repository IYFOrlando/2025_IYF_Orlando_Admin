import * as React from 'react'
import {
  Box, Card, CardHeader, CardContent, Typography, Grid, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Alert
} from '@mui/material'
import { useRegistrations } from '../../registrations/hooks/useRegistrations'
import { format } from 'date-fns'

// Valid academies for each period
const VALID_ACADEMIES = [
  'N/A', 'Art', 'DIY', 'Korean Language', 'Korean Cooking', 'Piano', 
  'Pickleball', 'Senior', 'Soccer', 'Stretch and Strengthen', 'Kids'
]

type InvalidAcademyRecord = {
  id: string
  firstName: string
  lastName: string
  email: string
  cellNumber: string
  createdAt: string
  period: 'P1' | 'P2'
  invalidAcademy: string
  issue: string
}

export default function InvalidAcademiesReportPage() {
  const { data: registrations, loading, error } = useRegistrations()

  const invalidRecords = React.useMemo(() => {
    if (!registrations) return []

    const invalid: InvalidAcademyRecord[] = []

    registrations.forEach(reg => {
      const createdAt = reg.createdAt?.toDate?.() || new Date(reg.createdAt || Date.now())
      const dateDisplay = format(createdAt, 'MMM dd, yyyy')

      // Check Period 1
      if (reg.firstPeriod?.academy && !VALID_ACADEMIES.includes(reg.firstPeriod.academy)) {
        invalid.push({
          id: reg.id,
          firstName: reg.firstName || '',
          lastName: reg.lastName || '',
          email: reg.email || '',
          cellNumber: reg.cellNumber || '',
          createdAt: dateDisplay,
          period: 'P1',
          invalidAcademy: reg.firstPeriod.academy,
          issue: `Invalid academy: "${reg.firstPeriod.academy}"`
        })
      }

      // Check Period 2
      if (reg.secondPeriod?.academy && !VALID_ACADEMIES.includes(reg.secondPeriod.academy)) {
        invalid.push({
          id: reg.id,
          firstName: reg.firstName || '',
          lastName: reg.lastName || '',
          email: reg.email || '',
          cellNumber: reg.cellNumber || '',
          createdAt: dateDisplay,
          period: 'P2',
          invalidAcademy: reg.secondPeriod.academy,
          issue: `Invalid academy: "${reg.secondPeriod.academy}"`
        })
      }

      // Check for empty academies (if they selected something but it's empty)
      if (reg.firstPeriod && (!reg.firstPeriod.academy || reg.firstPeriod.academy === '')) {
        invalid.push({
          id: reg.id,
          firstName: reg.firstName || '',
          lastName: reg.lastName || '',
          email: reg.email || '',
          cellNumber: reg.cellNumber || '',
          createdAt: dateDisplay,
          period: 'P1',
          invalidAcademy: '(Empty)',
          issue: 'No academy selected for Period 1'
        })
      }

      if (reg.secondPeriod && (!reg.secondPeriod.academy || reg.secondPeriod.academy === '')) {
        invalid.push({
          id: reg.id,
          firstName: reg.firstName || '',
          lastName: reg.lastName || '',
          email: reg.email || '',
          cellNumber: reg.cellNumber || '',
          createdAt: dateDisplay,
          period: 'P2',
          invalidAcademy: '(Empty)',
          issue: 'No academy selected for Period 2'
        })
      }
    })

    return invalid.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [registrations])

  const uniqueEmails = React.useMemo(() => {
    return [...new Set(invalidRecords.map(record => record.email))].filter(Boolean)
  }, [invalidRecords])

  const generateEmailList = () => {
    const emails = uniqueEmails.join(', ')
    navigator.clipboard.writeText(emails)
    alert('Email list copied to clipboard!')
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading registrations...</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error loading registrations: {error}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Invalid Academies Report
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Invalid Records
              </Typography>
              <Typography variant="h3">
                {invalidRecords.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Unique Emails to Contact
              </Typography>
              <Typography variant="h3">
                {uniqueEmails.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Valid Academies
              </Typography>
              <Typography variant="h6">
                {VALID_ACADEMIES.join(', ')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Email List */}
      {uniqueEmails.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardHeader
            title="Emails to Contact"
            subheader={`${uniqueEmails.length} unique emails that need to be contacted`}
            action={
              <Chip 
                label="Copy All Emails" 
                onClick={generateEmailList}
                color="primary"
                clickable
              />
            }
          />
          <CardContent>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {uniqueEmails.join(', ')}
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Invalid Records Table */}
      <Card>
        <CardHeader
          title="Invalid Academy Records"
          subheader="Records with academies that don't exist or are empty"
        />
        <CardContent>
          {invalidRecords.length === 0 ? (
            <Alert severity="success">
              No invalid academy records found! All registrations have valid academies.
            </Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Name</strong></TableCell>
                    <TableCell><strong>Email</strong></TableCell>
                    <TableCell><strong>Phone</strong></TableCell>
                    <TableCell><strong>Period</strong></TableCell>
                    <TableCell><strong>Invalid Academy</strong></TableCell>
                    <TableCell><strong>Issue</strong></TableCell>
                    <TableCell><strong>Registration Date</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invalidRecords.map((record) => (
                    <TableRow key={`${record.id}-${record.period}`}>
                      <TableCell>
                        <strong>{record.firstName} {record.lastName}</strong>
                      </TableCell>
                      <TableCell>
                        <a href={`mailto:${record.email}`} style={{ color: 'inherit' }}>
                          {record.email}
                        </a>
                      </TableCell>
                      <TableCell>{record.cellNumber}</TableCell>
                      <TableCell>
                        <Chip 
                          label={record.period} 
                          color={record.period === 'P1' ? 'primary' : 'secondary'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={record.invalidAcademy} 
                          color="error"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="error">
                          {record.issue}
                        </Typography>
                      </TableCell>
                      <TableCell>{record.createdAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
