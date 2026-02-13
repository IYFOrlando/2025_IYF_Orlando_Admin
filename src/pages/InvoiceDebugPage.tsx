import * as React from 'react'
import { supabase } from '../lib/supabase'
import { Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableHead, TableRow, CircularProgress, Chip } from '@mui/material'

// Helper to format currency (amounts are in cents, convert to dollars)
const formatCurrency = (amountInCents: number): string => {
  const dollars = amountInCents / 100
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

interface InvoiceRow {
  id: string
  studentId: string
  studentName: string
  total: number
  paid: number
  balance: number
  status: string
  createdAt: string | null
  invoicesForStudent: number
}

export default function InvoiceDebugPage() {
  const [loading, setLoading] = React.useState(true)
  const [invoices, setInvoices] = React.useState<InvoiceRow[]>([])
  const [stats, setStats] = React.useState({
    collected: 0,
    pendingAll: 0,
    pendingVigente: 0,
    unpaidAll: 0,
    unpaidVigente: 0,
    studentsWithBalanceVigente: 0,
    studentsWithDuplicates: 0,
    totalDocs: 0,
    totalVigente: 0,
  })

  React.useEffect(() => {
    const fetch = async () => {
      try {
        // Fetch invoices with student data from Supabase
        const { data, error } = await supabase
          .from('invoices')
          .select('*, student:students(id, first_name, last_name)')
          .order('created_at', { ascending: false })

        if (error) throw error

        const list: InvoiceRow[] = []
        let totalCollected = 0
        let totalPendingAll = 0
        let unpaidAllCount = 0
        const countByStudent = new Map<string, number>()

        ;(data || []).forEach((inv: any) => {
          const studentId = inv.student_id || ''
          const total = inv.total_amount || 0
          const paid = inv.paid_amount || 0
          const balance = inv.balance ?? (total - paid)
          const student = inv.student
          const name = student ? `${student.first_name} ${student.last_name}` : 'N/A'

          countByStudent.set(studentId, (countByStudent.get(studentId) ?? 0) + 1)

          list.push({
            id: inv.id,
            studentId,
            studentName: name,
            total,
            paid,
            balance,
            status: inv.status || 'unknown',
            createdAt: inv.created_at,
            invoicesForStudent: 0,
          })
          totalCollected += paid
          totalPendingAll += balance
          if (inv.status !== 'paid') unpaidAllCount++
        })

        // Compute per-student latest invoice
        const latestByStudent = new Map<string, InvoiceRow>()
        list.forEach((inv) => {
          const cur = latestByStudent.get(inv.studentId)
          if (!cur || (inv.createdAt || '') > (cur.createdAt || '')) {
            latestByStudent.set(inv.studentId, inv)
          }
        })
        const vigente = Array.from(latestByStudent.values())
        const pendingVigente = vigente.reduce((s, i) => s + i.balance, 0)
        const unpaidVigenteCount = vigente.filter(i => i.status !== 'paid').length
        const studentsWithBalanceVigente = vigente.filter(i => i.balance > 0).length
        const studentsWithDuplicates = [...countByStudent.values()].filter(c => c > 1).length

        list.forEach(inv => {
          inv.invoicesForStudent = countByStudent.get(inv.studentId) ?? 0
        })
        list.sort((a, b) => b.balance - a.balance)

        setInvoices(list)
        setStats({
          collected: totalCollected,
          pendingAll: totalPendingAll,
          pendingVigente,
          unpaidAll: unpaidAllCount,
          unpaidVigente: unpaidVigenteCount,
          studentsWithBalanceVigente,
          studentsWithDuplicates,
          totalDocs: list.length,
          totalVigente: vigente.length,
        })
      } catch (err) {
        console.error('Invoice debug fetch error', err)
      } finally {
        setLoading(false)
      }
    }

    fetch()
  }, [])

  if (loading && invoices.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h4" gutterBottom>Reporte de Facturas (Supabase)</Typography>
          <Typography variant="h6" gutterBottom>Resumen:</Typography>
          <Typography>Total cobrado: <strong>{formatCurrency(stats.collected)}</strong></Typography>
          <Typography>Total pendiente (factura vigente por alumno): <strong>{formatCurrency(stats.pendingVigente)}</strong></Typography>
          <Typography>Alumnos con saldo (factura vigente): <strong>{stats.studentsWithBalanceVigente}</strong></Typography>
          <Typography>Facturas no pagadas (solo vigente): <strong>{stats.unpaidVigente}</strong></Typography>

          <Typography variant="subtitle2" sx={{ mt: 2 }} color="text.secondary">Contexto (todos los documentos):</Typography>
          <Typography variant="body2">Total de documentos de facturas: <strong>{stats.totalDocs}</strong></Typography>
          <Typography variant="body2">Factura vigente por alumno (1 por alumno): <strong>{stats.totalVigente}</strong></Typography>
          {stats.studentsWithDuplicates > 0 && (
            <Typography variant="body2" color="warning.main">Alumnos con mas de 1 factura: <strong>{stats.studentsWithDuplicates}</strong></Typography>
          )}
          <Typography variant="body2" color="text.secondary">Total pendiente sumando todos los docs: {formatCurrency(stats.pendingAll)}</Typography>
          <Typography variant="body2" color="text.secondary">Facturas no pagadas (todos los docs): {stats.unpaidAll}</Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Detalle de Facturas:</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Estudiante</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Pagado</TableCell>
                <TableCell align="right">Balance</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Facturas/alumno</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>ID</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((inv, idx) => (
                <TableRow
                  key={inv.id}
                  sx={{
                    backgroundColor: inv.balance > 1000 ? '#fff3cd' : inv.invoicesForStudent > 1 ? 'rgba(255,152,0,0.08)' : 'transparent',
                  }}
                >
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{inv.studentName}</TableCell>
                  <TableCell align="right">{formatCurrency(inv.total)}</TableCell>
                  <TableCell align="right">{formatCurrency(inv.paid)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: inv.balance > 0 ? 'bold' : 'normal' }}>
                    {formatCurrency(inv.balance)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={inv.status}
                      size="small"
                      color={inv.status === 'paid' ? 'success' : 'error'}
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell>
                    {inv.invoicesForStudent > 1 ? (
                      <Chip label={`${inv.invoicesForStudent} (duplicado)`} size="small" color="warning" />
                    ) : (
                      '1'
                    )}
                  </TableCell>
                  <TableCell>{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 10 }}>{inv.id.slice(0, 8)}...</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  )
}
