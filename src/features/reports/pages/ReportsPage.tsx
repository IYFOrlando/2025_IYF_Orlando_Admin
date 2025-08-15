import * as React from 'react'
import {
  Card, CardHeader, CardContent, Stack, Box, Alert, Button, TextField,
  Tabs, Tab, Typography, Chip, FormControl, InputLabel, Select, MenuItem,
  Grid, Table, TableHead, TableRow, TableCell, TableBody, Paper
} from '@mui/material'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import SchoolIcon from '@mui/icons-material/School'
import PersonIcon from '@mui/icons-material/Person'
import PaymentIcon from '@mui/icons-material/Payment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PendingIcon from '@mui/icons-material/Pending'
import AssessmentIcon from '@mui/icons-material/Assessment'
import DownloadIcon from '@mui/icons-material/Download'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import GroupIcon from '@mui/icons-material/Group'
import RestaurantIcon from '@mui/icons-material/Restaurant'

// Charts
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

import { useRegistrations } from '../../registrations/hooks/useRegistrations'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoImage from '../../../assets/logo/IYF_logo.png'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { normalizeAcademy } from '../../../lib/normalization'
import { useInvoices } from '../../payments/hooks/useInvoices'
import { usePayments } from '../../payments/hooks/usePayments'


interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

function computeAge(birthday?: string | null): number | '' {
  if (!birthday) return ''
  const age = new Date().getFullYear() - new Date(birthday).getFullYear()
  return age < 0 ? '' : age
}

// Payment Status Types
type PaymentStatus = 'paid' | 'pending' | 'partial' | 'overdue' | 'waived' | 'unpaid'

interface PaymentRecord {
  id: string
  studentId: string
  studentName: string
  academy: string
  period: 'p1' | 'p2'
  amount: number
  paidAmount: number
  status: PaymentStatus
  dueDate: string
  paymentDate?: string
  notes?: string
  lunchAmount?: number
  lunchSemester?: boolean
  lunchSingleQty?: number
}

// Attendance Types
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  academy: string
  period: 'p1' | 'p2'
  level?: string
  date: string
  status: AttendanceStatus
  notes?: string
}

