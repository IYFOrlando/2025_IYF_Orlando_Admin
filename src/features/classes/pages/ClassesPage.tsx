import * as React from 'react'
import {
  Card, CardHeader, CardContent, Stack, Box, Alert, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, Typography, Chip, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SchoolIcon from '@mui/icons-material/School'
import PrintIcon from '@mui/icons-material/Print'
import PersonIcon from '@mui/icons-material/Person'

import { useRegistrations } from '../../registrations/hooks/useRegistrations'
import type { Registration } from '../../registrations/types'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoImage from '../../../assets/logo/IYF_logo.png'
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { normalizeAcademy, normalizeLevel } from '../../../lib/normalization'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`academy-tabpanel-${index}`}
      aria-labelledby={`academy-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  )
}

function computeAge(birthday?: string | null): number | '' {
  if (!birthday) return ''
  const age = new Date().getFullYear() - new Date(birthday).getFullYear()
  return age < 0 ? '' : age
}

export default function AcademiesPage() {
  const { data: registrations, loading, error } = useRegistrations()
  
     // Remove debug useEffect - no longer needed
  const [tabValue, setTabValue] = React.useState(0)
  const [teacherDialogOpen, setTeacherDialogOpen] = React.useState(false)
  const [selectedAcademy, setSelectedAcademy] = React.useState<string>('')
  const [selectedLevel, setSelectedLevel] = React.useState<string>('')
  const [teacherName, setTeacherName] = React.useState('')
  const [teacherEmail, setTeacherEmail] = React.useState('')
  const [teacherPhone, setTeacherPhone] = React.useState('')

  // Store teacher information - for Korean: academy_level, for others: academy
  const [teachers, setTeachers] = React.useState<Record<string, {name: string, email: string, phone: string}>>({})
  const [teachersLoading, setTeachersLoading] = React.useState(true)

  // Load teachers from Firebase
  React.useEffect(() => {
    const teachersRef = collection(db, 'teachers')
    
    const unsubscribe = onSnapshot(teachersRef, (snapshot) => {
      const teachersData: Record<string, {name: string, email: string, phone: string}> = {}
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        teachersData[doc.id] = {
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || ''
        }
      })
      
      setTeachers(teachersData)
      setTeachersLoading(false)
         }, () => {
       setTeachersLoading(false)
     })

    return () => unsubscribe()
  }, [])





  // Define Period 1 and Period 2 academies based on what's in the data
  const period1Academies = React.useMemo(() => {
    const p1Set = new Set<string>()
    registrations?.forEach(reg => {
      const p1Academy = reg?.firstPeriod?.academy?.trim()
      if (p1Academy && p1Academy.toLowerCase() !== 'n/a') {
        p1Set.add(p1Academy)
      }
    })
    return Array.from(p1Set).sort()
  }, [registrations])

  const period2Academies = React.useMemo(() => {
    const p2Set = new Set<string>()
    registrations?.forEach(reg => {
      const p2Academy = reg?.secondPeriod?.academy?.trim()
      if (p2Academy && p2Academy.toLowerCase() !== 'n/a') {
        p2Set.add(p2Academy)
      }
    })
    return Array.from(p2Set).sort()
  }, [registrations])

  // Get all Korean academies (from both periods) - excluding Korean Cooking
  const koreanAcademies = React.useMemo(() => {
    const koreanSet = new Set<string>()
    registrations?.forEach(reg => {
      const p1Academy = reg?.firstPeriod?.academy?.trim()
      const p2Academy = reg?.secondPeriod?.academy?.trim()
      
      if (p1Academy && p1Academy.toLowerCase().includes('korean') && !p1Academy.toLowerCase().includes('cooking')) {
        koreanSet.add(normalizeAcademy(p1Academy))
      }
      if (p2Academy && p2Academy.toLowerCase().includes('korean') && !p2Academy.toLowerCase().includes('cooking')) {
        koreanSet.add(normalizeAcademy(p2Academy))
      }
    })
    return Array.from(koreanSet).sort()
  }, [registrations])

  // Get registrations for a specific academy and period
  const getRegistrationsForAcademy = (academyName: string, period: 'p1' | 'p2') => {
    return registrations?.filter(reg => {
      if (period === 'p1') {
        const p1Academy = normalizeAcademy(reg?.firstPeriod?.academy || null)
        return p1Academy === normalizeAcademy(academyName)
      } else {
        const p2Academy = normalizeAcademy(reg?.secondPeriod?.academy || null)
        return p2Academy === normalizeAcademy(academyName)
      }
    }) || []
  }

  // Get all registrations for a Korean academy (both periods combined)
  const getKoreanRegistrationsAllPeriods = (academyName: string) => {
    const result = registrations?.filter(reg => {
      const p1Academy = normalizeAcademy(reg?.firstPeriod?.academy || null)
      const p2Academy = normalizeAcademy(reg?.secondPeriod?.academy || null)
      const matches = p1Academy === normalizeAcademy(academyName) || p2Academy === normalizeAcademy(academyName)
      
      
      
      return matches
    }) || []
    
    return result
  }

  // For Korean Language, group by levels
  const getKoreanRegistrationsByLevel = (academyName: string, period: 'p1' | 'p2') => {
    const registrations = getRegistrationsForAcademy(academyName, period)
    const byLevel: Record<string, Registration[]> = {}
    
    registrations.forEach(reg => {
      const level = period === 'p1' ? reg?.firstPeriod?.level : reg?.secondPeriod?.level
      const normalizedLevel = normalizeLevel(level || null)
      if (!byLevel[normalizedLevel]) {
        byLevel[normalizedLevel] = []
      }
      byLevel[normalizedLevel].push(reg)
    })
    
    return byLevel
  }



  // For Korean Language, group by levels (all periods combined)
  const getKoreanRegistrationsByLevelAllPeriods = (academyName: string) => {
    const registrations = getKoreanRegistrationsAllPeriods(academyName)
    const byLevel: Record<string, Registration[]> = {}
    
    registrations.forEach(reg => {
      // Check both periods and add student to ALL levels where they are registered
      const p1Academy = normalizeAcademy(reg?.firstPeriod?.academy || null)
      const p2Academy = normalizeAcademy(reg?.secondPeriod?.academy || null)
      
      // Add to First Period level if Korean Language
      if (p1Academy === normalizeAcademy(academyName) && reg?.firstPeriod?.level) {
        const normalizedLevel = normalizeLevel(reg.firstPeriod.level)
        if (!byLevel[normalizedLevel]) {
          byLevel[normalizedLevel] = []
        }
        byLevel[normalizedLevel].push(reg)
      }
      
      // Add to Second Period level if Korean Language (can be same student, different level)
      if (p2Academy === normalizeAcademy(academyName) && reg?.secondPeriod?.level) {
        const normalizedLevel = normalizeLevel(reg.secondPeriod.level)
        if (!byLevel[normalizedLevel]) {
          byLevel[normalizedLevel] = []
        }
        byLevel[normalizedLevel].push(reg)
      }
      
      
    })
    
    return byLevel
  }

  

  const studentCols = React.useMemo<GridColDef[]>(()=>[
    { 
      field:'id', headerName:'#', width:60, type: 'number',
      valueGetter: (params) => {
        const allRows = params.api.getSortedRowIds()
        return allRows.indexOf(params.row.id) + 1
      }
    },
    { field:'firstName', headerName:'First Name', minWidth:120, flex:1 },
    { field:'lastName', headerName:'Last Name', minWidth:120, flex:1 },
    { 
      field:'age', headerName:'Age', width:80, type: 'number',
      valueGetter: (params) => computeAge((params.row as any).birthday)
    },
    { field:'email', headerName:'Email', minWidth:200, flex:1 },
    { field:'cellNumber', headerName:'Phone Number', minWidth:140, flex:1 },
    { field:'city', headerName:'City', minWidth:120, flex:1 },
    { field:'state', headerName:'State', width:100 },
  ], [])

  const handleTeacherSave = async () => {
    if (selectedAcademy && teacherName.trim()) {
      const teacherKey = selectedLevel ? `${selectedAcademy}_${selectedLevel}` : selectedAcademy
      
      try {
        // Save to Firebase
        const teacherRef = doc(db, 'teachers', teacherKey)
        await setDoc(teacherRef, {
          name: teacherName.trim(),
          email: teacherEmail.trim(),
          phone: teacherPhone.trim(),
          academy: selectedAcademy,
          level: selectedLevel || null,
          updatedAt: new Date()
        })
        
        setTeacherDialogOpen(false)
        setTeacherName('')
        setTeacherEmail('')
        setTeacherPhone('')
        setSelectedAcademy('')
        setSelectedLevel('')
             } catch (error) {
         alert('Error saving teacher information. Please try again.')
       }
    }
  }

  const openTeacherDialog = (academyName: string, level?: string) => {
    setSelectedAcademy(academyName)
    setSelectedLevel(level || '')
    const teacherKey = level ? `${academyName}_${level}` : academyName
    const existingTeacher = teachers[teacherKey]
    if (existingTeacher) {
      setTeacherName(existingTeacher.name)
      setTeacherEmail(existingTeacher.email)
      setTeacherPhone(existingTeacher.phone)
    } else {
      setTeacherName('')
      setTeacherEmail('')
      setTeacherPhone('')
    }
    setTeacherDialogOpen(true)
  }

  const getTeacherForAcademy = (academyName: string, level?: string) => {
    const teacherKey = level ? `${academyName}_${level}` : academyName
    return teachers[teacherKey]
  }



  const generatePDF = (academyName: string, period: 'p1' | 'p2' | 'all', registrations: Registration[], level?: string) => {
    const doc = new jsPDF()
    const teacher = getTeacherForAcademy(academyName, level)
    
    // Add IYF logo
    const logoSize = 30
    const logoX = 20
    const logoY = 15
    
         // Add logo image
     try {
       doc.addImage(logoImage, 'JPEG', logoX, logoY, logoSize, logoSize)
     } catch (error) {
       // Logo could not be added, continue without it
     }
    
        // Header - with title
    doc.setFontSize(16)
    doc.text('IYF Orlando - Academy Report', 105, 25, { align: 'center' })
    
    doc.setFontSize(20)
    doc.text(`${academyName}`, 105, 40, { align: 'center' })
    
    doc.setFontSize(14)
    doc.text(`${period === 'p1' ? 'Period 1' : period === 'p2' ? 'Period 2' : 'All Periods'}`, 105, 50, { align: 'center' })
    
    if (level) {
      doc.setFontSize(12)
      doc.text(`Level: ${level}`, 105, 60, { align: 'center' })
    }
    
    // Teacher info - simple design
    let startY = 75
    if (teacher) {
      doc.setFontSize(11)
      doc.text(`Teacher: ${teacher.name}`, 20, startY)
      
      if (teacher.email) {
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text(`Email: ${teacher.email}`, 20, startY + 8)
      }
      if (teacher.phone) {
        doc.text(`Phone: ${teacher.phone}`, 20, startY + 16)
      }
      
      startY += 25
    }
    
    // Student table
    const tableData = registrations.map(reg => [
      reg.firstName || '',
      reg.lastName || '',
      computeAge(reg.birthday) || '',
      reg.email || '',
      reg.cellNumber || '',
      reg.city || '',
      reg.state || ''
    ])
    
    autoTable(doc, {
      head: [['First Name', 'Last Name', 'Age', 'Email', 'Phone', 'City', 'State']],
      body: tableData,
      startY: startY,
      styles: { fontSize: 9 },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      margin: { top: 10 }
    })
    
    // Footer
    const pageCount = doc.getNumberOfPages()
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, doc.internal.pageSize.height - 10)
    doc.text(`Page ${pageCount}`, 190, doc.internal.pageSize.height - 10, { align: 'right' })
    
    const filename = level 
      ? `${academyName}_${period}_${level}_report.pdf`
      : `${academyName}_${period}_report.pdf`
    doc.save(filename)
  }

  const renderAcademySection = (academyName: string, period: 'p1' | 'p2') => {
    const isKorean = academyName.toLowerCase().includes('korean') && !academyName.toLowerCase().includes('cooking')
    
    if (isKorean) {
      const koreanByLevel = getKoreanRegistrationsByLevel(academyName, period)
      const levels = Object.keys(koreanByLevel).sort()
      
      return (
        <Accordion key={academyName} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
              <SchoolIcon color="primary" />
              <Typography variant="h6">{academyName}</Typography>
              <Chip 
                label={`${Object.values(koreanByLevel).reduce((sum, regs) => sum + regs.length, 0)} students`} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Button
                startIcon={<PrintIcon />}
                variant="contained"
                size="small"
                onClick={() => generatePDF(academyName, period, Object.values(koreanByLevel).flat())}
              >
                Export All Levels PDF
              </Button>
            </Stack>
            
            {levels.map(level => {
              const levelRegistrations = koreanByLevel[level]
              const teacher = getTeacherForAcademy(academyName, level)

  return (
                <Box key={level} sx={{ mb: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6" color="primary">
                      Level: {level}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {teacher && (
                        <Chip 
                          label={`Teacher: ${teacher.name}`} 
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                        />
                      )}
                      <Chip label={`${levelRegistrations.length} students`} size="small" />
                      <Button
                        startIcon={<PersonIcon />}
                        variant="outlined"
                        size="small"
                        onClick={() => openTeacherDialog(academyName, level)}
                      >
                        {teacher ? 'Edit Teacher' : 'Add Teacher'}
                      </Button>
                      <Button
                        startIcon={<PrintIcon />}
                        variant="outlined"
                        size="small"
                        onClick={() => generatePDF(academyName, period, levelRegistrations, level)}
                      >
                        Export PDF
                      </Button>
                    </Stack>
                  </Stack>
                  <Box sx={{ height: 300 }}>
                    <DataGrid
                      rows={levelRegistrations}
                      columns={studentCols}
                      loading={loading}
                      disableRowSelectionOnClick
                      getRowId={(r)=>r.id}
                      slots={{ toolbar: GridToolbar }}
                      density="compact"
                      initialState={{
                        pagination: { paginationModel: { page: 0, pageSize: 25 } }
                      }}
                      pageSizeOptions={[10,25,50,100]}
                    />
                  </Box>
                </Box>
              )
            })}
          </AccordionDetails>
        </Accordion>
      )
    } else {
      const academyRegistrations = getRegistrationsForAcademy(academyName, period)
      const teacher = getTeacherForAcademy(academyName)
      
      return (
        <Accordion key={academyName} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
              <SchoolIcon color="primary" />
              <Typography variant="h6">{academyName}</Typography>
              <Chip 
                label={`${academyRegistrations.length} students`} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
              {teacher && (
                <Chip 
                  label={`Teacher: ${teacher.name}`} 
                  size="small" 
                  color="secondary" 
                  variant="outlined"
                />
              )}
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Button
                startIcon={<PersonIcon />}
                variant="outlined"
                size="small"
                onClick={() => openTeacherDialog(academyName)}
              >
                {teacher ? 'Edit Teacher' : 'Add Teacher'}
              </Button>
          <Button
                startIcon={<PrintIcon />}
            variant="contained"
                size="small"
                onClick={() => generatePDF(academyName, period, academyRegistrations)}
          >
                Export PDF
          </Button>
        </Stack>

            <Typography variant="h6" gutterBottom>Student List</Typography>
            <Box sx={{ height: 400 }}>
          <DataGrid
                rows={academyRegistrations}
                columns={studentCols}
            loading={loading}
            disableRowSelectionOnClick
            getRowId={(r)=>r.id}
            slots={{ toolbar: GridToolbar }}
                density="compact"
                initialState={{
                  pagination: { paginationModel: { page: 0, pageSize: 25 } }
                }}
                pageSizeOptions={[10,25,50,100]}
          />
        </Box>
          </AccordionDetails>
        </Accordion>
      )
    }
  }

  const renderKoreanAcademySection = (academyName: string) => {
    const koreanByLevel = getKoreanRegistrationsByLevelAllPeriods(academyName)
    const levels = Object.keys(koreanByLevel).sort()
    
    return (
      <Accordion key={academyName} defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
            <SchoolIcon color="primary" />
            <Typography variant="h6">{academyName}</Typography>
            <Chip 
              label={`${Object.values(koreanByLevel).reduce((sum, regs) => sum + regs.length, 0)} students`} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Button
              startIcon={<PrintIcon />}
              variant="contained"
              size="small"
              onClick={() => generatePDF(academyName, 'all', Object.values(koreanByLevel).flat())}
            >
              Export All Levels PDF
            </Button>
          </Stack>
          
          {levels.map(level => {
            const levelRegistrations = koreanByLevel[level]
            const teacher = getTeacherForAcademy(academyName, level)
            
            return (
              <Box key={level} sx={{ mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="h6" color="primary">
                    Level: {level}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {teacher && (
                      <Chip 
                        label={`Teacher: ${teacher.name}`} 
                        size="small" 
                        color="secondary" 
                        variant="outlined"
                      />
                    )}
                    <Chip label={`${levelRegistrations.length} students`} size="small" />
                    <Button
                      startIcon={<PersonIcon />}
                      variant="outlined"
                      size="small"
                      onClick={() => openTeacherDialog(academyName, level)}
                    >
                      {teacher ? 'Edit Teacher' : 'Add Teacher'}
                    </Button>
                    <Button
                      startIcon={<PrintIcon />}
                      variant="outlined"
                      size="small"
                      onClick={() => generatePDF(academyName, 'all', levelRegistrations, level)}
                    >
                      Export PDF
                    </Button>
                  </Stack>
                </Stack>
                <Box sx={{ height: 300 }}>
                  <DataGrid
                    rows={levelRegistrations}
                    columns={studentCols}
                    loading={loading}
                    disableRowSelectionOnClick
                    getRowId={(r)=>r.id}
                    slots={{ toolbar: GridToolbar }}
                    density="compact"
                    initialState={{
                      pagination: { paginationModel: { page: 0, pageSize: 25 } }
                    }}
                    pageSizeOptions={[10,25,50,100]}
                  />
                </Box>
              </Box>
            )
          })}
        </AccordionDetails>
      </Accordion>
    )
  }

  return (
    <Card elevation={0} sx={{ borderRadius:3 }}>
      <CardHeader 
        title="Academies" 
        subheader="View student registrations organized by academy and period" 
      />
      <CardContent>
        {error && <Alert severity="error" sx={{ mb:1 }}>{error}</Alert>}
        {teachersLoading && <Alert severity="info" sx={{ mb:1 }}>Loading teacher information...</Alert>}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                     <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label={`Period 1 (${period1Academies.length} academies)`} />
            <Tab label={`Period 2 (${period2Academies.length} academies)`} />
            <Tab label={`Korean Language (${koreanAcademies.length} academies)`} />
          </Tabs>
        </Box>
        
                 

        <TabPanel value={tabValue} index={0}>
          <Stack spacing={2}>
            {period1Academies.map((academyName) => renderAcademySection(academyName, 'p1'))}
            {period1Academies.length === 0 && (
              <Alert severity="info">No academies available in Period 1</Alert>
            )}
          </Stack>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Stack spacing={2}>
            {period2Academies.map((academyName) => renderAcademySection(academyName, 'p2'))}
            {period2Academies.length === 0 && (
              <Alert severity="info">No academies available in Period 2</Alert>
            )}
          </Stack>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Stack spacing={2}>
            {koreanAcademies.map((academyName) => renderKoreanAcademySection(academyName))}
            {koreanAcademies.length === 0 && (
              <Alert severity="info">No Korean academies available</Alert>
            )}
          </Stack>
        </TabPanel>

        {/* Teacher Dialog */}
        <Dialog open={teacherDialogOpen} onClose={() => setTeacherDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            {teachers[selectedLevel ? `${selectedAcademy}_${selectedLevel}` : selectedAcademy] ? 'Edit Teacher' : 'Add Teacher'} 
            {selectedLevel ? ` - ${selectedAcademy} (${selectedLevel})` : ` - ${selectedAcademy}`}
          </DialogTitle>
      <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField 
                label="Teacher Name" 
                value={teacherName} 
                onChange={e => setTeacherName(e.target.value)} 
                fullWidth 
                required
              />
              <TextField 
                label="Email" 
                value={teacherEmail} 
                onChange={e => setTeacherEmail(e.target.value)} 
                type="email"
                fullWidth 
              />
              <TextField 
                label="Phone" 
                value={teacherPhone} 
                onChange={e => setTeacherPhone(e.target.value)} 
                fullWidth 
              />
            </Stack>
      </DialogContent>
      <DialogActions>
            <Button onClick={() => setTeacherDialogOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleTeacherSave} disabled={!teacherName.trim()}>
              Save
            </Button>
      </DialogActions>
    </Dialog>
      </CardContent>
    </Card>
  )
}
