import * as React from 'react'
import { Card, CardHeader, CardContent, Grid, Stack, Button, Chip, Typography, Accordion, AccordionSummary, AccordionDetails, Divider } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { Registration } from '../../registrations/types'
import { norm, isKoreanLanguage, mapKoreanLevel } from '../../../lib/query'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

function toCSV(rows: any[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: any) => `"${String(v ?? '').replace(/"/g,'""')}"`
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))]
  return lines.join('\n')
}

export default function RegistrationsReportPage() {
  const [regs, setRegs] = React.useState<Registration[]>([])
  React.useEffect(() => onSnapshot(collection(db,'fall_academy_2025'), s => setRegs(s.docs.map(d=>({ id:d.id, ...(d.data() as any) })))), [])

  type RowCount = { id:string; academy:string; p1:number; p2:number; total:number }
  const counts: Record<string, RowCount> = {}
  regs.forEach(r => {
    const a1 = norm(r.firstPeriod?.academy), a2 = norm(r.secondPeriod?.academy)
    if (a1 && a1.toLowerCase() !== 'n/a') { counts[a1] = counts[a1] || { id:a1, academy:a1, p1:0, p2:0, total:0 }; counts[a1].p1++; counts[a1].total++ }
    if (a2 && a2.toLowerCase() !== 'n/a') { counts[a2] = counts[a2] || { id:a2, academy:a2, p1:0, p2:0, total:0 }; counts[a2].p2++; counts[a2].total++ }
  })
  const rowsCount = Object.values(counts).sort((a,b)=>a.academy.localeCompare(b.academy))
  const chartData = rowsCount.map(r => ({ academy:r.academy, P1:r.p1, P2:r.p2 }))
  const totalRegs = rowsCount.reduce((s,r)=>s+r.total,0)

  type KLRow = { id:string; level:string; p1:number; p2:number; total:number }
  const levels = ['Alphabet','Beginner','Intermediate','K-Movie Conversation']
  const klMap: Record<string, KLRow> = Object.fromEntries(levels.map(k => [k, { id:k, level:k, p1:0, p2:0, total:0 }]))
  regs.forEach(r => {
    const a1 = norm(r.firstPeriod?.academy), a2 = norm(r.secondPeriod?.academy)
    if (isKoreanLanguage(a1)) { const lv = mapKoreanLevel(r.firstPeriod?.level) || 'Unknown'; const row = klMap[lv] || (klMap[lv] = { id:lv, level:lv, p1:0, p2:0, total:0 }); row.p1++; row.total++ }
    if (isKoreanLanguage(a2)) { const lv = mapKoreanLevel(r.secondPeriod?.level) || 'Unknown'; const row = klMap[lv] || (klMap[lv] = { id:lv, level:lv, p1:0, p2:0, total:0 }); row.p2++; row.total++ }
  })
  const rowsKL = Object.values(klMap).filter(r => r.total>0)

  const gMap = { Male:0, Female:0, Other:0, Unknown:0 }
  regs.forEach(r => { const g = (r.gender || 'Unknown') as keyof typeof gMap; if (gMap[g] === undefined) gMap.Unknown += 1; else gMap[g] += 1 })
  const pieGender = Object.entries(gMap).map(([name,value]) => ({ name, value }))

  const colsCount: GridColDef[] = [
    { field:'academy', headerName:'Academy', flex:1, minWidth:200 },
    { field:'p1', headerName:'P1', width:90 },
    { field:'p2', headerName:'P2', width:90 },
    { field:'total', headerName:'Total', width:110 },
  ]
  const colsKL: GridColDef[] = [
    { field:'level', headerName:'Korean Level', flex:1, minWidth:220 },
    { field:'p1', headerName:'P1', width:90 },
    { field:'p2', headerName:'P2', width:90 },
    { field:'total', headerName:'Total', width:110 },
  ]

  const exportCSV = (rows: any[], name: string) => {
    const blob = new Blob([toCSV(rows)], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${name}-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const docx = new jsPDF({ unit:'pt', format:'a4' })
    const mx = 48; let y = 56
    docx.setFont('helvetica','bold'); docx.setFontSize(16); docx.text('IYF Orlando — Registrations Report', mx, y); y+=18
    docx.setFont('helvetica','normal'); docx.setFontSize(11); docx.text(`Generated: ${new Date().toLocaleString()}`, mx, y); y+=12
    docx.text(`Total registrations: ${totalRegs}`, mx, y); y+=14
    autoTable(docx, { startY:y, theme:'grid', head:[['Academy','P1','P2','Total']], body: rowsCount.map(r=>[r.academy,r.p1,r.p2,r.total]), margin:{left:mx,right:mx}, styles:{fontSize:10}, headStyles:{fillColor:[240,240,240]} })
    y = (docx as any).lastAutoTable.finalY + 12
    if (rowsKL.length) {
      autoTable(docx, { startY:y, theme:'grid', head:[['Korean Level','P1','P2','Total']], body: rowsKL.map(r=>[r.level,r.p1,r.p2,r.total]), margin:{left:mx,right:mx}, styles:{fontSize:10}, headStyles:{fillColor:[240,240,240]} })
    }
    docx.save(`registrations-report-${new Date().toISOString().slice(0,10)}.pdf`)
  }

  return (
    <Card elevation={0} sx={{ borderRadius: 3 }}>
      <CardHeader
        title="Registrations — Detailed Report"
        subheader="Charts + sub-reports + exports"
        action={<Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={()=>exportCSV(rowsCount,'registrations-by-academy')}>CSV (Academy)</Button>
          <Button variant="outlined" onClick={()=>exportCSV(rowsKL,'korean-levels')}>CSV (Korean)</Button>
          <Button variant="contained" onClick={exportPDF}>PDF</Button>
        </Stack>}
      />
      <CardContent>
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          <Chip label={`Total ${rowsCount.reduce((s,r)=>s+r.total,0)}`} />
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Typography variant="h6" sx={{ mb: 1 }}>Registrations by Academy (P1/P2)</Typography>
            <div style={{ width:'100%', height: 340 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="academy" />
                  <YAxis />
                  <RTooltip />
                  <Legend />
                  <Bar dataKey="P1" />
                  <Bar dataKey="P2" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Grid>
          <Grid item xs={12} lg={4}>
            <Typography variant="h6" sx={{ mb: 1 }}>Gender Split</Typography>
            <div style={{ width:'100%', height: 340 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieGender} dataKey="value" nameKey="name" label>
                    {pieGender.map((_,i)=><Cell key={i} />)}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Grid>

          {/* Sub-reports */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Sub-report: Korean Levels</Typography></AccordionSummary>
              <AccordionDetails>
                <div style={{ height: 380, width:'100%' }}>
                  <DataGrid rows={rowsKL} columns={colsKL} getRowId={(r)=>r.id} disableRowSelectionOnClick />
                </div>
              </AccordionDetails>
            </Accordion>
          </Grid>

          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Sub-report: By Academy & Period</Typography></AccordionSummary>
              <AccordionDetails>
                <div style={{ height: 420, width:'100%' }}>
                  <DataGrid rows={rowsCount} columns={colsCount} getRowId={(r)=>r.id} disableRowSelectionOnClick />
                </div>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}