import * as React from 'react'
import {
  CardContent, Stack, Button, Box, Alert, TextField, Typography, Chip,
  Autocomplete, Tabs, Tab, MenuItem,
} from '@mui/material'
import { DataGrid, GridToolbar } from '@mui/x-data-grid'
import type { GridColDef } from '@mui/x-data-grid'
import SaveIcon from '@mui/icons-material/Save'
import InsightsIcon from '@mui/icons-material/Insights'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import DownloadIcon from '@mui/icons-material/Download'

import { useAuth } from '../../../context/AuthContext'
import { GlassCard } from '../../../components/GlassCard'
import { useTeacherContext } from '../../auth/context/TeacherContext'
import { useTeacherNotifications } from '../../dashboard/hooks/useTeacherNotifications'
import { useSupabaseProgress, type FeedbackRow } from '../hooks/useSupabaseProgress'
import { supabase } from '../../../lib/supabase'
import { normalizeAcademy } from '../../../lib/normalization'

const ADMIN_EMAILS = ['jodlouis.dev@gmail.com', 'orlando@iyfusa.org']

const CERT_THRESHOLDS = {
  completion: 70,
  participation: 1,
}

function getCertType(pct: number | null): 'Completion' | 'Participation' | 'None' {
  if (pct === null || pct === undefined) return 'None'
  if (pct >= CERT_THRESHOLDS.completion) return 'Completion'
  if (pct >= CERT_THRESHOLDS.participation) return 'Participation'
  return 'None'
}

