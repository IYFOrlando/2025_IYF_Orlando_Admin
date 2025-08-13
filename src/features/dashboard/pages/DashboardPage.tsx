import * as React from 'react'
import {
  Grid, Card, CardContent, Typography, Table, TableHead, TableRow,
  TableCell, TableBody, Divider, Stack, Button, Alert
} from '@mui/material'
import { useRegistrations, REG_COLLECTION } from '../../registrations/hooks/useRegistrations'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { displayYMD } from '../../../lib/date'
import { doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { Alert as SAlert, notifyError, notifySuccess } from '../../../lib/alerts'
import { normalizeAcademy, normalizeLevel } from '../../../lib/normalization'

type CountRow = { academy: string; count: number }


export default function DashboardPage() {
  const { data, loading } = useRegistrations()

  // Function to normalize levels in Firebase (run once)
  const normalizeLevelsInFirebase = async () => {
    if (!data || data.length === 0) return
    
    console.log('=== NORMALIZING LEVELS IN FIREBASE ===')
    
    let updatedCount = 0
    let errorCount = 0
    
    for (const reg of data) {
      let needsUpdate = false
      const fieldUpdates: any = {}
      
      // Check first period
      if (reg.firstPeriod?.level) {
        const originalLevel = reg.firstPeriod.level
        const normalizedLevel = normalizeLevel(originalLevel)
        if (originalLevel !== normalizedLevel) {
          // Use proper nested object structure for Firebase
          fieldUpdates.firstPeriod = {
            ...reg.firstPeriod,
            level: normalizedLevel
          }
          needsUpdate = true
          console.log(`Normalizing: "${originalLevel}" -> "${normalizedLevel}"`)
        }
      }
      
      // Check second period
      if (reg.secondPeriod?.level) {
        const originalLevel = reg.secondPeriod.level
        const normalizedLevel = normalizeLevel(originalLevel)
        if (originalLevel !== normalizedLevel) {
          // Use proper nested object structure for Firebase
          fieldUpdates.secondPeriod = {
            ...reg.secondPeriod,
            level: normalizedLevel
          }
          needsUpdate = true
          console.log(`Normalizing: "${originalLevel}" -> "${normalizedLevel}"`)
        }
      }
      
      if (needsUpdate && reg.id) {
        const docRef = doc(db, REG_COLLECTION, reg.id)
        
        // First verify the document exists
        try {
          const docSnap = await getDoc(docRef)
          if (!docSnap.exists()) {
            console.warn(`⚠️ Document ${reg.id} does not exist, skipping...`)
            continue
          }
          
          // Perform the update
          await updateDoc(docRef, fieldUpdates)
          console.log(`✅ Successfully updated registration ${reg.id}`)
          updatedCount++
        } catch (error) {
          console.error(`❌ Error updating registration ${reg.id}:`, error)
          errorCount++
          // Continue with other updates
        }
      }
    }
    
    console.log(`=== NORMALIZATION COMPLETE ===`)
    console.log(`✅ Successfully updated: ${updatedCount} registrations`)
    console.log(`❌ Errors encountered: ${errorCount} registrations`)
    
    if (updatedCount > 0) {
      notifySuccess('Normalization Complete', `Successfully normalized ${updatedCount} registrations in Firebase${errorCount > 0 ? `\n❌ ${errorCount} errors occurred` : ''}`)
    } else if (errorCount > 0) {
      notifyError('Normalization Failed', `Failed to normalize any registrations. ${errorCount} errors occurred. Check console for details.`)
    } else {
      SAlert.fire({ title: 'No Normalization Needed', text: 'All levels are already normalized', icon: 'info' })
    }
  }



  const { totals, p1Rows, p2Rows } = React.useMemo(() => {
    const p1 = new Map<string, number>()
    const p2 = new Map<string, number>()

    for (const r of data) {
      const a1 = r?.firstPeriod?.academy
      const a2 = r?.secondPeriod?.academy

      // Period 1 academy tally
      if (a1 && normalizeAcademy(a1) !== 'n/a') {
        const key = normalizeAcademy(a1)
        p1.set(key, (p1.get(key) || 0) + 1)
      }

      // Period 2 academy tally
      if (a2 && normalizeAcademy(a2) !== 'n/a') {
        const key = normalizeAcademy(a2)
        p2.set(key, (p2.get(key) || 0) + 1)
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

    const totals = {
      registrations: data.length,
      p1Total: p1Rows.reduce((s, r) => s + r.count, 0),
      p2Total: p2Rows.reduce((s, r) => s + r.count, 0),
    }

    return { totals, p1Rows, p2Rows }
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

      {/* Normalization Tool */}
      <Grid item xs={12}>
        <Card elevation={0} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">Data Management</Typography>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={normalizeLevelsInFirebase}
                disabled={loading}
              >
                🔄 Normalize Levels
              </Button>
            </Stack>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                The "🔄 Normalize Levels" button will merge "Alphabet Level" → "Alphabet" and "Intermediate Level" → "Intermediate" in the database.
                This helps maintain consistent data across all pages.
              </Typography>
            </Alert>
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


    </Grid>
  )
}
