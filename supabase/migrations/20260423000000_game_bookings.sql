-- Shared game bookings board (publicly editable for shift handoff)

create table if not exists game_bookings (
  date             date primary key,
  elm_street_slots text[] not null default '{}',
  butchery_slots   text[] not null default '{}',
  wrong_turn_slots text[] not null default '{}',
  updated_at       timestamptz not null default now()
);

drop trigger if exists game_bookings_updated_at on game_bookings;

create trigger game_bookings_updated_at
before update on game_bookings
for each row execute function set_updated_at();

alter table game_bookings enable row level security;

create policy "anon_select_game_bookings" on game_bookings
  for select to anon using (true);

create policy "anon_insert_game_bookings" on game_bookings
  for insert to anon with check (true);

create policy "anon_update_game_bookings" on game_bookings
  for update to anon using (true) with check (true);

create policy "auth_all_game_bookings" on game_bookings
  for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table game_bookings;
