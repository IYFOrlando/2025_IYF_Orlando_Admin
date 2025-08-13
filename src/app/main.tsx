import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'

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
import AcademiesPage from '../features/classes/pages/ClassesPage'

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
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
)