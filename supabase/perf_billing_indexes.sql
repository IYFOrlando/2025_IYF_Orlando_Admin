-- Performance indexes for invoice and payment queries used by billing flows.

CREATE INDEX IF NOT EXISTS idx_invoices_semester_created_at
  ON public.invoices (semester_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_student_semester
  ON public.invoices (student_id, semester_id);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
  ON public.invoice_items (invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id
  ON public.payments (invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_transaction_date
  ON public.payments (transaction_date DESC);
