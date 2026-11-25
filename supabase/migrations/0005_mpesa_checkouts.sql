create table if not exists public.mpesa_checkouts (
  checkout_request_id text primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  phone text not null,
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'success', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists mpesa_checkouts_business_idx on public.mpesa_checkouts(business_id);
alter table public.mpesa_checkouts enable row level security;

create policy "Members can read their M-Pesa checkouts"
on public.mpesa_checkouts for select to authenticated
using (exists (
  select 1 from public.memberships m
  where m.business_id = mpesa_checkouts.business_id
    and m.user_id = (select auth.uid())
));

create policy "Owners and admins can create M-Pesa checkouts"
on public.mpesa_checkouts for insert to authenticated
with check (exists (
  select 1 from public.memberships m
  where m.business_id = mpesa_checkouts.business_id
    and m.user_id = (select auth.uid())
    and m.role in ('owner', 'admin')
));
