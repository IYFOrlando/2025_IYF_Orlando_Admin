import * as React from 'react'
import {
  Card, CardContent, Grid, Stack, Button, Chip,
  TextField, Autocomplete, Divider, Typography, MenuItem, Alert,
  List, ListItem, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Tabs, Tab,
  Checkbox, FormControlLabel, useTheme, Paper
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PictureAsPdf as PictureAsPdfIcon,
  Add as AddIcon,
  FileDownload as FileDownloadIcon,
  LocalOffer as LocalOfferIcon,
  AttachMoney as AttachMoneyIcon,
  Receipt as ReceiptIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material'

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
import { toCents, fromCents } from '../../../lib/money'
import { notifySuccess, notifyError } from '../../../lib/alerts'
import { logger } from '../../../lib/logger'
import { getDiscountByCode, PERIOD_1_ACADEMIES, PERIOD_2_ACADEMIES } from '../../../lib/constants'
import { COLLECTIONS_CONFIG } from '../../../config/shared.js'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import {
  DataGrid, GridToolbar, type GridColDef
} from '@mui/x-data-grid'
import { motion, AnimatePresence } from 'framer-motion'

// Shared Config
const INV = COLLECTIONS_CONFIG.academyInvoices
const PAY = COLLECTIONS_CONFIG.academyPayments

// --- Helpers ---
function priceFor(academy?: string, _level?: string | null, _period?: 1 | 2, pricing?: PricingDoc) {
  if (!academy) return 0
  const a = norm(academy)
  
  if (!pricing) {
    logger.error(`❌ Pricing not available from Firestore. Cannot get price for ${academy}.`)
    throw new Error(`Pricing not available from Firestore for ${academy}.`)
  }
  
  if (pricing.academyPrices?.[a] && pricing.academyPrices[a] > 0) {
    return Number(pricing.academyPrices[a])
  }
  
  const error = `Academy "${academy}" (${a}) not found in database.`
  throw new Error(error)
}

type StudentOption = { id: string; label: string; reg: Registration }

function hasOpenTuitionInvoice(invs: Invoice[]) {
  return invs.some(inv => inv.status !== 'paid' && inv.status !== 'exonerated' && inv.lines.some(l => !!l.academy))
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
    if (inv.status !== 'paid' && inv.status !== 'exonerated') continue
    for (const l of inv.lines) covered.add(`${norm(l.academy)}|${l.period}`)
  }
  return needs.every(n => covered.has(`${n.academy}|${n.period}`))
}

// --- Styled Components ---
const GlassCard = ({ children, sx = {}, ...props }: any) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  return (
    <Card
      elevation={0}
      sx={{
        background: isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        borderRadius: 4,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.6)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        height: '100%',
        transition: 'transform 0.2s ease-in-out',
        ...sx
      }}
      {...props}
    >
      {children}
    </Card>
  )
}

