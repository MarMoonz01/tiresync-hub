-- Add new columns to existing notifications table
alter table public.notifications
  add column if not exists send_line      boolean default false,
  add column if not exists line_sent_at   timestamptz,
  add column if not exists reference_type text;

-- Drop old triggers that reference removed tables (safe if they don't exist)
drop trigger if exists on_partnership_change on public.store_partnerships;
drop trigger if exists on_new_offer          on public.broadcast_offers;
drop trigger if exists on_new_broadcast      on public.broadcast_requests;

-- Update RLS for the new model
drop policy if exists "View own notifications"   on public.notifications;
drop policy if exists "Update own notifications" on public.notifications;

create policy "view_own_or_store_notifications"
  on public.notifications for select to authenticated
  using (
    user_id = auth.uid()
    or store_id in (
      select store_id from public.profiles
      where user_id = auth.uid()
    )
  );

create policy "update_own_notifications"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "service_role_all_notifications"
  on public.notifications for all to service_role using (true);
