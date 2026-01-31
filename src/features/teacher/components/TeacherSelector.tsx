
import * as React from 'react'
import { 
  FormControl, InputLabel, Select, MenuItem, Stack, TextField, 
  Avatar, Typography, FormHelperText, Box 
} from '@mui/material'
import { useTeachers } from '../hooks/useTeachers'

interface TeacherSelectorProps {
  selectedTeacher?: {
    id?: string
    name: string
    email: string
    phone: string
    credentials?: string
  }
  onTeacherChange: (teacher: { id?: string, name: string, email: string, phone: string, credentials?: string }) => void
}

export function TeacherSelector({ selectedTeacher, onTeacherChange }: TeacherSelectorProps) {
  const { teachers, loading } = useTeachers()
  const [selectedId, setSelectedId] = React.useState<string>('')
  
  // Update local selection when selectedTeacher prop changes
  React.useEffect(() => {
    if (selectedTeacher) {
      // 1. If we have an ID, match directly
      if (selectedTeacher.id) {
        const match = teachers.find(t => t.id === selectedTeacher.id)
        if (match) {
          setSelectedId(match.id)
          return
        }
      }
      
      // 2. Fallback to Email/Name matching if ID is missing or not found
      if (teachers.length > 0) {
        const match = teachers.find(t => 
          (selectedTeacher.email && t.email === selectedTeacher.email) ||
          t.name === selectedTeacher.name
        )
        if (match) {
          setSelectedId(match.id)
        } else if (selectedTeacher.name) {
          // If has name but no match, it's manual
          setSelectedId('manual')
        }
      }
    } else {
      setSelectedId('')
    }
  }, [selectedTeacher, teachers])

  const handleSelectChange = (teacherId: string) => {
    setSelectedId(teacherId)
    
    if (teacherId === 'manual') {
      // Don't clear data, just allow manual edit
      return
    }
    
    if (teacherId === '') {
      onTeacherChange({ id: undefined, name: '', email: '', phone: '', credentials: '' })
      return
    }

    const teacher = teachers.find(t => t.id === teacherId)
    if (teacher) {
      onTeacherChange({
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        credentials: teacher.credentials || teacher.bio || ''
      })
    }
  }

  const isManual = selectedId === 'manual' || !selectedId

  return (
    <Stack spacing={2}>
      <FormControl fullWidth size="small">
        <InputLabel id="teacher-select-label">Select Teacher</InputLabel>
        <Select
          labelId="teacher-select-label"
          value={selectedId}
          label="Select Teacher"
          onChange={(e) => handleSelectChange(e.target.value)}
          disabled={loading}
        >
          <MenuItem value="">
            <em>{loading ? 'Loading...' : 'None'}</em>
          </MenuItem>
          {teachers.map((teacher) => (
            <MenuItem key={teacher.id} value={teacher.id}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%'}}>
                <Avatar 
                  src={teacher.photoURL} 
                  alt={teacher.name}
                  sx={{ width: 24, height: 24, fontSize: 12 }} 
                >
                  {teacher.name.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">{teacher.name}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {teacher.email}
                  </Typography>
                </Box>
              </Stack>
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>
          {teachers.some((t, i) => teachers.findIndex(t2 => t2.name === t.name) !== i) 
            ? '⚠️ Some teachers have the same name - check email to choose the right one' 
            : 'Selecting a teacher will auto-fill the fields below'}
        </FormHelperText>
      </FormControl>

      <Stack spacing={2} sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
        <TextField
          label="Teacher Name"
          size="small"
          fullWidth
          value={selectedTeacher?.name || ''}
          onChange={(e) => onTeacherChange({ ...selectedTeacher!, name: e.target.value })}
          disabled={!isManual}
          // Highlight if manual
          helperText={isManual ? "Custom entry (not synchronized)" : "Linked to teacher database (updates automatically)"}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Teacher Email"
            type="email"
            size="small"
            fullWidth
            value={selectedTeacher?.email || ''}
            onChange={(e) => onTeacherChange({ ...selectedTeacher!, email: e.target.value })}
            disabled={!isManual}
          />
          <TextField
            label="Teacher Phone"
            size="small"
            fullWidth
            value={selectedTeacher?.phone || ''}
            onChange={(e) => onTeacherChange({ ...selectedTeacher!, phone: e.target.value })}
            disabled={!isManual}
          />
        </Stack>
        <TextField
          label="Teacher Credentials / Bio"
          fullWidth
          multiline
          rows={2}
          size="small"
          value={selectedTeacher?.credentials || ''}
          onChange={(e) => onTeacherChange({ ...selectedTeacher!, credentials: e.target.value })}
          disabled={!isManual}
        />
      </Stack>
    </Stack>
  )
}
