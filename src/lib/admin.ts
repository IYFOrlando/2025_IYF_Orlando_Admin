// Centralized Admin Email List
export const ADMIN_EMAILS: string[] = [
  'orlando@iyfusa.org',
  'jodlouis.dev@gmail.com',
  'joddev.com@gmail.com',
  'michellemoralespradis@gmail.com',
  'admin@iyforlando.org',
  'director@iyforlando.org',
  ...(import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean)
]
