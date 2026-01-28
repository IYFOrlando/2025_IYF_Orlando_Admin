import * as React from 'react'
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Box, Card, CardContent, Typography, Table, TableBody, TableCell, TableHead, TableRow, CircularProgress, Chip } from '@mui/material'
import { COLLECTIONS_CONFIG } from '../config/shared.js'

// Helper to format currency (amounts are in cents, convert to dollars)
const formatCurrency = (amountInCents: number): string => {
  const dollars = amountInCents / 100
  const formatted = dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return formatted
}

interface InvoiceWithLevel {
  id: string
  studentId: string
  studentName: string
  total: number
  paid: number
  balance: number
  status: string
  createdAt: Date | null
  createdAtSeconds: number
  level?: string
  invoicesForStudent: number
}

export default function InvoiceDebugPage() {
  const [loading, setLoading] = React.useState(true)
  const [invoices, setInvoices] = React.useState<InvoiceWithLevel[]>([])
  const [stats, setStats] = React.useState<{
    collected: number
    pendingAll: number
    pendingVigente: number
    unpaidAll: number
    unpaidVigente: number
    studentsWithBalanceVigente: number
    studentsWithDuplicates: number
    totalDocs: number
    totalVigente: number
  }>({
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
  const [levelMap, setLevelMap] = React.useState<Record<string, string>>({})

  // Realtime subscription to academy_invoices_2026 (same as Dashboard/Payments)
  React.useEffect(() => {
    const invoicesRef = collection(db, COLLECTIONS_CONFIG.academyInvoices)
    const q = query(invoicesRef, orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: InvoiceWithLevel[] = []
        let totalCollected = 0
        let totalPendingAll = 0
        let unpaidAllCount = 0
        const countByStudent = new Map<string, number>()
        const createdAtSec = (v: unknown) => (v && typeof v === 'object' && 'seconds' in v ? (v as { seconds: number }).seconds : 0)

        snapshot.docs.forEach((docSnap) => {
          const data = docSnap.data()
          const studentId = data.studentId || ''
          const balance = data.balance ?? 0
          const sec = createdAtSec(data.createdAt)
          countByStudent.set(studentId, (countByStudent.get(studentId) ?? 0) + 1)

          list.push({
            id: docSnap.id,
            studentId,
            studentName: data.studentName || 'N/A',
            total: data.total || 0,
            paid: data.paid || 0,
            balance,
            status: data.status || 'unknown',
            createdAt: data.createdAt?.toDate?.() ?? null,
            createdAtSeconds: sec,
            invoicesForStudent: 0,
          })
          totalCollected += data.paid ?? 0
          totalPendingAll += balance
          if (data.status !== 'paid') unpaidAllCount++
        })

        const latestByStudent = new Map<string, InvoiceWithLevel>()
        list.forEach((inv) => {
          const cur = latestByStudent.get(inv.studentId)
          if (!cur || inv.createdAtSeconds > cur.createdAtSeconds) latestByStudent.set(inv.studentId, inv)
        })
        const vigente = Array.from(latestByStudent.values())
        const pendingVigente = vigente.reduce((s, i) => s + i.balance, 0)
        const unpaidVigenteCount = vigente.filter((i) => i.status !== 'paid').length
        const studentsWithBalanceVigente = vigente.filter((i) => i.balance > 0).length
        const studentsWithDuplicates = [...countByStudent.values()].filter((c) => c > 1).length

        list.forEach((inv) => {
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
        setLoading(false)
      },
      (err) => {
        console.error('Invoice debug snapshot error', err)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  // Load Korean level from registrations (same collection as app: spring semester)
  const regCollection = COLLECTIONS_CONFIG.fallAcademy
  const studentIdsKey = React.useMemo(
    () => [...new Set(invoices.map((i) => i.studentId).filter(Boolean))].sort().join(','),
    [invoices]
  )
  React.useEffect(() => {
    const ids = studentIdsKey ? studentIdsKey.split(',') : []
    if (ids.length === 0) {
      setLevelMap({})
      return
    }
    let cancelled = false
    const map: Record<string, string> = {}
    Promise.all(
      ids.map(async (studentId) => {
        if (cancelled) return
        try {
          const regDoc = await getDoc(doc(db, regCollection, studentId))
          if (regDoc.exists() && !cancelled) {
            const d = regDoc.data()
            map[studentId] = d.firstPeriod?.koreanLevel || d.secondPeriod?.koreanLevel || 'N/A'
          }
        } catch {
          // ignore
        }
      })
    ).then(() => {
      if (!cancelled) setLevelMap((prev) => ({ ...prev, ...map }))
    })
    return () => { cancelled = true }
  }, [studentIdsKey, regCollection])

  const invoicesWithLevel = React.useMemo(
    () =>
      invoices.map((inv) => ({
        ...inv,
        level: inv.studentId ? levelMap[inv.studentId] : undefined,
      })),
    [invoices, levelMap]
  )

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
          <Typography variant="h4" gutterBottom>📋 Reporte de Facturas</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {`Datos en tiempo real (misma colección que Dashboard: ${COLLECTIONS_CONFIG.academyInvoices}).`}
          </Typography>
          <Typography variant="h6" gutterBottom>Resumen (debe coincidir con Dashboard y Payments):</Typography>
          <Typography>Total cobrado: <strong>{formatCurrency(stats.collected)}</strong></Typography>
          <Typography>Total pendiente (solo factura vigente por alumno): <strong>{formatCurrency(stats.pendingVigente)}</strong></Typography>
          <Typography>Alumnos con saldo (factura vigente): <strong>{stats.studentsWithBalanceVigente}</strong></Typography>
          <Typography>Facturas no pagadas – partial + unpaid (solo vigente): <strong>{stats.unpaidVigente}</strong></Typography>

          <Typography variant="subtitle2" sx={{ mt: 2 }} color="text.secondary">Contexto (todos los documentos):</Typography>
          <Typography variant="body2">Total de documentos de facturas: <strong>{stats.totalDocs}</strong></Typography>
          <Typography variant="body2">Factura vigente por alumno (1 por alumno): <strong>{stats.totalVigente}</strong></Typography>
          {stats.studentsWithDuplicates > 0 && (
            <Typography variant="body2" color="warning.main">Alumnos con más de 1 factura (historial): <strong>{stats.studentsWithDuplicates}</strong></Typography>
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
                <TableCell>Level</TableCell>
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
              {invoicesWithLevel.map((inv, idx) => (
                <TableRow
                  key={inv.id}
                  sx={{
                    backgroundColor: inv.balance > 1000 ? '#fff3cd' : inv.invoicesForStudent > 1 ? 'rgba(255,152,0,0.08)' : 'transparent',
                  }}
                >
                  <TableCell>{idx + 1}</TableCell>
                  <TableCell>{inv.studentName}</TableCell>
                  <TableCell>
                    {inv.level ? (
                      <Chip label={inv.level} size="small" color="primary" variant="outlined" />
                    ) : (
                      <Typography variant="caption" color="text.secondary">-</Typography>
                    )}
                  </TableCell>
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
                  <TableCell>{inv.createdAt ? inv.createdAt.toLocaleDateString() : 'N/A'}</TableCell>
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
