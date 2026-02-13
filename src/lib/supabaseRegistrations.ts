/**
 * Supabase Registration CRUD Operations
 * Handles student creation, enrollment management, and auto-invoice generation.
 * Replaces Firebase-based registration operations (autoInvoice.ts).
 */
import { supabase } from './supabase'

// --- Helpers ---

async function getActiveSemesterId(): Promise<string> {
  const { data, error } = await supabase
    .from('semesters')
    .select('id')
    .eq('name', 'Spring 2026')
    .limit(1)
  if (error || !data?.[0]) throw new Error('Active semester not found')
  return data[0].id
}

// --- Academy Config ---

export type AcademyOption = {
  id: string
  name: string
  price: number // dollars
  levels: { id: string; name: string }[]
}

/** Fetch available academies with levels for the form dropdown */
export async function getAcademyConfig(): Promise<AcademyOption[]> {
  const semesterId = await getActiveSemesterId()
  const { data, error } = await supabase
    .from('academies')
    .select('id, name, price, levels(id, name)')
    .eq('semester_id', semesterId)
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  if (error) throw error
  return (data || []).map(a => ({
    id: a.id,
    name: a.name,
    price: Number(a.price),
    levels: ((a as any).levels || []).map((l: any) => ({ id: l.id, name: l.name }))
  }))
}

/** Fetch academy price map (name -> price in cents) for expected total calculations */
export async function getAcademyPriceMap(): Promise<Record<string, number>> {
  const semesterId = await getActiveSemesterId()
  const { data, error } = await supabase
    .from('academies')
    .select('name, price')
    .eq('semester_id', semesterId)
  if (error) throw error
  const map: Record<string, number> = {}
  for (const a of (data || [])) {
    if (a.name && a.price != null) {
      map[a.name.trim().toLowerCase()] = Math.round(Number(a.price) * 100) // dollars -> cents
    }
  }
  return map
}

// --- Registration Form Data ---

export type RegistrationFormData = {
  firstName: string
  lastName: string
  email?: string
  cellNumber?: string
  birthday?: string
  gender?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  guardianName?: string
  guardianPhone?: string
  tShirtSize?: string
  selectedAcademies?: { academy: string; level?: string }[]
}

// --- Create Registration ---

export async function createRegistration(form: RegistrationFormData): Promise<string> {
  const semesterId = await getActiveSemesterId()
  const academies = await getAcademyConfig()

  // 1. Create student
  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({
      first_name: form.firstName || '',
      last_name: form.lastName || '',
      email: form.email || null,
      phone: form.cellNumber || null,
      birth_date: form.birthday || null,
      gender: form.gender || null,
      address: {
        street: form.address || '',
        city: form.city || '',
        state: form.state || '',
        zip: form.zipCode || '',
      },
      guardian_name: form.guardianName || null,
      guardian_phone: form.guardianPhone || null,
      t_shirt_size: form.tShirtSize || null,
    })
    .select('id')
    .single()

  if (studentError) throw studentError

  // 2. Create enrollments
  const enrollments = buildEnrollments(student.id, semesterId, form.selectedAcademies || [], academies)
  if (enrollments.length > 0) {
    const { error: enrollError } = await supabase.from('enrollments').insert(enrollments)
    if (enrollError) throw enrollError
  }

  // 3. Create auto-invoice
  await createAutoInvoice(student.id, semesterId, form.selectedAcademies || [], academies)

  return student.id
}

// --- Update Registration ---

export async function updateRegistration(studentId: string, form: RegistrationFormData): Promise<void> {
  const semesterId = await getActiveSemesterId()
  const academies = await getAcademyConfig()

  // 1. Update student record
  const { error: studentError } = await supabase
    .from('students')
    .update({
      first_name: form.firstName || '',
      last_name: form.lastName || '',
      email: form.email || null,
      phone: form.cellNumber || null,
      birth_date: form.birthday || null,
      gender: form.gender || null,
      address: {
        street: form.address || '',
        city: form.city || '',
        state: form.state || '',
        zip: form.zipCode || '',
      },
      guardian_name: form.guardianName || null,
      guardian_phone: form.guardianPhone || null,
      t_shirt_size: form.tShirtSize || null,
    })
    .eq('id', studentId)

  if (studentError) throw studentError

  // 2. Replace enrollments for this semester (delete old + insert new)
  await supabase.from('enrollments').delete()
    .eq('student_id', studentId)
    .eq('semester_id', semesterId)

  const enrollments = buildEnrollments(studentId, semesterId, form.selectedAcademies || [], academies)
  if (enrollments.length > 0) {
    const { error: enrollError } = await supabase.from('enrollments').insert(enrollments)
    if (enrollError) throw enrollError
  }

  // 3. Update or create invoice
  await updateInvoiceForStudent(studentId, semesterId, form.selectedAcademies || [], academies)
}

