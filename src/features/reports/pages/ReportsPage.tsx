import * as React from 'react'
import {
  Card, CardContent, Stack, Box, Alert, Button, TextField,
  Tabs, Tab, Typography, Chip, FormControl, InputLabel, Select, MenuItem,
  Grid, Table, TableHead, TableRow, TableCell, TableBody, Paper
} from '@mui/material'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'

import {
  TrendingUp as TrendingUpIcon, TrendingDown, Users, DollarSign, Calendar,
  School
} from 'lucide-react'
import SchoolIcon from '@mui/icons-material/School'
import PersonIcon from '@mui/icons-material/Person'
import PaymentIcon from '@mui/icons-material/Payment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PendingIcon from '@mui/icons-material/Pending'
import AssessmentIcon from '@mui/icons-material/Assessment'
import DownloadIcon from '@mui/icons-material/Download'
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
import { normalizeAcademy, normalizeLevel } from '../../../lib/normalization'
import { useInvoices } from '../../payments/hooks/useInvoices'
import { usePayments } from '../../payments/hooks/usePayments'
import { latestInvoicePerStudent } from '../../payments/utils'
import { usd } from '../../../lib/query'
import { displayYMD } from '../../../lib/date'
import { sendEmail } from '../../../lib/emailService'
import { dailyReportTemplate, type DailyReportData } from '../../../lib/reportEmailTemplates'
import { notifySuccess, notifyError } from '../../../lib/alerts'
import { GlassCard } from '../../../components/GlassCard'


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

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }: any) => (
  <GlassCard>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight={800} sx={{ mt: 1, mb: 0.5 }}>
            {value}
          </Typography>
          {trend && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              {trend === 'up' ? (
                <TrendingUpIcon size={16} color="#4CAF50" />
              ) : (
                <TrendingDown size={16} color="#F44336" />
              )}
              <Typography variant="caption" color={trend === 'up' ? 'success.main' : 'error.main'}>
                {trendValue}
              </Typography>
            </Stack>
          )}
        </Box>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: `${color}20`,
            color: color,
            display: 'flex'
          }}
        >
          <Icon size={24} />
        </Box>
      </Stack>
    </CardContent>
  </GlassCard>
)

function computeAge(birthday?: string | null): number | '' {
  if (!birthday) return ''
  const age = new Date().getFullYear() - new Date(birthday).getFullYear()
  return age < 0 ? '' : age
}

