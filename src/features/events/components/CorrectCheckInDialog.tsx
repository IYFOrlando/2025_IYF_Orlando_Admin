import * as React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Chip, Stack, Alert, Grid, IconButton, Tooltip
} from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import type { VolunteerHours } from '../../events/types'

interface CorrectCheckInDialogProps {
  open: boolean
  onClose: () => void
  volunteerHours: VolunteerHours | null
  onSave: (hoursId: string, updates: Partial<VolunteerHours>) => Promise<void>
  onDelete: (hoursId: string) => Promise<void>
}

export default function CorrectCheckInDialog({ 
  open, 
  onClose, 
  volunteerHours, 
  onSave, 
  onDelete 
}: CorrectCheckInDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [status, setStatus] = React.useState<'checked-in' | 'checked-out' | 'completed'>('checked-in')
  const [checkInTime, setCheckInTime] = React.useState('')
  const [checkOutTime, setCheckOutTime] = React.useState('')
  const [totalHours, setTotalHours] = React.useState('')
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (volunteerHours) {
      setStatus(volunteerHours.status)
      setNotes(volunteerHours.notes || '')
      
      // Format check-in time
      if (volunteerHours.checkInTime) {
        const checkInDate = new Date(volunteerHours.checkInTime.seconds * 1000)
        setCheckInTime(checkInDate.toISOString().slice(0, 16)) // YYYY-MM-DDTHH:MM
      }
      
      // Format check-out time
      if (volunteerHours.checkOutTime) {
        const checkOutDate = new Date(volunteerHours.checkOutTime.seconds * 1000)
        setCheckOutTime(checkOutDate.toISOString().slice(0, 16)) // YYYY-MM-DDTHH:MM
      }
      
      // Format total hours
      if (volunteerHours.totalHours) {
        setTotalHours(volunteerHours.totalHours.toString())
      }
    }
  }, [volunteerHours])

  const handleSave = async () => {
    if (!volunteerHours) return

    setLoading(true)
    try {
      const updates: Partial<VolunteerHours> = {
        status,
        notes: notes.trim() || undefined
      }

      // Update check-in time if provided
      if (checkInTime) {
        updates.checkInTime = {
          seconds: Math.floor(new Date(checkInTime).getTime() / 1000),
          nanoseconds: 0
        }
      }

      // Update check-out time if provided
      if (checkOutTime) {
        updates.checkOutTime = {
          seconds: Math.floor(new Date(checkOutTime).getTime() / 1000),
          nanoseconds: 0
        }
      }

      // Update total hours if provided
      if (totalHours) {
        updates.totalHours = parseFloat(totalHours)
      }

      await onSave(volunteerHours.id, updates)
      onClose()
    } catch (error) {
      console.error('Error updating volunteer hours:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!volunteerHours) return

    if (window.confirm('¿Estás seguro de que quieres eliminar este registro de horas? Esta acción no se puede deshacer.')) {
      setLoading(true)
      try {
        await onDelete(volunteerHours.id)
        onClose()
      } catch (error) {
        console.error('Error deleting volunteer hours:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  const calculateHours = () => {
    if (checkInTime && checkOutTime) {
      const start = new Date(checkInTime)
      const end = new Date(checkOutTime)
      const diffMs = end.getTime() - start.getTime()
      const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
      setTotalHours(diffHours.toString())
    }
  }

  if (!volunteerHours) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          <EditIcon color="primary" />
          <Typography variant="h6">
            Corregir Check-in/Check-out - {volunteerHours.volunteerName}
          </Typography>
        </Stack>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Stack spacing={3}>
            {/* Volunteer Info */}
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Información del Voluntario
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip label={`Email: ${volunteerHours.volunteerEmail}`} size="small" />
                <Chip label={`Evento: ${volunteerHours.eventName}`} size="small" />
                <Chip 
                  label={`Estado: ${volunteerHours.status}`} 
                  color={
                    volunteerHours.status === 'completed' ? 'success' :
                    volunteerHours.status === 'checked-in' ? 'warning' : 'info'
                  }
                  size="small" 
                />
              </Stack>
            </Box>

            {/* Status Selection */}
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                label="Estado"
              >
                <MenuItem value="checked-in">Checked-in</MenuItem>
                <MenuItem value="checked-out">Checked-out</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
              </Select>
            </FormControl>

            {/* Time Corrections */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Hora de Check-in"
                  type="datetime-local"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Hora de Check-out"
                  type="datetime-local"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            {/* Calculate Hours Button */}
            {checkInTime && checkOutTime && (
              <Box sx={{ textAlign: 'center' }}>
                <Button 
                  variant="outlined" 
                  startIcon={<AccessTimeIcon />}
                  onClick={calculateHours}
                >
                  Calcular Horas Automáticamente
                </Button>
              </Box>
            )}

            {/* Total Hours */}
            <TextField
              fullWidth
              label="Horas Totales"
              type="number"
              value={totalHours}
              onChange={(e) => setTotalHours(e.target.value)}
              inputProps={{ step: 0.25, min: 0 }}
              helperText="Ejemplo: 5.5 para 5 horas y 30 minutos"
            />

            {/* Notes */}
            <TextField
              fullWidth
              label="Notas"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agregar notas sobre la corrección..."
            />

            {/* Warning */}
            <Alert severity="warning">
              <Typography variant="body2">
                <strong>Advertencia:</strong> Las correcciones manuales sobrescribirán los datos originales. 
                Asegúrate de que las fechas y horas sean correctas.
              </Typography>
            </Alert>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Tooltip title="Eliminar registro">
          <IconButton 
            onClick={handleDelete} 
            disabled={loading}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={loading}
          color="primary"
          startIcon={<CheckCircleIcon />}
        >
          {loading ? 'Guardando...' : 'Guardar Corrección'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
