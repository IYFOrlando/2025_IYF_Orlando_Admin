// Type declarations for shared.js

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
  measurementId: string
}

export interface RecaptchaConfig {
  siteKey: string
}

export interface ContactConfig {
  email: string
  phone: string
  address: string
  website: string
}

export interface CollectionsConfig {
  fallAcademy: string
  volunteerApplications: string
  tripToKorea: string
  cookingClass: string
  kdrama: string
  newsletter: string
  contact: string
  events: string
  volunteerHours: string
  volunteerSchedule: string
  volunteerCodes: string
  volunteerCommitments: string
  academyInvoices: string
  academyPayments: string
  academyAttendance: string
  academyProgress: string
  academyClasses: string
  academyPricing: string
  academies2026Spring: string
  springAcademy2026: string
  settings: string
  teacherNotifications: string
  teacherActivityLog: string
  teachersIndex: string
}

export interface ApiEndpoints {
  registrations: string
  volunteers: string
  analytics: string
}

export interface ApiConfig {
  baseUrl: string
  endpoints: ApiEndpoints
}

export interface EnvironmentConfig {
  isDevelopment: boolean
  isProduction: boolean
}

export interface SharedConfig {
  firebase: FirebaseConfig
  recaptcha: RecaptchaConfig
  dashboardUrl: string
  contact: ContactConfig
  collections: CollectionsConfig
  api: ApiConfig
  environment: EnvironmentConfig
}

export declare const SHARED_CONFIG: SharedConfig
export declare const FIREBASE_CONFIG: FirebaseConfig
export declare const RECAPTCHA_CONFIG: RecaptchaConfig
export declare const CONTACT_CONFIG: ContactConfig
export declare const COLLECTIONS_CONFIG: CollectionsConfig
export declare const API_CONFIG: ApiConfig
export declare const ENV_CONFIG: EnvironmentConfig
