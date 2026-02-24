ALTER TABLE progress_reports
ADD COLUMN IF NOT EXISTS cert_type_override TEXT
CHECK (cert_type_override IN ('None', 'Completion', 'Participation'));