// --- Delete Student Data ---

export async function deleteStudentData(studentId: string): Promise<void> {
  const semesterId = await getActiveSemesterId()

  // 1. Get invoices for this student in this semester
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id')
    .eq('student_id', studentId)
    .eq('semester_id', semesterId)

  if (invoices && invoices.length > 0) {
    const invoiceIds = invoices.map(i => i.id)

    // 2. Delete payments for those invoices
    await supabase.from('payments').delete().in('invoice_id', invoiceIds)

    // 3. Delete invoice items (in case no cascade)
    await supabase.from('invoice_items').delete().in('invoice_id', invoiceIds)

    // 4. Delete invoices
    await supabase.from('invoices').delete().in('id', invoiceIds)
  }

  // 5. Delete enrollments for this semester
  await supabase.from('enrollments').delete()
    .eq('student_id', studentId)
    .eq('semester_id', semesterId)

  // 6. Check if student has enrollments in other semesters
  const { data: otherEnrollments } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', studentId)
    .limit(1)

  // Only delete the student if they have no other enrollments
  if (!otherEnrollments || otherEnrollments.length === 0) {
    await supabase.from('students').delete().eq('id', studentId)
  }
}

// --- Quick Payment (for QuickPaymentDialog) ---

export type QuickInvoice = {
  id: string
  total: number   // cents
  paid: number    // cents
  balance: number // cents
  status: string
  createdAt: string
}

/** Fetch invoices for a student in the active semester */
export async function getStudentInvoices(studentId: string): Promise<QuickInvoice[]> {
  const semesterId = await getActiveSemesterId()
  const { data, error } = await supabase
    .from('invoices')
    .select('id, total, paid_amount, balance, status, created_at')
    .eq('student_id', studentId)
    .eq('semester_id', semesterId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(inv => ({
    id: inv.id,
    total: Math.round((inv.total || 0) * 100),      // dollars -> cents
    paid: Math.round((inv.paid_amount || 0) * 100),  // dollars -> cents
    balance: Math.round((inv.balance || 0) * 100),   // dollars -> cents
    status: inv.status,
    createdAt: inv.created_at,
  }))
}

/** Record a quick payment and update the invoice */
export async function recordQuickPayment(
  invoiceId: string,
  studentId: string,
  amountCents: number,
  method: string
): Promise<void> {
  const amountDollars = amountCents / 100

  // 1. Insert payment
  const { error: payError } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      student_id: studentId,
      amount: amountDollars,
      method,
    })
  if (payError) throw payError

  // 2. Update invoice balance
  const { data: inv, error: invError } = await supabase
    .from('invoices')
    .select('total, paid_amount')
    .eq('id', invoiceId)
    .single()
  if (invError) throw invError

  const newPaid = (inv.paid_amount || 0) + amountDollars
  const newBalance = (inv.total || 0) - newPaid
  const status = newBalance <= 0.01 ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid'

  await supabase.from('invoices').update({
    paid_amount: newPaid,
    balance: newBalance,
    status,
    updated_at: new Date().toISOString(),
  }).eq('id', invoiceId)
}

/** Ensure a student has an up-to-date invoice (create or update). Used by RegistrationDrawer. */
export async function ensureStudentInvoice(
  studentId: string,
  selectedAcademies: { academy: string; level?: string }[]
): Promise<void> {
  const semesterId = await getActiveSemesterId()
  const academyConfig = await getAcademyConfig()
  await updateInvoiceForStudent(studentId, semesterId, selectedAcademies, academyConfig)
}

// --- Internal Helpers ---

