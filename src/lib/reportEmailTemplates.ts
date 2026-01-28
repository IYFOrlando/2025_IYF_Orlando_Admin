/**
 * HTML email templates for report emails.
 * Uses formatPrice and formatReportDate from emailService.
 */

import { formatPrice, formatReportDate } from './emailService'

export type DailyReportData = {
  reportDate: string
  today: {
    registrations: number
    payments: number
    revenue: number
    newStudents: Array<{ firstName: string; lastName: string; email?: string; selectedAcademies?: Array<{ academy?: string }> }>
    academies: Array<{ name: string; count: number }>
  }
  overall: {
    totalStudents: number
    totalRevenue: number
    totalPending: number
    paidCount: number
    unpaidCount: number
  }
  allAcademies: Array<{ name: string; count: number }>
  koreanLevels: Array<{ level: string; count: number }>
}

/** Daily report HTML (matches ReportsPage dailyStats shape). */
export function dailyReportTemplate(data: DailyReportData): string {
  const newStudentsRows = (data.today.newStudents ?? [])
    .map(
      (s, i) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px;">${i + 1}</td>
      <td style="padding: 10px; font-weight: 600;">${[s.firstName, s.lastName].filter(Boolean).join(' ')}</td>
      <td style="padding: 10px;">${s.email ?? '-'}</td>
      <td style="padding: 10px;">${(s as any).selectedAcademies?.[0]?.academy ?? 'N/A'}</td>
    </tr>`
    )
    .join('')

  const academyRows = (data.allAcademies ?? [])
    .map(
      (a, i) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 10px;">${i + 1}</td>
      <td style="padding: 10px; font-weight: 600;">${a.name}</td>
      <td style="padding: 10px; text-align: right;">${a.count} student${a.count !== 1 ? 's' : ''}</td>
    </tr>`
    )
    .join('')

  const koreanRows =
    (data.koreanLevels ?? []).length > 0
      ? `
    <h3 style="color: #0a192f; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; margin-top: 24px;">Korean Language – Levels</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
          <th style="padding: 10px; text-align: left;">Level</th>
          <th style="padding: 10px; text-align: right;">Students</th>
        </tr>
      </thead>
      <tbody>
        ${(data.koreanLevels ?? [])
          .map(
            (k) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; font-weight: 600;">${k.level}</td>
          <td style="padding: 10px; text-align: right;">${k.count}</td>
        </tr>`
          )
          .join('')}
      </tbody>
    </table>`
      : ''

  return `
    <div style="font-family: 'Helvetica','Arial',sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f6f9; color: #333; line-height: 1.6;">
      <div style="background: linear-gradient(135deg, #2196F3 0%, #21CBF3 100%); padding: 24px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h2 style="color: #fff; margin: 0; font-size: 22px; font-weight: 700;">IYF Orlando Academy – Daily Report</h2>
        <p style="color: rgba(255,255,255,0.95); margin: 8px 0 0; font-size: 14px;">2026 Spring Semester</p>
        <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 13px;">${data.reportDate}</p>
      </div>
      <div style="background-color: #fff; padding: 24px 20px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Total Students</div>
          <div style="font-size: 32px; color: #2196F3; font-weight: 700;">${data.overall.totalStudents}</div>
        </div>
        <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 120px; background: #e3f2fd; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">New today</div>
            <div style="font-size: 20px; color: #1976d2; font-weight: 700;">${data.today.registrations}</div>
          </div>
          <div style="flex: 1; min-width: 120px; background: #e8f5e9; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Revenue today</div>
            <div style="font-size: 20px; color: #2e7d32; font-weight: 700;">${formatPrice((data.today.revenue ?? 0) / 100)}</div>
          </div>
          <div style="flex: 1; min-width: 120px; background: #fff3e0; padding: 12px; border-radius: 8px; text-align: center;">
            <div style="font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 600;">Total pending</div>
            <div style="font-size: 20px; color: #e65100; font-weight: 700;">${formatPrice((data.overall.totalPending ?? 0) / 100)}</div>
          </div>
        </div>
        ${data.today.newStudents?.length ? `
        <h3 style="color: #0a192f; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px;">New Students Today</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px; text-align: left;">#</th>
              <th style="padding: 10px; text-align: left;">Name</th>
              <th style="padding: 10px; text-align: left;">Email</th>
              <th style="padding: 10px; text-align: left;">Academy</th>
            </tr>
          </thead>
          <tbody>${newStudentsRows}</tbody>
        </table>
        ` : ''}
        <h3 style="color: #0a192f; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px;">Enrollment by Academy</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
              <th style="padding: 10px; text-align: left;">#</th>
              <th style="padding: 10px; text-align: left;">Academy</th>
              <th style="padding: 10px; text-align: right;">Students</th>
            </tr>
          </thead>
          <tbody>${academyRows || '<tr><td colspan="3" style="padding:12px;text-align:center;">No data</td></tr>'}</tbody>
        </table>
        ${koreanRows}
      </div>
      <div style="text-align: center; padding: 16px; color: #94a3b8; font-size: 11px;">
        <p style="margin:0;">Automated report from IYF Orlando Admin Dashboard · ${formatReportDate(new Date())}</p>
      </div>
    </div>
  `
}

/** Weekly registration report (from guide). */
export function weeklyRegistrationReport(data: {
  weekStart: string
  weekEnd: string
  totalRegistrations?: number
  totalRevenue?: number
  topAcademies?: Array<{ name: string; count: number; revenue?: number }>
  notes?: string
}): string {
  const rows = (data.topAcademies ?? [])
    .map(
      (a, i) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px;">${i + 1}</td>
      <td style="padding: 12px; font-weight: 600;">${a.name}</td>
      <td style="padding: 12px; text-align: center;">${a.count}</td>
      <td style="padding: 12px; text-align: right;">${formatPrice((a.revenue ?? 0) / 100)}</td>
    </tr>`
    )
    .join('') || '<tr><td colspan="4" style="padding:12px;text-align:center;">No data</td></tr>'

  return `
    <div style="font-family: Helvetica,Arial,sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f6f9; color: #333; line-height: 1.6;">
      <div style="background: linear-gradient(135deg, #0a192f 0%, #112240 100%); padding: 25px 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h2 style="color: #fff; margin: 0; font-size: 22px;">Weekly Registration Report</h2>
        <p style="color: #64ffda; margin: 5px 0 0; font-size: 14px;">${data.weekStart} – ${data.weekEnd}</p>
      </div>
      <div style="background-color: #fff; padding: 40px 30px; border-radius: 0 0 8px 8px;">
        <div style="display: flex; gap: 15px; margin-bottom: 30px;">
          <div style="flex: 1; background: #eef2ff; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">New Registrations</div>
            <div style="font-size: 24px; color: #1e40af; font-weight: 700;">${data.totalRegistrations ?? 0}</div>
          </div>
          <div style="flex: 1; background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Total Revenue</div>
            <div style="font-size: 24px; color: #16a34a; font-weight: 700;">${formatPrice((data.totalRevenue ?? 0) / 100)}</div>
          </div>
        </div>
        <h3 style="color: #0a192f; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">Top Academies</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8fafc;"><th style="padding: 12px;">#</th><th style="padding: 12px;">Academy</th><th style="padding: 12px; text-align: center;">Students</th><th style="padding: 12px; text-align: right;">Revenue</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        ${data.notes ? `<div style="background: #fff7ed; border-left: 4px solid #f77f00; padding: 15px; margin-top: 20px;"><p style="margin:0;">${data.notes}</p></div>` : ''}
      </div>
      <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 11px;"><p style="margin:0;">IYF Orlando Admin Dashboard</p></div>
    </div>
  `
}

