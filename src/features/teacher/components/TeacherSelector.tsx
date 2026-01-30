
import * as React from 'react'
import { 
  FormControl, InputLabel, Select, MenuItem, Stack, TextField, 
  Avatar, Typography, FormHelperText 
} from '@mui/material'
import { useTeachers } from '../hooks/useTeachers'

interface TeacherSelectorProps {
  selectedTeacher?: {
    name: string
    email: string
    phone: string
    credentials?: string
  }
  onTeacherChange: (teacher: { name: string, email: string, phone: string, credentials?: string }) => void
}

export function TeacherSelector({ selectedTeacher, onTeacherChange }: TeacherSelectorProps) {
  const { teachers, loading } = useTeachers()
  const [selectedId, setSelectedId] = React.useState<string>('')
  
  // Update local selection when selectedTeacher prop changes (if it matches a known teacher)
  React.useEffect(() => {
    if (selectedTeacher && teachers.length > 0) {
      const match = teachers.find(t => 
        t.name === selectedTeacher.name || 
        (t.email && t.email === selectedTeacher.email)
      )
      if (match) {
        setSelectedId(match.id)
      } else {
        setSelectedId('manual')
      }
    } else if (!selectedTeacher?.name) {
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
      onTeacherChange({ name: '', email: '', phone: '', credentials: '' })
      return
    }

    const teacher = teachers.find(t => t.id === teacherId)
    if (teacher) {
      onTeacherChange({
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
              <Stack direction="row" spacing={1} alignItems="center">
                <Avatar 
                  src={teacher.photoURL} 
                  alt={teacher.name}
                  sx={{ width: 24, height: 24, fontSize: 12 }} 
                >
                  {teacher.name.charAt(0)}
                </Avatar>
                <Typography variant="body2">{teacher.name}</Typography>
              </Stack>
            </MenuItem>
          ))}
        </Select>
        <FormHelperText>Selecting a teacher will auto-fill the fields below</FormHelperText>
      </FormControl>

      <Stack spacing={2} sx={{ pl: 2, borderLeft: '2px solid', borderColor: 'divider' }}>
        <TextField
          label="Teacher Name"
          size="small"
          fullWidth
          value={selectedTeacher?.name || ''}
          onChange={(e) => onTeacherChange({ ...selectedTeacher!, name: e.target.value })}
          // Highlight if manual
          helperText={isManual ? "Custom entry" : "Linked to teacher database"}
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Teacher Email"
            type="email"
            size="small"
            fullWidth
            value={selectedTeacher?.email || ''}
            onChange={(e) => onTeacherChange({ ...selectedTeacher!, email: e.target.value })}
          />
          <TextField
            label="Teacher Phone"
            size="small"
            fullWidth
            value={selectedTeacher?.phone || ''}
            onChange={(e) => onTeacherChange({ ...selectedTeacher!, phone: e.target.value })}
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
        />
      </Stack>
    </Stack>
  )
}
