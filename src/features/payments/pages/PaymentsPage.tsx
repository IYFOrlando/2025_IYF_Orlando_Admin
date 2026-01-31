import * as React from 'react'
import {
  Card, Grid, Stack, Button, Chip,
  TextField, Autocomplete, Divider, Typography,
  List, ListItem, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Box, Tabs, Tab,
  Checkbox, FormControlLabel, useTheme, Paper, Alert,
  CircularProgress
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
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Mail as MailIcon,
  Undo as UndoIcon
} from '@mui/icons-material'
import {
  collection, addDoc, serverTimestamp, query, where, onSnapshot, doc,
  updateDoc, runTransaction, deleteDoc, getDoc
} from 'firebase/firestore'
import Swal from 'sweetalert2'

import { db } from '../../../lib/firebase'
import { useRegistrations } from '../../registrations/hooks/useRegistrations'
import type { Registration } from '../../registrations/types'
import { usePricingSettings } from '../../pricing/hooks/usePricingSettings'
import { useAcademyPricing } from '../hooks/useAcademyPricing'
import { useInvoices } from '../hooks/useInvoices'
import { usePayments } from '../hooks/usePayments'
import { useInstructors } from '../hooks/useInstructors'
import InvoiceDialog from '../components/InvoiceDialog'
import type { PricingDoc, InvoiceLine, Invoice, Payment } from '../types'
import { latestInvoicePerStudent } from '../utils'
import { isKoreanLanguage, mapKoreanLevel, norm, usd } from '../../../lib/query'
import { toCents, fromCents } from '../../../lib/money'
import { notifySuccess, notifyError } from '../../../lib/alerts'
import { logger } from '../../../lib/logger'
import { getDiscountByCode, PERIOD_1_ACADEMIES, PERIOD_2_ACADEMIES } from '../../../lib/constants'
import { COLLECTIONS_CONFIG } from '../../../config/shared.js'
import jsPDF from 'jspdf'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts'
import iyfLogo from '../../../assets/logo/IYF_logo.png' // Import Logo
import { sendEmail, formatPrice } from '../../../lib/emailService'

// Shared Config
const INV = COLLECTIONS_CONFIG.academyInvoices
const PAY = COLLECTIONS_CONFIG.academyPayments

// --- Helpers ---
/** Resolve academy name to a key in academyPrices (e.g. "Kids" → "kids academy") */
function resolvePriceKey(academy: string, academyPrices: Record<string, number>): string | null {
  const a = norm(academy)
  if (!a || a === 'n/a') return null
  if (academyPrices[a] != null) return a
  const key = Object.keys(academyPrices).find(
    (k) => k === a || k.includes(a) || a.includes(k) || norm(k).replace(/\s+/g, '') === a.replace(/\s+/g, '')
  )
  return key ?? null
}

function priceFor(academy?: string, _level?: string | null, _period?: 1 | 2, pricing?: PricingDoc): number {
  if (!academy) return 0
  const a = norm(academy)
  if (a === 'n/a') return 0

  if (!pricing) {
    logger.warn(`Pricing not available for ${academy}; using 0.`)
    return 0
  }

  const key = resolvePriceKey(academy, pricing.academyPrices || {})
  if (key != null && pricing.academyPrices![key] != null && pricing.academyPrices![key] > 0) {
    return Number(pricing.academyPrices![key])
  }

  logger.warn(`Academy "${academy}" not found in pricing; using 0. Add it in Admin Pricing (payments) or in academies_2026_spring.`)
  return 0
}

type StudentOption = { id: string; label: string; reg: Registration }



function paidAcademyKeys(invs: Invoice[]): Set<string> {
  const covered = new Set<string>()
  for (const inv of invs) {
    if (inv.status !== 'paid' && inv.status !== 'exonerated') continue
    for (const l of inv.lines) {
      const key = `${norm(l.academy)}|${(l.level || '').toString().trim().toLowerCase()}`
      covered.add(key)
    }
  }
  return covered
}

function tuitionFullyPaidForSelected(reg: Registration, invs: Invoice[]) {
  const r = reg as any
  const needs: string[] = []
  if (Array.isArray(r.selectedAcademies)) {
    r.selectedAcademies.forEach((a: { academy?: string; level?: string }) => {
      const ac = norm(a?.academy)
      if (ac && ac !== 'n/a') needs.push(`${ac}|${(a?.level || '').toString().trim().toLowerCase()}`)
    })
  } else {
  const a1 = norm(reg.firstPeriod?.academy)
  const a2 = norm(reg.secondPeriod?.academy)
    if (a1 && a1 !== 'n/a') needs.push(`${a1}|${(reg.firstPeriod?.level || '').toString().trim().toLowerCase()}`)
    if (a2 && a2 !== 'n/a') needs.push(`${a2}|${(reg.secondPeriod?.level || '').toString().trim().toLowerCase()}`)
  }
  if (!needs.length) return true
  const covered = paidAcademyKeys(invs)
  return needs.every((k) => covered.has(k))
}

// --- Styled Components ---
const GlassCard = ({ children, sx = {}, onClick, ...props }: any) => {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        background: isDark ? 'rgba(30, 30, 30, 0.6)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        borderRadius: 4,
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.6)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        height: '100%',
        transition: 'transform 0.2s ease-in-out',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { transform: 'scale(1.01)', borderColor: '#2196F3' } : {},
        ...sx
      }}
      {...props}
    >
      {children}
    </Card>
  )
}

import { useSearchParams } from 'react-router-dom'

