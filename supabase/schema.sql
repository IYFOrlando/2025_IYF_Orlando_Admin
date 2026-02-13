-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. System & Auth (Profiles)
-- -----------------------------------------------------------------------------

-- Semesters: The container for time-based data
CREATE TABLE semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- e.g., "Spring 2026"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles: Extends Supabase Auth
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('superuser', 'admin', 'teacher', 'viewer')),
    phone TEXT,
    credentials TEXT,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helper to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'viewer');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. Academies & Students
-- -----------------------------------------------------------------------------

-- Academies: Classes offered in a specific semester
CREATE TABLE academies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0,
    schedule_summary TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 999,
    default_teacher_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(semester_id, name)
);

-- Levels: Sub-divisions of academies (Beginner, Intermediate)
CREATE TABLE levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    schedule TEXT,
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students: Global entities (exist across semesters)
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    guardian_name TEXT,
    guardian_phone TEXT,
    birth_date DATE,
    gender TEXT,
    t_shirt_size TEXT,
    address JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher Assignments: Explicitly links teachers to specific academy/levels
CREATE TABLE teacher_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    level_id UUID REFERENCES levels(id) ON DELETE CASCADE, -- Null means "All levels"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(teacher_id, academy_id, level_id)
);

-- Enrollments: Connects Student -> Academy for a Semester
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    level_id UUID REFERENCES levels(id),
    semester_id UUID REFERENCES semesters(id), -- Denormalized for query speed
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'waitlist')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, academy_id)
);

-- -----------------------------------------------------------------------------
-- 3. Daily Operations (Attendance & Progress)
-- -----------------------------------------------------------------------------

-- Attendance Sessions: A specific class occurrence (e.g., "Monday 10am")
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    level_id UUID REFERENCES levels(id),
    date DATE NOT NULL,
    teacher_id UUID REFERENCES profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(academy_id, level_id, date)
);

-- Attendance Records: Student status for a session
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, student_id)
);

-- Progress Reports: Scores/Grades
CREATE TABLE progress_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    academy_id UUID REFERENCES academies(id) ON DELETE CASCADE,
    level_id UUID REFERENCES levels(id),
    date DATE DEFAULT CURRENT_DATE,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    comments TEXT,
    teacher_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. Finance & Auditing
-- -----------------------------------------------------------------------------

-- Invoices: The bill for a student in a semester
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    semester_id UUID REFERENCES semesters(id),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'void', 'exonerated')),
    subtotal DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    discount_note TEXT,
    total DECIMAL(10, 2) DEFAULT 0,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 2) DEFAULT 0,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice Items: Details (Tuition, Lunch, Books)
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('tuition', 'lunch_semester', 'lunch_single', 'material', 'other')),
    description TEXT NOT NULL,
    academy_id UUID REFERENCES academies(id),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments: Transactions (Cash, Zelle, etc.)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id),
    amount DECIMAL(10, 2) NOT NULL,
    method TEXT DEFAULT 'cash' CHECK (method IN ('cash', 'zelle', 'check', 'card')),
    received_by UUID REFERENCES profiles(id),
    notes TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. Views for Reporting
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW report_financial_summary AS
SELECT 
    s.name as semester_name,
    COUNT(i.id) as total_invoices,
    SUM(i.total) as total_billed,
    SUM(i.paid_amount) as total_collected,
    SUM(i.balance) as total_outstanding
FROM invoices i
JOIN semesters s ON i.semester_id = s.id
GROUP BY s.name;

-- -----------------------------------------------------------------------------
-- 6. Row Level Security (RLS) - Basic Setup
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- SIMPLE POLICY EXAMPLE (To be refined):
-- Superusers can do anything
CREATE POLICY "Superusers full access" ON profiles
    FOR ALL
    USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'superuser'));
    
-- Viewers can read basic data
CREATE POLICY "Viewers read academies" ON academies
    FOR SELECT
    USING (true);
