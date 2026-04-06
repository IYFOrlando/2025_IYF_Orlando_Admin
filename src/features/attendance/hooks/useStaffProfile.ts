// src/features/attendance/hooks/useStaffProfile.ts
import * as React from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../../../lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'

export type StaffProfile = {
  role: 'admin' | 'teacher'
  name?: string
  academies?: string[]
  koreanLevels?: string[]
}

export function useStaffProfile() {
  const [uid, setUid] = React.useState<string | null>(auth.currentUser?.uid || null)
  const [profile, setProfile] = React.useState<StaffProfile | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => setUid(u?.uid || null))
    return () => unsubAuth()
  }, [])

  React.useEffect(() => {
    if (!uid) { setProfile(null); setLoading(false); return }
    const ref = doc(db, 'staff', uid)
    const unsub = onSnapshot(ref, (snap) => {
      setProfile((snap.data() as StaffProfile) || null)
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [uid])

  return { uid, profile, loading }
}
