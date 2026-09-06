create table if not exists public.attendance (
  attendance_date date not null,
  class_id text not null,
  student_id text not null,
  status text not null check (status in ('present', 'absent', 'sick', 'leave', 'late')),
  updated_at timestamptz not null default now(),
  primary key (attendance_date, class_id, student_id)
);

alter table public.attendance enable row level security;

-- This is intentionally open because this version uses a shared school link
-- without login. Anyone with the link can read or change attendance.
create policy "shared link can read attendance"
  on public.attendance for select to anon using (true);
create policy "shared link can add attendance"
  on public.attendance for insert to anon with check (true);
create policy "shared link can edit attendance"
  on public.attendance for update to anon using (true) with check (true);
create policy "shared link can remove attendance"
  on public.attendance for delete to anon using (true);
