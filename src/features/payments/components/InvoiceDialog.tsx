import * as React from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material'

type Props = {
  open: boolean
  editing?: any | null
  onClose: () => void
}

export default function InvoiceDialog({ open, editing, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? 'Edit Invoice' : 'New Invoice'}</DialogTitle>
      <DialogContent>
        {/* TODO: Implement invoice form */}
        <p>Invoice dialog - implementation pending</p>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onClose}>Save</Button>
      </DialogActions>
    </Dialog>
  )
}