export default function ReportsPage() {
  const { data: registrations, loading, error } = useRegistrations()
  const { data: invoices } = useInvoices()
  const { data: payments } = usePayments()
  
  const [tabValue, setTabValue] = React.useState(0)
  const [dateRange, setDateRange] = React.useState<{start: string, end: string}>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [selectedAcademy, setSelectedAcademy] = React.useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = React.useState<'all' | 'p1' | 'p2'>('all')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<'all' | 'zelle' | 'cash'>('all')

  // Attendance State
  const [attendance, setAttendance] = React.useState<AttendanceRecord[]>([])

  // Process real payment data from invoices and payments (including lunch)
  const processedPaymentData = React.useMemo(() => {
    if (!invoices || !payments) return []
    
    const paymentRecords: PaymentRecord[] = []
    
    invoices.forEach(invoice => {
      // Find all payments for this invoice
      const invoicePayments = payments.filter(p => p.invoiceId === invoice.id)
      const totalPaid = invoicePayments.reduce((sum, p) => sum + p.amount, 0)
      
      // Create a payment record for each line in the invoice
      invoice.lines.forEach(line => {
        paymentRecords.push({
          id: `${invoice.id}-${line.academy}`,
          studentId: invoice.studentId,
          studentName: invoice.studentName,
          academy: line.academy,
          period: 'p1', // Default since we don't have period info in invoices
          amount: line.amount,
          paidAmount: totalPaid >= invoice.total ? line.amount : (line.amount * totalPaid / invoice.total),
          status: invoice.status,
          dueDate: invoice.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          paymentDate: invoicePayments.length > 0 ? invoicePayments[0].createdAt?.toDate?.()?.toISOString() : undefined,
          notes: invoice.discountNote || '',
          lunchAmount: invoice.lunchAmount || 0,
          lunchSemester: invoice.lunch?.semesterSelected || false,
          lunchSingleQty: invoice.lunch?.singleQty || 0
        })
      })
    })
    
    return paymentRecords
  }, [invoices, payments])

  // Lunch analytics
  const lunchAnalytics = React.useMemo(() => {
    const totalLunchRevenue = processedPaymentData.reduce((sum, p) => sum + (p.lunchAmount || 0), 0)
    const semesterLunches = processedPaymentData.filter(p => p.lunchSemester).length
    const singleLunches = processedPaymentData.reduce((sum, p) => sum + (p.lunchSingleQty || 0), 0)
    
    return {
      totalRevenue: totalLunchRevenue,
      semesterCount: semesterLunches,
      singleCount: singleLunches,
      totalLunches: semesterLunches + singleLunches
    }
  }, [processedPaymentData])

  // Saturday collection analytics
  const saturdayAnalytics = React.useMemo(() => {
    if (!invoices || !payments) return { bySaturday: [], byMethod: [] }
    
    // Group payments by Saturday (assuming payments are made on Saturdays)
    const saturdayData: Record<string, { total: number, students: string[], academyPayments: number, lunchPayments: number }> = {}
    
    // Group by payment method
    const methodData = {
      zelle: { academy: 0, lunch: 0, total: 0 },
      cash: { academy: 0, lunch: 0, total: 0 }
    }
    
    payments.forEach(payment => {
      const paymentDate = payment.createdAt?.toDate?.() || new Date()
      const saturdayKey = paymentDate.toISOString().split('T')[0] // YYYY-MM-DD format
      
      // Find the corresponding invoice to get lunch info
      const invoice = invoices.find(inv => inv.id === payment.invoiceId)
      const lunchAmount = invoice?.lunchAmount || 0
      const academyAmount = (invoice?.total || 0) - lunchAmount
      
      // Saturday grouping
      if (!saturdayData[saturdayKey]) {
        saturdayData[saturdayKey] = { total: 0, students: [], academyPayments: 0, lunchPayments: 0 }
      }
      
      saturdayData[saturdayKey].total += payment.amount
      if (invoice?.studentName && !saturdayData[saturdayKey].students.includes(invoice.studentName)) {
        saturdayData[saturdayKey].students.push(invoice.studentName)
      }
      
      // Calculate proportional amounts for lunch and academy
      const totalInvoiceAmount = invoice?.total || payment.amount
      const lunchProportion = totalInvoiceAmount > 0 ? (lunchAmount / totalInvoiceAmount) : 0
      const academyProportion = totalInvoiceAmount > 0 ? (academyAmount / totalInvoiceAmount) : 1
      
      const lunchPaymentAmount = payment.amount * lunchProportion
      const academyPaymentAmount = payment.amount * academyProportion
      
      saturdayData[saturdayKey].lunchPayments += lunchPaymentAmount
      saturdayData[saturdayKey].academyPayments += academyPaymentAmount
      
      // Method grouping
      if (payment.method === 'zelle') {
        methodData.zelle.total += payment.amount
        methodData.zelle.lunch += lunchPaymentAmount
        methodData.zelle.academy += academyPaymentAmount
      } else if (payment.method === 'cash') {
        methodData.cash.total += payment.amount
        methodData.cash.lunch += lunchPaymentAmount
        methodData.cash.academy += academyPaymentAmount
      }
    })
    
    // Convert to chart data
    const saturdayChartData = Object.entries(saturdayData)
      .map(([date, data]) => ({
        date,
        total: data.total,
        academyPayments: data.academyPayments,
        lunchPayments: data.lunchPayments,
        students: data.students.join(', '),
        fill: `hsl(${Math.random() * 360}, 70%, 50%)`
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    const methodChartData = [
      {
        name: 'Zelle - Academy',
        value: methodData.zelle.academy,
        method: 'zelle',
        type: 'academy',
        fill: '#2196F3'
      },
      {
        name: 'Zelle - Lunch',
        value: methodData.zelle.lunch,
        method: 'zelle',
        type: 'lunch',
        fill: '#1976D2'
      },
      {
        name: 'Cash - Academy',
        value: methodData.cash.academy,
        method: 'cash',
        type: 'academy',
        fill: '#4CAF50'
      },
      {
        name: 'Cash - Lunch',
        value: methodData.cash.lunch,
        method: 'cash',
        type: 'lunch',
        fill: '#388E3C'
      }
    ].filter(item => item.value > 0)
    
    return {
      bySaturday: saturdayChartData,
      byMethod: methodChartData,
      summary: {
        totalZelle: methodData.zelle.total,
        totalCash: methodData.cash.total,
        totalAcademy: methodData.zelle.academy + methodData.cash.academy,
        totalLunch: methodData.zelle.lunch + methodData.cash.lunch
      }
    }
  }, [invoices, payments])

  // Get all unique academies from registrations
  const academies = React.useMemo(() => {
    const academySet = new Set<string>()
    registrations?.forEach(reg => {
      const p1Academy = reg?.firstPeriod?.academy?.trim()
      const p2Academy = reg?.secondPeriod?.academy?.trim()
      
      if (p1Academy && p1Academy.toLowerCase() !== 'n/a') {
        academySet.add(normalizeAcademy(p1Academy))
      }
      if (p2Academy && p2Academy.toLowerCase() !== 'n/a') {
        academySet.add(normalizeAcademy(p2Academy))
      }
    })
    return Array.from(academySet).sort()
  }, [registrations])

  // Filter registrations based on selected filters
  const filteredRegistrations = React.useMemo(() => {
    if (!registrations) return []
    
    return registrations.filter(reg => {
      const p1Academy = normalizeAcademy(reg?.firstPeriod?.academy || null)
      const p2Academy = normalizeAcademy(reg?.secondPeriod?.academy || null)
      
      const academyMatch = selectedAcademy === 'all' || 
        p1Academy === selectedAcademy || 
        p2Academy === selectedAcademy
      
      const periodMatch = selectedPeriod === 'all' || 
        (selectedPeriod === 'p1' && p1Academy) || 
        (selectedPeriod === 'p2' && p2Academy)
      
      return academyMatch && periodMatch
    })
  }, [registrations, selectedAcademy, selectedPeriod])

  // Filter payments based on selected filters
  const filteredPayments = React.useMemo(() => {
    return processedPaymentData.filter(payment => {
      const academyMatch = selectedAcademy === 'all' || payment.academy === selectedAcademy
      const periodMatch = selectedPeriod === 'all' || payment.period === selectedPeriod
      
      // For payment method filtering, we need to check the actual payment records
      let methodMatch = true
      if (selectedPaymentMethod !== 'all') {
        // Find the corresponding payment record to check the method
        const paymentRecord = payments?.find(p => p.invoiceId === payment.id.split('-')[0])
        methodMatch = paymentRecord?.method === selectedPaymentMethod
      }
      
      return academyMatch && periodMatch && methodMatch
    })
  }, [processedPaymentData, selectedAcademy, selectedPeriod, selectedPaymentMethod, payments])

  // Filter attendance based on selected filters
  const filteredAttendance = React.useMemo(() => {
    return attendance.filter(record => {
      const academyMatch = selectedAcademy === 'all' || record.academy === selectedAcademy
      const periodMatch = selectedPeriod === 'all' || record.period === selectedPeriod
      const dateMatch = record.date >= dateRange.start && record.date <= dateRange.end
      return academyMatch && periodMatch && dateMatch
    })
  }, [attendance, selectedAcademy, selectedPeriod, dateRange])

  // Chart data processing
  const chartData = React.useMemo(() => {
    if (!filteredRegistrations) return { academies: [], cities: [], periods: [] }

    // Academy data
    const academyCount: Record<string, number> = {}
    filteredRegistrations.forEach(reg => {
      const p1Academy = normalizeAcademy(reg?.firstPeriod?.academy || null)
      const p2Academy = normalizeAcademy(reg?.secondPeriod?.academy || null)
      
      if (p1Academy) {
        academyCount[p1Academy] = (academyCount[p1Academy] || 0) + 1
      }
      if (p2Academy) {
        academyCount[p2Academy] = (academyCount[p2Academy] || 0) + 1
      }
    })

    const academyData = Object.entries(academyCount).map(([name, value]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      fullName: name,
      value,
      fill: `hsl(${Math.random() * 360}, 70%, 50%)`
    })).sort((a, b) => b.value - a.value)

    // City data
    const cityCount: Record<string, number> = {}
    filteredRegistrations.forEach(reg => {
      const city = reg.city?.trim()
      if (city && city.toLowerCase() !== 'n/a') {
        cityCount[city] = (cityCount[city] || 0) + 1
      }
    })

    const cityData = Object.entries(cityCount).map(([name, value]) => ({
      name: name.length > 12 ? name.substring(0, 12) + '...' : name,
      fullName: name,
      value,
      fill: `hsl(${Math.random() * 360}, 70%, 50%)`
    })).sort((a, b) => b.value - a.value).slice(0, 10) // Top 10 cities

    // Period data
    const periodCount = {
      'Period 1': filteredRegistrations.filter(reg => reg.firstPeriod?.academy).length,
      'Period 2': filteredRegistrations.filter(reg => reg.secondPeriod?.academy).length,
      'Both Periods': filteredRegistrations.filter(reg => 
        reg.firstPeriod?.academy && reg.secondPeriod?.academy
      ).length
    }

    const periodData = Object.entries(periodCount).map(([name, value]) => ({
      name,
      value,
      fill: name === 'Period 1' ? '#2196F3' : name === 'Period 2' ? '#4CAF50' : '#FF9800'
    }))

    return {
      academies: academyData,
      cities: cityData,
      periods: periodData
    }
  }, [filteredRegistrations])

  // Latest registrations (last 10)
  const latestRegistrations = React.useMemo(() => {
    if (!filteredRegistrations) return []
    
    return filteredRegistrations
      .sort((a, b) => {
        // Sort by registration date if available, otherwise by ID
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })
      .slice(0, 10)
  }, [filteredRegistrations])

  // Payment calculations
  const totalPayments = React.useMemo(() => {
    return filteredPayments.reduce((sum, payment) => sum + payment.amount, 0)
  }, [filteredPayments])

  const totalPaid = React.useMemo(() => {
    return filteredPayments.reduce((sum, payment) => sum + payment.paidAmount, 0)
  }, [filteredPayments])

  const totalPending = React.useMemo(() => {
    return totalPayments - totalPaid
  }, [totalPayments, totalPaid])

  // Payment chart data
  const paymentChartData = React.useMemo(() => {
    // Academy data
    const academyAmounts: Record<string, number> = {}
    filteredPayments.forEach(payment => {
      const academy = payment.academy?.trim()
      if (academy) {
        academyAmounts[academy] = (academyAmounts[academy] || 0) + payment.amount
      }
    })

    const academyData = Object.entries(academyAmounts).map(([name, value]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      fullName: name,
      value,
      fill: `hsl(${Math.random() * 360}, 70%, 50%)`
    })).sort((a, b) => b.value - a.value)

    // Status data
    const statusCount: Record<string, number> = {}
    filteredPayments.forEach(payment => {
      statusCount[payment.status] = (statusCount[payment.status] || 0) + 1
    })

    const statusData = Object.entries(statusCount).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: name === 'paid' ? '#4CAF50' : 
            name === 'pending' ? '#FF9800' : 
            name === 'partial' ? '#2196F3' : 
            name === 'overdue' ? '#F44336' : '#9E9E9E'
    }))

    return {
      academies: academyData,
      status: statusData
    }
  }, [filteredPayments])

  // Latest payments (last 10)
  const latestPayments = React.useMemo(() => {
    return filteredPayments
      .sort((a, b) => {
        // Sort by payment date if available, otherwise by ID
        const dateA = a.paymentDate ? new Date(a.paymentDate).getTime() : 0
        const dateB = b.paymentDate ? new Date(b.paymentDate).getTime() : 0
        return dateB - dateA
      })
      .slice(0, 10)
  }, [filteredPayments])

  // Load attendance from Firebase
  React.useEffect(() => {
    const attendanceRef = collection(db, 'attendance')
    
    const unsubscribe = onSnapshot(attendanceRef, (snapshot) => {
      const attendanceData: AttendanceRecord[] = []
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        attendanceData.push({
          id: doc.id,
          studentId: data.studentId || '',
          studentName: data.studentName || '',
          academy: data.academy || '',
          period: data.period || 'p1',
          level: data.level || '',
          date: data.date || '',
          status: data.status || 'present',
          notes: data.notes || ''
        })
      })
      
      setAttendance(attendanceData)
    })

    return () => unsubscribe()
  }, [])





  // Generate comprehensive reports
  const generateRegistrationReport = () => {
    const doc = new jsPDF()
    
    // Add logo
    try {
      doc.addImage(logoImage, 'JPEG', 20, 15, 30, 30)
    } catch (error) {
      // Logo could not be added, continue without it
    }
    
    // Header
    doc.setFontSize(16)
    doc.text('IYF Orlando - Registration Report', 105, 25, { align: 'center' })
    
    doc.setFontSize(12)
    doc.text(`Academy: ${selectedAcademy === 'all' ? 'All Academies' : selectedAcademy}`, 20, 45)
    doc.text(`Period: ${selectedPeriod === 'all' ? 'All Periods' : selectedPeriod.toUpperCase()}`, 20, 55)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 65)
    
    // Summary statistics
    const totalStudents = filteredRegistrations.length
    const p1Students = filteredRegistrations.filter(reg => reg.firstPeriod?.academy).length
    const p2Students = filteredRegistrations.filter(reg => reg.secondPeriod?.academy).length
    
    doc.setFontSize(14)
    doc.text('Summary:', 20, 80)
    doc.setFontSize(10)
    doc.text(`Total Students: ${totalStudents}`, 20, 90)
    doc.text(`Period 1: ${p1Students}`, 20, 100)
    doc.text(`Period 2: ${p2Students}`, 20, 110)
    
    // Student table
    const tableData = filteredRegistrations.map(reg => [
      reg.firstName || '',
      reg.lastName || '',
      computeAge(reg.birthday) || '',
      reg.email || '',
      reg.cellNumber || '',
      reg.firstPeriod?.academy || '-',
      reg.secondPeriod?.academy || '-'
    ])
    
    autoTable(doc, {
      head: [['First Name', 'Last Name', 'Age', 'Email', 'Phone', 'Period 1', 'Period 2']],
      body: tableData,
      startY: 125,
      styles: { fontSize: 8 },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      }
    })
    
    doc.save(`registration_report_${selectedAcademy}_${selectedPeriod}.pdf`)
  }

  const generatePaymentReport = () => {
    const doc = new jsPDF()
    
    // Add logo
    try {
      doc.addImage(logoImage, 'JPEG', 20, 15, 30, 30)
    } catch (error) {
      // Logo could not be added, continue without it
    }
    
    // Header
    doc.setFontSize(16)
    doc.text('IYF Orlando - Payment Report', 105, 25, { align: 'center' })
    
    doc.setFontSize(12)
    doc.text(`Academy: ${selectedAcademy === 'all' ? 'All Academies' : selectedAcademy}`, 20, 45)
    doc.text(`Period: ${selectedPeriod === 'all' ? 'All Periods' : selectedPeriod.toUpperCase()}`, 20, 55)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 65)
    
    // Summary statistics
    const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0)
    const totalPaid = filteredPayments.reduce((sum, p) => sum + p.paidAmount, 0)
    const outstanding = totalAmount - totalPaid
    
    doc.setFontSize(14)
    doc.text('Payment Summary:', 20, 80)
    doc.setFontSize(10)
    doc.text(`Total Amount: $${totalAmount.toFixed(2)}`, 20, 90)
    doc.text(`Total Paid: $${totalPaid.toFixed(2)}`, 20, 100)
    doc.text(`Outstanding: $${outstanding.toFixed(2)}`, 20, 110)
    doc.text(`Lunch Revenue: $${lunchAnalytics.totalRevenue.toFixed(2)}`, 20, 120)
    
    // Payment table
    const tableData = filteredPayments.map(payment => [
      payment.studentName,
      payment.academy,
      payment.period.toUpperCase(),
      `$${payment.amount.toFixed(2)}`,
      `$${payment.paidAmount.toFixed(2)}`,
      payment.status.toUpperCase(),
      new Date(payment.dueDate).toLocaleDateString(),
      payment.lunchAmount ? `$${payment.lunchAmount.toFixed(2)}` : '-'
    ])
    
    autoTable(doc, {
      head: [['Student', 'Academy', 'Period', 'Amount', 'Paid', 'Status', 'Due Date', 'Lunch']],
      body: tableData,
      startY: 135,
      styles: { fontSize: 8 },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      }
    })
    
    doc.save(`payment_report_${selectedAcademy}_${selectedPeriod}.pdf`)
  }

  const generateAttendanceReport = () => {
    const doc = new jsPDF()
    
    // Add logo
    try {
      doc.addImage(logoImage, 'JPEG', 20, 15, 30, 30)
    } catch (error) {
      // Logo could not be added, continue without it
    }
    
    // Header
    doc.setFontSize(16)
    doc.text('IYF Orlando - Attendance Report', 105, 25, { align: 'center' })
    
    doc.setFontSize(12)
    doc.text(`Academy: ${selectedAcademy === 'all' ? 'All Academies' : selectedAcademy}`, 20, 45)
    doc.text(`Period: ${selectedPeriod === 'all' ? 'All Periods' : selectedPeriod.toUpperCase()}`, 20, 55)
    doc.text(`Date Range: ${new Date(dateRange.start).toLocaleDateString()} - ${new Date(dateRange.end).toLocaleDateString()}`, 20, 65)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 75)
    
    // Summary statistics
    const totalRecords = filteredAttendance.length
    const present = filteredAttendance.filter(a => a.status === 'present').length
    const absent = filteredAttendance.filter(a => a.status === 'absent').length
    const late = filteredAttendance.filter(a => a.status === 'late').length
    const excused = filteredAttendance.filter(a => a.status === 'excused').length
    
    doc.setFontSize(14)
    doc.text('Attendance Summary:', 20, 90)
    doc.setFontSize(10)
    doc.text(`Total Records: ${totalRecords}`, 20, 100)
    doc.text(`Present: ${present}`, 20, 110)
    doc.text(`Absent: ${absent}`, 20, 120)
    doc.text(`Late: ${late}`, 20, 130)
    doc.text(`Excused: ${excused}`, 20, 140)
    
    // Attendance table
    const tableData = filteredAttendance.map(record => [
      record.studentName,
      record.academy,
      record.period.toUpperCase(),
      record.level || '-',
      new Date(record.date).toLocaleDateString(),
      record.status.toUpperCase(),
      record.notes || '-'
    ])
    
    autoTable(doc, {
      head: [['Student', 'Academy', 'Period', 'Level', 'Date', 'Status', 'Notes']],
      body: tableData,
      startY: 155,
      styles: { fontSize: 8 },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      }
    })
    
    doc.save(`attendance_report_${selectedAcademy}_${selectedPeriod}.pdf`)
  }

  return (
    <Card elevation={0} sx={{ borderRadius: 3 }}>
      <CardHeader
        title="Comprehensive Reports" 
        subheader="Track registration, payments, lunch, and attendance with detailed reporting" 
      />
      <CardContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

        {/* Filters */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>Filters:</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Academy</InputLabel>
                <Select
                  value={selectedAcademy}
                  onChange={(e) => setSelectedAcademy(e.target.value)}
                  label="Academy"
                >
                  <MenuItem value="all">All Academies</MenuItem>
                  {academies.map(academy => (
                    <MenuItem key={academy} value={academy}>{academy}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Period</InputLabel>
                <Select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as 'all' | 'p1' | 'p2')}
                  label="Period"
                >
                  <MenuItem value="all">All Periods</MenuItem>
                  <MenuItem value="p1">Period 1</MenuItem>
                  <MenuItem value="p2">Period 2</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Start Date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="End Date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value as 'all' | 'zelle' | 'cash')}
                  label="Payment Method"
                >
                  <MenuItem value="all">All Methods</MenuItem>
                  <MenuItem value="zelle">Zelle</MenuItem>
                  <MenuItem value="cash">Cash</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                     <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label={`Registration (${filteredRegistrations.length})`} />
            <Tab label={`Payments (${filteredPayments.length})`} />
            <Tab label={`Lunch (${lunchAnalytics.totalLunches})`} />
            <Tab label={`Attendance (${filteredAttendance.length})`} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Stack spacing={3}>
            {/* Header with Export Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupIcon color="primary" />
                Registration Analytics
              </Typography>
              <Button
                startIcon={<DownloadIcon />}
                variant="contained"
                onClick={generateRegistrationReport}
              >
                Export Full Report
              </Button>
            </Box>

            {/* Summary Cards */}
        <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
                  <Typography variant="h4" fontWeight="bold">
                    {filteredRegistrations.length}
                  </Typography>
                  <Typography variant="subtitle1">Total Students</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'secondary.main', color: 'white' }}>
                  <Typography variant="h4" fontWeight="bold">
                    {latestRegistrations.length > 0 
                      ? `${latestRegistrations[0].firstName} ${latestRegistrations[0].lastName}`
                      : 'No registrations'
                    }
                  </Typography>
                  <Typography variant="subtitle1">Latest Registration</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
                  <Typography variant="h4" fontWeight="bold">
                    {chartData.cities.length}
                  </Typography>
                  <Typography variant="subtitle1">Cities Represented</Typography>
                </Paper>
              </Grid>
          </Grid>

            {/* Charts Row */}
            <Grid container spacing={3}>
              {/* Academy Chart */}
              <Grid item xs={12} lg={6}>
                <Paper sx={{ p: 3, height: 400 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SchoolIcon color="primary" />
                    Registrations by Academy
                  </Typography>
                                       <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={chartData.academies}>
                  <CartesianGrid strokeDasharray="3 3" />
                         <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                         <RechartsTooltip 
                           formatter={(value, _, props) => [
                             `${value} students`, 
                             props.payload.fullName
                           ]}
                         />
                         <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
                </Paper>
          </Grid>

              {/* City Chart */}
              <Grid item xs={12} lg={6}>
                <Paper sx={{ p: 3, height: 400 }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationOnIcon color="primary" />
                    Registrations by City (Top 10)
                  </Typography>
                                       <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={chartData.cities}>
                  <CartesianGrid strokeDasharray="3 3" />
                         <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                         <RechartsTooltip 
                           formatter={(value, _, props) => [
                             `${value} students`, 
                             props.payload.fullName
                           ]}
                         />
                         <Bar dataKey="value" fill="#82ca9d" />
                       </BarChart>
                     </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>

            {/* Latest Registrations */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon color="primary" />
                Latest Registrations (Last 10)
              </Typography>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Age</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>City</TableCell>
                    <TableCell>Period 1</TableCell>
                    <TableCell>Period 2</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {latestRegistrations.map((reg, index) => (
                    <TableRow key={reg.id}>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {index + 1}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {reg.firstName} {reg.lastName}
                        </Typography>
                      </TableCell>
                      <TableCell>{computeAge(reg.birthday)}</TableCell>
                      <TableCell>{reg.email}</TableCell>
                      <TableCell>{reg.city}</TableCell>
                      <TableCell>
                        {reg.firstPeriod?.academy ? (
                          <Chip 
                            label={`${reg.firstPeriod.academy}${reg.firstPeriod.level ? ` (${reg.firstPeriod.level})` : ''}`}
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {reg.secondPeriod?.academy ? (
                          <Chip 
                            label={`${reg.secondPeriod.academy}${reg.secondPeriod.level ? ` (${reg.secondPeriod.level})` : ''}`}
                            size="small" 
                            color="secondary" 
                            variant="outlined"
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {latestRegistrations.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No registrations found with current filters
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* Period Chart */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon color="primary" />
                Registrations by Period
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.periods}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.periods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => [`${value} students`, 'Count']} />
                  </PieChart>
              </ResponsiveContainer>
              </Box>
            </Paper>
          </Stack>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Stack spacing={3}>
            {/* Summary Cards */}
            <Grid container spacing={3}>
              <Grid item xs={12} sm={2}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
                  <Typography variant="h4" fontWeight="bold">
                    ${totalPayments.toFixed(2)}
                  </Typography>
                  <Typography variant="subtitle1">Total Payments</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
                  <Typography variant="h4" fontWeight="bold">
                    ${totalPaid.toFixed(2)}
                  </Typography>
                  <Typography variant="subtitle1">Total Collected</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'warning.main', color: 'white' }}>
                  <Typography variant="h4" fontWeight="bold">
                    ${totalPending.toFixed(2)}
                  </Typography>
                  <Typography variant="subtitle1">Pending Amount</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'info.main', color: 'white' }}>
                  <Typography variant="h4" fontWeight="bold">
                    ${lunchAnalytics.totalRevenue.toFixed(2)}
                  </Typography>
                  <Typography variant="subtitle1">Lunch Revenue</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'secondary.main', color: 'white' }}>
                  <Typography variant="h4" fontWeight="bold">
                    ${saturdayAnalytics.summary?.totalZelle?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="subtitle1">Total Zelle</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'error.main', color: 'white' }}>
                  <Typography variant="h4" fontWeight="bold">
                    ${saturdayAnalytics.summary?.totalCash?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="subtitle1">Total Cash</Typography>
                </Paper>
              </Grid>
          </Grid>

            {/* No Data Alert */}
            {processedPaymentData.length === 0 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body1" gutterBottom>
                  <strong>No payment records found in Firebase</strong>
                </Typography>
                <Typography variant="body2" gutterBottom>
                  To get started with payment tracking:
                </Typography>
                <Typography variant="body2" component="div">
                  1. Use the main Payments page to create invoices and record payments
                </Typography>
                <Typography variant="body2" component="div">
                  2. Once invoices and payments exist, you can view analytics here
                </Typography>
                <Typography variant="body2" component="div">
                  3. The system automatically processes real payment data from invoices
                </Typography>
              </Alert>
            )}

            {/* Charts Row */}
            {processedPaymentData.length > 0 ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, height: 400 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PaymentIcon /> Payments by Academy
                    </Typography>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paymentChartData.academies}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <RechartsTooltip formatter={(value) => [`$${value}`, 'Amount']} />
                        <Bar dataKey="value" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, height: 400 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssessmentIcon /> Payment Status Distribution
                    </Typography>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                        <Pie
                          data={paymentChartData.status}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {paymentChartData.status.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                          </Pie>
                        <RechartsTooltip formatter={(value) => [`${value} payments`, 'Count']} />
                        </PieChart>
                      </ResponsiveContainer>
                  </Paper>
                  </Grid>
                </Grid>
            ) : (
                             <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}>
                 <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                   <PaymentIcon color="disabled" />
                   Payment Analytics
                 </Typography>
                 <Typography variant="body1" color="text.secondary" gutterBottom>
                   Charts will appear here once payment records are available
                 </Typography>
                 <Typography variant="body2" color="text.secondary">
                   Use the main Payments page to create invoices and record payments
                 </Typography>
               </Paper>
            )}

            {/* Latest Payments Table */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaymentIcon /> Latest Payments (Last 10)
              </Typography>
                             {latestPayments.length === 0 ? (
                 <Box sx={{ textAlign: 'center', py: 4 }}>
                   <Typography variant="body1" color="text.secondary" gutterBottom>
                     No payment records found
                   </Typography>
                   <Typography variant="body2" color="text.secondary">
                     Use the main Payments page to create invoices and record payments
                   </Typography>
                 </Box>
              ) : (
                <Table size="small">
                                     <TableHead>
                     <TableRow>
                       <TableCell>#</TableCell>
                       <TableCell>Student</TableCell>
                       <TableCell>Academy</TableCell>
                       <TableCell>Period</TableCell>
                       <TableCell>Amount</TableCell>
                       <TableCell>Paid</TableCell>
                       <TableCell>Status</TableCell>
                       <TableCell>Method</TableCell>
                       <TableCell>Due Date</TableCell>
                       <TableCell>Lunch</TableCell>
                     </TableRow>
                   </TableHead>
                  <TableBody>
                    {latestPayments.map((payment, index) => (
                      <TableRow key={payment.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">
                            {payment.studentName}
                          </Typography>
                        </TableCell>
                        <TableCell>{payment.academy || '-'}</TableCell>
                        <TableCell>{payment.period?.toUpperCase() || '-'}</TableCell>
                        <TableCell>${payment.amount.toFixed(2)}</TableCell>
                        <TableCell>${payment.paidAmount.toFixed(2)}</TableCell>
                                                 <TableCell>
                           <Chip
                             label={payment.status}
                             color={payment.status === 'paid' ? 'success' : 
                                    payment.status === 'pending' ? 'warning' : 
                                    payment.status === 'partial' ? 'info' : 'error'}
                             size="small"
                             variant="outlined"
                           />
                         </TableCell>
                         <TableCell>
                           {(() => {
                             const paymentRecord = payments?.find(p => p.invoiceId === payment.id.split('-')[0])
                             return paymentRecord?.method ? (
                               <Chip
                                 label={paymentRecord.method.toUpperCase()}
                                 color={paymentRecord.method === 'zelle' ? 'primary' : 'success'}
                                 size="small"
                                 variant="outlined"
                               />
                             ) : (
                               <Typography variant="body2" color="text.secondary">-</Typography>
                             )
                           })()}
                         </TableCell>
                         <TableCell>{payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : '-'}</TableCell>
                         <TableCell>
                           {payment.lunchAmount ? `$${payment.lunchAmount.toFixed(2)}` : '-'}
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>

                                                   {/* Action Buttons */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Button
                  startIcon={<DownloadIcon />}
                  variant="contained"
                  onClick={generatePaymentReport}
                >
                  Export Payment Report
                </Button>
              </Box>
          </Stack>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Stack spacing={3}>
            {/* Header with Export Button */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RestaurantIcon color="primary" />
                Lunch Analytics
              </Typography>
              <Button
                startIcon={<DownloadIcon />}
                variant="contained"
                onClick={generatePaymentReport}
              >
                Export Lunch Report
              </Button>
            </Box>

            {/* Summary Cards */}
                <Grid container spacing={3}>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'success.main', color: 'white' }}>
                  <Typography variant="h4" fontWeight="bold">
                    ${lunchAnalytics.totalRevenue.toFixed(2)}
                  </Typography>
                  <Typography variant="subtitle1">Total Lunch Revenue</Typography>
                </Paper>
                  </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.main', color: 'white' }}>
                  <Typography variant="h4" fontWeight="bold">
                    {lunchAnalytics.totalLunches}
                  </Typography>
                  <Typography variant="subtitle1">Total Lunches</Typography>
                </Paper>
                  </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'secondary.main', color: 'white' }}>
                  <Typography variant="h4" fontWeight="bold">
                    {lunchAnalytics.semesterCount}
                  </Typography>
                  <Typography variant="subtitle1">Semester Lunches</Typography>
                </Paper>
                </Grid>
              <Grid item xs={12} sm={3}>
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'warning.main', color: 'white' }}>
                  <Typography variant="h4" fontWeight="bold">
                    {lunchAnalytics.singleCount}
                  </Typography>
                  <Typography variant="subtitle1">Single Lunches</Typography>
                </Paper>
          </Grid>
        </Grid>

            {/* Lunch Chart */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RestaurantIcon color="primary" />
                Lunch Distribution
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Semester', value: lunchAnalytics.semesterCount, fill: '#4CAF50' },
                        { name: 'Single', value: lunchAnalytics.singleCount, fill: '#FF9800' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    />
                    <RechartsTooltip formatter={(value) => [`${value} lunches`, 'Count']} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            {/* Lunch Details Table */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <RestaurantIcon color="primary" />
                Lunch Details
              </Typography>
              {processedPaymentData.filter(p => p.lunchAmount && p.lunchAmount > 0).length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    No lunch records found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Lunch data will appear here when students purchase lunch through invoices
                  </Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Student</TableCell>
                      <TableCell>Academy</TableCell>
                      <TableCell>Lunch Amount</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Quantity</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {processedPaymentData
                      .filter(p => p.lunchAmount && p.lunchAmount > 0)
                      .map((payment, index) => (
                        <TableRow key={payment.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>
                            <Typography variant="subtitle2">
                              {payment.studentName}
                            </Typography>
                          </TableCell>
                          <TableCell>{payment.academy || '-'}</TableCell>
                          <TableCell>${payment.lunchAmount?.toFixed(2)}</TableCell>
                          <TableCell>
                            <Chip
                              label={payment.lunchSemester ? 'Semester' : 'Single'}
                              color={payment.lunchSemester ? 'success' : 'warning'}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            {payment.lunchSemester ? '1' : payment.lunchSingleQty || '0'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          </Stack>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">Attendance Tracking</Typography>
              <Button
                startIcon={<DownloadIcon />}
                variant="contained"
                onClick={generateAttendanceReport}
              >
                Export Attendance Report
              </Button>
            </Box>
            <Box sx={{ height: 600 }}>
              <DataGrid
                rows={filteredAttendance}
                columns={[
                  { field: 'studentName', headerName: 'Student Name', minWidth: 150, flex: 1 },
                  { field: 'academy', headerName: 'Academy', minWidth: 120, flex: 1 },
                  { field: 'period', headerName: 'Period', width: 80 },
                  { field: 'level', headerName: 'Level', width: 100 },
                  { field: 'date', headerName: 'Date', width: 120,
                    valueFormatter: (params) => new Date(params.value).toLocaleDateString()
                  },
                  { 
                    field: 'status', headerName: 'Status', width: 120,
                    renderCell: (params) => {
                      const status = params.value as AttendanceStatus
                      const statusConfig = {
                        present: { color: 'success', icon: <CheckCircleIcon />, label: 'Present' },
                        absent: { color: 'error', icon: <CancelIcon />, label: 'Absent' },
                        late: { color: 'warning', icon: <PendingIcon />, label: 'Late' },
                        excused: { color: 'info', icon: <CheckCircleIcon />, label: 'Excused' }
                      }
                      const config = statusConfig[status]
                      return (
                        <Chip
                          icon={config.icon}
                          label={config.label}
                          color={config.color as any}
                          size="small"
                          variant="outlined"
                        />
                      )
                    }
                  },
                  { field: 'notes', headerName: 'Notes', minWidth: 150, flex: 1 }
                ]}
                loading={loading}
                disableRowSelectionOnClick
                getRowId={(r) => r.id}
                slots={{ toolbar: GridToolbar }}
                density="compact"
                initialState={{
                  pagination: { paginationModel: { page: 0, pageSize: 25 } }
                }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </Box>
          </Stack>
        </TabPanel>
      </CardContent>
    </Card>
  )
}