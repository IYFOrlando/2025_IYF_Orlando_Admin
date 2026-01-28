import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Drawer, Box, Typography, IconButton, Stack, Chip, Divider,
  Grid, Button, Avatar, CircularProgress
} from '@mui/material'
import { X, Mail, Phone, MapPin, Calendar, GraduationCap, DollarSign, Receipt as ReceiptIcon } from 'lucide-react'
import type { Registration } from '../types'
import { computeAge } from '../../../lib/validations'
import { usd } from '../../../lib/query'
import { useRegistrationExpectedTotal } from '../hooks/useRegistrationExpectedTotal'
import { updateInvoiceForRegistration } from '../../../lib/autoInvoice'

import QuickPaymentDialog from '../../payments/components/QuickPaymentDialog'

interface RegistrationDrawerProps {
  open: boolean
  onClose: () => void
  registration: Registration | null
  billingInfo?: { total: number; paid: number; balance: number; status: string }
  onEdit?: () => void
  onDelete?: () => void
  isAdmin?: boolean
}

export default function RegistrationDrawer({
  open,
  onClose,
  registration,
  billingInfo,
  onEdit,
  onDelete,
  isAdmin = false
}: RegistrationDrawerProps) {
  const navigate = useNavigate()
  const [payOpen, setPayOpen] = React.useState(false)
  const { expectedTotalCents, loading: expectedLoading } = useRegistrationExpectedTotal(registration)

  if (!registration) return null

  const age = computeAge(registration.birthday)
  const academies = (registration as any).selectedAcademies || [
    registration.firstPeriod,
    registration.secondPeriod
  ].filter(Boolean)

  const fullName = `${registration.firstName || ''} ${registration.lastName || ''}`.trim() || 'Unknown'

  // Align payment status with academies: Total = expected from academies, Paid = actual payments, Balance = expected - paid
  const paidCents = billingInfo?.paid ?? 0
  const totalCents = expectedLoading ? (billingInfo?.total ?? 0) : expectedTotalCents
  const balanceCents = Math.max(0, totalCents - paidCents)
  const status = balanceCents <= 0 ? 'paid' : paidCents > 0 ? 'partial' : 'unpaid'

  return (
    <>
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: (theme) => theme.zIndex.drawer + 2 }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 500 },
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ 
          p: 3, 
          background: 'rgba(255,255,255,0.1)', 
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar 
                sx={{ 
                  width: 56, 
                  height: 56, 
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: 24,
                  fontWeight: 700
                }}
              >
                {registration.firstName?.[0]}{registration.lastName?.[0]}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700} color="white">
                  {fullName}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Student ID: {registration.id.slice(0, 8)}
                </Typography>
              </Box>
            </Stack>
            <IconButton onClick={onClose} sx={{ color: 'white' }}>
              <X size={24} />
            </IconButton>
          </Stack>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3, background: 'white' }}>
          {/* Contact Info */}
          <Typography variant="overline" color="text.secondary" fontWeight={700}>
            Contact Information
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 1, mb: 3 }}>
            {registration.email && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Mail size={18} color="#666" />
                <Typography>{registration.email}</Typography>
              </Stack>
            )}
            {registration.cellNumber && (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Phone size={18} color="#666" />
                <Typography>{registration.cellNumber}</Typography>
              </Stack>
            )}
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Calendar size={18} color="#666" />
              <Typography>
                {registration.birthday ? `${registration.birthday} (${age} years old)` : 'Age: N/A'}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <MapPin size={18} color="#666" />
              <Typography>
                {[registration.city, registration.state, registration.zipCode]
                  .filter(Boolean)
                  .join(', ') || 'No Address'}
              </Typography>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Academies */}
          <Typography variant="overline" color="text.secondary" fontWeight={700}>
            <GraduationCap size={14} style={{ display: 'inline', marginRight: 4 }} />
            Academies
          </Typography>
          <Stack spacing={1} sx={{ mt: 1, mb: 3 }}>
            {academies.length > 0 ? (
              academies.map((academy: any, idx: number) => (
                <Box 
                  key={idx}
                  sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    background: '#f5f5f5',
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <Typography fontWeight={600}>{academy.academy || 'Unknown Academy'}</Typography>
                  {academy.level && (
                    <Chip 
                      label={academy.level} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  )}

                </Box>
              ))
            ) : (
              <Typography color="text.secondary" variant="body2">No academies selected</Typography>
            )}
          </Stack>

          <Divider sx={{ my: 2 }} />

          {/* Payment Status — Admin Only */}
          {isAdmin && (
            <>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  <DollarSign size={14} style={{ display: 'inline', marginRight: 4 }} />
                  Payment Status
                </Typography>
                <Box sx={{ mt: 1, p: 2, borderRadius: 2, background: '#f5f5f5' }}>
                  {expectedLoading ? (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CircularProgress size={20} />
                      <Typography variant="body2" color="text.secondary">Loading expected total from academies…</Typography>
                    </Stack>
                  ) : (
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Total</Typography>
                        <Typography variant="h6" fontWeight={700}>{usd(totalCents)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Paid</Typography>
                        <Typography variant="h6" fontWeight={700} color="success.main">
                          {usd(paidCents)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Balance</Typography>
                        <Typography variant="h6" fontWeight={700} color="error.main">
                          {usd(balanceCents)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Status</Typography>
                        <Chip 
                          label={status.toUpperCase()} 
                          size="small"
                          color={status === 'paid' ? 'success' : status === 'partial' ? 'warning' : 'error'}
                          sx={{ mt: 0.5 }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                         {status === 'paid' ? (
                           <Button
                             variant="outlined"
                             fullWidth
                             startIcon={<ReceiptIcon size={18} />}
                             onClick={() => {
                                 navigate(`/payments?studentId=${registration.id}`)
                                 onClose()
                             }}
                             sx={{ mt: 1 }}
                           >
                             View Payment / Receipt
                           </Button>
                         ) : (
                           <Button 
                             variant="contained" 
                             color="success" 
                             fullWidth 
                             startIcon={<DollarSign size={18} />}
                             onClick={() => setPayOpen(true)}
                             sx={{ mt: 1 }}
                           >
                             Make a Payment
                           </Button>
                         )}
                      </Grid>
                    </Grid>
                  )}
                </Box>
            </>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Registration Date */}
          <Typography variant="caption" color="text.secondary">
            Registered: {registration.createdAt?.seconds 
              ? new Date(registration.createdAt.seconds * 1000).toLocaleString()
              : 'Unknown Date'}
          </Typography>
        </Box>

        {/* Actions */}
        {isAdmin && (
          <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', background: 'white' }}>
            <Stack direction="row" spacing={1}>
              <Button 
                variant="outlined" 
                fullWidth
                onClick={onEdit}
              >
                Edit
              </Button>
              <Button 
                variant="outlined" 
                color="error"
                fullWidth
                onClick={onDelete}
              >
                Delete
              </Button>
            </Stack>
          </Box>
        )}
      </Box>
    </Drawer>
    
    <QuickPaymentDialog 
      open={payOpen} 
      onClose={() => setPayOpen(false)} 
      studentId={registration.id} 
      studentName={fullName} 
      totalBalanceDueCents={balanceCents}
      onCreateMissingInvoice={registration ? () => updateInvoiceForRegistration(registration) : undefined}
    />
    </>
  )
}
