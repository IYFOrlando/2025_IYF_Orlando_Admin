import * as React from 'react'
import { Button, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import TableChartIcon from '@mui/icons-material/TableChart'
import DescriptionIcon from '@mui/icons-material/Description'
import * as XLSX from 'xlsx'
import type { VolunteerApplication } from '../types'

interface VolunteerExportProps {
  applications: VolunteerApplication[]
}

export default function VolunteerExport({ applications }: VolunteerExportProps) {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const exportToExcel = () => {
    const data = applications.map(app => ({
      'First Name': app.firstName,
      'Last Name': app.lastName,
      'Age': app.age,
      'Gender': app.gender,
      'Phone': app.phone,
      'Email': app.email,
      'City': app.city,
      'Emergency Contact Name': app.emergencyContact,
      'Emergency Contact Phone': app.emergencyPhone,
      'T-Shirt Size': app.tshirtSize,
      'Status': app.status,
      'Applied Date': app.createdAt ? new Date(app.createdAt.seconds * 1000).toLocaleDateString() : 'N/A',
      'Notes': app.notes || ''
    }))

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Volunteer Applications')

    // Auto-size columns
    const colWidths = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 8 },  // Age
      { wch: 10 }, // Gender
      { wch: 15 }, // Phone
      { wch: 25 }, // Email
      { wch: 15 }, // City
      { wch: 20 }, // Emergency Contact Name
      { wch: 18 }, // Emergency Contact Phone
      { wch: 12 }, // T-Shirt Size
      { wch: 12 }, // Status
      { wch: 15 }, // Applied Date
      { wch: 30 }  // Notes
    ]
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `volunteer-applications-${new Date().toISOString().split('T')[0]}.xlsx`)
    handleClose()
  }

  const exportToCSV = () => {
    const headers = [
      'First Name', 'Last Name', 'Age', 'Gender', 'Phone', 'Email', 'City',
      'Emergency Contact Name', 'Emergency Contact Phone', 'T-Shirt Size',
      'Status', 'Applied Date', 'Notes'
    ]

    const csvContent = [
      headers.join(','),
      ...applications.map(app => [
        `"${app.firstName}"`,
        `"${app.lastName}"`,
        app.age,
        `"${app.gender}"`,
        `"${app.phone}"`,
        `"${app.email}"`,
        `"${app.city}"`,
        `"${app.emergencyContact}"`,
        `"${app.emergencyPhone}"`,
        `"${app.tshirtSize}"`,
        `"${app.status}"`,
        `"${app.createdAt ? new Date(app.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}"`,
        `"${app.notes || ''}"`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `volunteer-applications-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    handleClose()
  }

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<FileDownloadIcon />}
        onClick={handleClick}
        disabled={applications.length === 0}
      >
        Export Data
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={exportToExcel}>
          <ListItemIcon>
            <TableChartIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export to Excel (.xlsx)</ListItemText>
        </MenuItem>
        <MenuItem onClick={exportToCSV}>
          <ListItemIcon>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export to CSV (.csv)</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
