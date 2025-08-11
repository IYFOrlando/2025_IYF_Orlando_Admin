import * as React from 'react'
import {
  Card, CardHeader, CardContent, Grid, Stack, Button, Chip,
  TextField, Autocomplete, Divider, Typography, MenuItem, Alert,
  List, ListItem, ListItemText, ListItemButton, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Box
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, updateDoc, runTransaction, deleteDoc } from 'firebase/firestore'
import Swal from 'sweetalert2'

import { db } from '../../../lib/firebase'
import { useRegistrations } from '../../registrations/hooks/useRegistrations'
import type { Registration } from '../../registrations/types'
import { usePricingSettings } from '../../pricing/hooks/usePricingSettings'
import type { PricingDoc, InvoiceLine, Invoice, Payment } from '../../payments/types'
import { isKoreanLanguage, mapKoreanLevel, norm, usd } from '../../../lib/query'
import { notifySuccess } from '../../../lib/alerts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const INV = 'academy_invoices'
const PAY = 'academy_payments'

function priceFor(academy?: string, _level?: string | null, _period?: 1 | 2, pricing?: PricingDoc) {
  if (!academy || !pricing) return 0
  const a = norm(academy)
  const base = pricing.academyPrices?.[a]
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

export default function PaymentsPage() {
  const { data: regs } = useRegistrations()
  const { data: pricing, savePricing } = usePricingSettings()

  const [student, setStudent] = React.useState<StudentOption | null>(null)
  const [studentInvoices, setStudentInvoices] = React.useState<Invoice[]>([])
  const [studentPayments, setStudentPayments] = React.useState<Payment[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string | null>(null)

  // composer
  const [lines, setLines] = React.useState<InvoiceLine[]>([])
  const [lunchSemester, setLunchSemester] = React.useState<boolean>(false)
  const [lunchSingleQty, setLunchSingleQty] = React.useState<number>(0)
  const [discountAmount, setDiscountAmount] = React.useState<number>(0)
  const [discountNote, setDiscountNote] = React.useState<string>('')

  // payment
  const [method, setMethod] = React.useState<'cash'|'zelle'|'none'>('none')
  const [payAmount, setPayAmount] = React.useState<number>(0)

  // minimal Pricing dialog
  const [openPricing, setOpenPricing] = React.useState(false)
  const [editMap, setEditMap] = React.useState<Record<string, number>>({})
  const [editLunchSem, setEditLunchSem] = React.useState<number>(Number(pricing.lunch?.semester || 0))
  const [editLunchSingle, setEditLunchSingle] = React.useState<number>(Number(pricing.lunch?.single || 0))
  const [newAcademy, setNewAcademy] = React.useState('')
  const [newPrice, setNewPrice] = React.useState<number>(0)

  // edit payment dialog
  const [openEditPay, setOpenEditPay] = React.useState(false)
  const [editPayment, setEditPayment] = React.useState<Payment | null>(null)
  const [editAmount, setEditAmount] = React.useState<number>(0)
  const [editMethod, setEditMethod] = React.useState<'cash'|'zelle'>('cash')

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
  }, [student?.id])

  React.useEffect(() => {
    if (!student?.reg) { setLines([]); return }
    const r = student.reg
    const p1Paid = tuitionFullyPaidForSelected({ ...r, secondPeriod: undefined } as any, studentInvoices)
    const p2Paid = tuitionFullyPaidForSelected({ ...r, firstPeriod: undefined } as any, studentInvoices)

    const L: InvoiceLine[] = []
    const a1 = norm(r.firstPeriod?.academy)
    if (a1 && a1.toLowerCase() !== 'n/a' && !p1Paid) {
      const unit = priceFor(a1, r.firstPeriod?.level || null, 1, pricing)
      L.push({ academy: a1, period: 1, level: isKoreanLanguage(a1) ? mapKoreanLevel(r.firstPeriod?.level) : null, unitPrice: unit, qty: 1, amount: unit })
    }
    const a2 = norm(r.secondPeriod?.academy)
    if (a2 && a2.toLowerCase() !== 'n/a' && !p2Paid) {
      const unit = priceFor(a2, r.secondPeriod?.level || null, 2, pricing)
      L.push({ academy: a2, period: 2, level: isKoreanLanguage(a2) ? mapKoreanLevel(r.secondPeriod?.level) : null, unitPrice: unit, qty: 1, amount: unit })
    }
    setLines(L)
    setLunchSemester(false); setLunchSingleQty(0); setDiscountAmount(0); setDiscountNote('')
  }, [student?.id, pricing, studentInvoices])

  const subtotal = React.useMemo(() => lines.reduce((s, l) => s + Number(l.amount || 0), 0), [lines])
  const lunchUnitSemester = Number(pricing.lunch?.semester || 0)
  const lunchUnitSingle = Number(pricing.lunch?.single || 0)
  const lunchAmount = React.useMemo(
    () => (lunchSemester ? lunchUnitSemester : 0) + (lunchSingleQty * lunchUnitSingle),
    [lunchSemester, lunchSingleQty, lunchUnitSemester, lunchUnitSingle]
  )
  const gross = React.useMemo(() => subtotal + lunchAmount, [subtotal, lunchAmount])
  const discount = Math.min(discountAmount || 0, gross)
  const total = Math.max(gross - discount, 0)

  const selectedInvoice = React.useMemo(
    () => studentInvoices.find(i => i.id === selectedInvoiceId) || null,
    [studentInvoices, selectedInvoiceId]
  )

  const openTuition = hasOpenTuitionInvoice(studentInvoices)
  const tuitionFullyPaid = student?.reg ? tuitionFullyPaidForSelected(student.reg, studentInvoices) : false
  const composerHasTuition = lines.length > 0

  async function savePricingNow() {
    const next: PricingDoc = {
      academyPrices: Object.fromEntries(Object.entries(editMap).filter(([k]) => k && k.trim()).map(([k,v]) => [k.trim(), Number(v || 0)])),
      items: [],
      lunch: { semester: Number(editLunchSem || 0), single: Number(editLunchSingle || 0) },
    }
    await savePricing(next)
    setOpenPricing(false)
    notifySuccess('Pricing updated')
  }

  const createInvoice = async (mode: 'normal' | 'lunchOnly' = 'normal') => {
    if (!student) return Swal.fire({ title: 'Select a student first', icon: 'info' })
    if (mode === 'normal' && openTuition && composerHasTuition) return Swal.fire({ title: 'Open tuition invoice exists', text: 'Apply payments or create lunch-only.', icon: 'warning' })
    if (tuitionFullyPaid && composerHasTuition) return Swal.fire({ title: 'Tuition fully paid', text: 'Create lunch-only invoice if needed.', icon: 'info' })

    const effectiveLines = mode === 'lunchOnly' ? [] : lines
    const effectiveSubtotal = effectiveLines.reduce((s, l) => s + Number(l.amount || 0), 0)
    const effectiveGross = effectiveSubtotal + lunchAmount
    const effectiveDiscount = Math.min(discountAmount || 0, effectiveGross)
    const effectiveTotal = Math.max(effectiveGross - effectiveDiscount, 0)

    if (effectiveLines.length === 0 && lunchAmount <= 0) return Swal.fire({ title: 'Nothing to invoice', icon: 'warning' })

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
    notifySuccess('Invoice created', `Total: ${usd(effectiveTotal)}`)
  }

  const recordPayment = async () => {
    if (!student) return Swal.fire({ title: 'Select a student', icon: 'info' })
    if (!selectedInvoice) return Swal.fire({ title: 'Select an invoice', icon: 'info' })
    if (selectedInvoice.balance === 0) return Swal.fire({ title: 'Invoice already paid', icon: 'info' })
    if (method === 'none') return Swal.fire({ title: 'Select a payment method', icon: 'warning' })
    if (!payAmount || payAmount <= 0) return Swal.fire({ title: 'Enter an amount', icon: 'warning' })

    await addDoc(collection(db, PAY), {
      invoiceId: selectedInvoice.id,
      studentId: student.id,
      amount: Number(payAmount),
      method,
      createdAt: serverTimestamp(),
    } as any)

    const newPaid = Number(selectedInvoice.paid || 0) + Number(payAmount)
    const balance = Math.max(Number(selectedInvoice.total) - newPaid, 0)
    const status: Invoice['status'] = newPaid <= 0 ? 'unpaid' : (balance > 0 ? 'partial' : 'paid')
    await updateDoc(doc(db, INV, selectedInvoice.id), { paid: newPaid, balance, status, updatedAt: serverTimestamp(), method } as any)

    notifySuccess('Payment recorded', `${usd(payAmount)} applied`)
    setPayAmount(0)
  }

  const payRemaining = () => { if (selectedInvoice) setPayAmount(Number(selectedInvoice.balance || 0)) }

  const deletePayment = async (p: Payment) => {
    const res = await Swal.fire({ title: 'Delete this payment?', text: `${usd(p.amount)} (${p.method.toUpperCase()}) will be removed.`, icon: 'warning', showCancelButton: true, confirmButtonText: 'Delete' })
    if (!res.isConfirmed) return
    await runTransaction(db, async (tx) => {
      const invRef = doc(db, INV, p.invoiceId)
      const payRef = doc(db, PAY, p.id)
      const invSnap = await tx.get(invRef)
      if (!invSnap.exists()) throw new Error('Invoice not found')
      const inv = invSnap.data() as any
      const newPaid = Math.max(0, Number(inv.paid || 0) - Number(p.amount || 0))
      const balance = Math.max(Number(inv.total || 0) - newPaid, 0)
      const status: Invoice['status'] = newPaid <= 0 ? 'unpaid' : (balance > 0 ? 'partial' : 'paid')
      tx.update(invRef, { paid: newPaid, balance, status, updatedAt: serverTimestamp() })
      tx.delete(payRef)
    })
    notifySuccess('Payment removed', `- ${usd(p.amount)}`)
  }

  const openEditPaymentDialog = (p: Payment) => {
    setEditPayment(p); setEditAmount(Number(p.amount || 0)); setEditMethod((p.method || 'cash') as any); setOpenEditPay(true)
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
      const status: Invoice['status'] = newPaid <= 0 ? 'unpaid' : (balance > 0 ? 'partial' : 'paid')
      tx.update(invRef, { paid: newPaid, balance, status, updatedAt: serverTimestamp() })
      tx.update(payRef, { amount: newAmt, method: editMethod })
    })
    setOpenEditPay(false); setEditPayment(null)
    notifySuccess('Payment updated', `${usd(newAmt)} (${editMethod.toUpperCase()})`)
  }

  const deleteInvoice = async (inv: Invoice) => {
    if (Number(inv.paid || 0) > 0) return Swal.fire({ title: 'Cannot delete', text: 'Invoice has payments. Remove payments first.', icon: 'info' })
    const res = await Swal.fire({ title: 'Delete invoice?', text: `This will remove invoice ${inv.id}.`, icon: 'warning', showCancelButton: true })
    if (!res.isConfirmed) return
    await deleteDoc(doc(db, INV, inv.id))
    notifySuccess('Invoice deleted')
    if (selectedInvoiceId === inv.id) setSelectedInvoiceId(null)
  }

  const generateReceipt = (inv: Invoice) => {
    const docx = new jsPDF({ unit:'pt', format:'a4' })
    const mx = 48
    const now = new Date().toLocaleString()
    docx.setFont('helvetica','bold'); docx.setFontSize(16)
    docx.text('IYF Orlando — Payment Receipt', mx, 56)
    docx.setFont('helvetica','normal'); docx.setFontSize(11)
    docx.text(`Generated: ${now}`, mx, 76)
    docx.text(`Student: ${inv.studentName}`, mx, 96)
    docx.text(`Invoice ID: ${inv.id}`, mx, 114)
    const head = [['Academy', 'Period', 'Level', 'Unit', 'Qty', 'Amount']]
    const body = (inv.lines || []).map(l => [l.academy, `P${l.period}`, l.level || '', usd(l.unitPrice), l.qty, usd(l.amount)])
    if (inv.lunchAmount && inv.lunchAmount > 0) {
      if (inv.lunch?.semesterSelected) body.push(['Lunch Semester','','',usd(inv.lunch?.prices?.semester||0),1,usd(inv.lunch?.prices?.semester||0)])
      if (inv.lunch?.singleQty && inv.lunch?.singleQty > 0) {
        const up = inv.lunch?.prices?.single || 0
        body.push(['Lunch Single-Day','','',usd(up),inv.lunch.singleQty,usd(inv.lunch.singleQty*up)])
      }
    }
    autoTable(docx, { startY: 140, head, body, theme: 'grid', margin: { left: mx, right: mx }, styles: { fontSize: 10 }, headStyles: { fillColor: [240,240,240] } })
    let y = (docx as any).lastAutoTable.finalY + 14
    docx.setFont('helvetica','normal'); docx.setFontSize(11)
    docx.text(`Subtotal: ${usd(inv.subtotal)}`, mx, y); y += 16
    docx.text(`Lunch: ${usd(inv.lunchAmount || 0)}`, mx, y); y += 16
    if (inv.discountAmount && inv.discountAmount > 0) { docx.text(`Discount: -${usd(inv.discountAmount)} ${inv.discountNote ? `(${inv.discountNote})` : ''}`, mx, y); y += 16 }
    docx.setFont('helvetica','bold')
    docx.text(`Total: ${usd(inv.total)}`, mx, y); y += 16
    docx.text(`Paid: ${usd(inv.paid)}`, mx, y); y += 16
    docx.text(`Balance: ${usd(inv.balance)}`, mx, y)
    if (inv.balance === 0) { docx.setFont('helvetica','bold'); docx.setFontSize(36); docx.text('PAID', 420, 80, { angle: -20 }) }
    docx.save(`receipt-${inv.studentName?.replace(/\s+/g,'_')}-${inv.id}.pdf`)
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card elevation={0} sx={{ borderRadius: 3 }}>
          <CardHeader
            title="Payments & Invoices"
            subheader="Search → auto-price → lunch → discount → invoice → payments → receipt • Now with edit/delete"
            action={
              <Tooltip title="Pricing settings">
                <IconButton onClick={()=>setOpenPricing(true)} aria-label="pricing"><SettingsIcon /></IconButton>
              </Tooltip>
            }
          />
          <CardContent>
            <Grid container spacing={3}>
              {/* LEFT */}
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

                  {/* Invoices */}
                  {student && (
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 1 }}>Invoices</Typography>
                        {studentInvoices.length === 0 && <Alert severity="info">No invoices yet. Compose a new one on the right.</Alert>}
                        <List dense>
                          {studentInvoices.map(inv => (
                            <ListItem key={inv.id} disablePadding
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

                  {/* Payment history */}
                  {student && (
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 1 }}>Payment History</Typography>
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

              {/* RIGHT */}
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
                          <TextField size="small" type="number" label="Discount / Exoneration" value={discountAmount} onChange={(e)=> setDiscountAmount(Math.max(Number(e.target.value || 0), 0))} fullWidth />
                        </Grid>
                        <Grid item xs={12} sm={8}>
                          <TextField size="small" label="Discount Note" value={discountNote} onChange={(e)=> setDiscountNote(e.target.value)} fullWidth />
                        </Grid>
                      </Grid>

                      <Divider />
                      <Stack spacing={0.5} sx={{ ml: 'auto', maxWidth: 360 }}>
                        <Stack direction="row" justifyContent="space-between"><span>Subtotal</span><b>{usd(subtotal)}</b></Stack>
                        <Stack direction="row" justifyContent="space-between"><span>Lunch</span><b>{usd(lunchAmount)}</b></Stack>
                        <Stack direction="row" justifyContent="space-between"><span>Discount</span><b>-{usd(discount)}</b></Stack>
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
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>

                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                      <Typography variant="h6">Apply Payment</Typography>
                      {selectedInvoice && (
                        <Chip size="small" label={`${selectedInvoice.status.toUpperCase()} • Bal ${usd(selectedInvoice.balance)}`} color={selectedInvoice.balance === 0 ? 'success' : (selectedInvoice.paid > 0 ? 'warning' : 'default')} />
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
                          <Button variant="outlined" onClick={recordPayment} disabled={!student || !selectedInvoice || selectedInvoice.balance === 0}>Save</Button>
                          <Button variant="text" onClick={payRemaining} disabled={!selectedInvoice || selectedInvoice.balance === 0}>Pay Remaining</Button>
                        </Stack>
                      </Grid>
                    </Grid>
                    {!selectedInvoice && <Alert severity="info" sx={{ mt: 2 }}>Select an invoice from the list to apply a payment.</Alert>}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Pricing dialog */}
      <Dialog open={openPricing} onClose={()=>setOpenPricing(false)} fullWidth maxWidth="sm">
        <DialogTitle>Pricing</DialogTitle>
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
                  <IconButton onClick={()=>{ const n={...editMap}; delete n[name]; setEditMap(n) }} aria-label="delete" size="small">✕</IconButton>
                </React.Fragment>
              ))}
              <TextField size="small" placeholder="Add academy" value={newAcademy} onChange={(e)=> setNewAcademy(e.target.value)} />
              <TextField size="small" type="number" placeholder="Price" value={newPrice} onChange={(e)=> setNewPrice(Number(e.target.value || 0))} />
              <IconButton onClick={()=>{ if(!newAcademy.trim())return; setEditMap(p=>({ ...p, [newAcademy.trim()]: Number(newPrice||0) })); setNewAcademy(''); setNewPrice(0) }} aria-label="add" size="small">＋</IconButton>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpenPricing(false)}>Cancel</Button>
          <Button variant="contained" onClick={savePricingNow}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Edit payment dialog */}
      <Dialog open={openEditPay} onClose={()=>setOpenEditPay(false)} fullWidth maxWidth="xs">
        <DialogTitle>Edit payment</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField type="number" label="Amount" value={editAmount} onChange={(e)=>setEditAmount(Number(e.target.value||0))} />
            <TextField select label="Method" value={editMethod} onChange={(e)=>setEditMethod(e.target.value as any)}>
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="zelle">Zelle</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpenEditPay(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEditedPayment}>Save</Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}