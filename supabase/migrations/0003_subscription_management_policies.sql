-- Allow business owners and admins to manage plan selection before a payment gateway is connected.
create policy "Owners and admins can create subscriptions"
on public.subscriptions for insert to authenticated
with check (exists (
  select 1 from public.memberships m
  where m.business_id = subscriptions.business_id
    and m.user_id = (select auth.uid())
    and m.role in ('owner', 'admin')
));

create policy "Owners and admins can update subscriptions"
on public.subscriptions for update to authenticated
using (exists (
  select 1 from public.memberships m
  where m.business_id = subscriptions.business_id
    and m.user_id = (select auth.uid())
    and m.role in ('owner', 'admin')
))
with check (exists (
  select 1 from public.memberships m
  where m.business_id = subscriptions.business_id
    and m.user_id = (select auth.uid())
    and m.role in ('owner', 'admin')
));
