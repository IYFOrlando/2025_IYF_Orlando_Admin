import * as React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Chip, Stack, Alert
} from '@mui/material'
import type { VolunteerSchedule } from '../types'

interface EditScheduleDialogProps {
  open: boolean
  onClose: () => void
  schedule: VolunteerSchedule | null
  onSave: (scheduleId: string, updates: Partial<VolunteerSchedule>) => Promise<void>
}

export default function EditScheduleDialog({ open, onClose, schedule, onSave }: EditScheduleDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [status, setStatus] = React.useState<'scheduled' | 'confirmed' | 'completed' | 'cancelled'>('scheduled')

  React.useEffect(() => {
    if (schedule) {
      setStatus(schedule.status)
    }
  }, [schedule])

  const handleSave = async () => {
    if (!schedule) return

    setLoading(true)
    try {
      await onSave(schedule.id, {
        status
      })
      onClose()
    } catch (error) {
      console.error('Error updating schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    onClose()
  }

  if (!schedule) return null

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        Edit Schedule - {schedule.volunteerName}
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Stack spacing={3}>
            {/* Volunteer Info */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Volunteer Information
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip label={`Code: ${schedule.volunteerCode}`} size="small" />
                <Chip label={`Email: ${schedule.volunteerEmail}`} size="small" />
                {schedule.volunteerPhone && (
                  <Chip label={`Phone: ${schedule.volunteerPhone}`} size="small" />
                )}
              </Stack>
            </Box>

            {/* Current Status */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Current Status
              </Typography>
              <Chip 
                label={schedule.status} 
                color={
                  schedule.status === 'confirmed' ? 'success' :
                  schedule.status === 'completed' ? 'primary' :
                  schedule.status === 'cancelled' ? 'error' : 'default'
                }
                size="small"
              />
            </Box>

            {/* Status Selection */}
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                label="Status"
              >
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>

            {/* Schedule Details */}
            {schedule.selectedSlots && schedule.selectedSlots.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Scheduled Slots ({schedule.selectedSlots.length})
                </Typography>
                <Box sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
                  {schedule.selectedSlots.map((slot, index) => (
                    <Box key={index} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      {typeof slot === 'object' ? (
                        <Typography variant="body2">
                          <strong>{slot.date}</strong> - {slot.startTime} to {slot.endTime} ({slot.hours}h)
                        </Typography>
                      ) : (
                        <Typography variant="body2">
                          {slot}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Total Hours */}
            {schedule.totalHours && (
              <Box>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Total Hours
                </Typography>
                <Typography variant="h6" color="primary">
                  {schedule.totalHours} hours
                </Typography>
              </Box>
            )}

            {/* Warning for status changes */}
            {status !== schedule.status && (
              <Alert severity="info">
                Changing status from <strong>{schedule.status}</strong> to <strong>{status}</strong>
              </Alert>
            )}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleCancel} disabled={loading}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading}
          color="primary"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
