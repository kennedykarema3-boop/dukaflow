create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null check (provider in ('paystack', 'mpesa', 'card')),
  provider_reference text not null unique,
  amount numeric(12, 2) not null check (amount >= 0),
  currency char(3) not null default 'KES',
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'refunded')),
  raw_event jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_transactions_business_idx on public.payment_transactions(business_id);
create index if not exists payment_transactions_status_idx on public.payment_transactions(status);

alter table public.payment_transactions enable row level security;

create policy "Members can read business payment transactions"
on public.payment_transactions for select to authenticated
using (exists (
  select 1 from public.memberships m
  where m.business_id = payment_transactions.business_id
    and m.user_id = (select auth.uid())
));
