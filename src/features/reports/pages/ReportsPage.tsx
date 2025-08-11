import * as React from 'react'
import {
  Card, CardHeader, CardContent, Grid, Stack, Chip, Button, Typography, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import type { Registration } from '../../registrations/types'
import type { Invoice } from '../../payments/types'
import { usd, norm, isKoreanLanguage, mapKoreanLevel } from '../../../lib/query'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function toCSV(rows: any[]) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: any) => `"${String(v ?? '').replace(/"/g,'""')}"`
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))]
  return lines.join('\n')
}

export default function ReportsPage() {
  const [regs, setRegs] = React.useState<Registration[]>([])
  const [invoices, setInvoices] = React.useState<Invoice[]>([])

  React.useEffect(() => {
    const u1 = onSnapshot(collection(db, 'fall_academy_2025'), (snap) => {
      setRegs(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
    })
    const u2 = onSnapshot(collection(db, 'academy_invoices'), (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Invoice)))
    })
    return () => { u1(); u2() }
  }, [])

  // ----- Registrations aggregates -----
  type RRow = { id:string; academy:string; p1:number; p2:number; total:number }
  const regCount: Record<string, RRow> = {}
  regs.forEach(r => {
    const a1 = norm(r.firstPeriod?.academy), a2 = norm(r.secondPeriod?.academy)
    if (a1 && a1.toLowerCase() !== 'n/a') { regCount[a1] = regCount[a1] || { id:a1, academy:a1, p1:0, p2:0, total:0 }; regCount[a1].p1++; regCount[a1].total++ }
    if (a2 && a2.toLowerCase() !== 'n/a') { regCount[a2] = regCount[a2] || { id:a2, academy:a2, p1:0, p2:0, total:0 }; regCount[a2].p2++; regCount[a2].total++ }
  })
  const rowsReg = Object.values(regCount).sort((a,b)=>a.academy.localeCompare(b.academy))
  const totalRegs = rowsReg.reduce((s,r)=>s+r.total,0)
  const regChart = rowsReg.map(r => ({ academy: r.academy, P1: r.p1, P2: r.p2 }))

  // Korean levels (counts)
  type KLRow = { id:string; level:string; p1:number; p2:number; total:number }
  const levelList = ['Alphabet','Beginner','Intermediate','K-Movie Conversation']
  const klMap: Record<string, KLRow> = Object.fromEntries(levelList.map(k => [k, { id:k, level:k, p1:0, p2:0, total:0 }]))
  regs.forEach(r => {
    const a1 = norm(r.firstPeriod?.academy), a2 = norm(r.secondPeriod?.academy)
    if (isKoreanLanguage(a1)) { const lv = mapKoreanLevel(r.firstPeriod?.level) || 'Unknown'; const row = klMap[lv] || (klMap[lv] = { id:lv, level:lv, p1:0, p2:0, total:0 }); row.p1++; row.total++ }
    if (isKoreanLanguage(a2)) { const lv = mapKoreanLevel(r.secondPeriod?.level) || 'Unknown'; const row = klMap[lv] || (klMap[lv] = { id:lv, level:lv, p1:0, p2:0, total:0 }); row.p2++; row.total++ }
  })
  const rowsKL = Object.values(klMap).filter(r => r.total>0)

  // ----- Payments aggregates -----
  const total = invoices.reduce((s, i) => s + Number(i.total || 0), 0)
  const paid = invoices.reduce((s, i) => s + Number(i.paid || 0), 0)
  const balance = invoices.reduce((s, i) => s + Number(i.balance || 0), 0)
  const cPaid = invoices.filter(i => i.status === 'paid').length
  const cPartial = invoices.filter(i => i.status === 'partial').length
  const cUnpaid = invoices.filter(i => i.status === 'unpaid').length
  const lunchRevenue = invoices.reduce((s, i) => s + Number(i.lunchAmount || 0), 0)
  const discounts = invoices.reduce((s, i) => s + Number(i.discountAmount || 0), 0)

  // Revenue by academy (from invoice lines)
  const revByAcad: Record<string, number> = {}
  invoices.forEach(inv => (inv.lines||[]).forEach(l => {
    const k = norm(l.academy); revByAcad[k] = (revByAcad[k] || 0) + Number(l.amount || 0)
  }))
  const rowsRevenue = Object.entries(revByAcad).map(([academy, amount]) => ({ id: academy, academy, amount })).sort((a,b)=>b.amount-a.amount)

  // Invoices by day
  const byDay: Record<string, number> = {}
  invoices.forEach(i => {
    const ms = i.createdAt?.seconds ? i.createdAt.seconds * 1000 : Date.now()
    const d = new Date(ms)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    byDay[key] = (byDay[key] || 0) + Number(i.total || 0)
  })
  const daily = Object.entries(byDay).map(([day, amount]) => ({ day, amount })).sort((a,b)=>a.day.localeCompare(b.day))

  // ----- columns -----
  const colsReg: GridColDef[] = [
    { field:'academy', headerName:'Academy', flex:1, minWidth:190 },
    { field:'p1', headerName:'P1', width:90 },
    { field:'p2', headerName:'P2', width:90 },
    { field:'total', headerName:'Total', width:110 },
  ]
  const colsKL: GridColDef[] = [
    { field:'level', headerName:'Korean Level', flex:1, minWidth:200 },
    { field:'p1', headerName:'P1', width:90 },
    { field:'p2', headerName:'P2', width:90 },
    { field:'total', headerName:'Total', width:110 },
  ]


  // ----- exports -----
  const exportCSV = (rows: any[], name: string) => {
    const csv = toCSV(rows)
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${name}-${new Date().toISOString().slice(0,10)}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const docx = new jsPDF({ unit:'pt', format:'a4' })
    const mx = 48
    let y = 56
    docx.setFont('helvetica','bold'); docx.setFontSize(16)
    docx.text('IYF Orlando — General Report', mx, y); y+=18
    docx.setFont('helvetica','normal'); docx.setFontSize(11)
    docx.text(`Generated: ${new Date().toLocaleString()}`, mx, y); y+=16
    autoTable(docx, { startY:y, theme:'plain', margin:{left:mx,right:mx}, body:[
      ['Total Invoices', usd(total)], ['Paid', usd(paid)], ['Balance', usd(balance)],
      ['# Paid', cPaid], ['# Partial', cPartial], ['# Unpaid', cUnpaid],
      ['Lunch Revenue', usd(lunchRevenue)], ['Discounts', `-${usd(discounts)}`],
      ['Total Registrations', totalRegs]
    ] })
    y = (docx as any).lastAutoTable.finalY + 12
    autoTable(docx, { startY:y, theme:'grid', head:[['Academy','P1','P2','Total']], body: rowsReg.map(r=>[r.academy,r.p1,r.p2,r.total]), margin:{left:mx,right:mx}, styles:{fontSize:10}, headStyles:{fillColor:[240,240,240]} })
    y = (docx as any).lastAutoTable.finalY + 12
    autoTable(docx, { startY:y, theme:'grid', head:[['Academy','Revenue']], body: rowsRevenue.map(r=>[r.academy, usd(r.amount)]), margin:{left:mx,right:mx}, styles:{fontSize:10}, headStyles:{fillColor:[240,240,240]} })
    docx.save(`general-report-${new Date().toISOString().slice(0,10)}.pdf`)
  }

  // ----- render -----
  return (
    <Card elevation={0} sx={{ borderRadius: 3 }}>
      <CardHeader
        title="Reports — General Overview"
        subheader="Charts + sub-reports for payments and registrations"
        action={<Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={()=>exportCSV(rowsReg,'registrations-by-academy')}>CSV (Regs by Academy)</Button>
          <Button variant="outlined" onClick={()=>exportCSV(rowsRevenue,'revenue-by-academy')}>CSV (Revenue by Academy)</Button>
          <Button variant="contained" onClick={exportPDF}>PDF</Button>
        </Stack>}
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* KPI chips */}
          <Grid item xs={12}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={`Invoices: ${usd(total)}`} />
              <Chip label={`Paid: ${usd(paid)}`} color="success" />
              <Chip label={`Balance: ${usd(balance)}`} color="warning" />
              <Chip label={`# Paid ${cPaid}`} color="success" />
              <Chip label={`# Partial ${cPartial}`} color="warning" />
              <Chip label={`# Unpaid ${cUnpaid}`} />
              <Chip label={`Lunch ${usd(lunchRevenue)}`} />
              <Chip label={`Discounts -${usd(discounts)}`} />
              <Chip label={`Registrations: ${totalRegs}`} />
            </Stack>
          </Grid>

          {/* Charts row */}
          <Grid item xs={12} lg={7}>
            <Typography variant="h6" sx={{ mb: 1 }}>Registrations by Academy (P1/P2)</Typography>
            <div style={{ width:'100%', height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={regChart}>
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
          <Grid item xs={12} lg={5}>
            <Typography variant="h6" sx={{ mb: 1 }}>Daily Invoice Totals</Typography>
            <div style={{ width:'100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <RTooltip />
                  <Line type="monotone" dataKey="amount" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Grid>

          {/* Sub-reports: Payments */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Payments — Sub-reports</Typography></AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Revenue by Academy</Typography>
                    <div style={{ height: 380, width:'100%' }}>
                      <DataGrid rows={rowsRevenue} columns={[
                        { field:'academy', headerName:'Academy', flex:1, minWidth:200 },
                        { field:'amount', headerName:'Revenue', width:140, valueFormatter:(p: any)=>usd(Number(p.value||0)) },
                      ]} getRowId={(r)=>r.id} disableRowSelectionOnClick />
                    </div>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Invoices by Status</Typography>
                    <div style={{ width:'100%', height: 380 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={[
                            { name:'PAID', value: cPaid },
                            { name:'PARTIAL', value: cPartial },
                            { name:'UNPAID', value: cUnpaid },
                          ]} dataKey="value" nameKey="name" label>
                            {[0,1,2].map(i => <Cell key={i} />)}
                          </Pie>
                          <RTooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Sub-reports: Registrations */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">Registrations — Sub-reports</Typography></AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={7}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>By Academy & Period</Typography>
                    <div style={{ height: 420, width:'100%' }}>
                      <DataGrid rows={rowsReg} columns={colsReg} getRowId={(r)=>r.id} disableRowSelectionOnClick />
                    </div>
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Korean Levels (counts)</Typography>
                    <div style={{ height: 420, width:'100%' }}>
                      <DataGrid rows={rowsKL} columns={colsKL} getRowId={(r)=>r.id} disableRowSelectionOnClick />
                    </div>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}