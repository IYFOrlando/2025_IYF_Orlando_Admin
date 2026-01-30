import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'

import { AuthProvider } from '../context/AuthContext'
import { TeacherProvider } from '../features/auth/context/TeacherContext'
import AppLayout from './layout/AppLayout'
import AuthGate from './layout/auth/AuthGate'
import theme from '../theme'

// Pages
import DashboardPage from '../features/dashboard/pages/DashboardPage'
import RegistrationsList from '../features/registrations/pages/RegistrationsList'
import PaymentsPage from '../features/payments/pages/PaymentsPage'
import ReportsPage from '../features/reports/pages/ReportsPage'
import PaymentsReportPage from '../features/reports/pages/PaymentsReportPage'
import RegistrationsReportPage from '../features/reports/pages/RegistrationsReportPage'
import InvalidAcademiesReportPage from '../features/reports/pages/InvalidAcademiesReportPage'
import AttendancePage from '../features/attendance/pages/AttendancePage'
import ProgressPage from '../features/progress/pages/ProgressPage'
import AcademiesPage from '../features/academies/pages/AcademiesPage'
import AcademiesManagementPage from '../features/academies/pages/AcademiesManagementPage'
import VolunteersPage from '../features/volunteers/pages/VolunteersPage'
import CheckInPage from '../features/volunteers/pages/CheckInPage'
import PublicVolunteerSchedulePage from '../features/volunteers/pages/PublicVolunteerSchedulePage'
import EmailDatabasePage from '../features/emails/pages/EmailDatabasePage'
import VolunteerRegistrationPage from '../features/volunteers/pages/VolunteerRegistrationPage'
import InvoiceDebugPage from '../pages/InvoiceDebugPage'
import TeachersManagementPage from '../features/teacher/pages/TeachersManagementPage'
import TeacherPlannerPage from '../features/teacher/pages/TeacherPlannerPage'
import ActivityLogPage from '../features/dashboard/pages/ActivityLogPage'
import AnalyticsPage from '../features/analytics/pages/AnalyticsPage'

// Global styles only (no DataGrid CSS file needed in v8)
import '../index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AuthGate>
        <AppLayout />
      </AuthGate>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },

      { path: 'registrations', element: <RegistrationsList /> },
      { path: 'payments', element: <PaymentsPage /> },

      // Reports
      { path: 'reports', element: <ReportsPage /> },
      { path: 'reports/payments', element: <PaymentsReportPage /> },
      { path: 'reports/registrations', element: <RegistrationsReportPage /> },
      { path: 'reports/invalid-academies', element: <InvalidAcademiesReportPage /> },

      { path: 'attendance', element: <AttendancePage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'classes', element: <AcademiesPage /> },
      { path: 'academies-management', element: <AcademiesManagementPage /> },
      { path: 'volunteers', element: <VolunteersPage /> },
      { path: 'emails', element: <EmailDatabasePage /> },
      { path: 'planner', element: <TeacherPlannerPage /> },
      
      // Debug tools
      { path: 'debug/invoices', element: <InvoiceDebugPage /> },
      
      // Teacher Management (Phase 2)
      { path: 'teachers', element: <TeachersManagementPage /> },
      
      // Audit Log (Phase 10)
      { path: 'dashboard/activity-log', element: <ActivityLogPage /> },
    ],
  },
  // Public pages (no auth required)
  {
    path: '/checkin',
    element: <CheckInPage />,
  },
  {
    path: '/volunteer-schedule',
    element: <PublicVolunteerSchedulePage />,
  },
  {
    path: '/volunteer-registration',
    element: <VolunteerRegistrationPage />,
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <TeacherProvider>
          <RouterProvider router={router} />
        </TeacherProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)