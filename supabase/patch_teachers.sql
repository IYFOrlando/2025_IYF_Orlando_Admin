-- Add teacher_email column to ACADEMIES table
ALTER TABLE academies 
ADD COLUMN teacher_email TEXT;

-- Add teacher_email column to LEVELS table
ALTER TABLE levels 
ADD COLUMN teacher_email TEXT;

-- (Optional) Index for faster lookups since we will query by this often on login
CREATE INDEX idx_academies_teacher_email ON academies(teacher_email);
CREATE INDEX idx_levels_teacher_email ON levels(teacher_email);
