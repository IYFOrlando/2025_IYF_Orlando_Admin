import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { db } from './firebase'
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
