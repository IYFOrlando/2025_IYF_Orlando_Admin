import * as React from 'react'
import {
  Grid, Card, CardContent, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, Divider, Stack, Button
} from '@mui/material'
import { useRegistrations } from '../../registrations/hooks/useRegistrations'
import { useEmailDatabase } from '../../emails/hooks/useEmailDatabase'
import { useAutoInvoice } from '../../registrations/hooks/useAutoInvoice'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { displayYMD } from '../../../lib/date'
import { normalizeAcademy, normalizeLevel } from '../../../lib/normalization'
import logoImage from '../../../assets/logo/IYF_logo.png'

type CountRow = { academy: string; count: number }
type KoreanLevelRow = { level: string; count: number }

export default function DashboardPage() {
  const { data, loading } = useRegistrations()
  const { getUniqueEmails, getEmailsBySource } = useEmailDatabase()
  
  // Auto-create invoices for new registrations
  useAutoInvoice(true)

  const { totals, academyRows, koreanLevelRows } = React.useMemo(() => {
    const academies = new Map<string, number>()
    const koreanLevels = new Map<string, number>()

    // 2026 Structure: Process selectedAcademies array (no periods)
    for (const r of data) {
      // NEW STRUCTURE (2026): Check for selectedAcademies array
      if ((r as any).selectedAcademies && Array.isArray((r as any).selectedAcademies)) {
        const selectedAcademies = (r as any).selectedAcademies
        selectedAcademies.forEach((academyData: any) => {
          if (academyData.academy && normalizeAcademy(academyData.academy) !== 'n/a') {
            const key = normalizeAcademy(academyData.academy)
            academies.set(key, (academies.get(key) || 0) + 1)
            
            // Track Korean Language levels
            if (key === 'korean language' && academyData.level) {
              const level = normalizeLevel(academyData.level)
              koreanLevels.set(level, (koreanLevels.get(level) || 0) + 1)
            }
          }
        })
      } 
      // LEGACY STRUCTURE: Support firstPeriod/secondPeriod for backward compatibility
      else {
        const a1 = r?.firstPeriod?.academy
        const a2 = r?.secondPeriod?.academy

        if (a1 && normalizeAcademy(a1) !== 'n/a') {
          const key = normalizeAcademy(a1)
          academies.set(key, (academies.get(key) || 0) + 1)
          
          if (key === 'korean language' && r.firstPeriod?.level) {
            const level = normalizeLevel(r.firstPeriod.level)
            koreanLevels.set(level, (koreanLevels.get(level) || 0) + 1)
          }
        }

        if (a2 && normalizeAcademy(a2) !== 'n/a') {
          const key = normalizeAcademy(a2)
          academies.set(key, (academies.get(key) || 0) + 1)
          
          if (key === 'korean language' && r.secondPeriod?.level) {
            const level = normalizeLevel(r.secondPeriod.level)
            koreanLevels.set(level, (koreanLevels.get(level) || 0) + 1)
          }
        }
      }
    }

    // 2026 Spring Semester Academies
    const availableAcademies = [
      'Art',
      'English',
      'Kids Academy',
      'Korean Language',
      'Piano',
      'Pickleball',
      'Soccer',
      'Taekwondo'
    ]

    const academyRows: CountRow[] = availableAcademies
      .map(academy => ({ 
        academy, 
        count: academies.get(normalizeAcademy(academy)) || 0 
      }))
      .sort((a, b) => b.count - a.count)

    const koreanLevelRows: KoreanLevelRow[] = Array.from(koreanLevels.entries())
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => b.count - a.count)

    const totalAcademies = academyRows.reduce((s, r) => s + r.count, 0)

    const totals = {
      registrations: data.length,
      totalAcademies,
    }

    return { totals, academyRows, koreanLevelRows }
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
    const currentYear = new Date().getFullYear()
    doc.text(`${currentYear} Spring Academy Report`, pageWidth / 2, 70, { align: 'center' })
    
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
        ['Total Academy Selections', String(totals.totalAcademies)],
      ],
      theme: 'grid',
      margin: { left: marginX, right: marginX },
    })



    // Academies (2026 - No periods)
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Academy', 'Count']],
      body: academyRows.map(r => [r.academy, r.count]),
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

    doc.save(`iyf-${currentYear}-spring-academy-report-${displayYMD(new Date())}.pdf`)
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
            <Typography variant="h6">Total Academy Selections</Typography>
            <Typography variant="h3" fontWeight={800}>{loading ? '…' : totals.totalAcademies}</Typography>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Email Database Stats */}
      <Grid item xs={12} md={3}>
        <Card elevation={0} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6">Email Database</Typography>
            <Typography variant="h3" fontWeight={800}>{getUniqueEmails().length}</Typography>
            <Typography variant="body2" color="text.secondary">
              {getEmailsBySource('registrations').length} students, {getEmailsBySource('staff').length} staff
            </Typography>
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

      {/* Academies (2026 - No periods) */}
      <Grid item xs={12}>
        <Card elevation={0} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6">Academies — by Selection Count</Typography>
            <Divider sx={{ my: 2 }} />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Academy</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {academyRows.map((r) => (
                  <TableRow key={r.academy}>
                    <TableCell>{r.academy}</TableCell>
                    <TableCell align="right">{r.count}</TableCell>
                  </TableRow>
                ))}
                {academyRows.length === 0 && (
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
