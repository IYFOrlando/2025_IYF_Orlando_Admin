import * as React from 'react'
import {
  Card, CardHeader, CardContent, Grid, Stack, Button, Chip,
  TextField, Autocomplete, Divider, Typography, MenuItem, Alert,
  List, ListItem, ListItemText, ListItemButton, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Tabs, Tab,
  Checkbox, FormControlLabel
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'


import {
  collection, addDoc, serverTimestamp, query, where, onSnapshot, doc,
  updateDoc, runTransaction, deleteDoc
} from 'firebase/firestore'
import Swal from 'sweetalert2'

import { db } from '../../../lib/firebase'
import { useRegistrations } from '../../registrations/hooks/useRegistrations'
import type { Registration } from '../../registrations/types'
import { usePricingSettings } from '../../pricing/hooks/usePricingSettings'
import { useInvoices } from '../hooks/useInvoices'
import { usePayments } from '../hooks/usePayments'
import { useInstructors } from '../hooks/useInstructors'
import InvoiceDialog from '../components/InvoiceDialog'
import type { PricingDoc, InvoiceLine, Invoice, Payment } from '../types'
import { isKoreanLanguage, mapKoreanLevel, norm, usd } from '../../../lib/query'
import { notifySuccess, notifyError } from '../../../lib/alerts'
import { logger } from '../../../lib/logger'
import { getDiscountByCode, ACADEMY_DEFAULT_PRICES, isKoreanCookingAcademy, isKoreanLanguageAcademy, PERIOD_1_ACADEMIES, PERIOD_2_ACADEMIES } from '../../../lib/constants'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import {
  DataGrid, GridToolbar, type GridColDef
} from '@mui/x-data-grid'

const INV = 'academy_invoices'
const PAY = 'academy_payments'

/* ---------- helpers ---------- */
function priceFor(academy?: string, _level?: string | null, _period?: 1 | 2, pricing?: PricingDoc) {
  if (!academy) return 0
  const a = norm(academy)
  
  // Try to get price from database first
  if (pricing?.academyPrices?.[a] && pricing.academyPrices[a] > 0) {
    return Number(pricing.academyPrices[a])
  }
  
  // Use constants for default pricing
  if (isKoreanCookingAcademy(a)) {
    return ACADEMY_DEFAULT_PRICES['Korean Cooking']
  }
  
  if (isKoreanLanguageAcademy(a)) {
    return ACADEMY_DEFAULT_PRICES['Korean Language']
  }
  
  // Check for specific academy prices
  const academyKey = a as keyof typeof ACADEMY_DEFAULT_PRICES
  if (ACADEMY_DEFAULT_PRICES[academyKey]) {
    return ACADEMY_DEFAULT_PRICES[academyKey]
  }
  
  // Default pricing for any other academies
  return ACADEMY_DEFAULT_PRICES.default
}

type StudentOption = { id: string; label: string; reg: Registration }

function hasOpenTuitionInvoice(invs: Invoice[]) {
  return invs.some(inv => inv.status !== 'paid' && inv.lines.some(l => !!l.academy))
}

function tuitionFullyPaidForSelected(reg: Registration, invs: Invoice[]) {
  const needs: Array<{ academy: string; period: 1|2 }> = []
  const a1 = norm(reg.firstPeriod?.academy)
  const a2 = norm(reg.secondPeriod?.academy)
  if (a1 && a1.toLowerCase() !== 'n/a') needs.push({ academy: a1, period: 1 })
  if (a2 && a2.toLowerCase() !== 'n/a') needs.push({ academy: a2, period: 2 })
  if (!needs.length) return true
  const covered = new Set<string>()
  for (const inv of invs) {
    if (inv.status !== 'paid') continue
    for (const l of inv.lines) covered.add(`${norm(l.academy)}|${l.period}`)
  }
  return needs.every(n => covered.has(`${n.academy}|${n.period}`))
}



/* ---------- page ---------- */
const PaymentsPage = React.memo(() => {
  const { data: regs } = useRegistrations()
  const { data: pricing, savePricing } = usePricingSettings()
  const { data: allInvoices } = useInvoices()
  const { data: allPayments } = usePayments()
  const { getInstructorByAcademy } = useInstructors()


  const [student, setStudent] = React.useState<StudentOption | null>(null)
  const [studentInvoices, setStudentInvoices] = React.useState<Invoice[]>([])
  const [studentPayments, setStudentPayments] = React.useState<Payment[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string | null>(null)

  // composer
  const [lines, setLines] = React.useState<InvoiceLine[]>([])
  const [lunchSemester, setLunchSemester] = React.useState<boolean>(false)
  const [lunchSingleQty, setLunchSingleQty] = React.useState<number>(0)
  
  // Filter by academy option
  const [filterByAcademy, setFilterByAcademy] = React.useState<string>('')
  const [filterByPeriod, setFilterByPeriod] = React.useState<1 | 2 | 'all'>('all')
  
  // Invoice line editing
  const [invoiceDialogOpen, setInvoiceDialogOpen] = React.useState(false)
  const [editingLine, setEditingLine] = React.useState<InvoiceLine | null>(null)
  const [editingLineIndex, setEditingLineIndex] = React.useState<number>(-1)
  // Removed discountAmount state - only using discount codes now
  const [discountNote, setDiscountNote] = React.useState<string>('')
  const [discountCode, setDiscountCode] = React.useState<string>('')
  const [appliedDiscount, setAppliedDiscount] = React.useState<any>(null)

  // payment
  const [method, setMethod] = React.useState<'cash'|'zelle'|'none'>('none')
  const [payAmount, setPayAmount] = React.useState<number>(0)
  const [applyToAllInvoices, setApplyToAllInvoices] = React.useState<boolean>(false)

  // pricing dialog (compact admin)
  const [openPricing, setOpenPricing] = React.useState(false)
  const [editMap, setEditMap] = React.useState<Record<string, number>>({})
  const [editLunchSem, setEditLunchSem] = React.useState<number>(Number(pricing.lunch?.semester || 0))
  const [editLunchSingle, setEditLunchSingle] = React.useState<number>(Number(pricing.lunch?.single || 0))
  const [newAcademy, setNewAcademy] = React.useState('')
  const [newPrice, setNewPrice] = React.useState<number>(0)

  // edit payment dialog
  const [editPaymentOpen, setEditPaymentOpen] = React.useState(false)
  const [editPayment, setEditPayment] = React.useState<Payment | null>(null)
  const [editPaymentMethod, setEditPaymentMethod] = React.useState<'cash'|'zelle'>('cash')
  const [editPaymentAmount, setEditPaymentAmount] = React.useState<number>(0)
  
  // Alias for compatibility with existing code
  const setEditAmount = setEditPaymentAmount
  const setEditMethod = setEditPaymentMethod
  const setOpenEditPay = setEditPaymentOpen
  const editAmount = editPaymentAmount
  const editMethod = editPaymentMethod

  // tabs
  const [activeTab, setActiveTab] = React.useState(0)



  // payment records
  const [selectedPaymentRecord, setSelectedPaymentRecord] = React.useState<any>(null)
  const [paymentDetailsOpen, setPaymentDetailsOpen] = React.useState(false)

  React.useEffect(() => {
    setEditMap(pricing.academyPrices || {})
    setEditLunchSem(Number(pricing.lunch?.semester || 0))
    setEditLunchSingle(Number(pricing.lunch?.single || 0))
  }, [pricing.academyPrices, pricing.lunch?.semester, pricing.lunch?.single])

  const options = React.useMemo<StudentOption[]>(() =>
    regs.map(r => ({ id: r.id, label: `${r.firstName || ''} ${r.lastName || ''}`.trim(), reg: r }))
      .sort((a,b)=>a.label.localeCompare(b.label))
  , [regs])

  // Memoize selectedInvoiceId check to avoid unnecessary listener recreation
  const selectedInvoiceIdRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    selectedInvoiceIdRef.current = selectedInvoiceId
  }, [selectedInvoiceId])

  React.useEffect(() => {
    if (!student) { 
      setStudentInvoices([])
      setStudentPayments([])
      setSelectedInvoiceId(null)
      return 
    }
    
    const qi = query(collection(db, INV), where('studentId', '==', student.id))
    const qp = query(collection(db, PAY), where('studentId', '==', student.id))
    
    const ui = onSnapshot(qi, (snap) => {
      const invs = snap.docs.map(d => {
        const data = d.data() as Invoice
        return { 
          ...data,
          id: d.id
        } as Invoice
      })
        .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setStudentInvoices(invs)
      // Only set first invoice if no invoice is currently selected
      if (!selectedInvoiceIdRef.current && invs.length) {
        setSelectedInvoiceId(invs[0].id)
      }
    }, (err) => {
      logger.error('Error loading student invoices', err)
    })
    
    const up = onSnapshot(qp, (snap) => {
      const pays = snap.docs.map(d => {
        const data = d.data() as Payment
        return { 
          ...data,
          id: d.id
        } as Payment
      })
        .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setStudentPayments(pays)
    }, (err) => {
      logger.error('Error loading student payments', err)
    })
    
    return () => { 
      ui()
      up()
    }
  }, [student?.id]) // Only depend on student.id to prevent listener recreation





  React.useEffect(() => {
    if (!student?.reg) { setLines([]); return }
    const r = student.reg
    const p1Paid = tuitionFullyPaidForSelected({ ...r, secondPeriod: undefined }, studentInvoices)
    const p2Paid = tuitionFullyPaidForSelected({ ...r, firstPeriod: undefined }, studentInvoices)

    const L: InvoiceLine[] = []
    const a1 = norm(r.firstPeriod?.academy)
    // Check if academy filter is applied
    const shouldIncludeP1 = a1 && a1.toLowerCase() !== 'n/a' && !p1Paid && 
      (!filterByAcademy || filterByAcademy === a1) &&
      (filterByPeriod === 'all' || filterByPeriod === 1)
    
    if (shouldIncludeP1) {
      const unit = priceFor(a1, r.firstPeriod?.level || null, 1, pricing)
      // Use normalized academy name for instructor lookup
      const normalizedAcademy = norm(a1)
      // Convert 'N/A' or empty strings to null for instructor lookup
      const levelForLookup = r.firstPeriod?.level && r.firstPeriod.level !== 'N/A' && r.firstPeriod.level.trim() !== '' 
        ? r.firstPeriod.level 
        : null
      const instructor = getInstructorByAcademy(normalizedAcademy, levelForLookup)
      
      // Debug logging for ALL academies when instructor is found
      if (instructor) {
        logger.debug('Instructor found for academy', {
          academy: normalizedAcademy,
          originalAcademy: a1,
          levelForLookup: levelForLookup,
          instructorName: instructor.name,
          instructorAcademy: instructor.academy,
          instructorLevel: instructor.level,
          instructorId: instructor.id,
          hasCredentials: !!instructor.credentials,
          credentials: instructor.credentials || '(empty)'
        })
      } else {
        // Log when instructor is NOT found, especially for Korean Language
        if (normalizedAcademy.toLowerCase().includes('korean') && normalizedAcademy.toLowerCase().includes('language')) {
          logger.debug('Korean Language instructor NOT found', {
            academy: normalizedAcademy,
            originalAcademy: a1,
            levelForLookup: levelForLookup
          })
        }
      }
      
      // Split instructor name into first and last name
      let instructorFirstName = ''
      let instructorLastName = ''
      if (instructor?.name) {
        const nameParts = instructor.name.trim().split(' ')
        instructorFirstName = nameParts[0] || ''
        instructorLastName = nameParts.slice(1).join(' ') || ''
      }
      
      // Include instructor if found (for ALL academies)
      // For Korean Language, set credentials to "volunteer teacher" if not already set
      let instructorCredentials = instructor?.credentials || ''
      if (isKoreanLanguage(a1) && !instructorCredentials) {
        instructorCredentials = 'volunteer teacher'
      }
      
      // Calculate instruction dates and hours for ALL academies (1 hour each Saturday)
      // Instruction period: August 16 - November 22, 2025
      const startDate = '2025-08-16'
      const endDate = '2025-11-22'
      
      // Calculate number of Saturdays between start and end date
      const start = new Date(startDate)
      const end = new Date(endDate)
      let saturdays = 0
      const current = new Date(start)
      
      // Find first Saturday
      while (current.getDay() !== 6 && current <= end) {
        current.setDate(current.getDate() + 1)
      }
      
      // Count all Saturdays
      while (current <= end) {
        saturdays++
        current.setDate(current.getDate() + 7) // Next Saturday
      }
      
      const instructionDates: InvoiceLine['instructionDates'] = {
        startDate,
        endDate,
        totalHours: saturdays, // 1 hour per Saturday
        schedule: 'Saturdays, 1 hour per class'
      }
      
      // Create the line object
      const lineToAdd: InvoiceLine = {
        academy: a1,
        period: 1,
        level: isKoreanLanguage(a1) ? mapKoreanLevel(r.firstPeriod?.level) : null,
        unitPrice: unit, 
        qty: 1, 
        amount: unit,
        instructor: instructor ? {
          firstName: instructorFirstName || '',
          lastName: instructorLastName || '',
          email: instructor.email || '',
          phone: instructor.phone || '',
          credentials: instructorCredentials
        } : (isKoreanLanguage(a1) ? {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          credentials: 'volunteer teacher'
        } : undefined),
        instructionDates
      }
      
      // Debug: Log what we're about to add
      if (normalizedAcademy.toLowerCase().includes('korean') && normalizedAcademy.toLowerCase().includes('cooking')) {
        logger.debug('Korean Cooking line being added (Period 1)', {
          academy: a1,
          hasInstructor: !!lineToAdd.instructor,
          instructor: lineToAdd.instructor ? {
            firstName: lineToAdd.instructor.firstName,
            lastName: lineToAdd.instructor.lastName,
            email: lineToAdd.instructor.email,
            credentials: lineToAdd.instructor.credentials
          } : null
        })
      }
      
      L.push(lineToAdd)
    }
    const a2 = norm(r.secondPeriod?.academy)
    // Check if academy filter is applied
    const shouldIncludeP2 = a2 && a2.toLowerCase() !== 'n/a' && !p2Paid && 
      (!filterByAcademy || filterByAcademy === a2) &&
      (filterByPeriod === 'all' || filterByPeriod === 2)
    
    if (shouldIncludeP2) {
      const unit = priceFor(a2, r.secondPeriod?.level || null, 2, pricing)
      // Use normalized academy name for instructor lookup
      const normalizedAcademy = norm(a2)
      // Convert 'N/A' or empty strings to null for instructor lookup
      const levelForLookup = r.secondPeriod?.level && r.secondPeriod.level !== 'N/A' && r.secondPeriod.level.trim() !== '' 
        ? r.secondPeriod.level 
        : null
      const instructor = getInstructorByAcademy(normalizedAcademy, levelForLookup)
      
      // Debug logging for Korean Cooking - ALWAYS log, even if not found
      if (normalizedAcademy.toLowerCase().includes('korean') && normalizedAcademy.toLowerCase().includes('cooking')) {
        logger.debug('Korean Cooking instructor lookup (Period 2)', {
          academy: normalizedAcademy,
          originalAcademy: a2,
          levelForLookup: levelForLookup,
          found: !!instructor,
          instructorName: instructor?.name,
          instructorAcademy: instructor?.academy,
          instructorLevel: instructor?.level,
          instructorId: instructor?.id
        })
      }
      
      // Split instructor name into first and last name
      let instructorFirstName = ''
      let instructorLastName = ''
      if (instructor?.name) {
        const nameParts = instructor.name.trim().split(' ')
        instructorFirstName = nameParts[0] || ''
        instructorLastName = nameParts.slice(1).join(' ') || ''
      }
      
      // Include instructor if found (for ALL academies)
      // For Korean Language, set credentials to "volunteer teacher" if not already set
      let instructorCredentials = instructor?.credentials || ''
      if (isKoreanLanguage(a2) && !instructorCredentials) {
        instructorCredentials = 'volunteer teacher'
      }
      
      // Calculate instruction dates and hours for ALL academies (1 hour each Saturday)
      // Instruction period: August 16 - November 22, 2025
      const startDate = '2025-08-16'
      const endDate = '2025-11-22'
      
      // Calculate number of Saturdays between start and end date
      const start = new Date(startDate)
      const end = new Date(endDate)
      let saturdays = 0
      const current = new Date(start)
      
      // Find first Saturday
      while (current.getDay() !== 6 && current <= end) {
        current.setDate(current.getDate() + 1)
      }
      
      // Count all Saturdays
      while (current <= end) {
        saturdays++
        current.setDate(current.getDate() + 7) // Next Saturday
      }
      
      const instructionDates: InvoiceLine['instructionDates'] = {
        startDate,
        endDate,
        totalHours: saturdays, // 1 hour per Saturday
        schedule: 'Saturdays, 1 hour per class'
      }
      
      // Create the line object
      const lineToAdd: InvoiceLine = {
        academy: a2,
        period: 2,
        level: isKoreanLanguage(a2) ? mapKoreanLevel(r.secondPeriod?.level) : null,
        unitPrice: unit, 
        qty: 1, 
        amount: unit,
        instructor: instructor ? {
          firstName: instructorFirstName || '',
          lastName: instructorLastName || '',
          email: instructor.email || '',
          phone: instructor.phone || '',
          credentials: instructorCredentials
        } : (isKoreanLanguage(a2) ? {
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          credentials: 'volunteer teacher'
        } : undefined),
        instructionDates
      }
      
      // Debug: Log what we're about to add
      if (normalizedAcademy.toLowerCase().includes('korean') && normalizedAcademy.toLowerCase().includes('cooking')) {
        logger.debug('Korean Cooking line being added (Period 2)', {
          academy: a2,
          hasInstructor: !!lineToAdd.instructor,
          instructor: lineToAdd.instructor ? {
            firstName: lineToAdd.instructor.firstName,
            lastName: lineToAdd.instructor.lastName,
            email: lineToAdd.instructor.email,
            credentials: lineToAdd.instructor.credentials
          } : null
        })
      }
      
      L.push(lineToAdd)
    }
    setLines(L)
    setLunchSemester(false); setLunchSingleQty(0); setDiscountNote('')
  }, [student?.id, pricing, studentInvoices, getInstructorByAcademy, filterByAcademy, filterByPeriod])

  // Process discount code
  const handleDiscountCodeChange = React.useCallback((code: string) => {
    setDiscountCode(code.toUpperCase())
    const discount = getDiscountByCode(code.toUpperCase())
    
    if (discount) {
      setAppliedDiscount(discount)
      setDiscountNote(discount.description)
      notifySuccess(`Discount code applied: ${discount.name}`)
    } else {
      setAppliedDiscount(null)
      setDiscountNote('')
    }
  }, [])

  // Calculate totals with discount
  const subtotal = React.useMemo(() => {
    return lines.reduce((sum, line) => sum + line.amount, 0)
  }, [lines])

  // Calculate discount amount based on applied discount (only applies to academies, not lunch)
  const discountAmount = React.useMemo(() => {
    if (!appliedDiscount) return 0
    if (appliedDiscount.type === 'percentage') {
      return (subtotal * appliedDiscount.discount) / 100
    } else {
      // For fixed discounts, only apply to academies (subtotal), not lunch
      return Math.min(appliedDiscount.discount, subtotal)
    }
  }, [appliedDiscount, subtotal])

  const lunchAmount = React.useMemo(() => {
    let amount = 0
    if (lunchSemester) {
      amount += Number(pricing.lunch?.semester || 0)
    }
    if (lunchSingleQty > 0) {
      amount += Number(pricing.lunch?.single || 0) * lunchSingleQty
    }
    return amount
  }, [lunchSemester, lunchSingleQty, pricing.lunch])

  const total = React.useMemo(() => {
    // Discount only applies to academies, lunch is always paid separately
    const discountedSubtotal = Math.max(0, subtotal - discountAmount)
    return discountedSubtotal + lunchAmount
  }, [subtotal, discountAmount, lunchAmount])



  // Payment records processing
  const paymentRecords = React.useMemo(() => {
    if (!regs || !allInvoices || !allPayments) return []
    
    const records: any[] = []
    const paymentDataMap = new Map<string, {
      totalFee: number
      paidAmount: number
      balance: number
      lastPaymentDate: any
      lastPaymentMethod: string
    }>()
    
    // Aggregate payment data
    allPayments.forEach(payment => {
      const existing = paymentDataMap.get(payment.studentId) || {
        totalFee: 0,
        paidAmount: 0,
        balance: 0,
        lastPaymentDate: null,
        lastPaymentMethod: ''
      }
      
      existing.paidAmount += payment.amount
      if (!existing.lastPaymentDate || payment.createdAt > existing.lastPaymentDate) {
        existing.lastPaymentDate = payment.createdAt
        existing.lastPaymentMethod = payment.method
      }
      
      paymentDataMap.set(payment.studentId, existing)
    })
    
    // Calculate totals from invoices
    allInvoices.forEach(invoice => {
      const student = regs.find(r => r.id === invoice.studentId)
      if (!student) return
      
      const totalFee = invoice.lines.reduce((sum, line) => sum + line.amount, 0)
      const existing = paymentDataMap.get(invoice.studentId) || {
        totalFee: 0,
        paidAmount: 0,
        balance: 0,
        lastPaymentDate: null,
        lastPaymentMethod: ''
      }
      
      existing.totalFee += totalFee
      existing.balance = existing.totalFee - existing.paidAmount
      
      paymentDataMap.set(invoice.studentId, existing)
    })
    
    // Create records for students who have made payments
    regs.forEach(reg => {
      const paymentData = paymentDataMap.get(reg.id)
      if (paymentData && paymentData.paidAmount > 0) {
        records.push({
          id: reg.id,
          firstName: reg.firstName,
          lastName: reg.lastName,
          email: reg.email,
          cellNumber: reg.cellNumber,
          totalFee: paymentData.totalFee,
          paidAmount: paymentData.paidAmount,
          balance: paymentData.balance,
          lastPaymentDate: paymentData.lastPaymentDate,
          lastPaymentMethod: paymentData.lastPaymentMethod
        })
      }
    })
    
    return records.sort((a, b) => b.lastPaymentDate?.toDate?.() - a.lastPaymentDate?.toDate?.())
  }, [regs, allInvoices, allPayments])

  /* ---------- pricing save ---------- */
  async function savePricingNow() {
    const next: PricingDoc = {
      academyPrices: Object.fromEntries(
        Object.entries(editMap)
          .filter(([k]) => k && k.trim().length > 0)
          .map(([k, v]) => [k.trim(), Number(v || 0)])
      ),
      items: [],
      lunch: { semester: Number(editLunchSem || 0), single: Number(editLunchSingle || 0) },
    }
    await savePricing(next)
    setOpenPricing(false)
    notifySuccess('Pricing updated')
  }




  /* ---------- invoice create ---------- */
  const createInvoice = async (mode: 'normal' | 'lunchOnly' = 'normal') => {
    if (!student) return Swal.fire({ title: 'Select a student first', icon: 'info' })
    if (mode === 'normal' && openTuition && composerHasTuition) {
      return Swal.fire({ title: 'Open tuition invoice exists', text: 'Apply payments or create lunch-only.', icon: 'warning' })
    }
    if (tuitionFullyPaid && composerHasTuition) {
      return Swal.fire({ title: 'Tuition fully paid', text: 'Create lunch-only invoice if needed.', icon: 'info' })
    }

    const effectiveLines = mode === 'lunchOnly' ? [] : lines
    const effectiveSubtotal = effectiveLines.reduce((s, l) => s + Number(l.amount || 0), 0)
    const effectiveLunchAmount = lunchAmount
    // Discount only applies to academies (subtotal), not lunch
    const effectiveDiscount = Math.min(discountAmount || 0, effectiveSubtotal)
    const effectiveTotal = Math.max(effectiveSubtotal - effectiveDiscount, 0) + effectiveLunchAmount

    if (effectiveLines.length === 0 && lunchAmount <= 0) {
      return Swal.fire({ title: 'Nothing to invoice', icon: 'warning' })
    }

    const ref = await addDoc(collection(db, INV), {
      studentId: student.id,
      studentName: student.label,
      lines: effectiveLines,
      subtotal: effectiveSubtotal,
      lunch: { semesterSelected: lunchSemester, singleQty: lunchSingleQty, prices: { semester: lunchUnitSemester, single: lunchUnitSingle } },
      lunchAmount: effectiveLunchAmount,
      discountAmount: effectiveDiscount,
      discountNote: discountNote || null,
      total: effectiveTotal,
      paid: 0,
      balance: effectiveTotal,
      status: 'unpaid',
      method: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as any)

    setSelectedInvoiceId(ref.id)
    
    // If the invoice has 100% discount on academies and no lunch, automatically mark it as exonerated
    const academiesTotal = Math.max(effectiveSubtotal - effectiveDiscount, 0)
    if (academiesTotal === 0 && effectiveLunchAmount === 0 && effectiveDiscount > 0) {
      await updateDoc(doc(db, INV, ref.id), { 
        paid: 0, 
        balance: 0, 
        status: 'exonerated', 
        method: 'discount',
        updatedAt: serverTimestamp() 
      } as any)
      
      // Add a payment record for the discount
      await addDoc(collection(db, PAY), {
        invoiceId: ref.id,
        studentId: student.id,
        amount: 0,
        method: 'discount',
        createdAt: serverTimestamp(),
      } as any)
      
      notifySuccess('Invoice created and marked as exonerated', `100% discount applied - Total: ${usd(effectiveTotal)}`)
    } else {
      notifySuccess('Invoice created', `Total: ${usd(effectiveTotal)}`)
    }
  }

  /* ---------- helper: remove undefined values for Firestore ---------- */
  const cleanForFirestore = (obj: any): any => {
    if (obj === null) {
      return null
    }
    if (obj === undefined) {
      return null // Convert undefined to null for Firestore
    }
    if (Array.isArray(obj)) {
      return obj.map(item => cleanForFirestore(item))
    }
    if (typeof obj === 'object' && obj !== null) {
      const cleaned: any = {}
      for (const [key, value] of Object.entries(obj)) {
        // Only include the key if value is not undefined
        if (value !== undefined) {
          const cleanedValue = cleanForFirestore(value)
          // Only add if cleaned value is not undefined
          if (cleanedValue !== undefined) {
            cleaned[key] = cleanedValue
          }
        }
      }
      return cleaned
    }
    return obj
  }

  /* ---------- create invoices by academy (separate invoices) ---------- */
  const createInvoicesByAcademy = async () => {
    if (!student) {
      return notifyError('Select a student first')
    }

    if (lines.length === 0 && lunchAmount <= 0) {
      return notifyError('Nothing to invoice', 'No academies or lunch items to invoice')
    }

    try {
      // Group lines by academy and clean InvoiceLine data
      const linesByAcademy = new Map<string, InvoiceLine[]>()
      
      lines.forEach(line => {
        const key = line.academy
        if (!linesByAcademy.has(key)) {
          linesByAcademy.set(key, [])
        }
        
        // Clean the line to remove undefined values
        const cleanedLine: any = {
          academy: line.academy,
          period: line.period,
          unitPrice: line.unitPrice,
          qty: line.qty,
          amount: line.amount,
        }
        
        // Only add optional fields if they have values
        if (line.level !== null && line.level !== undefined) {
          cleanedLine.level = line.level
        } else {
          cleanedLine.level = null
        }
        
        if (line.instructor) {
          // Always preserve instructor data, even if firstName/lastName are empty strings
          cleanedLine.instructor = {
            firstName: line.instructor.firstName || '',
            lastName: line.instructor.lastName || '',
          }
          // Always include email, phone, and credentials (even if empty strings)
          cleanedLine.instructor.email = line.instructor.email || ''
          cleanedLine.instructor.phone = line.instructor.phone || ''
          cleanedLine.instructor.credentials = line.instructor.credentials || ''
          
          // Debug logging for ALL academies with instructor
          logger.debug('Instructor being saved to invoice', {
            academy: line.academy,
            hasCredentials: !!cleanedLine.instructor.credentials,
            credentials: cleanedLine.instructor.credentials || '(empty)',
            instructor: {
              firstName: cleanedLine.instructor.firstName,
              lastName: cleanedLine.instructor.lastName,
              email: cleanedLine.instructor.email,
              phone: cleanedLine.instructor.phone
            }
          })
        }
        
        if (line.instructionDates) {
          cleanedLine.instructionDates = {
            startDate: line.instructionDates.startDate,
            endDate: line.instructionDates.endDate,
            totalHours: line.instructionDates.totalHours,
          }
          if (line.instructionDates.schedule) {
            cleanedLine.instructionDates.schedule = line.instructionDates.schedule
          }
        }
        
        if (line.serviceRate !== undefined && line.serviceRate !== null) {
          cleanedLine.serviceRate = line.serviceRate
        }
        
        linesByAcademy.get(key)!.push(cleanedLine)
      })

      if (linesByAcademy.size === 0) {
        return notifyError('No academies to invoice', 'Please add academy items first')
      }

      // Create separate invoice for each academy
      const createdInvoices: string[] = []
      
      for (const [academy, academyLines] of linesByAcademy.entries()) {
        const academySubtotal = academyLines.reduce((s, l) => s + Number(l.amount || 0), 0)
        const academyDiscount = Math.min(discountAmount || 0, academySubtotal)
        const academyTotal = Math.max(academySubtotal - academyDiscount, 0)

        if (academyTotal <= 0 && lunchAmount <= 0) {
          continue // Skip if no amount to invoice
        }

        // Calculate discount proportionally for this academy
        const totalSubtotal = lines.reduce((s, l) => s + Number(l.amount || 0), 0)
        const proportionalDiscount = totalSubtotal > 0 
          ? (academySubtotal / totalSubtotal) * discountAmount 
          : 0
        const finalDiscount = Math.min(proportionalDiscount, academySubtotal)
        const splitLunchAmount = lunchAmount / linesByAcademy.size
        const finalTotal = Math.max(academySubtotal - finalDiscount, 0) + splitLunchAmount

        // Clean lunch prices to avoid undefined
        const lunchPrices: { semester?: number; single?: number } = {}
        if (lunchUnitSemester !== undefined && lunchUnitSemester !== null) {
          lunchPrices.semester = lunchUnitSemester
        }
        if (lunchUnitSingle !== undefined && lunchUnitSingle !== null) {
          lunchPrices.single = lunchUnitSingle
        }

        // Prepare invoice data - ensure no undefined values
        const invoiceData: any = {
          studentId: student.id,
          studentName: student.label,
          lines: academyLines,
          subtotal: academySubtotal,
          lunch: {
            semesterSelected: lunchSemester || false,
            singleQty: Math.floor(lunchSingleQty / linesByAcademy.size),
          },
          lunchAmount: splitLunchAmount,
          discountAmount: finalDiscount,
          total: finalTotal,
          paid: 0,
          balance: finalTotal,
          status: 'unpaid',
          method: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
        
        // Only add prices if they exist
        if (Object.keys(lunchPrices).length > 0) {
          invoiceData.lunch.prices = lunchPrices
        }
        
        // Only add discountNote if it exists
        if (discountNote && discountNote.trim().length > 0) {
          invoiceData.discountNote = `${discountNote} (${academy})`
        } else {
          invoiceData.discountNote = `Invoice for ${academy}`
        }

        // Clean undefined values before sending to Firestore
        const cleanedData = cleanForFirestore(invoiceData)

        const invoiceRef = await addDoc(collection(db, INV), cleanedData)

        createdInvoices.push(invoiceRef.id)

        // If 100% discount, mark as exonerated
        if (finalTotal === 0 && finalDiscount > 0) {
          await updateDoc(doc(db, INV, invoiceRef.id), { 
            paid: 0, 
            balance: 0, 
            status: 'exonerated', 
            method: 'discount',
            updatedAt: serverTimestamp() 
          } as any)
          
          await addDoc(collection(db, PAY), {
            invoiceId: invoiceRef.id,
            studentId: student.id,
            amount: 0,
            method: 'discount',
            createdAt: serverTimestamp(),
          } as any)
        }
      }

      if (createdInvoices.length > 0) {
        setSelectedInvoiceId(createdInvoices[0])
        notifySuccess(
          'Invoices created by academy', 
          `Created ${createdInvoices.length} separate invoice(s) for ${Array.from(linesByAcademy.keys()).join(', ')}`
        )
      }
    } catch (error) {
      logger.error('Error creating invoices by academy', error)
      notifyError(
        'Failed to create invoices by academy',
        error instanceof Error ? error.message : 'Unknown error occurred',
        { error }
      )
    }
  }

  /* ---------- payments: add / edit / delete ---------- */
  const recordPayment = async () => {
    if (!student) {
      return notifyError('Select a student first')
    }
    if (method === 'none') {
      return notifyError('Select a payment method', 'Please select Cash or Zelle')
    }
    if (!payAmount || payAmount <= 0) {
      return notifyError('Enter a valid amount', 'Payment amount must be greater than 0')
    }

    // If applying to all invoices, distribute the payment
    if (applyToAllInvoices && studentInvoices.length > 1) {
      return recordPaymentToAllInvoices()
    }

    // Otherwise, apply to selected invoice only
    if (!selectedInvoice) {
      return notifyError('Select an invoice first')
    }

    try {
      // Use the invoice total directly (it already accounts for discounts and lunch)
      const invoiceTotal = Number(selectedInvoice.total || 0)
      const currentPaid = Number(selectedInvoice.paid || 0)
      const remainingBalance = Math.max(0, invoiceTotal - currentPaid)
      
      // Validate payment amount
      if (Number(payAmount) > remainingBalance) {
        return notifyError('Payment amount too large', `Maximum payment is ${usd(remainingBalance)}`)
      }
      
      // Check if invoice is already fully paid
      if (remainingBalance === 0) {
        return notifyError('Invoice already paid', 'This invoice has no remaining balance')
      }

      // Create payment record
      await addDoc(collection(db, PAY), {
        invoiceId: selectedInvoice.id,
        studentId: student.id,
        amount: Number(payAmount),
        method,
        createdAt: serverTimestamp(),
      } as any)

      // Calculate new values
      const newPaid = currentPaid + Number(payAmount)
      const newBalance = Math.max(0, invoiceTotal - newPaid)
      
      // Determine status: preserve 'exonerated', otherwise calculate based on payment
      let newStatus: Invoice['status']
      if (selectedInvoice.status === 'exonerated') {
        newStatus = 'exonerated'
      } else if (newBalance === 0) {
        newStatus = 'paid'
      } else if (newPaid > 0) {
        newStatus = 'partial'
      } else {
        newStatus = 'unpaid'
      }

      // Update invoice with new payment information
      await updateDoc(doc(db, INV, selectedInvoice.id), { 
        paid: newPaid, 
        balance: newBalance, 
        status: newStatus, 
        method: method === 'cash' ? 'cash' : (method === 'zelle' ? 'zelle' : null),
        updatedAt: serverTimestamp() 
      } as any)

      notifySuccess('Payment recorded successfully', `Payment of ${usd(payAmount)} applied. Remaining balance: ${usd(newBalance)}`)
      
      // Reset form
      setPayAmount(0)
      setMethod('none')
    } catch (error) {
      logger.error('Error recording payment', error)
      notifyError(
        'Failed to record payment',
        error instanceof Error ? error.message : 'Unknown error occurred',
        { error, invoiceId: selectedInvoice.id }
      )
    }
  }

  // Distribute payment across all unpaid invoices proportionally
  const recordPaymentToAllInvoices = async () => {
    if (!student || studentInvoices.length === 0) {
      return notifyError('No invoices found')
    }

    try {
      // Get all unpaid invoices with their balances
      const unpaidInvoices = studentInvoices
        .map(inv => {
          const invoiceTotal = Number(inv.total || 0)
          const currentPaid = Number(inv.paid || 0)
          const balance = Math.max(0, invoiceTotal - currentPaid)
          return { ...inv, balance }
        })
        .filter(inv => inv.balance > 0 && inv.status !== 'exonerated')
        .sort((a, b) => b.balance - a.balance) // Sort by balance descending

      if (unpaidInvoices.length === 0) {
        return notifyError('All invoices are paid', 'There are no unpaid invoices to apply payment to')
      }

      const totalUnpaidBalance = unpaidInvoices.reduce((sum, inv) => sum + inv.balance, 0)
      
      // Validate payment amount
      if (Number(payAmount) > totalUnpaidBalance) {
        return notifyError('Payment amount too large', `Maximum payment across all invoices is ${usd(totalUnpaidBalance)}`)
      }

      // Distribute payment proportionally across invoices
      let remainingPayment = Number(payAmount)
      const paymentDistributions: Array<{ invoiceId: string; amount: number }> = []

      for (let i = 0; i < unpaidInvoices.length && remainingPayment > 0; i++) {
        const inv = unpaidInvoices[i]
        const invoiceBalance = inv.balance
        
        // Calculate proportional amount (or remaining if last invoice)
        let amountToApply: number
        if (i === unpaidInvoices.length - 1) {
          // Last invoice gets all remaining payment
          amountToApply = remainingPayment
        } else {
          // Proportional distribution based on balance
          const proportion = invoiceBalance / totalUnpaidBalance
          amountToApply = Math.min(remainingPayment, Number((Number(payAmount) * proportion).toFixed(2)))
        }

        if (amountToApply > 0 && amountToApply <= invoiceBalance) {
          paymentDistributions.push({ invoiceId: inv.id, amount: amountToApply })
          remainingPayment -= amountToApply
        }
      }

      // Apply payments to each invoice
      const paymentPromises = paymentDistributions.map(async ({ invoiceId, amount }) => {
        const inv = unpaidInvoices.find(i => i.id === invoiceId)!
        const invoiceTotal = Number(inv.total || 0)
        const currentPaid = Number(inv.paid || 0)
        
        // Create payment record
        await addDoc(collection(db, PAY), {
          invoiceId: inv.id,
          studentId: student.id,
          amount: amount,
          method,
          createdAt: serverTimestamp(),
        } as any)

        // Calculate new values
        const newPaid = currentPaid + amount
        const newBalance = Math.max(0, invoiceTotal - newPaid)
        
        // Determine status
        let newStatus: Invoice['status']
        if (inv.status === 'exonerated') {
          newStatus = 'exonerated'
        } else if (newBalance === 0) {
          newStatus = 'paid'
        } else if (newPaid > 0) {
          newStatus = 'partial'
        } else {
          newStatus = 'unpaid'
        }

        // Update invoice
        await updateDoc(doc(db, INV, inv.id), { 
          paid: newPaid, 
          balance: newBalance, 
          status: newStatus, 
          method: method === 'cash' ? 'cash' : (method === 'zelle' ? 'zelle' : null),
          updatedAt: serverTimestamp() 
        } as any)
      })

      await Promise.all(paymentPromises)

      const totalApplied = paymentDistributions.reduce((sum, p) => sum + p.amount, 0)
      const newTotalBalance = totalStudentBalance - totalApplied

      notifySuccess(
        'Payment distributed successfully', 
        `Payment of ${usd(totalApplied)} applied across ${paymentDistributions.length} invoice(s). Remaining total balance: ${usd(newTotalBalance)}`
      )
      
      // Reset form
      setPayAmount(0)
      setMethod('none')
      setApplyToAllInvoices(false)
    } catch (error) {
      logger.error('Error distributing payment across invoices', error)
      notifyError(
        'Failed to distribute payment',
        error instanceof Error ? error.message : 'Unknown error occurred',
        { error, studentId: student.id }
      )
    }
  }
  const payRemaining = () => { 
    if (selectedInvoice) {
      // Use invoice.total directly (it already accounts for discounts and lunch)
      const invoiceTotal = Number(selectedInvoice.total || 0)
      const currentPaid = Number(selectedInvoice.paid || 0)
      const remainingBalance = Math.max(0, invoiceTotal - currentPaid)
      setPayAmount(remainingBalance)
    }
  }

  const deletePaymentWithoutConfirmation = async (p: Payment) => {
    try {
      await runTransaction(db, async (tx) => {
        const invRef = doc(db, INV, p.invoiceId)
        const payRef = doc(db, PAY, p.id)
        
        // Check if payment still exists
        const paySnap = await tx.get(payRef)
        if (!paySnap.exists()) {
          logger.warn('Payment no longer exists, skipping', { paymentId: p.id })
          return
        }
        
        const invSnap = await tx.get(invRef)
        if (!invSnap.exists()) {
          logger.warn('Invoice not found for payment, skipping', { invoiceId: p.invoiceId, paymentId: p.id })
          return
        }

        const inv = invSnap.data() as any
        const newPaid = Math.max(0, Number(inv.paid || 0) - Number(p.amount || 0))
        const balance = Math.max(Number(inv.total || 0) - newPaid, 0)
        // Preserve 'exonerated' status if it was already set, otherwise calculate normally
        const status: Invoice['status'] = inv.status === 'exonerated' ? 'exonerated' : 
          (newPaid <= 0 ? 'unpaid' : (balance > 0 ? 'partial' : 'paid'))

        tx.update(invRef, { paid: newPaid, balance, status, updatedAt: serverTimestamp() })
        tx.delete(payRef)
      })
    } catch (error) {
      logger.error('Failed to delete payment', { paymentId: p.id, error })
      throw error
    }
  }

  const deletePayment = async (p: Payment) => {
    const res = await Swal.fire({
      title: 'Delete this payment?', text: `${usd(p.amount)} (${p.method.toUpperCase()}) will be removed.`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete'
    })
    if (!res.isConfirmed) return

    await deletePaymentWithoutConfirmation(p)
    notifySuccess('Payment removed', `- ${usd(p.amount)}`)
    
    // Force UI update by removing from local state immediately
    setStudentPayments(prev => prev.filter(payment => payment.id !== p.id))
  }

  const openEditPaymentDialog = (p: Payment) => {
    setEditPayment(p)
    setEditAmount(Number(p.amount || 0))
    setEditMethod((p.method || 'cash') as any)
    setOpenEditPay(true)
  }
  const saveEditedPayment = async () => {
    if (!editPayment) return
    const p = editPayment
    const newAmt = Math.max(0, Number(editAmount || 0))
    const delta = newAmt - Number(p.amount || 0)

    await runTransaction(db, async (tx) => {
      const invRef = doc(db, INV, p.invoiceId)
      const payRef = doc(db, PAY, p.id)
      const invSnap = await tx.get(invRef)
      if (!invSnap.exists()) throw new Error('Invoice not found')

      const inv = invSnap.data() as any
      const newPaid = Math.max(0, Number(inv.paid || 0) + delta)
      const balance = Math.max(Number(inv.total || 0) - newPaid, 0)
      // Preserve 'exonerated' status if it was already set, otherwise calculate normally
      const status: Invoice['status'] = inv.status === 'exonerated' ? 'exonerated' : 
        (newPaid <= 0 ? 'unpaid' : (balance > 0 ? 'partial' : 'paid'))

      tx.update(invRef, { paid: newPaid, balance, status, updatedAt: serverTimestamp() })
      tx.update(payRef, { amount: newAmt, method: editMethod })
    })

    setOpenEditPay(false)
    setEditPayment(null)
    notifySuccess('Payment updated', `${usd(newAmt)} (${editMethod.toUpperCase()})`)
  }

  const deleteInvoice = async (inv: Invoice) => {
    if (Number(inv.paid || 0) > 0) {
      return Swal.fire({ title: 'Cannot delete', text: 'Invoice has payments. Remove payments first.', icon: 'info' })
    }
    const res = await Swal.fire({ title: 'Delete invoice?', text: `This will remove invoice ${inv.id}.`, icon: 'warning', showCancelButton: true })
    if (!res.isConfirmed) return
    await deleteDoc(doc(db, INV, inv.id))
    notifySuccess('Invoice deleted')
    if (selectedInvoiceId === inv.id) setSelectedInvoiceId(null)
  }

  /* ---------- invoice preview PDF (before creating invoice) ---------- */
  const generateInvoicePreview = () => {
    if (!student) return Swal.fire({ title: 'Select a student first', icon: 'info' })
    if (lines.length === 0 && lunchAmount <= 0) {
      return Swal.fire({ title: 'Nothing to invoice', icon: 'warning' })
    }

    // Create a temporary invoice object for preview
    const previewInvoice: Invoice = {
      id: 'PREVIEW-' + Date.now(),
      studentId: student.id,
      studentName: student.label,
      lines: lines,
      subtotal: subtotal,
      lunch: { semesterSelected: lunchSemester, singleQty: lunchSingleQty, prices: { semester: lunchUnitSemester, single: lunchUnitSingle } },
      lunchAmount: lunchAmount,
      discountAmount: discountAmount,
      discountNote: discountNote || null,
      total: total,
      paid: 0,
      balance: total,
      status: 'unpaid',
      method: null,
      createdAt: null,
      updatedAt: null
    }

    generateReceipt(previewInvoice)
  }

  /* ---------- receipt PDF ---------- */
  const generateReceipt = (inv: Invoice) => {
    const doc = new jsPDF({ unit:'pt', format:'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 40
    const now = new Date()
    const issueDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

      // Modern color scheme
      const primaryColor = [33, 112, 177] // Blue #2170b1 (logo color)
      const secondaryColor = [76, 175, 80] // Green
      const accentColor = [255, 152, 0] // Orange
      const textColor = [33, 33, 33] // Dark gray
      const lightGray = [245, 245, 245]
      const borderColor = [224, 224, 224]

      // Header with gradient-like effect
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
      doc.rect(0, 0, pageWidth, 120, 'F')
    
      // Logo without background
      try {
        const logoPath = '/IYF_logo.png'
        doc.addImage(logoPath, 'PNG', pageWidth - 90, 30, 60, 60)
      } catch {
        // If logo fails to load, show text instead
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica','bold')
        doc.setFontSize(16)
        doc.text('IYF', pageWidth - 60, 60, { align: 'center' })
      }

    // Invoice title with modern typography
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica','bold')
    doc.setFontSize(32)
    doc.text('INVOICE', margin, 50)
    
    doc.setFont('helvetica','normal')
    doc.setFontSize(14)
    doc.text('IYF Orlando Academy', margin, 75)
    
    doc.setFontSize(12)
    doc.text(`Invoice #${inv.id}`, margin, 95)

    // Invoice details card (adjust height if instructor has credentials)
    const hasInstructorWithCredentials = inv.lines.some(line => 
      line.instructor && line.instructor.credentials && line.instructor.credentials.trim().length > 0
    )
    const cardHeight = hasInstructorWithCredentials ? 180 : 150
    
    let yPos = 150
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
    doc.setLineWidth(1)
    doc.rect(margin, yPos, pageWidth - 2 * margin, cardHeight, 'FD')
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFont('helvetica','bold')
    doc.setFontSize(12)
    doc.text('Invoice Details', margin + 15, yPos + 20)
    
    doc.setFont('helvetica','normal')
    doc.setFontSize(10)
    doc.text('Issue Date:', margin + 15, yPos + 40)
    doc.text(issueDate, margin + 100, yPos + 40)
    
    doc.text('Status:', margin + 15, yPos + 55)
    const statusColor = inv.status === 'paid' ? secondaryColor : 
                       inv.status === 'partial' ? accentColor : 
                       [244, 67, 54] // Red for unpaid
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2])
    doc.setFont('helvetica','bold')
    doc.text(inv.status.toUpperCase(), margin + 100, yPos + 55)
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFont('helvetica','normal')
    doc.text('Amount Due:', margin + 15, yPos + 70)
    const amountDue = inv.balance > 0 ? inv.balance : 0
    doc.setFont('helvetica','bold')
    doc.setFontSize(14)
    doc.text(`$${amountDue.toFixed(2)}`, margin + 100, yPos + 70)
    
    // Helper function to get instructor full name
    const getInstructorName = (instructor?: { firstName?: string; lastName?: string; name?: string }) => {
      if (!instructor) return ''
      // Try new format first (firstName + lastName)
      if (instructor.firstName || instructor.lastName) {
        const fullName = `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim()
        if (fullName) return fullName
      }
      // Fallback for old format (name property)
      if ('name' in instructor && typeof instructor.name === 'string' && instructor.name.trim().length > 0) {
        return instructor.name.trim()
      }
      // If only one part is available, return it
      if (instructor.firstName) return instructor.firstName.trim()
      if (instructor.lastName) return instructor.lastName.trim()
      return ''
    }
    
    // Add instructor information - look for any line with instructor info
    const instructorLines = inv.lines.filter(line => {
      if (!line.instructor) return false
      const hasFirstName = line.instructor.firstName && line.instructor.firstName.trim().length > 0
      const hasLastName = line.instructor.lastName && line.instructor.lastName.trim().length > 0
      const hasName = 'name' in line.instructor && typeof line.instructor.name === 'string' && line.instructor.name.trim().length > 0
      return hasFirstName || hasLastName || hasName
    })
    
    // Debug logging for Korean Cooking
    if (inv.lines.some(line => line.academy.toLowerCase().includes('korean') && line.academy.toLowerCase().includes('cooking'))) {
      logger.debug('Korean Cooking invoice PDF generation', {
        totalLines: inv.lines.length,
        linesWithInstructor: inv.lines.map(l => ({
          academy: l.academy,
          hasInstructor: !!l.instructor,
          instructor: l.instructor ? {
            firstName: l.instructor.firstName,
            lastName: l.instructor.lastName,
            hasName: 'name' in l.instructor,
            credentials: l.instructor.credentials
          } : null
        })),
        instructorLinesFound: instructorLines.length
      })
    }
    
    // Use the first line with instructor info
    const instructorLine = instructorLines[0]
    if (instructorLine?.instructor) {
      const instructorName = getInstructorName(instructorLine.instructor)
      if (instructorName) {
        doc.setFont('helvetica','normal')
        doc.setFontSize(10)
        doc.text('Instructor:', margin + 15, yPos + 85)
        doc.setFont('helvetica','bold')
        doc.text(instructorName, margin + 100, yPos + 85)
      }
    }
    
    // Add instruction dates and hours
    doc.setFont('helvetica','normal')
    doc.setFontSize(10)
    doc.text('Instruction Period:', margin + 15, yPos + 100)
    doc.setFont('helvetica','bold')
    doc.text('August 16 - November 22, 2025', margin + 100, yPos + 100)
    
    // Add service rate based on academy
    const firstLine = inv.lines[0]
    if (firstLine) {
      doc.setFont('helvetica','normal')
      doc.setFontSize(10)
      doc.text('Service Rate:', margin + 15, yPos + 115)
      const serviceRate = firstLine.serviceRate || firstLine.unitPrice || 0
      doc.setFont('helvetica','bold')
      doc.text(`$${serviceRate.toFixed(2)}`, margin + 100, yPos + 115)
    }
    
    // Add payment method if available
    if (inv.method) {
      doc.setFont('helvetica','normal')
      doc.setFontSize(10)
      doc.text('Payment Method:', margin + 15, yPos + 130)
      const methodText = inv.method === 'cash' ? 'Cash' : 
                        inv.method === 'zelle' ? 'Zelle' : 
                        inv.method === 'discount' ? 'Discount' : 
                        String(inv.method).toUpperCase()
      doc.setFont('helvetica','bold')
      doc.text(methodText, margin + 100, yPos + 130)
    }

    // Company and student info in two columns
    yPos += 160
    
    // Company info (left column)
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
    doc.rect(margin, yPos, (pageWidth - 3 * margin) / 2, 120, 'F')
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFont('helvetica','bold')
    doc.setFontSize(12)
    doc.text('From', margin + 15, yPos + 20)
    
    doc.setFont('helvetica','bold')
    doc.setFontSize(14)
    doc.text('IYF Orlando', margin + 15, yPos + 40)
    
    doc.setFont('helvetica','normal')
    doc.setFontSize(10)
    doc.text('320 S Park Ave', margin + 15, yPos + 60)
    doc.text('Sanford, FL 32771', margin + 15, yPos + 75)
    doc.text('Phone: 407-900-3442', margin + 15, yPos + 90)
    doc.text('orlando@iyfusa.org', margin + 15, yPos + 105)

    // Student info (right column)
    const rightColumnX = margin + (pageWidth - 3 * margin) / 2 + margin
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
    doc.rect(rightColumnX, yPos, (pageWidth - 3 * margin) / 2, 120, 'FD')
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFont('helvetica','bold')
    doc.setFontSize(12)
    doc.text('Bill To', rightColumnX + 15, yPos + 20)
    
    const studentReg = regs.find(r => r.id === inv.studentId)
    
    doc.setFont('helvetica','normal')
    doc.setFontSize(10)
    doc.text('First Name:', rightColumnX + 15, yPos + 40)
    doc.setFont('helvetica','bold')
    doc.text(studentReg?.firstName || 'N/A', rightColumnX + 80, yPos + 40)
    
    doc.setFont('helvetica','normal')
    doc.text('Last Name:', rightColumnX + 15, yPos + 55)
    doc.setFont('helvetica','bold')
    doc.text(studentReg?.lastName || 'N/A', rightColumnX + 80, yPos + 55)
    
    doc.setFont('helvetica','normal')
    doc.text('Email:', rightColumnX + 15, yPos + 70)
    doc.setFont('helvetica','bold')
    doc.text(studentReg?.email || 'N/A', rightColumnX + 80, yPos + 70)

    // Items table with modern design
    yPos += 150
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
    doc.rect(margin, yPos, pageWidth - 2 * margin, 30, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica','bold')
    doc.setFontSize(12)
    doc.text('Course & Instructor', margin + 15, yPos + 20)
    doc.text('Period', margin + 200, yPos + 20)
    doc.text('Qty', margin + 280, yPos + 20)
    doc.text('Unit Price', margin + 350, yPos + 20)
    doc.text('Amount', margin + 450, yPos + 20)

    yPos += 30
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
    
      // Academy items with instructor information
      inv.lines.forEach((line, index) => {
        const isEven = index % 2 === 0
        // Calculate item height based on content
        let itemHeight = 60 // Increased base height for better spacing
        if (line.instructionDates) {
          itemHeight += 30 // Instruction dates
        }
      
      if (isEven) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, yPos, pageWidth - 2 * margin, itemHeight, 'F')
      }
      
      doc.setTextColor(textColor[0], textColor[1], textColor[2])
      doc.setFont('helvetica','normal')
      doc.setFontSize(10)
      
      // Basic course information
      doc.text(line.academy, margin + 15, yPos + 15)
      doc.text(`P${line.period}`, margin + 200, yPos + 15)
      doc.text(line.qty.toString(), margin + 280, yPos + 15)
      doc.text(usd(line.unitPrice), margin + 350, yPos + 15)
      doc.text(usd(line.amount), margin + 450, yPos + 15)
      
      if (line.level) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(line.level, margin + 15, yPos + 30)
        doc.setTextColor(textColor[0], textColor[1], textColor[2])
        doc.setFontSize(10)
      }
      
      // Service rate for elective courses (shown below unit price if applicable)
      if (line.serviceRate && line.serviceRate > 0) {
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(`(${usd(line.serviceRate)}/hr)`, margin + 350, yPos + 28)
        doc.setTextColor(textColor[0], textColor[1], textColor[2])
        doc.setFontSize(10)
      }
      
      // Instruction dates and hours (including year)
      if (line.instructionDates) {
        const dates = line.instructionDates
        let dateY = yPos + 45
        
        if (dates.startDate && dates.endDate) {
          const startDate = new Date(dates.startDate).toLocaleDateString('en-US', { 
            year: 'numeric', month: 'short', day: 'numeric' 
          })
          const endDate = new Date(dates.endDate).toLocaleDateString('en-US', { 
            year: 'numeric', month: 'short', day: 'numeric' 
          })
          doc.setFontSize(9)
          doc.setTextColor(80, 80, 80)
          doc.text(`Instruction Dates (with year): ${startDate} - ${endDate}`, margin + 200, dateY)
          dateY += 12
          
          if (dates.totalHours > 0) {
            doc.text(`Total Hours of Instruction: ${dates.totalHours}`, margin + 200, dateY)
            dateY += 12
          }
          
          if (dates.schedule) {
            doc.text(`Schedule: ${dates.schedule}`, margin + 200, dateY)
            dateY += 12
          }
        }
        doc.setTextColor(textColor[0], textColor[1], textColor[2])
      }
      
      // Service rate for elective courses (Period and Cost are already shown in table headers)
      if (line.serviceRate && line.serviceRate > 0) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Service Rate: ${usd(line.serviceRate)}/hr`, margin + 350, yPos + 45)
        doc.setTextColor(textColor[0], textColor[1], textColor[2])
      }
      
      yPos += itemHeight
    })

    // Lunch items
    if (inv.lunchAmount && inv.lunchAmount > 0) {
      const isEven = inv.lines.length % 2 === 0
      if (isEven) {
        doc.setFillColor(250, 250, 250)
        doc.rect(margin, yPos, pageWidth - 2 * margin, 40, 'F')
      }
      
      doc.setTextColor(textColor[0], textColor[1], textColor[2])
      doc.setFont('helvetica','normal')
      doc.setFontSize(10)
      
      if (inv.lunch?.semesterSelected) {
        doc.text('Lunch Semester', margin + 15, yPos + 15)
        doc.text('1', margin + 280, yPos + 15)
        doc.text(usd(inv.lunch?.prices?.semester || 0), margin + 350, yPos + 15)
        doc.text(usd(inv.lunch?.prices?.semester || 0), margin + 450, yPos + 15)
        yPos += 40
      }
      
      if (inv.lunch?.singleQty && inv.lunch?.singleQty > 0) {
        doc.text('Lunch Single-Day', margin + 15, yPos + 15)
        doc.text(inv.lunch.singleQty.toString(), margin + 280, yPos + 15)
        const unitPrice = inv.lunch?.prices?.single || 0
        doc.text(usd(unitPrice), margin + 350, yPos + 15)
        doc.text(usd(inv.lunch.singleQty * unitPrice), margin + 450, yPos + 15)
        yPos += 40
      }
    }

    // Totals section with modern card design
    const totalsStartX = pageWidth - 200
    yPos = Math.max(yPos + 20, 400)
    
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
    doc.rect(totalsStartX - 15, yPos - 20, 180, 120, 'FD')
    
    doc.setTextColor(textColor[0], textColor[1], textColor[2])
    doc.setFont('helvetica','normal')
    doc.setFontSize(10)
    doc.text('Subtotal', totalsStartX, yPos)
    doc.text(usd(inv.subtotal + (inv.lunchAmount || 0)), totalsStartX + 100, yPos)
    yPos += 20

    if (inv.discountAmount && inv.discountAmount > 0) {
      doc.text('Discount', totalsStartX, yPos)
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
      doc.text(`-${usd(inv.discountAmount)}`, totalsStartX + 100, yPos)
      doc.setTextColor(textColor[0], textColor[1], textColor[2])
      yPos += 20
    }

    doc.setFont('helvetica','bold')
    doc.setFontSize(14)
    doc.text('Total', totalsStartX, yPos)
    doc.text(usd(inv.total), totalsStartX + 100, yPos)
    yPos += 30

    if (inv.paid > 0) {
      doc.setFont('helvetica','normal')
      doc.setFontSize(10)
      doc.text('Paid', totalsStartX, yPos)
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
      doc.text(usd(inv.paid), totalsStartX + 100, yPos)
      doc.setTextColor(textColor[0], textColor[1], textColor[2])
      yPos += 20
    }

    // Amount due with emphasis
    if (amountDue > 0) {
      doc.setFont('helvetica','bold')
      doc.setFontSize(16)
      doc.setTextColor(244, 67, 54) // Red
      doc.text('Amount Due', totalsStartX, yPos)
      doc.text(`$${amountDue.toFixed(2)}`, totalsStartX + 100, yPos)
    } else {
      doc.setFont('helvetica','bold')
      doc.setFontSize(16)
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
      doc.text('PAID', totalsStartX, yPos)
    }

    // Instructor Summary Section with full details
    const getInstructorFullName = (instructor?: { firstName?: string; lastName?: string; name?: string }) => {
      if (!instructor) return ''
      if (instructor.firstName && instructor.lastName) {
        return `${instructor.firstName} ${instructor.lastName}`.trim()
      }
      if ('name' in instructor && typeof instructor.name === 'string') {
        return instructor.name
      }
      return ''
    }
    
    const instructorsWithInfo = inv.lines.filter(line => {
      if (!line.instructor) return false
      const name = getInstructorFullName(line.instructor)
      return name.length > 0
    })
    
    if (instructorsWithInfo.length > 0) {
      yPos = Math.max(yPos + 50, 500)
      
      // Check if we need a new page
      if (yPos > pageHeight - 200) {
        doc.addPage()
        yPos = 50
      }
      
      doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
      doc.rect(margin, yPos, pageWidth - 2 * margin, 30, 'F')
      
      doc.setTextColor(textColor[0], textColor[1], textColor[2])
      doc.setFont('helvetica','bold')
      doc.setFontSize(14)
      doc.text('Instructor Information', margin + 15, yPos + 20)
      
      yPos += 40
      
      // Group instructors by name to avoid duplicates, but keep all line info
      const uniqueInstructors = new Map<string, { instructor: typeof instructorsWithInfo[0]['instructor'], lines: typeof instructorsWithInfo }>()
      instructorsWithInfo.forEach(line => {
        if (line.instructor) {
          const key = getInstructorFullName(line.instructor)
          if (key) {
            if (!uniqueInstructors.has(key)) {
              uniqueInstructors.set(key, { instructor: line.instructor, lines: [] })
            }
            uniqueInstructors.get(key)!.lines.push(line)
          }
        }
      })
      
      uniqueInstructors.forEach((data, key) => {
        const instructor = data.instructor
        if (!instructor) return // Skip if instructor is undefined
        const instructorLines = data.lines
        
        // Calculate height needed
        let boxHeight = 80
        if (instructor.credentials) {
          // Calculate height for credentials text (may wrap to multiple lines)
          const credentials = instructor.credentials
          const maxWidth = pageWidth - 2 * margin - 50
          const credLines = doc.splitTextToSize(credentials, maxWidth)
          boxHeight += 20 + (credLines.length > 1 ? (credLines.length - 1) * 12 : 0)
        }
        if (instructorLines.length > 0) boxHeight += 20 + (instructorLines.length * 15)
        
        // Check if we need a new page
        if (yPos + boxHeight > pageHeight - 50) {
          doc.addPage()
          yPos = 50
        }
        
        doc.setFillColor(255, 255, 255)
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2])
        doc.rect(margin, yPos, pageWidth - 2 * margin, boxHeight, 'FD')
        
        doc.setTextColor(textColor[0], textColor[1], textColor[2])
        doc.setFont('helvetica','bold')
        doc.setFontSize(12)
        doc.text(key, margin + 15, yPos + 20)
        
        doc.setFont('helvetica','normal')
        doc.setFontSize(10)
        let currentY = yPos + 35
        
        if (instructor.email) {
          doc.text(`Email: ${instructor.email}`, margin + 15, currentY)
        }
        if (instructor.phone) {
          doc.text(`Phone: ${instructor.phone}`, margin + 200, currentY)
        }
        currentY += 15
        
        // Credentials (background) - Required for elective courses - Simple text format
        if (instructor.credentials) {
          currentY += 5
          doc.setFont('helvetica','normal')
          doc.setFontSize(10)
          doc.setTextColor(textColor[0], textColor[1], textColor[2])
          
          // Split credentials if too long
          const credentials = instructor.credentials
          const maxWidth = pageWidth - 2 * margin - 50
          const lines = doc.splitTextToSize(credentials, maxWidth)
          doc.text('Credentials: ', margin + 15, currentY)
          lines.forEach((line: string, idx: number) => {
            doc.text(line, margin + 15 + (idx === 0 ? 70 : 0), currentY + (idx * 12))
          })
          
          currentY += 15 + (lines.length > 1 ? (lines.length - 1) * 12 : 0)
        }
        
        // Academy, Period, and Cost information
        if (instructorLines.length > 0) {
          currentY += 5
          doc.setFont('helvetica','bold')
          doc.setFontSize(10)
          doc.text('Academy Assignments:', margin + 15, currentY)
          currentY += 15
          
          doc.setFont('helvetica','normal')
          doc.setFontSize(9)
          instructorLines.forEach((line) => {
            const academyInfo = `${line.academy} - Period ${line.period} - ${usd(line.unitPrice)}`
            doc.text(academyInfo, margin + 20, currentY)
            
            // Service rate for elective courses
            if (line.serviceRate && line.serviceRate > 0) {
              doc.text(`(Service Rate: ${usd(line.serviceRate)}/hr)`, margin + 200, currentY)
            }
            
            // Instruction dates and hours
            if (line.instructionDates) {
              currentY += 12
              doc.setFontSize(8)
              doc.setTextColor(100, 100, 100)
              if (line.instructionDates.startDate && line.instructionDates.endDate) {
                const startDate = new Date(line.instructionDates.startDate).toLocaleDateString('en-US', { 
                  year: 'numeric', month: 'short', day: 'numeric' 
                })
                const endDate = new Date(line.instructionDates.endDate).toLocaleDateString('en-US', { 
                  year: 'numeric', month: 'short', day: 'numeric' 
                })
                doc.text(`Dates: ${startDate} - ${endDate}`, margin + 20, currentY)
              }
              if (line.instructionDates.totalHours > 0) {
                doc.text(`Hours: ${line.instructionDates.totalHours}`, margin + 200, currentY)
              }
              doc.setTextColor(textColor[0], textColor[1], textColor[2])
              doc.setFontSize(9)
              currentY -= 12
            }
            
            currentY += 15
          })
        }
        
        yPos += boxHeight + 10
      })
    }


    // Footer
    const footerY = pageHeight - 40
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2])
    doc.rect(0, footerY, pageWidth, 40, 'F')
    
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica','normal')
    doc.setFontSize(8)
    doc.text('IYF Orlando Academy', pageWidth / 2, footerY + 15, { align: 'center' })
    doc.text('www.iyforlando.org | orlando@iyfusa.org | 407-900-3442', pageWidth / 2, footerY + 30, { align: 'center' })

    // Save file
    const filename = inv.id.startsWith('PREVIEW-') 
      ? `invoice-preview-${inv.studentName?.replace(/\s+/g,'_')}-${Date.now()}.pdf`
      : `invoice-${inv.studentName?.replace(/\s+/g,'_')}-${inv.id}.pdf`
    doc.save(filename)
  }

  /* ---------- Invoice Line Editing Functions ---------- */
  const handleEditLine = React.useCallback((line: InvoiceLine, index: number) => {
    setEditingLine(line)
    setEditingLineIndex(index)
    setInvoiceDialogOpen(true)
  }, [])

  const handleSaveLine = React.useCallback((updatedLine: InvoiceLine) => {
    if (editingLineIndex >= 0) {
      setLines(prev => {
        const newLines = [...prev]
        newLines[editingLineIndex] = updatedLine
        return newLines
      })
    }
    setInvoiceDialogOpen(false)
    setEditingLine(null)
    setEditingLineIndex(-1)
  }, [editingLineIndex])

  const handleCloseInvoiceDialog = React.useCallback(() => {
    setInvoiceDialogOpen(false)
    setEditingLine(null)
    setEditingLineIndex(-1)
  }, [])

  /* ---------- Payment Records Functions ---------- */
  const handleRowClick = React.useCallback((params: { row: Payment }) => {
    setSelectedPaymentRecord(params.row)
    setPaymentDetailsOpen(true)
  }, [])

  // Computed values
  const tuitionFullyPaid = React.useMemo(() => {
    if (!student) return false
    return tuitionFullyPaidForSelected(student.reg, studentInvoices)
  }, [student, studentInvoices])

  const openTuition = React.useMemo(() => {
    if (!student) return false
    return hasOpenTuitionInvoice(studentInvoices)
  }, [student, studentInvoices])

  const composerHasTuition = React.useMemo(() => {
    return lines.some(l => !!l.academy)
  }, [lines])

  const lunchUnitSemester = Number(pricing.lunch?.semester || 0)
  const lunchUnitSingle = Number(pricing.lunch?.single || 0)

  const selectedInvoice = React.useMemo(() => {
    return studentInvoices.find(inv => inv.id === selectedInvoiceId)
  }, [studentInvoices, selectedInvoiceId])

  // Calculate the actual balance considering discount
  // Calculate the real balance for the selected invoice (using invoice.total which already accounts for discounts)
  const selectedInvoiceRealBalance = React.useMemo(() => {
    if (!selectedInvoice) return 0
    // Use invoice.total directly (it already includes subtotal + lunchAmount - discountAmount)
    const invoiceTotal = Number(selectedInvoice.total || 0)
    const currentPaid = Number(selectedInvoice.paid || 0)
    return Math.max(0, invoiceTotal - currentPaid)
  }, [selectedInvoice])

  // Calculate total balance across ALL invoices for the student
  const totalStudentBalance = React.useMemo(() => {
    if (!student || studentInvoices.length === 0) return 0
    return studentInvoices.reduce((sum, inv) => {
      const invoiceTotal = Number(inv.total || 0)
      const currentPaid = Number(inv.paid || 0)
      return sum + Math.max(0, invoiceTotal - currentPaid)
    }, 0)
  }, [student, studentInvoices])

  // Calculate total paid across ALL invoices
  const totalStudentPaid = React.useMemo(() => {
    if (!student || studentInvoices.length === 0) return 0
    return studentInvoices.reduce((sum, inv) => sum + Number(inv.paid || 0), 0)
  }, [student, studentInvoices])

  // Calculate total invoice amount across ALL invoices
  const totalStudentInvoiceAmount = React.useMemo(() => {
    if (!student || studentInvoices.length === 0) return 0
    return studentInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)
  }, [student, studentInvoices])

  const paymentRecordsColumns = React.useMemo<GridColDef[]>(() => [
    {
      field: 'id', headerName: '#', width: 72, sortable: false, filterable: false, align: 'center', headerAlign: 'center',
      valueGetter: (params) => {
        // Use a stable index based on the row ID
        const allRows = params.api.getSortedRowIds()
        const index = allRows.indexOf(params.id)
        return index + 1
      }
    },
    { 
      field: 'firstName', 
      headerName: 'First Name', 
      minWidth: 120, 
      flex: 1,
      sortable: true,
      filterable: true
    },
    { 
      field: 'lastName', 
      headerName: 'Last Name', 
      minWidth: 120, 
      flex: 1,
      sortable: true,
      filterable: true
    },
    { 
      field: 'email', 
      headerName: 'Email', 
      minWidth: 200, 
      flex: 1.2,
      sortable: true,
      filterable: true
    },
    { 
      field: 'phone', 
      headerName: 'Phone', 
      minWidth: 130, 
      flex: 1,
      sortable: false,
      filterable: true
    },
    { 
      field: 'totalFee', 
      headerName: 'Total Fee', 
      width: 110,
      sortable: true,
      filterable: false,
      valueFormatter: (params) => usd(params.value),
      align: 'right',
      headerAlign: 'right'
    },
    { 
      field: 'paidAmount', 
      headerName: 'Paid', 
      width: 110,
      sortable: true,
      filterable: false,
      valueFormatter: (params) => usd(params.value),
      align: 'right',
      headerAlign: 'right'
    },
    { 
      field: 'balance', 
      headerName: 'Balance', 
      width: 110,
      sortable: true,
      filterable: false,
      valueFormatter: (params) => usd(params.value),
      align: 'right',
      headerAlign: 'right'
    },
    {
      field: 'lastPaymentDate', 
      headerName: 'Last Payment', 
      width: 130,
      sortable: true,
      filterable: false
    },
    { 
      field: 'lastPaymentMethod', 
      headerName: 'Method', 
      width: 100,
      sortable: true,
      filterable: true
    }
  ], [])

  /* ---------- Excel Export ---------- */
  const handleExportExcel = () => {
    try {
      if (!regs || !allInvoices || !allPayments) {
        notifyError('Export Failed', 'Unable to export data. Please ensure all data is loaded and try again.')
        return
      }

      // Use the paymentRecords data that's already processed
      const exportData = paymentRecords.map((record, index) => ({
        '#': index + 1,
        'First Name': record.firstName,
        'Last Name': record.lastName,
        'Email': record.email,
        'Phone': record.cellNumber,
        'Total Fee': usd(record.totalFee),
        'Paid': usd(record.paidAmount),
        'Balance': usd(record.balance),
        'Payment Status': 'N/A', // No direct status mapping in this export
        'Last Payment Date': record.lastPaymentDate,
        'Payment Method': record.lastPaymentMethod,
        'P1 Academy': record.registration?.firstPeriod?.academy || '',
        'P2 Academy': record.registration?.secondPeriod?.academy || '',
        'City': record.registration?.city || '',
        'State': record.registration?.state || ''
      }))
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      
      // Set column widths
      const colWidths = [
        { wch: 5 },   // #
        { wch: 15 },  // First Name
        { wch: 15 },  // Last Name
        { wch: 25 },  // Email
        { wch: 15 },  // Phone
        { wch: 12 },  // Total Fee
        { wch: 12 },  // Paid
        { wch: 12 },  // Balance
        { wch: 15 },  // Payment Status
        { wch: 15 },  // Last Payment Date
        { wch: 15 },  // Payment Method
        { wch: 20 },  // P1 Academy
        { wch: 20 },  // P2 Academy
        { wch: 15 },  // City
        { wch: 12 }   // State
      ]
      ws['!cols'] = colWidths
      
      // Add styling
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      
      // Style headers
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: C })
        if (ws[headerCell]) {
          ws[headerCell].s = {
            fill: { fgColor: { rgb: '4472C4' } },
            font: { color: { rgb: 'FFFFFF' }, bold: true }
          }
        }
      }
      
      // Style data rows
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        const statusCell = XLSX.utils.encode_cell({ r: R, c: 8 }) // Payment Status column
        const balanceCell = XLSX.utils.encode_cell({ r: R, c: 7 }) // Balance column
        
        if (ws[statusCell]) {
          const status = exportData[R - 1]['Payment Status']
          if (status === 'PAID') {
            ws[statusCell].s = {
              fill: { fgColor: { rgb: 'C6EFCE' } },
              font: { color: { rgb: '006100' }, bold: true }
            }
          } else if (status === 'PARTIAL') {
            ws[statusCell].s = {
              fill: { fgColor: { rgb: 'FFEB9C' } },
              font: { color: { rgb: '9C5700' }, bold: true }
            }
          }
        }
        
        if (ws[balanceCell]) {
          const balance = exportData[R - 1]['Balance']
          if (balance !== '$0.00') {
            ws[balanceCell].s = {
              fill: { fgColor: { rgb: 'FFC7CE' } },
              font: { color: { rgb: '9C0006' }, bold: true }
            }
          }
        }
      }
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Payments')
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const filename = `IYF_Payments_${timestamp}.xlsx`
      
      // Save file
      XLSX.writeFile(wb, filename)
      
      notifySuccess('Export Successful', `Exported ${exportData.length} payment records to ${filename}`)
    } catch (error: any) {
      notifyError(
        'Export Failed', 
        error?.message || 'Unable to export data. Please check your connection and try again.',
        { error, operation: 'export' }
      )
    }
  }

  return (
    <Grid container spacing={3} sx={{ height: '100%', overflow: 'hidden' }}>
      <Grid item xs={12} sx={{ height: '100%' }}>
        <Card elevation={0} sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CardHeader
            title="Payments & Invoices"
            subheader="Search → auto-price → lunch → discounts → invoice → payments → receipt"
            action={
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  color="primary"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExportExcel}
                >
                  Export Excel
                </Button>
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Pricing: ${Object.keys(editMap).length} academies • L(${usd(editLunchSem)}/${usd(editLunchSingle)})`}
                />
                <Tooltip title="Pricing (Admin)">
                  <IconButton onClick={()=>setOpenPricing(true)} aria-label="pricing"><SettingsIcon /></IconButton>
                </Tooltip>
              </Stack>
            }
          />
          <CardContent sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, flexShrink: 0 }}>
                          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
              <Tab label="Invoice Management" />
              <Tab label="Payment Records" />
            </Tabs>
            </Box>

            {/* Tab Content */}
            {activeTab === 0 && (
              <Grid container spacing={3}>
                {/* LEFT: Student + history */}
                <Grid item xs={12} md={5}>
                <Stack spacing={2}>
                  <Autocomplete
                    options={options}
                    value={student}
                    onChange={(_, v) => { setStudent(v); setSelectedInvoiceId(null) }}
                    renderInput={(params) => <TextField {...params} label="Search student" placeholder="Type name…" />}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(a,b)=>a.id===b.id}
                  />

                  {student && (
                    <Alert severity={tuitionFullyPaid ? 'success' : (openTuition ? 'warning' : 'info')}>
                      {tuitionFullyPaid ? 'Tuition fully paid. You can still invoice lunch.' :
                        (openTuition ? 'Open tuition invoice detected. Apply payments or create lunch-only.' : 'No open tuition invoices.')}
                    </Alert>
                  )}

                  {/* Total Balance Summary */}
                  {student && studentInvoices.length > 0 && (
                    <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'primary.50' }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 1 }}>Total Balance Summary</Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Total Invoices</Typography>
                            <Typography variant="h6">{usd(totalStudentInvoiceAmount)}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="body2" color="text.secondary">Total Paid</Typography>
                            <Typography variant="h6" color="success.main">{usd(totalStudentPaid)}</Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" color="text.secondary">Remaining Balance</Typography>
                            <Typography variant="h5" color={totalStudentBalance === 0 ? 'success.main' : 'error.main'}>
                              {usd(totalStudentBalance)}
                            </Typography>
                          </Grid>
                          <Grid item xs={12}>
                            <Typography variant="caption" color="text.secondary">
                              {studentInvoices.length} invoice{studentInvoices.length !== 1 ? 's' : ''} • Select an invoice below to apply payment
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  )}

                  {/* Invoices list */}
                  {student && (
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 1 }}>Invoices ({studentInvoices.length})</Typography>
                        {studentInvoices.length === 0 && <Alert severity="info">No invoices yet. Compose a new one on the right.</Alert>}
                        <List dense>
                          {studentInvoices.map(inv => {
                            const invTotal = Number(inv.total || 0)
                            const invPaid = Number(inv.paid || 0)
                            const invBalance = Math.max(0, invTotal - invPaid)
                            const academyName = inv.lines[0]?.academy || 'Multiple'
                            return (
                              <ListItem
                                key={inv.id}
                                disablePadding
                                secondaryAction={
                                  <Stack direction="row" spacing={0.5}>
                                    <Tooltip title="Receipt PDF">
                                      <IconButton size="small" onClick={() => generateReceipt(inv)}><PictureAsPdfIcon fontSize="small" /></IconButton>
                                    </Tooltip>
                                    <Tooltip title={Number(inv.paid||0) > 0 ? 'Has payments — remove payments first' : 'Delete invoice'}>
                                      <span>
                                        <IconButton size="small" disabled={Number(inv.paid||0) > 0} onClick={()=>deleteInvoice(inv)}>
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </span>
                                    </Tooltip>
                                  </Stack>
                                }
                              >
                                <ListItemButton selected={inv.id === selectedInvoiceId} onClick={() => setSelectedInvoiceId(inv.id)}>
                                  <ListItemText
                                    primary={
                                      <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="body1" fontWeight="medium">
                                          {academyName}
                                        </Typography>
                                        <Chip 
                                          size="small" 
                                          label={inv.status.toUpperCase()} 
                                          color={
                                            inv.status === 'paid' ? 'success' : 
                                            inv.status === 'partial' ? 'warning' : 
                                            inv.status === 'exonerated' ? 'info' : 'default'
                                          }
                                        />
                                      </Stack>
                                    }
                                    secondary={
                                      <Typography variant="body2">
                                        Total: {usd(invTotal)} • Paid: {usd(invPaid)} • Balance: {usd(invBalance)}
                                      </Typography>
                                    }
                                  />
                                </ListItemButton>
                              </ListItem>
                            )
                          })}
                        </List>
                      </CardContent>
                    </Card>
                  )}

                  {/* Payment history with edit/delete */}
                  {student && (
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="h6">Payment History</Typography>
                          {studentPayments.length > 0 && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={async () => {
                                const res = await Swal.fire({
                                  title: 'Clear Payment History?',
                                  text: `This will delete all ${studentPayments.length} payment records for ${student.label}. This action cannot be undone.`,
                                  icon: 'warning',
                                  showCancelButton: true,
                                  confirmButtonText: 'Clear All',
                                  cancelButtonText: 'Cancel'
                                })
                                                                  if (res.isConfirmed) {
                                    let deletedCount = 0
                                    let failedCount = 0
                                    const paymentsToDelete = [...studentPayments] // Create a copy
                                    
                                    // Delete payments sequentially to avoid transaction conflicts
                                    for (const payment of paymentsToDelete) {
                                      try {
                                        await deletePaymentWithoutConfirmation(payment)
                                        deletedCount++
                                      } catch (error) {
                                        logger.error('Failed to delete payment', { paymentId: payment.id, error })
                                        failedCount++
                                      }
                                    }
                                    
                                    // Force UI update by clearing local state
                                    setStudentPayments([])
                                    
                                    if (failedCount === 0) {
                                      notifySuccess('Payment history cleared', `All ${deletedCount} payments deleted successfully`)
                                    } else {
                                      notifyError('Partial deletion completed', `${deletedCount} payments deleted, ${failedCount} failed`)
                                    }
                                  }
                              }}
                            >
                              Clear History
                            </Button>
                          )}
                        </Stack>
                        {studentPayments.length === 0 ? (
                          <Alert severity="info">No payments recorded.</Alert>
                        ) : (
                          <List dense>
                            {studentPayments.map(p => (
                              <ListItem key={p.id} disablePadding
                                secondaryAction={
                                  <Stack direction="row" spacing={0.5}>
                                    <Tooltip title="Edit payment">
                                      <IconButton size="small" onClick={()=>openEditPaymentDialog(p)}>
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete payment">
                                      <IconButton size="small" onClick={()=>deletePayment(p)}>
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Stack>
                                }
                              >
                                <ListItemText
                                  primary={`${usd(p.amount)} • ${String(p.method || '').toUpperCase()}`}
                                  secondary={new Date((p.createdAt?.seconds||0)*1000).toLocaleString()}
                                />
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </Stack>
              </Grid>

              {/* RIGHT: Composer + apply payment */}
              <Grid item xs={12} md={7}>
                <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 1 }}>New Invoice</Typography>
                    
                    {/* Filter by Academy Option */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          size="small"
                          label="Filter by Academy (Optional)"
                          value={filterByAcademy}
                          onChange={(e) => setFilterByAcademy(e.target.value)}
                          fullWidth
                        >
                          <MenuItem value="">All Academies</MenuItem>
                          {[...PERIOD_1_ACADEMIES, ...PERIOD_2_ACADEMIES]
                            .filter((academy, index, self) => self.indexOf(academy) === index)
                            .sort()
                            .map((academy) => (
                              <MenuItem key={academy} value={academy}>
                                {academy}
                              </MenuItem>
                            ))}
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          select
                          size="small"
                          label="Filter by Period (Optional)"
                          value={filterByPeriod}
                          onChange={(e) => setFilterByPeriod(e.target.value as 1 | 2 | 'all')}
                          fullWidth
                        >
                          <MenuItem value="all">All Periods</MenuItem>
                          <MenuItem value={1}>Period 1</MenuItem>
                          <MenuItem value={2}>Period 2</MenuItem>
                        </TextField>
                      </Grid>
                    </Grid>
                    
                    <Divider sx={{ mb: 2 }} />

                    <Stack spacing={1.25}>
                      {lines.map((li, idx) => (
                        <Grid key={`${li.academy}-${li.period}-${idx}`} container spacing={1} alignItems="center">
                          <Grid item xs={12} sm={6}>
                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                              <Typography variant="body2" component="span">
                                <b>{li.academy}</b> — P{li.period}{li.level ? ` — ${li.level}` : ''}
                              </Typography>
                              {(() => {
                                // Debug logging for Korean Cooking
                                if (li.academy.toLowerCase().includes('korean') && li.academy.toLowerCase().includes('cooking')) {
                                  logger.debug('Rendering Korean Cooking line in UI', {
                                    academy: li.academy,
                                    period: li.period,
                                    hasInstructor: !!li.instructor,
                                    instructor: li.instructor ? {
                                      firstName: li.instructor.firstName,
                                      lastName: li.instructor.lastName,
                                      hasName: 'name' in li.instructor,
                                      name: 'name' in li.instructor ? li.instructor.name : undefined
                                    } : null
                                  })
                                }
                                
                                if (!li.instructor) {
                                  // Debug: Log why instructor is missing
                                  if (li.academy.toLowerCase().includes('korean') && li.academy.toLowerCase().includes('cooking')) {
                                    logger.debug('Korean Cooking line has NO instructor object', {
                                      academy: li.academy,
                                      period: li.period,
                                      line: li
                                    })
                                  }
                                  return null
                                }
                                
                                // Try to get instructor name from multiple sources
                                let instructorName = ''
                                
                                // First try: firstName + lastName
                                if (li.instructor.firstName || li.instructor.lastName) {
                                  instructorName = `${li.instructor.firstName || ''} ${li.instructor.lastName || ''}`.trim()
                                }
                                
                                // Second try: name property (old format)
                                if (!instructorName && 'name' in li.instructor && typeof li.instructor.name === 'string') {
                                  instructorName = li.instructor.name.trim()
                                }
                                
                                // Third try: just firstName or lastName alone
                                if (!instructorName) {
                                  instructorName = (li.instructor.firstName || li.instructor.lastName || '').trim()
                                }
                                
                                // Debug if name is empty
                                if (!instructorName && li.academy.toLowerCase().includes('korean') && li.academy.toLowerCase().includes('cooking')) {
                                  logger.debug('Korean Cooking instructor name is empty after all attempts', {
                                    academy: li.academy,
                                    period: li.period,
                                    instructor: li.instructor,
                                    firstName: li.instructor.firstName,
                                    lastName: li.instructor.lastName,
                                    hasNameProp: 'name' in li.instructor
                                  })
                                }
                                
                                return instructorName ? (
                                  <Chip 
                                    size="small" 
                                    label={`Instructor: ${instructorName}`} 
                                    color="primary" 
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                ) : null
                              })()}
                            </Stack>
                            {li.instructionDates && (
                              <Typography variant="caption" color="text.secondary">
                                {li.instructionDates.startDate && li.instructionDates.endDate && (
                                  `${new Date(li.instructionDates.startDate).toLocaleDateString()} - ${new Date(li.instructionDates.endDate).toLocaleDateString()}`
                                )}
                                {li.instructionDates.totalHours > 0 && ` • ${li.instructionDates.totalHours} hours`}
                              </Typography>
                            )}
                          </Grid>
                          <Grid item xs={3} sm={1.5}><TextField size="small" label="Unit" value={usd(li.unitPrice)} InputProps={{ readOnly: true }} fullWidth /></Grid>
                          <Grid item xs={3} sm={1}><TextField size="small" label="Qty" value={li.qty} InputProps={{ readOnly: true }} fullWidth /></Grid>
                          <Grid item xs={3} sm={1.5}><TextField size="small" label="Amount" value={usd(li.amount)} InputProps={{ readOnly: true }} fullWidth /></Grid>
                          <Grid item xs={3} sm={1}>
                            <Tooltip title="Edit instructor and schedule information">
                              <IconButton size="small" onClick={() => handleEditLine(li, idx)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Grid>
                        </Grid>
                      ))}
                      {lines.length === 0 && <Typography variant="body2" color="text.secondary">No tuition items (either fully paid or blocked by an open invoice).</Typography>}

                      <Divider sx={{ my: 1 }} />

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField select size="small" label={`Lunch Semester (${usd(lunchUnitSemester)})`} value={lunchSemester ? 'yes' : 'no'} onChange={(e)=> setLunchSemester(e.target.value === 'yes')} fullWidth>
                            <MenuItem value="no">No</MenuItem>
                            <MenuItem value="yes">Add</MenuItem>
                          </TextField>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField size="small" type="number" label={`Lunch Single-Day Qty (× ${usd(lunchUnitSingle)})`} value={lunchSingleQty} onChange={(e)=> setLunchSingleQty(Math.max(Number(e.target.value || 0), 0))} fullWidth />
                        </Grid>
                      </Grid>

                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <TextField 
                  size="small" 
                  label="Discount Code" 
                  placeholder="e.g., TEACHER100"
                  value={discountCode} 
                  onChange={(e) => handleDiscountCodeChange(e.target.value)}
                  fullWidth 
                  InputProps={{
                    startAdornment: appliedDiscount && (
                      <LocalOfferIcon sx={{ mr: 1, color: 'success.main' }} />
                    )
                  }}
                />
                {appliedDiscount && (
                  <Alert severity="success" sx={{ py: 0 }}>
                    <Typography variant="body2">
                      {appliedDiscount.name}: {appliedDiscount.description}
                    </Typography>
                  </Alert>
                )}
                {/* Removed manual discount field - only using discount codes */}
                        </Grid>
                        <Grid item xs={12} sm={8}>
                          <TextField size="small" label="Discount Note" value={discountNote} onChange={(e)=> setDiscountNote(e.target.value)} fullWidth />
                        </Grid>
                      </Grid>

                      <Divider />
                      <Stack spacing={0.5} sx={{ ml: 'auto', maxWidth: 360 }}>
                        <Stack direction="row" justifyContent="space-between"><span>Subtotal</span><b>{usd(subtotal)}</b></Stack>
                        <Stack direction="row" justifyContent="space-between"><span>Lunch</span><b>{usd(lunchAmount)}</b></Stack>
                        <Stack direction="row" justifyContent="space-between"><span>Discount</span><b>-{usd(discountAmount)}</b></Stack>
                        <Divider />
                        <Stack direction="row" justifyContent="space-between"><span>Total</span><b>{usd(total)}</b></Stack>
                      </Stack>

                      <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                        <Tooltip title={openTuition && lines.length ? 'Open tuition invoice exists — apply payments or create lunch-only' : ''}>
                          <span>
                            <Button variant="contained" onClick={() => createInvoice('normal')} disabled={!student || Boolean(openTuition && lines.length) || Boolean(tuitionFullyPaid && lines.length)}>
                              Create Invoice
                            </Button>
                          </span>
                        </Tooltip>
                        <Button 
                          variant="contained" 
                          color="secondary"
                          onClick={createInvoicesByAcademy} 
                          disabled={!student || lines.length === 0}
                        >
                          Create Invoices by Academy
                        </Button>
                        <Button variant="outlined" onClick={() => createInvoice('lunchOnly')} disabled={!student}>Create Lunch-Only Invoice</Button>
                        <Button 
                          variant="outlined" 
                          startIcon={<PictureAsPdfIcon />}
                          onClick={generateInvoicePreview} 
                          disabled={!student || (lines.length === 0 && lunchAmount <= 0)}
                        >
                          Preview Invoice
                        </Button>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="h6">
                          Apply Payment
                        </Typography>
                        {student && studentInvoices.length > 1 && (
                          <Typography variant="caption" color="text.secondary">
                            ({studentInvoices.length} invoices, Total Balance: {usd(totalStudentBalance)})
                          </Typography>
                        )}
                      </Stack>
                      {selectedInvoice && (
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip 
                            size="small" 
                            label={`Status: ${selectedInvoice.status.toUpperCase()}`} 
                            color={
                              selectedInvoice.status === 'paid' ? 'success' : 
                              selectedInvoice.status === 'partial' ? 'warning' : 
                              selectedInvoice.status === 'exonerated' ? 'info' : 'default'
                            } 
                          />
                          <Chip 
                            size="small" 
                            label={`Balance: ${usd(selectedInvoiceRealBalance)}`} 
                            color={selectedInvoiceRealBalance === 0 ? 'success' : 'default'} 
                          />
                        </Stack>
                      )}
                    </Stack>
                    <Divider sx={{ mb: 2 }} />

                    {selectedInvoice && (
                      <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">Invoice Total</Typography>
                            <Typography variant="h6">{usd(selectedInvoice.total)}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">Amount Paid</Typography>
                            <Typography variant="h6" color="success.main">{usd(selectedInvoice.paid || 0)}</Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="body2" color="text.secondary">Remaining Balance</Typography>
                            <Typography variant="h6" color={selectedInvoiceRealBalance === 0 ? 'success.main' : 'error.main'}>
                              {usd(selectedInvoiceRealBalance)}
                            </Typography>
                          </Grid>
                          {selectedInvoice.discountAmount && selectedInvoice.discountAmount > 0 && (
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body2" color="text.secondary">Discount Applied</Typography>
                              <Typography variant="body1" color="success.main">-{usd(selectedInvoice.discountAmount)}</Typography>
                            </Grid>
                          )}
                        </Grid>
                      </Box>
                    )}

                    {/* Apply to all invoices option */}
                    {student && studentInvoices.length > 1 && totalStudentBalance > 0 && (
                      <Box sx={{ mb: 2 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={applyToAllInvoices}
                              onChange={(e) => {
                                setApplyToAllInvoices(e.target.checked)
                                if (e.target.checked) {
                                  // Auto-fill with total balance when enabling
                                  setPayAmount(totalStudentBalance)
                                }
                              }}
                            />
                          }
                          label={
                            <Typography variant="body2">
                              Apply payment to all invoices ({studentInvoices.length} invoices, Total: {usd(totalStudentBalance)})
                            </Typography>
                          }
                        />
                        {applyToAllInvoices && (
                          <Alert severity="info" sx={{ mt: 1 }}>
                            Payment will be distributed proportionally across all unpaid invoices.
                          </Alert>
                        )}
                      </Box>
                    )}

                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={5}>
                        <TextField 
                          size="small" 
                          type="number" 
                          label="Payment Amount" 
                          value={payAmount} 
                          onChange={(e)=> setPayAmount(Math.max(0, Number(e.target.value) || 0))} 
                          fullWidth 
                          inputProps={{ min: 0, step: 0.01 }}
                          helperText={
                            applyToAllInvoices && studentInvoices.length > 1
                              ? `Total balance across all invoices: ${usd(totalStudentBalance)}`
                              : selectedInvoice && selectedInvoiceRealBalance > 0 
                              ? `Maximum for this invoice: ${usd(selectedInvoiceRealBalance)}${studentInvoices.length > 1 ? ` | Total balance: ${usd(totalStudentBalance)}` : ''}`
                              : studentInvoices.length > 1 && totalStudentBalance > 0
                              ? `Total balance across all invoices: ${usd(totalStudentBalance)}`
                              : ''
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField 
                          select 
                          size="small" 
                          label="Payment Method" 
                          value={method} 
                          onChange={(e)=> setMethod(e.target.value as any)} 
                          fullWidth
                          required
                        >
                          <MenuItem value="none">Select Method</MenuItem>
                          <MenuItem value="cash">Cash</MenuItem>
                          <MenuItem value="zelle">Zelle</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Stack direction="row" spacing={1}>
                          <Button 
                            variant="contained" 
                            onClick={recordPayment} 
                            disabled={
                              !student || 
                              (!applyToAllInvoices && !selectedInvoice) || 
                              (!applyToAllInvoices && selectedInvoiceRealBalance === 0) ||
                              (applyToAllInvoices && totalStudentBalance === 0) ||
                              method === 'none' || 
                              !payAmount || 
                              payAmount <= 0
                            }
                            fullWidth
                          >
                            {applyToAllInvoices ? 'Apply to All' : 'Apply Payment'}
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                    
                    {/* Pay remaining buttons */}
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexDirection: 'column' }}>
                      {selectedInvoice && selectedInvoiceRealBalance > 0 && !applyToAllInvoices && (
                        <Button 
                          variant="outlined" 
                          size="small"
                          onClick={payRemaining} 
                          disabled={!selectedInvoice}
                          fullWidth
                        >
                          Pay Full Balance for Selected Invoice ({usd(selectedInvoiceRealBalance)})
                        </Button>
                      )}
                      {student && studentInvoices.length > 1 && totalStudentBalance > 0 && (
                        <Button 
                          variant="outlined" 
                          size="small"
                          color="primary"
                          onClick={() => {
                            setApplyToAllInvoices(true)
                            setPayAmount(totalStudentBalance)
                          }}
                          fullWidth
                        >
                          Pay Full Balance for All Invoices ({usd(totalStudentBalance)})
                        </Button>
                      )}
                    </Box>
                    
                    {!selectedInvoice && (
                      <Alert severity="info" sx={{ mt: 2 }}>
                        Select an invoice from the list to apply a payment.
                      </Alert>
                    )}
                    
                    {selectedInvoice && selectedInvoiceRealBalance === 0 && selectedInvoice.status !== 'exonerated' && (
                      <Alert severity="success" sx={{ mt: 2 }}>
                        This invoice is fully paid.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              </Grid>
            )}

            {/* Payment Records Tab */}
            {activeTab === 1 && (
              <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" gutterBottom>
                  Payment Records - Students who have made payments ({paymentRecords.length} records)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Click on a row to see detailed payment information. Showing all records without pagination.
                </Typography>
                {paymentRecords.length === 0 && !(!regs || !allInvoices || !allPayments) ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    No students have made payments yet. Payment records will appear here once payments are recorded.
                  </Alert>
                                 ) : (
                   <Box 
                     sx={{ 
                       flex: 1,
                       width: '100%',
                       overflow: 'hidden',
                       position: 'relative',
                       minHeight: 0
                     }}
                   >
                     <DataGrid
                       rows={paymentRecords}
                       columns={paymentRecordsColumns}
                       loading={!regs || !allInvoices || !allPayments}
                       getRowId={(row) => row.id}
                       disableRowSelectionOnClick
                       onRowClick={handleRowClick}
                       density="compact"
                       slots={{ toolbar: GridToolbar }}
                       slotProps={{
                         toolbar: {
                           showQuickFilter: true,
                           quickFilterProps: { debounceMs: 500 },
                           printOptions: { disableToolbarButton: true },
                           csvOptions: { disableToolbarButton: false }
                         }
                       }}
                       sortingOrder={['desc', 'asc']}
                       initialState={{
                         sorting: {
                           sortModel: [{ field: 'lastPaymentDate', sort: 'desc' }]
                         }
                       }}
                       paginationMode="client"
                       pageSizeOptions={[]}
                       disableColumnMenu={false}
                       disableColumnFilter={false}
                       disableColumnSelector={false}
                       disableDensitySelector={false}
                       autoHeight={false}
                       sx={{
                         border: 'none',
                         '& .MuiDataGrid-root': {
                           border: 'none'
                         },
                         '& .MuiDataGrid-main': {
                           border: 'none'
                         },
                         '& .MuiDataGrid-virtualScroller': {
                           overflow: 'auto !important'
                         },
                         '& .MuiDataGrid-virtualScrollerContent': {
                           height: '100% !important',
                           width: '100% !important'
                         },
                         '& .MuiDataGrid-row': {
                           cursor: 'pointer',
                           '&:hover': {
                             backgroundColor: 'rgba(25, 118, 210, 0.08)',
                             transition: 'background-color 0.2s ease'
                           }
                         },
                         '& .MuiDataGrid-cell': {
                           borderBottom: '1px solid #e0e0e0'
                         },
                         '& .MuiDataGrid-columnHeaders': {
                           backgroundColor: '#f5f5f5',
                           borderBottom: '2px solid #e0e0e0'
                         },
                         '& .MuiDataGrid-footerContainer': {
                           borderTop: '1px solid #e0e0e0'
                         }
                       }}
                     />
                   </Box>
                 )}
              </Box>
            )}


          </CardContent>
        </Card>
      </Grid>

      {/* Pricing (Admin) — compact dialog */}
      <Dialog open={openPricing} onClose={()=>setOpenPricing(false)} fullWidth maxWidth="sm">
        <DialogTitle>Pricing (Admin)</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField label="Lunch Semester" type="number" size="small" value={editLunchSem} onChange={(e)=> setEditLunchSem(Number(e.target.value || 0))} />
              <TextField label="Lunch Single-Day" type="number" size="small" value={editLunchSingle} onChange={(e)=> setEditLunchSingle(Number(e.target.value || 0))} />
            </Stack>
            <Divider />
            <Box sx={{ display:'grid', gridTemplateColumns:'1fr 120px auto', gap: 1, alignItems:'center' }}>
              <Typography variant="subtitle2">Academy</Typography>
              <Typography variant="subtitle2">Price</Typography>
              <span />
              {Object.entries(editMap).sort(([a],[b])=>a.localeCompare(b)).map(([name, price]) => (
                <React.Fragment key={name}>
                  <TextField size="small" value={name} InputProps={{ readOnly: true }} />
                  <TextField size="small" type="number" value={price} onChange={(e)=> setEditMap(p => ({ ...p, [name]: Number(e.target.value || 0) }))} />
                  <IconButton onClick={()=>{ const n={...editMap}; delete n[name]; setEditMap(n) }} aria-label="delete" size="small"><DeleteIcon fontSize="small" /></IconButton>
                </React.Fragment>
              ))}
              <TextField size="small" placeholder="Add academy" value={newAcademy} onChange={(e)=> setNewAcademy(e.target.value)} />
              <TextField size="small" type="number" placeholder="Price" value={newPrice} onChange={(e)=> setNewPrice(Number(e.target.value || 0))} />
              <IconButton onClick={()=>{ if(!newAcademy.trim())return; setEditMap(p=>({ ...p, [newAcademy.trim()]: Number(newPrice||0) })); setNewAcademy(''); setNewPrice(0) }} aria-label="add" size="small"><AddIcon fontSize="small" /></IconButton>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpenPricing(false)}>Cancel</Button>
          <Button variant="contained" onClick={savePricingNow}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Edit payment dialog */}
      <Dialog open={editPaymentOpen} onClose={()=>setEditPaymentOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Edit payment</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>



      {/* Payment Details Dialog */}
      <Dialog open={paymentDetailsOpen} onClose={() => setPaymentDetailsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Payment Details</DialogTitle>
        <DialogContent dividers>
          {selectedPaymentRecord && (
            <Stack spacing={2}>
              <Typography variant="h6">
                {selectedPaymentRecord.firstName} {selectedPaymentRecord.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Email: {selectedPaymentRecord.email}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Phone: {selectedPaymentRecord.cellNumber}
              </Typography>
              
              <Divider />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Total Fee</Typography>
                  <Typography variant="h6" color="primary">
                    {usd(selectedPaymentRecord.totalFee)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Amount Paid</Typography>
                  <Typography variant="h6" color="success.main">
                    {usd(selectedPaymentRecord.paidAmount)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Balance</Typography>
                  <Typography variant="h6" color={selectedPaymentRecord.balance <= 0 ? 'success.main' : 'warning.main'}>
                    {usd(selectedPaymentRecord.balance)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Last Payment Method</Typography>
                  <Chip 
                    label={selectedPaymentRecord.lastPaymentMethod === 'cash' ? 'Cash' : 'Zelle'} 
                    color={selectedPaymentRecord.lastPaymentMethod === 'cash' ? 'success' : 'info'}
                  />
                </Grid>
              </Grid>
              
              <Divider />
              
              <Typography variant="subtitle2">Last Payment Date</Typography>
              <Typography variant="body2">
                {selectedPaymentRecord.lastPaymentDate?.toDate?.()?.toLocaleDateString() || 'N/A'}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
            <TextField type="number" label="Amount" value={editPaymentAmount} onChange={(e)=>setEditPaymentAmount(Number(e.target.value||0))} />
            <TextField select label="Method" value={editPaymentMethod} onChange={(e)=>setEditPaymentMethod(e.target.value as any)}>
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="zelle">Zelle</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setEditPaymentOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEditedPayment}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Payment Details Dialog */}
      <PaymentDetailsDialog
        open={paymentDetailsOpen}
        onClose={() => {
          setPaymentDetailsOpen(false)
          setSelectedPaymentRecord(null)
        }}
        paymentData={selectedPaymentRecord}
             />

        {/* Invoice Line Editing Dialog */}
        <InvoiceDialog
          open={invoiceDialogOpen}
          editing={editingLine}
          onClose={handleCloseInvoiceDialog}
          onSave={handleSaveLine}
          academy={editingLine?.academy}
          level={editingLine?.level}
        />
     </Grid>
   )
 })

export default PaymentsPage

/** ---------- Payment Details Dialog ---------- */
const PaymentDetailsDialog = React.memo(({
  open,
  onClose,
  paymentData
}: {
  open: boolean
  onClose: () => void
  paymentData: any
}) => {
  if (!paymentData) return null

  const { registration, invoice, studentPayments } = paymentData

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Payment Details - {registration?.firstName} {registration?.lastName}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Student Information */}
          <Box>
            <Typography variant="h6" gutterBottom>Student Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography><strong>Name:</strong> {registration?.firstName} {registration?.lastName}</Typography>
                <Typography><strong>Email:</strong> {registration?.email}</Typography>
                <Typography><strong>Phone:</strong> {registration?.cellNumber}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography><strong>City:</strong> {registration?.city}</Typography>
                <Typography><strong>State:</strong> {registration?.state}</Typography>
                <Typography><strong>Zip:</strong> {registration?.zipCode}</Typography>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Payment Summary */}
          <Box>
            <Typography variant="h6" gutterBottom>Payment Summary</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography><strong>Total Fee:</strong> {usd(invoice?.total || 0)}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography><strong>Paid:</strong> {usd(invoice?.paid || 0)}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography><strong>Balance:</strong> {usd(invoice?.balance || 0)}</Typography>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Payment History */}
          <Box>
            <Typography variant="h6" gutterBottom>Payment History</Typography>
            {studentPayments.length > 0 ? (
              <Stack spacing={1}>
                {studentPayments
                  .sort((a: Payment, b: Payment) => {
                    const aTime = a.createdAt?.seconds || 0
                    const bTime = b.createdAt?.seconds || 0
                    return bTime - aTime
                  })
                  .map((payment: Payment, index: number) => (
                    <Box key={payment.id} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={3}>
                          <Typography><strong>Payment #{index + 1}</strong></Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography><strong>Amount:</strong> {usd(payment.amount)}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography><strong>Method:</strong> {payment.method}</Typography>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <Typography><strong>Date:</strong> {
                            payment.createdAt?.seconds 
                              ? new Date(payment.createdAt.seconds * 1000).toLocaleString()
                              : 'Unknown'
                          }</Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">No payment history available</Typography>
            )}
          </Box>

          {/* Invoice Details */}
          {invoice && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>Invoice Details</Typography>
                <Typography><strong>Invoice ID:</strong> {invoice.id}</Typography>
                <Typography><strong>Status:</strong> {invoice.status}</Typography>
                {invoice.lines && invoice.lines.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle1" gutterBottom>Line Items:</Typography>
                    {invoice.lines.map((line: any, index: number) => (
                      <Typography key={index} variant="body2">
                        {line.academy} - Period {line.period} - {usd(line.amount)}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
             <DialogActions>
         <Button onClick={onClose}>Close</Button>
       </DialogActions>
     </Dialog>
   )
 })
