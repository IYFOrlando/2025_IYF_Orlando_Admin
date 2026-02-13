import * as React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField,
  MenuItem, Button, Typography, Box, Stack, CircularProgress
} from '@mui/material'
import { Trash2, Plus } from 'lucide-react'
import { Alert as SAlert } from '../../../lib/alerts'
import { computeAge } from '../../../lib/validations'
import type { Registration, SelectedAcademy } from '../types'
import { TSHIRT_SIZES, GENDER_OPTIONS } from '../../../lib/constants'
import {
  getAcademyConfig,
  createRegistration,
  updateRegistration,
} from '../../../lib/supabaseRegistrations'

// State List
const STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado",
  "Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho",
  "Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine",
  "Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey",
  "New Mexico","New York","North Carolina","North Dakota","Ohio",
  "Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina",
  "South Dakota","Tennessee","Texas","Utah","Vermont","Virginia",
  "Washington","West Virginia","Wisconsin","Wyoming",
]

type Props = {
  open: boolean
  onClose: () => void
  docId?: string // If present, edit mode (student UUID). If not, create mode.
  initial?: Registration // Pre-filled data for edits
  onSuccess?: () => void
}

const EMPTY_REG: Registration = {
  id: '',
  firstName: '', lastName: '', birthday: '', gender: '',
  cellNumber: '', email: '', confirmEmail: '',
  address: '', city: '', state: 'Florida', zipCode: '',
  selectedAcademies: [],
  guardianName: '', guardianPhone: '', tShirtSize: ''
}

