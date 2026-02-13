// Diagnostic script to check student counts and enrollments
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnoseData() {
  console.log('🔍 Starting data diagnosis...\n')

  // 1. Get Spring 2026 semester
  const { data: semester, error: semError } = await supabase
    .from('semesters')
    .select('id, name')
    .eq('name', 'Spring 2026')
    .single()

  if (semError || !semester) {
    console.error('❌ Error fetching semester:', semError)
    return
  }

  console.log(`✅ Semester found: ${semester.name} (ID: ${semester.id})\n`)

  // 2. Count total students
  const { count: totalStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 Total students in database: ${totalStudents}\n`)

  // 3. Get all enrollments for Spring 2026
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select(`
      id,
      student_id,
      academy:academies(name),
      level:levels(name),
      status,
      created_at
    `)
    .eq('semester_id', semester.id)

  if (enrollError) {
    console.error('❌ Error fetching enrollments:', enrollError)
    return
  }

  console.log(`📚 Total enrollments for Spring 2026: ${enrollments.length}\n`)

  // 4. Group by student
  const studentEnrollments = new Map()
  enrollments.forEach((e) => {
    if (!studentEnrollments.has(e.student_id)) {
      studentEnrollments.set(e.student_id, [])
    }
    studentEnrollments.get(e.student_id).push({
      academy: e.academy?.name || 'Unknown',
      level: e.level?.name || 'No Level',
      status: e.status
    })
  })

  console.log(`👥 Unique students with enrollments: ${studentEnrollments.size}\n`)

  // 5. Show students with multiple academies
  const multipleAcademies = Array.from(studentEnrollments.entries())
    .filter(([_, acads]) => acads.length > 1)

  console.log(`🎓 Students with multiple academies: ${multipleAcademies.length}\n`)

  if (multipleAcademies.length > 0) {
    console.log('Sample students with multiple enrollments:')
    multipleAcademies.slice(0, 5).forEach(([studentId, acads]) => {
      console.log(`  Student ${studentId}:`)
      acads.forEach(a => console.log(`    - ${a.academy} (${a.level})`))
    })
    console.log()
  }

  // 6. Get full student data to match what useSupabaseRegistrations returns
  const { data: fullEnrollments } = await supabase
    .from('enrollments')
    .select(`
      status,
      created_at,
      student:students (
        id, first_name, last_name, email
      ),
      academy:academies (name),
      level:levels (name)
    `)
    .eq('semester_id', semester.id)

  const studentMap = new Map()
  fullEnrollments?.forEach((enroll) => {
    const student = enroll.student
    if (!student) return

    if (!studentMap.has(student.id)) {
      studentMap.set(student.id, {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        email: student.email,
        selectedAcademies: []
      })
    }

    const regEntry = studentMap.get(student.id)
    regEntry.selectedAcademies.push({
      academy: enroll.academy?.name || 'Unknown',
      level: enroll.level?.name || null,
      status: enroll.status
    })
  })

  console.log(`\n📋 After grouping (like useSupabaseRegistrations):`)
  console.log(`   Total registration objects: ${studentMap.size}`)
  console.log(`   Students with 2+ academies: ${Array.from(studentMap.values()).filter(s => s.selectedAcademies.length > 1).length}`)

  // Show first 5 students
  console.log('\nFirst 5 students:')
  Array.from(studentMap.values()).slice(0, 5).forEach(s => {
    console.log(`  ${s.firstName} ${s.lastName}:`, s.selectedAcademies.map(a => `${a.academy}${a.level ? ` (${a.level})` : ''}`).join(', '))
  })
}

diagnoseData()
