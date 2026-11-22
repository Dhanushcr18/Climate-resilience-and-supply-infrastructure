create table if not public.simulation_state (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.simulation_state enable row level security;

drop policy if exists "Allow demo shared state access" on public.simulation_state;
create policy "Allow demo shared state access"
on public.simulation_state
for all
to anon, authenticated
using (true)
with check (true);

insert into public.simulation_state (id, state)
values ('shared', '{}'::jsonb)
on conflict (id) do nothing;
