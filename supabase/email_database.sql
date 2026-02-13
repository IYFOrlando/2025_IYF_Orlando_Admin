-- Email Database table (migrated from Firebase email_database collection)
-- Stores all contact emails for marketing and communications

CREATE TABLE IF NOT EXISTS email_database (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',           -- registrations, staff, eventbrite, csv, manual
  source_id TEXT DEFAULT '',
  source_details JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_database_email ON email_database(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_email_database_source ON email_database(source);
CREATE INDEX IF NOT EXISTS idx_email_database_active ON email_database(is_active);

-- RLS
ALTER TABLE email_database ENABLE ROW LEVEL SECURITY;

-- Admins can manage all emails
CREATE POLICY "Admins can manage email_database"
  ON email_database
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );
