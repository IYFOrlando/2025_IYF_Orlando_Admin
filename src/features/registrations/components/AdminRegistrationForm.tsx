import * as React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField,
  MenuItem, Button, Typography, Box, Stack, CircularProgress
} from '@mui/material'
import { Trash2, Plus } from 'lucide-react'
import { db } from '../../../lib/firebase'
import { REG_COLLECTION } from '../../../lib/config'
import { COLLECTIONS_CONFIG } from '../../../config/shared.js'
import { doc, updateDoc, addDoc, collection, serverTimestamp, getDocs, query, where } from 'firebase/firestore'
import { Alert as SAlert } from '../../../lib/alerts'
import { computeAge } from '../../../lib/validations'
import type { Registration, SelectedAcademy } from '../types'
import { TSHIRT_SIZES, GENDER_OPTIONS } from '../../../lib/constants'
import { updateInvoiceForRegistration } from '../../../lib/autoInvoice'

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
  docId?: string // If present, edit mode. If not, create mode.
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

  // Fetch Academy Config on Open
  React.useEffect(() => {
    if (open) {
      setLoadingConfig(true)
      const fetchConfig = async () => {
        try {
          const colName = COLLECTIONS_CONFIG.academies2026Spring || 'academies_2026_spring'
          const snap = await getDocs(collection(db, colName))
          
          const academies: string[] = []
          const levels: Record<string, string[]> = {}

          snap.forEach(doc => {
            const data = doc.data()
            if (data.name) {
              academies.push(data.name)
              if (data.hasLevels && Array.isArray(data.levels)) {
                // levels is array of objects {name, schedule, ...}
                levels[data.name] = data.levels.map((l: any) => l.name)
              }
            }
          })
          
          setAvailableAcademies(academies.sort())
          setAcademyLevels(levels)
        } catch (e) {
          console.error("Failed to load academy config", e)
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
         
        // If academy changes, clear level if the new academy doesn't have the old level options
        // or just clear it deeply to be safe.
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
      // Validate
      if(!form.firstName || !form.lastName) throw new Error('First and Last Name required')

      const payload: any = {
        firstName: form.firstName || '',
        lastName: form.lastName || '',
        birthday: form.birthday || '',
        age: computeAge(form.birthday) || 0,
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
        // Store updated structure
        selectedAcademies: form.selectedAcademies || [],
        // Legacy Compatibility: Restore firstPeriod/secondPeriod for Invoice View
        firstPeriod: (form.selectedAcademies && form.selectedAcademies[0]) ? {
          academy: form.selectedAcademies[0].academy,
          level: form.selectedAcademies[0].level
        } : null,
        secondPeriod: (form.selectedAcademies && form.selectedAcademies[1]) ? {
          academy: form.selectedAcademies[1].academy,
          level: form.selectedAcademies[1].level
        } : null,
        updatedAt: serverTimestamp()
      }

      let finalId = docId
      if (isEdit && docId) {
        await updateDoc(doc(db, REG_COLLECTION, docId), payload)
        SAlert.fire({ title: 'Updated', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false })
      } else {
        payload.createdAt = serverTimestamp()
        const res = await addDoc(collection(db, REG_COLLECTION), payload)
        finalId = res.id
        SAlert.fire({ title: 'Created', icon: 'success', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false })
      }

      // Sync Invoice
      if (finalId) {
         // reconstruct full object for the helper
         const regForInv = { ...payload, id: finalId } as Registration
         // Run in background to not block UI? Or await? Await is safer to ensure consistency.
         await updateInvoiceForRegistration(regForInv)
      }
      
      if(onSuccess) onSuccess()
      onClose()
    } catch (e:any) {
      SAlert.fire({ title: 'Save failed', text: e?.message, icon: 'error' })
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
          <Grid item xs={12} sx={{ mt: 2 }}><Typography variant="subtitle2" color="primary">ACADEMY_SELECTION</Typography></Grid>
          
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
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={save} variant="contained" disableElevation>Save Registration</Button>
      </DialogActions>
    </Dialog>
  )
}
