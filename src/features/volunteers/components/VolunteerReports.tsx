import * as React from 'react'
import {
  Paper, Typography, Box, Grid, Table, TableHead, TableRow, TableCell,
  TableBody, Chip, Button, Stack
} from '@mui/material'
import CheckroomIcon from '@mui/icons-material/Checkroom'
import DownloadIcon from '@mui/icons-material/Download'
import PersonIcon from '@mui/icons-material/Person'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoImage from '../../../assets/logo/IYF_logo.png'
import { TSHIRT_SIZE_ORDER } from '../../../lib/constants'
import type { VolunteerApplication } from '../types'

interface VolunteerReportsProps {
  volunteers: VolunteerApplication[]
  loading: boolean
}

export default function VolunteerReports({ volunteers, loading }: VolunteerReportsProps) {
  // T-shirt size analytics
  const tshirtSizeAnalytics = React.useMemo(() => {
    if (!volunteers || volunteers.length === 0) return { distribution: {}, total: 0 }
    
    const distribution: Record<string, number> = {}
    
    volunteers.forEach(vol => {
      const size = vol.tshirtSize || 'Unknown'
      distribution[size] = (distribution[size] || 0) + 1
    })
    
    return {
      distribution,
      total: volunteers.length
    }
  }, [volunteers])

  // T-shirt size chart data
  const tshirtSizeChartData = React.useMemo(() => {
    const sizes = TSHIRT_SIZE_ORDER.filter(s => s !== 'Unknown')
    return sizes.map(size => ({
      name: size,
      value: tshirtSizeAnalytics.distribution[size] || 0,
      fill: `hsl(${Math.random() * 360}, 70%, 50%)`
    })).filter(item => item.value > 0)
  }, [tshirtSizeAnalytics])

  const generateTshirtSizeReport = () => {
    const doc = new jsPDF()
    
    // Add logo
    try {
      doc.addImage(logoImage, 'JPEG', 20, 15, 30, 30)
    } catch (error) {
      // Logo could not be added, continue without it
    }
    
    // Header
    doc.setFontSize(18)
    doc.setFont(undefined, 'bold')
    doc.text('IYF Orlando', 105, 35, { align: 'center' })
    doc.setFontSize(16)
    doc.text('T-Shirt Size Report', 105, 45, { align: 'center' })
    doc.setFont(undefined, 'normal')
    
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, 105, 52, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    
    // Summary statistics table
    const summaryData = Object.entries(tshirtSizeAnalytics.distribution)
      .sort(([a], [b]) => {
        const order = TSHIRT_SIZE_ORDER
        return (order.indexOf(a) === -1 ? 999 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 999 : order.indexOf(b))
      })
      .map(([size, count]) => [
        size,
        count.toString(),
        `${((count / tshirtSizeAnalytics.total) * 100).toFixed(1)}%`
      ])
    
    // Add total row
    summaryData.push(['TOTAL', tshirtSizeAnalytics.total.toString(), '100.0%'])
    
    autoTable(doc, {
      head: [['T-Shirt Size', 'Count', 'Percentage']],
      body: summaryData,
      startY: 60,
      styles: { 
        fontSize: 10,
        cellPadding: 5
      },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        textAlign: 'center'
      },
      bodyStyles: {
        textAlign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40 },
        2: { cellWidth: 50 }
      }
    })
    
    // Volunteer table with t-shirt sizes
    const filteredVolunteers = (volunteers || []).filter(v => v.tshirtSize)
    const tableData = filteredVolunteers.map((vol, index) => [
      (index + 1).toString(),
      `${vol.firstName} ${vol.lastName}`,
      vol.email || '-',
      vol.tshirtSize || 'Unknown'
    ])
    
    // Add new page for volunteer list
    doc.addPage()
    
    // Header for second page
    doc.setFontSize(18)
    doc.setFont(undefined, 'bold')
    doc.text('Volunteer List', 105, 20, { align: 'center' })
    doc.setFont(undefined, 'normal')
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Total Volunteers: ${filteredVolunteers.length}`, 105, 28, { align: 'center' })
    doc.setTextColor(0, 0, 0)
    
    autoTable(doc, {
      head: [['#', 'Name', 'Email', 'T-Shirt Size']],
      body: tableData,
      startY: 35,
      styles: { 
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        textAlign: 'center'
      },
      bodyStyles: {
        textAlign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 60 },
        2: { cellWidth: 70 },
        3: { cellWidth: 30, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    })
    
    doc.save(`tshirt_size_report_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Loading volunteers...
        </Typography>
      </Box>
    )
  }

  return (
    <Stack spacing={3}>
      {/* Header with Export Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckroomIcon color="primary" />
          T-Shirt Size Report
        </Typography>
        <Button
          startIcon={<DownloadIcon />}
          variant="contained"
          onClick={generateTshirtSizeReport}
          disabled={volunteers.length === 0}
        >
          Export Report
        </Button>
      </Box>

      {/* T-Shirt Size Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckroomIcon color="primary" />
          T-Shirt Size Distribution
        </Typography>
        
        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="h4" fontWeight="bold">
                {tshirtSizeAnalytics.total}
              </Typography>
              <Typography variant="subtitle1">Total Volunteers</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
              <Typography variant="h4" fontWeight="bold">
                {Object.keys(tshirtSizeAnalytics.distribution).length}
              </Typography>
              <Typography variant="subtitle1">Different Sizes</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.main', color: 'white' }}>
              <Typography variant="h4" fontWeight="bold">
                {(() => {
                  const entries = Object.entries(tshirtSizeAnalytics.distribution)
                  if (entries.length === 0) return 0
                  const maxEntry = entries.reduce((max, curr) => 
                    curr[1] > max[1] ? curr : max
                  )
                  return maxEntry[1]
                })()}
              </Typography>
              <Typography variant="subtitle1">Most Requested Size</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Chart */}
        <Box sx={{ height: 400, mb: 3 }}>
          {tshirtSizeChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tshirtSizeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip formatter={(value) => [`${value} volunteers`, 'Count']} />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="body1" color="text.secondary">
                No t-shirt size data available
              </Typography>
            </Box>
          )}
        </Box>

        {/* Distribution Table */}
        <Typography variant="h6" gutterBottom>
          Size Distribution
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>T-Shirt Size</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Count</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Percentage</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(tshirtSizeAnalytics.distribution)
              .sort(([a], [b]) => {
                const order = TSHIRT_SIZE_ORDER
                return (order.indexOf(a) === -1 ? 999 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 999 : order.indexOf(b))
              })
              .map(([size, count]) => (
                <TableRow key={size}>
                  <TableCell>
                    <Chip label={size} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body1" fontWeight="bold">
                      {count}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {tshirtSizeAnalytics.total > 0 ? ((count / tshirtSizeAnalytics.total) * 100).toFixed(1) : '0.0'}%
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            {Object.keys(tshirtSizeAnalytics.distribution).length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No t-shirt size data available
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Volunteers by T-Shirt Size Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" />
          Volunteers by T-Shirt Size
        </Typography>
        {volunteers && volunteers.length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>T-Shirt Size</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {volunteers
                .filter(v => v.tshirtSize)
                .map((vol, index) => (
                  <TableRow key={vol.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {vol.firstName} {vol.lastName}
                      </Typography>
                    </TableCell>
                    <TableCell>{vol.email || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={vol.tshirtSize} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No volunteers found
            </Typography>
          </Box>
        )}
      </Paper>
    </Stack>
  )
}

