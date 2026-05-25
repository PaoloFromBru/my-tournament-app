-- Supabase Data API grants and RLS policies.
-- Run this in the Supabase SQL Editor after creating the app tables.
--
-- Context:
-- Supabase is removing automatic Data API exposure for new public tables.
-- This script makes Data API access explicit and keeps anonymous access
-- read-only for public tournament views.

begin;

-- Bring older project schemas up to the ownership model used by the app.
-- Existing rows are backfilled where the owner can be inferred.
alter table public.players add column if not exists user_id uuid;
alter table public.teams add column if not exists user_id uuid;
alter table public.tournaments add column if not exists user_id uuid;
alter table public.tournaments add column if not exists ended boolean not null default false;
alter table public.tournaments add column if not exists winner_id text;
alter table public.tournament_teams add column if not exists user_id uuid;
alter table public.team_players add column if not exists user_id uuid;
alter table public.matches add column if not exists user_id uuid;
alter table public.user_profiles add column if not exists user_id uuid;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'user_profiles'
      and column_name = 'id'
  ) then
    update public.user_profiles
    set user_id = id
    where user_id is null
      and exists (
        select 1
        from auth.users u
        where u.id = public.user_profiles.id
      );
  end if;

  update public.tournament_teams tt
  set user_id = t.user_id
  from public.tournaments t
  where tt.user_id is null
    and tt.tournament_id = t.id
    and exists (
      select 1
      from auth.users u
      where u.id = t.user_id
    );

  update public.matches m
  set user_id = t.user_id
  from public.tournaments t
  where m.user_id is null
    and m.tournament_id = t.id
    and exists (
      select 1
      from auth.users u
      where u.id = t.user_id
    );

  update public.team_players tp
  set user_id = tm.user_id
  from public.teams tm
  where tp.user_id is null
    and tp.team_id = tm.id
    and exists (
      select 1
      from auth.users u
      where u.id = tm.user_id
    );
end $$;

-- Remove broad anonymous access before adding explicit read-only grants.
revoke all on table
  public.matches,
  public.player_profiles,
  public.players,
  public.sports,
  public.team_players,
  public.teams,
  public.tournament_teams,
  public.tournaments,
  public.user_profiles
from anon;

-- Authenticated users can use the app tables through the Data API.
grant select, insert, update, delete on table
  public.matches,
  public.player_profiles,
  public.players,
  public.team_players,
  public.teams,
  public.tournament_teams,
  public.tournaments,
  public.user_profiles
to authenticated;

-- Sports are shared configuration. App users can read them, but normal users
-- should not update global sport definitions from the client.
grant select on table public.sports to authenticated;

-- Public tournament pages are read-only. PostgREST embedded reads require table
-- SELECT grants on related resources, so keep anonymous access read-only and
-- rely on public page queries to request non-sensitive columns.
grant select on table
  public.matches,
  public.teams,
  public.tournament_teams,
  public.tournaments
to anon;

-- Revoke access to owner metadata from anonymous clients. The DO block
-- tolerates older schemas that do not have every optional column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tournaments' and column_name = 'user_id'
  ) then
    revoke select (user_id) on table public.tournaments from anon;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'teams' and column_name = 'user_id'
  ) then
    revoke select (user_id) on table public.teams from anon;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tournament_teams' and column_name = 'user_id'
  ) then
    revoke select (user_id) on table public.tournament_teams from anon;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'matches' and column_name = 'user_id'
  ) then
    revoke select (user_id) on table public.matches from anon;
  end if;
end $$;

-- Service role keeps full server-side access.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated;

-- Enable RLS on app tables. RLS is intentionally not enabled on sports here
-- because it is read-only shared configuration for authenticated users.
alter table public.matches enable row level security;
alter table public.player_profiles enable row level security;
alter table public.players enable row level security;
alter table public.team_players enable row level security;
alter table public.teams enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.tournaments enable row level security;
alter table public.user_profiles enable row level security;

-- Recreate policies idempotently.
drop policy if exists "matches_owner_all" on public.matches;
drop policy if exists "matches_public_read" on public.matches;
drop policy if exists "player_profiles_owner_all" on public.player_profiles;
drop policy if exists "players_owner_all" on public.players;
drop policy if exists "team_players_owner_all" on public.team_players;
drop policy if exists "teams_owner_all" on public.teams;
drop policy if exists "teams_public_read" on public.teams;
drop policy if exists "tournament_teams_owner_all" on public.tournament_teams;
drop policy if exists "tournament_teams_public_read" on public.tournament_teams;
drop policy if exists "tournaments_owner_all" on public.tournaments;
drop policy if exists "tournaments_public_read" on public.tournaments;
drop policy if exists "user_profiles_owner_all" on public.user_profiles;

create policy "matches_owner_all"
  on public.matches
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "matches_public_read"
  on public.matches
  for select
  to anon
  using (true);

create policy "players_owner_all"
  on public.players
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "player_profiles_owner_all"
  on public.player_profiles
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.players p
      where p.id = player_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.players p
      where p.id = player_id
        and p.user_id = auth.uid()
    )
  );

create policy "team_players_owner_all"
  on public.team_players
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "teams_owner_all"
  on public.teams
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "teams_public_read"
  on public.teams
  for select
  to anon
  using (true);

create policy "tournaments_owner_all"
  on public.tournaments
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "tournaments_public_read"
  on public.tournaments
  for select
  to anon
  using (true);

create policy "tournament_teams_owner_all"
  on public.tournament_teams
  for all
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.tournaments t
      where t.id = tournament_id
        and t.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1
      from public.tournaments t
      where t.id = tournament_id
        and t.user_id = auth.uid()
    )
  );

create policy "tournament_teams_public_read"
  on public.tournament_teams
  for select
  to anon
  using (true);

create policy "user_profiles_owner_all"
  on public.user_profiles
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

commit;
