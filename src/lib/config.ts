import { COLLECTIONS_CONFIG } from '../config/shared.js'

export const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID as string;

// Use shared collections configuration
export const REG_COLLECTION = COLLECTIONS_CONFIG.fallAcademy;
export const INV_COLLECTION = COLLECTIONS_CONFIG.academyInvoices;
export const PAY_COLLECTION = COLLECTIONS_CONFIG.academyPayments;
export const ATTENDANCE_COLLECTION = COLLECTIONS_CONFIG.academyAttendance;
export const PROGRESS_COLLECTION = COLLECTIONS_CONFIG.academyProgress;
export const CLASSES_COLLECTION = COLLECTIONS_CONFIG.academyClasses;

// New collections from shared config
export const VOLUNTEER_APPLICATIONS_COLLECTION = COLLECTIONS_CONFIG.volunteerApplications;
export const EVENTS_COLLECTION = COLLECTIONS_CONFIG.events;
export const VOLUNTEER_HOURS_COLLECTION = COLLECTIONS_CONFIG.volunteerHours;
export const VOLUNTEER_SCHEDULE_COLLECTION = COLLECTIONS_CONFIG.volunteerSchedule;
export const VOLUNTEER_CODES_COLLECTION = COLLECTIONS_CONFIG.volunteerCodes;
export const SETTINGS_COLLECTION = COLLECTIONS_CONFIG.settings;

export const LUNCH_SEMESTER_CENTS = Number(import.meta.env.VITE_LUNCH_SEMESTER_CENTS || 4000);
export const LUNCH_SINGLE_CENTS = Number(import.meta.env.VITE_LUNCH_SINGLE_CENTS || 400);
