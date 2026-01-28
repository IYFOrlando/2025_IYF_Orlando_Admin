/**
 * Email Service for Admin Dashboard (Vite + React)
 *
 * Sends emails via the external SMTP API (e.g. iyforlando.org/api/send-email).
 * Set VITE_EMAIL_API_URL in .env to override the default.
 */

const DEFAULT_API_URL = 'https://www.iyforlando.org/api/send-email'
const API_URL = import.meta.env.VITE_EMAIL_API_URL ?? DEFAULT_API_URL

export type SendEmailParams = {
  to: string
  toName?: string
  subject: string
  html: string
  text?: string
  fromName?: string
  replyTo?: string
}

export type SendEmailResult =
  | { success: true; messageId?: string; message?: string }
  | { success: false; error: string }

/**
 * Send email via SMTP API (HTTP POST).
 * Uses VITE_EMAIL_API_URL or default iyforlando.org endpoint.
 */
export async function sendEmail(
  emailData: SendEmailParams,
  apiEndpoint: string = API_URL
): Promise<SendEmailResult> {
  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: emailData.to,
        toName: emailData.toName,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        fromName: emailData.fromName ?? 'IYF Orlando Admin',
        replyTo: emailData.replyTo ?? 'orlando@iyfusa.org',
      }),
    })
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}))
      const msg = (errBody as { message?: string }).message ?? `HTTP ${response.status}: Failed to send email`
      return { success: false, error: msg }
    }
    const result = (await response.json()) as { messageId?: string; message?: string }
    return { success: true, messageId: result.messageId, message: result.message }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { success: false, error: message }
  }
}

/** Format amount in cents as USD string (for emails). */
export function formatPriceCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((cents ?? 0) / 100)
}

/** Format amount in dollars as USD string. */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0)
}

/** Format date for report emails. */
export function formatReportDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
