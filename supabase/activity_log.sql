
-- Create teacher_activity_log table
CREATE TABLE IF NOT EXISTS teacher_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_name TEXT,
    teacher_id UUID REFERENCES profiles(id),
    action TEXT,
    academy TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE teacher_activity_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins/Superusers can read all logs
CREATE POLICY "Admins read all logs" ON teacher_activity_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'superuser')
        )
    );

-- Policy: Everyone (authenticated) can insert logs (for tracking actions)
-- We might want to restrict this, but for now allow any auth user to log their actions
CREATE POLICY "Authenticated users can insert logs" ON teacher_activity_log
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