export default function AdminRegistrationForm({ open, onClose, docId, initial, onSuccess }: Props) {
  const [form, setForm] = React.useState<Registration>(initial || EMPTY_REG)
  const isEdit = !!docId

  // Dynamic Data
  const [availableAcademies, setAvailableAcademies] = React.useState<string[]>([])
  const [academyLevels, setAcademyLevels] = React.useState<Record<string, string[]>>({})
  const [loadingConfig, setLoadingConfig] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // Fetch Academy Config on Open (from Supabase)
  React.useEffect(() => {
    if (open) {
      setLoadingConfig(true)
      const fetchConfig = async () => {
        try {
          const config = await getAcademyConfig()
          
          const academies: string[] = config.map(a => a.name)
          const levels: Record<string, string[]> = {}
          config.forEach(a => {
            if (a.levels.length > 0) {
              levels[a.name] = a.levels.map(l => l.name)
            }
          })
          
          setAvailableAcademies(academies.sort())
          setAcademyLevels(levels)
        } catch (e) {
          console.error("Failed to load academy config from Supabase", e)
        } finally {
          setLoadingConfig(false)
        }
      }
      fetchConfig()
      
      // Initialize Form
      const fd: Registration = initial ? JSON.parse(JSON.stringify(initial)) : { ...EMPTY_REG }
      if (!fd.selectedAcademies) fd.selectedAcademies = []
      
      // Legacy normalization
      if (fd.selectedAcademies.length === 0) {
        if (fd.firstPeriod?.academy) fd.selectedAcademies.push({ ...fd.firstPeriod, schedule: null })
        if (fd.secondPeriod?.academy) fd.selectedAcademies.push({ ...fd.secondPeriod, schedule: null })
      }
      setForm(fd)
    } 
  }, [open, initial])

  const setField = (k: keyof Registration, v: any) => setForm((p) => ({ ...p, [k]: v }))

  // Academy Management (Dynamic)
  const handleAddAcademy = () => {
    setForm(prev => ({
      ...prev,
      selectedAcademies: [...(prev.selectedAcademies || []), { academy: '', level: '', schedule: null }]
    }))
  }

  const handleRemoveAcademy = (index: number) => {
    setForm(prev => ({
      ...prev,
      selectedAcademies: (prev.selectedAcademies || []).filter((_, i) => i !== index)
    }))
  }

  const handleAcademyChange = (index: number, field: keyof SelectedAcademy, value: string) => {
    setForm(prev => {
      const list = [...(prev.selectedAcademies || [])]
      if (list[index]) {
        list[index] = { ...list[index], [field]: value }
         
        // If academy changes, clear level
        if (field === 'academy') {
           list[index].level = '' 
        }
      }
      return { ...prev, selectedAcademies: list }
    })
  }

  const getAgeString = (birthdayISO?: string) => {
    const age = computeAge(birthdayISO)
    return age === '' ? '' : String(age)
  }

  const save = async () => {
    try {
      setSaving(true)

      // Validate
      if(!form.firstName || !form.lastName) throw new Error('First and Last Name required')

      const formData = {
        firstName: form.firstName || '',
        lastName: form.lastName || '',
        birthday: form.birthday || '',
        gender: form.gender || '',
        cellNumber: form.cellNumber || '',
        email: form.email || '',
        address: form.address || '',
        city: form.city || '',
        state: form.state || '',
        zipCode: form.zipCode || '',
        tShirtSize: form.tShirtSize || '',
        guardianName: form.guardianName || '',
        guardianPhone: form.guardianPhone || '',
        selectedAcademies: (form.selectedAcademies || []).map(a => ({
          academy: a.academy || '',
          level: a.level || '',
        })),
      }

      if (isEdit && docId) {
        await updateRegistration(docId, formData)
        SAlert.fire({ title: 'Updated', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false })
      } else {
        await createRegistration(formData)
        SAlert.fire({ title: 'Created', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false })
      }
      
      if(onSuccess) onSuccess()
      onClose()
    } catch (e:any) {
      SAlert.fire({ title: 'Save failed', text: e?.message, icon: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ borderBottom: '1px solid #eee', fontWeight: 700 }}>
        {isEdit ? 'Edit Registration' : 'New Registration'}
      </DialogTitle>
      <DialogContent dividers sx={{ p: 3 }}>
        <Grid container spacing={2}>
          {/* Section: Personal Info */}
          <Grid item xs={12}><Typography variant="subtitle2" color="primary">PERSONAL INFORMATION</Typography></Grid>
          
          <Grid item xs={12} md={6}><TextField label="First Name" value={form.firstName} onChange={(e)=>setField('firstName', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} md={6}><TextField label="Last Name" value={form.lastName} onChange={(e)=>setField('lastName', e.target.value)} fullWidth size="small" /></Grid>
          
          <Grid item xs={12} md={4}><TextField label="Birthday" type="date" InputLabelProps={{shrink:true}} value={form.birthday} onChange={(e)=>setField('birthday', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} md={2}><TextField label="Age" value={getAgeString(form.birthday)} InputProps={{readOnly:true}} fullWidth size="small" disabled /></Grid>
          <Grid item xs={12} md={6}>
            <TextField select label="Gender" value={form.gender} onChange={(e)=>setField('gender', e.target.value)} fullWidth size="small">
              {GENDER_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          </Grid>

           <Grid item xs={12} md={6}>
            <TextField select label="T-Shirt Size" value={form.tShirtSize} onChange={(e)=>setField('tShirtSize', e.target.value)} fullWidth size="small">
              {TSHIRT_SIZES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>

          {/* Section: Contact */}
          <Grid item xs={12} sx={{ mt: 2 }}><Typography variant="subtitle2" color="primary">CONTACT & ADDRESS</Typography></Grid>
          
          <Grid item xs={12} md={6}><TextField label="Student Phone" value={form.cellNumber} onChange={(e)=>setField('cellNumber', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} md={6}><TextField label="Email" value={form.email} onChange={(e)=>setField('email', e.target.value)} fullWidth size="small" /></Grid>
          
          <Grid item xs={12}><TextField label="Address" value={form.address} onChange={(e)=>setField('address', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} md={4}><TextField label="City" value={form.city} onChange={(e)=>setField('city', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} md={4}>
            <TextField select label="State" value={form.state} onChange={(e)=>setField('state', e.target.value)} fullWidth size="small">
              {STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}><TextField label="Zip Code" value={form.zipCode} onChange={(e)=>setField('zipCode', e.target.value)} fullWidth size="small" /></Grid>

          {/* Section: Guardian */}
          <Grid item xs={12} sx={{ mt: 2 }}><Typography variant="subtitle2" color="primary">GUARDIAN (For Minors)</Typography></Grid>
          <Grid item xs={12} md={6}><TextField label="Guardian Name" value={form.guardianName} onChange={(e)=>setField('guardianName', e.target.value)} fullWidth size="small" /></Grid>
          <Grid item xs={12} md={6}><TextField label="Guardian Phone" value={form.guardianPhone} onChange={(e)=>setField('guardianPhone', e.target.value)} fullWidth size="small" /></Grid>

          {/* Section: Academies */}
          <Grid item xs={12} sx={{ mt: 2 }}><Typography variant="subtitle2" color="primary">ACADEMY SELECTION</Typography></Grid>
          
          {/* Dynamic Academy List */}
          <Grid item xs={12}>
            {loadingConfig ? <CircularProgress size={24} /> : (
            <Stack spacing={2}>
              {(form.selectedAcademies || []).map((item, idx) => {
                 const currentAcademyName = item.academy || ''
                 const hasLevels = !!academyLevels[currentAcademyName]
                 const levels = academyLevels[currentAcademyName] || []

                 return (
                <Box key={idx} sx={{ p: 2, border: '1px solid #eee', borderRadius: 2, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={hasLevels ? 5 : 10}>
                      <TextField
                        select
                        label="Academy"
                        value={currentAcademyName}
                        onChange={(e) => handleAcademyChange(idx, 'academy', e.target.value)}
                        fullWidth
                        size="small"
                      >
                        {availableAcademies.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                    {hasLevels && (
                      <Grid item xs={12} md={5}>
                        <TextField
                          select
                          label="Level"
                          value={item.level || ''}
                          onChange={(e) => handleAcademyChange(idx, 'level', e.target.value)}
                          fullWidth
                          size="small"
                        >
                          {levels.map((l) => (
                            <MenuItem key={l} value={l}>
                              {l}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                    )}
                    <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center' }}>
                      <Button color="error" onClick={() => handleRemoveAcademy(idx)}>
                        <Trash2 size={18} />
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              )})}
              <Button
                variant="outlined"
                startIcon={<Plus size={16} />}
                onClick={handleAddAcademy}
                sx={{ alignSelf: 'flex-start' }}
              >
                Add Academy
              </Button>
            </Stack>
            )}
          </Grid>

        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid #eee' }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>Cancel</Button>
        <Button onClick={save} variant="contained" disableElevation disabled={saving}>
          {saving ? 'Saving...' : 'Save Registration'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