/** Monthly revenue report (from guide). */
export function monthlyRevenueReport(data: {
  month: string
  year: number
  totalRevenue?: number
  totalRegistrations?: number
  pendingPayments?: number
  revenueByAcademy?: Array<{ academy: string; count: number; revenue: number }>
}): string {
  const rows = (data.revenueByAcademy ?? [])
    .map(
      (r) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; font-weight: 600;">${r.academy}</td>
      <td style="padding: 12px; text-align: center;">${r.count}</td>
      <td style="padding: 12px; text-align: right; color: #16a34a;">${formatPrice((r.revenue ?? 0) / 100)}</td>
    </tr>`
    )
    .join('')

  return `
    <div style="font-family: Helvetica,Arial,sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f6f9; color: #333;">
      <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
        <h2 style="color: #fff; margin: 0;">Monthly Revenue Report</h2>
        <p style="color: #d1fae5; margin: 5px 0 0;">${data.month} ${data.year}</p>
      </div>
      <div style="background-color: #fff; padding: 40px 30px;">
        <div style="display: flex; gap: 15px; margin-bottom: 30px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 120px; background: #f0fdf4; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280;">Total Revenue</div>
            <div style="font-size: 24px; color: #16a34a; font-weight: 700;">${formatPrice((data.totalRevenue ?? 0) / 100)}</div>
          </div>
          <div style="flex: 1; min-width: 120px; background: #eef2ff; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280;">Registrations</div>
            <div style="font-size: 24px; color: #1e40af; font-weight: 700;">${data.totalRegistrations ?? 0}</div>
          </div>
          <div style="flex: 1; min-width: 120px; background: #fff7ed; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #6b7280;">Pending</div>
            <div style="font-size: 24px; color: #ea580c; font-weight: 700;">${formatPrice((data.pendingPayments ?? 0) / 100)}</div>
          </div>
        </div>
        <h3 style="color: #0a192f; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">Revenue by Academy</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8fafc;"><th style="padding: 12px;">Academy</th><th style="padding: 12px; text-align: center;">Students</th><th style="padding: 12px; text-align: right;">Revenue</th></tr>
          </thead>
          <tbody>${rows}
          <tr style="background: #f8fafc; font-weight: bold;"><td style="padding: 12px;">TOTAL</td><td style="padding: 12px; text-align: center;">${data.totalRegistrations ?? 0}</td><td style="padding: 12px; text-align: right; color: #16a34a;">${formatPrice((data.totalRevenue ?? 0) / 100)}</td></tr>
          </tbody>
        </table>
      </div>
      <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 11px;">Generated ${formatReportDate(new Date())}</div>
    </div>
  `
}