export default function ProgressPage() {
  const { isTeacher, teacherProfile, isAdmin: contextIsAdmin } = useTeacherContext()
  const { currentUser } = useAuth()
  const userEmail = currentUser?.email || null
  const isSuperAdmin = !!(userEmail && ADMIN_EMAILS.includes(userEmail)) || contextIsAdmin
  const canEdit = isSuperAdmin || isTeacher

  const { fetchFeedback, saveFeedbackBatch, fetchAllCertifications, loading } = useSupabaseProgress()
  const { addNotification } = useTeacherNotifications(false)

  const [tab, setTab] = React.useState(0) // 0=Feedback, 1=Certifications
  const [rows, setRows] = React.useState<FeedbackRow[]>([])
  const [certRows, setCertRows] = React.useState<FeedbackRow[]>([])

  // Academy + Level selection
  type AcademyOption = { id: string; name: string }
  type LevelOption = { id: string; name: string; schedule?: string }
  const [academies, setAcademies] = React.useState<AcademyOption[]>([])
  const [selectedAcademy, setSelectedAcademy] = React.useState<AcademyOption | null>(null)
  const [levels, setLevels] = React.useState<LevelOption[]>([])
  const [selectedLevel, setSelectedLevel] = React.useState<string>('') // level_id or '' for all

  // Load academies
  React.useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('academies').select('id, name').order('name')
      if (!data) return
      let list = data.map((a: any) => ({ id: a.id, name: a.name }))

      // Teacher scoping: show only assigned academies
      if (isTeacher && teacherProfile?.academies) {
        const assigned = new Set(teacherProfile.academies.map((a: any) => normalizeAcademy(a.academyName)))
        list = list.filter(a => assigned.has(normalizeAcademy(a.name)))
      }

      setAcademies(list)
      if (list.length === 1) setSelectedAcademy(list[0])
    }
    load()
  }, [isTeacher, teacherProfile])

  // Load levels when academy changes
  React.useEffect(() => {
    if (!selectedAcademy) { setLevels([]); setSelectedLevel(''); return }
    const load = async () => {
      const { data } = await supabase
        .from('levels')
        .select('id, name, schedule')
        .eq('academy_id', selectedAcademy.id)
        .order('display_order', { ascending: true })
      if (data && data.length > 0) {
        let levelList = data.map((l: any) => ({ id: l.id, name: l.name, schedule: l.schedule }))

        // Teacher scoping: only show assigned levels
        if (isTeacher && teacherProfile?.academies) {
          const teacherLevels = teacherProfile.academies
            .filter((a: any) => normalizeAcademy(a.academyName) === normalizeAcademy(selectedAcademy.name) && a.level)
            .map((a: any) => a.level)
          if (teacherLevels.length > 0) {
            levelList = levelList.filter(l => teacherLevels.includes(l.name))
          }
          // Auto-select if only one level
          if (levelList.length === 1) {
            setSelectedLevel(levelList[0].id)
          }
        }

        setLevels(levelList)
      } else {
        setLevels([])
        setSelectedLevel('')
      }
    }
    load()
  }, [selectedAcademy, isTeacher, teacherProfile])

  // Load feedback when academy/level changes
  React.useEffect(() => {
    if (!selectedAcademy || tab !== 0) return
    const load = async () => {
      const data = await fetchFeedback(selectedAcademy.id, selectedAcademy.name)
      // Filter by level if selected
      const filtered = selectedLevel
        ? data.filter(r => r.levelId === selectedLevel)
        : data
      setRows(filtered)
    }
    load()
  }, [selectedAcademy, selectedLevel, tab, fetchFeedback])

  // Load certifications
  React.useEffect(() => {
    if (tab !== 1) return
    const load = async () => {
      const data = await fetchAllCertifications()
      setCertRows(data)
    }
    load()
  }, [tab, fetchAllCertifications])

  const updateRow = (studentId: string, field: 'score' | 'comment', value: any) => {
    setRows(prev => prev.map(r =>
      r.studentId === studentId ? { ...r, [field]: value, dirty: true } : r
    ))
  }

  const handleSaveAll = async () => {
    const success = await saveFeedbackBatch(rows)
    if (success) {
      // Refresh with same level filter
      if (selectedAcademy) {
        const data = await fetchFeedback(selectedAcademy.id, selectedAcademy.name)
        const filtered = selectedLevel ? data.filter(r => r.levelId === selectedLevel) : data
        setRows(filtered)
      }
      if (isTeacher && teacherProfile) {
        void addNotification({
          teacherId: currentUser?.id || '',
          teacherName: teacherProfile.name,
          action: 'Updated Feedback',
          academy: selectedAcademy?.name || '',
          details: `Saved feedback for ${rows.filter(r => r.dirty).length} students`,
        })
      }
    }
  }

  const dirtyCount = rows.filter(r => r.dirty).length

  // Feedback columns
  const feedbackCols: GridColDef[] = React.useMemo(() => [
    { field: 'studentName', headerName: 'Student', minWidth: 200, flex: 1 },
    {
      field: 'levelName', headerName: 'Level', width: 140,
      renderCell: (p) => p.value || '—',
    },
    {
      field: 'attendancePct', headerName: 'Attendance %', width: 130,
      renderCell: (p) => {
        const pct = p.value as number | null
        if (pct === null || pct === undefined) return <Chip size="small" variant="outlined" label="—" />
        return <Chip size="small" color={pct >= 90 ? 'success' : pct >= 70 ? 'warning' : 'default'} label={`${pct}%`} />
      },
    },
    {
      field: 'score', headerName: 'Score (0-100)', width: 140,
      renderCell: (p) => (
        <TextField
          size="small"
          type="number"
          inputProps={{ min: 0, max: 100 }}
          value={p.row.score ?? ''}
          disabled={!canEdit}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const v = e.target.value === '' ? null : Math.min(100, Math.max(0, Number(e.target.value)))
            updateRow(p.row.studentId, 'score', v)
          }}
          sx={{ width: 100 }}
        />
      ),
    },
    {
      field: 'comment', headerName: 'Comment', minWidth: 300, flex: 2,
      renderCell: (p) => (
        <TextField
          size="small"
          fullWidth
          placeholder="Teacher feedback..."
          value={p.row.comment || ''}
          disabled={!canEdit}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onChange={(e) => updateRow(p.row.studentId, 'comment', e.target.value)}
        />
      ),
    },
    {
      field: 'dirty', headerName: '', width: 60, sortable: false, filterable: false,
      renderCell: (p) => p.row.dirty ? <Chip label="*" color="warning" size="small" /> : null,
    },
  ], [canEdit])

  // Certification columns
  const certCols: GridColDef[] = React.useMemo(() => [
    { field: 'studentName', headerName: 'Student', minWidth: 200, flex: 1 },
    { field: 'academyName', headerName: 'Academy', minWidth: 160, flex: 1 },
    { field: 'levelName', headerName: 'Level', width: 130, renderCell: (p) => p.value || '—' },
    {
      field: 'attendancePct', headerName: 'Attendance %', width: 130,
      renderCell: (p) => {
        const pct = p.value as number | null
        if (pct === null) return <Chip size="small" variant="outlined" label="—" />
        return <Chip size="small" color={pct >= 70 ? 'success' : pct >= 1 ? 'warning' : 'default'} label={`${pct}%`} />
      },
    },
    {
      field: 'score', headerName: 'Score', width: 90,
      renderCell: (p) => {
        const sc = p.value as number | null
        if (sc === null || sc === undefined) return '—'
        let color: 'default' | 'success' | 'warning' | 'error' = 'default'
        if (sc >= 90) color = 'success'
        else if (sc >= 70) color = 'warning'
        else color = 'error'
        return <Chip label={sc} color={color} size="small" variant="outlined" />
      },
    },
    { field: 'comment', headerName: 'Comment', minWidth: 200, flex: 1, renderCell: (p) => p.value || '—' },
    {
      field: 'certType', headerName: 'Certificate', width: 150,
      type: 'singleSelect',
      valueOptions: ['None', 'Completion', 'Participation'],
      valueGetter: (_value: any, row: any) => getCertType(row.attendancePct),
      renderCell: (p) => {
        const ct = p.value as string
        if (ct === 'Completion') return <Chip label="Completion" color="success" size="small" icon={<EmojiEventsIcon />} />
        if (ct === 'Participation') return <Chip label="Participation" color="info" size="small" />
        return <Chip label="None" size="small" variant="outlined" />
      },
    },
  ], [])

  // CSV export for certifications
  const exportCertCSV = () => {
    const header = ['Student', 'Academy', 'Level', 'Attendance %', 'Score', 'Comment', 'Certificate']
    const csvRows = certRows.map(r => [
      r.studentName,
      r.academyName,
      r.levelName || '',
      r.attendancePct !== null ? String(r.attendancePct) : '',
      r.score !== null ? String(r.score) : '',
      `"${(r.comment || '').replace(/"/g, '""')}"`,
      getCertType(r.attendancePct),
    ])
    const csv = [header.join(','), ...csvRows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `certifications_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Cert stats
  const completionCount = certRows.filter(r => getCertType(r.attendancePct) === 'Completion').length
  const participationCount = certRows.filter(r => getCertType(r.attendancePct) === 'Participation').length

  return (
    <Box>
      <Box sx={{
        mb: 4,
        background: 'linear-gradient(135deg, #009688 0%, #006064 100%)',
        borderRadius: 3,
        p: { xs: 2.5, sm: 3 },
        color: 'white',
        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.14), 0 7px 10px -5px rgba(0, 150, 136, 0.4)'
      }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <InsightsIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: 'white' }} />
          <Box>
            <Typography variant="h4" fontWeight={800} color="white" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
              Student Feedback
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5, color: 'white' }}>
              {isSuperAdmin ? 'Full admin visibility' : isTeacher ? 'Scoped by assigned classes' : 'View feedback (read-only)'}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <GlassCard>
        <CardContent>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
            <Tab icon={<InsightsIcon />} iconPosition="start" label="Feedback" />
            <Tab icon={<EmojiEventsIcon />} iconPosition="start" label="Certifications" />
          </Tabs>

          {tab === 0 && (
            <Box>
              {!canEdit && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>View only. Teachers and admins can edit.</Alert>}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems="center" flexWrap="wrap">
                <Autocomplete
                  options={academies}
                  getOptionLabel={(o) => o.name}
                  value={selectedAcademy}
                  onChange={(_, v) => { setSelectedAcademy(v); setSelectedLevel(''); }}
                  renderInput={(p) => <TextField {...p} label="Academy" size="small" placeholder="Select academy..." />}
                  sx={{ minWidth: 280 }}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                />
                {levels.length > 0 && (
                  <TextField
                    select
                    label="Level / Schedule"
                    value={selectedLevel}
                    onChange={(e) => setSelectedLevel(e.target.value)}
                    size="small"
                    sx={{ minWidth: 220 }}
                  >
                    <MenuItem value="">All Levels</MenuItem>
                    {levels.map(l => (
                      <MenuItem key={l.id} value={l.id}>
                        {l.name}{l.schedule ? ` — ${l.schedule}` : ''}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                <Box sx={{ flexGrow: 1 }} />
                {dirtyCount > 0 && (
                  <Chip label={`${dirtyCount} unsaved`} color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
                )}
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveAll}
                  disabled={!canEdit || dirtyCount === 0 || loading}
                  sx={{
                    borderRadius: 2,
                    background: 'linear-gradient(45deg, #009688 30%, #00BCD4 90%)',
                    boxShadow: '0 3px 5px 2px rgba(0, 188, 212, .3)',
                  }}
                >
                  Save All ({dirtyCount})
                </Button>
              </Stack>

              {!selectedAcademy ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>Select an academy to view and edit student feedback.</Alert>
              ) : rows.length === 0 && !loading ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>No students enrolled in {selectedAcademy.name} this semester.</Alert>
              ) : (
                <Box sx={{ height: 600, width: '100%' }}>
                  <DataGrid
                    rows={rows}
                    columns={feedbackCols}
                    loading={loading}
                    disableRowSelectionOnClick
                    getRowId={(r) => r.studentId}
                    slots={{ toolbar: GridToolbar }}
                    sx={{
                      border: 'none',
                      '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(224, 224, 224, 0.4)' },
                      '& .MuiDataGrid-columnHeaders': { bgcolor: 'rgba(0, 150, 136, 0.08)', fontWeight: 700 },
                    }}
                  />
                </Box>
              )}
            </Box>
          )}

          {tab === 1 && (
            <Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} alignItems="center">
                <Stack direction="row" spacing={1}>
                  <Chip icon={<EmojiEventsIcon />} label={`${completionCount} Completion`} color="success" variant="outlined" />
                  <Chip label={`${participationCount} Participation`} color="info" variant="outlined" />
                  <Chip label={`${certRows.length} Total`} variant="outlined" />
                </Stack>
                <Box sx={{ flexGrow: 1 }} />
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={exportCertCSV}
                  disabled={certRows.length === 0}
                  sx={{ borderRadius: 2 }}
                >
                  Export CSV
                </Button>
              </Stack>

              {certRows.length === 0 && !loading ? (
                <Alert severity="info" sx={{ borderRadius: 2 }}>No enrollment data found for this semester.</Alert>
              ) : (
                <Box sx={{ height: 600, width: '100%' }}>
                  <DataGrid
                    rows={certRows}
                    columns={certCols}
                    loading={loading}
                    disableRowSelectionOnClick
                    getRowId={(r) => `${r.studentId}:${r.academyId}`}
                    slots={{ toolbar: GridToolbar }}
                    sx={{
                      border: 'none',
                      '& .MuiDataGrid-cell': { borderBottom: '1px solid rgba(224, 224, 224, 0.4)' },
                      '& .MuiDataGrid-columnHeaders': { bgcolor: 'rgba(0, 150, 136, 0.08)', fontWeight: 700 },
                    }}
                  />
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </GlassCard>
    </Box>
  )
}
