import * as React from 'react'
import {
  Card, CardHeader, CardContent, Grid, Stack, Button, Chip,
  TextField, Autocomplete, Divider, Typography, MenuItem, Alert,
  List, ListItem, ListItemText, ListItemButton, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Tabs, Tab
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
import type { PricingDoc, InvoiceLine, Invoice, Payment } from '../types'
import { isKoreanLanguage, mapKoreanLevel, norm, usd } from '../../../lib/query'
import { notifySuccess, notifyError } from '../../../lib/alerts'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import {
  DataGrid, GridToolbar, type GridColDef
} from '@mui/x-data-grid'

const INV = 'academy_invoices'
const PAY = 'academy_payments'


// Discount codes
const DISCOUNT_CODES = {
  'TEACHER100': { 
    name: 'Teacher Discount', 
    discount: 100, 
    type: 'percentage',
    description: '100% discount for teachers'
  },
  'SAVE50': { 
    name: 'Save $50', 
    discount: 50, 
    type: 'fixed',
    description: '$50 off discount'
  }
}

/* ---------- helpers ---------- */
function priceFor(academy?: string, _level?: string | null, _period?: 1 | 2, pricing?: PricingDoc) {
  if (!academy || !pricing) return 0
  const a = norm(academy)
  
  // Special pricing for Kids and Soccer - they only pay $40
  // Check for various possible names
  const academyLower = a.toLowerCase()
  if (academyLower === 'kids' || 
      academyLower === 'soccer' || 
      academyLower.includes('kids') || 
      academyLower.includes('soccer')) {
    console.log(`Special pricing applied for academy: ${academy} -> $40`)
    return 40
  }
  
  const base = pricing.academyPrices?.[a]
  console.log(`Regular pricing for academy: ${academy} -> $${base || 0}`)
  return Number(base || 0)
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

  const [student, setStudent] = React.useState<StudentOption | null>(null)
  const [studentInvoices, setStudentInvoices] = React.useState<Invoice[]>([])
  const [studentPayments, setStudentPayments] = React.useState<Payment[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string | null>(null)

  // composer
  const [lines, setLines] = React.useState<InvoiceLine[]>([])
  const [lunchSemester, setLunchSemester] = React.useState<boolean>(false)
  const [lunchSingleQty, setLunchSingleQty] = React.useState<number>(0)
  // Removed discountAmount state - only using discount codes now
  const [discountNote, setDiscountNote] = React.useState<string>('')
  const [discountCode, setDiscountCode] = React.useState<string>('')
  const [appliedDiscount, setAppliedDiscount] = React.useState<any>(null)

  // payment
  const [method, setMethod] = React.useState<'cash'|'zelle'|'none'>('none')
  const [payAmount, setPayAmount] = React.useState<number>(0)

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

  React.useEffect(() => {
    if (!student) { setStudentInvoices([]); setStudentPayments([]); setSelectedInvoiceId(null); return }
    const qi = query(collection(db, INV), where('studentId', '==', student.id))
    const qp = query(collection(db, PAY), where('studentId', '==', student.id))
    const ui = onSnapshot(qi, (snap) => {
      const invs = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Invoice))
        .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setStudentInvoices(invs)
      if (!selectedInvoiceId && invs.length) setSelectedInvoiceId(invs[0].id)
    })
    const up = onSnapshot(qp, (snap) => {
      const pays = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Payment))
        .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setStudentPayments(pays)
    })
    return () => { ui(); up() }
  }, [student?.id]) // Removed selectedInvoiceId dependency to prevent listener recreation





  React.useEffect(() => {
    if (!student?.reg) { setLines([]); return }
    const r = student.reg
    const p1Paid = tuitionFullyPaidForSelected({ ...r, secondPeriod: undefined } as any, studentInvoices)
    const p2Paid = tuitionFullyPaidForSelected({ ...r, firstPeriod: undefined } as any, studentInvoices)

    const L: InvoiceLine[] = []
    const a1 = norm(r.firstPeriod?.academy)
    if (a1 && a1.toLowerCase() !== 'n/a' && !p1Paid) {
      const unit = priceFor(a1, r.firstPeriod?.level || null, 1, pricing)
      L.push({
        academy: a1,
        period: 1,
        level: isKoreanLanguage(a1) ? mapKoreanLevel(r.firstPeriod?.level) : null,
        unitPrice: unit, qty: 1, amount: unit
      })
    }
    const a2 = norm(r.secondPeriod?.academy)
    if (a2 && a2.toLowerCase() !== 'n/a' && !p2Paid) {
      const unit = priceFor(a2, r.secondPeriod?.level || null, 2, pricing)
      L.push({
        academy: a2,
        period: 2,
        level: isKoreanLanguage(a2) ? mapKoreanLevel(r.secondPeriod?.level) : null,
        unitPrice: unit, qty: 1, amount: unit
      })
    }
    setLines(L)
    setLunchSemester(false); setLunchSingleQty(0); setDiscountNote('')
  }, [student?.id, pricing, studentInvoices])

  // Process discount code
  const handleDiscountCodeChange = React.useCallback((code: string) => {
    setDiscountCode(code.toUpperCase())
    const discount = DISCOUNT_CODES[code.toUpperCase() as keyof typeof DISCOUNT_CODES]
    
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

  // Calculate discount amount based on applied discount
  const discountAmount = React.useMemo(() => {
    if (!appliedDiscount) return 0
    if (appliedDiscount.type === 'percentage') {
      return (subtotal * appliedDiscount.discount) / 100
    } else {
      return appliedDiscount.discount
    }
  }, [appliedDiscount, subtotal])

  const total = React.useMemo(() => {
    return Math.max(0, subtotal - discountAmount)
  }, [subtotal, discountAmount])



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
    const effectiveGross = effectiveSubtotal + lunchAmount
    const effectiveDiscount = Math.min(discountAmount || 0, effectiveGross)
    const effectiveTotal = Math.max(effectiveGross - effectiveDiscount, 0)

    if (effectiveLines.length === 0 && lunchAmount <= 0) {
      return Swal.fire({ title: 'Nothing to invoice', icon: 'warning' })
    }

    const ref = await addDoc(collection(db, INV), {
      studentId: student.id,
      studentName: student.label,
      lines: effectiveLines,
      subtotal: effectiveSubtotal,
      lunch: { semesterSelected: lunchSemester, singleQty: lunchSingleQty, prices: { semester: lunchUnitSemester, single: lunchUnitSingle } },
      lunchAmount,
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
    
    // If the invoice has 100% discount (total is 0), automatically mark it as exonerated
    if (effectiveTotal === 0 && effectiveDiscount > 0) {
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

  /* ---------- payments: add / edit / delete ---------- */
  const recordPayment = async () => {
    if (!student) return Swal.fire({ title: 'Select a student', icon: 'info' })
    if (!selectedInvoice) return Swal.fire({ title: 'Select an invoice', icon: 'info' })
    if (method === 'none') return Swal.fire({ title: 'Select a payment method', icon: 'warning' })
    if (!payAmount || payAmount <= 0) return Swal.fire({ title: 'Enter an amount', icon: 'warning' })

    // Calculate the actual remaining amount considering the discount from the invoice
    const invoiceTotal = selectedInvoice.lines.reduce((sum, line) => sum + line.amount, 0)
    const lunchAmount = selectedInvoice.lunchAmount || 0
    const totalWithLunch = invoiceTotal + lunchAmount
    const invoiceDiscount = selectedInvoice.discountAmount || 0
    const discountedTotal = Math.max(0, totalWithLunch - invoiceDiscount)
    const currentPaid = Number(selectedInvoice.paid || 0)
    const remainingAfterDiscount = Math.max(0, discountedTotal - currentPaid)
    
    // Check if invoice is already fully paid considering discount
    if (remainingAfterDiscount === 0) return Swal.fire({ title: 'Invoice already paid', icon: 'info' })

    await addDoc(collection(db, PAY), {
      invoiceId: selectedInvoice.id,
      studentId: student.id,
      amount: Number(payAmount),
      method,
      createdAt: serverTimestamp(),
    } as any)

    const newPaid = currentPaid + Number(payAmount)
    const balance = Math.max(discountedTotal - newPaid, 0)
    // Preserve 'exonerated' status if it was already set, otherwise calculate normally
    const status: Invoice['status'] = selectedInvoice.status === 'exonerated' ? 'exonerated' : 
      (newPaid <= 0 ? 'unpaid' : (balance > 0 ? 'partial' : 'paid'))
    await updateDoc(doc(db, INV, selectedInvoice.id), { paid: newPaid, balance, status, updatedAt: serverTimestamp(), method } as any)

    notifySuccess('Payment recorded', `${usd(payAmount)} applied`)
    setPayAmount(0)
  }
  const payRemaining = () => { 
    if (selectedInvoice) {
      // Calculate the actual remaining amount considering the discount from the invoice
      const invoiceTotal = selectedInvoice.lines.reduce((sum, line) => sum + line.amount, 0)
      const lunchAmount = selectedInvoice.lunchAmount || 0
      const totalWithLunch = invoiceTotal + lunchAmount
      const invoiceDiscount = selectedInvoice.discountAmount || 0
      const discountedTotal = Math.max(0, totalWithLunch - invoiceDiscount)
      const remainingAfterDiscount = Math.max(0, discountedTotal - selectedInvoice.paid)
      setPayAmount(remainingAfterDiscount)
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
          console.warn(`Payment ${p.id} no longer exists, skipping...`)
          return
        }
        
        const invSnap = await tx.get(invRef)
        if (!invSnap.exists()) {
          console.warn(`Invoice ${p.invoiceId} not found for payment ${p.id}, skipping...`)
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
      console.error(`Failed to delete payment ${p.id}:`, error)
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
    const margin = 48
    const now = new Date()
    const issueDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    // Header - Invoice title (top left)
    doc.setFont('helvetica','bold')
    doc.setFontSize(24)
    doc.text('Invoice', margin, 60)

    // Logo (top right) - using the actual IYF logo
    try {
      // Add the logo image
      const logoPath = '/src/assets/logo/IYF_logo.png'
      doc.addImage(logoPath, 'PNG', pageWidth - 80, 30, 50, 50)
    } catch (error) {
      // Fallback if logo not found
      doc.setFillColor(200, 200, 200)
      doc.rect(pageWidth - 80, 30, 50, 50, 'F')
      doc.setFont('helvetica','normal')
      doc.setFontSize(8)
      doc.text('IYF LOGO', pageWidth - 55, 55, { align: 'center' })
    }

    // Invoice details (left column)
    doc.setFont('helvetica','normal')
    doc.setFontSize(10)
    let yPos = 100
    doc.text('Invoice number', margin, yPos)
    doc.text(inv.id, margin + 80, yPos)
    yPos += 20
    doc.text('Date of issue', margin, yPos)
    doc.text(issueDate, margin + 80, yPos)

    // Sender information (left column) - correct IYF Orlando info
    yPos += 40
    doc.setFont('helvetica','bold')
    doc.setFontSize(12)
    doc.text('IYF Orlando', margin, yPos)
    doc.setFont('helvetica','normal')
    doc.setFontSize(10)
    yPos += 20
    doc.text('320 S Park Ave', margin, yPos)
    yPos += 15
    doc.text('Sanford, FL 32771', margin, yPos)
    yPos += 15
    doc.text('Phone: 407-900-3442', margin, yPos)
    yPos += 15
    doc.text('Email: orlando@iyfusa.org', margin, yPos)
    yPos += 15
    doc.text('Website: www.iyforlando.org', margin, yPos)

    // Recipient information (right column) - get student info from database
    const rightColumnX = pageWidth - 200
    yPos = 100
    doc.setFont('helvetica','bold')
    doc.setFontSize(12)
    doc.text('Bill to', rightColumnX, yPos)
    doc.setFont('helvetica','normal')
    doc.setFontSize(10)
    yPos += 20
    doc.text(inv.studentName || 'Student Name', rightColumnX, yPos)
    
    // Get student email from registrations data
    const studentReg = regs.find(r => r.id === inv.studentId)
    if (studentReg?.email) {
      yPos += 15
      doc.text(`Email: ${studentReg.email}`, rightColumnX, yPos)
    }

    // Amount due section - removed due date
    yPos += 50
    doc.setFont('helvetica','bold')
    doc.setFontSize(14)
    const amountDue = inv.balance > 0 ? inv.balance : 0
    doc.text(`$${amountDue.toFixed(2)} USD`, margin, yPos)
    yPos += 25
    doc.setFont('helvetica','normal')
    doc.setFontSize(10)
    doc.text('Payment Methods:', margin, yPos)
    yPos += 15
    doc.text('• Cash', margin, yPos)
    yPos += 12
    doc.text('• Zelle: orlando@iyfusa.org', margin, yPos)

    // Line separator
    yPos += 25
    doc.setLineWidth(0.5)
    doc.line(margin, yPos, pageWidth - margin, yPos)

    // Line items table
    yPos += 25
    const tableStartY = yPos
    
    // Table headers
    doc.setFont('helvetica','bold')
    doc.setFontSize(10)
    doc.text('Description', margin, yPos)
    doc.text('Qty', margin + 200, yPos)
    doc.text('Unit price', margin + 250, yPos)
    doc.text('Amount', margin + 350, yPos)
    
    // Header line
    yPos += 8
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 15

    // Table rows
    doc.setFont('helvetica','normal')
    doc.setFontSize(10)
    
    // Academy items
    inv.lines.forEach(line => {
      doc.text(line.academy, margin, yPos)
      doc.text(`P${line.period}`, margin + 5, yPos + 15)
      if (line.level) {
        doc.text(line.level, margin + 5, yPos + 30)
      }
      doc.text(line.qty.toString(), margin + 200, yPos)
      doc.text(usd(line.unitPrice), margin + 250, yPos)
      doc.text(usd(line.amount), margin + 350, yPos)
      yPos += 45
    })

    // Lunch items
    if (inv.lunchAmount && inv.lunchAmount > 0) {
      if (inv.lunch?.semesterSelected) {
        doc.text('Lunch Semester', margin, yPos)
        doc.text('1', margin + 200, yPos)
        doc.text(usd(inv.lunch?.prices?.semester || 0), margin + 250, yPos)
        doc.text(usd(inv.lunch?.prices?.semester || 0), margin + 350, yPos)
        yPos += 25
      }
      if (inv.lunch?.singleQty && inv.lunch?.singleQty > 0) {
        doc.text('Lunch Single-Day', margin, yPos)
        doc.text(inv.lunch.singleQty.toString(), margin + 200, yPos)
        const unitPrice = inv.lunch?.prices?.single || 0
        doc.text(usd(unitPrice), margin + 250, yPos)
        doc.text(usd(inv.lunch.singleQty * unitPrice), margin + 350, yPos)
        yPos += 25
      }
    }

    // Totals section (right aligned)
    const totalsStartX = pageWidth - 150
    yPos = Math.max(yPos, tableStartY + 120)
    
    doc.setFont('helvetica','normal')
    doc.setFontSize(10)
    doc.text('Subtotal', totalsStartX, yPos)
    doc.text(usd(inv.subtotal + (inv.lunchAmount || 0)), totalsStartX + 80, yPos)
    yPos += 20

    if (inv.discountAmount && inv.discountAmount > 0) {
      doc.text('Discount', totalsStartX, yPos)
      doc.text(`-${usd(inv.discountAmount)}`, totalsStartX + 80, yPos)
      yPos += 20
    }

    doc.setFont('helvetica','bold')
    doc.setFontSize(12)
    doc.text('Total', totalsStartX, yPos)
    doc.text(usd(inv.total), totalsStartX + 80, yPos)
    yPos += 25

    if (amountDue > 0) {
      doc.text('Amount due', totalsStartX, yPos)
      doc.text(`$${amountDue.toFixed(2)} USD`, totalsStartX + 80, yPos)
    } else {
      doc.setFontSize(16)
      doc.setTextColor(0, 128, 0)
      doc.text('PAID', totalsStartX, yPos)
      doc.setTextColor(0, 0, 0)
    }

    // Save file
    const filename = inv.id.startsWith('PREVIEW-') 
      ? `invoice-preview-${inv.studentName?.replace(/\s+/g,'_')}-${Date.now()}.pdf`
      : `invoice-${inv.studentName?.replace(/\s+/g,'_')}-${inv.id}.pdf`
    doc.save(filename)
  }

  /* ---------- Payment Records Functions ---------- */
  const handleRowClick = React.useCallback((params: any) => {
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

  const lunchUnitSemester = Number(pricing.lunch?.semester || 0)
  const lunchUnitSingle = Number(pricing.lunch?.single || 0)

  const selectedInvoice = React.useMemo(() => {
    return studentInvoices.find(inv => inv.id === selectedInvoiceId)
  }, [studentInvoices, selectedInvoiceId])

  // Calculate the actual balance considering discount
  const selectedInvoiceRealBalance = React.useMemo(() => {
    if (!selectedInvoice) return 0
    const invoiceTotal = selectedInvoice.lines.reduce((sum, line) => sum + line.amount, 0)
    const lunchAmount = selectedInvoice.lunchAmount || 0
    const totalWithLunch = invoiceTotal + lunchAmount
    // Use the discount amount from the invoice, not the current state
    const invoiceDiscount = selectedInvoice.discountAmount || 0
    const discountedTotal = Math.max(0, totalWithLunch - invoiceDiscount)
    const currentPaid = Number(selectedInvoice.paid || 0)
    return Math.max(0, discountedTotal - currentPaid)
  }, [selectedInvoice])

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
        notifyError('Export Failed', 'Data not ready')
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
      notifyError('Export Failed', error?.message || 'Failed to export data')
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

                  {/* Invoices list */}
                  {student && (
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 1 }}>Invoices</Typography>
                        {studentInvoices.length === 0 && <Alert severity="info">No invoices yet. Compose a new one on the right.</Alert>}
                        <List dense>
                          {studentInvoices.map(inv => (
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
                                  primary={`${usd(inv.total)} • Paid ${usd(inv.paid)} • Bal ${usd(inv.balance)}`}
                                  secondary={inv.status.toUpperCase()}
                                />
                              </ListItemButton>
                            </ListItem>
                          ))}
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
                                        console.error(`Failed to delete payment ${payment.id}:`, error)
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
                    <Divider sx={{ mb: 2 }} />

                    <Stack spacing={1.25}>
                      {lines.map((li, idx) => (
                        <Grid key={`${li.academy}-${li.period}-${idx}`} container spacing={1} alignItems="center">
                          <Grid item xs={12} sm={7}><Typography variant="body2"><b>{li.academy}</b> — P{li.period}{li.level ? ` — ${li.level}` : ''}</Typography></Grid>
                          <Grid item xs={4} sm={2}><TextField size="small" label="Unit" value={usd(li.unitPrice)} InputProps={{ readOnly: true }} fullWidth /></Grid>
                          <Grid item xs={4} sm={1}><TextField size="small" label="Qty" value={li.qty} InputProps={{ readOnly: true }} fullWidth /></Grid>
                          <Grid item xs={4} sm={2}><TextField size="small" label="Amount" value={usd(li.amount)} InputProps={{ readOnly: true }} fullWidth /></Grid>
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
                      <Typography variant="h6">Apply Payment</Typography>
                      {selectedInvoice && (
                        <Chip size="small" label={`${selectedInvoice.status.toUpperCase()} • Bal ${usd(selectedInvoiceRealBalance)}`} color={selectedInvoiceRealBalance === 0 ? 'success' : (selectedInvoice.paid > 0 ? 'warning' : 'default')} />
                      )}
                    </Stack>
                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <TextField size="small" type="number" label="Amount" value={payAmount} onChange={(e)=> setPayAmount(Number(e.target.value))} fullWidth />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField select size="small" label="Method" value={method} onChange={(e)=> setMethod(e.target.value as any)} fullWidth>
                          <MenuItem value="none">Select</MenuItem>
                          <MenuItem value="cash">Cash</MenuItem>
                          <MenuItem value="zelle">Zelle</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Stack direction="row" spacing={1}>
                          <Button variant="outlined" onClick={recordPayment} disabled={!student || !selectedInvoice || selectedInvoiceRealBalance === 0}>Save</Button>
                          <Button variant="text" onClick={payRemaining} disabled={!selectedInvoice || selectedInvoiceRealBalance === 0}>Pay Remaining</Button>
                        </Stack>
                      </Grid>
                    </Grid>
                    {!selectedInvoice && <Alert severity="info" sx={{ mt: 2 }}>Select an invoice from the list to apply a payment.</Alert>}
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
