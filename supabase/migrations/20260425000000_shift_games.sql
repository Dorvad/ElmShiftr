-- Ordered games per shift slot (date + shift_type), open to all employees

create table if not exists shift_games (
  id         uuid        primary key default gen_random_uuid(),
  shift_date date        not null,
  shift_type text        not null check (shift_type in ('morning', 'evening')),
  game_name  text        not null check (char_length(trim(game_name)) > 0),
  sort_order smallint    not null default 0,
  created_at timestamptz not null default now(),
  unique (shift_date, shift_type, game_name)
);

alter table shift_games enable row level security;

create policy "anon_select_shift_games" on shift_games for select to anon using (true);
create policy "anon_insert_shift_games" on shift_games for insert to anon with check (true);
create policy "anon_delete_shift_games"  on shift_games for delete to anon using (true);
create policy "auth_all_shift_games"    on shift_games for all to authenticated using (true) with check (true);

alter publication supabase_realtime add table shift_games;
