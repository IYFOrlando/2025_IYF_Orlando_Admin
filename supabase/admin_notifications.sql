-- Create admin_notifications table for Supabase Realtime updates
create table if not exists admin_notifications (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references auth.users(id) on delete set null, -- Optional link to auth user if they are a teacher
  teacher_profile_id uuid references profiles(id) on delete set null, -- Link to teacher profile (profiles table)
  teacher_name text,
  action text,
  academy text,
  details text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table admin_notifications enable row level security;

-- Policies
-- Admins can view all notifications
create policy "Admins can view all notifications"
  on admin_notifications for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'superuser')
    )
  );

-- Admins can update (mark as read)
create policy "Admins can update notifications"
  on admin_notifications for update
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'superuser')
    )
  );

-- Teachers (or anyone authenticated) can insert notifications
-- E.g. when they take attendance
create policy "Authenticated users can insert notifications"
  on admin_notifications for insert
  with check (
    auth.role() = 'authenticated'
  );

-- Enable Realtime
alter publication supabase_realtime add table admin_notifications;
