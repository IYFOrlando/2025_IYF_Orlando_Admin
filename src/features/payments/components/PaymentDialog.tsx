import * as React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, TextField, MenuItem, Button, FormControlLabel, Switch
} from '@mui/material'
import type { PricingItem } from '../types'
import { Alert as SAlert } from '../../../lib/alerts'
import { supabase } from '../../../lib/supabase'

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
  const [academyNames, setAcademyNames] = React.useState<string[]>([])
  const [koreanLevels, setKoreanLevels] = React.useState<string[]>([])

  // Fetch academies and Korean levels from Supabase
  React.useEffect(() => {
    if (!open) return
    const load = async () => {
      // Get active semester
      const { data: semesters } = await supabase
        .from('semesters').select('id').eq('name', 'Spring 2026').limit(1)
      const semId = semesters?.[0]?.id
      if (!semId) return

      // Fetch academies for this semester
      const { data: acData } = await supabase
        .from('academies').select('id, name').eq('semester_id', semId).eq('is_active', true).order('display_order')
      if (acData) {
        setAcademyNames(acData.map(a => a.name))

        // Fetch Korean levels
        const koreanAc = acData.filter(a => a.name.toLowerCase().includes('korean') && a.name.toLowerCase().includes('language'))
        if (koreanAc.length > 0) {
          const koreanIds = koreanAc.map(a => a.id)
          const { data: lvlData } = await supabase
            .from('levels').select('name, academy_id').in('academy_id', koreanIds).order('display_order')
          if (lvlData) {
            const names = [...new Set(lvlData.map(l => l.name))]
            setKoreanLevels(names)
          }
        }
      }
    }
    load()
  }, [open])

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
              onChange={(e) => setForm((p: PricingItem) => ({ ...p, academy: e.target.value }))}
            >
              {academyNames.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </TextField>
          </Grid>

          {isKorean && (
            <Grid item xs={12}>
              <TextField
                select fullWidth label="Korean Level" value={form.level || ''}
                onChange={(e) => setForm((p: PricingItem) => ({ ...p, level: e.target.value }))}
              >
                {koreanLevels.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
            </Grid>
          )}

          <Grid item xs={12} sm={6}>
            <TextField
              type="number" fullWidth label="Price — Period 1 (USD)"
              value={form.p1 ?? ''} inputProps={{ step: '0.01', min: '0' }}
              onChange={(e) => setForm((p: PricingItem) => ({ ...p, p1: e.target.value === '' ? null : Number(e.target.value) }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              type="number" fullWidth label="Price — Period 2 (USD)"
              value={form.p2 ?? ''} inputProps={{ step: '0.01', min: '0' }}
              onChange={(e) => setForm((p: PricingItem) => ({ ...p, p2: e.target.value === '' ? null : Number(e.target.value) }))}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth label="Notes" value={form.notes || ''}
              onChange={(e) => setForm((p: PricingItem) => ({ ...p, notes: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={<Switch checked={!!form.enabled} onChange={(e) => setForm((p: PricingItem) => ({ ...p, enabled: e.target.checked }))} />}
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
