import * as React from 'react'
import {
  Grid, Card, CardContent, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, Divider, Stack, Button
} from '@mui/material'
import { useRegistrations } from '../../registrations/hooks/useRegistrations'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { displayYMD } from '../../../lib/date'
import { normalizeAcademy, normalizeLevel } from '../../../lib/normalization'
import logoImage from '../../../assets/logo/IYF_logo.png'

type CountRow = { academy: string; count: number }
type KoreanLevelRow = { level: string; count: number }

export default function DashboardPage() {
  const { data, loading } = useRegistrations()

  const { totals, p1Rows, p2Rows, koreanLevelRows } = React.useMemo(() => {
    const p1 = new Map<string, number>()
    const p2 = new Map<string, number>()
    const koreanLevels = new Map<string, number>()

    for (const r of data) {
      const a1 = r?.firstPeriod?.academy
      const a2 = r?.secondPeriod?.academy

      // Period 1 academy tally
      if (a1 && normalizeAcademy(a1) !== 'n/a') {
        const key = normalizeAcademy(a1)
        p1.set(key, (p1.get(key) || 0) + 1)
        
        // Track Korean Language levels
        if (key === 'Korean Language' && r.firstPeriod?.level) {
          const level = normalizeLevel(r.firstPeriod.level)
          koreanLevels.set(level, (koreanLevels.get(level) || 0) + 1)
        }
      }

      // Period 2 academy tally
      if (a2 && normalizeAcademy(a2) !== 'n/a') {
        const key = normalizeAcademy(a2)
        p2.set(key, (p2.get(key) || 0) + 1)
        
        // Track Korean Language levels
        if (key === 'Korean Language' && r.secondPeriod?.level) {
          const level = normalizeLevel(r.secondPeriod.level)
          koreanLevels.set(level, (koreanLevels.get(level) || 0) + 1)
        }
      }
    }

    // Define academies available in each period
    const p1Academies = [
      'Art', 'DIY', 'Korean Language', 'Piano',
      'Pickleball', 'Senior', 'Soccer', 'Stretch and Strengthen'
    ]
    
    const p2Academies = [
      'Art', 'DIY', 'Korean Language', 'Korean Cooking', 'Piano',
      'Senior', 'Kids'
    ]

    const p1Rows: CountRow[] = p1Academies
      .map(academy => ({ 
        academy, 
        count: p1.get(academy) || 0 
      }))
      .sort((a, b) => b.count - a.count)

    const p2Rows: CountRow[] = p2Academies
      .map(academy => ({ 
        academy, 
        count: p2.get(academy) || 0 
      }))
      .sort((a, b) => b.count - a.count)

    const koreanLevelRows: KoreanLevelRow[] = Array.from(koreanLevels.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count)

    const totals = {
      registrations: data.length,
      p1Total: p1Rows.reduce((s, r) => s + r.count, 0),
      p2Total: p2Rows.reduce((s, r) => s + r.count, 0),
    }

    return { totals, p1Rows, p2Rows, koreanLevelRows }
  }, [data])

  const exportPDF = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const marginX = 40
    const pageWidth = doc.internal.pageSize.width

    // Add IYF Logo
    try {
      doc.addImage(logoImage, 'PNG', marginX, 20, 40, 40)
    } catch (error) {
      // Fallback to text if image fails to load
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(24)
      doc.setTextColor(0, 0, 0)
      doc.text('IYF', marginX, 40)
    }
  

    // Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.setTextColor(0, 0, 0) // Black color
    doc.text('2025 Fall Academy Report', pageWidth / 2, 70, { align: 'center' })
    
    // Subtitle
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 85, { align: 'center' })

    // Decorative line
    doc.setDrawColor(25, 118, 210)
    doc.setLineWidth(2)
    doc.line(marginX, 95, pageWidth - marginX, 95)

    // KPIs with better styling
    autoTable(doc, {
      startY: 110,
      styles: { 
        fontSize: 11,
        cellPadding: 8,
        lineColor: [25, 118, 210],
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: 255,
        fontStyle: 'bold'
      },
      head: [['Metric', 'Value']],
      body: [
        ['Total Registrations', String(totals.registrations)],
        ['Total Period 1', String(totals.p1Total)],
        ['Total Period 2', String(totals.p2Total)],
      ],
      theme: 'grid',
      margin: { left: marginX, right: marginX },
    })



    // Period 1 with enhanced styling
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Academy', 'Count (Period 1)']],
      body: p1Rows.map(r => [r.academy, r.count]),
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: { 
        fontSize: 11,
        cellPadding: 6,
        lineColor: [25, 118, 210],
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: 255,
        fontStyle: 'bold'
      },
    })

    // Period 2 with enhanced styling
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Academy', 'Count (Period 2)']],
      body: p2Rows.map(r => [r.academy, r.count]),
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      styles: { 
        fontSize: 11,
        cellPadding: 6,
        lineColor: [25, 118, 210],
        lineWidth: 0.5
      },
      headStyles: {
        fillColor: [25, 118, 210],
        textColor: 255,
        fontStyle: 'bold'
      },
    })

    // Korean Language by Levels
    if (koreanLevelRows.length > 0) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Korean Language - Level', 'Students']],
        body: koreanLevelRows.map(r => [r.level, r.count]),
        theme: 'grid',
        margin: { left: marginX, right: marginX },
        styles: { 
          fontSize: 11,
          cellPadding: 6,
          lineColor: [25, 118, 210],
          lineWidth: 0.5
        },
        headStyles: {
          fillColor: [25, 118, 210],
          textColor: 255,
          fontStyle: 'bold'
        },
      })
    }

    // Footer with IYF branding
    const finalY = (doc as any).lastAutoTable.finalY + 30
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text('IYF Orlando', pageWidth / 2, finalY, { align: 'center' })

    doc.save(`iyf-2025-fall-academy-report-${displayYMD(new Date())}.pdf`)
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

      {/* Korean Language by Levels */}
      <Grid item xs={12}>
        <Card elevation={0} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6">Korean Language — by Level</Typography>
            <Divider sx={{ my: 2 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Level</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Students</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {koreanLevelRows.map((r) => (
                  <TableRow key={r.level}>
                    <TableCell>{r.level}</TableCell>
                    <TableCell align="right">{r.count}</TableCell>
                  </TableRow>
                ))}
                {koreanLevelRows.length === 0 && (
                  <TableRow><TableCell colSpan={2}>No Korean Language registrations.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Grid>

    </Grid>
  )
}
