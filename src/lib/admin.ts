// Optional front-end allowlist for UI (real security is in Firestore rules)
export const ADMIN_EMAILS: string[] = [
  'orlando@iyfusa.org',
  'jodlouis.dev@gmail.com',
  ...(import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)
]
