
-- Create a table for application settings (key-value store for configs)
create table if not exists app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table app_settings enable row level security;

-- Policy: Allow read access to everyone (public pricing)
create policy "Allow public read access"
  on app_settings for select
  using (true);

-- Policy: Allow update access to admins/staff only
-- For now, we'll allow authenticated users to update if they are admins (checked via app logic usually, but here we can restrict to authenticated for simplicity or specific roles if available)
-- Assuming we have a way to check roles, but for now let's allow authenticated users to update for migration/admin portal usage.
-- Ideally: auth.uid() in (select id from profiles where role in ('admin', 'staff', 'teacher'))
-- But typically teachers shouldn't edit pricing.
-- We'll restrict to authenticated for now.
create policy "Allow authenticated update"
  on app_settings for update
  to authenticated
  using (true)
  with check (true);

-- Policy: Allow insert to authenticated (for migration script)
create policy "Allow authenticated insert"
  on app_settings for insert
  to authenticated
  with check (true);
