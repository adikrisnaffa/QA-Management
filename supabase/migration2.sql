-- Jalankan SETELAH migration.sql
alter table tasks alter column created_by set default auth.uid();
create table project_users (id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id) on delete cascade,
  name text not null, email text, department text, role text, phone text, notes text, created_at timestamptz not null default now());
create table task_activities (id uuid primary key default gen_random_uuid(), task_id uuid not null references tasks(id) on delete cascade,
  activity_date date not null default current_date, activity_type text not null, description text, hours_spent numeric not null default 0 check (hours_spent >= 0),
  created_by uuid references profiles(id) default auth.uid(), created_at timestamptz not null default now());
create table project_milestones (id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id) on delete cascade,
  milestone_name text not null, description text, start_date date, target_date date, actual_date date,
  status text not null default 'Not Started', created_at timestamptz not null default now());
create table test_execution (id uuid primary key default gen_random_uuid(), task_id uuid not null references tasks(id) on delete cascade,
  test_case_name text not null, test_type text, execution_date date default current_date, environment text,
  total_cases int not null default 0, passed_cases int not null default 0, failed_cases int not null default 0, blocked_cases int not null default 0,
  pass_percentage numeric generated always as (case when total_cases > 0 then round(passed_cases * 100.0 / total_cases, 1) else 0 end) stored,
  notes text, created_by uuid references profiles(id) default auth.uid(), created_at timestamptz not null default now());
create table daily_updates (id uuid primary key default gen_random_uuid(), profile_id uuid not null references profiles(id) default auth.uid(),
  project_id uuid references projects(id) on delete set null, update_date date not null default current_date,
  summary text not null, progress int check (progress between 0 and 100), tomorrow_plan text, blocker_summary text, created_at timestamptz not null default now());
create table audit_logs (id uuid primary key default gen_random_uuid(), user_id uuid default auth.uid(), action text not null,
  entity_type text not null, entity_id uuid, old_data jsonb, new_data jsonb, created_at timestamptz not null default now());
create index on task_activities(task_id, activity_date); create index on daily_updates(update_date); create index on audit_logs(entity_type, created_at);

create function audit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs(user_id, action, entity_type, entity_id, old_data, new_data)
  values (auth.uid(), tg_op, tg_table_name, coalesce((to_jsonb(new)->>'id')::uuid, (to_jsonb(old)->>'id')::uuid),
    case when tg_op <> 'INSERT' then to_jsonb(old) end, case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;
do $$ declare t text; begin
  foreach t in array array['projects','tasks','blockers','bugs'] loop
    execute format('create trigger audit_%1$s after insert or update or delete on %1$I for each row execute function audit()', t);
  end loop;
  foreach t in array array['project_users','task_activities','project_milestones','test_execution','daily_updates','audit_logs'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
  foreach t in array array['project_users','task_activities','project_milestones','test_execution','daily_updates'] loop
    execute format('create policy "read_%1$s" on %1$I for select to authenticated using (true)', t);
  end loop;
  foreach t in array array['task_activities','test_execution','daily_updates'] loop
    execute format('create policy "write_%1$s" on %1$I for all to authenticated using (app_role() in (''admin'',''qa_lead'',''qa_engineer'')) with check (app_role() in (''admin'',''qa_lead'',''qa_engineer''))', t);
  end loop;
  foreach t in array array['project_users','project_milestones'] loop
    execute format('create policy "write_%1$s" on %1$I for all to authenticated using (app_role() in (''admin'',''qa_lead'')) with check (app_role() in (''admin'',''qa_lead''))', t);
  end loop;
end $$;
create policy "read_audit" on audit_logs for select to authenticated using (app_role() in ('admin','qa_lead'));

-- Seed
insert into project_users (project_id,name,email,department,role)
select id,'dr. Rina (dummy)','rina@example.com','Rawat Jalan','Hospital User' from projects where project_code='HIS-001';
insert into project_users (project_id,name,email,department,role)
select id,'Budi Santoso (dummy)','budi@example.com','Marketing','Business User' from projects where project_code='CRM-002';
insert into project_milestones (project_id,milestone_name,start_date,target_date,status)
select id,'UAT Slot Antrian',current_date-5,current_date+7,'In Progress' from projects where project_code='HIS-001';
insert into task_activities (task_id,activity_date,activity_type,description,hours_spent,created_by)
select id,current_date,'Functional Testing','Booking slot dan registrasi pasien',3,null from tasks where task_code='T-001';
insert into task_activities (task_id,activity_date,activity_type,description,hours_spent,created_by)
select id,current_date,'Bug Reporting','BUG-102 dilaporkan',1,null from tasks where task_code='T-001';
insert into task_activities (task_id,activity_date,activity_type,description,hours_spent,created_by)
select id,current_date-1,'API Testing','Validasi payload event',4,null from tasks where task_code='T-003';
insert into test_execution (task_id,test_case_name,test_type,environment,total_cases,passed_cases,failed_cases,blocked_cases)
select id,'Booking slot','Functional','UAT',40,32,3,5 from tasks where task_code='T-001';
