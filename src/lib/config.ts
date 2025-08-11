export const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID as string;

export const REG_COLLECTION = (import.meta.env.VITE_REG_COLLECTION as string) || 'fall_academy_2025';
export const INV_COLLECTION = (import.meta.env.VITE_INV_COLLECTION as string) || 'academy_invoices';
export const PAY_COLLECTION = (import.meta.env.VITE_PAY_COLLECTION as string) || 'academy_payments';
export const ATTENDANCE_COLLECTION = (import.meta.env.VITE_ATTENDANCE_COLLECTION as string) || 'academy_attendance';
export const PROGRESS_COLLECTION = (import.meta.env.VITE_PROGRESS_COLLECTION as string) || 'academy_progress';
export const CLASSES_COLLECTION = (import.meta.env.VITE_CLASSES_COLLECTION as string) || 'academy_classes';

export const LUNCH_SEMESTER_CENTS = Number(import.meta.env.VITE_LUNCH_SEMESTER_CENTS || 4000);
export const LUNCH_SINGLE_CENTS = Number(import.meta.env.VITE_LUNCH_SINGLE_CENTS || 400);
