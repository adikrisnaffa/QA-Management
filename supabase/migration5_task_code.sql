-- Kode task otomatis: T-001, T-002, ...
create or replace function set_task_code() returns trigger language plpgsql set search_path = public as $$
declare n int;
begin
  if new.task_code is null or btrim(new.task_code) = '' then
    perform pg_advisory_xact_lock(7002);
    select coalesce(max((substring(task_code from '^T-(\d+)$'))::int), 0) + 1 into n from tasks;
    new.task_code := 'T-' || lpad(n::text, 3, '0');
  end if;
  return new;
end $$;
drop trigger if exists tasks_set_code on tasks;
create trigger tasks_set_code before insert on tasks for each row execute function set_task_code();
