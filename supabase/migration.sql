-- QA Tracker core schema. Run whole file in Supabase SQL Editor.
create extension if not exists pgcrypto;
create type user_role as enum ('admin','qa_lead','qa_engineer','viewer');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, email text,
  role user_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create function app_role() returns user_role language sql stable security definer set search_path = public
as $$ select role from profiles where id = auth.uid() and is_active $$;
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public
as $$ begin insert into profiles(id,email,full_name) values (new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.email)); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create table projects (
  id uuid primary key default gen_random_uuid(),
  project_code text unique not null, project_name text not null, description text,
  status text not null default 'Planning' check (status in ('Planning','In Progress','On Hold','Completed','Cancelled')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Critical')),
  start_date date, target_end_date date, actual_end_date date,
  created_by uuid references profiles(id), created_at timestamptz not null default now()
);
create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  assigned_to uuid references profiles(id),
  task_code text unique not null, task_name text not null,
  task_type text not null default 'Functional Testing',
  priority text not null default 'Medium' check (priority in ('Low','Medium','High','Critical')),
  status text not null default 'Not Started' check (status in ('Not Started','In Progress','Blocked','Completed','Cancelled')),
  start_date date, target_end_date date, actual_end_date date,
  progress_percentage int not null default 0 check (progress_percentage between 0 and 100),
  estimated_hours numeric default 0, actual_hours numeric default 0,
  created_by uuid references profiles(id), created_at timestamptz not null default now()
);
create table blockers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  title text not null, description text,
  severity text not null default 'Medium' check (severity in ('Low','Medium','High','Critical')),
  status text not null default 'Open' check (status in ('Open','In Progress','Resolved','Closed')),
  identified_date date not null default current_date, resolved_date date,
  blocked_by text, created_at timestamptz not null default now()
);
create table bugs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  bug_number text unique not null, title text not null,
  severity text not null default 'Medium' check (severity in ('Low','Medium','High','Critical')),
  status text not null default 'Open' check (status in ('Open','In Progress','Fixed','Ready for Retest','Verified','Rejected','Closed')),
  reported_date date not null default current_date, resolved_date date,
  created_at timestamptz not null default now()
);
create index on tasks(project_id); create index on tasks(assigned_to); create index on blockers(project_id); create index on bugs(project_id);

create view blockers_v with (security_invoker = true) as
select b.*, p.project_name, t.task_name,
  (coalesce(b.resolved_date, current_date) - b.identified_date) as age_days
from blockers b join projects p on p.id = b.project_id left join tasks t on t.id = b.task_id;

do $$ declare t text; begin
  foreach t in array array['profiles','projects','tasks','blockers','bugs'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "read_%1$s" on %1$I for select to authenticated using (true)', t);
  end loop;
  create policy "write_projects" on projects for all to authenticated
    using (app_role() in ('admin','qa_lead')) with check (app_role() in ('admin','qa_lead'));
  foreach t in array array['tasks','blockers','bugs'] loop
    execute format('create policy "write_%1$s" on %1$I for all to authenticated using (app_role() in (''admin'',''qa_lead'',''qa_engineer'')) with check (app_role() in (''admin'',''qa_lead'',''qa_engineer''))', t);
  end loop;
end $$;
create policy "admin_update_profiles" on profiles for update to authenticated
  using (app_role()='admin') with check (app_role()='admin');

-- Seed (dummy data)
insert into projects (project_code,project_name,description,status,priority,start_date,target_end_date) values
('HIS-001','HIS dHealth','Integrasi HIS dan antrian pasien','In Progress','High',current_date-20,current_date+10),
('CRM-002','CleverTap CDP Onboarding','Event schema dan identity resolution','In Progress','Medium',current_date-12,current_date+18),
('MOB-003','Mobile Booking App','Booking dokter via mobile','Planning','Medium',current_date,current_date+40);
insert into tasks (project_id,task_code,task_name,task_type,priority,status,start_date,target_end_date,progress_percentage,estimated_hours,actual_hours)
select id,'T-001','Slot Antrian','Functional Testing','High','In Progress',current_date-5,current_date+2,75,24,16 from projects where project_code='HIS-001';
insert into tasks (project_id,task_code,task_name,task_type,priority,status,start_date,target_end_date,progress_percentage,estimated_hours,actual_hours)
select id,'T-002','Regression Registrasi','Regression Testing','Medium','Blocked',current_date-8,current_date-1,40,16,10 from projects where project_code='HIS-001';
insert into tasks (project_id,task_code,task_name,task_type,priority,status,start_date,target_end_date,progress_percentage,estimated_hours,actual_hours)
select id,'T-003','API Event Tracking','API Testing','High','In Progress',current_date-3,current_date+6,30,20,6 from projects where project_code='CRM-002';
insert into tasks (project_id,task_code,task_name,task_type,priority,status,start_date,target_end_date,progress_percentage,estimated_hours,actual_hours)
select id,'T-004','Test Documentation','Test Documentation','Low','Completed',current_date-15,current_date-5,100,8,9 from projects where project_code='CRM-002';
insert into blockers (project_id,task_id,title,severity,status,identified_date,blocked_by)
select p.id,t.id,'Query kuota reservasi belum memisahkan payment method Mobile JKN dan Pribadi.','Critical','Open',current_date-4,'Developer dHealth'
from projects p join tasks t on t.project_id=p.id where t.task_code='T-002';
insert into bugs (project_id,task_id,bug_number,title,severity,status,reported_date)
select p.id,t.id,'BUG-102','Slot antrian tidak berkurang setelah booking','High','Open',current_date-2 from projects p join tasks t on t.project_id=p.id where t.task_code='T-001';
insert into bugs (project_id,bug_number,title,severity,status,reported_date)
select id,'BUG-103','Event schema user_id kosong','Critical','In Progress',current_date-1 from projects where project_code='CRM-002';
