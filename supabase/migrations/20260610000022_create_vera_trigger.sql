-- VERA: financial threshold alert trigger
-- Fires when a weekly_summary financial entry shows gross_profit below threshold

create or replace function public.handle_vera_alert()
returns trigger as $$
declare
  v_owner_user_id uuid;
  v_threshold     numeric := -10000;
begin
  -- Only trigger on weekly_summary entries with negative or very low profit
  if new.type = 'weekly_summary' and new.gross_profit < v_threshold then

    select p.user_id into v_owner_user_id
    from public.profiles p
    where p.store_id = new.store_id and p.role = 'owner'
    limit 1;

    if v_owner_user_id is not null then
      insert into public.notifications (
        store_id, user_id, type, title, body, is_read, send_line
      ) values (
        new.store_id,
        v_owner_user_id,
        'financial_alert',
        'VERA: กำไรต่ำกว่าเกณฑ์',
        'กำไรสัปดาห์นี้: ฿' || new.gross_profit || ' — ต่ำกว่าเกณฑ์ ฿' || v_threshold,
        false,
        true
      );
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists vera_financial_alert on public.financials;
create trigger vera_financial_alert
  after insert on public.financials
  for each row
  execute function public.handle_vera_alert();
