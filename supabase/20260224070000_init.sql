-- ElmShiftr Migration

create table if not exists shift_requests (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (char_length(name) > 0),
  date         date not null,
  shift_type   text not null check (shift_type in ('morning', 'evening')),
  notes        text,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists approved_shifts (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) > 0),
  date              date not null,
  shift_type        text not null check (shift_type in ('morning', 'evening')),
  notes             text,
  status            text not null default 'approved' check (status in ('approved', 'canceled')),
  shift_request_id  uuid references shift_requests(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (name, date, shift_type)
);

create table if not exists cancel_requests (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) > 0),
  date              date not null,
  shift_type        text not null check (shift_type in ('morning', 'evening')),
  reason            text,
  status            text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_shift_id uuid references approved_shifts(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger shift_requests_updated_at before update on shift_requests for each row execute function set_updated_at();
create trigger approved_shifts_updated_at before update on approved_shifts for each row execute function set_updated_at();
create trigger cancel_requests_updated_at before update on cancel_requests for each row execute function set_updated_at();

alter table shift_requests  enable row level security;
alter table approved_shifts enable row level security;
alter table cancel_requests enable row level security;

create policy "anon_insert_shift_requests" on shift_requests for insert to anon with check (true);
create policy "auth_all_shift_requests" on shift_requests for all to authenticated using (true) with check (true);

create policy "anon_select_approved_shifts" on approved_shifts for select to anon using (status = 'approved');
create policy "auth_all_approved_shifts" on approved_shifts for all to authenticated using (true) with check (true);

create policy "anon_insert_cancel_requests" on cancel_requests for insert to anon with check (true);
create policy "auth_all_cancel_requests" on cancel_requests for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table approved_shifts;
