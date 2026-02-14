import * as React from 'react'
import {
  CardContent, Stack, Button, Tooltip, Box, Alert,
  TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Typography, Autocomplete, 
  CircularProgress, useTheme, useMediaQuery, Chip
} from '@mui/material'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import InsightsIcon from '@mui/icons-material/Insights'
import SearchIcon from '@mui/icons-material/Search'

import { useAuth } from '../../../context/AuthContext'
import { Alert as SAlert, confirmDelete } from '../../../lib/alerts'
import { GlassCard } from '../../../components/GlassCard'
import { useTeacherContext } from '../../auth/context/TeacherContext'
import { useTeacherNotifications } from '../../dashboard/hooks/useTeacherNotifications'
import { useSupabaseProgress, type ProgressRow, type StudentSearchResult } from '../hooks/useSupabaseProgress'
import { supabase } from '../../../lib/supabase'

// Keep in sync with Firestore rules isAdmin() allowlist
const ADMIN_EMAILS = ['jodlouis.dev@gmail.com', 'orlando@iyfusa.org']

export default function ProgressPage() {
  const { isTeacher, teacherProfile, isAdmin: contextIsAdmin } = useTeacherContext()
  
  // Mobile check
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md')) // Used in column visibility

  // Admin detection (for UI enable/disable)
  const { currentUser } = useAuth()
  const userEmail = currentUser?.email || null
  
  const isSuperAdmin = !!(userEmail && ADMIN_EMAILS.includes(userEmail)) || contextIsAdmin
  const canEdit = isSuperAdmin || isTeacher

  const { fetchProgress, deleteProgress } = useSupabaseProgress()

  const [rows, setRows] = React.useState<ProgressRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string|null>(null)
  const [selection, setSelection] = React.useState<string[]>([])
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ProgressRow | null>(null)

  const loadData = React.useCallback(async () => {
      setLoading(true)
      try {
          // If teacher, filter by their assigned academies
          let assigned: string[] | null = null;
          if (isTeacher && teacherProfile?.academies) {
              assigned = teacherProfile.academies.map(a => a.academyName).filter(Boolean);
              if (assigned.length === 0) {
                  setRows([]); setLoading(false); return;
              }
          }
          
          const data = await fetchProgress(assigned);
          setRows(data);
          setError(null);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  }, [isTeacher, teacherProfile, fetchProgress]);

  React.useEffect(()=>{
    void loadData();
  }, [loadData])

  const cols = React.useMemo<GridColDef[]>(()=>[
    { field:'date', headerName:'Date', width:130 },
    { field:'studentName', headerName:'Student', minWidth:200, flex:1 },
    { field:'academy', headerName:'Academy', minWidth:160, flex:1 },
    { field:'level', headerName:'Level', minWidth:140, flex:1 },
    { 
        field:'score', headerName:'Score', width:90,
        renderCell: (p) => {
            const sc = p.value as number | undefined;
            if (sc === undefined || sc === null) return '-';
            let color: "default" | "success" | "warning" | "error" = "default";
            if (sc >= 90) color = "success";
            else if (sc >= 70) color = "warning";
            else if (sc < 70) color = "error";
            return <Chip label={sc} color={color} size="small" variant="outlined" />
        }
    },
    { field:'note', headerName:'Note', minWidth:240, flex:1 },
    {
      field: 'actions', headerName: 'Actions', width: 100, sortable:false, filterable:false,
      renderCell: (p) => (
        <Tooltip title={canEdit ? 'Edit' : 'Read-only'}>
          <span>
            <IconButton size="small" onClick={() => { if(canEdit) { setEditing(p.row as ProgressRow); setOpen(true); } }} disabled={!canEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )
    }
  ],[canEdit])

  const handleDelete = async () => {
    if (!isSuperAdmin) return SAlert.fire({ title:'Super Admin Only', text:'Only admins can delete record(s).', icon:'info' })
    if (!selection.length) return SAlert.fire({ title:'No rows selected', icon:'info', timer:1200, showConfirmButton:false })
    
    const res = await confirmDelete('Delete progress?', `You are about to delete ${selection.length} record(s).`)
    if (!res.isConfirmed) return
    
    const success = await deleteProgress(selection)
    if (success) {
        setSelection([])
        void loadData()
    }
  }

  return (
    <Box>
      {/* Header with Gradient */}
      <Box sx={{ 
        mb: 4,
        background: 'linear-gradient(135deg, #009688 0%, #006064 100%)', // Teal/Cyan gradient
        borderRadius: 3,
        p: { xs: 2.5, sm: 3 },
        color: 'white',
        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.14), 0 7px 10px -5px rgba(0, 150, 136, 0.4)'
      }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          alignItems={{ xs: 'flex-start', sm: 'center' }} 
          spacing={2}
        >
          <InsightsIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: 'white' }} />
          <Box>
            <Typography variant="h4" fontWeight={800} color="white" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              Student Progress
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5, color: 'white' }}>
              {isSuperAdmin ? 'Full admin visibility' : isTeacher ? 'Scoping by assigned classes' : 'View progress (read-only)'}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <GlassCard>
        <CardContent>
          {!canEdit && <Alert severity="info" sx={{ mb:2, borderRadius: 2 }}>You can view progress. Only admins or teachers can add/edit records.</Alert>}

          <Stack 
            direction={{ xs: 'column', sm: 'row' }} 
            spacing={1.5} 
            sx={{ mb: 2 }}
          >
            <Button 
              startIcon={<AddIcon />} 
              variant="contained" 
              onClick={()=>{ setEditing(null); setOpen(true) }} 
              disabled={!canEdit}
              sx={{ 
                borderRadius: 2, 
                px: 3,
                py: 1.2,
                background: 'linear-gradient(45deg, #009688 30%, #00BCD4 90%)',
                boxShadow: '0 3px 5px 2px rgba(0, 188, 212, .3)'
              }}
            >
              New Record
            </Button>
            {isSuperAdmin && selection.length > 0 && (
              <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={handleDelete} sx={{ borderRadius: 2 }}>
                Delete ({selection.length})
              </Button>
            )}
          </Stack>

          {error && <Alert severity="error" sx={{ mb:1, borderRadius: 2 }}>{error}</Alert>}

          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={cols}
              loading={loading}
              checkboxSelection={isSuperAdmin}
              disableRowSelectionOnClick
              onRowSelectionModelChange={(m)=>setSelection(m as string[])}
              rowSelectionModel={selection}
              onRowDoubleClick={(p)=> { if(canEdit) { setEditing(p.row as ProgressRow); setOpen(true); } }}
              getRowId={(r)=>r.id}
              slots={{ toolbar: GridToolbar }}
              columnVisibilityModel={{
                academy: !isMobile,
                level: !isMobile,
                note: !isMobile,
                date: !isMobile
              }}
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(224, 224, 224, 0.4)' },
                '& .MuiDataGrid-columnHeaders': { 
                  bgcolor: 'rgba(0, 150, 136, 0.08)', 
                  fontWeight: 700 
                },
              }}
            />
          </Box>

          <ProgressDialog
            open={open}
            onClose={()=>{ setOpen(false); setEditing(null); void loadData(); }}
            editing={editing}
            canEdit={canEdit}
            isTeacher={isTeacher}
            teacherProfile={teacherProfile}
          />
        </CardContent>
      </GlassCard>
    </Box>
  )
}

