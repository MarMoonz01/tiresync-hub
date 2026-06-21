-- Notification triggers for promotions and purchase_orders status changes

-- Promotion status change → notify owner
create or replace function public.handle_promotion_status_change()
returns trigger as $$
declare
  v_owner_user_id uuid;
begin
  if old.status is distinct from new.status then
    select p.user_id into v_owner_user_id
    from public.profiles p
    where p.store_id = new.store_id and p.role = 'owner'
    limit 1;

    if v_owner_user_id is not null then
      insert into public.notifications (
        store_id, user_id, type, title, body, is_read, reference_id, reference_type
      ) values (
        new.store_id,
        v_owner_user_id,
        'promotion_status',
        'โปรโมชัน: ' || new.title,
        'สถานะเปลี่ยนเป็น: ' || new.status,
        false,
        new.id,
        'promotion'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists promotion_status_notify on public.promotions;
create trigger promotion_status_notify
  after update of status on public.promotions
  for each row
  execute function public.handle_promotion_status_change();

-- Purchase order status change → notify owner
create or replace function public.handle_po_status_change()
returns trigger as $$
declare
  v_owner_user_id uuid;
begin
  if old.status is distinct from new.status then
    select p.user_id into v_owner_user_id
    from public.profiles p
    where p.store_id = new.store_id and p.role = 'owner'
    limit 1;

    if v_owner_user_id is not null then
      insert into public.notifications (
        store_id, user_id, type, title, body, is_read, reference_id, reference_type
      ) values (
        new.store_id,
        v_owner_user_id,
        'po_status',
        'ใบสั่งซื้อ: ' || new.tire_name,
        'สถานะเปลี่ยนเป็น: ' || new.status,
        false,
        new.id,
        'purchase_order'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists po_status_notify on public.purchase_orders;
create trigger po_status_notify
  after update of status on public.purchase_orders
  for each row
  execute function public.handle_po_status_change();
