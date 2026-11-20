-- DukaFlow Phase 1: identity, businesses and memberships.
-- Run in Supabase SQL Editor. All tenant data must be protected by RLS.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  country_code char(2) not null default 'KE',
  default_currency char(3) not null default 'KES',
  timezone text not null default 'Africa/Nairobi',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.memberships (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','manager','staff')),
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index if not exists memberships_user_id_idx on public.memberships(user_id);
create index if not exists businesses_created_by_idx on public.businesses(created_by);

-- Keep profile metadata in a dedicated table. Never trust client-supplied user IDs.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.memberships enable row level security;

create policy "Users can read own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()));

create policy "Users can update own profile"
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Members can read their businesses"
on public.businesses for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.business_id = businesses.id
      and m.user_id = (select auth.uid())
  )
);

create policy "Authenticated users can create a business as themselves"
on public.businesses for insert to authenticated
with check (created_by = (select auth.uid()));

create policy "Owners and admins can update business"
on public.businesses for update to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.business_id = businesses.id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','admin')
  )
)
with check (
  exists (
    select 1 from public.memberships m
    where m.business_id = businesses.id
      and m.user_id = (select auth.uid())
      and m.role in ('owner','admin')
  )
);

create policy "Members can read memberships in their businesses"
on public.memberships for select to authenticated
using (
  exists (
    select 1 from public.memberships mine
    where mine.business_id = memberships.business_id
      and mine.user_id = (select auth.uid())
  )
);

-- Membership creation is intentionally not exposed to arbitrary clients.
-- Phase 2 will add a server-validated onboarding RPC that creates the business
-- and owner membership atomically. Do not add a permissive client INSERT policy.
