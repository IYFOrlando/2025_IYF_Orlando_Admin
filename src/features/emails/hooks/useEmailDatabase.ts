import * as React from 'react'
import { 
  collection, onSnapshot, query, orderBy, 
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
  getDocs, writeBatch
} from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { logger } from '../../../lib/logger'
import { isFirebasePermissionError } from '../../../lib/errors'
import type { EmailRecord, EmailSource } from '../types'

export function useEmailDatabase() {
  const [emails, setEmails] = React.useState<EmailRecord[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Load emails from database
  React.useEffect(() => {
    const emailsRef = collection(db, 'email_database')
    const q = query(emailsRef, orderBy('email'))
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const emailsData: EmailRecord[] = []
        
        snapshot.forEach((doc) => {
          const data = doc.data()
          emailsData.push({
            id: doc.id,
            email: data.email || '',
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            source: data.source || 'manual',
            sourceId: data.sourceId || '',
            sourceDetails: data.sourceDetails || {},
            isActive: data.isActive !== false,
            isVerified: data.isVerified || false,
            tags: data.tags || [],
            notes: data.notes || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            lastUsed: data.lastUsed
          })
        })
        
        setEmails(emailsData)
        setLoading(false)
        setError(null)
      },
      (err) => {
        // Handle permissions error gracefully
        if (isFirebasePermissionError(err)) {
          setEmails([])
          setError(null)
          setLoading(false)
          return
        }
        
        logger.error('Error loading emails', err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  // Add email to database
  const addEmail = React.useCallback(async (emailData: Omit<EmailRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const docRef = await addDoc(collection(db, 'email_database'), {
        ...emailData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      return docRef.id
    } catch (err) {
      logger.error('Error adding email', err)
      throw err
    }
  }, [])

  // Update email
  const updateEmail = React.useCallback(async (id: string, updates: Partial<EmailRecord>) => {
    try {
      const docRef = doc(db, 'email_database', id)
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
    } catch (err) {
      logger.error('Error updating email', err)
      throw err
    }
  }, [])

  // Delete email
  const deleteEmail = React.useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'email_database', id))
    } catch (err) {
      logger.error('Error deleting email', err)
      throw err
    }
  }, [])

  // Bulk import emails from other collections
  const importEmailsFromSource = React.useCallback(async (source: EmailSource) => {
    try {
      setLoading(true)
      const batch = writeBatch(db)
      let importedCount = 0

      // Get existing emails to avoid duplicates from database
      const existingEmailsRef = collection(db, 'email_database')
      const existingEmailsSnapshot = await getDocs(existingEmailsRef)
      const existingEmails = new Set(existingEmailsSnapshot.docs.map(doc => doc.data().email.toLowerCase()))

      if (source === 'registrations') {
        const regsRef = collection(db, 'registrations')
        const regsSnapshot = await getDocs(regsRef)
        
        regsSnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data()
          const email = data.email?.toLowerCase().trim()
          
          if (email && !existingEmails.has(email)) {
            const emailRef = doc(collection(db, 'email_database'))
            batch.set(emailRef, {
              email: data.email,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              source: 'registrations',
              sourceId: docSnapshot.id,
            sourceDetails: {
              academy: data.firstPeriod?.academy || data.secondPeriod?.academy || '',
              level: data.firstPeriod?.level || data.secondPeriod?.level || '',
              city: data.city || '',
              state: data.state || ''
            },
              isActive: true,
              isVerified: false,
              tags: ['student'],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })
            existingEmails.add(email)
            importedCount++
          }
        })
      }


      if (source === 'staff') {
        const staffRef = collection(db, 'staff_profiles')
        const staffSnapshot = await getDocs(staffRef)
        
        staffSnapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data()
          const email = data.email?.toLowerCase().trim()
          
          if (email && !existingEmails.has(email)) {
            const emailRef = doc(collection(db, 'email_database'))
            batch.set(emailRef, {
              email: data.email,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              source: 'staff',
              sourceId: docSnapshot.id,
            sourceDetails: {
              role: data.role || '',
              academies: data.academies || []
            },
              isActive: true,
              isVerified: false,
              tags: ['staff'],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })
            existingEmails.add(email)
            importedCount++
          }
        })
      }


      await batch.commit()
      setLoading(false)
      return importedCount
    } catch (err) {
      logger.error('Error importing emails', err)
      setLoading(false)
      throw err
    }
  }, [])

  // Get unique emails (remove duplicates)
  const getUniqueEmails = React.useCallback(() => {
    const uniqueEmails = new Map<string, EmailRecord>()
    
    emails.forEach(email => {
      const key = email.email.toLowerCase()
      if (!uniqueEmails.has(key) || email.isActive) {
        uniqueEmails.set(key, email)
      }
    })
    
    return Array.from(uniqueEmails.values())
  }, [])

  // Get emails by source
  const getEmailsBySource = React.useCallback((source: EmailSource) => {
    return emails.filter(email => email.source === source)
  }, [])

  // Get emails by tag
  const getEmailsByTag = React.useCallback((tag: string) => {
    return emails.filter(email => email.tags?.includes(tag))
  }, [])

  // Search emails
  const searchEmails = React.useCallback((searchTerm: string) => {
    const term = searchTerm.toLowerCase()
    return emails.filter(email => 
      email.email.toLowerCase().includes(term) ||
      email.firstName?.toLowerCase().includes(term) ||
      email.lastName?.toLowerCase().includes(term)
    )
  }, [])

  // Import from CSV file
  const importFromCSV = React.useCallback(async (csvContent: string, filename: string) => {
    try {
      setLoading(true)
      const batch = writeBatch(db)
      let importedCount = 0

      // Parse CSV content
      const lines = csvContent.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      
      // Find email column index
      const emailIndex = headers.findIndex(h => 
        h.toLowerCase().includes('email') || h.toLowerCase().includes('correo')
      )
      
      if (emailIndex === -1) {
        throw new Error('No email column found in CSV')
      }

      // Get existing emails to avoid duplicates from database
      const existingEmailsRef = collection(db, 'email_database')
      const existingEmailsSnapshot = await getDocs(existingEmailsRef)
      const existingEmails = new Set(existingEmailsSnapshot.docs.map(doc => doc.data().email.toLowerCase()))

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''))
        const email = row[emailIndex]?.toLowerCase().trim()
        
        if (email && email.includes('@') && !existingEmails.has(email)) {
          const emailRef = doc(collection(db, 'email_database'))
          
          // Try to find name columns
          const firstNameIndex = headers.findIndex(h => 
            h.toLowerCase().includes('first') || h.toLowerCase().includes('nombre')
          )
          const lastNameIndex = headers.findIndex(h => 
            h.toLowerCase().includes('last') || h.toLowerCase().includes('apellido')
          )
          
          batch.set(emailRef, {
            email: row[emailIndex],
            firstName: firstNameIndex !== -1 ? row[firstNameIndex] || '' : '',
            lastName: lastNameIndex !== -1 ? row[lastNameIndex] || '' : '',
            source: 'csv',
            sourceId: filename,
            sourceDetails: {
              filename: filename,
              row: i
            },
            isActive: true,
            isVerified: false,
            tags: ['csv-import'],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          existingEmails.add(email)
          importedCount++
        }
      }

      await batch.commit()
      setLoading(false)
      return importedCount
    } catch (err) {
      logger.error('Error importing from CSV', err)
      setLoading(false)
      throw err
    }
  }, [])

  // Auto-import all available sources
  const autoImportAll = React.useCallback(async () => {
    try {
      setLoading(true)
      let totalImported = 0
      
      // Import from registrations
      const regCount = await importEmailsFromSource('registrations')
      totalImported += regCount
      
      // Import from staff
      const staffCount = await importEmailsFromSource('staff')
      totalImported += staffCount
      
      // Import from teachers
      const teacherCount = await importFromTeachers()
      totalImported += teacherCount
      
      // Import from payments
      const paymentCount = await importFromPayments()
      totalImported += paymentCount
      
      // Import from spring_academy_2025
      const springCount = await importFromSpringAcademy()
      totalImported += springCount
      
      // Import from k_drama_with_friends_registration
      const kdramaCount = await importFromKDrama()
      totalImported += kdramaCount
      
      // Import from trip_to_korea_registration
      const tripCount = await importFromTripToKorea()
      totalImported += tripCount
      
      // Import from volunteer_applications
      const volunteerCount = await importFromVolunteers()
      totalImported += volunteerCount
      
      // Import from subscribers
      const subscriberCount = await importFromSubscribers()
      totalImported += subscriberCount
      
      setLoading(false)
      return totalImported
    } catch (err) {
      logger.error('Error in auto-import', err)
      setLoading(false)
      throw err
    }
  }, [importEmailsFromSource])

  // Import from academy_invoices
  const importFromInvoices = React.useCallback(async () => {
    try {
      const batch = writeBatch(db)
      let importedCount = 0

      // Get existing emails to avoid duplicates from database
      const existingEmailsRef = collection(db, 'email_database')
      const existingEmailsSnapshot = await getDocs(existingEmailsRef)
      const existingEmails = new Set(existingEmailsSnapshot.docs.map(doc => doc.data().email.toLowerCase()))

      const invoicesRef = collection(db, 'academy_invoices')
      const invoicesSnapshot = await getDocs(invoicesRef)
      
      invoicesSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        const email = data.studentEmail?.toLowerCase().trim()
        
        if (email && !existingEmails.has(email)) {
          const emailRef = doc(collection(db, 'email_database'))
          batch.set(emailRef, {
            email: data.studentEmail,
            firstName: data.studentName?.split(' ')[0] || '',
            lastName: data.studentName?.split(' ').slice(1).join(' ') || '',
            source: 'registrations',
            sourceId: docSnapshot.id,
            sourceDetails: {
              type: 'invoice',
              amount: data.total || 0,
              status: data.status || ''
            },
            isActive: true,
            isVerified: false,
            tags: ['student', 'invoice'],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          existingEmails.add(email)
          importedCount++
        }
      })

      await batch.commit()
      return importedCount
    } catch (err) {
      logger.error('Error importing from invoices', err)
      throw err
    }
  }, [])

  // Import from payments
  const importFromPayments = React.useCallback(async () => {
    try {
      const batch = writeBatch(db)
      let importedCount = 0

      // Get existing emails to avoid duplicates from database
      const existingEmailsRef = collection(db, 'email_database')
      const existingEmailsSnapshot = await getDocs(existingEmailsRef)
      const existingEmails = new Set(existingEmailsSnapshot.docs.map(doc => doc.data().email.toLowerCase()))

      const paymentsRef = collection(db, 'payments')
      const paymentsSnapshot = await getDocs(paymentsRef)
      
      paymentsSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        const email = data.email?.toLowerCase().trim()
        
        if (email && !existingEmails.has(email)) {
          const emailRef = doc(collection(db, 'email_database'))
          batch.set(emailRef, {
            email: data.email,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            source: 'registrations',
            sourceId: docSnapshot.id,
            sourceDetails: {
              type: 'payment',
              amount: data.amount || 0,
              method: data.method || ''
            },
            isActive: true,
            isVerified: false,
            tags: ['student', 'payment'],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          existingEmails.add(email)
          importedCount++
        }
      })

      await batch.commit()
      return importedCount
    } catch (err) {
      logger.error('Error importing from payments', err)
      throw err
    }
  }, [])

  // Import from teachers
  const importFromTeachers = React.useCallback(async () => {
    try {
      const batch = writeBatch(db)
      let importedCount = 0

      // Get existing emails to avoid duplicates from database
      const existingEmailsRef = collection(db, 'email_database')
      const existingEmailsSnapshot = await getDocs(existingEmailsRef)
      const existingEmails = new Set(existingEmailsSnapshot.docs.map(doc => doc.data().email.toLowerCase()))

      const teachersRef = collection(db, 'teachers')
      const teachersSnapshot = await getDocs(teachersRef)
      
      teachersSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        const email = data.email?.toLowerCase().trim()
        
        if (email && !existingEmails.has(email)) {
          const emailRef = doc(collection(db, 'email_database'))
          batch.set(emailRef, {
            email: data.email,
            firstName: data.name?.split(' ')[0] || '',
            lastName: data.name?.split(' ').slice(1).join(' ') || '',
            source: 'staff',
            sourceId: docSnapshot.id,
            sourceDetails: {
              academy: data.academy || '',
              level: data.level || '',
              credentials: data.credentials || ''
            },
            isActive: true,
            isVerified: false,
            tags: ['teacher'],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          existingEmails.add(email)
          importedCount++
        }
      })

      await batch.commit()
      return importedCount
    } catch (err) {
      logger.error('Error importing from teachers', err)
      throw err
    }
  }, [])

  // Import from spring_academy_2025
  const importFromSpringAcademy = React.useCallback(async () => {
    try {
      const batch = writeBatch(db)
      let importedCount = 0

      const existingEmails = new Set(emails.map(e => e.email.toLowerCase()))

      const springRef = collection(db, 'spring_academy_2025')
      const springSnapshot = await getDocs(springRef)
      
      springSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        const email = data.email?.toLowerCase().trim()
        
        if (email && !existingEmails.has(email)) {
          const emailRef = doc(collection(db, 'email_database'))
          batch.set(emailRef, {
            email: data.email,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            source: 'registrations',
            sourceId: docSnapshot.id,
            sourceDetails: { type: 'spring_academy_2025' },
            isActive: true,
            isVerified: false,
            tags: ['student', 'spring_academy'],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          existingEmails.add(email)
          importedCount++
        }
      })

      await batch.commit()
      return importedCount
    } catch (err) {
      logger.error('Error importing from spring academy', err)
      throw err
    }
  }, [])

  // Import from k_drama_with_friends_registration
  const importFromKDrama = React.useCallback(async () => {
    try {
      const batch = writeBatch(db)
      let importedCount = 0

      const existingEmails = new Set(emails.map(e => e.email.toLowerCase()))

      const kdramaRef = collection(db, 'k_drama_with_friends_registration')
      const kdramaSnapshot = await getDocs(kdramaRef)
      
      kdramaSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        const email = data.email?.toLowerCase().trim()
        
        if (email && !existingEmails.has(email)) {
          const emailRef = doc(collection(db, 'email_database'))
          batch.set(emailRef, {
            email: data.email,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            source: 'registrations',
            sourceId: docSnapshot.id,
            sourceDetails: { type: 'k_drama_with_friends' },
            isActive: true,
            isVerified: false,
            tags: ['student', 'k_drama'],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          existingEmails.add(email)
          importedCount++
        }
      })

      await batch.commit()
      return importedCount
    } catch (err) {
      logger.error('Error importing from k drama', err)
      throw err
    }
  }, [])

  // Import from trip_to_korea_registration
  const importFromTripToKorea = React.useCallback(async () => {
    try {
      const batch = writeBatch(db)
      let importedCount = 0

      const existingEmails = new Set(emails.map(e => e.email.toLowerCase()))

      const tripRef = collection(db, 'trip_to_korea_registration')
      const tripSnapshot = await getDocs(tripRef)
      
      tripSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        const email = data.email?.toLowerCase().trim()
        
        if (email && !existingEmails.has(email)) {
          const emailRef = doc(collection(db, 'email_database'))
          batch.set(emailRef, {
            email: data.email,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            source: 'registrations',
            sourceId: docSnapshot.id,
            sourceDetails: { type: 'trip_to_korea' },
            isActive: true,
            isVerified: false,
            tags: ['student', 'trip_to_korea'],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          existingEmails.add(email)
          importedCount++
        }
      })

      await batch.commit()
      return importedCount
    } catch (err) {
      logger.error('Error importing from trip to korea', err)
      throw err
    }
  }, [])

  // Import from volunteer_applications
  const importFromVolunteers = React.useCallback(async () => {
    try {
      const batch = writeBatch(db)
      let importedCount = 0

      const existingEmails = new Set(emails.map(e => e.email.toLowerCase()))

      const volunteerRef = collection(db, 'volunteer_applications')
      const volunteerSnapshot = await getDocs(volunteerRef)
      
      volunteerSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        const email = data.email?.toLowerCase().trim()
        
        if (email && !existingEmails.has(email)) {
          const emailRef = doc(collection(db, 'email_database'))
          batch.set(emailRef, {
            email: data.email,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            source: 'staff',
            sourceId: docSnapshot.id,
            sourceDetails: { type: 'volunteer_application' },
            isActive: true,
            isVerified: false,
            tags: ['volunteer'],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          existingEmails.add(email)
          importedCount++
        }
      })

      await batch.commit()
      return importedCount
    } catch (err) {
      logger.error('Error importing from volunteers', err)
      throw err
    }
  }, [])

  // Import from subscribers
  const importFromSubscribers = React.useCallback(async () => {
    try {
      const batch = writeBatch(db)
      let importedCount = 0

      const existingEmails = new Set(emails.map(e => e.email.toLowerCase()))

      const subscriberRef = collection(db, 'subscribers')
      const subscriberSnapshot = await getDocs(subscriberRef)
      
      subscriberSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        const email = data.email?.toLowerCase().trim()
        
        if (email && !existingEmails.has(email)) {
          const emailRef = doc(collection(db, 'email_database'))
          batch.set(emailRef, {
            email: data.email,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            source: 'manual',
            sourceId: docSnapshot.id,
            sourceDetails: { type: 'subscriber' },
            isActive: true,
            isVerified: false,
            tags: ['subscriber'],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          existingEmails.add(email)
          importedCount++
        }
      })

      await batch.commit()
      return importedCount
    } catch (err) {
      logger.error('Error importing from subscribers', err)
      throw err
    }
  }, [])

  // Import from Eventbrite
  const importFromEventbrite = React.useCallback(async (eventbriteEmails: string[]) => {
    try {
      setLoading(true)
      const batch = writeBatch(db)
      let importedCount = 0

      // Get existing emails from both email_database and eventbrite_emails collections
      const existingEmailsRef = collection(db, 'email_database')
      const existingEmailsSnapshot = await getDocs(existingEmailsRef)
      const existingEmails = new Set(existingEmailsSnapshot.docs.map(doc => doc.data().email.toLowerCase()))

      const eventbriteEmailsRef = collection(db, 'eventbrite_emails')
      const eventbriteEmailsSnapshot = await getDocs(eventbriteEmailsRef)
      const existingEventbriteEmails = new Set(eventbriteEmailsSnapshot.docs.map(doc => doc.data().email.toLowerCase()))

      // Process each email
      for (const email of eventbriteEmails) {
        const cleanEmail = email.toLowerCase().trim()
        
        if (cleanEmail && cleanEmail.includes('@') && !existingEmails.has(cleanEmail) && !existingEventbriteEmails.has(cleanEmail)) {
          // Save to eventbrite_emails collection
          const eventbriteEmailRef = doc(collection(db, 'eventbrite_emails'))
          batch.set(eventbriteEmailRef, {
            email: email,
            firstName: '',
            lastName: '',
            source: 'eventbrite',
            sourceId: 'eventbrite-import',
            sourceDetails: {
              importDate: new Date().toISOString(),
              totalEmails: eventbriteEmails.length
            },
            isActive: true,
            isVerified: false,
            tags: ['eventbrite', 'event-attendee'],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })

          // Also save to email_database for unified management
          const emailRef = doc(collection(db, 'email_database'))
          batch.set(emailRef, {
            email: email,
            firstName: '',
            lastName: '',
            source: 'eventbrite',
            sourceId: 'eventbrite-import',
            sourceDetails: {
              importDate: new Date().toISOString(),
              totalEmails: eventbriteEmails.length
            },
            isActive: true,
            isVerified: false,
            tags: ['eventbrite', 'event-attendee'],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })

          existingEmails.add(cleanEmail)
          existingEventbriteEmails.add(cleanEmail)
          importedCount++
        }
      }

      await batch.commit()
      setLoading(false)
      return importedCount
    } catch (err) {
      logger.error('Error importing from Eventbrite', err)
      setLoading(false)
      throw err
    }
  }, [])

  // Remove duplicate emails
  const removeDuplicateEmails = React.useCallback(async () => {
    try {
      setLoading(true)
      const batch = writeBatch(db)
      let removedCount = 0

      // Get all emails from database
      const emailsRef = collection(db, 'email_database')
      const emailsSnapshot = await getDocs(emailsRef)
      
      // Group emails by email address (case insensitive)
      const emailGroups = new Map<string, any[]>()
      
      emailsSnapshot.forEach((doc) => {
        const data = doc.data()
        const emailKey = data.email.toLowerCase().trim()
        
        if (!emailGroups.has(emailKey)) {
          emailGroups.set(emailKey, [])
        }
        emailGroups.get(emailKey)!.push({ id: doc.id, data })
      })

      // Remove duplicates, keeping the first occurrence
      for (const [, docs] of emailGroups) {
        if (docs.length > 1) {
          // Keep the first one, remove the rest
          for (let i = 1; i < docs.length; i++) {
            const docRef = doc(collection(db, 'email_database'), docs[i].id)
            batch.delete(docRef)
            removedCount++
          }
        }
      }

      await batch.commit()
      setLoading(false)
      return removedCount
    } catch (err) {
      logger.error('Error removing duplicates', err)
      setLoading(false)
      throw err
    }
  }, [])

  // Import from pasted emails
  const importFromPastedEmails = React.useCallback(async (pastedText: string) => {
    try {
      setLoading(true)
      const batch = writeBatch(db)
      let importedCount = 0

      // Parse pasted text - handle various separators
      const emails = pastedText
        .split(/[\n\r\t,;]+/) // Split by newlines, tabs, commas, semicolons
        .map(email => email.trim())
        .filter(email => email && email.includes('@'))

      // Get existing emails to avoid duplicates from database
      const existingEmailsRef = collection(db, 'email_database')
      const existingEmailsSnapshot = await getDocs(existingEmailsRef)
      const existingEmails = new Set(existingEmailsSnapshot.docs.map(doc => doc.data().email.toLowerCase()))

      // Process each email
      for (const email of emails) {
        const cleanEmail = email.toLowerCase().trim()
        
        if (cleanEmail && cleanEmail.includes('@') && !existingEmails.has(cleanEmail)) {
          const emailRef = doc(collection(db, 'email_database'))
          
          batch.set(emailRef, {
            email: email,
            firstName: '',
            lastName: '',
            source: 'manual',
            sourceId: 'pasted',
            sourceDetails: {
              method: 'paste',
              timestamp: new Date().toISOString()
            },
            isActive: true,
            isVerified: false,
            tags: ['pasted'],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          })
          existingEmails.add(cleanEmail)
          importedCount++
        }
      }

      await batch.commit()
      setLoading(false)
      return importedCount
    } catch (err) {
      logger.error('Error importing pasted emails', err)
      setLoading(false)
      throw err
    }
  }, [])

  // Export Eventbrite emails to CSV
  const exportEventbriteEmails = React.useCallback(() => {
    const eventbriteEmails = emails.filter(email => 
      email.source === 'eventbrite' || 
      email.tags?.includes('eventbrite')
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
        email.createdAt ? new Date(email.createdAt.seconds * 1000).toLocaleDateString() : ''
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

  // Mark emails as bounced (inactive)
  const markEmailsAsBounced = React.useCallback(async (emailList: string[]) => {
    try {
      setLoading(true)
      const batch = writeBatch(db)
      let updatedCount = 0
      let notFoundCount = 0

      // Normalize the email list to lowercase for comparison
      const normalizedEmailList = emailList.map(email => email.trim().toLowerCase())

      // Get all emails from database
      const emailsRef = collection(db, 'email_database')
      const emailsSnapshot = await getDocs(emailsRef)
      
      // Create a map of normalized emails to document IDs
      const emailMap = new Map<string, string>()
      emailsSnapshot.forEach((doc) => {
        const data = doc.data()
        const emailKey = data.email.toLowerCase().trim()
        emailMap.set(emailKey, doc.id)
      })

      // Mark each email as bounced
      for (const email of normalizedEmailList) {
        const docId = emailMap.get(email)
        if (docId) {
          const docRef = doc(collection(db, 'email_database'), docId)
          const currentDoc = emailsSnapshot.docs.find(d => d.id === docId)
          const currentData = currentDoc?.data()
          
          batch.update(docRef, {
            isActive: false,
            notes: currentData?.notes 
              ? `${currentData.notes}\nBounced: ${new Date().toLocaleDateString()}`
              : `Bounced: ${new Date().toLocaleDateString()}`,
            updatedAt: serverTimestamp()
          })
          updatedCount++
        } else {
          notFoundCount++
        }
      }

      await batch.commit()
      setLoading(false)
      return { updatedCount, notFoundCount }
    } catch (err) {
      logger.error('Error marking emails as bounced', err)
      setLoading(false)
      throw err
    }
  }, [])

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
    markEmailsAsBounced
  }
}
