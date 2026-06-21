-- Stock-low notification trigger
-- Fires when tires.quantity crosses below min_threshold

create or replace function public.handle_stock_low_notification()
returns trigger as $$
declare
  v_owner_user_id uuid;
  v_store_name    text;
begin
  if new.quantity < new.min_threshold and old.quantity >= old.min_threshold then

    select p.user_id, s.name
    into v_owner_user_id, v_store_name
    from public.profiles p
    join public.stores s on s.id = new.store_id
    where p.store_id = new.store_id and p.role = 'owner'
    limit 1;

    if v_owner_user_id is not null then
      insert into public.notifications (
        store_id, user_id, type, title, body,
        is_read, send_line, reference_id, reference_type
      ) values (
        new.store_id,
        v_owner_user_id,
        'stock_low',
        'สต็อกต่ำ: ' || new.brand || ' ' || new.model,
        new.brand || ' ' || new.model || ' ' || new.size || ' — เหลือ ' || new.quantity || ' เส้น',
        false,
        true,
        new.id,
        'tire'
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists notify_stock_low on public.tires;
create trigger notify_stock_low
  after update of quantity on public.tires
  for each row
  execute function public.handle_stock_low_notification();
