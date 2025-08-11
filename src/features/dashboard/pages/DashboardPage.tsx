import * as React from 'react'
import {
  Grid, Card, CardContent, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, Divider, Stack, Button
} from '@mui/material'
import { useRegistrations } from '../../registrations/hooks/useRegistrations'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { displayYMD } from '../../../lib/date'

type CountRow = { academy: string; count: number }
type KLRow = { level: string; period1: number; period2: number; total: number }

// ---------- Robust matchers ----------
function normalizeAcademy(s?: string) {
  return (s ?? '').toString().trim().toLowerCase()
}
function isKoreanLanguage(acad?: string) {
  const a = normalizeAcademy(acad)
  if (!a) return false
  // exclude Korean Cooking explicitly
  if (a.includes('cook')) return false
  // accept common variants & typos
  if (a.includes('korean')) return true           // "Korean Language", "Korean Lang"
  if (a.includes('corean') || a.includes('kore')) return true // "coreano", "koreano"
  return false
}
function normalizeLevel(level?: string) {
  const v = (level ?? '').toString().trim().toLowerCase()
  if (!v || v === 'n/a') return 'Unknown'
  if (v.startsWith('alpha')) return 'Alphabet'
  if (v.startsWith('begin')) return 'Beginner'
  if (v.startsWith('inter')) return 'Intermediate'
  // Map new label + legacy "Advanced" to K-Movie Conversation
  if (v.includes('movie') || v.includes('k-movie') || v.startsWith('adv') || v.includes('conversation'))
    return 'K-Movie Conversation'
  return 'Unknown'
}

