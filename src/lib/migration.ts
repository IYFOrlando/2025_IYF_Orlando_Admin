import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from './firebase'
import { supabase } from './supabase'
import { Alert as SAlert } from './alerts'

export async function migrateKoreanToKoreanLanguage() {
  try {
    // Show confirmation dialog
    const result = await SAlert.fire({
      title: 'Migrate Korean to Korean Language?',
      text: 'This will update all registrations that have "Korean" to "Korean Language". This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, migrate',
      cancelButtonText: 'Cancel'
    })

    if (!result.isConfirmed) {
      return
    }

    // Get all registrations
    const registrationsRef = collection(db, 'fall_academy_2025')
    const snapshot = await getDocs(registrationsRef)
    
    let updatedCount = 0
    const batch = []

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data()
      let needsUpdate = false
      const updates: any = {}

      // Check first period
      if (data.firstPeriod?.academy === 'Korean') {
        updates['firstPeriod.academy'] = 'Korean Language'
        needsUpdate = true
      }

      // Check second period
      if (data.secondPeriod?.academy === 'Korean') {
        updates['secondPeriod.academy'] = 'Korean Language'
        needsUpdate = true
      }

      if (needsUpdate) {
        batch.push(updateDoc(doc(db, 'fall_academy_2025', docSnapshot.id), updates))
        updatedCount++
      }
    }

    // Execute all updates
    if (batch.length > 0) {
      await Promise.all(batch)
      
      SAlert.fire({
        title: 'Migration Complete!',
        text: `Successfully updated ${updatedCount} registrations from "Korean" to "Korean Language".`,
        icon: 'success'
      })
    } else {
      SAlert.fire({
        title: 'No Changes Needed',
        text: 'No registrations found with "Korean" that need to be updated.',
        icon: 'info'
      })
    }

  } catch (error: any) {
    SAlert.fire({
      title: 'Migration Failed',
      text: error?.message || 'An error occurred during migration.',
      icon: 'error'
    })
  }
}

/**
 * Migrate email_database collection from Firebase to Supabase.
 * Reads all docs from Firebase 'email_database' and inserts them into
 * the Supabase 'email_database' table, skipping duplicates.
 */
export async function migrateEmailDatabaseToSupabase() {
  try {
    const result = await SAlert.fire({
      title: 'Migrate Emails from Firebase?',
      text: 'This will read ALL emails from Firebase email_database and import them into Supabase. Duplicates will be skipped.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, migrate',
      cancelButtonText: 'Cancel',
    })

    if (!result.isConfirmed) return

    SAlert.fire({ title: 'Reading from Firebase...', text: 'Please wait...', allowOutsideClick: false, didOpen: () => SAlert.showLoading() })

    // 1. Read all emails from Firebase
    const emailRef = collection(db, 'email_database')
    const snapshot = await getDocs(emailRef)

    if (snapshot.empty) {
      SAlert.fire({ title: 'No Emails Found', text: 'The Firebase email_database collection is empty.', icon: 'info' })
      return
    }

    const firebaseEmails = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
    console.log(`[Migration] Found ${firebaseEmails.length} emails in Firebase`)

    // 2. Get existing emails in Supabase to skip duplicates
    const { data: existing } = await supabase.from('email_database').select('email')
    const existingSet = new Set((existing || []).map((e: any) => e.email?.toLowerCase?.()))

    // 3. Build rows for Supabase
    const rows: any[] = []
    let skipped = 0

    for (const fe of firebaseEmails) {
      const email = (fe as any).email?.trim()
      if (!email || existingSet.has(email.toLowerCase())) {
        skipped++
        continue
      }

      rows.push({
        email,
        first_name: (fe as any).firstName || (fe as any).first_name || '',
        last_name: (fe as any).lastName || (fe as any).last_name || '',
        source: (fe as any).source || 'firebase',
        source_id: (fe as any).sourceId || (fe as any).source_id || fe.id || '',
        source_details: (fe as any).sourceDetails || (fe as any).source_details || {},
        is_active: (fe as any).isActive !== false && (fe as any).is_active !== false,
        is_verified: (fe as any).isVerified || (fe as any).is_verified || false,
        tags: (fe as any).tags || [],
        notes: (fe as any).notes || '',
      })

      existingSet.add(email.toLowerCase())
    }

    console.log(`[Migration] Inserting ${rows.length} new emails (${skipped} skipped as duplicates)`)

    // 4. Insert in batches of 500
    let inserted = 0
    const batchSize = 500

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize)
      const { error } = await supabase.from('email_database').insert(batch)
      if (error) {
        console.error(`[Migration] Batch error at ${i}:`, error)
        // Try one-by-one for this batch to skip individual conflicts
        for (const row of batch) {
          const { error: singleErr } = await supabase.from('email_database').insert(row)
          if (!singleErr) inserted++
        }
      } else {
        inserted += batch.length
      }
    }

    SAlert.fire({
      title: 'Migration Complete!',
      html: `
        <p><strong>${firebaseEmails.length}</strong> emails found in Firebase</p>
        <p><strong>${inserted}</strong> new emails imported to Supabase</p>
        <p><strong>${skipped}</strong> duplicates skipped</p>
      `,
      icon: 'success',
    })
  } catch (error: any) {
    console.error('[Migration] Error:', error)
    SAlert.fire({
      title: 'Migration Failed',
      text: error?.message || 'An error occurred during email migration.',
      icon: 'error',
    })
  }
}
