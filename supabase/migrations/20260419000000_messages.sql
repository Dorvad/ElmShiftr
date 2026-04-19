-- Team message board

create table if not exists messages (
  id           uuid        primary key default gen_random_uuid(),
  author       text        not null check (author in ('יהב', 'אביב', 'סטיבן', 'דור')),
  content      text        not null check (char_length(content) between 1 and 500),
  message_type text        not null default 'info' check (message_type in ('info', 'important')),
  created_at   timestamptz not null default now()
);

alter table messages enable row level security;

-- Anyone (including anonymous) can read all messages
create policy "anon_select_messages" on messages
  for select to anon using (true);

-- Anonymous users can post as one of the four employees
create policy "anon_insert_messages" on messages
  for insert to anon with check (true);

-- Admins have full access
create policy "auth_all_messages" on messages
  for all to authenticated using (true) with check (true);
