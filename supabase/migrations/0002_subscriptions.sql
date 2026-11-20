-- DukaFlow Phase 3 foundation: plan catalogue and tenant subscriptions.
-- Payment providers must update these records through trusted server/webhook code.

create table if not exists public.subscription_plans (
  code text primary key check (code in ('free', 'starter', 'business', 'enterprise')),
  name text not null,
  monthly_price numeric(12, 2) not null default 0 check (monthly_price >= 0),
  annual_price numeric(12, 2) not null default 0 check (annual_price >= 0),
  max_products integer check (max_products is null or max_products > 0),
  max_monthly_sales integer check (max_monthly_sales is null or max_monthly_sales > 0),
  created_at timestamptz not null default now()
);

insert into public.subscription_plans (code, name, monthly_price, annual_price, max_products, max_monthly_sales)
values
  ('free', 'Free', 0, 0, 50, 100),
  ('starter', 'Starter', 1500, 15000, 500, null),
  ('business', 'Business', 4000, 40000, null, null),
  ('enterprise', 'Enterprise', 0, 0, null, null)
on conflict (code) do update set
  name = excluded.name,
  monthly_price = excluded.monthly_price,
  annual_price = excluded.annual_price,
  max_products = excluded.max_products,
  max_monthly_sales = excluded.max_monthly_sales;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan_code text not null references public.subscription_plans(code),
  billing_interval text not null default 'monthly' check (billing_interval in ('monthly', 'annual')),
  status text not null default 'trialing' check (status in ('trialing', 'active', 'past_due', 'paused', 'cancelled', 'expired')),
  provider text check (provider is null or provider in ('mpesa', 'card', 'manual')),
  provider_subscription_id text,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists one_open_subscription_per_business
on public.subscriptions (business_id)
where status in ('trialing', 'active', 'past_due', 'paused');

create index if not exists subscriptions_business_id_idx on public.subscriptions(business_id);

alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;

create policy "Anyone can read subscription plans"
on public.subscription_plans for select to anon, authenticated using (true);

create policy "Members can read their subscription"
on public.subscriptions for select to authenticated
using (exists (
  select 1 from public.memberships m
  where m.business_id = subscriptions.business_id
    and m.user_id = (select auth.uid())
));