function buildEnrollments(
  studentId: string,
  semesterId: string,
  selectedAcademies: { academy: string; level?: string }[],
  academyConfig: AcademyOption[]
) {
  const enrollments: {
    student_id: string
    academy_id: string
    level_id: string | null
    semester_id: string
    status: string
  }[] = []

  for (const sel of selectedAcademies) {
    if (!sel.academy || sel.academy === 'N/A') continue
    const academy = academyConfig.find(a => a.name === sel.academy)
    if (!academy) continue
    const level = sel.level ? academy.levels.find(l => l.name === sel.level) : null
    enrollments.push({
      student_id: studentId,
      academy_id: academy.id,
      level_id: level?.id || null,
      semester_id: semesterId,
      status: 'enrolled',
    })
  }
  return enrollments
}

async function createAutoInvoice(
  studentId: string,
  semesterId: string,
  selectedAcademies: { academy: string; level?: string }[],
  academyConfig: AcademyOption[]
): Promise<void> {
  // Check if invoice already exists
  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('student_id', studentId)
    .eq('semester_id', semesterId)
    .limit(1)

  if (existing && existing.length > 0) return

  // Build line items
  const lines = buildInvoiceLines(selectedAcademies, academyConfig)
  if (lines.length === 0) return

  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0)

  // Create invoice
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .insert({
      semester_id: semesterId,
      student_id: studentId,
      status: 'unpaid',
      subtotal,
      discount_amount: 0,
      total: subtotal,
      paid_amount: 0,
      balance: subtotal,
      due_date: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (invError) throw invError

  // Create invoice items
  const items = lines.map(l => ({
    invoice_id: invoice.id,
    type: 'tuition',
    description: l.description,
    academy_id: l.academy_id,
    quantity: 1,
    unit_price: l.unit_price,
    amount: l.amount,
  }))

  const { error: itemsError } = await supabase.from('invoice_items').insert(items)
  if (itemsError) throw itemsError
}

async function updateInvoiceForStudent(
  studentId: string,
  semesterId: string,
  selectedAcademies: { academy: string; level?: string }[],
  academyConfig: AcademyOption[]
): Promise<void> {
  // Find existing invoice
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, paid_amount, discount_amount, status')
    .eq('student_id', studentId)
    .eq('semester_id', semesterId)
    .order('created_at', { ascending: false })
    .limit(1)

  if (!invoices || invoices.length === 0) {
    // No invoice exists - create one
    await createAutoInvoice(studentId, semesterId, selectedAcademies, academyConfig)
    return
  }

  const invoice = invoices[0]
  const lines = buildInvoiceLines(selectedAcademies, academyConfig)
  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0)
  const discount = Number(invoice.discount_amount) || 0
  const total = Math.max(0, subtotal - discount)
  const paid = Number(invoice.paid_amount) || 0
  const balance = Math.max(0, total - paid)
  const status = balance <= 0.01 ? 'paid' : paid > 0 ? 'partial' : 'unpaid'

  // Update invoice totals
  await supabase.from('invoices').update({
    subtotal,
    total,
    balance,
    status,
    updated_at: new Date().toISOString(),
  }).eq('id', invoice.id)

  // Replace line items
  await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id)

  if (lines.length > 0) {
    const items = lines.map(l => ({
      invoice_id: invoice.id,
      type: 'tuition',
      description: l.description,
      academy_id: l.academy_id,
      quantity: 1,
      unit_price: l.unit_price,
      amount: l.amount,
    }))
    await supabase.from('invoice_items').insert(items)
  }
}

function buildInvoiceLines(
  selectedAcademies: { academy: string; level?: string }[],
  academyConfig: AcademyOption[]
): { description: string; academy_id: string; unit_price: number; amount: number }[] {
  const lines: { description: string; academy_id: string; unit_price: number; amount: number }[] = []
  for (const sel of selectedAcademies) {
    if (!sel.academy || sel.academy === 'N/A') continue
    const academy = academyConfig.find(a => a.name === sel.academy)
    if (!academy) continue
    const price = academy.price // dollars
    lines.push({
      description: sel.level ? `${sel.academy} - ${sel.level}` : sel.academy,
      academy_id: academy.id,
      unit_price: price,
      amount: price,
    })
  }
  return lines
}
