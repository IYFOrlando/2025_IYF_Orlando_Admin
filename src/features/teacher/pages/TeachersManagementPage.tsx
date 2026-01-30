import { useState, useEffect, useMemo } from 'react'
import { 
  Box, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Select,
  FormControl, InputLabel, Chip, Stack, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip,
  LinearProgress
} from '@mui/material'
import { 
  Add as AddIcon, Edit as EditIcon,
  Search as SearchIcon
} from '@mui/icons-material'
import { collection, onSnapshot, doc, updateDoc, writeBatch, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
// Teachers now use email-based document IDs in 'teachers' collection
import { useTeacherContext } from '../../auth/context/TeacherContext'
import { AccessDenied } from '../../../components/AccessDenied'
import Swal from 'sweetalert2'

// Types locally for now, could be moved
interface AcademyDoc {
  id: string
  name: string
  teacher?: { name: string, email: string, phone?: string }
  levels?: Array<{
    name: string
    teacher?: { name: string, email: string, phone?: string }
  }>
}

interface TeacherEntity {
  email: string // ID
  name: string
  phone?: string
  assignments: Array<{
    academyId: string
    academyName: string
    levelName?: string | null // null = main teacher
  }>
}

export default function TeachersManagementPage() {
  const { isAdmin } = useTeacherContext()
  const [academies, setAcademies] = useState<AcademyDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Dialog State
  const [openDialog, setOpenDialog] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<TeacherEntity | null>(null)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' })

  // Assignment Dialog
  const [openAssignDialog, setOpenAssignDialog] = useState(false)
  const [assignData, setAssignData] = useState({ 
    teacherEmail: '', 
    academyId: '', 
    levelName: 'ALL' // 'ALL' for academy main teacher, otherwise specific level
  })

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'academies_2026_spring'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as AcademyDoc))
      setAcademies(data)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Derived list of unique teachers
  const teachers = useMemo(() => {
    const map = new Map<string, TeacherEntity>()

    academies.forEach(aca => {
      // Check Main Teacher
      if (aca.teacher?.name) {
        // Use email as ID if available, otherwise use name as temporary ID
        const id = aca.teacher.email ? aca.teacher.email.toLowerCase().trim() : `temp_${aca.teacher.name.toLowerCase().replace(/\s+/g, '_')}`
        if (!map.has(id)) {
          map.set(id, { 
            email: aca.teacher.email || '', 
            name: aca.teacher.name, 
            phone: aca.teacher.phone,
            assignments: [] 
          })
        }
        map.get(id)!.assignments.push({
          academyId: aca.id,
          academyName: aca.name || aca.id,
          levelName: null
        })
      }

      // Check Levels
      if (aca.levels) {
        aca.levels.forEach(lvl => {
          if (lvl.teacher?.name) {
            // Use email as ID if available, otherwise use name as temporary ID
            const id = lvl.teacher.email ? lvl.teacher.email.toLowerCase().trim() : `temp_${lvl.teacher.name.toLowerCase().replace(/\s+/g, '_')}`
            if (!map.has(id)) {
              map.set(id, { 
                email: lvl.teacher.email || '', 
                name: lvl.teacher.name, 
                phone: lvl.teacher.phone,
                assignments: [] 
              })
            }
            map.get(id)!.assignments.push({
              academyId: aca.id,
              academyName: aca.name || aca.id,
              levelName: lvl.name
            })
          }
        })
      }
    })

    return Array.from(map.values())
  }, [academies])

  if (!isAdmin) {
    return <AccessDenied />
  }

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEdit = (teacher: TeacherEntity) => {
    setEditingTeacher(teacher)
    setFormData({ name: teacher.name, email: teacher.email, phone: teacher.phone || '' })
    setOpenDialog(true)
  }

  const handleSaveTeacher = async () => {
    if (!editingTeacher) return 
    
    // Validate email if provided
    if (formData.email && !formData.email.includes('@')) {
      Swal.fire('Error', 'Please enter a valid email address', 'error')
      return
    }
    
    try {
      setLoading(true)
      const batch = writeBatch(db)
      let updateCount = 0

      // Helper function to check if a teacher matches the one being edited
      const matchesTeacher = (teacher: any) => {
        if (editingTeacher.email) {
          // If editing teacher has email, match by email
          return teacher?.email?.toLowerCase().trim() === editingTeacher.email.toLowerCase().trim()
        } else {
          // If editing teacher has no email, match by name
          return teacher?.name === editingTeacher.name && !teacher?.email
        }
      }

      academies.forEach(aca => {
        let acaModified = false
        const acaUpdate: Partial<AcademyDoc> = {}

        if (aca.teacher && matchesTeacher(aca.teacher)) {
            acaUpdate.teacher = { 
              name: formData.name, 
              email: formData.email.trim(), 
              phone: formData.phone 
            }
            acaModified = true
        }

        if (aca.levels) {
            const newLevels = aca.levels.map(lvl => {
                if (lvl.teacher && matchesTeacher(lvl.teacher)) {
                    acaModified = true
                    return { 
                      ...lvl, 
                      teacher: { 
                        name: formData.name, 
                        email: formData.email.trim(), 
                        phone: formData.phone 
                      } 
                    }
                }
                return lvl
            })
            if (acaModified) acaUpdate.levels = newLevels
        }

        if (acaModified) {
            batch.update(doc(db, 'academies_2026_spring', aca.id), acaUpdate)
            updateCount++
        }
      })

      if (updateCount > 0) {
          await batch.commit()
          
          // SYNC to teacher index only if email is provided
          if (formData.email.trim()) {
            // Check if email changed and delete old doc if so
            const oldEmail = editingTeacher.email.toLowerCase().trim()
            const newEmail = formData.email.toLowerCase().trim()
            
            if (oldEmail && oldEmail !== newEmail) {
                try {
                    await deleteDoc(doc(db, 'teachers', oldEmail))
                    console.log(`Deleted old teacher index: ${oldEmail}`)
                } catch (e) {
                    console.error("Error deleting old teacher index:", e)
                }
            }

            const teacherAssignments: { academyId: string, academyName: string, levelName: string | null }[] = []
            academies.forEach(aca => {
              if (aca.teacher?.name === formData.name) {
                teacherAssignments.push({ academyId: aca.id, academyName: aca.name || aca.id, levelName: null });
              }
              aca.levels?.forEach(lvl => {
                if (lvl.teacher?.name === formData.name) {
                  teacherAssignments.push({ academyId: aca.id, academyName: aca.name || aca.id, levelName: lvl.name });
                }
              });
            });

            await setDoc(doc(db, 'teachers', newEmail), {
              email: newEmail,
              name: formData.name,
              assignments: teacherAssignments,
              authorizedAcademies: [...new Set(teacherAssignments.map(a => a.academyName))],
              authorizedAcademyIds: [...new Set(teacherAssignments.map(a => a.academyId))],
              updatedAt: serverTimestamp()
            })
          }

          Swal.fire('Updated', `Updated info across ${updateCount} docs${formData.email ? ', index synced' : ''}.`, 'success')
      } else {
          // If no assignments found, we might still want to update the ID doc if it exists (orphaned teacher case)
          // But for now, user flow is editing via assignments.
          // IF editing a "ghost" teacher (no assignments but exists in list), we should handle that too.
          // Given the current logic derives teachers FROM assignments, updateCount > 0 is usually true if they are in the list.
          Swal.fire('Info', 'Teacher updated in assignments', 'info')
      }
      setOpenDialog(false)
    } catch (error) {
        console.error(error)
        Swal.fire('Error', 'Failed to update teacher', 'error')
    } finally {
        setLoading(false)
    }
  }

  const handleOpenAssign = (teacherEmail = '') => {
      setAssignData({ teacherEmail, academyId: '', levelName: 'ALL' })
      setOpenAssignDialog(true)
  }

  const handleAssign = async () => {
      const { teacherEmail, academyId, levelName } = assignData
      if (!teacherEmail || !academyId) return

      const existing = teachers.find(t => t.email === teacherEmail)
      const nameToUse = existing ? existing.name : (prompt("Enter/Verify Teacher Name:") || 'Unknown')
      const phoneToUse = existing ? existing.phone : ''

      try {
        setLoading(true)
        const academyDoc = academies.find(a => a.id === academyId)
        if (!academyDoc) {
          setLoading(false)
          return
        }

        const teacherObj = { name: nameToUse, email: teacherEmail, phone: phoneToUse }
        
        if (levelName === 'ALL') {
            await updateDoc(doc(db, 'academies_2026_spring', academyId), { teacher: teacherObj })
        } else {
            if (!academyDoc.levels) {
              setLoading(false)
              return
            }
            const newLevels = academyDoc.levels.map(l => l.name === levelName ? { ...l, teacher: teacherObj } : l)
            await updateDoc(doc(db, 'academies_2026_spring', academyId), { levels: newLevels })
        }

        // SYNC
        const academyDocUpdated = { ...academyDoc }; 
        if (levelName === 'ALL') academyDocUpdated.teacher = teacherObj;
        else {
           academyDocUpdated.levels = academyDoc.levels?.map(l => l.name === levelName ? { ...l, teacher: teacherObj } : l)
        }
        
        const otherAcademies = academies.filter(a => a.id !== academyId);
        const allAcas = [...otherAcademies, academyDocUpdated as AcademyDoc];
        
        const teacherAssignments: { academyId: string, academyName: string, levelName: string | null }[] = [];
        allAcas.forEach(aca => {
          if (aca.teacher?.email?.toLowerCase().trim() === teacherEmail.toLowerCase().trim()) {
            teacherAssignments.push({ academyId: aca.id, academyName: aca.name || aca.id, levelName: null });
          }
          aca.levels?.forEach(lvl => {
            if (lvl.teacher?.email?.toLowerCase().trim() === teacherEmail.toLowerCase().trim()) {
              teacherAssignments.push({ academyId: aca.id, academyName: aca.name || aca.id, levelName: lvl.name });
            }
          });
        });

        await setDoc(doc(db, 'teachers', teacherEmail.toLowerCase().trim()), {
          email: teacherEmail.toLowerCase().trim(),
          name: nameToUse,
          assignments: teacherAssignments,
          authorizedAcademies: [...new Set(teacherAssignments.map(a => a.academyName))],
          authorizedAcademyIds: [...new Set(teacherAssignments.map(a => a.academyId))],
          updatedAt: serverTimestamp()
        });

        Swal.fire('Assigned', 'Teacher assigned and index synced successfully', 'success')
        setOpenAssignDialog(false)
      } catch (err) {
          console.error(err)
          Swal.fire('Error', 'Assignment failed', 'error')
      } finally {
        setLoading(false)
      }
  }

  const handleFullSync = async () => {
     try {
       setLoading(true);
       const batch = writeBatch(db);
       const teachersWithEmail = teachers.filter(t => t.email && t.email.trim());
       
       teachersWithEmail.forEach(t => {
         batch.set(doc(db, 'teachers', t.email.toLowerCase().trim()), {
            ...t,
            email: t.email.toLowerCase().trim(),
            authorizedAcademies: [...new Set(t.assignments.map(a => a.academyName))],
            authorizedAcademyIds: [...new Set(t.assignments.map(a => a.academyId))],
            updatedAt: serverTimestamp()
         });
       });
       
       if (teachersWithEmail.length > 0) {
         await batch.commit();
         const skipped = teachers.length - teachersWithEmail.length;
         Swal.fire('Synced', `${teachersWithEmail.length} teachers synced to index${skipped > 0 ? `. ${skipped} teachers skipped (no email)` : ''}`, 'success');
       } else {
         Swal.fire('Info', 'No teachers with email to sync', 'info');
       }
     } catch (err) {
       console.error(err);
       Swal.fire('Error', 'Sync failed', 'error');
     } finally {
       setLoading(false);
     }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Teacher Management</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={handleFullSync} sx={{ borderRadius: 3, textTransform: 'none' }}>
            Push Index Sync
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenAssign('')} sx={{ borderRadius: 3, textTransform: 'none' }}>
            Assign / Add Teacher
          </Button>
        </Stack>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      <Box sx={{ mb: 3 }}>
          <TextField 
            fullWidth placeholder="Search teachers..." variant="outlined" size="small"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} /> }}
            sx={{ bgcolor: 'background.paper', borderRadius: 1 }}
          />
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                    <TableCell>Name / Contact</TableCell>
                    <TableCell>Assignments</TableCell>
                    <TableCell align="right">Actions</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {filteredTeachers.map(teacher => (
                    <TableRow key={teacher.email} hover>
                        <TableCell>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Box sx={{ bgcolor: 'primary.light', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.contrastText' }}>
                                    {teacher.name.charAt(0)}
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={700}>{teacher.name}</Typography>
                                    <Typography variant="caption" color={teacher.email ? "text.secondary" : "error.main"}>
                                      {teacher.email || "(No email - Click edit to add)"}
                                    </Typography>
                                    {teacher.phone && <Typography variant="caption" display="block">{teacher.phone}</Typography>}
                                </Box>
                            </Stack>
                        </TableCell>
                        <TableCell>
                            <Stack direction="row" gap={1} flexWrap="wrap">
                                {teacher.assignments.map((asg, i) => (
                                    <Chip key={i} label={`${asg.academyName} ${asg.levelName ? `(${asg.levelName})` : ''}`} size="small" variant="outlined" color="primary" />
                                ))}
                            </Stack>
                        </TableCell>
                        <TableCell align="right">
                           <Tooltip title="Edit Contact Info">
                               <IconButton size="small" onClick={() => handleEdit(teacher)}><EditIcon fontSize="small" /></IconButton>
                           </Tooltip>
                        </TableCell>
                    </TableRow>
                ))}
                {filteredTeachers.length === 0 && (
                    <TableRow><TableCell colSpan={3} align="center">No teachers found</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Teacher</DialogTitle>
          <DialogContent>
              <TextField 
                label="Name" 
                fullWidth 
                margin="normal" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                required
              />
              <TextField 
                label="Email" 
                fullWidth 
                margin="normal" 
                type="email"
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})} 
                helperText={!formData.email ? "Email is required for teacher login access" : ""}
              />
              <TextField 
                label="Phone" 
                fullWidth 
                margin="normal" 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
              />
          </DialogContent>
          <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveTeacher} variant="contained">Save All Assignments</Button>
          </DialogActions>
      </Dialog>
      
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} fullWidth maxWidth="xs">
          <DialogTitle>Assign Teacher</DialogTitle>
          <DialogContent>
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField label="Teacher Email" fullWidth value={assignData.teacherEmail} onChange={e => setAssignData({...assignData, teacherEmail: e.target.value})} />
                  <FormControl fullWidth>
                      <InputLabel>Academy</InputLabel>
                      <Select value={assignData.academyId} label="Academy" onChange={e => setAssignData({...assignData, academyId: e.target.value, levelName: 'ALL'})}>
                          {academies.map(a => <MenuItem key={a.id} value={a.id}>{a.name || a.id}</MenuItem>)}
                      </Select>
                  </FormControl>
                  {assignData.academyId && academies.find(a => a.id === assignData.academyId)?.levels && (
                      <FormControl fullWidth>
                          <InputLabel>Level</InputLabel>
                          <Select value={assignData.levelName} label="Level" onChange={e => setAssignData({...assignData, levelName: e.target.value})}>
                              <MenuItem value="ALL">Entire Academy (Main)</MenuItem>
                              {academies.find(a => a.id === assignData.academyId)?.levels?.map(l => (
                                  <MenuItem key={l.name} value={l.name}>{l.name}</MenuItem>
                              ))}
                          </Select>
                      </FormControl>
                  )}
              </Box>
          </DialogContent>
          <DialogActions>
              <Button onClick={() => setOpenAssignDialog(false)}>Cancel</Button>
              <Button onClick={handleAssign} variant="contained">Assign</Button>
          </DialogActions>
      </Dialog>
    </Box>
  )
}