export default function DashboardPage() {
  const { data, loading } = useRegistrations()

  const { totals, p1Rows, p2Rows, klRows } = React.useMemo(() => {
    const p1 = new Map<string, number>()
    const p2 = new Map<string, number>()
    const klP1 = new Map<string, number>()
    const klP2 = new Map<string, number>()

    for (const r of data) {
      const a1 = r?.firstPeriod?.academy
      const l1 = r?.firstPeriod?.level
      const a2 = r?.secondPeriod?.academy
      const l2 = r?.secondPeriod?.level

      // Period 1 academy tally
      if (a1 && normalizeAcademy(a1) !== 'n/a') {
        const key = (a1 ?? '').toString().trim()
        p1.set(key, (p1.get(key) || 0) + 1)
        if (isKoreanLanguage(a1)) {
          const lvl = normalizeLevel(l1)
          klP1.set(lvl, (klP1.get(lvl) || 0) + 1)
        }
      }

      // Period 2 academy tally
      if (a2 && normalizeAcademy(a2) !== 'n/a') {
        const key = (a2 ?? '').toString().trim()
        p2.set(key, (p2.get(key) || 0) + 1)
        if (isKoreanLanguage(a2)) {
          const lvl = normalizeLevel(l2)
          klP2.set(lvl, (klP2.get(lvl) || 0) + 1)
        }
      }
    }

    const p1Rows: CountRow[] = Array.from(p1.entries())
      .map(([academy, count]) => ({ academy, count }))
      .sort((a, b) => b.count - a.count)

    const p2Rows: CountRow[] = Array.from(p2.entries())
      .map(([academy, count]) => ({ academy, count }))
      .sort((a, b) => b.count - a.count)

    const levelOrder = ['Alphabet','Beginner','Intermediate','K-Movie Conversation','Unknown'] as const
    const allLevels = new Set<string>([...klP1.keys(), ...klP2.keys(), ...levelOrder])

    const klRows: KLRow[] = Array.from(allLevels)
      .map(level => {
        const period1 = klP1.get(level) || 0
        const period2 = klP2.get(level) || 0
        return { level, period1, period2, total: period1 + period2 }
      })
      .filter(r => r.total > 0)
      .sort((a,b) => {
        const ai = levelOrder.indexOf(a.level as any)
        const bi = levelOrder.indexOf(b.level as any)
        if (ai !== -1 && bi !== -1) return ai - bi
        if (ai !== -1) return -1
        if (bi !== -1) return 1
        return b.total - a.total
      })

    const totals = {
      registrations: data.length,
      p1Total: p1Rows.reduce((s, r) => s + r.count, 0),
      p2Total: p2Rows.reduce((s, r) => s + r.count, 0),
    }

    return { totals, p1Rows, p2Rows, klRows }
  }, [data])

  const exportPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const marginX = 40

    // Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('IYF Orlando — Dashboard Report', marginX, 50)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, marginX, 68)

    // KPIs
    autoTable(doc, {
      startY: 90,
      styles: { fontSize: 11 },
      head: [['Metric', 'Value']],
      body: [
        ['Total Registrations', String(totals.registrations)],
        ['Total Period 1', String(totals.p1Total)],
        ['Total Period 2', String(totals.p2Total)],
      ],
      theme: 'grid',
      margin: { left: marginX, right: marginX },
    })

    // Period 1
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 18,
      head: [['Academy', 'Count (P1)']],
      body: p1Rows.map(r => [r.academy, r.count]),
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 11 },
    })

    // Period 2
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 18,
      head: [['Academy', 'Count (P2)']],
      body: p2Rows.map(r => [r.academy, r.count]),
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 11 },
    })

    // Korean Language by Level
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 18,
      head: [['Korean Language — Level', 'P1', 'P2', 'Total']],
      body: klRows.map(r => [r.level, r.period1, r.period2, r.total]),
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 11 },
    })

    // Footer removed
    doc.save(`iyf-dashboard-${displayYMD(new Date())}.pdf`)
  }

  return (
    <Grid container spacing={3}>
      {/* KPIs */}
      <Grid item xs={12} md={3}>
        <Card elevation={0} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6">Total Registrations</Typography>
            <Typography variant="h3" fontWeight={800}>{loading ? '…' : totals.registrations}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card elevation={0} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6">Total Period 1</Typography>
            <Typography variant="h3" fontWeight={800}>{loading ? '…' : totals.p1Total}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card elevation={0} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6">Total Period 2</Typography>
            <Typography variant="h3" fontWeight={800}>{loading ? '…' : totals.p2Total}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card elevation={0} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Export</Typography>
              <Button size="small" variant="outlined" onClick={exportPDF}>PDF</Button>
            </Stack>
            <Typography variant="body2" color="text.secondary">Download the tables below as a PDF.</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Period 1 */}
      <Grid item xs={12} md={6}>
        <Card elevation={0} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6">Period 1 — by Academy</Typography>
            <Divider sx={{ my: 2 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Academy</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {p1Rows.map((r) => (
                  <TableRow key={r.academy}>
                    <TableCell>{r.academy}</TableCell>
                    <TableCell align="right">{r.count}</TableCell>
                  </TableRow>
                ))}
                {p1Rows.length === 0 && (
                  <TableRow><TableCell colSpan={2}>No entries.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      {/* Period 2 */}
      <Grid item xs={12} md={6}>
        <Card elevation={0} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6">Period 2 — by Academy</Typography>
            <Divider sx={{ my: 2 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Academy</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {p2Rows.map((r) => (
                  <TableRow key={r.academy}>
                    <TableCell>{r.academy}</TableCell>
                    <TableCell align="right">{r.count}</TableCell>
                  </TableRow>
                ))}
                {p2Rows.length === 0 && (
                  <TableRow><TableCell colSpan={2}>No entries.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

      {/* Korean Language by Level */}
      <Grid item xs={12}>
        <Card elevation={0} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6">Korean Language — by Level</Typography>
            <Divider sx={{ my: 2 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Level</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>P1</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>P2</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {klRows.map((r) => (
                  <TableRow key={r.level}>
                    <TableCell>{r.level}</TableCell>
                    <TableCell align="right">{r.period1}</TableCell>
                    <TableCell align="right">{r.period2}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{r.total}</TableCell>
                  </TableRow>
                ))}
                {klRows.length === 0 && (
                  <TableRow><TableCell colSpan={4}>No Korean Language entries.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}
