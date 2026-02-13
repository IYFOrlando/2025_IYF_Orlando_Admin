
-- Add updated_at column to academies if it doesn't exist
ALTER TABLE academies 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add updated_at column to levels if it doesn't exist
ALTER TABLE levels 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