// --- Main Page ---
const PaymentsPage = React.memo(() => {
  const [searchParams] = useSearchParams()
  const { data: regs } = useRegistrations()
  // Get academy prices from academies_2026_spring (single source of truth)
  const { academyPrices: academyPricesFromSpring } = useAcademyPricing()
  // Get lunch prices from settings/pricing
  const { data: settingsPricing, savePricing, refreshPricing } = usePricingSettings()
  
  // Combine both sources into a single pricing object
  const pricing: PricingDoc = React.useMemo(() => ({
    academyPrices: academyPricesFromSpring,
    lunch: settingsPricing.lunch || { semester: 4000, single: 400 },
    items: settingsPricing.items || [],
    currency: 'USD',
  }), [academyPricesFromSpring, settingsPricing.lunch, settingsPricing.items])
  // NOTE: allInvoices and allPayments are used for Export, do not remove
  const { data: allInvoices } = useInvoices()
  const { data: allPayments } = usePayments()
  const { getInstructorByAcademy } = useInstructors()
  const latestInvoices = React.useMemo(() => latestInvoicePerStudent(allInvoices ?? []), [allInvoices])

  const [student, setStudent] = React.useState<StudentOption | null>(null)
  
  // Auto-select student from URL
  React.useEffect(() => {
    const sid = searchParams.get('studentId')
    if (sid && regs.length > 0 && !student) {
      const found = regs.find(r => r.id === sid)
      if (found) {
        setStudent({ id: found.id, label: `${found.firstName} ${found.lastName}`.trim(), reg: found })
      }
    }
  }, [searchParams, regs]) // Don't include student in dependency to allow manual change

  const [studentInvoices, setStudentInvoices] = React.useState<Invoice[]>([])
  const [studentPayments, setStudentPayments] = React.useState<Payment[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string | null>(null)

  // Composer State
  const [lines, setLines] = React.useState<InvoiceLine[]>([])
  const [lunchSemester, setLunchSemester] = React.useState<boolean>(false)
  const [lunchSingleQty, setLunchSingleQty] = React.useState<number>(0) // Added for lint
  const [filterByAcademy] = React.useState<string>('')
  const [filterByPeriod] = React.useState<1 | 2 | 'all'>('all')

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

  // UI State
  const [activeTab, setActiveTab] = React.useState(0)

  // Auto-fix pricing conversion - reads directly from Firestore to avoid permission issues
  const autoFixPricing = React.useCallback(async () => {
    const MIN_REASONABLE_CENTS = 1000 // $10.00
    const MIN_LUNCH_CENTS = 100 // $1.00 for lunch (semester should be $40 = 4000, single should be $4 = 400)
    
    try {
      // Read directly from Firestore
      const pricingRef = doc(db, 'settings', 'pricing')
      const pricingSnap = await getDoc(pricingRef)
      
      if (!pricingSnap.exists()) {
        Swal.fire({ title: 'No hay datos', text: 'No se encontró el documento de precios', icon: 'info' })
        return
      }
      
      const data = pricingSnap.data() as any
      const academyPrices = data.academyPrices || {}
      const lunch = data.lunch || { semester: 0, single: 0 }
      
      const fixedPrices: Record<string, number> = {}
      const fixes: string[] = []
      let hasFixes = false
      
      // Check academy prices
      Object.keys(academyPrices).forEach(key => {
        const priceCents = Number(academyPrices[key] || 0)
        if (priceCents > 0 && priceCents < MIN_REASONABLE_CENTS) {
          // Likely stored in dollars, fix it
          const fixed = Math.round(priceCents * 100)
          fixedPrices[key] = fixed
          fixes.push(`${key}: $${(priceCents / 100).toFixed(2)} → $${(fixed / 100).toFixed(2)}`)
          hasFixes = true
        } else {
          fixedPrices[key] = priceCents
        }
      })
      
      // Check lunch prices - use lower threshold for lunch
      const lunchSem = Number(lunch.semester || 0)
      const lunchSingle = Number(lunch.single || 0)
      
      const fixedLunch = {
        semester: lunchSem > 0 && lunchSem < MIN_LUNCH_CENTS
          ? Math.round(lunchSem * 100)
          : lunchSem,
        single: lunchSingle > 0 && lunchSingle < MIN_LUNCH_CENTS
          ? Math.round(lunchSingle * 100)
          : lunchSingle
      }
      
      if (fixedLunch.semester !== lunchSem) {
        fixes.push(`Lunch Semester: $${(lunchSem / 100).toFixed(2)} → $${(fixedLunch.semester / 100).toFixed(2)}`)
        hasFixes = true
      }
      if (fixedLunch.single !== lunchSingle) {
        fixes.push(`Lunch Single: $${(lunchSingle / 100).toFixed(2)} → $${(fixedLunch.single / 100).toFixed(2)}`)
        hasFixes = true
      }
      
      if (hasFixes) {
        const fixesList = fixes.length > 0 ? '<br/><br/>' + fixes.map(f => `• ${f}`).join('<br/>') : ''
        const result = await Swal.fire({
          title: 'Corregir precios?',
          html: `Se detectaron precios guardados en dólares en lugar de centavos.${fixesList}<br/><br/>¿Deseas corregirlos automáticamente?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Sí, corregir',
          cancelButtonText: 'Cancelar',
          width: 500
        })
        
        if (result.isConfirmed) {
          try {
            await savePricing({
              academyPrices: Object.keys(fixedPrices).length > 0 ? fixedPrices : academyPrices,
              items: data.items || [],
              lunch: fixedLunch
            })
            notifySuccess('Precios corregidos', `Se corrigieron ${fixes.length} precio(s)`)
            // Force refresh of pricing data
            await refreshPricing()
            // Also reload page to ensure UI updates
            setTimeout(() => window.location.reload(), 1500)
          } catch (e: any) {
            console.error('Error saving pricing:', e)
            notifyError('Error al corregir', e?.message || 'No se pudieron guardar los cambios. Verifica que tengas permisos de escritura.')
          }
        }
      } else {
        Swal.fire({ 
          title: 'Todo correcto', 
          text: 'No se encontraron precios que necesiten corrección. Todos los precios están en centavos.',
          icon: 'success' 
        })
      }
    } catch (e: any) {
      console.error('Error reading pricing:', e)
      notifyError('Error al leer precios', e?.message || 'No se pudieron leer los precios. Verifica que tengas permisos de lectura.')
    }
  }, [savePricing])

  // --- Effects ---
  React.useEffect(() => {
    // Convert from cents to dollars for display in admin
    const pricesInDollars: Record<string, number> = {}
    if (pricing.academyPrices) {
      Object.keys(pricing.academyPrices).forEach(key => {
        pricesInDollars[key] = (pricing.academyPrices[key] || 0) / 100
      })
    }
    setEditMap(pricesInDollars)
    setEditLunchSem((Number(pricing.lunch?.semester || 0)) / 100)
    setEditLunchSingle((Number(pricing.lunch?.single || 0)) / 100)
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
  }, [student?.id, selectedInvoiceId])

  // Logic to build invoice lines from registration (supports selectedAcademies and legacy firstPeriod/secondPeriod)
  React.useEffect(() => {
    if (!student?.reg) { setLines([]); return }
    const r = student.reg as any
    const covered = paidAcademyKeys(studentInvoices)
    const L: InvoiceLine[] = []

    if (Array.isArray(r.selectedAcademies) && r.selectedAcademies.length > 0) {
      // 2026 structure: one line per academy in selectedAcademies that is not yet paid
      r.selectedAcademies.forEach((ac: { academy?: string; level?: string }, idx: number) => {
        const a = norm(ac?.academy)
        if (!a || a === 'n/a') return
        const key = `${a}|${(ac?.level || '').toString().trim().toLowerCase()}`
        if (covered.has(key)) return
        if (filterByAcademy && filterByAcademy !== a) return
        if (filterByPeriod !== 'all' && filterByPeriod !== idx + 1) return
        const unit = priceFor(a, ac?.level ?? null, (idx + 1) as 1 | 2, pricing)
        const instructor = getInstructorByAcademy(a, ac?.level ?? null)
        L.push({
          academy: a,
          period: (idx + 1) as 1 | 2,
          level: isKoreanLanguage(a) ? mapKoreanLevel(ac?.level) : null,
          unitPrice: unit,
          qty: 1,
          amount: unit,
          instructor: instructor
            ? {
                firstName: instructor.name.split(' ')[0] || '',
                lastName: instructor.name.split(' ').slice(1).join(' ') || '',
                email: instructor.email || '',
                phone: instructor.phone || '',
                credentials: instructor.credentials || (isKoreanLanguage(a) ? 'volunteer teacher' : ''),
              }
            : undefined,
          instructionDates: { startDate: '', endDate: '', totalHours: 14, schedule: 'Saturdays, 1 hour' },
        })
      })
    } else {
      // Legacy: firstPeriod / secondPeriod
      const p1Paid = tuitionFullyPaidForSelected({ ...r, secondPeriod: undefined }, studentInvoices)
      const p2Paid = tuitionFullyPaidForSelected({ ...r, firstPeriod: undefined }, studentInvoices)
      const a1 = norm(r.firstPeriod?.academy)
      const a2 = norm(r.secondPeriod?.academy)
      const shouldP1 = a1 && a1 !== 'n/a' && !p1Paid && (!filterByAcademy || filterByAcademy === a1) && (filterByPeriod === 'all' || filterByPeriod === 1)
      const shouldP2 = a2 && a2 !== 'n/a' && !p2Paid && (!filterByAcademy || filterByAcademy === a2) && (filterByPeriod === 'all' || filterByPeriod === 2)
      if (shouldP1) {
        const unit = priceFor(a1, r.firstPeriod?.level, 1, pricing)
        const instructor = getInstructorByAcademy(a1, r.firstPeriod?.level || null)
        L.push({
        academy: a1,
        period: 1,
        level: isKoreanLanguage(a1) ? mapKoreanLevel(r.firstPeriod?.level) : null,
        unitPrice: unit, 
        qty: 1, 
        amount: unit,
          instructor: instructor ? { firstName: instructor.name.split(' ')[0] || '', lastName: instructor.name.split(' ').slice(1).join(' ') || '', email: instructor.email || '', phone: instructor.phone || '', credentials: instructor.credentials || (isKoreanLanguage(a1) ? 'volunteer teacher' : '') } : undefined,
          instructionDates: { startDate: '', endDate: '', totalHours: 14, schedule: 'Saturdays, 1 hour' },
        })
      }
      if (shouldP2) {
        const unit = priceFor(a2, r.secondPeriod?.level, 2, pricing)
        const instructor = getInstructorByAcademy(a2, r.secondPeriod?.level || null)
        L.push({
        academy: a2,
        period: 2,
        level: isKoreanLanguage(a2) ? mapKoreanLevel(r.secondPeriod?.level) : null,
        unitPrice: unit, 
        qty: 1, 
        amount: unit,
          instructor: instructor ? { firstName: instructor.name.split(' ')[0] || '', lastName: instructor.name.split(' ').slice(1).join(' ') || '', email: instructor.email || '', phone: instructor.phone || '', credentials: instructor.credentials || (isKoreanLanguage(a2) ? 'volunteer teacher' : '') } : undefined,
          instructionDates: { startDate: '2025-08-16', endDate: '2025-11-22', totalHours: 14, schedule: 'Saturdays, 1 hour' },
        })
      }
    }

    setLines(L)
    setLunchSemester(false)
    setLunchSingleQty(0)
    setDiscountNote('')
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
    if (studentInvoices.length > 0) {
      return notifyError('Este alumno ya tiene factura. Usa la factura existente en la lista o edítala desde Registrations.')
    }
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
        const newStatus = newBal === 0 ? 'paid' : 'partial' as const
        
        await updateDoc(doc(db, INV, inv.id), { 
          paid: newPaid, balance: newBal, 
          status: newStatus,
          updatedAt: serverTimestamp() 
        })
      
      notifySuccess('Payment Recorded')
      
      // Auto-email if fully paid
      if (newBal === 0) {
        // Construct updated invoice object for email
        const updatedKwargs = { ...inv, paid: newPaid, balance: newBal, status: newStatus } as Invoice
        handleEmailInvoice(updatedKwargs, true).then(() => {
           notifySuccess('Receipt emailed to student')
        })
      }
    }
      setPayAmount(0)
      setMethod('none')
  }
  
  const deleteInvoice = async (inv: Invoice) => {
    if (inv.paid > 0) return Swal.fire('Cannot delete', 'This invoice has payments. Delete payments first.', 'error')
    const res = await Swal.fire({ title: 'Delete?', text: `Remove invoice ${inv.id.slice(0,6)}?`, icon: 'warning', showCancelButton: true })
    if (res.isConfirmed) {
      await deleteDoc(doc(db, INV, inv.id))
      notifySuccess('Invoice deleted')
      if (selectedInvoiceId === inv.id) setSelectedInvoiceId(null)
    }
  }

  const deletePayment = async (p: Payment) => {
    const res = await Swal.fire({ title: 'Delete payment?', text: `${usd(p.amount)} will be removed.`, icon: 'warning', showCancelButton: true })
    if (!res.isConfirmed) return

    try {
    await runTransaction(db, async (tx) => {
      const invRef = doc(db, INV, p.invoiceId)
      const payRef = doc(db, PAY, p.id)
      const invSnap = await tx.get(invRef)
        
        if (invSnap.exists()) {
          const inv = invSnap.data() as Invoice
          const newPaid = Math.max(0, inv.paid - p.amount)
          const newBal = inv.total - newPaid
          const newStatus = newBal === 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'unpaid')
          tx.update(invRef, { paid: newPaid, balance: newBal, status: newStatus })
        }
        tx.delete(payRef)
      })
      notifySuccess('Payment deleted')
    } catch (e) {
      notifyError('Failed to delete payment', String(e))
    }
  }

  // --- Refund Logic ---
  const handleRefund = async (invoice: Invoice) => {
    if (invoice.paid <= 0) return notifyError('No payments to refund')

    const { value: refundAmount } = await Swal.fire({
      title: 'Issue Refund',
      text: `Max refund amount: ${usd(invoice.paid)}`,
      input: 'number',
      inputLabel: 'Amount to refund (positive number)',
      inputAttributes: { min: '0.01', max: (invoice.paid/100).toString(), step: '0.01' },
      showCancelButton: true
    })

    if (!refundAmount) return

    const amtCents = toCents(parseFloat(refundAmount))
    if (amtCents <= 0) return notifyError('Invalid amount')
    if (amtCents > invoice.paid) return notifyError('Refund exceeds paid amount')

    try {
      await addDoc(collection(db, PAY), {
        invoiceId: invoice.id,
        studentId: invoice.studentId,
        amount: -amtCents, // Negative for refund
        method: 'refund',
        createdAt: serverTimestamp()
      })
      
      const newPaid = invoice.paid - amtCents
      const newBal = invoice.total - newPaid
      const newStatus = newBal > 0 ? (newPaid > 0 ? 'partial' : 'unpaid') : 'paid'

      await updateDoc(doc(db, INV, invoice.id), {
        paid: newPaid,
        balance: newBal,
        status: newStatus,
        updatedAt: serverTimestamp()
      })
      
      notifySuccess(`Refunded ${usd(amtCents)}`)
    } catch (e) {
      notifyError('Refund failed', String(e))
    }
  }

  // --- Email Invoice Logic ---
  const [sendingEmailId, setSendingEmailId] = React.useState<string | null>(null)

  const handleEmailInvoice = async (invoice: Invoice, silent = false) => {
    // Prevent double send if button clicked
    if (!silent && sendingEmailId) return
    if (!silent) setSendingEmailId(invoice.id)

    try {
      // Find student email from registration or invoice if stored
      let emailTo = ''
      if (student && student.id === invoice.studentId) {
        emailTo = student.reg.email || ''
      } else {
        // Fallback: try to find in invoice or lookup registration
        // For now, if we are in the context of selected student, use that.
        // If not, we might fail to auto-email if student not loaded.
        // But recordPayment typically happens when student is selected.
        if (student) emailTo = student.reg.email || ''
      }
      
      if (!emailTo) {
        if (!silent) notifyError('No email found for student')
        return
      }

      const subject = `Invoice #${invoice.id.slice(0,8).toUpperCase()} - IYF Orlando Academy`
      const shortId = invoice.id.slice(0,8).toUpperCase()
      
      const html = `
        <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
          <h2 style="color: #00A3DA;">Invoice #${shortId}</h2>
          <p>Dear ${invoice.studentName},</p>
          <p>Here is your invoice for the IYF Orlando Academy.</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Total:</strong> ${formatPrice(invoice.total/100)}</p>
            <p><strong>Paid:</strong> ${formatPrice(invoice.paid/100)}</p>
            <p><strong>Balance Due:</strong> <span style="color: ${invoice.balance > 0 ? '#ef4444' : '#22c55e'}; font-weight: bold;">${formatPrice(invoice.balance/100)}</span></p>
            <p><strong>Status:</strong> ${invoice.status.toUpperCase()}</p>
          </div>

          <h3>Details</h3>
          <ul style="list-style: none; padding: 0;">
            ${invoice.lines.map(l => `
              <li style="border-bottom: 1px solid #e2e8f0; padding: 8px 0; display: flex; justify-content: space-between;">
                <span>${l.academy} ${l.period ? `(Period ${l.period})` : ''}</span>
                <span>${formatPrice(l.amount/100)}</span>
              </li>
            `).join('')}
             ${invoice.lunchAmount ? `
              <li style="border-bottom: 1px solid #e2e8f0; padding: 8px 0; display: flex; justify-content: space-between;">
                <span>Lunch / Other Services</span>
                <span>${formatPrice(invoice.lunchAmount/100)}</span>
              </li>` : ''}
              ${invoice.discountAmount ? `
              <li style="border-bottom: 1px solid #e2e8f0; padding: 8px 0; display: flex; justify-content: space-between; color: #ef4444;">
                <span>Discount</span>
                <span>-${formatPrice(invoice.discountAmount/100)}</span>
              </li>` : ''}
          </ul>
          
          <p style="margin-top: 30px; font-size: 0.9em; color: #64748b;">
            Thank you for being part of IYF Orlando Academy.<br>
            If you have questions, contact us at admin@iyforlando.com.
          </p>
        </div>
      `

      const result = await sendEmail({
        to: emailTo,
        subject,
        html,
        toName: invoice.studentName
      })

      if (result.success) {
        if (!silent) notifySuccess('Email sent successfully')
      } else {
        if (!silent) notifyError(result.error || 'Failed to send email')
      }

    } catch (e: any) {
      if (!silent) notifyError('Error sending email', e.message)
    } finally {
      if (!silent) setSendingEmailId(null)
    }
  }

  const handleExportExcel = () => {
    if (!allInvoices || !allPayments) return notifyError('Data not loaded')
    
    const data = allPayments.map((p, i) => {
       const inv = allInvoices.find(v => v.id === p.invoiceId)
       return {
         ID: i+1,
         Student: inv?.studentName || 'Unknown',
         Amount: fromCents(p.amount),
         Method: p.method,
         Date: p.createdAt?.seconds ? new Date(p.createdAt.seconds*1000).toLocaleDateString() : ''
       }
    })
    
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, 'Payments')
    XLSX.writeFile(wb, `Payments_${new Date().toISOString().slice(0,10)}.xlsx`)
    notifySuccess('Exported')
  }

   // --- PDF Generation (Boxed Style - Previous Year) ---
  const generateReceipt = async (inv: Invoice) => {
    const doc = new jsPDF({ unit:'pt', format:'a4' })
    const w = doc.internal.pageSize.getWidth()
    // h removed (unused)
    
    // Colors
    const BRAND_BLUE = [21, 101, 192] // A structured boxy blue (Darker than cyan)
    const TEXT_DARK = [33, 33, 33]
    const TEXT_GRAY = [97, 97, 97]
    const GREEN = [76, 175, 80]
    const RED = [244, 67, 54]
    
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.src = src
        img.onload = () => resolve(img)
        img.onerror = reject
      })
    }

    // --- 1. HEADER BAR ---
    doc.setFillColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2])
    doc.rect(0, 0, w, 140, 'F')
    
    // Text Left
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(42)
    doc.text('INVOICE', 40, 60)
    
    doc.setFontSize(18)
    doc.setFont('helvetica', 'normal')
    doc.text('IYF Orlando Academy', 40, 85)
    
    doc.setFontSize(12)
    doc.text(`Invoice #${inv.id.slice(0,12).toUpperCase()}`, 40, 105)

    // Logo Right
    try {
      const logoImg = await loadImage(iyfLogo)
      // Keep aspect ratio, fit in height ~80
      const logoH = 90
      const logoW = (logoImg.width / logoImg.height) * logoH
      // Removed white circle background to fix "white stain" look
      doc.addImage(logoImg, 'PNG', w - 105, 25, logoW, logoH)
    } catch (e) {
      // Fallback
      doc.text('IYF', w - 80, 70)
    }

    // --- 2. INVOICE DETAILS BOX ---
    let y = 170
    doc.setDrawColor(224, 224, 224) // Light gray border
    doc.setLineWidth(1)
    doc.setFillColor(255, 255, 255)
    
    // Main Box
    doc.rect(40, y, w - 80, 110)
    
    // Box Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2])
    doc.text('Invoice Details', 55, y + 25)
    
    // Details Grid
    const col1 = 55
    const col2 = 150
    const rowH = 16
    let detailY = y + 50
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2])
    
    // Issue Date
    doc.text('Issue Date:', col1, detailY)
    doc.text(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), col2, detailY)
    
    // Status
    detailY += rowH
    doc.text('Status:', col1, detailY)
    doc.setTextColor(inv.balance <= 0 ? GREEN[0] : RED[0], inv.balance <= 0 ? GREEN[1] : RED[1], inv.balance <= 0 ? GREEN[2] : RED[2])
    doc.setFont('helvetica', 'bold')
    doc.text(inv.balance <= 0 ? 'PAID' : 'DUE', col2, detailY)
    
    // Amount Due
    detailY += rowH
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2])
    doc.setFont('helvetica', 'normal')
    doc.text('Amount Due:', col1, detailY)
    doc.setFont('helvetica', 'bold')
    doc.text(usd(inv.balance), col2, detailY)
    
    // Instruction Period
    detailY += rowH + 5
    doc.setFont('helvetica', 'normal')
    doc.text('Instruction Period:', col1, detailY)
    doc.setFont('helvetica', 'bold')
    doc.text('2026 Spring Semester', col2, detailY)
    
    // Payment Method & Date (Last used)
    if (inv.method) {
      detailY += rowH
      doc.setFont('helvetica', 'normal')
      doc.text('Payment Method:', col1, detailY)
      doc.setFont('helvetica', 'bold')
      doc.text(inv.method.toUpperCase(), col2, detailY)
    }
    
    if (inv.balance <= 0) {
       detailY += rowH
       doc.setFont('helvetica', 'normal')
       doc.text('Payment Date:', col1, detailY)
       doc.setFont('helvetica', 'bold')
       // Try to use update date or today
       const payDate = inv.updatedAt ? new Date(inv.updatedAt.seconds * 1000 || new Date()) : new Date()
       doc.text(payDate.toLocaleDateString(), col2, detailY)
    }

    // --- 3. FROM / TO BOXES ---
    y += 130
    const boxW = (w - 90) / 2
    const boxH = 110
    
    // Frorm Box
    doc.rect(40, y, boxW, boxH)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('From', 55, y + 20)
    doc.setFontSize(14)
    doc.text('IYF Orlando', 55, y + 40)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(TEXT_GRAY[0], TEXT_GRAY[1], TEXT_GRAY[2])
    let addrY = y + 60
    doc.text('320 S Park Ave', 55, addrY); addrY += 14
    doc.text('Sanford, FL 32771', 55, addrY); addrY += 14
    doc.text('Phone: 407-900-3442', 55, addrY); addrY += 14
    doc.text('orlando@iyfusa.org', 55, addrY)
    
    // Bill To Box
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2])
    doc.rect(40 + boxW + 10, y, boxW, boxH)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Bill To', 40 + boxW + 25, y + 20)
    
    doc.text('First Name:', 40 + boxW + 25, y + 45)
    doc.text('Last Name:', 40 + boxW + 25, y + 60)
    doc.text('Email:', 40 + boxW + 25, y + 75)
    
    doc.setFont('helvetica', 'bold') // Values Bold
    const nameParts = (inv.studentName || '').split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    
    doc.text(firstName, 40 + boxW + 90, y + 45)
    doc.text(lastName, 40 + boxW + 90, y + 60)
    
    // Lookup email if possible
    doc.text(student?.reg?.email || '', 40 + boxW + 90, y + 75)

    // --- 4. TABLE STYLES ---
    y += 140
    
    // Table Header Bar
    doc.setFillColor(BRAND_BLUE[0], BRAND_BLUE[1], BRAND_BLUE[2])
    doc.rect(40, y, w - 80, 25, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    
    // Columns (Removed Period)
    const xCourse = 55
    const xQty = 350
    const xPrice = 420
    const xAmount = w - 55
    
    doc.text('Academy / service', xCourse, y + 17)
    // Period removed
    doc.text('Qty', xQty, y + 17, { align: 'center' })
    doc.text('Unit Price', xPrice, y + 17, { align: 'right' })
    doc.text('Amount', xAmount, y + 17, { align: 'right' })
    
    // Table Rows
    y += 25
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2])
    doc.setFont('helvetica', 'normal')
    
    inv.lines.forEach((l, i) => {
      // Row Background (Zebra? No, minimal)
      if (i % 2 !== 0) {
        doc.setFillColor(248, 248, 248)
        doc.rect(40, y, w - 80, 30, 'F')
      }
      
      const rowY = y + 20
      // Course - Ensure Name
      doc.text(l.academy || (l as any).description || 'General', xCourse, rowY)
      // Period Removed
      // Qty
      doc.text(l.qty?.toString() || '1', xQty, rowY, { align: 'center' })
      // Unit Price
      doc.text(usd(l.unitPrice ?? l.amount), xPrice, rowY, { align: 'right' })
      // Amount
      doc.text(usd(l.amount), xAmount, rowY, { align: 'right' })
      
      y += 30
    })
    
    // Extras (Lunch/Discount)
    if (inv.lunchAmount) {
       const rowY = y + 20
       doc.text('Lunch / Other', xCourse, rowY)
       doc.text('1', xQty, rowY, { align: 'center' })
       doc.text(usd(inv.lunchAmount), xPrice, rowY, { align: 'right' })
       doc.text(usd(inv.lunchAmount), xAmount, rowY, { align: 'right' })
       y += 30
    }
    
    if (inv.discountAmount) {
       const rowY = y + 20
       doc.setTextColor(RED[0], RED[1], RED[2])
       doc.text('Discount', xCourse, rowY)
       doc.text('1', xQty, rowY, { align: 'center' })
       doc.text(`-${usd(inv.discountAmount)}`, xPrice, rowY, { align: 'right' })
       doc.text(`-${usd(inv.discountAmount)}`, xAmount, rowY, { align: 'right' })
       doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2])
       y += 30
    }

    // --- 5. TOTALS BOX ---
    // Bottom Right
    const totalsW = 200
    const totalsH = 110 // Increased for PAID stamp
    const totalsX = w - 40 - totalsW
    
    doc.setFillColor(248, 248, 248) // Light gray bg
    doc.rect(totalsX, y + 10, totalsW, totalsH, 'F')
    doc.setDrawColor(224, 224, 224)
    doc.rect(totalsX, y + 10, totalsW, totalsH, 'S') // Border
    
    let tY = y + 35
    const tLabelX = totalsX + 20
    const tValX = w - 60
    
    doc.setFontSize(10)
    doc.text('Subtotal', tLabelX, tY)
    doc.text(usd(inv.subtotal + (inv.lunchAmount||0)), tValX, tY, { align: 'right' })
    
    tY += 25
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Total', tLabelX, tY)
    doc.text(usd(inv.total), tValX, tY, { align: 'right' })
    
    tY += 25
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Paid', tLabelX, tY)
    doc.text(`${usd(inv.paid)}`, tValX, tY, { align: 'right' })
    
    // Status Stamp
    tY += 30
    if (inv.balance <= 0) {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(GREEN[0], GREEN[1], GREEN[2])
      doc.text('PAID', tLabelX, tY)
      doc.setFontSize(10)
      doc.text(usd(inv.paid), tValX, tY, { align: 'right' })
    } else {
      doc.setFontSize(14)
      doc.setTextColor(RED[0], RED[1], RED[2])
      doc.text('Balance Due', tLabelX, tY)
      doc.text(usd(inv.balance), tValX, tY, { align: 'right' })
    }

    doc.save(`Invoice_${inv.studentName}_${inv.id}.pdf`)
  }
  
  const savePricingNow = async () => {
     // Convert from dollars to cents for storage
     const pricesInCents: Record<string, number> = {}
     Object.keys(editMap).forEach(key => {
       pricesInCents[key] = Math.round((editMap[key] || 0) * 100)
     })
     
     await savePricing({
       academyPrices: pricesInCents,
       items: pricing.items || [],
       lunch: { 
         semester: Math.round(editLunchSem * 100), 
         single: Math.round(editLunchSingle * 100) 
       }
     })
     setOpenPricing(false)
     notifySuccess('Pricing updated')
  }

  // --- Render ---
  return (
    <Box sx={{ p: 1, height: '100%', overflow: 'hidden' }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        
        {/* LEFT: Composer & Lists */}
        <Grid item xs={12} md={7} sx={{ height: '100%', overflowY: 'auto', pr: 1 }}>
          <Stack spacing={2} component={motion.div} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            {/* Student Selector */}
            <GlassCard sx={{ p: 2 }}>
                  <Autocomplete
                    options={options}
                 getOptionLabel={o => o.label}
                    value={student}
                 onChange={(_, v) => setStudent(v)}
                 renderInput={params => <TextField {...params} label="Select Student" variant="outlined" />}
                 renderOption={(props, option) => {
                   return (
                     <li {...props} key={option.id}>
                       <Stack direction="row" alignItems="center" spacing={1}>
                         <PersonIcon color="action" />
                         <Box>
                           <Typography variant="body1">{option.label}</Typography>
                           <Typography variant="caption" color="text.secondary">{option.reg.email}</Typography>
                         </Box>
                       </Stack>
                     </li>
                   )
                 }}
               />
               <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 1 }}>
                 <Button size="small" startIcon={<FileDownloadIcon />} onClick={handleExportExcel}>Export Excel</Button>
               </Stack>
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
                        <Typography variant="subtitle2">{l.academy}</Typography>
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
                <AnimatePresence>
                {studentInvoices.map(inv => (
                  <motion.div key={inv.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <GlassCard sx={{ p: 2, cursor: 'pointer', border: selectedInvoiceId === inv.id ? '2px solid #2196F3' : undefined }} onClick={() => setSelectedInvoiceId(inv.id)}>
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
                       <IconButton size="small" onClick={(e) => { e.stopPropagation(); generateReceipt(inv) }} title="Download PDF"><PictureAsPdfIcon /></IconButton>
                       <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEmailInvoice(inv) }} title="Email Invoice" disabled={!!sendingEmailId}>
                          {sendingEmailId === inv.id ? <CircularProgress size={20} /> : <MailIcon />}
                       </IconButton>
                       {inv.paid > 0 && (
                         <IconButton size="small" color="warning" onClick={(e) => { e.stopPropagation(); handleRefund(inv) }} title="Issue Refund">
                           <UndoIcon />
                         </IconButton>
                       )}
                       <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); deleteInvoice(inv) }} title="Delete Invoice"><DeleteIcon /></IconButton>
                    </Stack>
                  </GlassCard>
                  </motion.div>
                ))}
                </AnimatePresence>
              </Stack>
                  )}
                </Stack>
              </Grid>

        {/* RIGHT: Payment Actions */}
        <Grid item xs={12} md={5} sx={{ height: '100%', overflowY: 'auto' }}>
           <GlassCard sx={{ p: 3, height: '100%' }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>Payment Terminal</Typography>
              
              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label="Dashboard" />
                <Tab label="Pay Invoice" />
                <Tab label="Records" />
              </Tabs>

              {activeTab === 0 && (
                <Stack spacing={3} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                   {/* One invoice per student (latest). Outstanding = sum of latest invoice balance only. */}
                   <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, bgcolor: 'primary.main', color: '#fff' }}>
                           <Typography variant="caption" sx={{ opacity: 0.8 }}>Total Revenue</Typography>
                           <Typography variant="h5" fontWeight={700}>
                             {usd(allInvoices?.reduce((s,i) => s + (i.paid ?? 0), 0) || 0)}
                              </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, bgcolor: '#ff9800', color: '#fff' }}>
                           <Typography variant="caption" sx={{ opacity: 0.8 }}>Outstanding</Typography>
                           <Typography variant="h5" fontWeight={700}>
                             {usd(latestInvoices.reduce((s,i) => s + (i.balance ?? 0), 0))}
                              </Typography>
                        </Paper>
                          </Grid>
                          </Grid>

                   {/* Charts Section */}
                      <Grid container spacing={2}>
                     <Grid item xs={12} lg={6}>
                        <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, height: 250 }}>
                          <Typography variant="subtitle2" gutterBottom>Revenue Status</Typography>
                          <Box sx={{ width: '100%', height: '90%', minHeight: 0, minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={[
                                { name: 'Paid', value: (latestInvoices.reduce((s,i) => s + (i.paid ?? 0), 0))/100 },
                                { name: 'Due', value: (latestInvoices.reduce((s,i) => s + (i.balance ?? 0), 0))/100 }
                              ]}>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RTooltip formatter={(v:any) => `$${v}`} />
                                <Bar dataKey="value" fill="#2196F3" radius={[4, 4, 0, 0]}>
                                  {
                                    [{ name: 'Paid', value: 0 }, { name: 'Due', value: 0 }].map((_entry, index) => (
                                      <Cell key={`cell-${index}`} fill={index === 0 ? '#4CAF50' : '#FF9800'} />
                                    ))
                                  }
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </Box>
                        </Box>
                        </Grid>
                     <Grid item xs={12} lg={6}>
                        <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, height: 250 }}>
                          <Typography variant="subtitle2" gutterBottom>Payment Methods</Typography>
                          <Box sx={{ width: '100%', height: '90%', minHeight: 0, minWidth: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={Object.entries(allPayments?.reduce((acc:any, p) => {
                                    const m = p.method || 'Unknown'
                                    acc[m] = (acc[m] || 0) + p.amount
                                    return acc
                                  }, {}) || {}).map(([name, value]) => ({ name, value: (value as number)/100 }))}
                                  cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5}
                                  dataKey="value"
                                >
                                  {['#0088FE', '#00C49F', '#FFBB28', '#FF8042'].map((color, index) => (
                                    <Cell key={`cell-${index}`} fill={color} />
                                  ))}
                                </Pie>
                                <RTooltip formatter={(v:any) => `$${v}`} />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </Box>
                        </Box>
                        </Grid>
                      </Grid>

                   {/* Recent Transactions */}
                   <Box sx={{ p: 2, border: '1px solid #eee', borderRadius: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Recent Transactions</Typography>
                      {(!allPayments || allPayments.length === 0) ? (
                        <Typography variant="body2" color="text.secondary">No transactions yet</Typography>
                      ) : (
                        <Stack spacing={1.5}>
                           {allPayments.slice().sort((a,b) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)).slice(0, 5).map(p => (
                             <Stack key={p.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                <Box>
                                   <Typography variant="subtitle2" fontWeight={600}>
                                      {allInvoices?.find(i => i.id === p.invoiceId)?.studentName || 'Student'}
                    </Typography>
                                   <Typography variant="caption" color="text.secondary">
                                      {p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'} • {p.method?.toUpperCase()}
                                   </Typography>
                                </Box>
                                <Typography fontWeight={700} color="success.main">
                                   +{usd(p.amount)}
                                </Typography>
                      </Stack>
                           ))}
                      </Stack>
                      )}
                   </Box>
                    </Stack>
              )}

              {activeTab === 2 && (
                <Stack spacing={3} component={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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
                     <ListItem key={p.id} 
                       secondaryAction={
                         <IconButton edge="end" onClick={() => deletePayment(p)} size="small" color="error"><DeleteIcon /></IconButton>
                       }
                     >
                        <Stack direction="row" justifyContent="space-between" width="100%">
                           <Box>
                              <Typography variant="subtitle2">{usd(p.amount)} via {p.method}</Typography>
                              <Typography variant="caption" color="text.secondary">{new Date(p.createdAt?.seconds*1000).toLocaleString()}</Typography>
                           </Box>
                           <ReceiptIcon color="action" />
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
      <Dialog open={openPricing} onClose={() => setOpenPricing(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>Admin Pricing</span>
            <Stack direction="row" spacing={1}>
                        <Button 
                          size="small"
                variant="outlined" 
                onClick={refreshPricing}
                startIcon={<span>🔄</span>}
              >
                Refresh
                        </Button>
                        <Button 
                          size="small"
                variant="contained" 
                color="warning"
                onClick={autoFixPricing}
                startIcon={<span>🔧</span>}
                sx={{ minWidth: 120 }}
              >
                Auto-Fix
                        </Button>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent>
           <Stack spacing={2} sx={{ mt: 1 }}>
             <Alert severity="warning" sx={{ mb: 2 }}>
               <Typography variant="body2">
                 Si ves precios como $0.40 en lugar de $40.00, usa el botón "Auto-Fix" arriba o abajo para corregirlos automáticamente.
                </Typography>
                  </Alert>
             <Box sx={{ borderBottom: 1, borderColor: 'divider', pb: 2 }}>
               <Typography variant="subtitle2" gutterBottom>Lunch settings (USD)</Typography>
            <Stack direction="row" spacing={2}>
                 <TextField label="Lunch Semester ($)" fullWidth size="small" value={editLunchSem} onChange={e => setEditLunchSem(Number(e.target.value))} type="number" inputProps={{ step: '0.01' }} />
                 <TextField label="Lunch Single ($)" fullWidth size="small" value={editLunchSingle} onChange={e => setEditLunchSingle(Number(e.target.value))} type="number" inputProps={{ step: '0.01' }} />
            </Stack>
            </Box>
             
             <Typography variant="subtitle2">Academy Prices (USD)</Typography>
             <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
               {[...PERIOD_1_ACADEMIES, ...PERIOD_2_ACADEMIES]
                 .filter((v, i, a) => a.indexOf(v) === i)
                 .sort()
                 .map(name => (
                   <Stack key={name} direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ flex: 1 }}>{name}</Typography>
            <TextField 
                        size="small" type="number" sx={{ width: 100 }} 
                        value={editMap[norm(name)] || 0}
                        onChange={e => setEditMap(prev => ({ ...prev, [norm(name)]: Number(e.target.value) }))}
                        inputProps={{ step: '0.01' }}
                        InputProps={{ startAdornment: <Typography sx={{ mr: 0.5 }}>$</Typography> }}
                      />
          </Stack>
                 ))
               }
             </Box>
             {/* Manual Add */}
             <Stack direction="row" spacing={1}>
                <TextField placeholder="Custom Academy" size="small" fullWidth value={newAcademy} onChange={e => setNewAcademy(e.target.value)} />
                <TextField placeholder="Price ($)" type="number" size="small" sx={{ width: 100 }} value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} inputProps={{ step: '0.01' }} />
                <IconButton onClick={() => { 
                   if(newAcademy) { 
                     setEditMap(prev => ({ ...prev, [norm(newAcademy)]: newPrice }))
                     setNewAcademy(''); setNewPrice(0)
                   }
                }}><AddIcon /></IconButton>
            </Stack>
           </Stack>
        </DialogContent>
        <DialogActions>
           <Button 
             variant="outlined" 
             color="warning"
             onClick={autoFixPricing}
             startIcon={<span>🔧</span>}
           >
             Auto-Fix Prices
           </Button>
           <Box sx={{ flexGrow: 1 }} />
           <Button onClick={() => setOpenPricing(false)}>Cancel</Button>
           <Button variant="contained" onClick={savePricingNow}>Save Changes</Button>
        </DialogActions>
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
      
      {/* Floating Action Button for Admin Settings - Right side to avoid sidebar */}
      <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
         <Tooltip title="Admin Pricing Settings">
           <IconButton 
             onClick={() => setOpenPricing(true)} 
             sx={{ 
               bgcolor: 'warning.main', 
               color: 'white',
               boxShadow: 3,
               '&:hover': { bgcolor: 'warning.dark' },
               width: 56,
               height: 56
             }}
           >
             <SettingsIcon />
           </IconButton>
         </Tooltip>
          </Box>

      {/* Also add a button in the top right for easier access */}
      <Box sx={{ position: 'fixed', top: 80, right: 20, zIndex: 1000 }}>
         <Button
           variant="contained"
           color="warning"
           startIcon={<SettingsIcon />}
           onClick={() => setOpenPricing(true)}
           sx={{ boxShadow: 3 }}
         >
           Pricing Settings
         </Button>
          </Box>

                    </Box>
  )
})

export default PaymentsPage
