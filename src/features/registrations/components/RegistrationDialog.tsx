import * as React from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField,
  MenuItem, Button, Stack
} from '@mui/material'
import { db } from '../../../lib/firebase'
import { REG_COLLECTION } from '../../../lib/config'
import { doc, updateDoc } from 'firebase/firestore'
import { Alert as SAlert } from '../../../lib/alerts'
import type { Registration } from '../types'

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

// Admin editor constraints similar to your public form
const NO_LEVELS = ["N/A","Art","DIY","Kids","Korean Cooking","Piano","Pickleball","Senior","Soccer","Stretch and Strengthen"]
const P1_ACADEMIES = ["N/A","Art","DIY","Korean Language","Korean Cooking","Piano","Pickleball","Senior","Soccer","Stretch and Strengthen","Kids"]
const P2_ACADEMIES = ["N/A","Art","DIY","Korean Language","Korean Cooking","Piano","Senior","Kids"]

type Props = {
  open: boolean
  onClose: () => void
  docId: string
  initial: Registration
}

export default function RegistrationDialog({ open, onClose, docId, initial }: Props) {
  const [form, setForm] = React.useState<Registration>(initial)

  React.useEffect(() => { setForm(initial) }, [initial])

  const setField = (k: keyof Registration, v: any) => setForm((p) => ({ ...p, [k]: v }))
  const setP = (period: 'firstPeriod' | 'secondPeriod', key: 'academy'|'level', v: any) =>
    setForm((p) => ({ ...p, [period]: { ...(p[period] as any), [key]: v } }))

  // Level options logic:
  const p1Levels = React.useMemo(() => {
    const a = form.firstPeriod?.academy
    if (!a) return []
    if (NO_LEVELS.includes(a)) return ["N/A"]
    if (a === 'Korean Language') return ["Alphabet", "Intermediate", "K-Movie Conversation"] // P1: exclude Beginner
    return []
  }, [form.firstPeriod?.academy])

  const p2Levels = React.useMemo(() => {
    const a = form.secondPeriod?.academy
    if (!a) return []
    if (NO_LEVELS.includes(a)) return ["N/A"]
    if (a === 'Korean Language') return ["Beginner"] // P2: only Beginner
    return []
  }, [form.secondPeriod?.academy])

  // Use computeAge from validations utility
  const getAgeString = (birthdayISO?: string) => {
    const age = computeAge(birthdayISO)
    return age === '' ? '' : String(age)
  }

  const save = async () => {
    try {
      const payload: Partial<Registration> = {
        firstName: form.firstName || '',
        lastName: form.lastName || '',
        birthday: form.birthday || '',
        age: computeAge(form.birthday) || '',
        gender: form.gender || '',
        cellNumber: form.cellNumber || '',
        email: form.email || '',
        confirmEmail: form.email || form.confirmEmail || '',
        address: form.address || '',
        city: form.city || '',
        state: form.state || '',
        zipCode: form.zipCode || '',
        firstPeriod: {
          academy: form.firstPeriod?.academy || '',
          level: form.firstPeriod?.level || (NO_LEVELS.includes(form.firstPeriod?.academy || '') ? 'N/A' : '')
        },
        secondPeriod: {
          academy: form.secondPeriod?.academy || '',
          level: form.secondPeriod?.level || (NO_LEVELS.includes(form.secondPeriod?.academy || '') ? 'N/A' : '')
        },
      }
      await updateDoc(doc(db, REG_COLLECTION, docId), payload as any)
      onClose()
    } catch (e:any) {
      SAlert.fire({ title: 'Update failed', text: e?.message, icon: 'error' })
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Registration</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ mt: 0 }}>
          {/* Personal */}
          <Grid item xs={12} md={6}><TextField label="First Name" value={form.firstName || ''} onChange={(e)=>setField('firstName', e.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField label="Last Name"  value={form.lastName  || ''} onChange={(e)=>setField('lastName',  e.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField label="Birthday" type="date" InputLabelProps={{shrink:true}} value={form.birthday || ''} onChange={(e)=>setField('birthday', e.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField label="Age" value={getAgeString(form.birthday)} InputProps={{readOnly:true}} /></Grid>
          <Grid item xs={12} md={6}>
            <TextField select label="Gender" value={form.gender || ''} onChange={(e)=>setField('gender', e.target.value)}>
              <MenuItem value="">Select</MenuItem><MenuItem value="Male">Male</MenuItem><MenuItem value="Female">Female</MenuItem><MenuItem value="Other">Other</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}><TextField label="Phone" value={form.cellNumber || ''} onChange={(e)=>setField('cellNumber', e.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField label="Email" type="email" value={form.email || ''} onChange={(e)=>setField('email', e.target.value)} /></Grid>
          <Grid item xs={12} md={6}><TextField label="Confirm Email" type="email" value={form.confirmEmail || ''} onChange={(e)=>setField('confirmEmail', e.target.value)} /></Grid>
          <Grid item xs={12}><TextField label="Address" value={form.address || ''} onChange={(e)=>setField('address', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}><TextField label="City" value={form.city || ''} onChange={(e)=>setField('city', e.target.value)} /></Grid>
          <Grid item xs={12} md={4}>
            <TextField select label="State" value={form.state || ''} onChange={(e)=>setField('state', e.target.value)}>
              <MenuItem value="">Select</MenuItem>
              {STATES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}><TextField label="Zip Code" value={form.zipCode || ''} onChange={(e)=>setField('zipCode', e.target.value)} /></Grid>

          {/* Period 1 */}
          <Grid item xs={12}><Stack direction="row" alignItems="center" spacing={1}><b>Period 1</b><span>(10:00–11:30)</span></Stack></Grid>
          <Grid item xs={12} md={6}>
            <TextField select label="Academy (P1)" value={form.firstPeriod?.academy || ''} onChange={(e)=>setP('firstPeriod','academy', e.target.value)}>
              {P1_ACADEMIES.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField select label="Level (P1)" value={form.firstPeriod?.level || ''} onChange={(e)=>setP('firstPeriod','level', e.target.value)} disabled={p1Levels.length === 0}>
              {p1Levels.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>
          </Grid>

          {/* Period 2 */}
          <Grid item xs={12}><Stack direction="row" alignItems="center" spacing={1}><b>Period 2</b><span>(11:00–12:30)</span></Stack></Grid>
          <Grid item xs={12} md={6}>
            <TextField select label="Academy (P2)" value={form.secondPeriod?.academy || ''} onChange={(e)=>setP('secondPeriod','academy', e.target.value)}>
              {P2_ACADEMIES.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField select label="Level (P2)" value={form.secondPeriod?.level || ''} onChange={(e)=>setP('secondPeriod','level', e.target.value)} disabled={p2Levels.length === 0}>
              {p2Levels.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save}>Save changes</Button>
      </DialogActions>
    </Dialog>
  )
}
