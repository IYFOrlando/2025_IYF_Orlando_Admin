import * as React from 'react'
import {
  Card, CardContent, Stack, Box, Alert, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Chip, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material'
import { PageHeader } from '../../../components/PageHeader'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import SchoolIcon from '@mui/icons-material/School'
import PrintIcon from '@mui/icons-material/Print'
import PersonIcon from '@mui/icons-material/Person'
import { collection, doc, setDoc, onSnapshot, query, orderBy } from 'firebase/firestore'

import { useRegistrations } from '../../registrations/hooks/useRegistrations'
import type { Registration } from '../../registrations/types'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import logoImage from '../../../assets/logo/IYF_logo.png'
import { db } from '../../../lib/firebase'
import { normalizeAcademy, normalizeLevel } from '../../../lib/normalization'
import { computeAge } from '../../../lib/validations'
import { COLLECTIONS_CONFIG } from '../../../config/shared.js'

type Academy = {
  id: string
  name: string
  price: number
  schedule: string
  hasLevels: boolean
  levels?: Array<{ name: string; schedule: string; order: number }>
  order: number
  enabled: boolean
  description: string
  teacher?: {
    name: string
    email: string
    phone: string
    credentials?: string
  }
}

const AcademiesPage = React.memo(function AcademiesPage() {
  const { data: registrations, loading, error } = useRegistrations()
  
  const [teacherDialogOpen, setTeacherDialogOpen] = React.useState(false)
  const [selectedAcademy, setSelectedAcademy] = React.useState<string>('')
  const [selectedLevel, setSelectedLevel] = React.useState<string>('')
  const [teacherName, setTeacherName] = React.useState('')
  const [teacherEmail, setTeacherEmail] = React.useState('')
  const [teacherPhone, setTeacherPhone] = React.useState('')
  const [teacherCredentials, setTeacherCredentials] = React.useState('')

  // Store teacher information - for Korean: academy_level, for others: academy
  const [teachers, setTeachers] = React.useState<Record<string, {name: string, email: string, phone: string, credentials?: string, academy?: string, level?: string | null}>>({})
  const [teachersLoading, setTeachersLoading] = React.useState(true)

  // Load academies from Firestore
  const [academies, setAcademies] = React.useState<Academy[]>([])
  const [academiesLoading, setAcademiesLoading] = React.useState(true)

  // Load teachers from Firebase
  React.useEffect(() => {
    const teachersRef = collection(db, 'teachers')
    
    const unsubscribe = onSnapshot(teachersRef, (snapshot) => {
      const teachersData: Record<string, {name: string, email: string, phone: string, credentials?: string, academy?: string, level?: string | null}> = {}
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        const teacherInfo = {
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          credentials: data.credentials || '',
          academy: data.academy || '',
          level: data.level || null
        }
        
        // Store by document ID (primary key)
        teachersData[doc.id] = teacherInfo
        
        // Also store by academy name (for easier lookup)
        if (data.academy) {
          const academyKey = data.level ? `${data.academy}_${data.level}` : data.academy
          if (!teachersData[academyKey] || teachersData[academyKey].name === '') {
            teachersData[academyKey] = teacherInfo
          }
        }
      })
      
      setTeachers(teachersData)
      setTeachersLoading(false)
    }, () => {
      setTeachersLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Load academies from academies_2026_spring collection
  React.useEffect(() => {
    const academiesRef = collection(db, COLLECTIONS_CONFIG.academies2026Spring || 'academies_2026_spring')
    const q = query(academiesRef, orderBy('order', 'asc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const academiesData: Academy[] = []
      
      snapshot.forEach((doc) => {
        const data = doc.data()
        academiesData.push({
          id: doc.id,
          name: data.name || '',
          price: data.price || 0,
          schedule: data.schedule || '',
          hasLevels: data.hasLevels || false,
          levels: data.levels || [],
          order: data.order || 999,
          enabled: data.enabled !== false,
          description: data.description || '',
          teacher: data.teacher || undefined
        })
      })
      
      setAcademies(academiesData.filter(a => a.enabled))
      setAcademiesLoading(false)
    }, () => {
      setAcademiesLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Get registrations for a specific academy (using selectedAcademies - 2026 structure)
  const getRegistrationsForAcademy = React.useCallback((academyName: string, level?: string) => {
    return registrations?.filter(reg => {
      // NEW STRUCTURE (2026): Check selectedAcademies array
      if ((reg as any).selectedAcademies && Array.isArray((reg as any).selectedAcademies)) {
        return (reg as any).selectedAcademies.some((academyData: any) => {
          const matchesAcademy = normalizeAcademy(academyData.academy || '') === normalizeAcademy(academyName)
          if (level) {
            const matchesLevel = normalizeLevel(academyData.level || '') === normalizeLevel(level)
            return matchesAcademy && matchesLevel
          }
          return matchesAcademy
        })
      }
      
      // LEGACY STRUCTURE: Support firstPeriod/secondPeriod for backward compatibility
      const p1Academy = normalizeAcademy(reg?.firstPeriod?.academy || '')
      const p2Academy = normalizeAcademy(reg?.secondPeriod?.academy || '')
      const matchesAcademy = p1Academy === normalizeAcademy(academyName) || p2Academy === normalizeAcademy(academyName)
      
      if (level) {
        const p1Level = normalizeLevel(reg?.firstPeriod?.level || '')
        const p2Level = normalizeLevel(reg?.secondPeriod?.level || '')
        const matchesLevel = p1Level === normalizeLevel(level) || p2Level === normalizeLevel(level)
        return matchesAcademy && matchesLevel
      }
      
      return matchesAcademy
    }) || []
  }, [registrations])

  // For Korean Language, group by levels
  const getKoreanRegistrationsByLevel = React.useCallback((academyName: string) => {
    const registrations = getRegistrationsForAcademy(academyName)
    const byLevel: Record<string, Registration[]> = {}
    
    registrations.forEach(reg => {
      let level: string | null = null
      
      // NEW STRUCTURE (2026): Get level from selectedAcademies
      if ((reg as any).selectedAcademies && Array.isArray((reg as any).selectedAcademies)) {
        const academyData = (reg as any).selectedAcademies.find((a: any) => 
          normalizeAcademy(a.academy || '') === normalizeAcademy(academyName)
        )
        level = academyData?.level || null
      } else {
        // LEGACY STRUCTURE
        const p1Academy = normalizeAcademy(reg?.firstPeriod?.academy || '')
        const p2Academy = normalizeAcademy(reg?.secondPeriod?.academy || '')
        
        if (p1Academy === normalizeAcademy(academyName)) {
          level = reg?.firstPeriod?.level || null
        } else if (p2Academy === normalizeAcademy(academyName)) {
          level = reg?.secondPeriod?.level || null
        }
      }
      
      const normalizedLevel = normalizeLevel(level)
      if (!byLevel[normalizedLevel]) {
        byLevel[normalizedLevel] = []
      }
      byLevel[normalizedLevel].push(reg)
    })
    
    return byLevel
  }, [getRegistrationsForAcademy])

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

  const handleTeacherSave = React.useCallback(async () => {
    if (selectedAcademy && teacherName.trim()) {
      const teacherKey = selectedLevel ? `${selectedAcademy}_${selectedLevel}` : selectedAcademy
      
      try {
        // 1. Save to teachers collection (Legacy/Admin internal)
        const teacherRef = doc(db, 'teachers', teacherKey)
        await setDoc(teacherRef, {
          name: teacherName.trim(),
          email: teacherEmail.trim(),
          phone: teacherPhone.trim(),
          academy: selectedAcademy,
          level: selectedLevel || null,
          credentials: teacherCredentials.trim() || '',
          updatedAt: new Date()
        })
        
        // 2. Sync to academies collection (For Website Public View)
        // Find the academy document ID
        const targetAcademy = academies.find(a => normalizeAcademy(a.name) === normalizeAcademy(selectedAcademy))
        
        if (targetAcademy) {
           const collectionName = COLLECTIONS_CONFIG.academies2026Spring || 'academies_2026_spring'
           const academyDocRef = doc(db, collectionName, targetAcademy.id)
           
           // If it's a main academy instructor (no level), update the main fields
           if (!selectedLevel) {
             await setDoc(academyDocRef, {
               instructor: teacherName.trim(),
               instructorBio: teacherCredentials.trim(),
               // Also save structured teacher object for new admin panel
               teacher: {
                 name: teacherName.trim(),
                 email: teacherEmail.trim(),
                 phone: teacherPhone.trim(),
                 credentials: teacherCredentials.trim()
               }
             }, { merge: true })
           }
           // Note: Level-specific instructors are not currently displayed on the main academy detail page
           // but we preserve the logic for future use if needed.
        }

        setTeacherDialogOpen(false)
        setTeacherName('')
        setTeacherEmail('')
        setTeacherPhone('')
        setTeacherCredentials('')
        setSelectedAcademy('')
        setSelectedLevel('')
      } catch (error) {
        console.error("Error saving teacher:", error)
        alert('Error saving teacher information. Please try again.')
      }
    }
  }, [selectedAcademy, selectedLevel, teacherName, teacherEmail, teacherPhone, teacherCredentials, academies])

  const openTeacherDialog = React.useCallback((academyName: string, level?: string) => {
    setSelectedAcademy(academyName)
    setSelectedLevel(level || '')
    const teacherKey = level ? `${academyName}_${level}` : academyName
    const existingTeacher = teachers[teacherKey]
    if (existingTeacher) {
      setTeacherName(existingTeacher.name)
      setTeacherEmail(existingTeacher.email || '')
      setTeacherPhone(existingTeacher.phone || '')
      setTeacherCredentials(existingTeacher.credentials || '')
    } else {
      setTeacherName('')
      setTeacherEmail('')
      setTeacherPhone('')
      let defaultCredentials = ''
      const normalizedAcademy = academyName.toLowerCase()
      if (normalizedAcademy.includes('korean') && normalizedAcademy.includes('cooking')) {
        defaultCredentials = 'Experience working in Korean Restaurant many years'
      } else if (normalizedAcademy.includes('korean') && normalizedAcademy.includes('language')) {
        defaultCredentials = 'Native Korean speaker with many years of experience teaching Korean language'
      }
      setTeacherCredentials(defaultCredentials)
    }
    setTeacherDialogOpen(true)
  }, [teachers])

  const getTeacherForAcademy = React.useCallback((academyName: string, level?: string) => {
    // Try multiple lookup strategies
    const teacherKey = level ? `${academyName}_${level}` : academyName
    
    // Strategy 1: Direct key match
    if (teachers[teacherKey]) {
      return teachers[teacherKey]
    }
    
    // Strategy 2: Search by academy and level in teacher data
    for (const [, teacher] of Object.entries(teachers)) {
      if (teacher.academy && normalizeAcademy(teacher.academy) === normalizeAcademy(academyName)) {
        if (level) {
          if (teacher.level && normalizeLevel(teacher.level) === normalizeLevel(level)) {
            return teacher
          }
        } else {
          // No level specified, return if teacher has no level or level is null
          if (!teacher.level || teacher.level === null) {
            return teacher
          }
        }
      }
    }
    
    return undefined
  }, [teachers])

  const generatePDF = React.useCallback((academyName: string, registrations: Registration[], level?: string) => {
    const doc = new jsPDF()
    const teacher = getTeacherForAcademy(academyName, level)
    
    const logoSize = 30
    const logoX = 20
    const logoY = 15
    
    try {
      doc.addImage(logoImage, 'JPEG', logoX, logoY, logoSize, logoSize)
    } catch (error) {
      // Logo could not be added, continue without it
    }
    
    doc.setFontSize(16)
    doc.text('IYF Orlando - Academy Report', 105, 25, { align: 'center' })
    
    doc.setFontSize(20)
    doc.text(`${academyName}`, 105, 40, { align: 'center' })
    
    if (level) {
      doc.setFontSize(12)
      doc.text(`Level: ${level}`, 105, 50, { align: 'center' })
    }
    
    let startY = 65
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
    
    const tableData = registrations.map((reg, index) => [
      (index + 1).toString(),
      reg.firstName || '',
      reg.lastName || '',
      computeAge(reg.birthday) || '',
      reg.email || '',
      reg.cellNumber || '',
      reg.city || '',
      reg.state || ''
    ])
    
    autoTable(doc, {
      head: [['#', 'First Name', 'Last Name', 'Age', 'Email', 'Phone', 'City', 'State']],
      body: tableData,
      startY: startY,
      styles: { fontSize: 9 },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' }
      },
      margin: { top: 10 }
    })
    
    const tableEndY = (doc as any).lastAutoTable.finalY || startY + (registrations.length * 10) + 20
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(`Total Students: ${registrations.length}`, 20, tableEndY + 10)
    
    const pageCount = doc.getNumberOfPages()
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, doc.internal.pageSize.height - 10)
    doc.text(`Page ${pageCount}`, 190, doc.internal.pageSize.height - 10, { align: 'right' })
    
    const filename = level 
      ? `${academyName}_${level}_report.pdf`
      : `${academyName}_report.pdf`
    doc.save(filename)
  }, [getTeacherForAcademy])

  const renderAcademySection = React.useCallback((academy: Academy) => {
    if (academy.hasLevels && academy.levels && academy.levels.length > 0) {
      // Academy with levels (like Korean Language)
      const koreanByLevel = getKoreanRegistrationsByLevel(academy.name)
      const levels = academy.levels.sort((a, b) => a.order - b.order)
      
      return (
        <Accordion key={academy.id} defaultExpanded={false}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
              <SchoolIcon color="primary" />
              <Typography variant="h6">{academy.name}</Typography>
              <Chip 
                label={`$${academy.price}`} 
                size="small" 
                color="primary" 
              />
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
                onClick={() => generatePDF(academy.name, Object.values(koreanByLevel).flat())}
              >
                Export All Levels PDF
              </Button>
            </Stack>
            
            {levels.map(level => {
              const levelRegistrations = koreanByLevel[normalizeLevel(level.name)] || []
              const teacher = getTeacherForAcademy(academy.name, level.name)

              return (
                <Box key={level.name} sx={{ mb: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="h6" color="primary">
                        {level.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({level.schedule})
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {teacher && (
                        <Chip 
                          label={`Teacher: ${teacher.name}${teacher.email ? ` (${teacher.email})` : ''}`} 
                          size="small" 
                          color="secondary" 
                          variant="outlined"
                          title={teacher.phone ? `Phone: ${teacher.phone}` : undefined}
                        />
                      )}
                      <Chip label={`${levelRegistrations.length} students`} size="small" />
                      <Button
                        startIcon={<PersonIcon />}
                        variant="outlined"
                        size="small"
                        onClick={() => openTeacherDialog(academy.name, level.name)}
                      >
                        {teacher ? 'Edit Teacher' : 'Add Teacher'}
                      </Button>
                      <Button
                        startIcon={<PrintIcon />}
                        variant="outlined"
                        size="small"
                        onClick={() => generatePDF(academy.name, levelRegistrations, level.name)}
                      >
                        Export PDF
                      </Button>
                    </Stack>
                  </Stack>
                  <Box sx={{ 
                    height: 300, 
                    display: 'flex', 
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative',
                    minHeight: 0
                  }}>
                    <DataGrid
                      rows={levelRegistrations}
                      columns={studentCols}
                      loading={loading}
                      disableRowSelectionOnClick
                      getRowId={(r)=>r.id}
                      slots={{ toolbar: GridToolbar }}
                      density="compact"
                      initialState={{
                        sorting: {
                          sortModel: [{ field: 'lastName', sort: 'asc' }]
                        }
                      }}
                      paginationMode="client"
                      pageSizeOptions={[]}
                      sx={{
                        flex: 1,
                        minHeight: 0,
                        '& .MuiDataGrid-root': {
                          border: 'none'
                        },
                        '& .MuiDataGrid-cell': {
                          borderBottom: '1px solid #e0e0e0',
                          cursor: 'default'
                        },
                        '& .MuiDataGrid-columnHeaders': {
                          backgroundColor: '#f5f5f5',
                          borderBottom: '2px solid #e0e0e0'
                        },
                        '& .MuiDataGrid-footerContainer': {
                          borderTop: '2px solid #e0e0e0',
                          backgroundColor: '#f5f5f5'
                        },
                        '& .MuiDataGrid-row:hover': {
                          backgroundColor: '#f8f9fa'
                        }
                      }}
                    />
                  </Box>
                </Box>
              )
            })}
          </AccordionDetails>
        </Accordion>
      )
    } else {
      // Academy without levels
      const academyRegistrations = getRegistrationsForAcademy(academy.name)
      const teacher = getTeacherForAcademy(academy.name)
      
      return (
        <Accordion key={academy.id} defaultExpanded={false}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
              <SchoolIcon color="primary" />
              <Typography variant="h6">{academy.name}</Typography>
              <Chip 
                label={`$${academy.price}`} 
                size="small" 
                color="primary" 
              />
              <Chip 
                label={`${academyRegistrations.length} students`} 
                size="small" 
                color="primary" 
                variant="outlined"
              />
              {teacher && (
                <Chip 
                  label={`Teacher: ${teacher.name}${teacher.email ? ` (${teacher.email})` : ''}`} 
                  size="small" 
                  color="secondary" 
                  variant="outlined"
                  title={teacher.phone ? `Phone: ${teacher.phone}` : undefined}
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
                onClick={() => openTeacherDialog(academy.name)}
              >
                {teacher ? 'Edit Teacher' : 'Add Teacher'}
              </Button>
              <Button
                startIcon={<PrintIcon />}
                variant="contained"
                size="small"
                onClick={() => generatePDF(academy.name, academyRegistrations)}
              >
                Export PDF
              </Button>
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Schedule: {academy.schedule}
            </Typography>

            <Typography variant="h6" gutterBottom>Student List</Typography>
            <Box sx={{ 
              height: 400, 
              display: 'flex', 
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
              minHeight: 0
            }}>
              <DataGrid
                rows={academyRegistrations}
                columns={studentCols}
                loading={loading}
                disableRowSelectionOnClick
                getRowId={(r)=>r.id}
                slots={{ toolbar: GridToolbar }}
                density="compact"
                initialState={{
                  sorting: {
                    sortModel: [{ field: 'lastName', sort: 'asc' }]
                  }
                }}
                paginationMode="client"
                pageSizeOptions={[]}
                sx={{
                  flex: 1,
                  minHeight: 0,
                  '& .MuiDataGrid-root': {
                    border: 'none'
                  },
                  '& .MuiDataGrid-cell': {
                    borderBottom: '1px solid #e0e0e0',
                    cursor: 'default'
                  },
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: '#f5f5f5',
                    borderBottom: '2px solid #e0e0e0'
                  },
                  '& .MuiDataGrid-footerContainer': {
                    borderTop: '2px solid #e0e0e0',
                    backgroundColor: '#f5f5f5'
                  },
                  '& .MuiDataGrid-row:hover': {
                    backgroundColor: '#f8f9fa'
                  }
                }}
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      )
    }
  }, [getKoreanRegistrationsByLevel, getRegistrationsForAcademy, getTeacherForAcademy, openTeacherDialog, generatePDF, studentCols, loading])

  return (
    <Box>
       <PageHeader 
        title="Academy Registrations" 
        subtitle="View student registrations organized by academy"
        icon={<SchoolIcon fontSize="inherit" />}
        color="#1976d2" 
      />
      
      <Card elevation={0} sx={{ borderRadius:3 }}>
        <CardContent>
        {error && <Alert severity="error" sx={{ mb:1 }}>{error}</Alert>}
        {teachersLoading && <Alert severity="info" sx={{ mb:1 }}>Loading teacher information...</Alert>}
        {academiesLoading && <Alert severity="info" sx={{ mb:1 }}>Loading academies...</Alert>}

        {academies.length === 0 && !academiesLoading && (
          <Alert severity="warning" sx={{ mb:1 }}>
            No academies found. Please ensure academies are configured in the academies_2026_spring collection.
          </Alert>
        )}

        <Stack spacing={2}>
          {academies.map((academy) => renderAcademySection(academy))}
        </Stack>

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
              <TextField 
                label="Credentials / Background" 
                value={teacherCredentials} 
                onChange={e => setTeacherCredentials(e.target.value)} 
                fullWidth 
                multiline
                rows={3}
                placeholder={
                  (() => {
                    const normalized = selectedAcademy.toLowerCase()
                    if (normalized.includes('korean') && normalized.includes('cooking')) {
                      return "Experience working in Korean Restaurant many years"
                    } else if (normalized.includes('korean') && normalized.includes('language')) {
                      return "e.g., Native Korean speaker with many years of experience teaching Korean language"
                    }
                    return "e.g., Certified Teacher, Master's Degree in Education, etc."
                  })()
                }
                helperText="Instructor credentials required for elective courses (courses with service rate)"
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
    </Box>
  )
})

export default AcademiesPage