// Payment Status Types
type PaymentStatus = 'paid' | 'pending' | 'partial' | 'overdue' | 'waived' | 'unpaid' | 'exonerated'

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
  const { data: allInvoices } = useInvoices()
  const { data: payments } = usePayments()
  
  const latestInvoices = React.useMemo(() => latestInvoicePerStudent(allInvoices || []), [allInvoices])
  const invoices = allInvoices // Keep for backward compatibility
  
  const [tabValue, setTabValue] = React.useState(0)
  const [dateRange, setDateRange] = React.useState<{start: string, end: string}>({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })
  const [selectedAcademy, setSelectedAcademy] = React.useState<string>('all')
  const [selectedPeriod] = React.useState<'all' | 'p1' | 'p2'>('all')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState<'all' | 'zelle' | 'cash'>('all')
  const [dailyReportEmailTo, setDailyReportEmailTo] = React.useState('orlando@iyfusa.org')
  const [sendingDailyReportEmail, setSendingDailyReportEmail] = React.useState(false)

  const generateDailyReportPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // Add logo
    try {
      doc.addImage(logoImage, 'JPEG', 20, 15, 30, 30)
    } catch (error) {
      // Logo could not be added, continue without it
    }

    // Header
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('IYF Orlando Academy - Daily Report', pageWidth / 2, 25, { align: 'center' })
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('2026 Spring Semester', pageWidth / 2, 33, { align: 'center' })
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const reportDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    doc.text(reportDate, pageWidth / 2, 41, { align: 'center' })

    let yPos = 55

    // Total Students - Large and Prominent
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('Total Students', pageWidth / 2, yPos, { align: 'center' })
    yPos += 12
    
    doc.setFontSize(32)
    doc.setTextColor(33, 150, 243) // Blue color
    doc.text(dailyStats.overall.totalStudents.toString(), pageWidth / 2, yPos, { align: 'center' })
    doc.setTextColor(0, 0, 0) // Reset to black
    yPos += 25

    // New Students Today
    if (dailyStats.today.newStudents.length > 0) {
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('New Students Today', 20, yPos)
      yPos += 10

      const newStudentsData = dailyStats.today.newStudents.map((student, idx) => [
        (idx + 1).toString(),
        `${student.firstName} ${student.lastName}`,
        student.email,
        (student as any).selectedAcademies?.[0]?.academy || 'N/A'
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Name', 'Email', 'Academy']],
        body: newStudentsData,
        theme: 'striped',
        headStyles: { fillColor: [33, 150, 243], fontStyle: 'bold' },
        styles: { fontSize: 9 }
      })

      yPos = (doc as any).lastAutoTable.finalY + 15
    }

    // Add new page if needed
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }

    // Enrollment by Academy
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Enrollment by Academy', 20, yPos)
    yPos += 6
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Total students enrolled in each academy', 20, yPos)
    yPos += 8

    const academyData = dailyStats.allAcademies.map((academy, idx) => [
      (idx + 1).toString(),
      academy.name,
      `${academy.count} student${academy.count > 1 ? 's' : ''}`
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Rank', 'Academy', 'Students']],
      body: academyData,
      theme: 'grid',
      headStyles: { fillColor: [33, 150, 243], fontStyle: 'bold' },
      styles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 100 },
        2: { cellWidth: 50, halign: 'right' }
      }
    })

    yPos = (doc as any).lastAutoTable.finalY + 15

    // Korean Language Levels (if exists) - Without emoji
    if (dailyStats.koreanLevels.length > 0) {
      if (yPos > 240) {
        doc.addPage()
        yPos = 20
      }

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Korean Language - Levels', 20, yPos)
      yPos += 6
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Students enrolled in each Korean level', 20, yPos)
      yPos += 8

      const koreanLevelData = dailyStats.koreanLevels.map((levelData) => [
        levelData.level,
        `${levelData.count} student${levelData.count > 1 ? 's' : ''}`
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Level', 'Students']],
        body: koreanLevelData,
        theme: 'grid',
        headStyles: { fillColor: [156, 39, 176], fontStyle: 'bold' },
        styles: { fontSize: 10 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 90, halign: 'right' }
        }
      })
    }

    doc.save(`daily-report-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Daily stats calculation (for Daily Report tab)
  const dailyStats = React.useMemo(() => {
    const today = displayYMD(new Date())
    const yesterday = displayYMD(new Date(Date.now() - 86400000))
    
    // Registrations
    const todayRegs = (registrations || []).filter(r => displayYMD(r.createdAt) === today)
    const yesterdayRegs = (registrations || []).filter(r => displayYMD(r.createdAt) === yesterday)
    
    // Payments
    const todayPayments = (payments || []).filter(p => displayYMD(p.createdAt) === today)
    const yesterdayPayments = (payments || []).filter(p => displayYMD(p.createdAt) === yesterday)
    const todayRevenue = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    const yesterdayRevenue = yesterdayPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    
    // Financial overview
    const totalRevenue = (allInvoices || []).reduce((sum, inv) => sum + (inv.paid ?? 0), 0)
    const totalPending = latestInvoices.reduce((sum, inv) => sum + (inv.balance ?? 0), 0)
    const paidCount = latestInvoices.filter(inv => inv.status === 'paid').length
    const unpaidCount = latestInvoices.filter(inv => inv.status === 'unpaid').length
    
    // Total enrollment by academy (ALL students, not just today)
    const totalAcademyMap = new Map<string, number>()
    ;(registrations || []).forEach(r => {
      const academies = (r as any).selectedAcademies || [r.firstPeriod, r.secondPeriod].filter(Boolean)
      academies.forEach((a: any) => {
        if (a?.academy) {
          const normName = normalizeAcademy(a.academy)
          totalAcademyMap.set(normName, (totalAcademyMap.get(normName) || 0) + 1)
        }
      })
    })
    const allAcademyStats = Array.from(totalAcademyMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
    
    // Korean language level breakdown
    const koreanLevelMap = new Map<string, number>()
    ;(registrations || []).forEach(r => {
      const academies = (r as any).selectedAcademies || [r.firstPeriod, r.secondPeriod].filter(Boolean)
      academies.forEach((a: any) => {
        const normAc = normalizeAcademy(a?.academy)
        if (normAc === 'Korean Language') {
          let levelStr = a?.level
          
          // Fallback: inference from academy name if level is missing (legacy) or is "N/A"
          if (!levelStr || levelStr.toLowerCase() === 'n/a') {
            const rawAc = (a?.academy || '').toLowerCase()
            if (rawAc.includes('movie')) levelStr = 'K-Movie Conversation'
            else if (rawAc.includes('conversation')) levelStr = 'Conversation'
          }
          
            if (levelStr) {
            const levelName = normalizeLevel(levelStr)
            koreanLevelMap.set(levelName, (koreanLevelMap.get(levelName) || 0) + 1)
          }
        }
      })
    })
    const koreanLevelStats = Array.from(koreanLevelMap.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => {
        // Sort by level (assuming numeric or alphabetical)
        const levelA = parseInt(a.level) || a.level
        const levelB = parseInt(b.level) || b.level
        if (typeof levelA === 'number' && typeof levelB === 'number') {
          return levelA - levelB
        }
        return String(levelA).localeCompare(String(levelB))
      })
    
    // Today's academy breakdown (for comparison)
    const todayAcademyMap = new Map<string, number>()
    todayRegs.forEach(r => {
      const academies = (r as any).selectedAcademies || [r.firstPeriod, r.secondPeriod].filter(Boolean)
      academies.forEach((a: any) => {
        if (a?.academy) {
          todayAcademyMap.set(a.academy, (todayAcademyMap.get(a.academy) || 0) + 1)
        }
      })
    })
    const todayAcademyStats = Array.from(todayAcademyMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    return {
      today: {
        registrations: todayRegs.length,
        payments: todayPayments.length,
        revenue: todayRevenue,
        newStudents: todayRegs
          .filter(r => r.firstName && r.lastName)
          .map(r => ({
            firstName: r.firstName!,
            lastName: r.lastName!,
            email: r.email,
            selectedAcademies: (r as any).selectedAcademies,
            id: r.id
          })),
        academies: todayAcademyStats
      },
      yesterday: {
        registrations: yesterdayRegs.length,
        revenue: yesterdayRevenue
      },
      overall: {
        totalRevenue,
        totalPending,
        paidCount,
        unpaidCount,
        totalStudents: (registrations || []).length
      },
      allAcademies: allAcademyStats,
      koreanLevels: koreanLevelStats
    }
  }, [registrations, payments, allInvoices, latestInvoices])

  const regTrend = dailyStats.today.registrations > dailyStats.yesterday.registrations ? 'up' : dailyStats.today.registrations < dailyStats.yesterday.registrations ? 'down' : undefined
  const revTrend = dailyStats.today.revenue > dailyStats.yesterday.revenue ? 'up' : dailyStats.today.revenue < dailyStats.yesterday.revenue ? 'down' : undefined

  const sendDailyReportEmail = async () => {
    if (!dailyReportEmailTo?.trim()) {
      notifyError('Enter a recipient email')
      return
    }
    setSendingDailyReportEmail(true)
    try {
      const reportDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      const payload: DailyReportData = {
        reportDate,
        today: {
          registrations: dailyStats.today.registrations,
          payments: dailyStats.today.payments,
          revenue: dailyStats.today.revenue,
          newStudents: dailyStats.today.newStudents,
          academies: dailyStats.today.academies,
        },
        overall: {
          totalStudents: dailyStats.overall.totalStudents,
          totalRevenue: dailyStats.overall.totalRevenue,
          totalPending: dailyStats.overall.totalPending,
          paidCount: dailyStats.overall.paidCount,
          unpaidCount: dailyStats.overall.unpaidCount,
        },
        allAcademies: dailyStats.allAcademies,
        koreanLevels: dailyStats.koreanLevels,
      }
      const html = dailyReportTemplate(payload)
      const result = await sendEmail({
        to: dailyReportEmailTo.trim(),
        subject: `Daily Report – ${reportDate} – IYF Orlando Academy`,
        html,
        fromName: 'IYF Orlando Admin',
      })
      if (result.success) {
        notifySuccess('Report sent', `Email sent to ${dailyReportEmailTo}`)
      } else {
        notifyError(result.error)
      }
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to send email')
    } finally {
      setSendingDailyReportEmail(false)
    }
  }

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
    <Card elevation={0} sx={{ borderRadius: 3, overflow: 'hidden' }}>
      {/* Premium Header */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 4,
        color: 'white'
      }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <AssessmentIcon sx={{ fontSize: 50 }} />
          <Box>
            <Typography variant="h3" fontWeight={800}>
              Comprehensive Reports
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.95, mt: 0.5 }}>
              Track registration, payments, lunch, and attendance with detailed reporting
            </Typography>
          </Box>
        </Stack>
      </Box>
      <CardContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

        {/* Filters with Glassmorphism */}
        <GlassCard sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight={700} sx={{ mb: 3 }}>
              Filters
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={3}>
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
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="End Date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
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
          </CardContent>
        </GlassCard>

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="📊 Daily Report" />
            <Tab label={`Registration (${filteredRegistrations.length})`} />
            <Tab label={`Payments (${filteredPayments.length})`} />
            <Tab label={`Lunch (${lunchAnalytics.totalLunches})`} />
            <Tab label={`Attendance (${filteredAttendance.length})`} />
          </Tabs>
        </Box>

        {/* Daily Report Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ pb: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h4" fontWeight={800} sx={{
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1
              }}>
                Daily Report
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Calendar size={18} />
                <Typography variant="body1" color="text.secondary">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Typography>
              </Stack>
            </Box>

            {/* Export & Send by email */}
            <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={generateDailyReportPDF}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontWeight: 600,
                  px: 3,
                  '&:hover': { background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)' }
                }}
              >
                📄 Export to PDF
              </Button>
              <TextField
                size="small"
                label="Send report to"
                type="email"
                value={dailyReportEmailTo}
                onChange={(e) => setDailyReportEmailTo(e.target.value)}
                placeholder="orlando@iyfusa.org"
                sx={{ minWidth: 220 }}
              />
              <Button
                variant="contained"
                color="primary"
                disabled={sendingDailyReportEmail || !dailyReportEmailTo?.trim()}
                onClick={sendDailyReportEmail}
                sx={{ fontWeight: 600, px: 3 }}
              >
                {sendingDailyReportEmail ? 'Sending…' : '📧 Send by email'}
              </Button>
            </Box>

            {/* Today's Stats */}
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
              📊 Today's Activity
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="New Registrations"
                  value={dailyStats.today.registrations}
                  icon={Users}
                  color="#2196F3"
                  trend={regTrend}
                  trendValue={regTrend ? `${Math.abs(dailyStats.today.registrations - dailyStats.yesterday.registrations)} vs yesterday` : 'Same as yesterday'}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Students"
                  value={dailyStats.overall.totalStudents}
                  icon={School}
                  color="#9C27B0"
                  trend={undefined}
                  trendValue="All time"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Payments Received"
                  value={dailyStats.today.payments}
                  icon={DollarSign}
                  color="#4CAF50"
                  trend={undefined}
                  trendValue="Today"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Revenue Today"
                  value={usd(dailyStats.today.revenue)}
                  icon={DollarSign}
                  color="#FF9800"
                  trend={revTrend}
                  trendValue={revTrend ? `${usd(Math.abs(dailyStats.today.revenue - dailyStats.yesterday.revenue))} vs yesterday` : 'Same as yesterday'}
                />
              </Grid>
            </Grid>

            {/* Two Column Layout */}
            <Grid container spacing={3}>
              {/* Left Column: New Students */}
              <Grid item xs={12} md={6}>
                <GlassCard>
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} gutterBottom>
                      🆕 New Students Today
                    </Typography>
                    {dailyStats.today.newStudents.length > 0 ? (
                      <Stack spacing={2} sx={{ mt: 2 }}>
                        {dailyStats.today.newStudents.map((student, idx) => (
                          <Box
                            key={student.id}
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              bgcolor: 'rgba(33, 150, 243, 0.05)',
                              border: '1px solid rgba(33, 150, 243, 0.1)'
                            }}
                          >
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Box>
                                <Typography variant="body1" fontWeight={600}>
                                  {idx + 1}. {student.firstName} {student.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {student.email}
                                </Typography>
                              </Box>
                              <Chip
                                label={(student as any).selectedAcademies?.[0]?.academy || 'N/A'}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">No new registrations today</Typography>
                      </Box>
                    )}
                  </CardContent>
                </GlassCard>
              </Grid>

              {/* Right Column: Enrollment by Academy */}
              <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                  {/* All Academies Enrollment */}
                  <GlassCard>
                    <CardContent>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        🎓 Enrollment by Academy
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                        Total students enrolled in each academy
                      </Typography>
                      {dailyStats.allAcademies.length > 0 ? (
                        <Stack spacing={1.5} sx={{ mt: 2, maxHeight: 400, overflowY: 'auto' }}>
                          {dailyStats.allAcademies.map((academy, idx) => (
                            <Stack key={academy.name} direction="row" alignItems="center" spacing={2}>
                              <Chip
                                label={idx + 1}
                                size="small"
                                sx={{
                                  minWidth: 32,
                                  bgcolor: idx < 3 ? '#2196F3' : 'grey.400',
                                  color: 'white',
                                  fontWeight: 700
                                }}
                              />
                              <Box sx={{ flex: 1 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Typography variant="body2" fontWeight={600}>
                                    {academy.name}
                                  </Typography>
                                  <Typography variant="body2" fontWeight={700} color="primary">
                                    {academy.count} student{academy.count > 1 ? 's' : ''}
                                  </Typography>
                                </Stack>
                              </Box>
                            </Stack>
                          ))}
                        </Stack>
                      ) : (
                        <Box sx={{ py: 2, textAlign: 'center' }}>
                          <Typography color="text.secondary">No academy enrollments yet</Typography>
                        </Box>
                      )}
                    </CardContent>
                  </GlassCard>

                  {/* Korean Language Levels */}
                  {dailyStats.koreanLevels.length > 0 && (
                    <GlassCard>
                      <CardContent>
                        <Typography variant="h6" fontWeight={700} gutterBottom>
                          🇰🇷 Korean Language - Levels
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                          Students enrolled in each Korean level
                        </Typography>
                        <Stack spacing={1.5} sx={{ mt: 2 }}>
                          {dailyStats.koreanLevels.map((levelData) => (
                            <Stack key={levelData.level} direction="row" alignItems="center" spacing={2}>
                              <Box
                                sx={{
                                  minWidth: 60,
                                  px: 1.5,
                                  py: 0.5,
                                  borderRadius: 1,
                                  bgcolor: '#9C27B0',
                                  color: 'white',
                                  textAlign: 'center'
                                }}
                              >
                                <Typography variant="body2" fontWeight={700}>
                                  {levelData.level}
                                </Typography>
                              </Box>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={700} color="primary">
                                  {levelData.count} student{levelData.count > 1 ? 's' : ''}
                                </Typography>
                              </Box>
                            </Stack>
                          ))}
                        </Stack>
                      </CardContent>
                    </GlassCard>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box>
            {/* Header with Gradient */}
            <Box sx={{ 
              mb: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 3,
              p: 3,
              color: 'white'
            }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={2}>
                  <GroupIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" fontWeight={800}>
                      Registration Analytics
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Student enrollment overview and statistics
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  startIcon={<DownloadIcon />}
                  variant="contained"
                  onClick={generateRegistrationReport}
                  sx={{
                    bgcolor: 'white',
                    color: '#667eea',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.9)'
                    }
                  }}
                >
                  Export Report
                </Button>
              </Stack>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={4}>
                <GlassCard>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" fontWeight={800} color="primary">
                      {filteredRegistrations.length}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" fontWeight={600}>
                      Total Students
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
              <Grid item xs={12} sm={4}>
                <GlassCard>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight={700} noWrap>
                      {latestRegistrations.length > 0 
                        ? `${latestRegistrations[0].firstName} ${latestRegistrations[0].lastName}`
                        : 'No registrations'
                      }
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" fontWeight={600}>
                      Latest Registration
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
              <Grid item xs={12} sm={4}>
                <GlassCard>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" fontWeight={800} color="success.main">
                      {chartData.cities.length}
                    </Typography>
                    <Typography variant="subtitle1" color="text.secondary" fontWeight={600}>
                      Cities Represented
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
            </Grid>

            {/* Modern Stats Grid - Academy Breakdown */}
            <GlassCard sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <SchoolIcon color="primary" />
                  Registrations by Academy
                </Typography>
                <Grid container spacing={2}>
                  {chartData.academies.map((item, idx) => (
                    <Grid item xs={12} sm={6} md={3} key={idx}>
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: 2,
                        background: `linear-gradient(135deg, ${['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'][idx % 6]} 0%, ${['#764ba2', '#667eea', '#f5576c', '#00f2fe', '#38f9d7', '#fee140'][idx % 6]} 100%)`,
                        color: 'white',
                        textAlign: 'center',
                        transition: 'transform 0.2s',
                        '&:hover': {
                          transform: 'scale(1.05)'
                        }
                      }}>
                        <Typography variant="h3" fontWeight={800}>
                          {item.value}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.95, fontWeight: 600 }}>
                          {item.fullName}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </GlassCard>

            {/* Modern Stats Grid - City Breakdown */}
            <GlassCard sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <LocationOnIcon color="primary" />
                  Top 10 Cities
                </Typography>
                <Grid container spacing={2}>
                  {chartData.cities.map((item, idx) => (
                    <Grid item xs={12} sm={6} md={4} lg={2.4} key={idx}>
                      <Box sx={{ 
                        p: 2, 
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                        border: '2px solid',
                        borderColor: 'primary.main',
                        textAlign: 'center',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: 3
                        }
                      }}>
                        <Typography variant="h4" fontWeight={800} color="primary">
                          {item.value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mt: 0.5 }}>
                          {item.fullName}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </GlassCard>

            {/* Latest Registrations */}
            <GlassCard>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <PersonIcon color="primary" />
                  Latest Registrations (Last 10)
                </Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Age</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>City</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Academies</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {latestRegistrations.map((reg, index) => {
                      const academies = (reg as any).selectedAcademies || 
                        [reg.firstPeriod, reg.secondPeriod].filter(Boolean)
                      
                      return (
                        <TableRow key={reg.id}>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {index + 1}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight={600}>
                              {reg.firstName} {reg.lastName}
                            </Typography>
                          </TableCell>
                          <TableCell>{computeAge(reg.birthday)}</TableCell>
                          <TableCell>{reg.email}</TableCell>
                          <TableCell>{reg.city}</TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                              {academies.length > 0 ? (
                                academies.map((acad: any, idx: number) => (
                                  <Chip 
                                    key={idx}
                                    label={`${acad.academy}${acad.level ? ` (${acad.level})` : ''}`}
                                    size="small" 
                                    color="primary" 
                                    variant="outlined"
                                    sx={{ mb: 0.5 }}
                                  />
                                ))
                              ) : (
                                <Typography variant="body2" color="text.secondary">-</Typography>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
                {latestRegistrations.length === 0 && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                    No registrations found with current filters
                  </Typography>
                </Box>
              )}
              </CardContent>
            </GlassCard>
          </Box>
        </TabPanel>


        <TabPanel value={tabValue} index={2}>
          <Box>
            {/* Header with Gradient */}
            <Box sx={{ 
              mb: 4,
              background: 'linear-gradient(135deg, #4CAF50 0%, #2196F3 100%)',
              borderRadius: 3,
              p: 3,
              color: 'white'
            }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <PaymentIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" fontWeight={800}>
                    Payment Analytics
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Financial overview and payment tracking
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={4} md={2}>
                <GlassCard>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={800} color="primary">
                      ${(totalPayments / 100).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Total Payments
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <GlassCard>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={800} color="success.main">
                      ${(totalPaid / 100).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Total Collected
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <GlassCard>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={800} color="warning.main">
                      ${(totalPending / 100).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Pending Amount
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <GlassCard>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={800} color="info.main">
                      ${(lunchAnalytics.totalRevenue / 100).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Lunch Revenue
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <GlassCard>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={800} color="secondary.main">
                      ${((saturdayAnalytics.summary?.totalZelle ?? 0) / 100).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Total Zelle
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
              <Grid item xs={12} sm={4} md={2}>
                <GlassCard>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={800} color="error.main">
                      ${((saturdayAnalytics.summary?.totalCash ?? 0) / 100).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Total Cash
                    </Typography>
                  </CardContent>
                </GlassCard>
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

            <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
            <Typography variant="body2" color="error">DEBUG: Total Revenue Raw: {dailyStats.overall.totalRevenue}</Typography>
          </Stack>

            {/* Charts Row */}
            {processedPaymentData.length > 0 ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, height: 400 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PaymentIcon /> Payments by Academy
                    </Typography>
                    <Box sx={{ width: '100%', height: '90%', minHeight: 0, minWidth: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentChartData.academies}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <RechartsTooltip formatter={(value) => [`$${value}`, 'Amount']} />
                          <Bar dataKey="value" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3, height: 400 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssessmentIcon /> Payment Status Distribution
                    </Typography>
                    <Box sx={{ width: '100%', height: '90%', minHeight: 0, minWidth: 0 }}>
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
                    </Box>
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
                        <TableCell>${(payment.amount / 100).toFixed(2)}</TableCell>
                        <TableCell>${(payment.paidAmount / 100).toFixed(2)}</TableCell>
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
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Box>
            {/* Header with Gradient */}
            <Box sx={{ 
              mb: 4,
              background: 'linear-gradient(135deg, #FF6F00 0%, #D84315 100%)',
              borderRadius: 3,
              p: 3,
              color: 'white'
            }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={2}>
                  <RestaurantIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" fontWeight={800}>
                      Lunch Analytics
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Meal program statistics and revenue
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  startIcon={<DownloadIcon />}
                  variant="contained"
                  onClick={generatePaymentReport}
                  sx={{
                    bgcolor: 'white',
                    color: '#FF6F00',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.9)'
                    }
                  }}
                >
                  Export Report
                </Button>
              </Stack>
            </Box>

            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <GlassCard>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={800} color="success.main">
                      ${lunchAnalytics.totalRevenue.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Total Lunch Revenue
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <GlassCard>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={800} color="primary">
                      {lunchAnalytics.totalLunches}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Total Lunches
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <GlassCard>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={800} color="secondary.main">
                      {lunchAnalytics.semesterCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Semester Lunches
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <GlassCard>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" fontWeight={800} color="warning.main">
                      {lunchAnalytics.singleCount}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      Single Lunches
                    </Typography>
                  </CardContent>
                </GlassCard>
              </Grid>
            </Grid>

            {/* Lunch Chart */}
            <GlassCard sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <RestaurantIcon color="primary" />
                  Lunch Distribution
                </Typography>
              <Box sx={{ height: 300, minHeight: 0, minWidth: 0 }}>
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
              </CardContent>
            </GlassCard>

            {/* Lunch Details Table */}
            <GlassCard>
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
            </GlassCard>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Box>
            {/* Header with Gradient */}
            <Box sx={{ 
              mb: 4,
              background: 'linear-gradient(135deg, #3F51B5 0%, #1976D2 100%)',
              borderRadius: 3,
              p: 3,
              color: 'white'
            }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={2}>
                  <CheckCircleIcon sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" fontWeight={800}>
                      Attendance Tracking
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Student attendance records and monitoring
                    </Typography>
                  </Box>
                </Stack>
                <Button
                  startIcon={<DownloadIcon />}
                  variant="contained"
                  onClick={generateAttendanceReport}
                  sx={{
                    bgcolor: 'white',
                    color: '#3F51B5',
                    fontWeight: 600,
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.9)'
                    }
                  }}
                >
                  Export Report
                </Button>
              </Stack>
            </Box>

            <GlassCard>
              <CardContent>
                <Box sx={{ height: 600 }}>
                  <DataGrid
                    rows={filteredAttendance}
                    columns={[
                      { field: 'studentName', headerName: 'Student Name', minWidth: 150, flex: 1 },
                      { field: 'academy', headerName: 'Academy', minWidth: 150, flex: 1 },
                      { field: 'level', headerName: 'Level', width: 120 },
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
              </CardContent>
            </GlassCard>
          </Box>
        </TabPanel>
      </CardContent>
    </Card>
  )
}