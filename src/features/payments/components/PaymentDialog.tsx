import * as React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, MenuItem, Button, FormControlLabel, Switch
} from '@mui/material'
import type { PricingItem } from '../types'
import { Alert as SAlert } from '../../../lib/alerts'

const ACADEMIES = [
  'Art','DIY','Korean Language','Korean Cooking','Piano','Pickleball',
  'Senior','Soccer','Stretch and Strengthen','Kids'
]

const KOREAN_LEVELS = ['Alphabet','Beginner','Intermediate','K-Movie Conversation'] as const

type Props = {
  open: boolean
  onClose: () => void
  initial?: PricingItem | null
  onSave: (item: PricingItem) => Promise<void>
}

export default function PricingItemDialog({ open, onClose, initial, onSave }: Props) {
  const [form, setForm] = React.useState<PricingItem>(
    initial || { id: '', academy: '', level: null, p1: null, p2: null, enabled: true, notes: '' }
  )

  React.useEffect(() => {
    setForm(initial || { id: '', academy: '', level: null, p1: null, p2: null, enabled: true, notes: '' })
  }, [initial])

  const isKorean = form.academy === 'Korean Language'

  const handleSave = async () => {
    if (!form.academy) {
      SAlert.fire({ title: 'Academy required', icon: 'warning' })
      return
    }
    // For non-Korean classes, force level to null
    const payload: PricingItem = { ...form, level: isKorean ? (form.level || null) : null }
    await onSave(payload)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{form?.id ? 'Edit Price' : 'Add Price'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          <Grid item xs={12}>
            <TextField
              select fullWidth label="Academy" value={form.academy}
              onChange={(e) => setForm((p) => ({ ...p, academy: e.target.value }))}
            >
              {ACADEMIES.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </TextField>
          </Grid>

          {isKorean && (
            <Grid item xs={12}>
              <TextField
                select fullWidth label="Korean Level" value={form.level || ''}
                onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
              >
                {KOREAN_LEVELS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <TextField
              type="number" fullWidth label="Price — Period 1 (USD)"
              value={form.p1 ?? ''} inputProps={{ step: '0.01', min: '0' }}
              onChange={(e) => setForm((p) => ({ ...p, p1: e.target.value === '' ? null : Number(e.target.value) }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              type="number" fullWidth label="Price — Period 2 (USD)"
              value={form.p2 ?? ''} inputProps={{ step: '0.01', min: '0' }}
              onChange={(e) => setForm((p) => ({ ...p, p2: e.target.value === '' ? null : Number(e.target.value) }))}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth label="Notes" value={form.notes || ''}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={!!form.enabled} onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))} />}
              label="Enabled"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}
