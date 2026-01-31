
import { Box, Paper, Typography, Divider, Grid, Stack } from '@mui/material'
import { useInvoiceConfig } from '../../settings/hooks/useInvoiceConfig'

// Interface matching the Invoice type in typical usage
export interface Invoice {
  id: string
  studentName: string
  studentEmail?: string
  createdAt?: { seconds: number } | any
  updatedAt?: { seconds: number } | any
  subtotal: number
  discountAmount?: number
  // discount: number (legacy)
  total: number
  balance: number
  method?: string
  lines: Array<{
    academy?: string
    level?: string
    qty?: number
    unitPrice?: number
    amount: number
  }>
}

interface InvoiceDisplayProps {
  invoice: Invoice
}

// Helper for USD formatting
const usd = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100)
}

export function InvoiceDisplay({ invoice }: InvoiceDisplayProps) {
  const { config: invoiceConfig } = useInvoiceConfig()

  const BRAND_BLUE = '#1976d2'
  const TEXT_DARK = '#2c3e50'
  const TEXT_GRAY = '#7f8c8d'

  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        maxWidth: 800,
        mx: 'auto',
        border: '1px solid #e0e0e0'
      }}
    >
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h3" fontWeight="bold" color={BRAND_BLUE}>
            INVOICE
          </Typography>
          <Typography variant="body2" color={TEXT_GRAY}>
            #{invoice.id}
          </Typography>
        </Box>
        <Box textAlign="right">
          <Typography variant="h6" color={TEXT_DARK}>
            {invoiceConfig.organizationName}
          </Typography>
        </Box>
      </Stack>

      <Divider sx={{ mb: 3 }} />

      {/* Invoice Details */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={6}>
          <Typography variant="body2" color={TEXT_GRAY}>Invoice Date:</Typography>
          <Typography variant="body1" fontWeight="bold">
            {invoice.createdAt ? new Date(invoice.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body2" color={TEXT_GRAY}>Status:</Typography>
          <Typography
            variant="body1"
            fontWeight="bold"
            color={invoice.balance <= 0 ? 'success.main' : 'warning.main'}
          >
            {invoice.balance <= 0 ? 'PAID' : 'PENDING'}
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body2" color={TEXT_GRAY}>Instruction Period:</Typography>
          <Typography variant="body1" fontWeight="bold">
            {invoiceConfig.currentSemester}
          </Typography>
        </Grid>
        {invoice.method && (
          <Grid item xs={6}>
            <Typography variant="body2" color={TEXT_GRAY}>Payment Method:</Typography>
            <Typography variant="body1" fontWeight="bold">
              {invoice.method.toUpperCase()}
            </Typography>
          </Grid>
        )}
        {invoice.balance <= 0 && invoice.updatedAt && (
          <Grid item xs={6}>
            <Typography variant="body2" color={TEXT_GRAY}>Payment Date:</Typography>
            <Typography variant="body1" fontWeight="bold">
              {new Date(invoice.updatedAt.seconds * 1000).toLocaleDateString()}
            </Typography>
          </Grid>
        )}
      </Grid>

      <Divider sx={{ mb: 3 }} />

      {/* From / To */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color={TEXT_GRAY} mb={1}>FROM</Typography>
            <Typography variant="h6" fontWeight="bold" mb={1}>
              {invoiceConfig.organizationName}
            </Typography>
            <Typography variant="body2" color={TEXT_GRAY}>{invoiceConfig.addressLine1}</Typography>
            <Typography variant="body2" color={TEXT_GRAY}>{invoiceConfig.addressLine2}</Typography>
            <Typography variant="body2" color={TEXT_GRAY}>Phone: {invoiceConfig.phone}</Typography>
            <Typography variant="body2" color={TEXT_GRAY}>{invoiceConfig.email}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle2" color={TEXT_GRAY} mb={1}>BILL TO</Typography>
            <Typography variant="h6" fontWeight="bold" mb={1}>
              {invoice.studentName}
            </Typography>
            {invoice.studentEmail && (
              <Typography variant="body2" color={TEXT_GRAY}>{invoice.studentEmail}</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 2 }} />

      {/* Table */}
      <Box mb={3}>
        <Box
          sx={{
            bgcolor: BRAND_BLUE,
            color: 'white',
            p: 1.5,
            borderRadius: '4px 4px 0 0'
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={5}>
              <Typography variant="body2" fontWeight="bold">Academy / Levels</Typography>
            </Grid>
            <Grid item xs={2} textAlign="center">
              <Typography variant="body2" fontWeight="bold">Qty</Typography>
            </Grid>
            <Grid item xs={2} textAlign="right">
              <Typography variant="body2" fontWeight="bold">Unit Price</Typography>
            </Grid>
            <Grid item xs={3} textAlign="right">
              <Typography variant="body2" fontWeight="bold">Amount</Typography>
            </Grid>
          </Grid>
        </Box>

        {invoice.lines.map((line, index) => (
          <Box
            key={index}
            sx={{
              bgcolor: index % 2 === 0 ? 'white' : '#f8f8f8',
              p: 1.5,
              borderBottom: '1px solid #e0e0e0'
            }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={5}>
                <Typography variant="body2">
                  {line.level ? `${line.academy} - ${line.level}` : line.academy}
                </Typography>
              </Grid>
              <Grid item xs={2} textAlign="center">
                <Typography variant="body2">{line.qty || 1}</Typography>
              </Grid>
              <Grid item xs={2} textAlign="right">
                <Typography variant="body2">{usd(line.unitPrice ?? line.amount)}</Typography>
              </Grid>
              <Grid item xs={3} textAlign="right">
                <Typography variant="body2" fontWeight="bold">{usd(line.amount)}</Typography>
              </Grid>
            </Grid>
          </Box>
        ))}
      </Box>

      {/* Totals */}
      <Box sx={{ maxWidth: 300, ml: 'auto' }}>
        <Stack spacing={1}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color={TEXT_GRAY}>Subtotal:</Typography>
            <Typography variant="body2">{usd(invoice.subtotal)}</Typography>
          </Box>
          {(invoice.discountAmount || 0) > 0 && (
            <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color={TEXT_GRAY}>Discount:</Typography>
            <Typography variant="body2" color="success.main">-{usd(invoice.discountAmount || 0)}</Typography>
            </Box>
          )}
          <Divider />
          <Box display="flex" justifyContent="space-between">
            <Typography variant="h6" fontWeight="bold">Total:</Typography>
            <Typography variant="h6" fontWeight="bold" color={BRAND_BLUE}>
              {usd(invoice.total)}
            </Typography>
          </Box>
          {invoice.balance > 0 && (
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body1" fontWeight="bold" color="warning.main">
                Balance Due:
              </Typography>
              <Typography variant="body1" fontWeight="bold" color="warning.main">
                {usd(invoice.balance)}
              </Typography>
            </Box>
          )}
        </Stack>
      </Box>

      {/* Footer */}
      <Box mt={4} pt={2} borderTop="1px solid #e0e0e0">
        <Typography variant="caption" color={TEXT_GRAY} textAlign="center" display="block">
          Thank you for your registration with {invoiceConfig.organizationName}
        </Typography>
      </Box>
    </Paper>
  )
}
