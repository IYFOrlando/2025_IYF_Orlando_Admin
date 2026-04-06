
import * as React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, Typography, Stack,
  Chip, CircularProgress
} from '@mui/material'
import {
  AttachMoney as AttachMoneyIcon,
  LocalOffer as LocalOfferIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material'
import { notifySuccess, notifyError } from '../../../lib/alerts'
import { toCents } from '../../../lib/money'
import { usd } from '../../../lib/query'
import {
  getStudentInvoices,
  recordQuickPayment,
  type QuickInvoice,
} from '../../../lib/supabaseRegistrations'

type Props = {
  open: boolean
  onClose: () => void
  studentId: string
  studentName: string
  /** When provided (e.g. from drawer), use for display so it matches "Balance" from academies. */
  totalBalanceDueCents?: number
  /** When provided, called to create missing invoice so full balance can be paid. */
  onCreateMissingInvoice?: () => Promise<void>
  /** Called after a successful payment to refresh parent data */
  onPaymentSuccess?: () => void
}

export default function QuickPaymentDialog({
  open, onClose, studentId, studentName, totalBalanceDueCents,
  onCreateMissingInvoice, onPaymentSuccess
}: Props) {
  const [invoices, setInvoices] = React.useState<QuickInvoice[]>([])
  const [loading, setLoading] = React.useState(true)
  const [creatingInvoice, setCreatingInvoice] = React.useState(false)

  // Payment Form State
  const [payAmount, setPayAmount] = React.useState<number|string>('')
  const [method, setMethod] = React.useState<'cash'|'zelle'|'check'|'card'|'none'>('none')

  // Fetch Invoices from Supabase
  const fetchInvoices = React.useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    try {
      const data = await getStudentInvoices(studentId)
      setInvoices(data)
    } catch (e) {
      console.error('Error fetching student invoices:', e)
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [studentId])

  React.useEffect(() => {
    if (open && studentId) {
      fetchInvoices()
    }
  }, [open, studentId, fetchInvoices])

  const invoiceBalanceCents = invoices.reduce((sum, inv) => sum + inv.balance, 0)
  const displayBalanceCents = totalBalanceDueCents ?? invoiceBalanceCents

  const handlePayment = async () => {
    const rawAmt = Number(payAmount)
    if (isNaN(rawAmt) || rawAmt <= 0) return notifyError('Invalid Amount')
    if (method === 'none') return notifyError('Select Payment Method')

    const amtCents = toCents(rawAmt)
    
    // Filter unpaid invoices, oldest first
    const unpaid = invoices.filter(i => i.balance > 0)
                           .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    
    if (unpaid.length === 0) return notifyError('No unpaid invoices')

    if (amtCents > invoiceBalanceCents) {
      if (totalBalanceDueCents != null && totalBalanceDueCents > invoiceBalanceCents) {
        return notifyError(`Only ${usd(invoiceBalanceCents)} can be applied to existing invoices. Create an invoice for the remaining ${usd(totalBalanceDueCents - invoiceBalanceCents)} in Payments & Records.`)
      }
      return notifyError('Amount exceeds total balance')
    }

    try {
      let remaining = amtCents

      for (const inv of unpaid) {
        if (remaining <= 0) break

        const bal = Math.max(0, inv.total - inv.paid)
        const pay = Math.min(remaining, bal)
        
        // Record Payment via Supabase
        await recordQuickPayment(inv.id, studentId, pay, method)

        remaining -= pay
      }

      notifySuccess('Payment Recorded')
      setPayAmount('')
      setMethod('none')
      onPaymentSuccess?.()
      onClose()

    } catch (e: any) {
      notifyError('Payment Failed', e.message)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Receive Payment</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
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
                            // Refetch invoices after creating
                            await fetchInvoices()
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
                    <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
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
                        <Chip 
                            icon={<ConfirmationNumberIcon />} 
                            label="Check" 
                            clickable 
                            color={method === 'check' ? 'secondary' : 'default'} 
                            variant={method === 'check' ? 'filled' : 'outlined'}
                            onClick={() => setMethod('check')} 
                        />
                        <Chip 
                            icon={<ReceiptIcon />} 
                            label="Credit/Debit Card" 
                            clickable 
                            color={method === 'card' ? 'primary' : 'default'} 
                            variant={method === 'card' ? 'filled' : 'outlined'}
                            onClick={() => setMethod('card')} 
                        />
                    </Stack>
                 </Box>
                 
                 {/* Read-only info about distribution */}
                 <Typography variant="caption" color="text.secondary">
                    * Payment will be applied to the oldest unpaid invoices first.
                 </Typography>
            </Stack>
          </>
        )}
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