function ProgressDialog({
  open, onClose, editing, canEdit, isTeacher, teacherProfile
}: { 
  open:boolean; onClose:()=>void; editing:ProgressRow|null; 
  canEdit:boolean; isTeacher:boolean; teacherProfile: any
}) {
  const { addNotification } = useTeacherNotifications(false) 
  const { searchStudents, saveProgress } = useSupabaseProgress()
  
  const [date, setDate] = React.useState<string>(editing?.date || new Date().toISOString().slice(0,10))
  const [studentId, setStudentId] = React.useState(editing?.studentId || '')
  const [studentName, setStudentName] = React.useState(editing?.studentName || '')
  
  const [academy, setAcademy] = React.useState(editing?.academy || '')
  const [level, setLevel] = React.useState(editing?.level || '')
  const [score, setScore] = React.useState<number|''>(editing?.score ?? '')
  const [note, setNote] = React.useState(editing?.note || '')

  // Available options for this student
  const [availableAcademies, setAvailableAcademies] = React.useState<string[]>([])
  
  // Search state
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<StudentSearchResult[]>([])
  const [searching, setSearching] = React.useState(false)

  React.useEffect(()=>{
    if (editing) {
      setDate(editing.date); setStudentId(editing.studentId)
      setStudentName(editing.studentName); setAcademy(editing.academy || ''); setLevel(editing.level || '')
      setScore(editing.score ?? ''); setNote(editing.note || '')
      setAvailableAcademies([]) 
      void loadFromStudentId(editing.studentId)
    } else {
      setDate(new Date().toISOString().slice(0,10))
      setStudentId(''); setStudentName(''); setAcademy(''); setLevel(''); setScore(''); setNote('')
      setAvailableAcademies([])
    }
  },[editing])

  const loadFromStudentId = async (sid: string) => {
    try {
      if (!sid) return
      
      // Get Enrolled Academies from Registrations
      // We assume 'registrations' table has `selected_academies` JSONB
      // TODO: Filter by active semester if possible?
      const { data: regs } = await supabase
        .from('registrations')
        .select('selected_academies')
        .eq('student_id', sid)
        // .eq('semester_id', ...) // if we have it
      
      const options = new Set<string>()
      
      regs?.forEach((r: any) => {
         if (r.selected_academies && Array.isArray(r.selected_academies)) {
            r.selected_academies.forEach((sa: any) => {
                const a = (sa.academy || '').trim()
                if (a && a.toLowerCase() !== 'n/a') {
                     // Teacher Scope
                    if (!isTeacher || teacherProfile?.academies?.some((ta:any) => ta.academyName === a)) {
                        options.add(a)
                    }
                }
            })
         }
      });
      
      const list = Array.from(options).sort()
      setAvailableAcademies(list)
      
      if (list.length > 0 && !editing) {
         setAcademy(list[0])
      }

    } catch (e) {
      console.error(e)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm || searchTerm.length < 2) return
    setSearching(true)
    try {
      const results = await searchStudents(searchTerm)
      setSearchResults(results)
    } catch (e) {
      console.error(e)
    } finally {
      setSearching(false)
    }
  }

  const selectStudent = (s: StudentSearchResult) => {
    setStudentId(s.id)
    setStudentName(`${s.firstName} ${s.lastName}`)
    setSearchOpen(false)
    void loadFromStudentId(s.id)
  }

  const handleSave = async () => {
    if (!canEdit) return SAlert.fire({ title:'Read-only', text:'Only admins or teachers can save.', icon:'info' })
    if (!studentId) return SAlert.fire({ title:'Missing Student', text:'Please select a student.', icon:'warning' })
    if (!academy) return SAlert.fire({ title:'Missing Academy', text:'Please select an academy.', icon:'warning' })

    // Scoped validation for teachers
    if (isTeacher && teacherProfile) {
        // Safe check for undefined academies map
      const assigned = teacherProfile.academies?.map((a:any) => a.academyName) || []
      if (!assigned.includes(academy)) {
        return SAlert.fire({ title:'Permission Denied', text:`You are not assigned to ${academy}.`, icon:'error' })
      }
    }

    const success = await saveProgress({
        id: editing?.id,
        studentId,
        date,
        academy,
        level: level || undefined,
        score: score === '' ? undefined : Number(score),
        note
    });

    if (success) {
      onClose() // Refresh handled by parent
      
      // Real-time Notification for Admins
      if (isTeacher && teacherProfile) {
        void addNotification({
          teacherId: currentUser?.id || '',
          teacherName: teacherProfile.name,
          action: 'Updated Progress',
          academy: academy,
          details: `Student: ${studentName}, Score: ${score || 'N/A'}`
        })
      }
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Progress' : 'New Progress'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt:1 }}>
            <TextField label="Date" type="date" InputLabelProps={{shrink:true}} value={date} onChange={e=>setDate(e.target.value)} />
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="stretch">
              <TextField 
                label="Student" 
                value={studentName || studentId} 
                disabled
                fullWidth 
                helperText="Search to select"
              />
              <Stack direction="row" spacing={1}>
                <Tooltip title="Search by Name">
                  <IconButton onClick={()=>setSearchOpen(true)} color="primary" sx={{ border: '1px solid rgba(0,0,0,0.1)', flex: 1 }}>
                    <SearchIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
            
            <Autocomplete
              freeSolo={false}
              options={availableAcademies}
              value={academy}
              onChange={(_, val) => setAcademy(val || '')}
              // onInputChange={(_, val) => setAcademy(val)}
              renderInput={(params) => <TextField {...params} label="Academy" helperText={availableAcademies.length > 0 ? "Select from their enrolled academies" : "No academies found"} />}
            />
            
            <TextField label="Level" value={level} onChange={e=>setLevel(e.target.value)} />
            <TextField label="Score (0-100)" type="number" inputProps={{min:0,max:100}} value={score} onChange={e=>setScore(e.target.value === '' ? '' : Number(e.target.value))} />
            <TextField label="Note" value={note} onChange={e=>setNote(e.target.value)} multiline rows={3} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={!canEdit}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Student Search Dialog */}
      <Dialog open={searchOpen} onClose={()=>setSearchOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Search Student</DialogTitle>
        <DialogContent>
           <Stack spacing={2} sx={{ mt: 1 }}>
             <Stack direction="row" spacing={1}>
                <TextField 
                  autoFocus
                  fullWidth 
                  placeholder="First or Last Name..." 
                  value={searchTerm} 
                  onChange={e=>setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <Button variant="contained" onClick={handleSearch} disabled={searching}>
                  {searching ? <CircularProgress size={20} color="inherit" /> : 'Go'}
                </Button>
             </Stack>
             <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {searchResults.map(s => (
                  <Box key={s.id} onClick={()=>selectStudent(s)} sx={{ p:1, borderBottom:'1px solid #eee', cursor:'pointer', '&:hover':{ bgcolor:'#f5f5f5' } }}>
                    <Typography variant="subtitle2">{s.firstName} {s.lastName}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.email} | {s.city}</Typography>
                  </Box>
                ))}
                {searchResults.length === 0 && !searching && searchTerm && (
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>No matches found</Typography>
                )}
             </Box>
           </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setSearchOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
