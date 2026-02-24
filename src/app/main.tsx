import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'

import { AuthProvider } from '../context/AuthContext'
import { TeacherProvider } from '../features/auth/context/TeacherContext'
import AppLayout from './layout/AppLayout'
import AuthGate from './layout/auth/AuthGate'
import PublicAccessPage from './layout/auth/PublicAccessPage'
import AdminRoute from './layout/auth/AdminRoute'
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
import TeacherStudentsPage from '../features/teacher/pages/TeacherStudentsPage'
import TeacherReportsPage from '../features/teacher/pages/TeacherReportsPage'
import ActivityLogPage from '../features/dashboard/pages/ActivityLogPage'
import AnalyticsPage from '../features/analytics/pages/AnalyticsPage'
import GlobalSearchPage from '../features/search/pages/GlobalSearchPage'

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
      // --- Shared routes (admin + teacher) ---
      { index: true, element: <DashboardPage /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'progress', element: <ProgressPage /> },
      { path: 'planner', element: <TeacherPlannerPage /> },
      { path: 'my-students', element: <TeacherStudentsPage /> },
      { path: 'teacher-reports', element: <TeacherReportsPage /> },

      // --- Admin-only routes (teachers get redirected to /dashboard) ---
      { path: 'analytics', element: <AdminRoute><AnalyticsPage /></AdminRoute> },
      { path: 'registrations', element: <AdminRoute><RegistrationsList /></AdminRoute> },
      { path: 'payments', element: <AdminRoute><PaymentsPage /></AdminRoute> },
      { path: 'reports', element: <AdminRoute><ReportsPage /></AdminRoute> },
      { path: 'reports/payments', element: <AdminRoute><PaymentsReportPage /></AdminRoute> },
      { path: 'reports/registrations', element: <AdminRoute><RegistrationsReportPage /></AdminRoute> },
      { path: 'reports/invalid-academies', element: <AdminRoute><InvalidAcademiesReportPage /></AdminRoute> },
      { path: 'classes', element: <AdminRoute><AcademiesPage /></AdminRoute> },
      { path: 'academies-management', element: <AdminRoute><AcademiesManagementPage /></AdminRoute> },
      { path: 'volunteers', element: <AdminRoute><VolunteersPage /></AdminRoute> },
      { path: 'emails', element: <AdminRoute><EmailDatabasePage /></AdminRoute> },
      { path: 'global-search', element: <AdminRoute><GlobalSearchPage /></AdminRoute> },
      { path: 'debug/invoices', element: <AdminRoute><InvoiceDebugPage /></AdminRoute> },
      { path: 'teachers', element: <AdminRoute><TeachersManagementPage /></AdminRoute> },
      { path: 'dashboard/activity-log', element: <AdminRoute><ActivityLogPage /></AdminRoute> },
    ],
  },
  // Public pages (no auth required)
  {
    path: '/login',
    element: <PublicAccessPage />,
  },
  {
    path: '/sign-in',
    element: <PublicAccessPage />,
  },
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

  // 404 Catch-all -> Redirect to Dashboard (which will gate auth)
  {
    path: '*',
    element: <Navigate to="/" replace />,
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