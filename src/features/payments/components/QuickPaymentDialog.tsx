
import * as React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Stack,
  Chip
} from '@mui/material'
import {
  AttachMoney as AttachMoneyIcon,
  LocalOffer as LocalOfferIcon
} from '@mui/icons-material'
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { COLLECTIONS_CONFIG } from '../../../config/shared.js'
import { notifySuccess, notifyError } from '../../../lib/alerts'
import { toCents } from '../../../lib/money'
import { usd } from '../../../lib/query'
import type { Invoice } from '../types'

const INV = COLLECTIONS_CONFIG.academyInvoices
const PAY = COLLECTIONS_CONFIG.academyPayments

type Props = {
  open: boolean
  onClose: () => void
  studentId: string
  studentName: string
  /** When provided (e.g. from drawer), use for display so it matches "Balance" from academies. */
  totalBalanceDueCents?: number
  /** When provided, called to create missing invoice so full balance can be paid. Invoice list updates via snapshot. */
  onCreateMissingInvoice?: () => Promise<void>
}

export default function QuickPaymentDialog({ open, onClose, studentId, studentName, totalBalanceDueCents, onCreateMissingInvoice }: Props) {
  const [invoices, setInvoices] = React.useState<Invoice[]>([])
  const [loading, setLoading] = React.useState(true)
  const [creatingInvoice, setCreatingInvoice] = React.useState(false)

  // Payment Form State
  const [payAmount, setPayAmount] = React.useState<number|string>('')
  const [method, setMethod] = React.useState<'cash'|'zelle'|'none'>('none')

  // Fetch Invoices
  React.useEffect(() => {
    if (!open || !studentId) return
    setLoading(true)
    const q = query(collection(db, INV), where('studentId', '==', studentId))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as Invoice))
      list.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setInvoices(list)
      setLoading(false)
    })
    return () => unsub()
  }, [open, studentId])

  const invoiceBalanceCents = invoices.reduce((sum, inv) => sum + inv.balance, 0)
  const displayBalanceCents = totalBalanceDueCents ?? invoiceBalanceCents

  const handlePayment = async () => {
    const rawAmt = Number(payAmount)
    if (isNaN(rawAmt) || rawAmt <= 0) return notifyError('Invalid Amount')
    if (method === 'none') return notifyError('Select Payment Method')

    const amtCents = toCents(rawAmt)
    
    // Auto-distribute logic (simpler version: apply to oldest unpaid first)
    // Filter unpaid
    const unpaid = invoices.filter(i => i.balance > 0)
                           .sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0)) // Oldest first
    
    if (unpaid.length === 0) return notifyError('No unpaid invoices')

    if (amtCents > invoiceBalanceCents) {
      if (totalBalanceDueCents != null && totalBalanceDueCents > invoiceBalanceCents) {
        return notifyError(`Only ${usd(invoiceBalanceCents)} can be applied to existing invoices. Create an invoice for the remaining ${usd(totalBalanceDueCents - invoiceBalanceCents)} in Payments & Records.`)
      }
      return notifyError('Amount exceeds total balance')
    }

    try {
      let remaining = amtCents

      await Promise.all(unpaid.map(async (inv) => {
        if (remaining <= 0) return

        const bal = inv.balance
        const pay = Math.min(remaining, bal)
        
        // Record Payment
        await addDoc(collection(db, PAY), {
            invoiceId: inv.id,
            studentId,
            amount: pay,
            method,
            createdAt: serverTimestamp()
        })

        // Update Invoice
        const newPaid = inv.paid + pay
        const newBal = inv.total - newPaid
        const newStatus = newBal === 0 ? 'paid' : 'partial'
        
        await updateDoc(doc(db, INV, inv.id), {
            paid: newPaid,
            balance: newBal,
            status: newStatus,
            updatedAt: serverTimestamp()
        })

        remaining -= pay
      }))

      notifySuccess('Payment Recorded')
      setPayAmount('')
      setMethod('none')
      onClose()

    } catch (e: any) {
      notifyError('Payment Failed', e.message)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Receive Payment</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>Total Balance Due ({studentName})</Typography>
            <Typography variant="h3" fontWeight={700}>{usd(displayBalanceCents)}</Typography>
            {totalBalanceDueCents != null && invoiceBalanceCents < totalBalanceDueCents && (
              <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Only {usd(invoiceBalanceCents)} on existing invoices.
                </Typography>
                {onCreateMissingInvoice && (
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ borderColor: 'rgba(255,255,255,0.8)', color: 'white' }}
                    disabled={creatingInvoice}
                    onClick={async () => {
                      setCreatingInvoice(true)
                      try {
                        await onCreateMissingInvoice()
                        notifySuccess('Invoice created. You can now enter the full amount and process payment.')
                      } catch (e: any) {
                        notifyError('Could not create invoice', e?.message)
                      } finally {
                        setCreatingInvoice(false)
                      }
                    }}
                  >
                    {creatingInvoice ? 'Creating…' : `Create invoice for remaining ${usd(totalBalanceDueCents - invoiceBalanceCents)}`}
                  </Button>
                )}
              </Stack>
            )}
        </Box>

        <Stack spacing={3}>
             <TextField 
                label="Payment Amount" 
                fullWidth 
                value={payAmount} onChange={e => setPayAmount(e.target.value)}
                type="number"
                InputProps={{
                    startAdornment: <Box sx={{ mr: 1, color: 'text.secondary' }}>$</Box>
                }}
             />

             <Box>
                <Typography variant="subtitle2" gutterBottom>Payment Method</Typography>
                <Stack direction="row" spacing={1}>
                    <Chip 
                        icon={<AttachMoneyIcon />} 
                        label="Cash" 
                        clickable 
                        color={method === 'cash' ? 'success' : 'default'} 
                        variant={method === 'cash' ? 'filled' : 'outlined'}
                        onClick={() => setMethod('cash')} 
                    />
                    <Chip 
                        icon={<LocalOfferIcon />} 
                        label="Zelle" 
                        clickable 
                        color={method === 'zelle' ? 'info' : 'default'} 
                        variant={method === 'zelle' ? 'filled' : 'outlined'}
                        onClick={() => setMethod('zelle')} 
                    />
                </Stack>
             </Box>
             
             {/* Read-only info about distribution */}
             <Typography variant="caption" color="text.secondary">
                * Payment will be applied to the oldest unpaid invoices first.
             </Typography>
        </Stack>

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
            variant="contained" 
            onClick={handlePayment}
            disabled={!payAmount || Number(payAmount) <= 0 || method === 'none' || loading}
        >
            Process Payment
        </Button>
      </DialogActions>
    </Dialog>
  )
}
