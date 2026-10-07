-- Jalankan SETELAH migration2.sql
alter table bugs add column if not exists description text, add column if not exists priority text default 'Medium' check (priority in ('Low','Medium','High','Critical')),
  add column if not exists environment text, add column if not exists steps_to_reproduce text, add column if not exists expected_result text, add column if not exists actual_result text,
  add column if not exists reported_by uuid references profiles(id) default auth.uid();
alter table blockers add column if not exists resolution text;
