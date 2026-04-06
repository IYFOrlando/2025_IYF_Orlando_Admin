import * as React from 'react'
import { supabase } from '../../../lib/supabase'
import { logger } from '../../../lib/logger'
import type { EmailRecord, EmailSource } from '../types'

/**
 * Hook to manage email database using Supabase.
 * Replaces the Firebase version.
 */
export function useEmailDatabase() {
  const [emails, setEmails] = React.useState<EmailRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // ─── Load emails ─────────────────────────────────────
  const fetchEmails = React.useCallback(async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('email_database')
        .select('*')
        .order('email')

      if (fetchError) throw fetchError

      setEmails((data || []).map(d => ({
        id: d.id,
        email: d.email || '',
        firstName: d.first_name || '',
        lastName: d.last_name || '',
        source: (d.source || 'manual') as EmailSource,
        sourceId: d.source_id || '',
        sourceDetails: d.source_details || {},
        isActive: d.is_active !== false,
        isVerified: d.is_verified || false,
        tags: d.tags || [],
        notes: d.notes || '',
        createdAt: d.created_at,
        updatedAt: d.updated_at,
        lastUsed: null,
      })))
      setError(null)
    } catch (err: any) {
      logger.error('Error loading emails', err)
      setError(err.message || 'Failed to load emails')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { fetchEmails() }, [fetchEmails])

  // ─── Add email ───────────────────────────────────────
  const addEmail = React.useCallback(async (emailData: Omit<EmailRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('email_database')
        .insert({
          email: emailData.email,
          first_name: emailData.firstName || '',
          last_name: emailData.lastName || '',
          source: emailData.source || 'manual',
          source_id: emailData.sourceId || '',
          source_details: emailData.sourceDetails || {},
          is_active: emailData.isActive !== false,
          is_verified: emailData.isVerified || false,
          tags: emailData.tags || [],
          notes: emailData.notes || '',
        })
        .select('id')
        .single()

      if (error) throw error
      await fetchEmails()
      return data.id
    } catch (err) {
      logger.error('Error adding email', err)
      throw err
    }
  }, [fetchEmails])

  // ─── Update email ────────────────────────────────────
  const updateEmail = React.useCallback(async (id: string, updates: Partial<EmailRecord>) => {
    try {
      const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() }
      if (updates.email !== undefined) dbUpdates.email = updates.email
      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName
      if (updates.source !== undefined) dbUpdates.source = updates.source
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive
      if (updates.isVerified !== undefined) dbUpdates.is_verified = updates.isVerified
      if (updates.tags !== undefined) dbUpdates.tags = updates.tags
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes
      if (updates.sourceDetails !== undefined) dbUpdates.source_details = updates.sourceDetails

      const { error } = await supabase
        .from('email_database')
        .update(dbUpdates)
        .eq('id', id)

      if (error) throw error
      await fetchEmails()
    } catch (err) {
      logger.error('Error updating email', err)
      throw err
    }
  }, [fetchEmails])

  // ─── Delete email ────────────────────────────────────
  const deleteEmail = React.useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_database')
        .delete()
        .eq('id', id)

      if (error) throw error
      await fetchEmails()
    } catch (err) {
      logger.error('Error deleting email', err)
      throw err
    }
  }, [fetchEmails])

  // ─── Import from Supabase students ────────────────────
  const importEmailsFromSource = React.useCallback(async (source: EmailSource) => {
    try {
      setLoading(true)
      let importedCount = 0
      const existingEmails = new Set(emails.map(e => e.email.toLowerCase()))

      if (source === 'registrations') {
        // Import from Supabase students table
        const { data: students } = await supabase
          .from('students')
          .select('id, first_name, last_name, email')
        
        const rows = (students || [])
          .filter(s => s.email && !existingEmails.has(s.email.toLowerCase()))
          .map(s => ({
            email: s.email!,
            first_name: s.first_name || '',
            last_name: s.last_name || '',
            source: 'registrations',
            source_id: s.id,
            source_details: {},
            is_active: true,
            is_verified: false,
            tags: ['student'],
          }))

        if (rows.length > 0) {
          const { error } = await supabase.from('email_database').insert(rows)
          if (error) throw error
          importedCount = rows.length
        }
      }

      if (source === 'staff') {
        // Import from Supabase profiles table
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')

        const rows = (profiles || [])
          .filter(p => p.email && !existingEmails.has(p.email.toLowerCase()))
          .map(p => ({
            email: p.email!,
            first_name: p.full_name?.split(' ')[0] || '',
            last_name: p.full_name?.split(' ').slice(1).join(' ') || '',
            source: 'staff',
            source_id: p.id,
            source_details: { role: p.role || '' },
            is_active: true,
            is_verified: false,
            tags: ['staff'],
          }))

        if (rows.length > 0) {
          const { error } = await supabase.from('email_database').insert(rows)
          if (error) throw error
          importedCount = rows.length
        }
      }

      await fetchEmails()
      setLoading(false)
      return importedCount
    } catch (err) {
      logger.error('Error importing emails', err)
      setLoading(false)
      throw err
    }
  }, [emails, fetchEmails])

  // ─── Import from CSV ─────────────────────────────────
  const importFromCSV = React.useCallback(async (csvContent: string, _filename: string) => {
    try {
      setLoading(true)
      let importedCount = 0
      const existingEmails = new Set(emails.map(e => e.email.toLowerCase()))

      const lines = csvContent.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

      const emailIndex = headers.findIndex(h => 
        h.toLowerCase().includes('email') || h.toLowerCase().includes('correo')
      )
      if (emailIndex === -1) throw new Error('No email column found in CSV')

      const firstNameIndex = headers.findIndex(h => 
        h.toLowerCase().includes('first') || h.toLowerCase().includes('nombre')
      )
      const lastNameIndex = headers.findIndex(h => 
        h.toLowerCase().includes('last') || h.toLowerCase().includes('apellido')
      )

      const rows: any[] = []
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''))
        const email = row[emailIndex]?.toLowerCase().trim()

        if (email && email.includes('@') && !existingEmails.has(email)) {
          rows.push({
            email: row[emailIndex],
            first_name: firstNameIndex !== -1 ? row[firstNameIndex] || '' : '',
            last_name: lastNameIndex !== -1 ? row[lastNameIndex] || '' : '',
            source: 'csv',
            source_id: _filename,
            source_details: { filename: _filename, row: i },
            is_active: true,
            is_verified: false,
            tags: ['csv-import'],
          })
          existingEmails.add(email)
          importedCount++
        }
      }

      if (rows.length > 0) {
        const { error } = await supabase.from('email_database').insert(rows)
        if (error) throw error
      }

      await fetchEmails()
      setLoading(false)
      return importedCount
    } catch (err) {
      logger.error('Error importing from CSV', err)
      setLoading(false)
      throw err
    }
  }, [emails, fetchEmails])

  // ─── Auto import all ─────────────────────────────────
  const autoImportAll = React.useCallback(async () => {
    try {
      setLoading(true)
      let totalImported = 0
      const regCount = await importEmailsFromSource('registrations')
      totalImported += regCount
      const staffCount = await importEmailsFromSource('staff')
      totalImported += staffCount
      setLoading(false)
      return totalImported
    } catch (err) {
      logger.error('Error in auto-import', err)
      setLoading(false)
      throw err
    }
  }, [importEmailsFromSource])

  // ─── Import from pasted emails ────────────────────────
  const importFromPastedEmails = React.useCallback(async (pastedText: string) => {
    try {
      setLoading(true)
      const emailList = pastedText
        .split(/[\n\r\t,;]+/)
        .map(e => e.trim())
        .filter(e => e && e.includes('@'))

      const existingEmails = new Set(emails.map(e => e.email.toLowerCase()))
      const rows: any[] = []

      for (const email of emailList) {
        const clean = email.toLowerCase().trim()
        if (clean && clean.includes('@') && !existingEmails.has(clean)) {
          rows.push({
            email,
            first_name: '',
            last_name: '',
            source: 'manual',
            source_id: 'pasted',
            source_details: { method: 'paste', timestamp: new Date().toISOString() },
            is_active: true,
            is_verified: false,
            tags: ['pasted'],
          })
          existingEmails.add(clean)
        }
      }

      if (rows.length > 0) {
        const { error } = await supabase.from('email_database').insert(rows)
        if (error) throw error
      }

      await fetchEmails()
      setLoading(false)
      return rows.length
    } catch (err) {
      logger.error('Error importing pasted emails', err)
      setLoading(false)
      throw err
    }
  }, [emails, fetchEmails])

  // ─── Import from Eventbrite ───────────────────────────
  const importFromEventbrite = React.useCallback(async (eventbriteEmails: string[]) => {
    try {
      setLoading(true)
      const existingEmails = new Set(emails.map(e => e.email.toLowerCase()))
      const rows: any[] = []

      for (const email of eventbriteEmails) {
        const clean = email.toLowerCase().trim()
        if (clean && clean.includes('@') && !existingEmails.has(clean)) {
          rows.push({
            email,
            first_name: '',
            last_name: '',
            source: 'eventbrite',
            source_id: 'eventbrite-import',
            source_details: { importDate: new Date().toISOString(), totalEmails: eventbriteEmails.length },
            is_active: true,
            is_verified: false,
            tags: ['eventbrite', 'event-attendee'],
          })
          existingEmails.add(clean)
        }
      }

      if (rows.length > 0) {
        const { error } = await supabase.from('email_database').insert(rows)
        if (error) throw error
      }

      await fetchEmails()
      setLoading(false)
      return rows.length
    } catch (err) {
      logger.error('Error importing from Eventbrite', err)
      setLoading(false)
      throw err
    }
  }, [emails, fetchEmails])

  // ─── Remove duplicates ────────────────────────────────
  const removeDuplicateEmails = React.useCallback(async () => {
    try {
      setLoading(true)
      // Group by lower email
      const emailGroups = new Map<string, EmailRecord[]>()
      emails.forEach(e => {
        const key = e.email.toLowerCase().trim()
        if (!emailGroups.has(key)) emailGroups.set(key, [])
        emailGroups.get(key)!.push(e)
      })

      const idsToRemove: string[] = []
      for (const [, group] of emailGroups) {
        if (group.length > 1) {
          // Keep first, remove rest
          for (let i = 1; i < group.length; i++) {
            idsToRemove.push(group[i].id)
          }
        }
      }

      if (idsToRemove.length > 0) {
        const { error } = await supabase
          .from('email_database')
          .delete()
          .in('id', idsToRemove)
        if (error) throw error
      }

      await fetchEmails()
      setLoading(false)
      return idsToRemove.length
    } catch (err) {
      logger.error('Error removing duplicates', err)
      setLoading(false)
      throw err
    }
  }, [emails, fetchEmails])

  // ─── Mark emails as bounced ───────────────────────────
  const markEmailsAsBounced = React.useCallback(async (emailList: string[]) => {
    try {
      setLoading(true)
      const normalizedList = emailList.map(e => e.trim().toLowerCase())
      let updatedCount = 0
      let notFoundCount = 0

      for (const emailAddr of normalizedList) {
        const match = emails.find(e => e.email.toLowerCase() === emailAddr)
        if (match) {
          await supabase
            .from('email_database')
            .update({
              is_active: false,
              notes: match.notes
                ? `${match.notes}\nBounced: ${new Date().toLocaleDateString()}`
                : `Bounced: ${new Date().toLocaleDateString()}`,
              updated_at: new Date().toISOString(),
            })
            .eq('id', match.id)
          updatedCount++
        } else {
          notFoundCount++
        }
      }

      await fetchEmails()
      setLoading(false)
      return { updatedCount, notFoundCount }
    } catch (err) {
      logger.error('Error marking emails as bounced', err)
      setLoading(false)
      throw err
    }
  }, [emails, fetchEmails])

  // ─── Export Eventbrite emails to CSV ──────────────────
  const exportEventbriteEmails = React.useCallback(() => {
    const eventbriteEmails = emails.filter(email =>
      email.source === 'eventbrite' || email.tags?.includes('eventbrite')
    )

    const csvContent = [
      ['Email', 'First Name', 'Last Name', 'Source', 'Tags', 'Active', 'Notes', 'Created Date'],
      ...eventbriteEmails.map(email => [
        email.email,
        email.firstName || '',
        email.lastName || '',
        email.source,
        email.tags?.join(', ') || '',
        email.isActive ? 'Yes' : 'No',
        email.notes || '',
        email.createdAt ? new Date(email.createdAt).toLocaleDateString() : ''
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eventbrite-emails-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [emails])

  // ─── Utility helpers ──────────────────────────────────
  const getUniqueEmails = React.useCallback(() => {
    const uniqueEmails = new Map<string, EmailRecord>()
    emails.forEach(email => {
      const key = email.email.toLowerCase()
      if (!uniqueEmails.has(key) || email.isActive) {
        uniqueEmails.set(key, email)
      }
    })
    return Array.from(uniqueEmails.values())
  }, [emails])

  const getEmailsBySource = React.useCallback((source: EmailSource) => {
    return emails.filter(email => email.source === source)
  }, [emails])

  const getEmailsByTag = React.useCallback((tag: string) => {
    return emails.filter(email => email.tags?.includes(tag))
  }, [emails])

  const searchEmails = React.useCallback((searchTerm: string) => {
    const term = searchTerm.toLowerCase()
    return emails.filter(email =>
      email.email.toLowerCase().includes(term) ||
      email.firstName?.toLowerCase().includes(term) ||
      email.lastName?.toLowerCase().includes(term)
    )
  }, [emails])

  // Legacy stub functions (Firebase-only imports no longer available)
  const importFromInvoices = React.useCallback(async () => 0, [])
  const importFromPayments = React.useCallback(async () => 0, [])
  const importFromTeachers = React.useCallback(async () => 0, [])
  const importFromSpringAcademy = React.useCallback(async () => 0, [])
  const importFromKDrama = React.useCallback(async () => 0, [])
  const importFromTripToKorea = React.useCallback(async () => 0, [])
  const importFromVolunteers = React.useCallback(async () => 0, [])
  const importFromSubscribers = React.useCallback(async () => 0, [])

  return {
    emails,
    loading,
    error,
    addEmail,
    updateEmail,
    deleteEmail,
    importEmailsFromSource,
    importFromCSV,
    autoImportAll,
    importFromPastedEmails,
    importFromInvoices,
    importFromPayments,
    importFromTeachers,
    importFromSpringAcademy,
    importFromKDrama,
    importFromTripToKorea,
    importFromVolunteers,
    importFromSubscribers,
    importFromEventbrite,
    removeDuplicateEmails,
    getUniqueEmails,
    getEmailsBySource,
    getEmailsByTag,
    searchEmails,
    exportEventbriteEmails,
    markEmailsAsBounced,
    refetch: fetchEmails,
  }
}
