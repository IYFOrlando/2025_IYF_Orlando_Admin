-- Create the picnic_signups table
CREATE TABLE IF NOT EXISTS picnic_signups (
    id SERIAL PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    guests INTEGER DEFAULT 0,
    items_claimed TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: In a production Supabase environment, you should also configure RLS (Row Level Security).
-- For now, enabling basic read access for authenticated admins:
ALTER TABLE picnic_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage picnic signups" ON picnic_signups
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'superuser')
        )
    );
