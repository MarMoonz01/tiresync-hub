-- ─────────────────────────────────────────────────────────────────────────────
-- Order Notification Triggers
-- 1. New order (interested) → notify seller store via LINE
-- 2. Status change (approved/shipped/delivered) → notify buyer store via LINE
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Trigger 1: Notify seller when a new order arrives ────────────────────────

CREATE OR REPLACE FUNCTION public.notify_seller_new_order()
RETURNS TRIGGER AS $$
DECLARE
  _buyer_store_name  text;
  _tire_label        text;
BEGIN
  -- Only fire on new orders (status = interested)
  IF NEW.status != 'interested' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO _buyer_store_name FROM public.stores WHERE id = NEW.buyer_store_id;
  SELECT brand || ' ' || COALESCE(model, '') || ' ' || size INTO _tire_label
    FROM public.tires WHERE id = NEW.tire_id;

  -- Notify the seller store (store-level notification → LINE push via webhook)
  INSERT INTO public.notifications (store_id, type, title, message, link, send_line)
  VALUES (
    NEW.seller_store_id,
    'order_received',
    'คำสั่งซื้อใหม่ 🛒',
    COALESCE(_buyer_store_name, 'ร้านค้า') || ' สนใจ ' ||
      COALESCE(trim(_tire_label), 'ยาง') || ' จำนวน ' || NEW.quantity || ' เส้น',
    '/orders',
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_created_notify_seller ON public.orders;
CREATE TRIGGER on_order_created_notify_seller
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_seller_new_order();


-- ── Trigger 2: Notify buyer when order status changes ────────────────────────

CREATE OR REPLACE FUNCTION public.notify_buyer_order_update()
RETURNS TRIGGER AS $$
DECLARE
  _seller_store_name text;
  _tire_label        text;
  _title             text;
  _message           text;
  _type              text;
BEGIN
  -- Only fire on meaningful status changes
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('approved', 'shipped', 'delivered', 'cancelled') THEN RETURN NEW; END IF;

  SELECT name INTO _seller_store_name FROM public.stores WHERE id = NEW.seller_store_id;
  SELECT brand || ' ' || COALESCE(model, '') || ' ' || size INTO _tire_label
    FROM public.tires WHERE id = NEW.tire_id;

  IF NEW.status = 'approved' THEN
    _type    := 'order_approved';
    _title   := 'คำสั่งซื้ออนุมัติแล้ว ✅';
    _message := COALESCE(_seller_store_name, 'ร้านค้า') || ' อนุมัติ ' || COALESCE(trim(_tire_label), 'ยาง') || ' แล้ว';

  ELSIF NEW.status = 'shipped' THEN
    _type    := 'order_shipped';
    _title   := 'สินค้าถูกจัดส่งแล้ว 🚚';
    _message := COALESCE(trim(_tire_label), 'ยาง') || ' จาก ' || COALESCE(_seller_store_name, 'ร้านค้า') || ' กำลังมา';

  ELSIF NEW.status = 'delivered' THEN
    _type    := 'order_delivered';
    _title   := 'สินค้าส่งถึงแล้ว 🎉';
    _message := COALESCE(trim(_tire_label), 'ยาง') || ' ส่งถึงคุณเรียบร้อยแล้ว';

  ELSIF NEW.status = 'cancelled' THEN
    _type    := 'order_cancelled';
    _title   := 'คำสั่งซื้อถูกยกเลิก ❌';
    _message := 'คำสั่งซื้อ ' || COALESCE(trim(_tire_label), 'ยาง') || ' ถูกยกเลิกแล้ว';
  END IF;

  -- Notify buyer store
  INSERT INTO public.notifications (store_id, type, title, message, link, send_line)
  VALUES (NEW.buyer_store_id, _type, _title, _message, '/orders', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_changed_notify_buyer ON public.orders;
CREATE TRIGGER on_order_status_changed_notify_buyer
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_buyer_order_update();
