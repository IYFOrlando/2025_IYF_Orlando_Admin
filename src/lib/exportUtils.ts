import * as XLSX from 'xlsx'
import { format } from 'date-fns'

/* Generic Export Function */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

/* 
  Scoped Exports for Teachers 
  These functions prepare the data by formatting dates and renaming columns
  before passing to the generic exportToExcel.
*/

export function exportTeacherStudents(students: any[]) {
  // Format for export
  const exportData = students.map(s => ({
    'ID': s.objectID || s.id,
    'Name': `${s.firstName || ''} ${s.lastName || ''}`.trim(),
    'Email': s.email,
    'Phone': s.phone,
    'Age': s.age,
    'City': s.city,
    'Academies': Array.isArray(s.academies) ? s.academies.join(', ') : s.academies,
    'Registered At': s.createdAt ? format(new Date(s.createdAt), 'yyyy-MM-dd') : ''
  }))

  exportToExcel(exportData, `My_Students_${format(new Date(), 'yyyyMMdd')}`, 'Students')
}

export function exportTeacherAttendance(attendanceRecords: any[]) {
    const exportData = attendanceRecords.map(r => ({
        'Date': r.date ? format(new Date(r.date), 'yyyy-MM-dd') : '',
        'Student': r.studentName,
        'Academy': r.academy,
        'Level': r.level || '-',
        'Status': r.status, // Present/Absent/Late
        'Reason': r.reason || ''
    }))
    
    exportToExcel(exportData, `Attendance_Log_${format(new Date(), 'yyyyMMdd')}`, 'Attendance')
}

export function exportTeacherProgress(progressRecords: any[]) {
    const exportData = progressRecords.map(r => ({
        'Date': r.date ? format(new Date(r.date), 'yyyy-MM-dd') : '',
        'Student': r.studentName,
        'Academy': r.academy,
        'Level': r.level || '-',
        'Score': r.score,
        'Note': r.note
    }))

    exportToExcel(exportData, `Student_Progress_${format(new Date(), 'yyyyMMdd')}`, 'Progress')
}
