-- Kode project otomatis: P-001, P-002, ...
create or replace function set_project_code() returns trigger language plpgsql set search_path = public as $$
declare n int;
begin
  if new.project_code is null or btrim(new.project_code) = '' then
    perform pg_advisory_xact_lock(7001);
    select coalesce(max((substring(project_code from '^P-(\d+)$'))::int), 0) + 1 into n from projects;
    new.project_code := 'P-' || lpad(n::text, 3, '0');
  end if;
  return new;
end $$;
drop trigger if exists projects_set_code on projects;
create trigger projects_set_code before insert on projects for each row execute function set_project_code();