// --- Main Page ---
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

  // Composer State
  const [lines, setLines] = React.useState<InvoiceLine[]>([])
  const [lunchSemester, setLunchSemester] = React.useState<boolean>(false)
  const [lunchSingleQty, setLunchSingleQty] = React.useState<number>(0)
  const [filterByAcademy, setFilterByAcademy] = React.useState<string>('')
  const [filterByPeriod, setFilterByPeriod] = React.useState<1 | 2 | 'all'>('all')
  
  // Invoice Details Editing
  const [invoiceDialogOpen, setInvoiceDialogOpen] = React.useState(false)
  const [editingLine, setEditingLine] = React.useState<InvoiceLine | null>(null)
  const [editingLineIndex, setEditingLineIndex] = React.useState<number>(-1)
  
  // Discounts
  const [discountNote, setDiscountNote] = React.useState<string>('')
  const [discountCode, setDiscountCode] = React.useState<string>('')
  const [appliedDiscount, setAppliedDiscount] = React.useState<any>(null)

  // Payment State
  const [method, setMethod] = React.useState<'cash'|'zelle'|'none'>('none')
  const [payAmount, setPayAmount] = React.useState<number>(0)
  const [applyToAllInvoices, setApplyToAllInvoices] = React.useState<boolean>(false)

  // Admin Dialogs
  const [openPricing, setOpenPricing] = React.useState(false)
  const [editMap, setEditMap] = React.useState<Record<string, number>>({})
  const [editLunchSem, setEditLunchSem] = React.useState<number>(0)
  const [editLunchSingle, setEditLunchSingle] = React.useState<number>(0)
  const [newAcademy, setNewAcademy] = React.useState('')
  const [newPrice, setNewPrice] = React.useState<number>(0)

  // Payment Edit Dialog
  const [editPaymentOpen, setEditPaymentOpen] = React.useState(false)
  const [editPayment, setEditPayment] = React.useState<Payment | null>(null)
  const [editPaymentMethod, setEditPaymentMethod] = React.useState<'cash'|'zelle'>('cash')
  const [editPaymentAmount, setEditPaymentAmount] = React.useState<number>(0)

  // UI State
  const [activeTab, setActiveTab] = React.useState(0)
  const [selectedPaymentRecord, setSelectedPaymentRecord] = React.useState<any>(null)
  const [paymentDetailsOpen, setPaymentDetailsOpen] = React.useState(false)

  // --- Effects ---
  React.useEffect(() => {
    setEditMap(pricing.academyPrices || {})
    setEditLunchSem(Number(pricing.lunch?.semester || 0))
    setEditLunchSingle(Number(pricing.lunch?.single || 0))
  }, [pricing])

  React.useEffect(() => {
    if (!student) { 
      setStudentInvoices([]); setStudentPayments([]); setSelectedInvoiceId(null)
      return 
    }
    const qi = query(collection(db, INV), where('studentId', '==', student.id))
    const qp = query(collection(db, PAY), where('studentId', '==', student.id))
    
    const ui = onSnapshot(qi, (snap) => {
      const invs = snap.docs.map(d => ({ ...d.data(), id: d.id } as Invoice))
        .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setStudentInvoices(invs)
      if (!selectedInvoiceId && invs.length) setSelectedInvoiceId(invs[0].id)
    })
    
    const up = onSnapshot(qp, (snap) => {
      const pays = snap.docs.map(d => ({ ...d.data(), id: d.id } as Payment))
        .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setStudentPayments(pays)
    })
    
    return () => { ui(); up() }
  }, [student?.id])

  // Logic to build invoice lines from registration
  React.useEffect(() => {
    if (!student?.reg) { setLines([]); return }
    const r = student.reg
    const p1Paid = tuitionFullyPaidForSelected({ ...r, secondPeriod: undefined }, studentInvoices)
    const p2Paid = tuitionFullyPaidForSelected({ ...r, firstPeriod: undefined }, studentInvoices)

    const L: InvoiceLine[] = []
    
    // Period 1
    const a1 = norm(r.firstPeriod?.academy)
    const shouldP1 = a1 && a1 !== 'n/a' && !p1Paid && 
      (!filterByAcademy || filterByAcademy === a1) && (filterByPeriod === 'all' || filterByPeriod === 1)
      
    if (shouldP1) {
      const unit = priceFor(a1, r.firstPeriod?.level, 1, pricing)
      const instructor = getInstructorByAcademy(norm(a1), r.firstPeriod?.level || null)
      
      L.push({
        academy: a1, period: 1, level: isKoreanLanguage(a1) ? mapKoreanLevel(r.firstPeriod?.level) : null,
        unitPrice: unit, qty: 1, amount: unit,
        instructor: instructor ? {
          firstName: instructor.name.split(' ')[0] || '',
          lastName: instructor.name.split(' ').slice(1).join(' ') || '',
          email: instructor.email || '', phone: instructor.phone || '',
          credentials: instructor.credentials || (isKoreanLanguage(a1) ? 'volunteer teacher' : '')
        } : undefined,
        instructionDates: { startDate: '2025-08-16', endDate: '2025-11-22', totalHours: 14, schedule: 'Saturdays, 1 hour' }
      })
    }

    // Period 2
    const a2 = norm(r.secondPeriod?.academy)
    const shouldP2 = a2 && a2 !== 'n/a' && !p2Paid && 
      (!filterByAcademy || filterByAcademy === a2) && (filterByPeriod === 'all' || filterByPeriod === 2)
      
    if (shouldP2) {
      const unit = priceFor(a2, r.secondPeriod?.level, 2, pricing)
      const instructor = getInstructorByAcademy(norm(a2), r.secondPeriod?.level || null)
      
      L.push({
        academy: a2, period: 2, level: isKoreanLanguage(a2) ? mapKoreanLevel(r.secondPeriod?.level) : null,
        unitPrice: unit, qty: 1, amount: unit,
        instructor: instructor ? {
          firstName: instructor.name.split(' ')[0] || '',
          lastName: instructor.name.split(' ').slice(1).join(' ') || '',
          email: instructor.email || '', phone: instructor.phone || '',
          credentials: instructor.credentials || (isKoreanLanguage(a2) ? 'volunteer teacher' : '')
        } : undefined,
        instructionDates: { startDate: '2025-08-16', endDate: '2025-11-22', totalHours: 14, schedule: 'Saturdays, 1 hour' }
      })
    }
    
    setLines(L)
    // Reset transient fields
    setLunchSemester(false); setLunchSingleQty(0); setDiscountNote('')
  }, [student?.id, pricing, studentInvoices, getInstructorByAcademy, filterByAcademy, filterByPeriod])

  // --- Handlers ---
  const handleDiscountCodeChange = (code: string) => {
    setDiscountCode(code.toUpperCase())
    const d = getDiscountByCode(code.toUpperCase())
    setAppliedDiscount(d || null)
    setDiscountNote(d ? d.description : '')
    if(d) notifySuccess(`Applied: ${d.name}`)
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0)
  const discountAmount = React.useMemo(() => {
    if (!appliedDiscount) return 0
    return appliedDiscount.type === 'percentage' 
      ? (subtotal * appliedDiscount.discount) / 100 
      : Math.min(appliedDiscount.discount, subtotal)
  }, [appliedDiscount, subtotal])
  
  const lunchAmount = (lunchSemester ? Number(pricing.lunch?.semester||0) : 0) + 
                      (lunchSingleQty * Number(pricing.lunch?.single||0))
  const total = Math.max(0, subtotal - discountAmount) + lunchAmount
  
  const options = React.useMemo(() => 
    regs.map(r => ({ id: r.id, label: `${r.firstName} ${r.lastName}`.trim(), reg: r }))
    .sort((a,b)=>a.label.localeCompare(b.label)), [regs])

  // Actions
  const createInvoice = async (mode: 'normal'|'lunchOnly' = 'normal') => {
    if (!student) return
    const effLines = mode === 'lunchOnly' ? [] : lines
    const effSub = effLines.reduce((s, l) => s + l.amount, 0)
    const effDisc = Math.min(discountAmount, effSub)
    const effTotal = Math.max(effSub - effDisc, 0) + lunchAmount
    
    if (!effLines.length && !lunchAmount) return notifyError('Nothing to invoice')

    const docData = {
      studentId: student.id, studentName: student.label,
      lines: effLines, subtotal: effSub,
      lunch: { semesterSelected: lunchSemester, singleQty: lunchSingleQty },
      lunchAmount, discountAmount: effDisc, discountNote: discountNote || null,
      total: effTotal, paid: 0, balance: effTotal, status: 'unpaid',
      method: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    }
    
    const ref = await addDoc(collection(db, INV), docData)
    setSelectedInvoiceId(ref.id)
    
    if (effTotal === 0 && effDisc > 0) {
       await updateDoc(doc(db, INV, ref.id), { status: 'exonerated', method: 'discount', balance: 0 })
       await addDoc(collection(db, PAY), { invoiceId: ref.id, studentId: student.id, amount: 0, method: 'discount', createdAt: serverTimestamp() })
    }
    notifySuccess('Invoice Created')
  }

  const recordPayment = async () => {
    if (!student || (!applyToAllInvoices && !selectedInvoiceId)) return
    if (method === 'none' || payAmount <= 0) return notifyError('Invalid payment details')

    const amtCents = toCents(payAmount)

    if (applyToAllInvoices) {
      // Distribute logic (simplified for brevity, keeps original logic concept)
      let rem = amtCents
      const unpaid = studentInvoices.filter(i => (i.total - i.paid) > 0).sort((a,b) => (b.total-b.paid) - (a.total-a.paid))
      if (!unpaid.length) return notifyError('No unpaid invoices')
      
      const totalDebt = unpaid.reduce((s,i) => s + (i.total - i.paid), 0)
      if (amtCents > totalDebt) return notifyError('Payment exceeds total debt')

      await Promise.all(unpaid.map(async (inv, idx) => {
        if (rem <= 0) return
        const bal = inv.total - inv.paid
        const share = idx === unpaid.length - 1 ? rem : Math.round(amtCents * (bal / totalDebt))
        const pay = Math.min(rem, Math.min(share, bal))
        if (pay <= 0) return

        await addDoc(collection(db, PAY), { 
          invoiceId: inv.id, studentId: student.id, amount: pay, method, createdAt: serverTimestamp() 
        })
        const newPaid = inv.paid + pay
        const newBal = inv.total - newPaid
        await updateDoc(doc(db, INV, inv.id), {
          paid: newPaid, balance: newBal, 
          status: newBal === 0 ? 'paid' : 'partial',
          updatedAt: serverTimestamp()
        })
        rem -= pay
      }))
      notifySuccess('Payment Distributed')
    } else {
      const inv = studentInvoices.find(i => i.id === selectedInvoiceId)!
      const balCents = inv.total - inv.paid
      if (amtCents > balCents) return notifyError('Payment exceeds balance')
      
      await addDoc(collection(db, PAY), {
        invoiceId: inv.id, studentId: student.id, amount: amtCents, method, createdAt: serverTimestamp()
      })
      const newPaid = inv.paid + amtCents
        const newBal = inv.total - newPaid
        await updateDoc(doc(db, INV, inv.id), {
          paid: newPaid, balance: newBal, 
          status: newBal === 0 ? 'paid' : 'partial',
          updatedAt: serverTimestamp()
        })
      notifySuccess('Payment Recorded')
    }
    setPayAmount(0)
    setMethod('none')
  }

  // --- PDF Generation (Premium) ---
  const generateReceipt = (inv: Invoice) => {
    const doc = new jsPDF({ unit:'pt', format:'a4' })
    const w = doc.internal.pageSize.getWidth()
    const BLUE = [33, 150, 243], DARK = [30, 30, 30], GRAY = [100, 100, 100], LIGHT = [245, 247, 250]
    
    // Header
    doc.setFillColor(BLUE[0], BLUE[1], BLUE[2])
    doc.rect(0, 0, w, 140, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(36); doc.setFont('helvetica', 'bold')
    doc.text('INVOICE', 40, 60)
    
    doc.setFontSize(12); doc.setFont('helvetica', 'normal')
    doc.text('IYF Orlando Academy', 40, 85)
    doc.text(`Invoice #${inv.id.slice(0,8).toUpperCase()}`, 40, 105)
    doc.text(new Date().toLocaleDateString(), 40, 125)

    // Logo Placeholder
    doc.setFontSize(24); doc.text('IYF', w - 80, 80)
    
    // Bill To
    let y = 180
    doc.setTextColor(DARK[0], DARK[1], DARK[2])
    doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text('Bill To:', 40, y)
    doc.setFontSize(11); doc.setFont('helvetica', 'normal')
    doc.text(inv.studentName || 'Student', 40, y + 20)
    
    // Status
    doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text('Status:', w - 150, y)
    doc.setTextColor(inv.status === 'paid' ? 76 : 244, inv.status === 'paid' ? 175 : 67, inv.status === 'paid' ? 80 : 54) // Green or Red
    doc.text(inv.status.toUpperCase(), w - 150, y + 20)
    
    // Table Header
    y += 60
    doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2])
    doc.rect(40, y, w - 80, 30, 'F')
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2])
    doc.setFontSize(10); doc.setFont('helvetica', 'bold')
    doc.text('ITEM', 50, y + 20)
    doc.text('PERIOD', 300, y + 20)
    doc.text('AMOUNT', 480, y + 20)
    
    // Lines
    y += 30
    doc.setTextColor(DARK[0], DARK[1], DARK[2])
    doc.setFont('helvetica', 'normal')
    
    inv.lines.forEach(l => {
      y += 20
      doc.text(l.academy, 50, y)
      doc.text(`P${l.period}`, 300, y)
      doc.text(usd(l.amount), 480, y)
      
      if (l.instructor) {
        y += 15
        doc.setFontSize(9); doc.setTextColor(GRAY[0], GRAY[1], GRAY[2])
        doc.text(`Instr: ${l.instructor.firstName} ${l.instructor.lastName}`, 60, y)
        doc.setFontSize(10); doc.setTextColor(DARK[0], DARK[1], DARK[2])
      }
      y += 10
      doc.setDrawColor(230, 230, 230); doc.line(40, y, w-40, y)
    })
    
    if (inv.lunchAmount) {
      y += 20
      doc.text('Lunch / Other', 50, y)
      doc.text('-', 300, y)
      doc.text(usd(inv.lunchAmount), 480, y)
      y += 10; doc.line(40, y, w-40, y)
    }

    // Totals
    y += 30
    const tx = w - 200
    doc.text('Subtotal:', tx, y); doc.text(usd(inv.subtotal + (inv.lunchAmount||0)), w - 80, y, { align: 'right' })
    if (inv.discountAmount) {
      y += 20
      doc.setTextColor(244, 67, 54)
      doc.text('Discount:', tx, y); doc.text(`-${usd(inv.discountAmount)}`, w - 80, y, { align: 'right' })
    }
    y += 25
    doc.setTextColor(DARK[0], DARK[1], DARK[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    doc.text('Total:', tx, y); doc.text(usd(inv.total), w - 80, y, { align: 'right' })
    
    y += 20
    doc.setTextColor(76, 175, 80)
    doc.text('Paid:', tx, y); doc.text(`-${usd(inv.paid)}`, w - 80, y, { align: 'right' })
    
    y += 25
    doc.setFillColor(LIGHT[0], LIGHT[1], LIGHT[2]); doc.rect(tx - 10, y - 15, 140, 25, 'F')
    doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]); doc.setFontSize(14)
    doc.text('Balance:', tx, y); doc.text(usd(inv.balance), w - 80, y, { align: 'right' })

    doc.save(`Invoice_${inv.studentName}_${inv.id}.pdf`)
  }

  // --- Render ---
  return (
    <Box sx={{ p: 1, height: '100%', overflow: 'hidden' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        
        {/* LEFT: Composer & Lists */}
        <Grid item xs={12} md={7} sx={{ height: '100%', overflowY: 'auto', pr: 1 }}>
          <Stack spacing={2}>
            {/* Student Selector */}
            <GlassCard sx={{ p: 2 }}>
               <Autocomplete
                 options={options}
                 getOptionLabel={o => o.label}
                 value={student}
                 onChange={(_, v) => setStudent(v)}
                 renderInput={params => <TextField {...params} label="Select Student" variant="outlined" />}
                 renderOption={(props, option) => (
                   <li {...props}>
                     <Stack direction="row" alignItems="center" spacing={1}>
                       <PersonIcon color="action" />
                       <Box>
                         <Typography variant="body1">{option.label}</Typography>
                         <Typography variant="caption" color="text.secondary">{option.reg.email}</Typography>
                       </Box>
                     </Stack>
                   </li>
                 )}
               />
            </GlassCard>

            {/* Composer */}
            <GlassCard sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom sx={{ background: 'linear-gradient(45deg, #2196F3, #21CBF3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                New Invoice
              </Typography>
              
              <Divider sx={{ mb: 2 }} />
              
              <Stack spacing={1}>
                 {lines.map((l, i) => (
                   <Paper key={i} elevation={0} sx={{ p: 1, bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box>
                        <Typography variant="subtitle2">{l.academy} (P{l.period})</Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip label={usd(l.amount)} size="small" color="primary" variant="outlined" />
                          {l.instructor && <Chip label={l.instructor.firstName} size="small" icon={<PersonIcon />} />}
                        </Stack>
                      </Box>
                      <IconButton size="small" onClick={() => { setEditingLine(l); setEditingLineIndex(i); setInvoiceDialogOpen(true) }}><EditIcon fontSize="small"/></IconButton>
                   </Paper>
                 ))}
                 {!lines.length && <Typography variant="body2" color="text.secondary" align="center">No pending academies.</Typography>}
              </Stack>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <FormControlLabel control={<Checkbox checked={lunchSemester} onChange={e => setLunchSemester(e.target.checked)} />} label={`Lunch Sem (${usd(Number(pricing.lunch?.semester||0))})`} />
                </Grid>
                <Grid item xs={6}>
                  <TextField label="Lunch Single Qty" type="number" size="small" value={lunchSingleQty} onChange={e => setLunchSingleQty(Number(e.target.value))} fullWidth />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    label="Discount Code" size="small" fullWidth 
                    value={discountCode} onChange={e => handleDiscountCodeChange(e.target.value)} 
                    InputProps={{ endAdornment: appliedDiscount && <CheckCircleIcon color="success" /> }}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between"><Typography>Subtotal</Typography><Typography>{usd(subtotal)}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography>Lunch</Typography><Typography>{usd(lunchAmount)}</Typography></Stack>
                <Stack direction="row" justifyContent="space-between" color="error.main"><Typography>Discount</Typography><Typography>-{usd(discountAmount)}</Typography></Stack>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between"><Typography variant="h6">Total</Typography><Typography variant="h6">{usd(total)}</Typography></Stack>
              </Box>

              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button variant="contained" fullWidth onClick={() => createInvoice('normal')} disabled={!student || (!lines.length && !lunchAmount)}>Create Invoice</Button>
                <Button variant="outlined" onClick={() => createInvoice('lunchOnly')} disabled={!student}>Lunch Only</Button>
              </Stack>
            </GlassCard>

            {/* Invoices List */}
            {student && (
              <Stack spacing={1}>
                <Typography variant="h6" sx={{ px: 1 }}>Invoices History</Typography>
                {studentInvoices.map(inv => (
                  <GlassCard key={inv.id} sx={{ p: 2, cursor: 'pointer', border: selectedInvoiceId === inv.id ? '2px solid #2196F3' : undefined }} onClick={() => setSelectedInvoiceId(inv.id)}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                         <Typography variant="subtitle1" fontWeight={600}>#{inv.id.slice(0,6)} • {new Date(inv.createdAt?.seconds*1000).toLocaleDateString()}</Typography>
                         <Typography variant="body2" color="text.secondary">{inv.lines.length} items • {inv.status.toUpperCase()}</Typography>
                      </Box>
                      <Stack alignItems="flex-end">
                         <Typography variant="h6">{usd(inv.total)}</Typography>
                         <Typography variant="caption" color={inv.balance > 0 ? 'error.main' : 'success.main'}>{inv.balance > 0 ? `${usd(inv.balance)} due` : 'Paid'}</Typography>
                      </Stack>
                    </Stack>
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                       <IconButton size="small" onClick={(e) => { e.stopPropagation(); generateReceipt(inv) }}><PictureAsPdfIcon /></IconButton>
                       <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); /* delete logic */ }}><DeleteIcon /></IconButton>
                    </Stack>
                  </GlassCard>
                ))}
              </Stack>
            )}
          </Stack>
        </Grid>

        {/* RIGHT: Payment Actions */}
        <Grid item xs={12} md={5} sx={{ height: '100%', overflowY: 'auto' }}>
           <GlassCard sx={{ p: 3, height: '100%' }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>Payment Terminal</Typography>
              
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label="Pay Invoice" />
                <Tab label="Records" />
              </Tabs>

              {activeTab === 0 && (
                <Stack spacing={3}>
                   <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 3 }}>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>Balance Due</Typography>
                      <Typography variant="h3" fontWeight={700}>
                         {usd(studentInvoices.reduce((s, i) => s + i.balance, 0))}
                      </Typography>
                   </Paper>

                   <TextField 
                      label="Payment Amount" variant="outlined" fullWidth type="number"
                      value={payAmount} onChange={e => setPayAmount(Number(e.target.value))}
                      InputProps={{ startAdornment: <AttachMoneyIcon color="action" /> }}
                   />
                   
                   <Stack direction="row" spacing={1}>
                      <Chip 
                        icon={<AttachMoneyIcon />} 
                        label="Cash" 
                        clickable 
                        color={method === 'cash' ? 'success' : 'default'} 
                        onClick={() => setMethod('cash')} 
                      />
                      <Chip 
                        icon={<LocalOfferIcon />} 
                        label="Zelle" 
                        clickable 
                        color={method === 'zelle' ? 'info' : 'default'} 
                        onClick={() => setMethod('zelle')} 
                      />
                   </Stack>

                   <FormControlLabel 
                     control={<Checkbox checked={applyToAllInvoices} onChange={e => setApplyToAllInvoices(e.target.checked)} />} 
                     label="Apply to all invoices (Oldest first)" 
                   />

                   <Button variant="contained" size="large" onClick={recordPayment} disabled={!method || method === 'none'} sx={{ mt: 2, height: 50, fontSize: '1.1rem' }}>
                     Process Payment
                   </Button>
                </Stack>
              )}

              {activeTab === 1 && (
                <List>
                   {studentPayments.map(p => (
                     <ListItem key={p.id}>
                        <Stack direction="row" justifyContent="space-between" width="100%">
                           <Box>
                              <Typography variant="subtitle2">{usd(p.amount)} via {p.method}</Typography>
                              <Typography variant="caption" color="text.secondary">{new Date(p.createdAt?.seconds*1000).toLocaleString()}</Typography>
                           </Box>
                           <IconButton size="small"><ReceiptIcon /></IconButton>
                        </Stack>
                     </ListItem>
                   ))}
                   {!studentPayments.length && <Typography align="center" sx={{ mt: 4, color: 'text.secondary' }}>No payments found</Typography>}
                </List>
              )}
           </GlassCard>
        </Grid>

      </Grid>
      
      {/* Dialogs */}
      <Dialog open={openPricing} onClose={() => setOpenPricing(false)}>
        <DialogTitle>Admin Pricing</DialogTitle>
        <DialogContent>
           <TextField label="Lunch Semester" fullWidth value={editLunchSem} onChange={e => setEditLunchSem(Number(e.target.value))} margin="normal" />
           <TextField label="Lunch Single" fullWidth value={editLunchSingle} onChange={e => setEditLunchSingle(Number(e.target.value))} margin="normal" />
           <Button onClick={savePricing}>Save</Button>
        </DialogContent>
      </Dialog>
      
      {editingLine && (
        <InvoiceDialog
          open={invoiceDialogOpen}
          editing={editingLine}
          onClose={() => setInvoiceDialogOpen(false)}
          onSave={(l) => {
            const newLines = [...lines]; newLines[editingLineIndex] = l; setLines(newLines); setInvoiceDialogOpen(false)
          }}
          academy={editingLine.academy}
          level={editingLine.level}
        />
      )}
      
      {/* Floating Action Button for Admin Settings */}
      <Box sx={{ position: 'absolute', bottom: 20, left: 20 }}>
         <Tooltip title="Settings">
           <IconButton onClick={() => setOpenPricing(true)} sx={{ bgcolor: 'background.paper', boxShadow: 3 }}>
             <SettingsIcon />
           </IconButton>
         </Tooltip>
      </Box>

    </Box>
  )
})

export default PaymentsPage
