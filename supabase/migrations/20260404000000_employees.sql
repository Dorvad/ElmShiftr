-- Employees table for dynamic employee list management

create table if not exists employees (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(name) > 0),
  is_active  boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Seed existing hardcoded employees
insert into employees (name, sort_order) values
  ('דור',    1),
  ('יהב',    2),
  ('אביב',   3),
  ('סטיבן',  4)
on conflict (name) do nothing;

alter table employees enable row level security;

-- Anonymous users can read active employees (needed for request/cancel forms)
create policy "anon_select_employees" on employees
  for select to anon using (is_active = true);

-- Authenticated admins have full access
create policy "auth_all_employees" on employees
  for all to authenticated using (true) with check (true);
