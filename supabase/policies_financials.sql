
-- Enable RLS (Ensure it is on)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins full access invoices" ON invoices;
DROP POLICY IF EXISTS "Admins full access invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Admins full access payments" ON payments;

-- 1. SUPERUSER / ADMIN POLICIES (Full Access)
CREATE POLICY "Admins full access invoices" ON invoices
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('superuser', 'admin'))
  );

CREATE POLICY "Admins full access invoice_items" ON invoice_items
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('superuser', 'admin'))
  );

CREATE POLICY "Admins full access payments" ON payments
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('superuser', 'admin'))
  );

-- 2. PUBLIC/VIEWER READ ACCESS (Optional, if needed for dashboards that aren't strict)
-- Currently restricted to Admins/Superusers. Teachers/Viewers see nothing.

-- 3. SELF ACCESS (For potentially future Student Portal)
-- owner_id column doesn't exist on invoices, we rely on student_id.
-- If we mapped student_id to auth.users, we could do:
-- CREATE POLICY "Student read own invoices" ON invoices FOR SELECT USING (student_id = auth.uid());
-- But students table is separate from auth.users (profiles). So we'd need a lookup if we link them.
-- For now, purely Admin.
